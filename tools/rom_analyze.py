#!/usr/bin/env python3
"""Read-only static analysis of the dumped TLSR825x flash image."""

import argparse
import hashlib
import re
import struct
import zlib
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

CST = timezone(timedelta(hours=8))
LOG_BASE = 0x40000
LOG_SLOTS = 200
LOG_STRIDE = 8
AD_NAMES = {
    0x01: "Flags", 0x02: "16-bit UUID list", 0x03: "128-bit UUID list",
    0x08: "Shortened local name", 0x09: "Complete local name",
    0x19: "Appearance", 0xFF: "Manufacturer specific",
}


def wall(ts):
    try:
        return datetime.fromtimestamp(ts, CST).strftime("%Y-%m-%d %H:%M:%S")
    except (OSError, OverflowError, ValueError):
        return "-"


def show_regions(rom):
    runs = []
    start = last = None
    for i, b in enumerate(rom):
        if b != 0xFF:
            if start is None:
                start = i
            last = i
        elif start is not None and i - last > 64:
            runs.append((start, last + 1))
            start = None
    if start is not None:
        runs.append((start, last + 1))
    for a, b in runs:
        print(f"  {a:06x}-{b:06x}  {b-a:7d} B")


def show_header(rom, off):
    size = struct.unpack_from("<I", rom, off + 0x18)[0]
    body = rom[off:off + size]
    print(f"  @{off:06x}  size=0x{size:x} ({size} B)  magic08={rom[off+8:off+12]!r}")
    print(f"    words: " + " ".join(f"{w:08x}" for w in struct.unpack_from("<8I", rom, off)))
    print(f"    tail_le=0x{struct.unpack_from('<I', rom, off+size-4)[0]:08x}"
          f"  crc32(body)={zlib.crc32(body)&0xffffffff:08x}"
          f"  crc32(body[:-4])={zlib.crc32(body[:-4])&0xffffffff:08x}")


def show_ad(rom, start, label, limit=40):
    print(f"  {label} @{start:06x}")
    i = start
    while i < start + limit:
        length = rom[i]
        if length == 0:
            i += 1
            continue
        if length > 30 or i + 1 + length > len(rom):
            break
        kind, value = rom[i + 1], rom[i + 2:i + 1 + length]
        print(f"    +0x{i-start:02x} len={length:2d} type=0x{kind:02x}"
              f" {AD_NAMES.get(kind, ''):<20} {value.hex(' '):<38} {value!r}")
        i += 1 + length


def read_logs(rom):
    out = []
    for i in range(LOG_SLOTS):
        b = rom[LOG_BASE + i * LOG_STRIDE:LOG_BASE + (i + 1) * LOG_STRIDE]
        out.append((struct.unpack_from(">I", b)[0], struct.unpack_from(">H", b, 4)[0], b[6], b[7]))
    return out


def show_logs(rom, full):
    recs = read_logs(rom)
    used = [i for i, r in enumerate(recs) if any(rom[LOG_BASE+i*8:LOG_BASE+i*8+8])]
    print(f"  {LOG_SLOTS} slots x {LOG_STRIDE} B @0x{LOG_BASE:06x}, used={len(used)}")
    print("  layout: ts[4] big-endian unix seconds | duration[2] big-endian seconds | type[1] | 0xFF")
    print("  types:", dict(Counter(r[2] for r in recs)), " durations:", dict(Counter(r[1] for r in recs)))
    deltas = Counter(recs[i+1][0] - recs[i][0] for i in range(2, 178) if recs[i][0] and recs[i+1][0])
    print("  gaps (slots 2..177):", deltas.most_common(5))
    for i in (1, 2, 3, 177, 178, 179, 187, 188, 189):
        ts, dur, kind, tail = recs[i]
        print(f"    [{i:3d}] 0x{ts:08x} {wall(ts):19s} {dur:4d}s type={kind} tail=0x{tail:02x}")
    if full:
        for i, (ts, dur, kind, tail) in enumerate(recs):
            print(f"    [{i:3d}] 0x{ts:08x} {wall(ts):19s} {dur:4d}s type={kind} tail=0x{tail:02x}")


def show_scalars(rom):
    for off in (0x40640, 0x41000, 0x42000, 0x45000, 0x46000, 0x76000, 0x77000, 0x770C0, 0x771C0):
        print(f"  @{off:06x}: {rom[off:off+16].hex(' ')}")
    ts = struct.unpack_from("<I", rom, 0x46000)[0]
    print(f"  0x46000 as unix seconds = {wall(ts)}")


def show_strings(rom):
    for m in re.finditer(rb"[ -~]{8,}", rom[:0xD3E4]):
        print(f"  @{m.start():06x}: {m.group().decode('ascii')!r}")


def main():
    default = Path(__file__).resolve().parents[1] / "firmware" / "rom_512k.bin"
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rom", default=str(default), help="path to the 512 KiB flash image")
    ap.add_argument("--logs", action="store_true", help="print all 200 log slots")
    args = ap.parse_args()

    rom = Path(args.rom).read_bytes()
    print(f"== image ==\n  {args.rom}\n  {len(rom)} B  sha256={hashlib.sha256(rom).hexdigest()}")
    print(f"  0xFF: {rom.count(0xFF)} ({rom.count(0xFF)/len(rom):.1%})")

    print("\n== non-0xFF regions ==")
    show_regions(rom)

    print("\n== firmware headers ==")
    show_header(rom, 0)
    show_header(rom, 0x20000)

    print("\n== advertising / scan response ==")
    show_ad(rom, 0xCCEC, "ADV", limit=0x14)
    show_ad(rom, 0xCD00, "SCAN RSP", limit=0x1B)

    print("\n== persistent log table ==")
    show_logs(rom, args.logs)

    print("\n== config / calibration scalars ==")
    show_scalars(rom)

    print("\n== ASCII strings in vendor firmware ==")
    show_strings(rom)


if __name__ == "__main__":
    main()
