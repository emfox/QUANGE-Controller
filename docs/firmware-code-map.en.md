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

**main = `0x760`**, in full (`0x7A0` is the loop entry):

```
0x760  tpush {r4,r5,lr}
       [0x844BCC] = 0x0ED1   [0x844BC8] = 0x1379     ; stored as +1 thumb pointers
       [0x844B14] = 0x7521   [0x844B10] = 0x13E9
       [0x8435D9] = 1
       0x0D64()  -> 0x14B8(2) -> 0x0B18() -> 0x08C0(0x42)
       analog 0x8A read-modify-write of bit 6
0x7A0  if ([0x8435D8] != 0) goto 0x7CE            ; wake flag
       if ([0x842F30] != 0 && byte[[0x842F30]] != 0xFF) analog(0x8A) bits 0-5
0x7CE  if (r4 != 0) goto 0x7D6                    ; retained wake: skip stack init
0x7F8  0x4000()   ; reads flash 0x0AB8; byte[+2] == 19/20 selects
                  ;   0xEC000/0xEE000 or 0xFF000/0xFE000 into 0x842F2C/0x842F30
0x7FE  0x3EC()
0x802  0x4708()   ; BLE stack init (see §9)
0x806  0x6570()   ; reads flash 0x42000 (== 0x55 means first boot) and 0x44000 -> 0x8435BE
0x7D6  0x434() -> [0x800643] = 1 (enable IRQ) -> 0x4478() -> 0x437C() -> 0x660C()
0x7F0  [0x800623] = 8 ; 0x48EC() ; goto 0x7F0     ; <- main loop, never returns
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
| `0x06600–0x071FF` | 1,455 | **peripheral driver** (GPIO-heavy) | **77** calls into the HAL bucket; GPIO `0x800581/0x80059B/0x800593` (`0x800540/0x800548` are the TRNG, §15.5) |
| `0x07200–0x077FF` | 713 | base library: `memcpy/memset/memcmp`, strings, wait loops | entries `0x719C`/`0x7200`/`0x7214` live here |
| `0x07800–0x087FF` | 1,992 | **ATT request dispatch layer** (§6) | all 13 cases of the `0xD104` jump table land here, and so does the default |
| `0x08800–0x09FFF` | 2,980 | BLE radio / baseband | IO `0x800F00/0x800F20/0x800C2A/0x800C2B` |
| `0x0A000–0x0AFFF` | 1,984 | BLE stack above the link layer | IO `0x800F01/0x800F03`; RAM `0x8439xx/0x843Bxx` |
| `0x0B000–0x0B7FF` | 993 | stack <-> app glue | 12 calls into the HAL bucket; RAM `0x843Cxx/0x843Dxx` |
| `0x0B800–0x0BFFF` | 968 | **`0xB874` event dispatcher and all of its cases** (table A, §15.2) | `0x800740`x13 — nearly every function reads the tick |
| `0x0C000–0x0CFFF` | 1,579 | random numbers / crypto / analog front end | IO `0x800540/0x800548` (**TRNG**, §15.5), `0x800550/0x800560` |

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
| `0x05064` | protocol dispatch | see protocol §3.6 |
| `0x0590C` | persist state | writes `0x42000` / `0x46000` |
| `0x05994` | append a log record | read-modify-write of the whole `0x40000` sector, index at `0x45000` |
| `0x05AFC` | get the current log record | reads `0x45000`, returns NULL on `0xFF` |
| `0x05BA4` | acknowledge a record | `0x45000` minus one (`0` becomes `0xFF`) |

---

## 5. Application path

```
ATT receive (0x8D04, registered at 0x8439D0)
  +-> 0x7A98 dispatcher --> 0xD104 jump table (83 slots, 13 cases, default 0x7AF2 returns 0)
        +-> handlers in 0x07800-0x087FF / 0x08028-0x0855C
              +-> 0x05064 command dispatch (by frame[2])
                            +-> 0x05900-0x065FF storage: log / schedule / state
                            +-> 0x04000-0x04FFF control: start, stop, duration
                                  +-> 0x041B4 / 0x04308 soft timers (array 0x842F34)
```

How one sterilization cycle maps onto the code:

1. timer expiry or `DB 02 04 01` -> control logic sets the state (`[0x84355C+1] = 1`) and drives GPIO;
2. the cycle duration goes into `+0x3C`; from then on the 1 Hz callback (`0x6308`) adds one per second to
   `+0x48` (current time) and `+0x40` (seconds elapsed);
3. on stop, `0x64D0` derives the start as `+0x48 − +0x3C` -> `0x5F4C` builds the 8-byte record ->
   `0x5994` appends it to flash;
4. the state frame (`DB 04 02`) reads that same RAM block (remaining = `+0x3C − +0x40`, matching the
   measured `00B4 -> 0030`).

The exact fields are tabulated in §8.

---

## 6. Two jump tables (not callback registries)

The previous version called `0xD104` / `0xD31C` "function pointer / callback tables". **That was wrong.**
Both are `switch` jump tables.

`0x7A98` is the dispatcher:

```
r7 = arg1
[0x84361E] = 10
r5 = u32[0x84379C]        ; connection context
if (r5 == 0) return 0
[r5+4] = 2 ; [r5+8] = 4 ; [r5+9] = 0
r3 = byte[r7+10]          ; <- selector
if (r3 > 82) return 0     ; out of range also hits default
r1 = 0xD104[r3]
pc = r1
```

70 of the 83 slots point at `0x7AF2`, and `0x7AF2` is just `r6 = 0; return r6` — that is
`default: return 0`. So "70 slots share one handler" does not mean 70 events; there are **13 cases**:

| slot | block |
| --- | --- |
| 2, 3 | `0x7D96` |
| 4 | `0x7CB6` |
| 6 | `0x7EA4` |
| 8 | `0x7C5E` |
| 10, 12 | `0x7E74` |
| 16 | `0x7E00` |
| 18, 82 | `0x7C00` |
| 22 | `0x7B7C` |
| 24 | `0x7B18` |
| 30 | `0x7AFE` |

Those 13 values line up exactly with **ATT opcodes**: 2 MTU Req, 3 MTU Resp, 4 Find Information Req,
6 Find By Type Value Req, 8 Read By Type Req, 10 Read Req, 12 Read Blob Req, 16 Read By Group Type Req,
18 Write Req, 22 Prepare Write Req, 24 Execute Write Req, 30 Handle Value Confirmation,
82 (`0x52`) Write Command. And `0x8D04` (the receive handler) splits on `u16[conn+8]` into three
branches before calling into `0x7A98` via `0x8D96`.

So this layer is an **ATT request dispatcher**, not an application callback layer.
**Marked as a strong inference, unproven** (the numeric fit is excellent, but there is no symbol table).

`0xD31C` is also a jump table, but **it is not one 30-entry table — it is two 15-entry tables
back to back** (§15.2). The instruction before `0xB8A6` is `tcmp r0, #14` + `tjls`, so the index can
only be 0..14 and only covers `0xD31C–0xD357`. `0xD358` is a **second** table, referenced by its own
literal at `0xC034`, also indexed 0..14. Both use `0xBCA6` as the empty/default case.

