# Vendor firmware code map (function level)

Function-level reverse engineering of `firmware/rom_vendor_firmware.bin`
(the `0x00000–0x0DFFF` slice). Method: see
[firmware-structure.en.md](firmware-structure.en.md) §0 — a pure-Python TC32 decoder with
99.80% coverage (26,056 instructions, 53 undefined).

> There is no symbol table. Every "name" below is a **descriptive label derived from behaviour**;
> only the addresses are hard facts.

---

## 1. At a glance

The 512 KB image holds 57,316 bytes of real content (`0xD3E4`). Only two blocks are code, split by a
4 KiB hole:

```
0x00000 +------------------------------+
        | header 0x00-0x1F             |  reset vector at 0x00 -> 0xB0
0x00020 | IRQ stub + 64 nops           |  0x20 writes 0x80006F=0x81 and returns
0x000B0 | boot / init / libs / main     |  main = 0x760
0x02F8C | end of code block A          |  followed by ASCII and zero padding
0x03000 +------------------------------+
        | 4 KiB near-zero (no refs)    |
0x04000 +------------------------------+
        | app layer / BLE callbacks /  |
        | BLE stack                    |
0x0CCD6 | end of code block B          |
0x0CCE0 | adv name, GATT tables, string|
0x0D104 | event callback table (83)    |
0x0D31C | pointer table (30)           |
0x0D3E4 +------------------------------+
```

> Warning: the previous layout table called `0x028–0x0A7` a "64-entry vector table". It is not:
> those 64 halfwords decode to `tmov r8, r8` (`0x06C0`) — **alignment padding**, not a jump table.

---

## 2. Boot chain

| Address | Action |
| --- | --- |
| `0x000` | `tj.n 0xB0` — the only instruction of the reset vector |
| `0x002–0x01F` | header fields: `0x18` = length `0xD3E4`; `0x10` holds a second `tj.n 0x1A0` |
| `0x020` | **IRQ stub**: `tpush {r2,r3}` -> `r2=0x81` -> write `0x80006F` -> nops -> `0xA8 tpop {r2,r3}; tjex lr` |
| `0x0B0` | reads flash address `0x04`; if it is `0xA5`, copies `0x05` to `0x80063E` (retention marker) |
| `0x0C2` | flash wake-up: `0x80000C=0xAB`, delay, `0x80000D=1` |
| `0x0DA` | fills `0x844900–0x84491F` with `0xFFFFFFFF` |
| `0x0EA` | `tmcsr 0x12` -> `sp=0x844AC0`; `tmcsr 0x13` -> `sp=0x848000` (mode switch / second stack) |
| `0x0FA` | clears `0x844940–0x844BD8` and `0x844000–0x8440FF` |
| `0x118` | `0x80060C = 0x40`, then `0x41` |
| `0x122` | copies data from `0xD3A4` to `0x844900` |
| `0x136` | `tjl 0x760` — **calls main** |
| `0x13A` | `tj 0x13A` — tight loop after main returns |

**main = `0x760`**; it starts by dropping four callback pointers into RAM (stored `+1`, the TC32
function-pointer convention):

```
0x0ED0 -> 0x844BCC      0x1378 -> 0x844BC8
0x7520 -> 0x844B14      0x13E8 -> 0x844B10
0x8435D8[1] = 1
-> 0x0D64() -> 0x14B8(2) -> 0x0B18() -> 0x08C0(0x42)
-> analog(0x8A) read-modify-write of bit 6
```

`0x8C0` is pin configuration: writes the pin number to `0x800066`, caches it at `0x8435C8`, special-cases
pin 32 through analog, then sets `0x800620 = 0x80B600` (output-enable bitmap).

---

## 3. Regions (partitioned by call fingerprint)

The "calls ->" column buckets `tjl` targets by their high bits (each bucket is `0x800` wide);
"IO" lists the most referenced registers.

| Range | Instrs | Role | Evidence |
| --- | --- | --- | --- |
| `0x000B0–0x02F8C` | 5,778 | boot, init, base library, main | 107 calls into `0x800-0xFFF` (HAL); IO `0x800740`x33, `0x80000C/D`x32, `0x800643`x18, `0x800F20`x11 |
| `0x04000–0x04FFF` | 1,928 | **app control logic** (cycle state machine, soft timers) | heavy use of `0x842F34` (3-entry timer array); IO `0x80059B`, `0x800580`, `0x800780` |
| `0x05000–0x058FF` | 1,111 | **command dispatch** (see protocol §3.6) | only code referencing the reply buffer `0x844ACC` |
| `0x05900–0x065FF` | 1,584 | **storage**: log table, queue index, state persistence | references `0x40000/0x42000/0x45000/0x46000` |
| `0x06600–0x071FF` | 1,455 | **peripheral driver** (GPIO-heavy) | **77** calls into the HAL bucket; IO `0x800540/0x800548/0x800581/0x800586` |
| `0x07200–0x077FF` | 713 | base library: `memcpy/memset/memcmp`, strings, wait loops | entries `0x719C`/`0x7200`/`0x7214` live here |
| `0x07800–0x087FF` | 1,992 | **BLE event / GATT callback layer** | all 83 slots of `0xD104` land here (11 distinct entries) |
| `0x08800–0x09FFF` | 2,980 | BLE radio / baseband | IO `0x800F00/0x800F20/0x800C2A/0x800C2B` |
| `0x0A000–0x0AFFF` | 1,984 | BLE stack above the link layer | IO `0x800F01/0x800F03`; RAM `0x8439xx/0x843Bxx` |
| `0x0B000–0x0B7FF` | 993 | stack <-> app glue | 12 calls into the HAL bucket; RAM `0x843Cxx/0x843Dxx` |
| `0x0B800–0x0BFFF` | 968 | **all 23 targets of table `0xD31C`** | `0x800740`x13 — nearly every function reads the tick |
| `0x0C000–0x0CFFF` | 1,579 | GPIO / analog front-end driver | IO `0x800540/0x800548/0x800550/0x800560` |

