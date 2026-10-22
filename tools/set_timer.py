#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
set_timer.py —— 直接给全格智能杀菌牙刷杯架（WY020702）写定时

协议全文见 ../docs/protocol.zh-CN.md（英文：../docs/protocol.en.md）

用法:
    # 先验证通道：发"立即开启"，看指示灯是否开始呼吸
    python3 set_timer.py --start

    # 设成 每天 03:00 消杀 5 分钟（只保留这一条）
    python3 set_timer.py --at 03:00 --dur 5

    # 两条定时：03:00 五分钟 + 15:30 四分钟
    python3 set_timer.py --at "03:00=5,15:30=4"

    # 查询状态（看设备回包与下次杀菌时间）
    python3 set_timer.py --query

    # 读取设备上的定时列表（会先对时 + 日志查询，再发 DB 01 07）
    python3 set_timer.py --list

    # 读取消杀历史
    python3 set_timer.py --logs

    # 读固件版本（DB 01 A4 -> BD 06 A2，只读，不会触发升级）
    python3 set_timer.py --version

    # 只看将要发送的帧，不真发、不连设备
    python3 set_timer.py --at 03:00 --dur 5 --dry-run

    # 广播名扫不到时，直接指定 MAC
    python3 set_timer.py -a AA:BB:CC:DD:EE:FF --query

设备名匹配:
    默认同时认 QUANGE / Hi- / kHID 三个前缀（与 phone.html 一致）。
    也可用 -n 指定，多个前缀用 | 分隔，例如 -n "kHID" 或 -n "QUANGE|Hi-"。

帧格式:
    设定时  DB 08 08 <count> [HH MM 0D] * count
    删除    DB 00 08 <剩余条数> [要保留的项] * 剩余条数
    开/关   DB 02 04 01 / DB 02 04 00
    查状态  DB 04 02 <unix秒,4字节>
    查日志  DB 01 05（流式，每条需回 DB 06 06 01 + 起始时间戳）
    读列表  DB 01 07（需先发 DB 04 02 和 DB 01 05，单独发设备不回）
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


LOG_Q = None  # asyncio.Queue，存放收到的 BD0805/BD0806 原始字节


# ---------------- 帧构造 ----------------

MAX_ITEMS = 4  # 原厂 FA 里写的条数上限，代码里没有硬约束，按此设计最稳


def timer_frame(items):
    """items: [(hour, minute, duration), ...] -> 完整帧 bytes"""
    body = "".join(f"{h:02X}{m:02X}0{d}" for h, m, d in items)
    frame = f"DB0808{len(items):02X}" + body
    return bytes.fromhex(frame)


def validate(items):
    """与 phone.html / 小程序 @addtime 保持一致的前端校验

    原厂判定用的是「间隔 ±59 分钟」，即 >= 59 分钟就放行（不是严格 > 60）；
    另外所有定时都要落在首个定时的 23 小时（1380 分钟）以内。
    这些都是前端校验，固件是否也拦没有实测。
    """
    if not items:
        raise SystemExit("[x] 至少需要一条定时")
    if len(items) > MAX_ITEMS:
        log(f"[!] 超过原厂约定的 {MAX_ITEMS} 条（代码未硬性限制，照发）")

    mins = sorted(h * 60 + m for h, m, _ in items)
    for i, cur in enumerate(mins):
        nxt = mins[i + 1] if i + 1 < len(mins) else mins[0] + 1440
        if nxt - cur < 59:
            raise SystemExit(
                f"[x] 两条定时间隔不能小于 1 小时（原厂限制）："
                f"{cur // 60:02d}:{cur % 60:02d} 与 {nxt % 1440 // 60:02d}:{nxt % 60:02d}")
    if mins[-1] - mins[0] > 1380:
        raise SystemExit("[x] 所有定时需落在首个定时之后的 23 小时内（原厂限制）")


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

async def read_logs(client, target, wait=3.0, limit=12):
    """读取消杀日志：设备逐条推送，每收到一条要回 DB060601+时间戳 才会给下一条"""
    global LOG_Q

    LOG_Q = asyncio.Queue()
    while not LOG_Q.empty():
        LOG_Q.get_nowait()

    log("=== 读取消杀日志 ===")
    await client.write_gatt_char(target, status_frame(), response=False)
    log("[TX] 对时")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(target, bytes.fromhex("DB0105"), response=False)
    log("[TX] 查询日志")

    rows = []
    for i in range(limit):
        try:
            data = await asyncio.wait_for(LOG_Q.get(), timeout=wait)
        except asyncio.TimeoutError:
            log(f"    第 {i+1} 条等待超时，流结束")
            break

        s = bytes(data).hex().upper()
        tsh = s[6:14]
        if tsh == "FFFFFFFF":
            log("    设备回复：没有更多记录")
            break
        dur = int(s[14:18], 16)
        typ = int(s[18:20], 16)
        st = int(s[20:22], 16)
        tsv = int(tsh, 16)
        when = datetime.fromtimestamp(tsv) if tsv > 1600000000 else None
        rows.append((when, dur, typ, st))
        when_s = f"{when:%Y-%m-%d %H:%M:%S}" if when else "时间未知（时钟被重置）"
        log(f"    记录{i+1}: {when_s}  时长 {dur}s  "
            f"类型 {typ}  {'结束' if st == 1 else '开始'}")

        ack = bytes.fromhex("DB060601" + tsh)
        await client.write_gatt_char(target, ack, response=False)
        log(f"[TX] 确认 {tsh}")
        await asyncio.sleep(0.4)

    log(f"[*] 共读到 {len(rows)} 条记录")
    LOG_Q = None
    return rows