Also withdrawn: the earlier "34 indirect entries" claim. Most of that list were case labels of these
two switch tables, not registered function pointers. Only ~30 thumb pointers are actually written to
RAM by code; `--indirect` lists them.

---

## 7. Soft timers and the 1 Hz tick

| Component | Address | Notes |
| --- | --- | --- |
| timer array | `0x842F34` | 4 slots x 12 B: `{fn, deadline, interval_ticks}`, count at `+0x30` |
| `timer_add` | `0x41B4` | `(fn, interval_us)`; inside, **`ticks = interval << 4`** |
| `timer_cancel` | `0x4308` | `(fn)`; matches by pointer, then compacts the array |
| `timer_poll` | `0x423C` | called once per main-loop iteration, `now = [0x800740]` |
| 1 Hz callback | `0x6308` | `[state+0x48] += 1`, `[state+0x40] += 1`, then reads local time |

`interval << 4` proves the argument is in **microseconds** and a tick is 16 MHz: `0x0F4240`
(1,000,000) is therefore **one second**, and the `0x4E200` (320,000) threshold in the main loop is
**20 ms**. The two numbers corroborate each other.

`0x6309` / `0x6539` are **not event ids** either — they are thumb pointers (`0x6308` / `0x6538` + 1).
The old open question about "two soft-timer events" had a false premise: `0x6308` is the 1 Hz timer
and `0x6538` is a different callback.

---

## 8. The log's start time is derived

The write path (previously only the entry and the landing spot were known):

```
cycle end -> 0x64D0
    r1 = [state+0x3C]                  ; duration of this cycle
    r0 = [state+0x48] - [state+0x3C]   ; now - duration = start time
  -> 0x5F4C(ts, dur)  packs 8 bytes: BE32(ts) BE16(dur) type 0xFF
  -> 0x5994           append (full-sector read-modify-write of 0x40000, index + 1)
```

**The timestamp in the record is not stored — it is back-computed as "now - duration".** That
explains the two-second gap measured on hardware (trigger at 14:17:00, record timestamp 14:16:58):
the trigger fires on a whole-second boundary while the record is written at cycle end.

That also pins down the `0x84355C` state block:

| Offset | Meaning |
| --- | --- |
| `+0x3C` | **duration of the current cycle in seconds** — the previous version said "start time", wrong |
| `+0x40` | seconds elapsed in this cycle (1 Hz increment) |
| `+0x48` | **current second counter** (1 Hz increment, i.e. "now") |
| `+0x50…+0x5C` | configured duration per slot, in seconds |

---

## 9. BLE stack init and the IRQ vector table

`0x4708` initialises the stack (called from `0x802`, cold-boot branch only; a retained wake skips it):

```
0x7670 0x840 0x880 0x4044 0x1F18 0x8F20 0x907C 0x9768 0x9A48 0xAD8C
0x8898 0x58E4 0x8938(0x8D05) 0x8950(...) 0xB5E8 0x90F8 0x9184 0x91CC
0x8FE0 0x14E0 0x8E30 x5 0x8944(0x4615) 0xAD8C 0xADDC 0xAFBC 0xAFDC
0x8E30 0xB4E0 0xB184(0x58F5) 0xB190(0x595D) 0x5980
```

`0x8E30(irq, handler)` is the IRQ registration: `[0x8438BC + 4 + irq*4] = handler`. Six of them:

| IRQ | handler |
| --- | --- |
| 3 | `0x4648` |
| 4 | `0x45EC` |
| 11 | `0x460C` |
| 13 | `0x4610` |
| 14 | `0x4618` |
| 15 | `0x03E0` |

`0x8938(0x8D05)` stores the ATT handler at `0x8439D0` — that is why `0x8D04` has no static caller (§6).
`0x8950(ptr, 168, 0x843048, 36)` writes two buffer pointers and lengths into the `0x84378C` struct
(`+0x0C/+0x14` and `+0x10/+0x16`).

---

## 10. Button

`0x43A0` scans bit 6 of `0x800580` (`r2 & 0x40`) with state at `0x842F68`: `+0` valid, `+1` edge,
`+2` previous, `+3` counter, `+4` flags. A short press goes `0x4440 -> 0x64D0` (end the cycle and
write the log). `0x4684` is the long-press test (`[+3] > 15`) and then calls `0xADB8(0x50)` /
`0x7484(0x40,0,1)` / `0xADDC(0x0F)` — consistent with the measured "long press reboots and starts an
automatic cycle".

---

## 11. The main loop `0x48EC` (81 basic blocks)

Every branch here is direct — **no indirect jump anywhere** — so the control flow can be rebuilt
completely over `0x48EC–0x4FDA`. Each iteration does the same three things first:

```
[0x844B68] += 1            ; iteration counter
0x423C()                   ; soft-timer poll
0x1B24()                   ; drives the BLE stack (reads 0x84393C+0x78, 0x8438BC+0x77)
...state handling...
0x43A0()                   ; button scan (0x800580 bit 6)
```

### 11.1 The three top-level gates

| Variable | Value | Path |
| --- | --- | --- |
| `[0x844B98]` | `0` | enters the `0x49A4` branch (250 ms cadence: `[0x800740] − [0x844B8C] > 3D0900`) |
| `[0x84358D]` state | `0` / `1` | idle / running. **The whole firmware only ever compares these two values** |
| `[0x842F70]` | `1` | enters `0x4AB0` (hardware already driving); `0` goes to `0x49D0` |

`0x844B98` **has no writer anywhere** (only one read at `0x490C`); it is most likely written by the
stack or an IRQ through a computed address — not confirmed. `0x842F70` is written by the button
handler (`0x4452`) and the start-up path (`0x6646`).

### 11.2 The 20 ms heartbeat

```
0x4956  r0 = [0x800740] − [0x844B80]
        if (r0 > 0x4E200) {            ; 320,000 ticks = 20 ms
            [0x844B80] = [0x800740]
            [0x842F68+4] |= 1
        }
```

