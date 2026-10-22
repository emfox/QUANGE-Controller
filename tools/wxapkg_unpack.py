#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wxapkg_unpack.py —— 微信小程序包（.wxapkg）解包 + 关键字搜索

纯本地实现，不联网、不依赖第三方库。

wxapkg 结构（安卓版，未加密）：
    [0]        0xBE                 魔数
    [1:5]      info1                通常 0x000000ED
    [5:9]      indexInfoLength      索引区长度
    [9:13]     bodyInfoLength       数据区长度
    [13]       0xED                 结束符
    [14:18]    fileCount           文件个数
    然后 fileCount 个索引项：
        4B 文件名长度 / 文件名 / 4B 偏移 / 4B 大小
    最后一整块 body

PC 版微信的包会被 XOR 加密（首字节不是 0xBE），本脚本支持传入 appid 尝试解密。

用法:
    python wxapkg_unpack.py --selftest                    # 自检（造一个假包再解回来）
    python wxapkg_unpack.py -f __APP__.wxapkg             # 解包到 ./unpacked/
    python wxapkg_unpack.py -f a.wxapkg --list             # 只列文件
    python wxapkg_unpack.py -f a.wxapkg --grep "2b12"      # 解包并搜索关键字
    python wxapkg_unpack.py -f a.wxapkg --appid wx123456   # PC 加密包
"""
import argparse
import io
import os
import struct
import sys

MAGIC = 0xBE
ENDS = 0xED


def parse(data: bytes):
    """解析 wxapkg，返回 [(name, bytes), ...]"""
    if len(data) < 18:
        raise ValueError("文件太短，不是有效的 wxapkg")
    if data[0] != MAGIC:
        raise ValueError(
            f"首字节是 0x{data[0]:02X} 而不是 0xBE —— 这是加密包（PC 版微信），"
            f"需要带 --appid 参数重试")

    info1 = struct.unpack(">I", data[1:5])[0]
    index_len = struct.unpack(">I", data[5:9])[0]
    body_len = struct.unpack(">I", data[9:13])[0]
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


def grep(files, patterns):
    hits = []
    for name, blob in files:
        # 二进制里找 UTF-8/ASCII 关键字
        for p in patterns:
            pb = p.encode()
            idx = blob.find(pb)
            if idx >= 0:
                while idx >= 0 and len(hits) < 400:
                    s = max(0, idx - 90)
                    e = min(len(blob), idx + len(pb) + 90)
                    ctx = blob[s:e].decode("utf-8", "replace").replace("\n", " ")
                    hits.append((name, p, idx, ctx))
                    idx = blob.find(pb, idx + 1)
    return hits


def selftest():
    """造一个假的 wxapkg 再解回来，验证解析器正确性"""
    files = [("app.js", b"var x = 1; writeBLECharacteristicValue(0x2b12);"),
             ("pages/index/index.wxml", b"<view>QUANGE</view>"),
             ("utils/ble.js", b"const CHAR = '00010203-0405-0607-0809-0a0b0c0d2b12';")]

    body = io.BytesIO()
    index = io.BytesIO()
    offsets = []
    for name, blob in files:
        offsets.append((len(body.getvalue()), len(blob)))
        body.write(blob)
    for (name, blob), (off, size) in zip(files, offsets):
        nb = name.encode()
        index.write(struct.pack(">I", len(nb)))
        index.write(nb)
        index.write(struct.pack(">II", off, size))

    idx_bytes = index.getvalue()
    body_bytes = body.getvalue()
    # indexInfoLength 包含紧随 0xED 之后的 4 字节 fileCount
    index_total = 4 + len(idx_bytes)
    header = (bytes([MAGIC]) + struct.pack(">I", 0x000000ED)
              + struct.pack(">I", index_total) + struct.pack(">I", len(body_bytes))
              + bytes([ENDS]) + struct.pack(">I", len(files)))
    pkg = header + idx_bytes + body_bytes

    out = parse(pkg)
    ok = len(out) == len(files) and all(a[0] == b[0] and a[1] == b[1]
                                        for a, b in zip(out, files))
    print(f"[selftest] 包大小 {len(pkg)} 字节，解析出 {len(out)} 个文件 -> "
          f"{'通过' if ok else '失败'}")
    if ok:
        hits = grep(out, ["2b12", "QUANGE"])
        for name, p, idx, ctx in hits:
            print(f"   命中 {p!r} @ {name}:{idx}  …{ctx}…")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-f", "--file", default=None)
    ap.add_argument("-o", "--outdir", default=None)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--grep", nargs="*", default=None)
    ap.add_argument("--appid", default=None)
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

    if data[0] != MAGIC and a.appid:
        data = try_decrypt(data, a.appid)
        print(f"[*] 已按 appid={a.appid} 解密，首字节 = 0x{data[0]:02X}")

    files = parse(data)
    print(f"[+] 解析出 {len(files)} 个文件，总解压后 "
          f"{sum(len(b) for _, b in files):,} 字节")

    if a.list:
        for name, blob in files:
            print(f"    {len(blob):>9,}  {name}")
        return 0

    outdir = a.outdir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "unpacked")
    n = dump(files, outdir)
    print(f"[+] 已解出 {n} 个文件到 {outdir}")

    patterns = a.grep if a.grep else ["writeBLECharacteristicValue", "2b12", "1001", "onBLECharacteristicValueChange"]
    hits = grep(files, patterns)
    print(f"\n[+] 关键字命中 {len(hits)} 处：")
    for name, p, idx, ctx in hits[:60]:
        print(f"    {name} : {p}  …{ctx[:150]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
