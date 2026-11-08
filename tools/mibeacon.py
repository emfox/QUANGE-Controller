#!/usr/bin/env python3
"""MiBeacon broadcast encoder / decoder.

Implements the frame format from the Mi Beacon spec: Advertising uses Service
Data (AD type 0x16) with 16-bit UUID 0xFE95; Scan Response uses Manufacturer
Specific Data (AD type 0xFF) with Xiaomi company ID 0x038F. Both carry the same
frame: Frame Control(2) | Product ID(2) | Frame Counter(1) | [MAC(6)] |
[Capability(1)] | [Object...] | [Random/High Counter(3)].

Usage:
    python tools/mibeacon.py --selftest
    python tools/mibeacon.py --parse "8f 03 00 40 34 12 00"
    python tools/mibeacon.py --rom
"""
import argparse
import struct
import sys
from pathlib import Path

MI_SERVICE_UUID = 0xFE95
MI_COMPANY_ID = 0x038F

AD_SERVICE_DATA = 0x16
AD_MANUFACTURER = 0xFF

FC_TIME_PROTOCOL = 1 << 0
FC_ENCRYPTED = 1 << 3
FC_HAS_MAC = 1 << 4
FC_HAS_CAPABILITY = 1 << 5
FC_HAS_OBJECT = 1 << 6
FC_BINDING_CONFIRM = 1 << 9
FC_SECURE_AUTH = 1 << 10
FC_SECURE_LOGIN = 1 << 11

CAP_CONNECTABLE = 1 << 0
CAP_CENTRALABLE = 1 << 1
CAP_ENCRYPTABLE = 1 << 2
CAP_BOND_MASK = 0x18
BOND_NAMES = {
    0x00: "user/RSSI picks the device",
    0x08: "scan first, connect after the device confirms",
    0x10: "connect right away, device confirms physically",
    0x18: "combo device",
}


def encode(pid, counter=0, mac=None, capability=None, objects=(), service_data=True):
    """Build the on-air bytes for one MiBeacon AD structure."""
    fc = 4 << 12
    if mac is not None:
        fc |= FC_HAS_MAC
    if capability is not None:
        fc |= FC_HAS_CAPABILITY
    if objects:
        fc |= FC_HAS_OBJECT

    body = struct.pack("<HHB", fc, pid, counter & 0xFF)
    if mac is not None:
        body += bytes(mac)[::-1]          # on-air order is reversed
    if capability is not None:
        body += bytes([capability])
    for obj_id, data in objects:
        body += struct.pack("<HB", obj_id, len(data)) + bytes(data)

    if service_data:
        head = bytes([len(body) + 3, AD_SERVICE_DATA]) + struct.pack("<H", MI_SERVICE_UUID)
    else:
        head = bytes([len(body) + 3, AD_MANUFACTURER]) + struct.pack("<H", MI_COMPANY_ID)
    return head + body


def decode(raw):
    """Decode one AD structure that starts at a 0x16 or 0xFF header byte."""
    if len(raw) < 5:
        raise ValueError("too short")
    alen, atype = raw[0], raw[1]
    if len(raw) < alen + 1:
        raise ValueError(f"AD length {alen} exceeds the {len(raw)} bytes given")
    payload = raw[2:alen + 1]
    if atype == AD_SERVICE_DATA:
        ident = struct.unpack_from("<H", payload, 0)[0]
        if ident != MI_SERVICE_UUID:
            raise ValueError(f"service UUID 0x{ident:04x} is not MiBeacon")
        source = "service data"
    elif atype == AD_MANUFACTURER:
        ident = struct.unpack_from("<H", payload, 0)[0]
        if ident != MI_COMPANY_ID:
            raise ValueError(f"company 0x{ident:04x} is not Xiaomi")
        source = "manufacturer data"
    else:
        raise ValueError(f"AD type 0x{atype:02x} carries no MiBeacon")

    f = payload[2:]
    out = {"source": source, "ident": ident}
    fc, pid = struct.unpack_from("<HH", f, 0)
    counter = f[4] if len(f) >= 5 else None
    out.update(fc=fc, version=fc >> 12, pid=pid, counter=counter,
               time_protocol=bool(fc & FC_TIME_PROTOCOL),
               encrypted=bool(fc & FC_ENCRYPTED),
               binding_confirm=bool(fc & FC_BINDING_CONFIRM),
               secure_auth=bool(fc & FC_SECURE_AUTH),
               secure_login=bool(fc & FC_SECURE_LOGIN))
    off = 5
    out["truncated"] = len(f) < 5
    if fc & FC_HAS_MAC and len(f) >= off + 6:
        out["mac"] = ":".join(f"{b:02x}" for b in f[off:off + 6][::-1])
        off += 6
    if fc & FC_HAS_CAPABILITY and len(f) > off:
        cap = f[off]
        off += 1
        out["capability"] = {
            "raw": cap,
            "connectable": bool(cap & CAP_CONNECTABLE),
            "centralable": bool(cap & CAP_CENTRALABLE),
            "encryptable": bool(cap & CAP_ENCRYPTABLE),
            "bond": BOND_NAMES.get(cap & CAP_BOND_MASK, "reserved"),
        }
    objs = []
    if fc & FC_HAS_OBJECT:
        while off + 3 <= len(f):
            obj_id, olen = struct.unpack_from("<HB", f, off)
            data = f[off + 3:off + 3 + olen]
            objs.append((obj_id, data))
            off += 3 + olen
        out["objects"] = objs
    out["trailing"] = f[off:]
    return out


