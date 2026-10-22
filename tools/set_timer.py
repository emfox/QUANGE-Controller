#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
set_timer.py —— 直接给全格杯架写定时（协议见 PROTOCOL.md）

用法:
    # 先验证通道：发"立即开启"，看指示灯是否开始呼吸
    python set_timer.py --start

    # 设成 每天 03:00 消杀 5 分钟（只保留这一条）
    python set_timer.py --at 03:00 --dur 5

    # 两条定时：03:00 五分钟 + 15:30 四分钟
    python set_timer.py --at "03:00=5,15:30=4"

    # 查询状态（看设备回包与下次杀菌时间）
    python set_timer.py --query

    # 只看将要发送的帧，不真发
    python set_timer.py --at 03:00 --dur 5 --dry-run

帧格式:
    设定时  DB 08 08 <count> [HH MM 0D] * count
    开/关   DB 02 04 01 / DB 02 04 00
    查状态  DB 04 02 <unix秒,4字节>
"""
import argparse
import asyncio
import os
import sys
import time
from datetime import datetime

from bleak import BleakClient

import blectx as bx

HERE = os.path.dirname(os.path.abspath(__file__))
LOGDIR = os.path.join(HERE, "logs")
STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
CHAR = "1001"
_fh = None


def log(msg):
    print(msg, flush=True)
    if _fh:
        _fh.write(msg + "\n")
        _fh.flush()


# ---------------- 帧构造 ----------------

def timer_frame(items):
    """items: [(hour, minute, duration), ...] -> 完整帧 bytes"""
    body = "".join(f"{h:02X}{m:02X}0{d}" for h, m, d in items)
    frame = f"DB0808{len(items):02X}" + body
    return bytes.fromhex(frame)


def parse_at(spec):
    """'03:00=5,15:30=4' -> [(3,0,5),(15,30,4)]"""
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "=" in part:
            hhmm, dur = part.split("=", 1)
        else:
            hhmm, dur = part, "5"
        hh, mm = hhmm.split(":")
        h, m, d = int(hh), int(mm), int(dur)
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise SystemExit(f"[x] 时间不合法: {hhmm}")
        if d not in (3, 4, 5, 6):
            raise SystemExit(f"[x] 消杀时长只能是 3/4/5/6 分钟，你给了 {d}")
        out.append((h, m, d))
    if not out:
        raise SystemExit("[x] 没有解析到定时项")
    return out


def status_frame():
    ts = int(time.time())
    return bytes.fromhex(f"DB0402{ts:08X}")


# ---------------- 主流程 ----------------

async def run(a):
    os.makedirs(LOGDIR, exist_ok=True)

    # 先算帧
    if a.start:
        frame, desc = bytes.fromhex("DB020401"), "立即开启消杀"
    elif a.stop:
        frame, desc = bytes.fromhex("DB020400"), "关闭"
    elif a.query:
        frame, desc = status_frame(), "查询状态"
    else:
        items = parse_at(a.at)
        frame = timer_frame(items)
        desc = "设定时 " + ", ".join(f"{h:02d}:{m:02d}/{d}分钟" for h, m, d in items)

    log(f"=== {desc} ===")
    log(f"    帧: {frame.hex(' ').upper()}  ({len(frame)} 字节)")

    if a.dry_run:
        log("    (dry-run，未发送)")
        return 0

    global _fh
    _fh = open(os.path.join(LOGDIR, f"settimer_{STAMP}.log"), "a", encoding="utf-8")
    log(f"=== 会话 @ {datetime.now():%Y-%m-%d %H:%M:%S} ===")

    got = []

    def on_notify(ch, data):
        line = f"[回包] {bx.short_uuid(ch.uuid)} <- {bx.hexs(data)}"
        got.append((bx.short_uuid(ch.uuid), bytes(data)))
        log(line)
        _decode(bytes(data))

    client = await bx.connect(a.name, a.address, a.scan_time, a.connect_timeout,
                              on_disconnect=lambda _: log("[!] 设备断开"))
    if client is None:
        return 1

    try:
        for c in bx.notifiable(client):
            try:
                await client.start_notify(c, on_notify)
                log(f"[+] 订阅 {bx.short_uuid(c.uuid)}")
            except Exception as e:
                log(f"[!] 订阅 {bx.short_uuid(c.uuid)} 失败（回包可能收不到）")

        target = bx.find_char(client, CHAR)
        if target is None:
            log(f"[x] 找不到 {CHAR}")
            return 2

        await asyncio.sleep(0.5)
        await client.write_gatt_char(target, frame, response=False)
        log(f"[TX OK] -> {bx.short_uuid(target.uuid)}")

        log(f"[*] 等待回包 {a.listen:.0f}s ……")
        await asyncio.sleep(a.listen)

        if not got:
            log("[!] 没收到任何回包。可能是回包走 1001（订阅被拒），"
                "也可能这条指令本来就不回话。")
            log("    提示：如果刚才发的是 --at，可以过几秒再跑一次 --query 试试。")
    finally:
        try:
            await client.disconnect()
        except Exception:
            pass

    _fh.close()
    return 0


def _decode(b: bytes):
    """按 PROTOCOL.md 的规则解读回包"""
    s = b.hex().upper()
    pre = s[:6]
    try:
        if pre in ("BD1102", "BD0002", "BD0202", "BD0B02", "BD0E02"):
            st = s[6:8]
            bat = int(s[16:18], 16) if len(s) >= 18 else None
            log(f"    -> 状态包  状态字节=0x{st}  电量={bat}%")
            if st == "01":
                # 正在消杀：sub(8,12)=开始时间戳, sub(12,16)=当前时间戳
                a0 = int(s[8:12], 16) if len(s) >= 12 else 0
                a1 = int(s[12:16], 16) if len(s) >= 16 else 0
                log(f"    -> 正在消杀中，剩余约 {max(0, a0 - a1)} 秒")
            else:
                # 待机：sub(18,26) = 下次杀菌 unix 时间戳
                if len(s) >= 26:
                    nxt = int(s[18:26], 16)
                    if nxt > 1600000000:
                        log(f"    -> 下次杀菌: {datetime.fromtimestamp(nxt):%Y-%m-%d %H:%M:%S}")
                    else:
                        log(f"    -> 下次杀菌字段=0x{s[18:26]}（未设置或已过期）")
        elif pre in ("BD0D07", "BD0D08"):
            log(f"    -> 定时列表包：{s[6:]}")
        elif pre in ("BD0805", "BD0806"):
            log("    -> 消杀日志包")
        elif pre == "BD05A1":
            log("    -> 低电量告警")
        else:
            log(f"    -> 未知包前缀 {pre}")
    except Exception as e:
        log(f"    (解析失败: {e})")


def cli():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--name", default="QUANGE")
    ap.add_argument("-a", "--address", default=None)
    ap.add_argument("--at", default=None, help='如 03:00 或 "03:00=5,15:30=4"')
    ap.add_argument("--dur", type=int, default=5, help="消杀时长 3/4/5/6 分钟")
    ap.add_argument("--start", action="store_true", help="立即开启消杀（验证通道）")
    ap.add_argument("--stop", action="store_true", help="关闭")
    ap.add_argument("--query", action="store_true", help="查询状态")
    ap.add_argument("--listen", type=float, default=6.0)
    ap.add_argument("--scan-time", type=float, default=8.0)
    ap.add_argument("--connect-timeout", type=float, default=25.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.at and "=" not in args.at:
        args.at = f"{args.at}={args.dur}"
    if not (args.at or args.start or args.stop or args.query):
        ap.print_help()
        return 2
    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(cli())