The `0x49A4` branch uses the same tick source with `0x3D0900` (4,000,000 ticks = 250 ms).

### 11.3 Key action blocks

| Block | Purpose | Evidence |
| --- | --- | --- |
| `0x4B60` | **full stop**: `[+0x3C]=0`, `[+0x40]=0`, `[+0x44]=100`, `[+0x46]=110`, `0x800780 &= ~4`, **cancels all three timers (`0x6538`, `0x438C`, `0x6308`, including the 1 Hz one)**, clears `+2/+3/+9`, `0x800593 &= ~0x10`, clears bits 2/7 of `0x80059B` | 63 instructions, three `tjl 0x4308` |
| `0x4D48` | second stop variant: same three `timer_cancel` plus `0x8FE0` / `0xADDC` / `0xA014` | 64 instructions |
| `0x4AFC` | **start sequence**: `0xADDC(15)`, `0xADB8(16)`, `0x7484(64,0,1)`, `[0x842F68+4] |= 8`, `0x5060(0x43,16,0)` | — |
| `0x4DD4` | `[0x842F70] = 1` and stamps `[0x800740]`, back to `0x4918` | — |
| `0x4F10` | `[+2] = 1` plus `0xADB8` / `0x7484` / `timer_cancel` | — |
| `0x4EBE` | running-state check, loads `[+2]` into `sl` for comparison | — |
| `0x4E0A`/`0x4E1C`/`0x4E3E` | countdown logic (`tsub r2,#10`, then compare with 10) | — |
| `0x4EA0` | `0xADB8(64)` + `0x5060` | — |
| `0x4D08` | `0xADDC(0)` + inner loop (`0x6144` / `0x85A8`) | — |
| `0x4F62`–`0x4FB2` | tail loop: `0x85A8` / `0x6144`, limit `0x78` (120), continues only above 3 | — |

`0xADDC` / `0xADB8` / `0xA014` / `0x8FE0` live in the `0xA000` region (the glue above the stack),
`0x7484` in `0x07200`, `0x5060` in the command-dispatch region — by call fingerprint they look like
"set event / set flag / notify".

### 11.4 Five boolean sub-flags in the state block

Besides the state byte at `+1`, the `0x84358C` sub-structure holds five 0/1 booleans at `+2`, `+3`,
`+6`, `+9`, `+0xB`. Listing every access (`tools/tc32_ram.py --ram 84358E`) pins each one down:

| Byte | Address | Writers | Readers | Meaning |
| --- | --- | --- | --- | --- |
| `+2` | `0x84358E` | set by `0x53A0` / `0x5570` / `0x596A` / `0x64DC` / `0x65CE` (all soft-timer callbacks), cleared by `0x5FC0` | `0x4946` | **stage started** |
| `+3` | `0x84358F` | only `0x5FD8`, and that is a **clear** | `0x43F4` / `0x46AA` | **allow the button to act**; short-circuits the button branch together with `+6` |
| `+6` | `0x843592` | `0x686` / `0x6B8` (both in the boot section) | `0x66A` / `0x6A8` / `0x43EE` / `0x4688` / `0x4938` / `0x49DA` | **output lock** |
| `+9` | `0x843595` | **none** | `0x494E` | constant 0 — the only reader is a dead branch |
| `+0xB` | `0x843597` | `0x4418` / `0x4456` (button), `0x4994`, `0x6632` | `0x46A4` / `0x4974` / `0x4982` / `0x662A` | **long-press active** (set after 20 ticks held, cleared on release / after 150 ticks) |

---

## 12. What the four glue functions in the main loop really are

The main loop (§11) keeps calling `0xADDC` / `0xADB8` / `0x7484` / `0x5060`. None of them is
application logic: they are two foundations — an indirect-call stub, and the accessor set of one
peripheral / stack state block.

### 12.1 `0x5060` — a 4-byte indirect-call stub

```
0x5060  tjex r3      ; pc = r3
0x5062  tnop
```

Both call sites load the pointer into `r3` first:

```
0x4B1A  r3 = u32[0x844BCC]   ; the first callback main registers (thumb pointer 0x0ED0 + 1)
0x4B1E  r0 = 67  r1 = 16  r2 = 0
0x4B24  tjl 0x5060
```

`0x4EB2` does the same and passes `(128, 64)`.

=> `0x5060(a, b, c)` means **"call through the function pointer in RAM"**. That is why it shows up
in the main loop while doing nothing itself — and it means the notification channel is swappable:
replace `0x844BCC` and you replace the sink.

### 12.2 `0x5064` — the command dispatcher (entry address corrected)

Every earlier document said "the dispatcher at `0x506E`", but that is the **fifth instruction of the
prologue**; the real entry is `0x5064` (the next `tpush` after the `0x5060` stub). Corrected globally.

Besides the switch already documented, the prologue copies two 20-byte constants:

```
0x507E  copies 20 B from 0xCD54 to sp+0x30
0x509C  copies 20 B from 0xCD44 to sp+0x10
```

`0xCD54` = `90 5F 01 00` x4 + `01 29 00 00` (90000, 90000, 90000, 90000, 0x2901),
`0xCD44` = 16 x `FF` + `90 5F 01 00`. These are compiler-generated const templates for stack
aggregates; **no later reader was found**, so no conclusion is drawn here.

Case 7, fully decoded (previously only "reads the 4-slot table"):

```
r4 = reply buffer + 3
for (i = 0; i < 4; i++) {
    slot   = 0x84355C + i*12
    if (u32[slot+8] == 0xFF) break             ; empty slot (leading byte all FF)
    buf[0] = u32[slot+8]                       ; hour
    buf[1] = u32[slot+4]                       ; minute
    buf[2] = 0x1DC(u32[0x8435AC + i*4], 60)    ; duration in seconds / 60
    r4 += 3
}
```

`0x8435AC` = `0x84355C + 0x50`, exactly the parallel duration array. So the "slots store only the
time of day, durations live in a parallel array" claim is confirmed again, and `0x1DC` really is a
division (not a hardware channel).

### 12.3 `0xADDC` / `0xADB8` / `0xADC4` / `0xADD0` — four one-instruction accessors

```
0xADB8(x)   byte[0x843C0C + 0x05] = x ; ret
0xADC4(x)   half[0x843C0C + 0x0E] = x ; ret
0xADD0()    return u32[0x843C0C + 0x2C]
0xADDC(x)   byte[0x843C0C + 0x04] = x ; ret
```

All argument values across the 18 call sites:

