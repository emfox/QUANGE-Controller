#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wxapkg_unpack.py —— 微信小程序包（.wxapkg）解包 + 关键字搜索

纯本地实现，不联网、不依赖第三方库。支持三种常见的包格式：

  1. 老格式（安卓）      首字节 0xBE
  2. PC 版 XOR 加密      首字节任意，密钥是 appid（需 --appid）
  3. V1MMWX 新容器       首 6 字节是 ASCII "V1MMWX"，其后整段 XOR 0x30

用法:
    python3 wxapkg_unpack.py --selftest                    # 自检（造三种假包再解回来）
    python3 wxapkg_unpack.py -f __APP__.wxapkg             # 解包到 ./unpacked/
    python3 wxapkg_unpack.py -f a.wxapkg --list             # 只列文件
    python3 wxapkg_unpack.py -f a.wxapkg --grep 2b12 DB0402 # 解包并搜索关键字
    python3 wxapkg_unpack.py -f a.wxapkg --appid wx123456   # PC 加密包

格式说明见 docs/miniprogram.zh-CN.md。
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
# 老格式 / PC 加密格式
# --------------------------------------------------------------------------
def parse_legacy(data: bytes):
    """解析 0xBE 老格式 wxapkg，返回 [(name, bytes), ...]"""
    if len(data) < 18:
        raise ValueError("文件太短，不是有效的 wxapkg")
    if data[0] != MAGIC:
        raise ValueError(
            f"首字节是 0x{data[0]:02X} 而不是 0xBE —— 既不是老格式，也不像 V1MMWX。"
            f"如果是 PC 版微信的加密包，需要带 --appid 参数重试")

    index_len = struct.unpack(">I", data[5:9])[0]
    end = data[13]
    if end != ENDS:
        raise ValueError(f"第 14 字节应为 0xED，实际 0x{end:02X}，结构不符")

    count = struct.unpack(">I", data[14:18])[0]
    if count <= 0 or count > 200000:
        raise ValueError(f"文件数异常: {count}")

    pos = 18
    entries = []
    for _ in range(count):
        if pos + 4 > len(data):
            raise ValueError("索引区被截断")
        name_len = struct.unpack(">I", data[pos:pos + 4])[0]
        pos += 4
        name = data[pos:pos + name_len].decode("utf-8", "replace")
        pos += name_len
        off, size = struct.unpack(">II", data[pos:pos + 8])
        pos += 8
        entries.append((name, off, size))

    body_start = 14 + index_len  # 数据区起始
    out = []
    for name, off, size in entries:
        start = body_start + off
        blob = data[start:start + size]
        if len(blob) != size:
            # 有的包 off 已含头部偏移，兜底再试一次
            blob = data[off:off + size]
        out.append((name, blob))
    return out


def try_decrypt(data: bytes, appid: str):
    """PC 版微信 wxapkg 的 XOR 解密（按 appid 逐字节异或）"""
    if data[0] == MAGIC:
        return data
    key = appid.encode()
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


# --------------------------------------------------------------------------
# V1MMWX 新容器
# --------------------------------------------------------------------------
def is_v1(data: bytes) -> bool:
    return len(data) >= 6 and data[:6] == V1_MAGIC


def v1_decode(data: bytes) -> bytes:
    """去掉 6 字节魔数，整段 XOR 0x30"""
    return bytes(b ^ V1_XOR for b in data[6:])


def parse_v1(data: bytes):
    """
    解析 V1MMWX 容器，返回 [(name, bytes), ...]

    解码后的布局（没有魔数头，索引区位置需要扫描定位）：

        [可选头部 / 其他块]
        [4B 名称长度][路径 UTF-8][4B 偏移][4B 大小]  × 文件数
        ... 中间可能夹着别的块 ...
        [数据区]

    两个容易踩的坑：
      * 索引项里的偏移是**相对整个解码缓冲区的绝对值**，不是相对数据区起点；
      * 索引区前面和后面都可能有别的内容（本例索引区前 1047 字节、后面紧跟
        一段以 PNG 魔数开头的二进制），所以既不能用「14 + index_len」算，
        也不能假定数据紧跟在索引之后。
    """
    if not is_v1(data):
        raise ValueError("不是 V1MMWX 容器")
    buf = v1_decode(data)

    entries = find_v1_index(buf)
    if not entries:
        raise ValueError("V1MMWX 解码成功（含 QUANGE 明文），但没能定位索引区；"
                         "可用 --raw 直接对解码后的缓冲做关键字搜索")

    out = []
    for name, off, size in entries:
        blob = buf[off:off + size]
        out.append((name, blob))
    return out