In the call graph, `0x8800–0x0CFFF` is a self-contained cluster (internal calls far outnumber external
ones) — consistent with a linked-in BLE library. `0x7800–0x087FF` only calls into the library and is
called from nowhere except the event table — consistent with the app-side callbacks.

---

## 4. Confirmed primitives

| Address | Role | Evidence |
| --- | --- | --- |
| `0x0840` | `analog_read(addr)` | writes `0x8000B8`, sets `0x8000BA` bit6, polls, reads `0x8000B9`; called by 77 functions |
| `0x0880` | `analog_write(addr,val)` | same, but writes `0x8000B9` |
| `0x08C0` | `gpio_set_func(pin)` | writes `0x800066`, `0x8435C8`, `0x800620` |
| `0x0934` | `flash_cmd(cmd)` | `0x80000D=1` -> `0xBF8(1)` -> `0x80000C=cmd` -> wait bit16 |
| `0x08F4` | `flash_send_addr(a)` | pushes a 24-bit address in three bytes, waiting on `0x80000D` bit4 each time |
| `0x09A4` | `flash_erase_sector(addr)` | `flash_cmd(8)` + `flash_send_addr` |
| `0x09E4` | `flash_write(addr,len,buf)` | byte-wise through `0x80000C` |
| `0x0A40` | `flash_read(addr,len,buf)` | the same, in reverse |
| `0x09ACC` | uptime / state gate (returns `0xFFFF` when the state byte is not 8) | used to block flash writes during the first 300 s after power-up |
| `0x719C` / `0x7200` / `0x7214` | `memcmp` / `memset` / `memcpy` | byte loops, `(dst,val,len)` |
| `0x41B4` | `timer_add(id, interval)` | fills the 3-entry array at `0x842F34` (12 B each): `[+0]=id`, `[+4]=deadline`, `[+8]=interval` |
| `0x4308` | `timer_cancel(id)` | linear search of `0x842F34` and removal |
| `0x0506E` | protocol dispatch | see protocol §3.6 |
| `0x0590C` | persist state | writes `0x42000` / `0x46000` |
| `0x05994` | append a log record | read-modify-write of the whole `0x40000` sector, index at `0x45000` |
| `0x05AFC` | get the current log record | reads `0x45000`, returns NULL on `0xFF` |
| `0x05BA4` | acknowledge a record | `0x45000` minus one (`0` becomes `0xFF`) |

---

## 5. Application path

```
BLE event  -->  0xD104 event table (83 slots, 70 share the default handler 0x7AF2)
                +-> the 11 callbacks in 0x07800-0x087FF
                      +-> 0x0506E command dispatch (by frame[2])
                            +-> 0x05900-0x065FF storage: log / schedule / state
                            +-> 0x04000-0x04FFF control: start, stop, duration
                                  +-> 0x041B4 / 0x04308 soft timers (array 0x842F34)
```

How one sterilization cycle maps onto the code:

1. timer expiry or `DB 02 04 01` -> control logic sets the state and drives GPIO;
2. start time lands in the RAM struct near `0x84355C+0x3C`, duration nearby (see structure §3.2);
3. on stop, `0x64D0` computes the delta -> `0x5F4C` builds the 8-byte record -> `0x5994` appends it to flash;
4. the state frame (`DB 04 02`) reads that same RAM block.

---

## 6. The two pointer tables

| Table | Location | Entries | Targets |
| --- | --- | --- | --- |
| Event callbacks | `0xD104` | 83 (11 distinct) | all inside `0x7800–0x7FFF`, default `0x7AF2` |
| Pointer table | `0xD31C` | 30 (23 distinct) | all inside `0x0B882–0x0BF52`, 30–160 B apart |

All 30 targets of `0xD31C` read the tick (`0x800740`) and cluster in `0xB800` — more like a table of
timeout-driven state machines than plain function pointers. **Who iterates it is still unknown**
(no literal points at `0xD31C`).

---

## 7. Numbers and reproduction

```
functions (tjl targets + tpush prologues + table targets)   382 inside the real code ranges
instructions                                               26,056 (linear sweep over the image)
undefined                                                  53 (99.80% coverage)
call edges                                                 566
literal references                                         1,688
```

Reproduce:

```
python tools/tc32_disasm.py                      # coverage, call sites, literal distribution
python tools/tc32_disasm.py --regions            # the region table of §3 (call/IO/RAM fingerprint)
python tools/tc32_disasm.py --range 506e:51b0    # any fragment
python tools/tc32_disasm.py --functions --xrefs --tables
```

---

## 8. Still unknown

- What the second entry `0x1A0` (pointed at from header `0x10`) does.
- Who walks the `0xD31C` table; what `0x1DC` really is (it behaves like a hardware channel but the
  result equals `dividend / 60`).
- What the four callbacks `0x0ED0` / `0x1378` / `0x7520` / `0x13E8` handle.
- The meaning of ids `0x6309` and `0x6539` in the soft-timer array at `0x842F34`.
- Purpose of the 4 KiB hole at `0x3000` (not code, and no references at all).
- Which pins actually drive the UV load (`0x800540/0x800548` have 20+ accesses, not mapped pin by pin).
