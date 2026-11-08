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

Operands are recovered straight from the bit fields embedded in the format strings
(`%0-2r` = register in bits 0–2, `%6-10d` = immediate in bits 6–10, `%D`/`%S` take their high bit
from bit 7/bit 6, a `tpush` list is bits 0–7 plus bit 8 = lr, condition codes are bits 8–11).
That makes the listing readable: `tmov r1, #219` (= `0xDB`) and `[r6, #2]` come out directly.

## 1. Code / data layout

| Range | Kind | Evidence |
| --- | --- | --- |
| `0x00000–0x0001F` | firmware header; `0x00` is `tj.n 0xB0` | length field `0x18` = `0xD3E4` |
| `0x00020–0x000AF` | **IRQ stub + 64 nops** | `0x20` writes `0x80006F=0x81` and returns; `0x28–0xA7` are all `tmov r8,r8` (`0x06C0`) — alignment padding, **not a vector table** |
| `0x000B0–0x02F8C` | boot, init, base library, **main** | `0x136` calls `0x760`, then spins forever |
| `0x02F8E–0x02FFF` | an ASCII string plus zero padding | code ends here |
| **`0x03000–0x03FFF`** | **4 KiB near-zero region** | 0 calls, 0 literals — not code |
| `0x04000–0x0CCD6` | app layer + BLE callbacks + BLE stack | region breakdown in [the code map](firmware-code-map.en.md) §3 |
| `0x0CCE0–0x0D0FF` | adv name / SCAN RSP / GATT attribute table | static analysis §3 |
| `0xD104–0xD24C` | **switch jump table**, 83 slots / 13 cases, all inside `0x7800–0x87FF` | §4 |
| `0xD250–0xD2E4` | config constants + **56-byte unstructured block** | §6 |
| `0xD31C–0xD390` | **pointer table**, 30 slots -> all inside `0x0B882–0x0BF52` | §4 |
| `0xD3A4–0xD3E4` | strings, constants, 4-byte checksum tail | — |

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
| **Frame check + command dispatch** | fn `0x5064`, core `0x50AC–0x5560` | `0x50AC tmov #0xDB` → branch to `0x50CA` → `0x50CC tmov #0xBD` → switch of `tmov #cmd; tcmp; tj` from `0x50D0` |
| **Reply builders** | `0x6A34` (4 x `tmov #0xBD` branches) | Also `0x0B28`, `0x6144`, `0x648A`, `0x9AAC` |
| Advertising data | `0x47D2`→`0xCD00`, `0x4804`→`0xCCEC`, `0x4D10`→`0xCCE4` | literal refs |
| GATT attribute table | `0x507E`, `0x509C`, `0x530E`, `0x58E6` | → `0xCD44`/`0xCD54`/`0xCDB4`/`0xCDC8` |
| Vendor string `LFWY020702/` | `0x569C`, `0x5848` | → `0xD098` |
| Hex digit table | `0x122` | → `0xD3A4` |
| **Log area `0x40000`** | written at `0x59C2`, read at `0x5AFC`, acked at `0x5BA4` | the address is built on the fly with `tmov #imm8; tshftl #11`, so no literal pool entry exists |

### 3.1 Complete command table

The dispatcher at `0x5064` tests `frame[0]` for the `0xDB` marker, takes **`frame[2]`** as the command
byte and spreads it through a binary comparison tree. Every reply is written into a fixed buffer at
`0x844ACC`: `[0]=0xBD`, `[1]=length`, `[2]=command byte copied verbatim`. Each branch was verified on
hardware (see [protocol §3.6](protocol.en.md)).

| cmd | Handler | Behaviour |
| --- | --- | --- |
| `00` `01` | `0x5224` | not implemented, replies `BD 01 00 xx` |
| `02` | `0x5438` | state query + time sync |
| `03` | `0x5424` | battery (RAM `0x8435A0`) |
| `04` | `0x555A` | start/stop, or write the schedule |
| `05` | `0x551A` | read one log record (`0x5AFC`) |
| `06` | `0x5536` | ack (`0x5BA4`), then fetch the next record |
| `07` | `0x50F6` | read the 4-slot schedule table (3 B/slot) |
| `08` | `0x51A4` | write the table (parsed at `0x604C` first) |
| `09` | `0x5242` | read the serial block at `0x43000` |
| `A0` | `0x5382` | **factory reset**: `0x5C18` erases the log/config/index sectors + `0x5F90` resets the RAM state |
| `A2` | `0x52F2` | MAC read/write (write only while the stored MAC is `FFx6`) |
| `A3` | `0x53DC` | serial number, written when the block is blank |
| `A4` | `0x564E` | version, literal `"000014"` |
| `A5` | `0x566A` | read-only MAC |
| `A6` | `0x5182` | erase `0x44000` + write `01` |

`EC` is not a command: it is the sector number in `0xEC << 11 = 0x76000` (calibration/MAC), and
`86` (`0x43000` serial), `88` (`0x44000` marker), `80`/`82`/`84`/`8A`/`8C` work the same way.
`3C` is not one either: it is the **second argument, 60**, passed to `0x1DC` at `0x514E`, converting
a slot's duration in seconds into the minutes shown in the reply's third byte.

### 3.2 Flash data layout (recovered from the address-building sites, checked against the image)

