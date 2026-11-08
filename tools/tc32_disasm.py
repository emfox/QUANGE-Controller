#!/usr/bin/env python3
"""TC32 disassembler for the QUANGE WY020702 vendor firmware.

Opcode table from trust1995/Ghidra_TELink_TC32 generate_sleigh.py, which was
extracted from Telink's tc32-elf-objdump. Python stdlib only.
"""

import argparse
import re
import struct
from collections import Counter, defaultdict
from pathlib import Path

INSNS = [
    (16, 0x46c0, 0xffff, 'tnop%c\\t\\t\\t; (mov r8, r8)'),
    (16, 0x0000, 0xffc0, 'tand%C\\t%0-2r, %3-5r'),
    (16, 0x0040, 0xffc0, 'txor%C\\t%0-2r, %3-5r'),
    (16, 0x0080, 0xffc0, 'tshftl%C\\t%0-2r, %3-5r'),
    (16, 0x00c0, 0xffc0, 'tshftr%C\\t%0-2r, %3-5r'),
    (16, 0x0100, 0xffc0, 'tasr%C\\t%0-2r, %3-5r'),
    (16, 0x0140, 0xffc0, 'taddc%C\\t%0-2r, %3-5r'),
    (16, 0x0180, 0xffc0, 'tsubc%C\\t%0-2r, %3-5r'),
    (16, 0x01c0, 0xffc0, 'trotr%C\\t%0-2r, %3-5r'),
    (16, 0x0200, 0xffc0, 'tnand%c\\t%0-2r, %3-5r'),
    (16, 0x0240, 0xffc0, 'tneg%C\\t%0-2r, %3-5r'),
    (16, 0x0280, 0xffc0, 'tcmp%c\\t%0-2r, %3-5r'),
    (16, 0x02c0, 0xffc0, 'tcmpn%c\\t%0-2r, %3-5r'),
    (16, 0x0300, 0xffc0, 'tor%C\\t%0-2r, %3-5r'),
    (16, 0x0340, 0xffc0, 'tmul%C\\t%0-2r, %3-5r'),
    (16, 0x0380, 0xffc0, 'tbclr%C\\t%0-2r, %3-5r'),
    (16, 0x03c0, 0xffc0, 'tmovn%C\\t%0-2r, %3-5r'),
    (16, 0x6bc0, 0xfff8, 'tmcsr%c\\t%0-2r'),
    (16, 0x6bc8, 0xfff8, 'tmrcs%c\\t%0-2r'),
    (16, 0x6bd0, 0xfff8, 'tmssr%c\\t%0-2r'),
    (16, 0x6bd8, 0xfff8, 'tmrss%c\\t%0-2r'),
    (16, 0x6800, 0xfe00, 'treti\\t%O'),
    (16, 0x6000, 0xff80, 'tadd%c\\tsp, #%0-6W'),
    (16, 0x6080, 0xff80, 'tsub%c\\tsp, #%0-6W'),
    (16, 0x0700, 0xff80, 'tjex%c\\t%S%x'),
    (16, 0x0400, 0xff00, 'tadd%c\\t%D, %S'),
    (16, 0x0500, 0xff00, 'tcmp%c\\t%D, %S'),
    (16, 0x0600, 0xff00, 'tmov%c\\t%D, %S'),
    (16, 0x6400, 0xfe00, 'tpush%c\\t%N'),
    (16, 0x6c00, 0xfe00, 'tpop%c\\t%O'),
    (16, 0xe800, 0xfe00, 'tadd%C\\t%0-2r, %3-5r, %6-8r'),
    (16, 0xea00, 0xfe00, 'tsub%C\\t%0-2r, %3-5r, %6-8r'),
    (16, 0xec00, 0xfe00, 'tadd%C\\t%0-2r, %3-5r, #%6-8d'),
    (16, 0xee00, 0xfe00, 'tsub%C\\t%0-2r, %3-5r, #%6-8d'),
    (16, 0x1200, 0xfe00, 'tstorerh%c\\t%0-2r, [%3-5r, %6-8r]'),
    (16, 0x1a00, 0xfe00, 'tloadrh%c\\t%0-2r, [%3-5r, %6-8r]'),
    (16, 0x1600, 0xf600, 'tloadrs%11?hb%c\\t%0-2r, [%3-5r, %6-8r]'),
    (16, 0x1000, 0xfa00, "tstorer%10'b%c\t%0-2r, [%3-5r, %6-8r]"),
    (16, 0x1800, 0xfa00, "tloadr%10'b%c\t%0-2r, [%3-5r, %6-8r]"),
    (16, 0xf000, 0xf800, 'tshftl%C\\t%0-2r, %3-5r, #%6-10d'),
    (16, 0xf800, 0xf800, 'tshftr%C\\t%0-2r, %3-5r, %s'),
    (16, 0xe000, 0xf800, 'tasr%C\\t%0-2r, %3-5r, %s'),
    (16, 0xa000, 0xf800, 'tmov%C\\t%8-10r, #%0-7d'),
    (16, 0xa800, 0xf800, 'tcmp%c\\t%8-10r, #%0-7d'),
    (16, 0xb000, 0xf800, 'tadd%C\\t%8-10r, #%0-7d'),
    (16, 0xb800, 0xf800, 'tsub%C\\t%8-10r, #%0-7d'),
    (16, 0x0800, 0xf800, 'tloadr%c\\t%8-10r, [pc, #%0-7W]\\t; (%0-7a)'),
    (16, 0x5000, 0xf800, 'tstorer%c\\t%0-2r, [%3-5r, #%6-10W]'),
    (16, 0x5800, 0xf800, 'tloadr%c\\t%0-2r, [%3-5r, #%6-10W]'),
    (16, 0x4000, 0xf800, 'tstorerb%c\\t%0-2r, [%3-5r, #%6-10d]'),
    (16, 0x4800, 0xf800, 'tloadrb%c\\t%0-2r, [%3-5r, #%6-10d]'),
    (16, 0x2000, 0xf800, 'tstorerh%c\\t%0-2r, [%3-5r, #%6-10H]'),
    (16, 0x2800, 0xf800, 'tloadrh%c\\t%0-2r, [%3-5r, #%6-10H]'),
    (16, 0x3000, 0xf800, 'tstorer%c\\t%8-10r, [sp, #%0-7W]'),
    (16, 0x3800, 0xf800, 'tloadr%c\\t%8-10r, [sp, #%0-7W]'),
    (16, 0x7000, 0xf800, 'tadd%c\\t%8-10r, pc, #%0-7W\\t; (t.add %8-10r, %0-7a)'),
    (16, 0x7800, 0xf800, 'tadd%c\\t%8-10r, sp, #%0-7W'),
    (16, 0xd000, 0xf800, 'tstorem%c\\t%8-10r!, %M'),
    (16, 0xd800, 0xf800, 'tloadm%c\\t%8-10r!, %M'),
    (16, 0xcf00, 0xff00, 'tserv%c\\t%0-7d'),
    (16, 0xc000, 0xf000, 'tj%8-11c.n\\t%0-7B%X'),
    (16, 0x8000, 0xf800, 'tj%c.n\\t%0-10B%x'),
    (32, 0x9000c000, 0xf800d000, 'tjlex%c\\t%B%x'),
    (32, 0x90009800, 0xf800f800, 'tjl%c\\t%B%x'),
]
I16 = [(v, m, a) for w, v, m, a in INSNS if w == 16]
I32 = [(v, m, a) for w, v, m, a in INSNS if w == 32]

