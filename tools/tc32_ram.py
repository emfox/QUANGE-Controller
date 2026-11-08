#!/usr/bin/env python3
"""RAM/IO access matrix for the QUANGE firmware.

Tracks constant register values linearly inside each function so that
`tloadr r3, [r6, #0x37]` can be resolved to an absolute address when r6
was loaded from a literal pool entry. Approximate by construction: a
register that is written on one branch keeps its value on the other, so
treat the output as "strong hints", not proof.
"""
import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tc32_disasm as T  # noqa: E402

CODE = ((0x0A8, 0x2F8E), (0x4000, 0xCCD6))
MEM = re.compile(r"^(t(?:loadr|storer)(?:b|h)?)(?:%\S+)?\s+(r\d+),\s*\[(r\d+|sp|pc)(?:,\s*(#?[\w]+))?\]")
MOVI = re.compile(r"^tmov%C?\s+(r\d+),\s*#(\d+)$")
MOVR = re.compile(r"^tmov\s+(r\d+),\s*(r\d+)$")
ADDI = re.compile(r"^tadd%C\s+(r\d+),\s*(r\d+),\s*#(\d+)$")
ADDS = re.compile(r"^tadd%C\s+(r\d+),\s*#(-?\d+)$")
SUBS = re.compile(r"^tsub%C\s+(r\d+),\s*#(-?\d+)$")


def functions(ins):
    """Split the image at entry points (call targets and tpush prologues)."""
    entries = {a for a, _, asm, i in ins if i.get("flow") == "call" or asm.startswith("tpush")}
    entries = {a for a in entries if any(lo <= a < hi for lo, hi in CODE)}
    starts = sorted(entries)
    out = []
    for n, lo in enumerate(starts):
        hi = starts[n + 1] if n + 1 < len(starts) else CODE[-1][1]
        out.append((lo, hi))
    return out


def scan(blk):
    """Yield (addr, kind, target, size, text) for every resolvable memory access."""
    reg = {}
    for a, _s, asm, info in blk:
        text = (info.get("text") or "").strip()
        m = MEM.match(text)
        if m:
            op, dst, base, off = m.group(1), m.group(2), m.group(3), m.group(4)
            store = op.startswith("tstorer")
            size = {"tloadrb": 1, "tstorerb": 1, "tloadrh": 2, "tstorerh": 2}.get(op, 4)
            if base == "pc":
                if not store:
                    reg[dst] = info.get("value")
                continue
            elif base == "sp":
                continue
            else:
                b = reg.get(base)
                if b is None:
                    continue
                if off and off.startswith("#"):
                    v = b + int(off[1:], 0)
                elif off:
                    o = reg.get(off)
                    if o is None:
                        continue
                    v = b + o
                else:
                    v = b
                if not (0x800000 <= v < 0x810000 or 0x840000 <= v < 0x850000):
                    continue
                yield a, "S" if store else "L", v, size, text
        if info.get("flow") == "call":
            for r in ("r0", "r1", "r2", "r3"):
                reg.pop(r, None)
            continue
        m = MOVI.match(text)
        if m:
            reg[m.group(1)] = int(m.group(2))
            continue
        m = MOVR.match(text)
        if m:
            if m.group(2) in reg:
                reg[m.group(1)] = reg[m.group(2)]
            else:
                reg.pop(m.group(1), None)
            continue
        m = ADDI.match(text)
        if m:
            src = reg.get(m.group(2))
            reg[m.group(1)] = None if src is None else src + int(m.group(3))
            continue
        m = ADDS.match(text)
        if m:
            cur = reg.get(m.group(1))
            reg[m.group(1)] = None if cur is None else cur + int(m.group(2))
            continue
        m = SUBS.match(text)
        if m:
            cur = reg.get(m.group(1))
            if cur is not None:
                reg[m.group(1)] = cur - int(m.group(2))
            continue


def main():
    default = Path(__file__).resolve().parents[1] / "firmware" / "rom_512k.bin"
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rom", default=str(default))
    ap.add_argument("--ram", help="report every access to this address (hex)")
    ap.add_argument("--region", help="report accesses inside LO:HI (hex)")
    ap.add_argument("--func", help="report accesses made by the function at ADDR (hex)")
    ap.add_argument("--top", type=int, default=40, help="how many addresses to list")
    args = ap.parse_args()

    rom = Path(args.rom).read_bytes()
    ins = T.linear(rom, CODE[0][0], CODE[1][1])
    fns = functions(ins)
    hits = defaultdict(list)
    for lo, hi in fns:
        blk = [x for x in ins if lo <= x[0] < hi]
        for a, kind, v, size, text in scan(blk):
            if v is None:
                continue
            hits[v].append((a, kind, size, lo, text))
    print(f"== functions={len(fns)}  distinct targets={len(hits)}")

    if args.ram:
        v = int(args.ram, 16)
        for a, kind, size, fn, tx in sorted(hits.get(v, [])):
            print(f"  {kind} {size}B  0x{a:05x}  fn 0x{fn:05x}  {tx}")
        if not hits.get(v):
            print("  (no access)")
        return

    if args.func:
        fn = int(args.func, 16)
        print(f"== function 0x{fn:05x} ==")
        for v in sorted(hits):
            for a, kind, size, f in hits[v]:
                if f == fn:
                    print(f"  {kind} {size}B  0x{a:05x} -> 0x{v:06x}")

    lo, hi = (int(x, 16) for x in (args.region or "0x0:0xffffffff").split(":"))
    rows = [(v, hits[v]) for v in sorted(hits) if lo <= v <= hi]
    print(f"== {len(rows)} addresses in 0x{lo:x}-0x{hi:x}")
    rows.sort(key=lambda r: -len(r[1]))
    for v, lst in rows[: args.top]:
        w = sum(1 for x in lst if x[1] == "S")
        r = sum(1 for x in lst if x[1] == "L")
        print(f"  0x{v:06x}  read={r:3d} write={w:3d}  sites={len(lst)}")


if __name__ == "__main__":
    main()
