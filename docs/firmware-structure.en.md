# Vendor Firmware Structure (Disassembly)

> 2026-11-08. Follow-up to [static analysis](firmware-analysis.en.md): the code at `0x00000–0x0D3E4`
> is now actually disassembled.
> Tool: [`tools/tc32_disasm.py`](../tools/tc32_disasm.py), Python stdlib only.
> Reproduce: `python tools/tc32_disasm.py --functions --xrefs --tables`; use `--range 50ac:50e8` for a slice.

## 0. Method

Telink's `tc32-elf-objdump.exe` fails here with `0xC0000135` (three 2010-era MinGW DLLs are missing:
`libgcc_s_dw2-1.dll`, `libgcj-13.dll`, `libintl-8.dll`); Ghidra needs Java, also unavailable.

But [trust1995/Ghidra_TELink_TC32](https://github.com/trust1995/Ghidra_TELink_TC32) ships the
**complete opcode table extracted from that official objdump** in `generate_sleigh.py`
(62 x 16-bit + 2 x 32-bit entries with value/mask/format strings), and the `.slaspec` gives the
branch and PC-relative formulas. A pure-Python decoder was built from those, with no external deps.

**Confidence**: 26,056 instructions, only 53 undefined (**99.80% coverage**); 982 `tjl` call sites
resolve to 290 targets, **all inside `0x0–0xD3E4` and even-aligned**; literal-pool addresses are
overwhelmingly `0x800xxx` (registers) or `0x84xxxx` (RAM), matching the TLSR8258 memory map.
A standard ARM Thumb decoder (Capstone) produces the same instruction mix for code and for pure
data in this image — see static analysis §2.

Key formulas: branch `target = addr+4 + 2*sext(disp)`; 32-bit call
`target = addr+4 + (disp1<<12) + 2*disp2`, `lr = addr+4`; literal `((addr+4)&~3) + 4*imm8`.

## 1. Code / data layout

| Range | Kind | Evidence |
| --- | --- | --- |
| `0x000–0x027` | Firmware header | Length at `0x18` |
| `0x028–0x0A7` | 64 x halfword `0x06C0` | Decodes as `tmov %D,%S`; vector semantics unclear |
| `0x0A8–0x2FFF` | Startup + Telink SDK library code | Dense calls/literals, no blank pages |
| **`0x3000–0x3FFF`** | **4 KiB near-zero region** | **0 call sites, 0 literal refs** — not code |
| `0x4000–0x6FFF` | Application: advertising, BLE/GATT, command handling | Highest call density, see §3 |
| `0x7000–0xCBFF` | Application logic + SDK (incl. event handlers) | Uniform code density |
| `0xCC00–0xD0FF` | Advertising/name/GATT attribute data and code referencing it | Static analysis §3 |
| `0xD104–0xD24C` | **Event callback table**, 83 slots | §4 |
| `0xD250–0xD2E4` | Config constants + **56 B unstructured block** | §6 |
| `0xD31C–0xD390` | **Jump/dispatch table**, 30 slots | §4 |
| `0xD3A4–0xD3E4` | Strings, constants, 4 B checksum | — |

## 2. Functions and call graph

- **290 direct call targets** (`tjl`/`tjlex`) + **278 `tpush` prologues** = ~**386 function entries**,
  median spacing 56 B, largest gap 2,218 B.
- Hottest (call count): `0x0880`(122), `0x7214`(78), `0x0840`(77), `0x0A40`(25), `0x09A4`(18).
  `0x0880`/`0x0840` touch `0x800643` (IRQMODE) and `0x8000B8/BA` — classic critical-section helpers;
  `0x7214` is 7 instructions called 78 times.
- Largest function `0x2EA0` spans ~2,224 instructions and contains a `0xBD` constant;
  likely the main state machine / BLE event handler (unverified).
- **34 entries never appear as direct call targets** (11 + 23): they are reached only through the
  two pointer tables below — the biggest remaining blind spot.

## 3. Located feature anchors

| Feature | Address | Evidence |
| --- | --- | --- |
| **Frame check + command dispatch** | fn `0x506E`, core `0x50AC–0x5560` | `0x50AC tmov #0xDB` → branch to `0x50CA` → `0x50CC tmov #0xBD` → switch of `tmov #cmd; tcmp; tj` from `0x50D0` |
| **Reply builders** | `0x6A34` (4 x `tmov #0xBD` branches) | Also `0x0B28`, `0x6144`, `0x648A`, `0x9AAC` |
| Advertising data | `0x47D2`→`0xCD00`, `0x4804`→`0xCCEC`, `0x4D10`→`0xCCE4` | literal refs |
| GATT attribute table | `0x507E`, `0x509C`, `0x530E`, `0x58E6` | → `0xCD44`/`0xCD54`/`0xCDB4`/`0xCDC8` |
| Vendor string `LFWY020702/` | `0x569C`, `0x5848` | → `0xD098` |
| Hex digit table | `0x122` | → `0xD3A4` |
| **Log area `0x40000`** | **no literal references found** | §7 |

Immediates in the dispatch function: `DB BD 08 04 06 03 07 00 01 02 05 09 0B 0D 0E 0F 10 11 19 3C 86 88 A0 A2 A3 A5 A6 EC`.
`DB/BD` are frame markers and `00 01 02 04 06 08` match the documented command codes.
**`A0/A2/A3/A5/A6` are now confirmed on hardware as `DB 01 Ax` device-info queries**: `A2`/`A5` return
the MAC, `A3` returns `LFWY020702/` + 6 bytes, `A4` returns version `"000014"`, `A6` an empty reply —
see [protocol §3.5](protocol.en.md). `EC/86/88/3C` remain unverified.

## 4. Two function pointer tables

- **`0xD104` event table**: 83 slots, **70 point to the same default handler `0x7AF2`**, only 11 distinct
  entries (`0x7AF2 0x7AFE 0x7B18 0x7B7C 0x7C00 0x7C5E 0x7CB6 0x7D96 0x7E00 0x7E74 0x7EA4`).
  A sparse table with a shared default: typical BLE event/message dispatch.
- **`0xD31C` jump table**: 30 slots, 23 distinct addresses increasing from `0xB882` to `0xBF52`,
  mostly 30–160 B apart — looks like a switch-case address table rather than 30 independent functions.
- **None of those 34 entries is among the 290 `tjl` targets**: the firmware relies heavily on indirect
  calls, so a static call graph alone misses this code.

## 5. Hardware registers (TLSR8258 datasheet)

| Address | Meaning | literal refs / functions |
| --- | --- | --- |
| `0x800740` | `SYS_TIMER0`, 16 MHz system tick | 89 / 40 functions — all delays, timeouts, soft timers |
| `0x800744` | system timer area | 16 / 11 |
| `0x800643` | `IRQMODE`, global IRQ enable | 32 / 22 |
| `0x800640`–`0x642` | IRQ masks | per-function literals |
| `0x8005xx` | GPIO config / I/O (`0x580`–`0x5A8`) | `0x800540`/`0x800548` x10 each, 5 functions |
| `0x800F00` / `0x800F20` | unidentified (likely RF/analog/flash control) | 8 / 16 |
| `0x80000C` / `0x80000D` | unidentified | 12 / 20 |

Of 1,688 literal references: RAM `0x84xxxx` 867, IO registers 384, code/constants 176, other 251.
**None points directly at the `0x40000` log area or the `0x76000` calibration area.**

## 6. New findings (absent from the protocol doc and static analysis)

1. **56-byte unstructured constant block `@0xD2A8–0xD2E0`**: `64 10 b7 1d … 78 e2 0a a0`,
   51 distinct byte values, entropy 5.63 (the code page at `0xCC00` scores 5.93 —
   **entropy alone does not imply cryptographic material**). It sits between config constants and the
   pointer tables, possibly BLE security/random-related. **Purpose unverified — do not treat as a key or backdoor.**
2. Two function pointer tables with 34 indirect entries (§4).
3. The 4 KiB `0x3000–0x3FFF` region has **no code references at all** (0 calls, 0 literals) —
   more likely a reserved/calibration sector than a "low-entropy data table".
4. Exact addresses of command dispatch and reply builders (§3).
5. `0x800740` used by 40 functions: much of the logic is tick-based soft timing, consistent with the
   two time bases observed in the log records.

## 7. Still unknown

- Semantics of the 64 x `0x06C0` vector slots; header field `0x0C`; vendor checksum algorithm.
- Purpose of the `0xD2A8` constant block and the `0x3000` near-zero region.
- What each of the 34 indirect entries does; whether `0x2EA0` is the main loop.
- Which command each dispatch case handles; `EC/86/88/3C` and top-level unknown codes are unverified
  (`A0/A2/A3/A5/A6` are confirmed on hardware, see §3).
- **Code path for scheduling and log persistence**: `0x40000` has no direct reference; only two
  `0x3FF00` literals (`@0xB254`, `@0xB572`) and several `tmov #0x40` were found. Sector-number-based
  access is suspected but unproven.
- `0x800Fxx` / `0x80000C/D` register roles; which GPIO drives the UV/disinfection load.
- Whether undocumented BLE commands or debug entry points exist.
- No symbol table: functions can only be labelled by address and reference, not named automatically.

## 8. Suggested next steps

1. **Hardware cross-check**: send frames for each §3 constant to see which of `A0…EC` are live commands.
2. **A second ROM dump** diffed against `0x40000` to pin down the sync cursor (open item in static analysis §4).
3. Extend `tc32_disasm.py` with control-flow traversal from the 34 indirect entries.
4. Install Ghidra + the TC32 language module for decompilation (P-code) of the large functions and switches.
