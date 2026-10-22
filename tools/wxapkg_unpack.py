#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wxapkg_unpack.py - unpack a WeChat mini program bundle (.wxapkg) and search it

Fully local: no network access, no third-party dependencies. Three bundle formats
are supported:

  1. Legacy (Android)      first byte is 0xBE
  2. PC XOR-encrypted      any first byte; the key is the appid (requires --appid)
  3. V1MMWX container      first 6 bytes are ASCII "V1MMWX", the rest is XOR 0x30

Usage:
    python3 wxapkg_unpack.py --selftest                    # self-test: build three fake bundles and unpack them
    python3 wxapkg_unpack.py -f __APP__.wxapkg             # unpack into ./unpacked/
    python3 wxapkg_unpack.py -f a.wxapkg --list             # list entries only
    python3 wxapkg_unpack.py -f a.wxapkg --grep 2b12 DB0402 # unpack and grep for keywords
    python3 wxapkg_unpack.py -f a.wxapkg --appid wx123456   # PC-encrypted bundle

Format details: docs/miniprogram.en.md.
"""
import argparse
import io
import os
import struct
import sys

MAGIC = 0xBE
ENDS = 0xED
V1_MAGIC = b"V1MMWX"
V1_XOR = 0x30


# --------------------------------------------------------------------------
# Legacy format / PC-encrypted format
# --------------------------------------------------------------------------
def parse_legacy(data: bytes):
    """Parse a legacy 0xBE wxapkg and return [(name, bytes), ...]"""
    if len(data) < 18:
        raise ValueError("File too short to be a valid wxapkg")
    if data[0] != MAGIC:
        raise ValueError(
            f"First byte is 0x{data[0]:02X}, not 0xBE - neither the legacy format nor V1MMWX. "
            f"If this is a PC WeChat encrypted bundle, retry with --appid")

    index_len = struct.unpack(">I", data[5:9])[0]
    end = data[13]
    if end != ENDS:
        raise ValueError(f"Byte 14 should be 0xED, got 0x{end:02X}; structure does not match")

    count = struct.unpack(">I", data[14:18])[0]
    if count <= 0 or count > 200000:
        raise ValueError(f"Implausible file count: {count}")

    pos = 18
    entries = []
    for _ in range(count):
        if pos + 4 > len(data):
            raise ValueError("Index area truncated")
        name_len = struct.unpack(">I", data[pos:pos + 4])[0]
        pos += 4
        name = data[pos:pos + name_len].decode("utf-8", "replace")
        pos += name_len
        off, size = struct.unpack(">II", data[pos:pos + 8])
        pos += 8
        entries.append((name, off, size))

    body_start = 14 + index_len  # start of the data area
    out = []
    for name, off, size in entries:
        start = body_start + off
        blob = data[start:start + size]
        if len(blob) != size:
            # Some bundles already include the header offset in off; retry without it
            blob = data[off:off + size]
        out.append((name, blob))
    return out


def try_decrypt(data: bytes, appid: str):
    """XOR decryption for PC WeChat bundles (byte-wise, keyed by appid)"""
    if data[0] == MAGIC:
        return data
    key = appid.encode()
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


# --------------------------------------------------------------------------
# V1MMWX container
# --------------------------------------------------------------------------
def is_v1(data: bytes) -> bool:
    return len(data) >= 6 and data[:6] == V1_MAGIC


def v1_decode(data: bytes) -> bytes:
    """Strip the 6-byte magic and XOR the whole remainder with 0x30"""
    return bytes(b ^ V1_XOR for b in data[6:])


def parse_v1(data: bytes):
    """
    Parse a V1MMWX container and return [(name, bytes), ...].

    Layout after decoding (there is no magic header, so the index area has to be
    located by scanning):

        [optional header / other blocks]
        [4B name length][path as UTF-8][4B offset][4B size]  x file count
        ... other blocks may be interleaved ...
        [data area]

    Two easy traps:
      * The offset in each index entry is absolute within the whole decoded
        buffer, not relative to the start of the data area.
      * Unrelated content can sit both before and after the index (in this bundle
        the index starts at byte 1047 and is immediately followed by a block
        beginning with a PNG magic number). So neither "14 + index_len" nor the
        assumption that data follows the index directly will work.
    """
    if not is_v1(data):
        raise ValueError("Not a V1MMWX container")
    buf = v1_decode(data)

    entries = find_v1_index(buf)
    if not entries:
        raise ValueError("V1MMWX decoded successfully (QUANGE plaintext is present), but the "
                         "index area could not be located. Use --raw to grep the decoded "
                         "buffer directly")

    out = []
    for name, off, size in entries:
        blob = buf[off:off + size]
        out.append((name, blob))
    return out


def _read_name(buf: bytes, pos: int):
    """Try to read one index entry at `pos`; return (name, off, size, next_pos) or None"""
    if pos + 12 > len(buf):
        return None
    n = struct.unpack(">I", buf[pos:pos + 4])[0]
    if n == 0 or n > 255:
        return None
    raw = buf[pos + 4:pos + 4 + n]
    if len(raw) != n:
        return None
    try:
        name = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None
    if not name.startswith("/") or any(ord(c) < 0x20 for c in name):
        return None
    off, size = struct.unpack(">II", buf[pos + 4 + n:pos + 12 + n])
    if off + size > len(buf) or size <= 0:
        return None
    return name, off, size, pos + 12 + n


def find_v1_index(buf: bytes, min_entries: int = 3):
    """
    Scan the whole buffer and keep the longest run of consecutive index entries.

    Returns [(name, off, size), ...]. No fixed offset is used (1047 only holds for
    this particular bundle), so a different version still unpacks.
    """
    best = []
    for start in range(0, max(0, len(buf) - 12)):
        first = _read_name(buf, start)
        if not first:
            continue
        chain = []
        pos = start
        while True:
            item = _read_name(buf, pos)
            if not item:
                break
            chain.append(item[:3])
            pos = item[3]
        if len(chain) > len(best):
            best = chain
        if len(chain) >= 2000:
            break
    return best if len(best) >= min_entries else []


# --------------------------------------------------------------------------
# Output / search
# --------------------------------------------------------------------------
def dump(files, outdir):
    n = 0
    for name, blob in files:
        safe = name.replace("/", "\\") if os.name == "nt" else name
        path = os.path.join(outdir, safe.lstrip("\\/"))
        os.makedirs(os.path.dirname(path) or outdir, exist_ok=True)
        with open(path, "wb") as f:
            f.write(blob)
        n += 1
    return n


def grep(files, patterns, limit=400):
    hits = []
    for name, blob in files:
        for p in patterns:
            pb = p.encode()
            idx = blob.find(pb)
            while idx >= 0 and len(hits) < limit:
                s = max(0, idx - 90)
                e = min(len(blob), idx + len(pb) + 90)
                ctx = blob[s:e].decode("utf-8", "replace").replace("\n", " ")
                hits.append((name, p, idx, ctx))
                idx = blob.find(pb, idx + 1)
            if len(hits) >= limit:
                return hits
    return hits


def detect_and_parse(data: bytes, appid=None, quiet=False):
    """Pick the format from the magic bytes and return (files, fmt)"""
    if is_v1(data):
        if not quiet:
            print("[*] Detected a V1MMWX container; stripping the 6-byte magic and XOR 0x30")
        return parse_v1(data), "V1MMWX"

    if data[0] == MAGIC:
        return parse_legacy(data), "legacy(0xBE)"

    if appid:
        dec = try_decrypt(data, appid)
        if not quiet:
            print(f"[*] Decrypted with appid={appid}; first byte = 0x{dec[0]:02X}")
        return parse_legacy(dec), f"PC-XOR({appid})"

    raise ValueError(
        f"First byte 0x{data[0]:02X}: neither the legacy 0xBE format nor V1MMWX. "
        f"For a PC WeChat bundle, add --appid <mini program appid>")


# --------------------------------------------------------------------------
# Self-test
# --------------------------------------------------------------------------
def _build_legacy(files):
    body = io.BytesIO()
    index = io.BytesIO()
    offsets = []
    for name, blob in files:
        offsets.append((len(body.getvalue()), len(blob)))
        body.write(blob)
    for (name, _), (off, size) in zip(files, offsets):
        nb = name.encode()
        index.write(struct.pack(">I", len(nb)))
        index.write(nb)
        index.write(struct.pack(">II", off, size))
    idx_bytes = index.getvalue()
    body_bytes = body.getvalue()
    index_total = 4 + len(idx_bytes)  # indexInfoLength includes the 4-byte fileCount after 0xED
    header = (bytes([MAGIC]) + struct.pack(">I", 0x000000ED)
              + struct.pack(">I", index_total) + struct.pack(">I", len(body_bytes))
              + bytes([ENDS]) + struct.pack(">I", len(files)))
    return header + idx_bytes + body_bytes


def _build_v1(files, preamble=b"\x00" * 32):
    """Build a V1MMWX bundle: preamble + index + trailing junk + data, with absolute offsets"""
    n = len(files)
    idx_len = sum(12 + len(name.encode()) for name, _ in files)
    data_start = len(preamble) + idx_len + 16       # 16 bytes of junk deliberately sit between index and data
    total = data_start + sum(len(b) for _, b in files)

    buf = bytearray(total)
    buf[:len(preamble)] = preamble
    pos = len(preamble)
    off = data_start
    for name, blob in files:
        nb = name.encode()
        buf[pos:pos + 4] = struct.pack(">I", len(nb))
        buf[pos + 4:pos + 4 + len(nb)] = nb
        buf[pos + 4 + len(nb):pos + 12 + len(nb)] = struct.pack(">II", off, len(blob))
        pos += 12 + len(nb)
        off += len(blob)
    # 16 bytes after the index, mimicking the PNG magic found in the real bundle
    buf[pos:pos + 16] = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8
    off = data_start
    for _, blob in files:
        buf[off:off + len(blob)] = blob
        off += len(blob)

    return V1_MAGIC + bytes(b ^ V1_XOR for b in bytes(buf))


def selftest():
    files = [("/app-service.js", b"var x = 1; writeBLECharacteristicValue(0x2b12);"),
             ("/pages/index/index.html", b"<view>QUANGE</view>"),
             ("/utils/ble.js", b"const CHAR = '00010203-0405-0607-0809-0a0b0c0d2b12';")]
    ok_all = True

    for label, pkg in (("legacy 0xBE", _build_legacy(files)),
                       ("V1MMWX", _build_v1(files))):
        out, fmt = detect_and_parse(pkg, quiet=True)
        ok = (len(out) == len(files)
              and all(a[0] == b[0] and a[1] == b[1] for a, b in zip(out, files)))
        ok_all = ok_all and ok
        print(f"[selftest] {label:12s} bundle {len(pkg):>6,} bytes -> {len(out)} files  "
              f"{'PASS' if ok else 'FAIL'}")
        if ok:
            for name, p, idx, ctx in grep(out, ["2b12", "QUANGE"]):
                print(f"   hit {p!r} @ {name}:{idx}  ...{ctx[:70]}...")

    # PC-encrypted bundle: XOR byte-wise with the appid, then parse as legacy
    appid = "wx1234567890abcdef"
    plain = _build_legacy(files)
    key = appid.encode()
    enc = bytes(b ^ key[i % len(key)] for i, b in enumerate(plain))
    out, fmt = detect_and_parse(enc, appid=appid, quiet=True)
    ok = all(a[1] == b[1] for a, b in zip(out, files))
    ok_all = ok_all and ok
    print(f"[selftest] {'PC-XOR':12s} bundle {len(enc):>6,} bytes -> {len(out)} files  "
          f"{'PASS' if ok else 'FAIL'}")
    return 0 if ok_all else 1


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-f", "--file", default=None)
    ap.add_argument("-o", "--outdir", default=None)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--grep", nargs="*", default=None)
    ap.add_argument("--appid", default=None)
    ap.add_argument("--raw", action="store_true",
                    help="skip index parsing and grep the whole decoded buffer as one blob")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        return selftest()
    if not a.file:
        ap.print_help()
        return 2

    with open(a.file, "rb") as f:
        data = f.read()
    print(f"[*] Read {a.file}  ({len(data):,} bytes)")

    if a.raw:
        buf = v1_decode(data) if is_v1(data) else data
        files = [(os.path.basename(a.file), buf)]
        fmt = "raw"
    else:
        files, fmt = detect_and_parse(data, a.appid)
    print(f"[+] Format {fmt}: {len(files)} files, "
          f"{sum(len(b) for _, b in files):,} bytes total")

    if a.list:
        for name, blob in files:
            print(f"    {len(blob):>9,}  {name}")
        return 0

    if a.grep is not None or not a.raw:
        outdir = a.outdir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "unpacked")
        n = dump(files, outdir)
        print(f"[+] Wrote {n} files to {outdir}")

    patterns = a.grep if a.grep else [
        "writeBLECharacteristicValue", "2b12", "1001", "onBLECharacteristicValueChange"]
    hits = grep(files, patterns)
    print(f"\n[+] {len(hits)} keyword hits:")
    for name, p, idx, ctx in hits[:60]:
        print(f"    {name} : {p}  ...{ctx[:150]}...")
    return 0


if __name__ == "__main__":
    sys.exit(main())
