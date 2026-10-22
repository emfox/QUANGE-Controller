#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blectx.py —— 共享的 BLE 上下文工具（扫描 / 匹配 / 连接）

被 set_timer.py 引用，不单独运行。

Windows 上的一个硬坑：不能拿一串 MAC 地址去 BleakClient(address)，
必须先扫描拿到 BLEDevice 对象再连，否则常报
    BleakDeviceNotFoundError: Device with address ... was not found.
本模块统一处理这件事。

设备名匹配：默认同时认 QUANGE / Hi- / kHID 三个前缀 —— 本设备的广播名
会在 QUANGE-WY020702 和 kHID 之间来回切，GAP 名又是 Hi-YM01-…，
只认一个必然会扫不到。这套规则与 phone.html 的 NAME_FILTERS 保持一致。
"""
import asyncio

from bleak import BleakClient, BleakScanner


def short_uuid(u):
    u = str(u).lower()
    if u.startswith("0000") and u.endswith("-0000-1000-8000-00805f9b34fb"):
        return u[4:8]
    return u


def hexs(b):
    return b.hex(" ").upper() if b else ""


async def scan_all(timeout: float = 10.0):
    """返回 {address: (BLEDevice, AdvertisementData)}"""
    res = await BleakScanner.discover(timeout=timeout, return_adv=True)
    # bleak 3.x 保证返回 dict；低版本可能返回 list
    if isinstance(res, dict):
        return res
    return {d.address: (d, adv) for d, adv in res}


def _norm(a: str) -> str:
    return a.replace(":", "").replace("-", "").upper()


# 与 phone.html 的 NAME_FILTERS 保持一致，避免「网页能连、脚本连不上」
DEFAULT_NAME_PREFIXES = ("QUANGE", "Hi-", "kHID")
DEFAULT_NAME_SPEC = "|".join(DEFAULT_NAME_PREFIXES)

# 设备广播里一定带 0x1812(HID) —— 这是固件行为，与广播名无关，比名字可靠。
# 原厂小程序就是只按这个服务扫的（conble.js: services:["00001812-..."]）。
HID_SERVICE = "00001812-0000-1000-8000-00805f9b34fb"
BATT_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb"


def _uuid_match(adv, want: str) -> bool:
    """判断广播里是否声明了某个服务（bleak 给的是短 UUID 或全 UUID，都要能对上）"""
    keys = {want.lower(), want[:8].lower(), want[4:8].lower()}
    for u in (adv.service_uuids or []):
        ul = u.lower()
        if ul in keys or ul.startswith(want[:8].lower()):
            return True
    return False


def _looks_like_device(adv) -> bool:
    """不看名字，只看广播内容 —— 名字可能被改成任何东西，服务列表不会"""
    return _uuid_match(adv, HID_SERVICE) or _uuid_match(adv, BATT_SERVICE)


def _name_match(nm: str, spec: str) -> bool:
    """spec 里的 '|' 或 ',' 表示多个可选前缀，只要命中其一就算匹配

    - 默认值 DEFAULT_NAME_SPEC 走前缀匹配（与 Web Bluetooth 的 namePrefix 同义）
    - 用户显式传的名字走子串匹配，方便只记得半截名字的情况
    """
    if not nm:
        return False
    low = nm.lower()
    if spec == DEFAULT_NAME_SPEC:
        return any(low.startswith(p.lower()) for p in DEFAULT_NAME_PREFIXES)
    for part in spec.replace(",", "|").split("|"):
        part = part.strip().lower()
        if part and part in low:
            return True
    return False


async def find_device(name=DEFAULT_NAME_SPEC, address=None, timeout: float = 10.0,
                      quiet=False):
    """扫一遍并按 MAC / 名字找设备，返回 (BLEDevice, AdvertisementData) 或 (None, None)

    匹配顺序：MAC > 名字前缀 > 广播服务特征（0x1812/0x180F）。
    最后一档是为了兜住「设备被改成任意广播名」的情况 —— 服务列表改不了。
    """
    if not quiet:
        print(f"[*] 扫描 {timeout:.0f}s ……")
    found = await scan_all(timeout)

    hits = []
    if address:
        n = _norm(address)
        for addr, (dev, adv) in found.items():
            if _norm(addr) == n or _norm(dev.address) == n:
                hits.append((dev, adv, 0))
    if name:
        for addr, (dev, adv) in found.items():
            nm = (adv.local_name or dev.name or "")
            if _name_match(nm, name):
                hits.append((dev, adv, 1))

    # 兜底：名字对不上但广播内容像 —— 设备改名后名字匹配会失效，服务列表不会
    seen = {id(h[0]) for h in hits}
    for addr, (dev, adv) in found.items():
        if id(dev) in seen:
            continue
        if _looks_like_device(adv):
            hits.append((dev, adv, 2))

    if hits:
        hits.sort(key=lambda x: (x[2], -((x[1].rssi if x[1].rssi is not None else -999))))
        dev, adv, how = hits[0]
        if not quiet:
            tag = {0: "按 MAC", 1: "按名字", 2: "按广播服务"}[how]
            print(f"[+] 命中 {adv.local_name or dev.name or '(无名)'} @ {dev.address} "
                  f"({adv.rssi} dBm, {tag})")
        return dev, adv

    if not quiet:
        print(f"[!] 没找到目标（名字匹配规则：{name!r}）。当前可见设备（按信号强弱）：")
        rows = sorted(found.values(), key=lambda x: -((x[1].rssi if x[1].rssi is not None else -999)))
        for dev, adv in rows[:20]:
            print(f"    {str(adv.rssi):>4}dBm  {adv.local_name or dev.name or '(无名)':26}  {dev.address}")
        print("    —— 若目标不在列表里：确认已长按 3 秒开机；把手机蓝牙关掉避免被占；换新电池。")
        print("    —— 广播名可能是 QUANGE-WY020702，也可能退化成模块默认名 kHID。")
        print("       已经按 0x1812/0x180F 服务兜底匹配过，仍是空的话用 -a <MAC> 直接指定。")
    return None, None


async def connect(name=None, address=None, scan_time=10.0, timeout=20.0,
                  on_disconnect=None, quiet=False, retries=3):
    """扫描 + 连接（失败自动重试，每次重新扫描拿最新的 BLEDevice）

    弱信号（<-80dBm）时 Windows 的 GATT 服务发现经常超时，重试通常能救回来。
    """
    last_err = None
    for attempt in range(1, retries + 1):
        dev, adv = await find_device(name, address, scan_time, quiet)
        if dev is None:
            last_err = "device not found"
            await asyncio.sleep(2)
            continue
        rssi = adv.rssi if adv.rssi is not None else -999
        if not quiet:
            print(f"[*] 第 {attempt}/{retries} 次连接 {dev.address} (RSSI {rssi}) ……")
        client = BleakClient(dev, timeout=timeout, disconnected_callback=on_disconnect)
        try:
            await client.connect()
            if client.is_connected:
                return client
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            if not quiet:
                print(f"[!] 连接失败: {last_err}")
            try:
                await client.disconnect()
            except Exception:
                pass
            await asyncio.sleep(3)
            continue

    print(f"[x] 连接最终失败（{last_err}）")
    print("    排查：1) 把杯架挪到电脑 30cm 内，信号需 > -70dBm；"
          "2) 关掉手机蓝牙与小程序；3) 换 3 节新碱性电池；4) 长按关机再长按开机后立刻重试。")
    return None


def find_char(client, spec: str):
    """按完整 UUID / 短 UUID / handle 找特征值"""
    s = str(spec).lower().replace("-", "").strip()
    chars = [c for svc in client.services for c in svc.characteristics]
    for c in chars:
        if c.uuid.lower() == s:
            return c
    if s.isdigit() and len(s) <= 3:
        for c in chars:
            if c.handle == int(s):
                return c
    short = s[-4:]
    for c in chars:
        if short_uuid(c.uuid) == short:
            return c
    for c in chars:
        if c.uuid.lower().replace("-", "").startswith("0000" + short):
            return c
    # 非标准基址的私有 UUID：直接用原始 UUID 的尾部匹配
    for c in chars:
        if c.uuid.lower().replace("-", "").endswith(short):
            return c
    return None


def list_chars(client):
    out = []
    for svc in client.services:
        for c in svc.characteristics:
            out.append(c)
    return out


def writable(client):
    return [c for c in list_chars(client)
            if "write" in c.properties or "write-without-response" in c.properties]


def notifiable(client):
    return [c for c in list_chars(client)
            if "notify" in c.properties or "indicate" in c.properties]


async def dump_gatt(client, log=print, listen=0.0, subscribe=True):
    """枚举并打印整棵 GATT 树，读取可读值，订阅可通知值。

    返回 dict：{"tree": [...], "writable": [...], "notifiable": [...], "notifications": [...]}
    """
    notifications = []

    def on_notify(char, data: bytearray):
        line = f"[NOTIFY] {short_uuid(char.uuid)} <- {hexs(data)}"
        notifications.append(line)
        log(line)

    tree, readable, writable, notifiable = [], [], [], []

    log("\n--------------- GATT 结构 ---------------")
    for svc in client.services:
        log(f"\n[SERVICE] {svc.uuid}  ({short_uuid(svc.uuid)})")
        for c in svc.characteristics:
            props = "|".join(c.properties)
            log(f"    [CHAR] {short_uuid(c.uuid):8}  h={c.handle:<4} props={props:32} "
                f"{(c.description or '')[:34]}")
            tree.append({"service": svc.uuid, "char": c.uuid, "handle": c.handle,
                         "props": c.properties, "description": c.description})
            if "read" in c.properties:
                readable.append(c)
            if "notify" in c.properties or "indicate" in c.properties:
                notifiable.append(c)
            if "write" in c.properties or "write-without-response" in c.properties:
                writable.append(c)

    log("\n--------------- 读值 ---------------")
    if not readable:
        log("(无)")
    for c in readable:
        try:
            val = await client.read_gatt_char(c)
            asc = "".join(chr(b) if 32 <= b < 127 else "." for b in val)
            log(f"  {short_uuid(c.uuid):8} h{c.handle:<4} = {hexs(val):58} |{asc}|")
        except Exception as e:
            log(f"  {short_uuid(c.uuid):8} h{c.handle:<4} 读取失败: {type(e).__name__}: {e}")

    log("\n--------------- 判定 ---------------")
    log("WRITE  : " + (", ".join(f"{short_uuid(c.uuid)}(h{c.handle})" for c in writable) or "无"))
    log("NOTIFY : " + (", ".join(f"{short_uuid(c.uuid)}(h{c.handle})" for c in notifiable) or "无"))
    if writable:
        log("[结论] 可写通道存在 → 可以用 write.py 试探。")
    else:
        log("[结论] 无可写特征值 → 通用 BLE 工具写不了参数。")

    if subscribe:
        for c in notifiable:
            try:
                await client.start_notify(c, on_notify)
                log(f"[+] 订阅 {short_uuid(c.uuid)}")
            except Exception as e:
                log(f"[!] 订阅 {short_uuid(c.uuid)} 失败: {type(e).__name__}: {e}")

    if notifiable and listen > 0:
        log(f"\n[*] 监听 {listen:.0f}s —— 现在按机身按键（双击 = 立即杀菌），看是否上报。")
        await asyncio.sleep(listen)

    return {"tree": tree,
            "writable": [c.uuid for c in writable],
            "notifiable": [c.uuid for c in notifiable],
            "notifications": notifications}


if __name__ == "__main__":
    print("blectx 工具模块，直接运行会做一次扫描连通性自检：")
    asyncio.run(find_device())