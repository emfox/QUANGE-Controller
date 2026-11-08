"""Reproduce the vendor OTA frames from app-service.js and drive the BLE-Hacker dumper.

Default mode is dry-run: it prints every frame and touches no hardware.
Pass --commit to actually write to the device.
See docs/ota-dump.en.md for the full procedure and the risks involved.
"""

import argparse
import asyncio
import pathlib
import time

from bleak import BleakClient, BleakScanner

# Override with --target-mac; this is the MAC of the test unit in the docs.
TARGET = "1C:45:C2:00:9B:B6"
OTA_CHR = "00010203-0405-0607-0809-0a0b0c0d2b12"
HACK_CHR = "00001f1f-0000-1000-8000-00805f9b34fb"
FLASH_SIZE = 0x80000
# Override with --firmware / --out. BLE-Hacker.bin is not shipped with this repo.
FIRMWARE = pathlib.Path(__file__).with_name("BLE-Hacker.bin")
ROM_OUT = pathlib.Path(__file__).with_name("rom_512k.bin")


def crc16(data: bytes) -> bytes:
    """CRC16/Modbus, little-endian (ToModbusCRC16 + toString default)."""
    c = 0xFFFF
    for b in data:
        c ^= b
        for _ in range(8):
            c = (c >> 1) ^ 0xA001 if c & 1 else c >> 1
    return bytes([c & 0xFF, (c >> 8) & 0xFF])


def build_frames(fw: bytes):
    press = len(fw) // 16 + (1 if len(fw) % 16 else 0)
    frames = []
    for seq in range(press + 1):  # app-service.js loops e <= updata_press
        chunk = fw[seq * 16: seq * 16 + 16]
        body = bytes([seq & 0xFF, (seq >> 8) & 0xFF]) + chunk.ljust(16, b"\xFF")
        frames.append(body + crc16(body))

    inv = (~press) & 0xFFFF
    d = bytes([0x02, 0xFF,
               press & 0xFF, (press >> 8) & 0xFF,
               inv & 0xFF, (inv >> 8) & 0xFF, 0, 0])
    # Upstream builds buf2hex(d) + CRC16S(d); CRC16S already contains hex(d),
    # so the 8 bytes are emitted twice before the CRC. Reproduce it verbatim.
    end = d + d + crc16(d)
    return press, frames, end


async def connect(mac: str) -> BleakClient:
    c = BleakClient(mac, timeout=30.0)
    await c.connect()
    return c


async def phase_handshake(commit: bool):
    print("[phase handshake] 01 FF only, no data blocks")
    if not commit:
        print("  would send: 01FF  (2 bytes, write-without-response)")
        print("  would then read OTA characteristic and disconnect")
        return
    c = await connect(TARGET)
    try:
        before = await c.read_gatt_char(OTA_CHR)
        print(f"  OTA char before: {bytes(before).hex().upper()}")
        await c.write_gatt_char(OTA_CHR, b"\x01\xff", response=False)
        await asyncio.sleep(0.5)
        after = await c.read_gatt_char(OTA_CHR)
        print(f"  OTA char after : {bytes(after).hex().upper()}")
    finally:
        await c.disconnect()
    print("  disconnected; power-cycle the device to leave OTA mode")


async def phase_flash(frames, end, commit: bool, delay: float):
    print(f"[phase flash] {len(frames)} blocks x 20 B, then {len(end)}-B end frame")
    if not commit:
        return
    c = await connect(TARGET)
    try:
        await c.write_gatt_char(OTA_CHR, b"\x01\xff", response=False)
        await asyncio.sleep(0.3)
        t0 = time.monotonic()
        for i, fr in enumerate(frames):
            await c.write_gatt_char(OTA_CHR, fr, response=False)
            if i % 100 == 0:
                print(f"  {i}/{len(frames)}  {time.monotonic()-t0:.1f}s", flush=True)
            await asyncio.sleep(delay)
        await c.write_gatt_char(OTA_CHR, end, response=False)
        print(f"  end frame sent after {time.monotonic()-t0:.1f}s")
        await asyncio.sleep(3.0)
    finally:
        await c.disconnect()
    print("  waiting for reboot into BLE_xxxxxx ...")


async def find_hacker(scan_time: float):
    def match(dev, adv):
        n = adv.local_name or dev.name or ""
        return n.startswith("BLE_") or n.startswith("BLE-")

    found = {}
    def cb(dev, adv):
        if match(dev, adv):
            found[dev.address] = (dev, adv)
    scanner = BleakScanner(detection_callback=cb)
    await scanner.start()
    await asyncio.sleep(scan_time)
    await scanner.stop()
    for addr, (dev, adv) in found.items():
        print(f"  hacker device: {addr}  name={dev.name!r}  rssi={adv.rssi}")
    return list(found)