| Accessor | Field | Arguments |
| --- | --- | --- |
| `0xADDC` | `+0x04` | `15` x5 (`0x46C2` / `0x486A` / `0x4AFE` / `0x4BDA` / `0x4D94`), `3` x1 (`0x46D0`), `0` x5 (`0x46EA` / `0x4D0A` / `0x6408` / `0x663A` / `0x6652`) |
| `0xADB8` | `+0x05` | `16` (`0x4636`, `0x4B02`), `80` (`0x46B2`, `0x4F2C`), `64` (`0x4EA0`) |
| `0xADC4` | `+0x0E` | `0` (`0x46E0`), `3` (`0x46F0`) |

The pattern in the main loop (`--callsites 0xADDC` reproduces it):

- all five `15` sit on start / running paths; the one at `0x4AFC` is
  `0xADDC(15)` -> `0xADB8(16)` -> `0x7484(64,0,1)` -> `[0x842F68+4] |= 8`, and `0x4BDA` / `0x4D94`
  also clear state and switch a register before writing 15;
- all five `0` sit on wrap-up paths: `0x46EA` (button), `0x4D0A`, and `0x6408` / `0x663A` / `0x6652`
  in the storage/driver region;
- the long-press path around `0x46A0`: `0xADB8(80)` -> `0x7484(64,0,1)` -> `0xADDC(15)`.

The value `15` = `0b1111` itself suggests `+0x04` is a **bit mask / level**, not an enum id.

### 12.4 `0x7484(a, b, c)` — bit read-modify-write on two 8-bit registers

```
m = a & 0xFF   (bit mask)
r0 = reg_read(a + 0x21)
b == 0 ? r0 |= m : r0 &= ~m
reg_write(a + 0x21, r0)

r0 = reg_read(a + 0x27)
c != 0 ? r0 |= m : r0 &= ~m
reg_write(a + 0x27, r0)
```

`reg_read` / `reg_write` are `0x840` / `0x880`: save `0x800643`, clear it (critical section), write
the address to `0x8000B8`, the data to `0x8000B9`, then `0x40` (read) or `0x60` (write) to `0x8000BA`
and poll the busy bit. So these are **analog/peripheral register accesses**, not a GPIO data port.

All three call sites pass `(64, 0, 1)`: set bit 6 of `0x61` and `0x67`.
The matching power-up sequence is `0x74EC(a)`:

```
reg 0x3C &= ~1 ; reg 0x2D = 0x15 ; reg 0x05 = 0x02 ; reg 0x2C = a | 0x1F
```

The other suspicious helper, `0x52C`, writes `0x800061 = 0x20` (bit 5 of the same register family),
so the two belong to one "peripheral combination switch". The earlier guess that `0x52C` is a
power/reset sequence was close.

### 12.5 IRQ14 is an 80 ms timeout watchdog

```
0x4618 (IRQ 14)
    if (byte[0x843960] != 8) return          ; only meaningful while connected
    if (0x800740 - 0xADD0() > 0x138800)      ; 1,280,000 ticks = 80 ms
        0xADB8(16)
```

`byte[0x843960] == 8` matches Telink's `BLS_LINK_STATE_CONN` (`BIT(3)`), so this is very likely the
link-state byte and `0x843C0C` therefore sits inside the BLE stack globals (`0x843900` region).
`+0x2C` is "the tick of the last activity".

### 12.6 `0xADE8` / `0xAEC8`: arming a tick interrupt

```
r3 = u32[0x843C0C + 0x34]          ; base tick
r0 = u32[0x843B20 + 0x2C]          ; offset
r2 = r3 + (-56000) - r0 - [0x800740]
if (r2 > 0x3FFFFFFF) ...
u32[0x800744] = r3                 ; system timer compare register
u32[0x843C0C + 0x20] = r3 + u32[0x843B20 + 0x40]
```

`-56000` ticks = **-3.5 ms**. `0x800744` is the system timer compare register, so writing it means
"fire an interrupt when the timer reaches this tick". `0x843A80` (`byte+11` and `half+0x1C`
decremented in a loop) and `0x843B20` are contexts of the same family.

=> This layer is **link-timing scheduling**, not application logic.

### 12.7 A contradiction that has to be stated

The evidence around `0x843C0C` points **both ways**:

- **For "link-layer context"**: `0xAD8C` (its initialiser) is called right after the RF init
  sequence; IRQ14 is gated on "connected"; `0xADE8` writes the timer compare register; the values
  `16/64/80` also appear on the RF side.
- **For "application-side actuator state"**: the main loop's start/stop sequences write `+0x04`
  (15/0) directly, immediately followed by a register switch like `0x7484(64,0,1)`; and the
  application never reads `+0x04` back.

Both readings are consistent, and static analysis has reached its limit at this layer.

> **2026-11-08 addendum (§13.7 rewrites this conclusion)**: after reading all of `0xA000–0xB000`,
> `0x843C0C` is neither a link-layer context nor actuator state — it is the **timer / low-power
> scheduling block**, holding the timer deadline, the wakeup compare base, the last-activity tick and
> several durations. Neither reading above survives; what `+0x04` means is still open.

---

## 13. `0xA000–0xB000`: the scheduling / low-power layer

The previous section framed `0x843C0C` as "link-layer context *or* actuator state". After reading the
whole layer, **neither is right**: it is the **timer / low-power scheduling block**. Evidence below.

### 13.1 Region map (16 entries)

| Entry | Size | Static callers | Reading |
| --- | --- | --- | --- |
| `0xA014` | 80 | `0x4BE0` / `0x4CDE` / `0x4DCE` / `0xA312` | writes one byte (`+0x77`) into the link context `0x843B20`, returns `0x80` / `0x3A` / `0`; returns `0x80` immediately when not connected |
| `0xA064` | 80 | `0xA492` / `0xA622` | not read in detail |
| `0xA0B4` | 1,540 | `0xA6CC` | **ATT PDU layer** — real entry is `0xA0B4`; `0xA0B8` is only the third instruction of its prologue (§15.1) |
| `0xA6BC` | 60 | **none** | gate registered at `0x8439B8` = `0xA6BD` by `0x9A18` |
| `0xA790` | 128 | `0xA882` / `0xAA82` | not read in detail |
| `0xA810` | 524 | **none** | registered at `0x843A70` = `0xA811` by `0x9A18`; `0xA818` is its second prologue word (§15.3b) |
| `0xAA20` | 344 | `0x2686` | **link-event timing** (1.25 ms-unit window maths on `0x843A80` / `0x843B20`) |
| `0xAB78` | 64 | `0x293A` | not read in detail |
| `0xABB8` | 368 | `0xAD3E` | **link parameter init**; calls through the `0x84391C` function pointer (§15.3) |
| `0xAD2C` | 188 | **none** | registered by `0x9A66` (`0xAD2D`) |
| `0xAD8C` | 92 | `0x4752` / `0x4864` | **scheduler block init** |
| `0xADE8` | 214 | `0x2B6A` | **arms the tick interrupt** (§13.5) |
| `0xAEC8` | 302 | `0x1E96` | same shape as the above |
| `0xAF9C` | 4 | `0xAEE0` | `tjex r3` stub (the third one) |