def _read_name(buf: bytes, pos: int):
    """在 pos 处尝试读一条索引项，返回 (name, off, size, next_pos) 或 None"""
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
    扫描整个缓冲区，找出最长的连续索引项序列，返回 [(name, off, size), ...]

    不用固定偏移（1047 只对这一个包成立），这样换版本也能解。
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
# 输出 / 搜索
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
    """按魔数自动选格式，返回 (files, fmt)"""
    if is_v1(data):
        if not quiet:
            print("[*] 识别为 V1MMWX 容器，去掉 6 字节魔数后 XOR 0x30 解码")
        return parse_v1(data), "V1MMWX"

    if data[0] == MAGIC:
        return parse_legacy(data), "legacy(0xBE)"

    if appid:
        dec = try_decrypt(data, appid)
        if not quiet:
            print(f"[*] 已按 appid={appid} 解密，首字节 = 0x{dec[0]:02X}")
        return parse_legacy(dec), f"PC-XOR({appid})"

    raise ValueError(
        f"首字节 0x{data[0]:02X}：既不是 0xBE 老格式，也不是 V1MMWX。"
        f"若是 PC 版微信的包，请加 --appid <小程序appid>")


# --------------------------------------------------------------------------
# 自检
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
    index_total = 4 + len(idx_bytes)  # indexInfoLength 含紧随 0xED 的 4 字节 fileCount
    header = (bytes([MAGIC]) + struct.pack(">I", 0x000000ED)
              + struct.pack(">I", index_total) + struct.pack(">I", len(body_bytes))
              + bytes([ENDS]) + struct.pack(">I", len(files)))
    return header + idx_bytes + body_bytes


def _build_v1(files, preamble=b"\x00" * 32):
    """造一个 V1MMWX 包：preamble + 索引区 + 尾部杂项 + 数据区，偏移用绝对值"""
    n = len(files)
    idx_len = sum(12 + len(name.encode()) for name, _ in files)
    data_start = len(preamble) + idx_len + 16       # 索引与数据之间故意夹 16 字节杂项
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
    # 索引后的 16 字节杂项，模拟真实包里的 PNG 魔数
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
        print(f"[selftest] {label:12s} 包 {len(pkg):>6,} 字节 → {len(out)} 个文件  "
              f"{'通过' if ok else '失败'}")
        if ok:
            for name, p, idx, ctx in grep(out, ["2b12", "QUANGE"]):
                print(f"   命中 {p!r} @ {name}:{idx}  …{ctx[:70]}…")

    # PC 加密包：用 appid 逐字节 XOR 后再走 legacy 解析
    appid = "wx1234567890abcdef"
    plain = _build_legacy(files)
    key = appid.encode()
    enc = bytes(b ^ key[i % len(key)] for i, b in enumerate(plain))
    out, fmt = detect_and_parse(enc, appid=appid, quiet=True)
    ok = all(a[1] == b[1] for a, b in zip(out, files))
    ok_all = ok_all and ok
    print(f"[selftest] {'PC-XOR':12s} 包 {len(enc):>6,} 字节 → {len(out)} 个文件  "
          f"{'通过' if ok else '失败'}")
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
                    help="不按索引解析，直接把解码后的整段缓冲当一个大文件搜索")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        return selftest()
    if not a.file:
        ap.print_help()
        return 2

    with open(a.file, "rb") as f:
        data = f.read()
    print(f"[*] 读入 {a.file}  ({len(data):,} 字节)")

    if a.raw:
        buf = v1_decode(data) if is_v1(data) else data
        files = [(os.path.basename(a.file), buf)]
        fmt = "raw"
    else:
        files, fmt = detect_and_parse(data, a.appid)
    print(f"[+] 格式 {fmt}，解析出 {len(files)} 个文件，共 "
          f"{sum(len(b) for _, b in files):,} 字节")

    if a.list:
        for name, blob in files:
            print(f"    {len(blob):>9,}  {name}")
        return 0

    if a.grep is not None or not a.raw:
        outdir = a.outdir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "unpacked")
        n = dump(files, outdir)
        print(f"[+] 已解出 {n} 个文件到 {outdir}")

    patterns = a.grep if a.grep else [
        "writeBLECharacteristicValue", "2b12", "1001", "onBLECharacteristicValueChange"]
    hits = grep(files, patterns)
    print(f"\n[+] 关键字命中 {len(hits)} 处：")
    for name, p, idx, ctx in hits[:60]:
        print(f"    {name} : {p}  …{ctx[:150]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