async def phase_dump(addrs, commit: bool, scan_time: float, timeout: float,
                     merge: bool = False):
    print(f"[phase dump] read {FLASH_SIZE} bytes via 0xD4 (merge={merge})")
    if not commit:
        cmd = bytes([0xD4, 0, 0, 0, FLASH_SIZE & 0xFF,
                     (FLASH_SIZE >> 8) & 0xFF, (FLASH_SIZE >> 16) & 0xFF])
        print(f"  would send: {cmd.hex().upper()}")
        print("  expect 32768 notifications of 0xD4 + addr(3) + data(16)")
        return

    if not addrs:
        addrs = await find_hacker(scan_time)
    if not addrs:
        print("  NO BLE_xxxxxx DEVICE FOUND - aborting dump")
        return False

    buf = bytearray(b"\xFF" * FLASH_SIZE)
    if merge and ROM_OUT.exists():
        buf = bytearray(ROM_OUT.read_bytes())
    got = set()
    done = asyncio.Event()
    last_rx = [time.monotonic()]

    def on_notify(_, data: bytearray):
        b = bytes(data)
        if len(b) < 5 or b[0] != 0xD4:
            return
        last_rx[0] = time.monotonic()
        addr = b[1] | (b[2] << 8) | (b[3] << 16)
        payload = b[4:]
        buf[addr:addr + len(payload)] = payload
        for i in range(0, len(payload), 16):
            got.add((addr + i) // 16)
        if len(got) % 2000 == 0 and len(got):
            print(f"  {len(got)*16}/{FLASH_SIZE} bytes", flush=True)
        if len(got) * 16 >= FLASH_SIZE:
            done.set()

    c = await connect(addrs[0])
    try:
        await c.start_notify(HACK_CHR, on_notify)
        cmd = bytes([0xD4, 0, 0, 0, FLASH_SIZE & 0xFF,
                     (FLASH_SIZE >> 8) & 0xFF, (FLASH_SIZE >> 16) & 0xFF])
        await c.write_gatt_char(HACK_CHR, cmd, response=False)
        deadline = time.monotonic() + timeout
        last_rx[0] = time.monotonic()
        while time.monotonic() < deadline:
            if done.is_set():
                break
            if time.monotonic() - last_rx[0] > 3.0:
                print("  stream idle for 3 s, stopping early")
                break
            await asyncio.sleep(0.2)
        else:
            print(f"  TIMEOUT: only {len(got)*16}/{FLASH_SIZE} bytes received")
        await c.stop_notify(HACK_CHR)
    finally:
        await c.disconnect()

    ROM_OUT.write_bytes(bytes(buf))
    print(f"  saved {ROM_OUT} ({ROM_OUT.stat().st_size} bytes), "
          f"missing {FLASH_SIZE - len(got)*16} bytes")
    return len(got) * 16 >= FLASH_SIZE


async def phase_restore(addrs, commit: bool, scan_time: float):
    print("[phase restore] 0xD7 Change Start Boot")
    if not commit:
        print("  would send: D7  (1 byte)")
        return
    if not addrs:
        addrs = await find_hacker(scan_time)
    if not addrs:
        print("  NO BLE_xxxxxx DEVICE FOUND - cannot restore")
        return
    c = await connect(addrs[0])
    try:
        await c.start_notify(HACK_CHR, lambda _, d: print(f"  reply: {bytes(d).hex().upper()}"))
        await c.write_gatt_char(HACK_CHR, b"\xd7", response=False)
        await asyncio.sleep(2.0)
    finally:
        await c.disconnect()
    print("  power-cycle the device; it should come back with the original firmware")


async def main():
    global TARGET, FIRMWARE, ROM_OUT
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true", help="actually write to hardware")
    ap.add_argument("--phase", choices=["handshake", "flash", "dump", "restore", "all"],
                    default="all")
    ap.add_argument("--delay", type=float, default=0.015, help="inter-block delay, s")
    ap.add_argument("--scan-time", type=float, default=20.0)
    ap.add_argument("--timeout", type=float, default=600.0, help="dump timeout, s")
    ap.add_argument("--mac", default="", help="pin the BLE_xxxxxx device MAC")
    ap.add_argument("--merge", action="store_true", help="merge into an existing ROM dump")
    ap.add_argument("--target-mac", default=TARGET,
                    help="MAC of the device before flashing (default: the docs' test unit)")
    ap.add_argument("--firmware", default="", help="path to BLE-Hacker.bin")
    ap.add_argument("--out", default="", help="path for the ROM dump")
    a = ap.parse_args()

    TARGET = a.target_mac
    if a.firmware:
        FIRMWARE = pathlib.Path(a.firmware)
    if a.out:
        ROM_OUT = pathlib.Path(a.out)

    if FIRMWARE.exists():
        fw = FIRMWARE.read_bytes()
        placeholder = False
    elif a.commit and a.phase in ("flash", "all"):
        raise SystemExit(f"ERROR: {FIRMWARE} not found. Download BLE-Hacker.bin "
                         f"(see docs/ota-dump.en.md §2) or pass --firmware <path>.")
    else:
        fw = bytes(39652)
        placeholder = True
    press, frames, end = build_frames(fw)
    tag = " (PLACEHOLDER - download BLE-Hacker.bin for real frames)" if placeholder else ""
    print(f"firmware   : {FIRMWARE.name}  {len(fw)} bytes{tag}")
    print(f"updata_press: {press}  ->  {len(frames)} blocks (loop includes e==press)")
    print(f"handshake  : 01FF")
    for i in (0, 1, len(frames) - 1):
        print(f"  block[{i:>4}] = {frames[i].hex().upper()}")
    print(f"end frame  : {end.hex().upper()}  ({len(end)} bytes)")
    print(f"est. write : ~{len(frames) * (a.delay + 0.01):.0f}s at {a.delay}s spacing")
    print(f"commit     : {a.commit}")
    print()

    if not a.commit:
        print("DRY RUN - nothing was sent. Add --commit to write.")
        return

    addrs = [a.mac] if a.mac else []
    if a.phase in ("handshake", "all"):
        await phase_handshake(True)
    if a.phase in ("flash", "all"):
        await phase_flash(frames, end, True, a.delay)
        addrs = await find_hacker(a.scan_time)
        if not addrs:
            print("ABORT: device did not reboot as BLE_xxxxxx. Do NOT retry blindly.")
            return
    if a.phase in ("dump", "all"):
        await phase_dump(addrs, True, a.scan_time, a.timeout, a.merge)
    if a.phase in ("restore", "all"):
        await phase_restore(addrs, True, a.scan_time)


if __name__ == "__main__":
    asyncio.run(main())