def show(info):
    print(f"  source        {info['source']}  (id 0x{info['ident']:04x})")
    print(f"  frame control 0x{info['fc']:04x}  version {info['version']}")
    print(f"  product ID    0x{info['pid']:04x}")
    print(f"  counter       {info['counter'] if info['counter'] is not None else 'MISSING (mandatory field)'}")
    flags = [k for k in ("time_protocol", "encrypted", "binding_confirm",
                         "secure_auth", "secure_login") if info[k]]
    print(f"  flags         {', '.join(flags) if flags else '-'}")
    if "mac" in info:
        print(f"  mac           {info['mac']}")
    if "capability" in info:
        c = info["capability"]
        print(f"  capability    0x{c['raw']:02x}  connectable={c['connectable']} "
              f"encryptable={c['encryptable']} bond={c['bond']}")
    for obj_id, data in info.get("objects", []):
        print(f"  object        0x{obj_id:04x} len={len(data)}  {data.hex(' ')}")
    if info["trailing"]:
        print(f"  trailing      {info['trailing'].hex(' ')}")


def selftest():
    # Real beacon frame from a LYWSD03MMC, service data, UUID stripped.
    raw = bytes.fromhex("30 58 5B 05 0A 07 9A 99 38 C1 A4 08")
    ad = bytes([len(raw) + 3, AD_SERVICE_DATA]) + struct.pack("<H", MI_SERVICE_UUID) + raw
    info = decode(ad)
    assert info["fc"] == 0x5830, hex(info["fc"])
    assert info["pid"] == 0x055B
    assert info["counter"] == 0x0A
    assert info["mac"] == "a4:c1:38:99:9a:07", info["mac"]
    assert info["capability"]["raw"] == 0x08
    assert not info["objects"] if "objects" in info else True
    print("vector 1 (LYWSD03MMC beacon) ok")

    # The ROM placeholder: 4 data bytes only, so the mandatory counter is absent.
    rom = bytes.fromhex("07 ff 8f 03 00 40 34 12")
    info = decode(rom)
    assert info["fc"] == 0x4000 and info["pid"] == 0x1234
    assert info["counter"] is None and info["truncated"], info
    print("vector 2 (8-byte placeholder detected as truncated) ok")

    # Round trip with every optional field.
    built = encode(0x1A2B, counter=7, mac=bytes.fromhex("a4c138999a07"),
                   capability=CAP_CONNECTABLE | CAP_ENCRYPTABLE | 0x08,
                   objects=[(0x1004, b"\x02\x01")], service_data=False)
    info = decode(built)
    assert info["pid"] == 0x1A2B and info["counter"] == 7
    assert info["objects"] == [(0x1004, b"\x02\x01")], info["objects"]
    assert info["capability"]["connectable"] and info["capability"]["encryptable"]
    print("vector 3 (round trip) ok")
    print(f"  encoded: {built.hex(' ')}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--parse", help="hex bytes of one AD structure")
    ap.add_argument("--rom", nargs="?", const="firmware/rom_512k.bin",
                    help="decode the scan-response slot of a ROM image")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return 0
    if args.parse or args.rom:
        if args.parse:
            raw = bytes.fromhex(args.parse)
        else:
            rom = Path(args.rom).read_bytes()
            raw = rom[0xCD13:0xCD13 + rom[0xCD13] + 1]
        try:
            show(decode(raw))
        except ValueError as exc:
            print(f"  not a MiBeacon: {exc}")
            print(f"  raw: {raw.hex(' ')}")
        return 0
    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