`0xAFA0` / `0xAFB0` / `0xAFBC` / `0xAFDC` / `0xAFE8` are the setter group right after them (§13.6).

Three `tjex r3` stubs (`0xA0B4` / `0xAF9C` / `0x2DF0`) plus `0x5060` in the main loop show that this
firmware **calls indirectly all over the place** — a static call graph inherently misses those edges.

### 13.2 Fields of `0x843C0C`

| Offset | Type | Meaning | Evidence |
| --- | --- | --- | --- |
| `+0x00` | u32 | initial `0x2995` (10645) | written by `0xAD8C`; `0x1C6C` tests for non-zero |
| `+0x04` | byte | **mode / mask**, values `0` / `3` / `15` / `0x40` | written by `0xADDC`; `0xAFE8` compares against `0x40` |
| `+0x05` | byte | values `16` / `64` / `80`, **no reader found** | written by `0xADB8` |
| `+0x0E` | half | values `0` / `3`, **no reader found** | written by `0xADC4` |
| `+0x14` | u32 | **duration A, in milliseconds** (stored as `x16000` ticks) | written by `0xAFBC`; default `1,600,000` = 100 ms |
| `+0x18` | u32 | **duration B, in milliseconds** | written by `0xAFBC`; default 100 ms, set to 30 ms at init |
| `+0x1C` | u32 | **short duration, in microseconds** (stored as `<<4` ticks) | written by `0xAFDC`; default `8000` = 500 us, set to 200 us |
| `+0x20` | u32 | base + offset (the computed next instant) | written by `0xADE8` / `0xAEC8` |
| `+0x22` | byte | **timer pending** (1 = yes, 0 = no) | written by `0xAFA0` |
| `+0x28` | u32 | **tick of the next software timer** (0 = none) | written by `0xAFA0`, called from `timer_add` / `timer_poll` |
| `+0x2C` | u32 | **tick of the last activity** | IRQ14 uses it for the timeout test |
| `+0x34` | u32 | **base tick**, loaded into the timer compare register | written by `0xADE8`; `0x1E6C` does `u32[0x800744] = u32[0x843C40]` directly |

The unit of `+0x14` / `+0x18` is derived, not guessed: inside `0xAFBC`
`r2 = (a<<5) - a = 31a` -> `r2 <<= 2` = `124a` -> `r0 = r2 + a = 125a` -> `r0 <<= 7` = **`16000a`**,
and 16,000 ticks is exactly 1 ms.

### 13.3 The timer-hook registration chain

```
main (0x7E2) -> 0x437C()  ->  0xAFB0(0x423D)      ; 0x423D = 0x423C + 1
                                 +- u32[0x844B48] = 0x423C   ; = timer_poll

stack (0x2B14): r3 = u32[0x844B48]
                if (r3) 0x2DF0(1)                 ; 0x2DF0 is a tjex r3 stub
```

So `0x844B48` is the **timer-poll hook**: the application registers it, the stack calls it every
round. That also explains why `0x423C` (timer_poll) has no ordinary static caller — it only lives in
that slot.

### 13.4 What `timer_poll` decides, and the two thresholds

```
0x423C
  now = [0x800740]; cnt = u32[0x842F34+0x30]
  if (cnt == 0) { 0xAFA0(0, 0); return }               ; nothing armed -> report "no pending timer"
  if ((now + 0x800) - u32[0x842F34+4] > 0x3D08FFF) return
  walk the slots: call fn for expired deadlines, re-arm with (interval << 4)
  ...
  r0 = u32[0x842F34+4]                                 ; earliest deadline
  if (r0 - now <= 0x02DC6BFF) 0xAFA0(r0, 1)            ; only if < 3 s
  else                        0xAFA0(0, 0)
```

Both thresholds matter: `0x3D08FFF` = 0x3D09000-1, about **4 s**, asks "is this deadline too far in
the past"; `0x02DC6BFF` = 48,000,000-1 = **3 s**, so the wakeup is only armed when the next deadline
is within three seconds. **This is textbook "decide whether to sleep with a timer wakeup".**

### 13.5 Arming the tick interrupt

```
0x1E6C  u32[0x800744] = u32[0x843C40]      ; +0x34 -> timer compare register
        right after writing 0x800F01=1 / 0x800F20=0xFFFF / 0x800648 |= 0x100000

0xADE8 / 0xAEC8
  r3 = u32[+0x34]
  r2 = r3 + (-56000) - u32[0x843B20+0x2C] - [0x800740]
  u32[+0x34] = r3 ; u32[+0x20] = r3 + u32[0x843B20+0x40]
  u32[0x800744] = r3                        ; the trigger point
```

`-56000` ticks = **-3.5 ms**, i.e. "wake up 3.5 ms early".

### 13.6 The six setters

| Function | Action | Call site / arguments |
| --- | --- | --- |
| `0xAFA0(a, b)` | `u32[+0x28] = a`, `byte[+0x22] = b` | `0x41E6` / `0x42D2` / `0x435A` (`b=1`), `0x42DE` / `0x4366` (`a=0,b=0`) — all from timer code |
| `0xAFB0(a)` | `u32[0x844B48] = a` | `0x4380`, `a = 0x423D` (registers timer_poll) |
| `0xAFBC(a, b)` | `u32[+0x14] = a ms`, `u32[+0x18] = b ms` | `0x4872`, `(50, 30)` |
| `0xAFDC(a)` | `u32[+0x1C] = a us` | `0x487A`, `200` |
| `0xAFE8()` | if `byte[+0x04] == 0x40`: `0x800078 |= 0x100000`, `byte[0x80006F] = 0x80`; then `byte[0x8439C0] = 1` | `0x2A30` |
| `0x74EC(a)` | `reg0x3C &= ~1`; `reg0x2D = 0x15`; `reg0x05 = 0x02`; `reg0x2C = a \| 0x1F` | peripheral power-up sequence |

`0xAD8C` (the initialiser) just lays down the defaults:

```
u32[+0x00] = 0x2995 ; half[+0x0E] = 0xFFFF
u32[+0x14] = u32[+0x18] = 0x186A00      ; 100 ms
u32[+0x1C] = 8000                        ; 500 us
byte[+0x21] = 67
```

### 13.7 Update to §12.7 — the conclusion changed

§12.7 listed two readings for `+0x04` side by side (a link-layer step number vs an actuator enable).
The evidence here rules out **both**:

- the same struct holds the **timer deadline (`+0x28`)**, the **wakeup compare base (`+0x34`)**,
  the **last-activity tick (`+0x2C`)**, **two millisecond durations (`+0x14`/`+0x18`)** and one
  microsecond duration (`+0x1C`);
- everything that writes it (`0xAFA0` / `0xAFB0`) comes from **timer code** (`0x41xx–0x43xx`), and
  the only reader, IRQ14, does a timeout test.

=> **`0x843C0C` is the timer / low-power scheduling block** — not actuator state, not a link-layer
context. It is the "scheduling base shared by the application and the stack", which is exactly why
both the RF init and the app's start/stop sequences write into it.

`+0x04` itself stays open: values `0` / `3` / `15` / `0x40`, written as `15` / `0` on the app's
start/stop, with `0xAFE8` comparing against `0x40`. Under a low-power reading the most natural
meaning is **"allowed wakeup sources / sleep-level mask"** (`15` = all four sources, `0` = none),
but that is **not confirmed**: verifying it needs a current measurement in the corresponding state,
or a debugger read of that byte.

---