CODE_END = 0xD3E4
KNOWN = {
    "ADV name": (0xCCE0, 0xCD00), "SCAN RSP": (0xCD00, 0xCD1C),
    "GATT data": (0xCD1C, 0xD098), "LFWY": (0xD098, 0xD0A4),
    "hex digits": (0xD3A4, 0xD3B4), "GAP name": (0xD3B4, 0xD3D0),
}


def sext(v, n):
    return v - (1 << n) if v & (1 << (n - 1)) else v


def word32(rom, addr):
    if addr + 4 > len(rom):
        return None
    h1 = struct.unpack_from("<H", rom, addr)[0]
    h2 = struct.unpack_from("<H", rom, addr + 2)[0]
    return (h1 << 16) | h2


def decode(rom, addr):
    w = word32(rom, addr)
    if w is not None:
        for v, m, a in I32:
            if w & m == v:
                h1, h2 = w >> 16, w & 0xFFFF
                target = (addr + 4) + (sext(h1 & 0x7FF, 11) << 12) + 2 * (h2 & 0x7FF)
                return 4, a, {"raw": w, "flow": "call", "target": target}
    h = struct.unpack_from("<H", rom, addr)[0]
    a = next((x for v, m, x in I16 if h & m == v), None)
    if a is None:
        return 2, "<undef>", {"raw": h}
    info = {"raw": h}
    head = a.split("\\")[0].split("%")[0].strip()
    if head.startswith("tj") and head != "tjex":
        cond = a.startswith("tj%8-11c")
        d = sext(h & (0xFF if cond else 0x7FF), 8 if cond else 11)
        info["flow"] = "cond_branch" if cond else "branch"
        info["target"] = (addr + 4) + 2 * d
    elif head == "tjex":
        info["flow"] = "indirect"
    elif head == "treti":
        info["flow"] = "return"
    if a.startswith("tloadr") and "[pc," in a:
        lit = ((addr + 4) & ~3) + 4 * (h & 0xFF)
        info["literal"] = lit
        if lit + 4 <= len(rom):
            info["value"] = struct.unpack_from("<I", rom, lit)[0]
    if a.startswith(("tmov", "tcmp", "tadd", "tsub")) and "#%0-7d" in a:
        info["imm"] = h & 0xFF
    return 2, a, info


