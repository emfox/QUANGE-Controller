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
| `0x06600–0x071FF` | 1,455 | **peripheral driver** (GPIO-heavy) | **77** calls into the HAL bucket; IO `0x800540/0x800548/0x800581/0x800586` |
| `0x07200–0x077FF` | 713 | base library: `memcpy/memset/memcmp`, strings, wait loops | entries `0x719C`/`0x7200`/`0x7214` live here |
| `0x07800–0x087FF` | 1,992 | **ATT request dispatch layer** (§6) | all 13 cases of the `0xD104` jump table land here, and so does the default |
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

`0xD31C` is the same shape: at `0xB8A6`, `r3 = r0<<2; r3 = 0xD31C[r3]; pc = r3`,
30 entries / 23 distinct / `default = 0xBCA6`. **It has no static caller** — the entry is indirect (§14).

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
`+6`, `+9`, `+0xB`; the main loop tests each of them to pick a branch, and `0x4B60` clears
`+2/+3/+9` on stop. **Their exact meaning is unknown** — only `+1` is observable from the BLE side.

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

Both readings are consistent, and static analysis has reached its limit. **Conclusion: `+0x04`
correlates strongly with "load on/off", but whether it is a link-layer step number or an actuator
enable bit can only be settled on hardware** — e.g. probe the register bit that `0x7484` touches, or
change `+0x04` and watch the lamp.

---

## 13. Numbers and reproduction

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
```

---

## 14. Still unknown

- What the second entry `0x1A0` (pointed at from header `0x10`) does.
- The entry into the `0xD31C` jump table: nothing branches or calls `0xB8A6`, so it must be entered
  indirectly; what states 0-29 mean is completely unknown.
- What `0x1DC` really is (writes `0x800664/0x800668`, polls `0x80065C`, yet the result is `÷60`).
- What the four callbacks `0x0ED0` / `0x1378` / `0x7520` / `0x13E8` handle.
- What `0x6538` is — the timer callback that `0x5F90` and the main loop keep cancelling.
- Purpose of the 4 KiB hole at `0x3000` (not code, and no references at all).
- Which pins actually drive the UV load (`0x800540/0x800548` have 20+ accesses, not mapped pin by pin).
- What the five boolean sub-flags `+2` / `+3` / `+6` / `+9` / `+0xB` mean (§11.4).
- Whether `0x843C0C` is a link-layer context or application-side actuator state (§12.7 lists the
  evidence both ways); what `16/64/80` at `+0x05` and `0`/`3` at `+0x0E` mean.
- Who reads the two 20-byte constants that `0x5064` copies into the stack from `0xCD44` / `0xCD54`.
- Who writes `[0x844B98]` (one read, no direct writer).
- What `0x52C(0x6EF, 0x627)` does: it writes `0x800061 = 32` then `0`, then reads `0x843534`.
  It looks like a power/reset sequence and the arguments look like thresholds — unclassified.