async def run(a):
    os.makedirs(LOGDIR, exist_ok=True)

    # 先算帧（list 需要照抄小程序的初始化时序，单独发 DB0107 设备不回）
    if a.start:
        todo = [(bytes.fromhex("DB020401"), "立即开启消杀")]
    elif a.stop:
        todo = [(bytes.fromhex("DB020400"), "关闭")]
    elif a.query:
        todo = [(status_frame(), "查询状态")]
    elif a.version:
        # DB 01 A4 -> BD 06 A2，用来抓固件版本号；OTA 已随服务器下线，这里只读不写
        todo = [(bytes.fromhex("DB01A4"), "读取固件版本")]
    elif a.list:
        todo = [(status_frame(), "对时"),
                (bytes.fromhex("DB0105"), "日志查询"),
                (bytes.fromhex("DB0107"), "读取定时列表")]
    elif a.logs:
        todo = []
    else:
        items = parse_at(a.at)
        validate(items)
        todo = [(timer_frame(items),
                 "设定时 " + ", ".join(f"{h:02d}:{m:02d}/{d}分钟" for h, m, d in items))]

    for f, d in todo:
        log(f"=== {d} ===")
        log(f"    帧: {f.hex(' ').upper()}  ({len(f)} 字节)")

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
        h = bytes(data).hex().upper()
        if LOG_Q is not None and (h.startswith("BD0805") or h.startswith("BD0806")):
            LOG_Q.put_nowait(bytes(data))
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

        if a.logs:
            await read_logs(client, target, wait=3.0, limit=20)

        for frame, desc in todo:
            await client.write_gatt_char(target, frame, response=False)
            log(f"[TX OK] {desc} -> {bx.short_uuid(target.uuid)}")
            await asyncio.sleep(1.2 if len(todo) > 1 else 0.5)

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
            body = s[6:]
            items = []
            for i in range(0, len(body) - 5, 6):
                c = body[i:i + 6]
                h, m, d = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
                if h == 0xFF or m == 0xFF:
                    continue
                if 0 <= h < 24 and 0 <= m < 60 and 1 <= d <= 6:
                    items.append((h, m, d))
            pretty = ", ".join(f"{h:02d}:{m:02d} / {d}分钟" for h, m, d in items) or "空"
            log(f"    -> 定时列表（{len(items)} 条）：{pretty}")
        elif pre in ("BD0805", "BD0806"):
            log("    -> 消杀日志包")
        elif pre == "BD06A2":
            # 版本号解析照抄小程序：hex[15:16] + hex[17:18] 拼成十进制
            # 注意回包若不足 9 字节则取不到，需先看原始 hex
            if len(s) >= 18:
                log(f"    -> 固件版本(按小程序算法): {int(s[15:16] + s[17:18], 16)}"
                    f"  [原始 hex: {s}]")
            else:
                log(f"    -> 固件版本回包只有 {len(s)//2} 字节，不足以按下标解析"
                    f"  [原始 hex: {s}]")
        elif pre == "BD05A1":
            log("    -> 低电量告警")
        else:
            log(f"    -> 未知包前缀 {pre}")
    except Exception as e:
        log(f"    (解析失败: {e})")


def cli():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--name", default=bx.DEFAULT_NAME_SPEC,
                    help="广播名前缀，多个用 | 分隔（默认同时认 QUANGE / Hi- / kHID，"
                         "与 phone.html 一致）")
    ap.add_argument("-a", "--address", default=None, help="直接指定 MAC，跳过名字匹配")
    ap.add_argument("--at", default=None, help='如 03:00 或 "03:00=5,15:30=4"')
    ap.add_argument("--dur", type=int, default=5, help="消杀时长 3/4/5/6 分钟")
    ap.add_argument("--start", action="store_true", help="立即开启消杀（验证通道）")
    ap.add_argument("--stop", action="store_true", help="关闭")
    ap.add_argument("--query", action="store_true", help="查询状态")
    ap.add_argument("--version", action="store_true",
                    help="读取固件版本（DB 01 A4 -> BD 06 A2）")
    ap.add_argument("--list", action="store_true", help="读取定时列表")
    ap.add_argument("--logs", action="store_true", help="读取消杀记录")
    ap.add_argument("--listen", type=float, default=6.0)
    ap.add_argument("--scan-time", type=float, default=8.0)
    ap.add_argument("--connect-timeout", type=float, default=25.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.at and "=" not in args.at:
        args.at = f"{args.at}={args.dur}"
    if not (args.at or args.start or args.stop or args.query or args.version
            or args.list or args.logs):
        ap.print_help()
        return 2
    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(cli())