def linear(rom, start, end):
    out = []
    addr = start
    while addr < end - 1:
        size, asm, info = decode(rom, addr)
        out.append((addr, size, asm, info))
        addr += size
    return out


def region(v):
    for name, (lo, hi) in KNOWN.items():
        if lo <= v <= hi:
            return name
    if v < CODE_END: return "code/const"
    if 0x40000 <= v < 0x47000: return "flash-config"
    if 0x76000 <= v < 0x78000: return "calibration"
    if 0x800000 <= v < 0x810000: return "io-register"
    if 0x840000 <= v < 0x850000: return "ram"
    return "other"


def main():
    default = Path(__file__).resolve().parents[1] / "firmware" / "rom_512k.bin"
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rom", default=str(default))
    ap.add_argument("--start", type=lambda x: int(x, 0), default=0xA8)
    ap.add_argument("--end", type=lambda x: int(x, 0), default=CODE_END)
    ap.add_argument("--range", help="print disassembly for START:END (hex)")
    ap.add_argument("--functions", action="store_true", help="function and call graph summary")
    ap.add_argument("--xrefs", action="store_true", help="literal pool data references")
    ap.add_argument("--tables", action="store_true", help="function pointer tables")
    args = ap.parse_args()

    rom = Path(args.rom).read_bytes()
    if args.range:
        lo, hi = (int(x, 16) for x in args.range.split(":"))
        for a, size, asm, info in linear(rom, lo, hi):
            extra = ""
            if info.get("target") is not None:
                extra += f"  -> 0x{info['target']:06x}"
            if "literal" in info:
                extra += f"  lit=0x{info['literal']:06x}"
                if info.get("value") is not None:
                    extra += f" val=0x{info['value']:08x}"
            print(f"{a:06x}: {info['raw']:04x}  {asm:<52}{extra}")
        return

    ins = linear(rom, args.start, min(args.end, len(rom)))
    stats = Counter(x[2].split("\\")[0].split("%")[0].strip() for x in ins)
    calls = [(a, i["target"]) for a, _, _, i in ins if i.get("flow") == "call"]
    lits = [(a, i["literal"], i.get("value")) for a, _, _, i in ins if "literal" in i]
    print(f"== image ==\n  {args.rom}\n  {len(rom)} B  code 0x{args.start:x}-0x{args.end:x}")
    print(f"== decode ==\n  instructions={len(ins)}  undefined={stats['<undef>']}"
          f"  coverage={1-stats['<undef>']/len(ins):.2%}")
    print("  top:", stats.most_common(12))
    print(f"== flow ==\n  call sites={len(calls)}  distinct targets={len(set(t for _, t in calls))}")
    print("  most called:", Counter(t for _, t in calls).most_common(10))
    print(f"== literals ==\n  refs={len(lits)}")
    print("  regions:", dict(Counter(region(v) for _, _, v in lits if v is not None)))
    print("  top io registers:", [(hex(v), n) for v, n in Counter(
        v for _, _, v in lits if v is not None and 0x800000 <= v < 0x810000).most_common(10)])

    if args.functions:
        entries = sorted(set(t for _, t in calls if 0xA8 <= t < CODE_END))
        pushes = [a for a, _, asm, _ in ins if asm.startswith("tpush")]
        combined = sorted(set(entries) | set(pushes))
        inbound = Counter(t for _, t in calls)
        print(f"== functions ==\n  call targets={len(entries)}  tpush prologues={len(pushes)}"
              f"  combined={len(combined)}")
        print("  top by inbound:", [(hex(f), n) for f, n in inbound.most_common(20)])
        for f in entries[:40]:
            print(f"    0x{f:06x}  called={inbound[f]}")

    if args.xrefs:
        print("== known data xrefs ==")
        for name, (lo, hi) in KNOWN.items():
            hits = [(hex(a), hex(v)) for a, lit, v in lits if v is not None and lo <= v <= hi]
            if hits:
                print(f"  {name:<14} {hits}")
        print("== immediate 0xDB / 0xBD sites ==")
        for a, _, asm, i in ins:
            if i.get("imm") in (0xDB, 0xBD):
                print(f"  0x{a:06x}  {asm.split(chr(92))[0]}  #0x{i['imm']:02X}")

    if args.tables:
        print("== function pointer tables ==")
        for name, lo, hi in (("event table", 0xD104, 0xD250), ("dispatch table", 0xD31C, 0xD394)):
            ptrs = [struct.unpack_from("<I", rom, o)[0] for o in range(lo, hi, 4)]
            u = sorted(set(ptrs))
            print(f"  {name} @{lo:06x}: {len(ptrs)} slots, {len(u)} distinct, "
                  f"default={hex(Counter(ptrs).most_common(1)[0][0])}"
                  f" x{Counter(ptrs).most_common(1)[0][1]}")
            print("   ", " ".join(hex(x) for x in u))


if __name__ == "__main__":
    main()