| Offset | Content | Evidence |
| --- | --- | --- |
| `0x40000` | log table, 200 x 8 B = 1600 B (timestamp[4] big-endian / duration[2] / type[1] / `0xFF`) | `0x59C2` reads-modifies-writes the whole sector |
| `0x41000` | config: `02 00 00 00 / B4 0F / 2C 01 00 00 …` (2 entries, 4020, 300) | `0x453A`, `0x5C32` |
| `0x42000` | 4-byte persistent value (measured `55`) | `0x5924`/`0x5934` |
| `0x43000` | 16-byte serial string (blank, `FFx16`, from the factory) | `0x5242`/`0x53E4`/`0x5834` |
| `0x44000` | marker sector, the target of `A6` (all `FF` from the factory) | `0x518E`/`0x5196` |
| `0x45000` | **1-byte log queue index**: +1 on append, -1 on ack, `0xFF` = empty | `0x59D0`/`0x5B36`/`0x5BE2` |
| `0x46000` | 4-byte timestamp (measured `6AEFE8EE`, equal to the newest log record) | `0x592C`/`0x5940` |
| `0x76000` | 8-byte calibration: the first 6 bytes reversed are the MAC | `0x5300`/`0x5674` |

The RAM state block starts at `0x84355C` (initialised by `0x5F90`; used by `0x5382`, `0x5438`, `0x51A4`):

| Offset | Content |
| --- | --- |
| `+0x00…+0x2F` | 4 slots x 12 B: `+4` = minute (4 B), `+8` = hour (4 B), remaining fields unknown |
| `+0x30` | status word (`0x84358C`, `[1]` is the flag `A0` branches on) |
| `+0x3C` | **duration of the current cycle, in seconds** (the log timestamp written at the end is `+0x48 − +0x3C`, see the code map §8) |
| `+0x40` | seconds elapsed in this cycle (1 Hz increment) |
| `+0x48` | **current second counter** (`0x8435A4`, 1 Hz increment; the state query writes it too) |
| `+0x4C` / `+0x53` | single-byte flags (`0x5F90` sets `2`; the log trigger type is read from here) |
| `+0x50…+0x5F` | **4 x 32-bit durations in seconds**, one per slot — the duration is not stored in the slot |

So a slot only says *when*; durations live in a parallel array. The factory defaults are `08:00` and
`20:00`, both `180 s` (3 minutes).

The log is a **stack**: append writes `index+1`, an ack writes `index-1`, so records are consumed
**newest first**, and `0xFF` means empty. **An ack only moves that one byte — nothing is erased**,
which is why all 200 slots still hold their history after 45 acknowledgements. Each append rewrites
the whole 1600 B block (read-modify-write of the entire sector), so flash wear is one sector erase
per logged record.

## 4. Two switch jump tables

Both are `switch` jump tables, **not callback registries** (corrected 2026-11-08, see the code map §6).

- **`0xD104`**: 83 slots, 13 real cases, **70 slots point at `0x7AF2`** — and `0x7AF2` is literally
  `r6 = 0; return r6`, i.e. `default: return 0`. The 13 case values match the ATT opcode numbering
  one by one, so this is the ATT request dispatcher (`0x7A98`), reached from `0x8D04`.
- **`0xD31C`**: 30 slots, 23 distinct addresses increasing from `0xB882` to `0xBF52`, default
  `0xBCA6`. Served by a dispatcher at `0xB8A6` (`index << 2`) which has **no static caller**.
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
2. Two switch jump tables (§4; previously recorded as "function pointer tables with 34 indirect entries").
3. The 4 KiB `0x3000–0x3FFF` region has **no code references at all** (0 calls, 0 literals) —
   more likely a reserved/calibration sector than a "low-entropy data table".
4. Exact addresses of command dispatch and reply builders (§3); **the whole command table and the
   flash data layout** (§3.1, §3.2) — including `03` (battery), `09` (serial block) and `A6`
   (erase the marker sector), none of which appear anywhere in the protocol doc.
5. The four "glue" functions of the main loop (see [the code map](firmware-code-map.en.md) §12):
   `0x5060` is a 4-byte call-through-RAM-pointer stub; the real dispatcher entry is `0x5064`
   (the old `0x506E` note was corrected); `0xADDC` / `0xADB8` / `0xADC4` / `0xADD0` are four
   one-instruction accessors of the `0x843C0C` struct; `0x7484` is a bit RMW on analog registers.
  The same round identified that struct as the **timer / low-power scheduling block**
  (`+0x28` = next timer deadline, `+0x34` -> timer compare register, `+0x14`/`+0x18` = two
  durations in milliseconds) — see §13.
6. `0x800740` used by 40 functions: much of the logic is tick-based soft timing, consistent with the
   two time bases observed in the log records.

## 7. Still unknown

- Semantics of the 64 x `0x06C0` vector slots; header field `0x0C`; vendor checksum algorithm.
- Purpose of the `0xD2A8` constant block and the `0x3000` near-zero region.
- Where the `0xD31C` table (30 slots) is entered from and what each case means; whether `0x2EA0` is the main loop.
- What `0x1DC` actually is: it writes both arguments into `0x800664`/`0x800668` and polls `0x80065C`,
  which looks like a hardware channel plus a wait — yet the result does equal `dividend / 60`
  (slot duration in seconds to minutes). Not yet classified.
- What the `0x6309` and `0x6539` events in the 3-entry software timer array at `0x842F34` (`0x41B4`)
  stand for — `0x5F90` cancels them first and `0x41B4` re-arms them with a `0x0F4240` interval.
- `0x800Fxx` / `0x80000C/D` register roles; which GPIO drives the UV/disinfection load.
- No symbol table: functions can only be labelled by address and reference, not named automatically.

## 8. Suggested next steps

1. **Hardware cross-check**: send frames for each §3 constant to see which of `A0…EC` are live commands.
2. **A second ROM dump** diffed against `0x40000` to pin down the sync cursor (open item in static analysis §4).
3. Extend `tc32_disasm.py` with control-flow traversal to map the state machine in `0x48EC` and the 30 `0xD31C` cases.
4. Install Ghidra + the TC32 language module for decompilation (P-code) of the large functions and switches.