## 14. Numbers and reproduction

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
python tools/tc32_disasm.py --tables            # case lists of both switch tables
python tools/tc32_disasm.py --table 0xD31C:30   # any u32 table
python tools/tc32_disasm.py --indirect          # thumb pointers stored by code
python tools/tc32_disasm.py --blocks 48ec:4fe0  # the §11 main-loop block outline
python tools/tc32_disasm.py --callsites 0xADDC # the §12 argument table (any function)
python tools/tc32_ram.py --region 0x840000:0x850000   # the RAM matrix used in §15
python tools/tc32_ram.py --ram 0x80059B              # every access to one address
python tools/tc32_ram.py --func 0xA0B4               # all RAM/IO a function touches
```

---

## 15. Second pass (ATT layer, event dispatch, hardware divider, pin map)

Everything here comes from the new `tools/tc32_ram.py`. It propagates constant registers linearly
inside each function, so `tloadr r3, [r6, #0x37]` resolves to an absolute address and
"who writes / who reads this RAM byte" becomes a queryable fact: 602 distinct RAM/IO targets,
each with its read and write sites.

### 15.1 `0xA0B4`: the real entry, and it is the ATT PDU layer

The earlier "`0xA0B8` has no caller" claim made the **same mistake as the old `0x506E` one** —
it took the third instruction of a prologue for a function start:

```
0xA0B4  tpush {r4, r5, r6, r7, lr}
0xA0B6  tmov  r7, r8
0xA0B8  tpush {r7}          ; second half of the long prologue
```

The real entry `0xA0B4` (1,540 B) has exactly one static caller, `0xA6CC`, inside `0xA6BC`,
which is a gate:

```
0xA6BC  if (u8[0x843BA0 + 0x37] != 0) return 0
0xA6CC  r0 = 0xA0B4(r0)
```

The argument descriptor is `[r0+4]` data base, `[r0+5]` class, `[r0+6]` length, and the body switches
on `u8[buf+1]` — **the same ATT opcode set as the `0xD104` table in §6**: 4/5/7/8/11/12/13/17/18/19/22.

The `0xA508` arm is the **MTU exchange**, and it is unambiguous:

```
r0 = (u8[buf+4] << 8) | u8[buf+3]
if (r0 > 26 && r0 <= 251) { ... } else return 0x306
if (r2 > 100) r2 = 100          ; MTU capped at 100
u16[ctx+0] = r0 ; u16[ctx+2] = r2 ; u8[ctx+17] = 2
```

The cap of 100 matches the `0x64` seen in the live frame `BD 0E 02 … 64`.
So `0x7A98` (§6) and `0xA0B4` are two layers of the same stack: **`0x7A98` picks the application
handler by opcode, `0xA0B4` assembles the PDU and advances the link state**.

### 15.2 `0xB874`: the LL / RF event dispatcher (the real user of table A)

`0xB874` is what reads `0xD31C` (literal at `0xBB80`):

```
0xB874  r5 = r0                        ; event code
        if (r0 > 14) goto 0xB882
0xB8A6  r3 = r0 << 2 ; pc = u32[0xD31C + r3]
```

It has 11 callers passing **2, 3, 4, 6, 7, 8, 9, 10, 11, 13**. Every case reads
`0x800740` (the system tick) once as a timestamp and writes an event record into `0x843CEC`
(`+1` type, `+4` length, `+5`, `+6` event code).

| slot | target | fingerprint |
| --- | --- | --- |
| 0, 1 | `0xB882` | record only, returns `0x843CEC` |
| 2 | `0xB8D6` | `u8[0x8439CC]=1`, RF status read, memcpy |
| 3 | `0xB900` | 5× memcpy + `0xC604` |
| 4 | `0xB99E` | memcpy + `0x843D6C` |
| 5 | `0xB9E0` | record only |
| 6, 7 | `0xB9FE` / `0xBA24` | memcpy + `0x843D1C` |
| 8 | `0xBA58` | `0x1F84` / `0x684C` / `0x7224`, touches `0x843DA8` |
| 9 | `0xBA9A` | `0x8439EC` / `0x84392A` |
| 10 | `0xBADC` | `0x843DB8` |
| 11 | `0xBB00` | record only |
| 12 | `0xBB22` | **recurses into `0xB874` five times** (batch) |
| 13, 14 | `0xB8AE` | stores `u32[0x800740] | 1` into `0x843D70`, calls `0xBBCC` |

`0x843D70` is written 16 times and read once — a "last RF state snapshot".
`0x800740` is read once per case, which confirms it is a tick counter, not an IRQ flag.

### 15.2b Table B (`0xD358`) is the **LL control PDU dispatcher**

Table B belongs to `0xBC90` (1,116 B), whose only call site is `0x8DDE`, inside the packet handler
`0x8D04`. Its selector is **offset 10 of the packet**, the same as the `0xD104` table in §6:

```
0xBC90  r3 = u8[pkt + 10]
        if (r3 > 14) return 0
0xBCB4  r3 <<= 2 ; pc = u32[0xD358 + r3]
```

Renumbering the 15 slots by `opcode 0x00..0x0E` (the previous version counted from `0xD31C`, which
was off by 15 slots):

| opcode | target | LL control PDU | corroboration |
| --- | --- | --- | --- |
| `0x00` | `0xBCA6` (empty) | CONNECTION_UPDATE_IND | — |
| `0x01` | `0xBCD6` | **CHANNEL_MAP_IND** | `memcpy(0x843D1C+32, pkt+10, 7)` — exactly 5 B map + 2 B instant |
| `0x02` | `0xBCA6` | TERMINATE_IND | — |
| `0x03` | `0xBDF4` | **ENC_REQ** | |
| `0x04` | `0xBE2C` | **ENC_RSP** | 5× memcpy + `0x719C` |
| `0x05` | `0xBED2` | START_ENC_REQ | tail-calls `0xB67C` |
| `0x06` | `0xBCA6` | START_ENC_RSP | — |
| `0x07` | `0xBEDC` | UNKNOWN_RSP | `0x843E34` / `0x843E38` |
| `0x08` | `0xBF08` | **FEATURE_REQ** | `0x843E24` |
| `0x09` | `0xBF2A` | **FEATURE_RSP** | |
| `0x0A` | `0xBF52` | PAUSE_ENC_REQ | `0xB5A4` ×2 + `0xC0EC` |
| `0x0B` | `0xBCA6` | PAUSE_ENC_RSP | — |
| `0x0C` | `0xBCBC` | **VERSION_IND** | clears `+12..+18` of `0x843D08`, calls `0xB67C(7)` |
| `0x0D` | `0xBCBC` | REJECT_IND | same |
| `0x0E` | `0xBCBC` | SLAVE_FEATURE_REQ | same |

"CHANNEL_MAP_IND copies 7 bytes", "ENC_REQ and ENC_RSP each have their own body" and "VERSION_IND
takes the common cleanup path" cannot all hold by accident. So:

- `0xD104` (83 slots) = **ATT opcode** dispatch (0x00–0x52)
- `0xD358` (15 slots) = **LL control PDU opcode** dispatch (0x00–0x0E)
- `0xD31C` (15 slots) = `0xB874`'s **internal event code** dispatch (2–13)

All three are compiler-generated `switch` tables; only the index space differs.

### 15.3 `0xABB8` does have a caller, and `0x84391C` is a function pointer

`0xAD3E` calls `0xABB8`. It is **link parameter init**:

```
if (u32[0x843920] & 0x10) {
    u32[0x843920] &= ~0x10
    u8[0x8439CC] = 0
    u16[0x843944] = 27 ; u16[0x843946] = 27
    u8[0x843944+18] = 0 ; u8[0x843944+19] = 0
    u8[0x843A7C] = 0
    cb = u32[0x84391C]                 ; ← function pointer
    if (cb) { cb(0x40, 0x843B20+13) ; cb(4, 0x843B20+13, u32[0x84395C], 1) ; ... }
}
```

`0x84391C` holds a **Thumb function pointer** and is called via `tjl 0xAD28`, a `tjex r3` stub.
This is one whole class of "invisible" calls: **load the pointer from a literal, then `blx` through
a stub**. The same shape appears at `0xAA1C`, `0xAF9C`, `0x5060`, `0x2DF0` and `0xA6B8`.

> Correction: there are **six** `tjex r3` stubs — `0x5060`, `0x2DF0`, `0xA6B8`, `0xAD28`, `0xAF9C`,
> `0xAEC4`. The earlier list wrongly included `0xA0B4`, which is a `tpush`. A stub is always
> `tjex r3` + `nop`, and code calls it as `tjl <stub>` to get `blx r3`.

### 15.3b `0x9A18`: the stack callback registry — the answer to every "no static entry"

`0x9A18` writes seven globals in a row, all **odd (Thumb) function pointers**:

| Global | Value | Used by |
| --- | --- | --- |
| `0x843A70` | `0xA811` | `0x941C` |
| `0x8439B0` | `0x9DBD` | `0x19A6` |
| `0x843964` | `0x27F9` | no direct reader |
| `0x8439AC` | `0x26E5` | `0x1940` |
| `0x8439B8` | `0xA6BD` | no direct reader |
| `0x8439BC` | `0xAD2D` | `0x1BBE` |
| `0x843AD8` | `0x9E09` | `0x8CD8` / `0x8EF4` / `0x9932` / `0x99B0` |

So `0xA810` (524 B), `0xA6BC` and `0xAD2C` are not dead code — they are **callbacks registered with
the stack**. That is why their in-degree is zero in a plain `tjl` graph.

The same function also initialises the link context: `u16[0x843B20+0x12] = -1`, and
`u32[0x843B20+0x68] = 150<<4 = 2400` when `u8[0x8435D8+1] != 0`.

### 15.3c `0x9E08`: transmit queue enqueue

The `0x843AD8` callback above is `0x9E08` (17 direct callers, four of them inside `0xA0B4`):

```
r5 = u8[0x800643] ; u8[0x800643] = 0        ; disable IRQ, keep old value
r6 = (u8[0x843508+6] - u8[0x843508+7]) & 31 ; ring occupancy
idx = ((u16[0x843508+4] - 1) & u8[0x843508+6]) * u32[0x843508]
dst = 0x843288 + idx + 4
memcpy(dst, r1, u8[r1+1] + 2)               ; length byte + 2
u8[0x800643] = r5                            ; restore IRQ
```

It **copies the frame at `r1` (first byte = length) into the ring TX queue at `0x843288`**.
`0x800C2A/0x800C2B` are the RF DMA read/write pointers used to compute the free space.

⟹ "assemble the ATT response → `0x9E08` enqueue" now closes.

### 15.4 `0x1D0/0x1D4/0x1D8/0x1DC`: the hardware divider

These four addresses are **four entries into one body**, differing only by `tmov r2, #0..3`:

```
0x1D0 r2=3   0x1D4 r2=1   0x1D8 r2=2   0x1DC r2=0
0x1E0  r3 = tmrcs ; r3 |= 0x80 ; tmcsr r3      ; critical section
       u32[0x800664] = r0                      ; operand A
       u32[0x800668] = r1                      ; operand B
       u8 [0x800660] = r2                      ; opcode = go
       while (u8[0x800660] != 0) ;             ; busy-wait
       return (r2 <= 1) ? u32[0x800668] : u32[0x800664]
```

`0x5CB0` proves the polarity (splitting seconds into d/h/m/s):

```
r5 = f1DC(secs, 86400)   ; days      → quotient
r4 = f1D8(secs, 86400)   ; seconds-of-day → remainder
r0 = f1D8(r4, 60)        ; seconds   → remainder
r4 = f1DC(r4, 60)        ; minutes   → quotient
```

⟹ **`0x1DC` = quotient, `0x1D8` = remainder**; every call site uses only 10, 37, 60, 100, 200, 250.

### 15.5 ⚠️ `0x800540` / `0x800548` are the **TRNG**, not GPIO

The previous version treated this pair as the "disinfection / UV pins". **Wrong.** `0xC80C` is explicit:

```
u8[0x800540] = 0
while ((u8[0x800540] & 4) == 0) ;          ; wait for data ready
r2 = u32[0x800548] ; store x4              ; 4 words = 16 bytes
... XOR-mix into the pool ...
```

Reset, poll a ready bit, read four words for entropy — standard TRNG usage. `0xC7AC` also reads
`0x800548` four times in a row. So: **`0x800540` = TRNG control/status, `0x800548` = 32-bit random data**.

### 15.6 The real GPIO map

| Port | Registers | Observed |
| --- | --- | --- |
| P0 | `0x800580` in / `0x800581` ie / `0x800582` oen / `0x800583` out / `0x800584` ds | `in` used by the button (bit 6) |
| P1 | `0x800588`…`0x80058B` out | `0x80058B`, 1 site |
| P2 | `0x800590`…`0x800593` out | `0x800593`, **12 sites** (mostly `&= ~0x10`, bit 4) |
| P3 | `0x800598`…`0x80059B` out | `0x80059B`, **26 sites** — the hottest actuator port in the image |

The 26 P3 sites live in 13 functions and are all read-modify-write (`tloadrb → tbclr/tbor → tstorerb`).
Bits that can be named:

| Bit | Evidence | Inferred role |
| --- | --- | --- |
| 2 | `0x5FD0` clears it on shutdown | actuator 1 (always off when stopping) |
| 4 | `tbclr #16` at `0x4B98` / `0x4D82` / `0x5FCC` | actuator 2 (three shutdown paths clear it) |
| 7 | set near `0x4DD4`, cleared by `0x4B60` / `0x5F94` | actuator 3 (pairs with bit 2) |

P0 bit 6 = button input (`tand 0x40` in `0x43A0`), unchanged from the previous version.

### 15.7 Two small things

- `0x2F8C` is not padding: it is the ASCII **`Hi-YM01-12DC2110000`**, a product model string.
  Just past it, in the near-zero 4 KiB hole, sits a small table at `0x327C` (`0x40`, `8`, `0x84307C`)
  that looks like a `.data` copy descriptor.
- `+0x00` of `0x843C0C` is written as **`0x2995`** at `0xAD90`, together with `+0x0E = -1` and
  `+0x14`/`+0x18` = `0x186A00` (1,600,000). So it is a **struct base**, not a pointer variable
  (`0x1C6E` only tests it for non-zero).

### 15.8 `0x6538` is the 1 Hz session timer, `0x64D0` is the teardown

The `0x6538` that the main loop and `0x5F90` keep cancelling is only 24 instructions:

```
0x6538  u32[state+0x3C] += 1                  ; elapsed seconds
        if (u8[state+0x35] != 0) {
            if (u32[+0x3C] > 179) 0x64D0()    ; fixed 3-minute profile
        } else {
            r3 = u32[state + u8[state+0x60]*4 + 0x50]   ; profile table
            if (u32[+0x3C] > r3) 0x64D0()
        }
        return -1
```

`0x64D0` is the end of a session:

```
u16[state+0x31] = 0 ; u16[state+0x32] = 0
if (u8[0x842F74] == 1) 0x6484( u32[+0x48] - u32[+0x3C] )
else                   0x5F4C( u32[+0x48] - u32[+0x3C] )
0x800780 &= ~4
u8[state+0x39] = 0
0x80059B &= 0x7F          ; P3 bit 7 off
0x800593 &= ~0x10         ; P2 bit 4 off
0x6144()
u32[state+0x3C] = 0
```

⟹ **`+0x3C` = seconds elapsed in this session** (`0x6538` adds 1 every second) and
**`+0x48` = seconds since boot** (`0x6308` adds 1 every second and immediately splits it into
d/h/m/s via `0x5CB0` for the log). So the `+0x48 − +0x3C` that `0x64D0` hands to `0x5F4C` / `0x6484`
is **the wall-clock moment this session started**.
This also settles the unit question behind §8: that pair is in **seconds, not ticks**.
The session duration is not in either field — it is the profile threshold in `0x6538`: `+0x60` is a
profile index, `0x50` onwards is the per-profile second table, and `+0x35 != 0` selects a fixed
180-second profile. Teardown always clears P3 bit 7 and
P2 bit 4 — which is where those two actuator bits from §15.6 end up.

---

## 16. Still unknown

The second pass closed ten items from the previous list (`0xA0B4` / `0xA810` / `0xABB8`, the
attribution of all three tables, the `0x1DC` hardware divider, the five sub-flags, the GPIO map,
the `0x3000` hole and the `0x6538` timer). What is left needs the device or a debugger:

- `0x1A0`, the second entry from header `0x10`: the body is IRQ context save/restore + `treti` (§9),
  but which IRQ uses it is still open.
- What the four callbacks `0x0ED0` / `0x1378` / `0x7520` / `0x13E8` handle.
- Whether `+0x04` of `0x843C0C` really is a wakeup-source / sleep-level mask (§13.7), and what
  `16/64/80` at `+0x05`, `0`/`3` at `+0x0E`, `0x43` at `+0x21` mean. Needs a current measurement
  or a debugger read.
- `+9` of `0x84358C` is provably constant 0, but which business path sets `+2` at each of its four
  sites is not stitched together yet.
- Who reads the two 20-byte constants that `0x5064` copies into the stack from `0xCD44` / `0xCD54`.
- Who writes `[0x844B98]`: the neighbouring `0x844B94` has a 32-bit read-modify-write at
  `0x4BF0` / `0x4BFC`, but `0x844B98` itself still has two readers (`0x490E` / `0x4922`) and no
  writer. Only a live memory read can settle it.
- `0x52C`: `0x800061 = 32` then `0` is a reset/trigger sequence, followed by a 400-tick wait and a
  clear of the first eight words of `0x843534`, then a write to `0x800B08`. Classified as
  "log-area reset + peripheral trigger", but neither register is identified.
- Which of the P3 bits (2 / 4 / 7) and P2 bit 4 correspond to disinfection, UV, fan and pump.
  Static analysis only shows **which bits switch together** — the physical mapping must be measured.
