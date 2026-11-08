#!/usr/bin/env python3
"""Rewrite the scan-response manufacturer data as a MiBeacon frame.

This is layer 1 of Mi Home compatibility: the broadcast layer only. It makes
the device parseable as a MiBeacon (company ID 0x038F, Service UUID 0xFE95 is
implied by the manufacturer-data form) but does NOT make it bindable — binding
needs a real Product ID from the Xiaomi IoT platform plus the Mi Service
authentication handshake on service 0xFE95.

Patch site: 0xCD13, the `07 FF ..` manufacturer-data AD structure at the tail
of the scan response. Eight bytes, no code change, no relocation.
"""
import argparse
import struct
import sys
from pathlib import Path

SITE = 0xCD13          # AD structure: len=07, type=FF, company=aaaa, 4 pad bytes
SLOT = 8               # 07 FF + 6 payload bytes
MI_COMPANY_ID = 0x038F  # Xiaomi
FC_VERSION_4 = 0x4000   # frame control: version 4, no MAC, no capability, no object


def build_frame(pid, counter=0):
    """Return the 8-byte AD structure for a minimal MiBeacon."""
    payload = struct.pack("<HH", FC_VERSION_4, pid)
    return bytes([0x07, 0xFF]) + struct.pack("<H", MI_COMPANY_ID) + payload


def main():
    default = Path(__file__).resolve().parents[1] / "firmware" / "rom_512k.bin"
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rom", default=str(default))
    ap.add_argument("--out", default="build/rom_mibeacon.bin")
    ap.add_argument("--pid", type=lambda x: int(x, 0), default=0x0000,
                    help="Product ID from the Xiaomi IoT platform (default 0 = placeholder)")
    ap.add_argument("--check", action="store_true", help="only verify the patch site")
    args = ap.parse_args()

    rom = bytearray(Path(args.rom).read_bytes())
    old = bytes(rom[SITE:SITE + SLOT])
    new = build_frame(args.pid)
    assert len(new) == SLOT, len(new)

    ok = old[0] == 0x07 and old[1] == 0xFF
    print(f"site 0x{SITE:05x}  old {old.hex(' ')}  {'OK' if ok else 'UNEXPECTED'}")
    print(f"                 new {new.hex(' ')}")
    print(f"  frame control 0x{FC_VERSION_4:04x} (v4, no MAC/capability/object)")
    print(f"  company ID    0x{MI_COMPANY_ID:04x} (Xiaomi)")
    print(f"  product ID    0x{args.pid:04x}" + ("  <-- placeholder, not bindable" if not args.pid else ""))
    if args.check:
        return 0 if ok else 1
    if not ok:
        print("refusing to patch: unexpected bytes at the site", file=sys.stderr)
        return 1

    rom[SITE:SITE + SLOT] = new
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(rom)
    print(f"\nwrote {out} ({len(rom)} B)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
