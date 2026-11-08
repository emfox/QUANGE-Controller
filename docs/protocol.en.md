# QUANGE WY020702 — Full BLE Protocol

> Reconstructed from the discontinued WeChat mini program *莱枫智能生活*
> (appid `wx9528fce803d3ba0e`, v18). Most items have real-hardware evidence (see section 8),
> but **some remain unverified** — they are collected in section 9.
> Where the two disagree, **section 8 (measured) wins**; section 9 only lists what has not
> been tested yet, it is not the authority.

---

## 1. Transport

| Item | Value |
| --- | --- |
| Advertising name | `QUANGE-WY020702` (steady) **or** `kHID` (module factory default, **only the first packet of each scan**, see note below) |
| GAP device name | `Hi-YM01-XXXXXXXXXXXX` |
| Advertising payload | Service UUIDs `0x1812` (**declared only — the device provides no HID service**) + `0x180F` (battery, real); manufacturer data payload = **last 4 bytes of the MAC**, company ID `0x451C` |
| SoC | Telink. **Measured binary-compatible with TLSR8258**; exact silkscreen part still unknown (§8.6) |
| Pairing | **Not required** — no pairing, no bonding, no encryption |
| Frame encryption | **None** — plaintext hexadecimal |
| Checksum | **None** — no CRC (OTA excepted) |

> **About the chip: the PnP ID cannot identify it**
>
> Reading `2A50` (PnP ID) returns `02 8A 24 66 82 01 00`, which decodes little-endian as:
>
> ```
> vendor_source = 0x02
> VID           = 0x248A   (Telink)
> PID           = 0x8266
> ver           = 0x0001
> ```
>
> ⚠️ **Earlier versions of this file listed the PID as `0x6682`, which swapped the two bytes
> `66 82`. Corrected.**
>
> But **even read correctly, `0x8266` does not identify the chip**. Source-level inspection shows
> it is a hardcoded array in the Telink BLE SDK reference design — every Telink device using the
> default configuration reports exactly the same bytes:
>
> ```c
> u8 my_PnPtrs[] = {0x02, 0x8a, 0x24, 0x66, 0x82, 0x01, 0x00};   // SDK default
> ```
>
> So the PID field reflects **the SDK default compiled into the firmware**, not the physical
> package. **The chip cannot be identified at the BLE layer at all — only by reading the
> silkscreen after disassembly.** A successful third-party OTA on 2026-11-08 (§8.6) narrowed
> this to **binary compatibility with TLSR8258** — a functional inference, not a silkscreen.

> **Entity check (2026-11-08)**: "QUANGE" is the in-house brand of **Shanghai Laifeng
> Household Products Co., Ltd.**, which is also the responsible entity printed on this unit's
> box/manual (USCC `91310120MA1HQ17M3W`, `sh-lifefun.com`). **"莱枫智能生活" is the mini
> program's name, not a company**; the "Hangzhou Laifeng Intelligent" entity in earlier notes
> **does not exist**. Brand owner ≠ module/firmware/OEM still holds (Telink module,
> OUI `1C:45:C2` = Huizhou Sanxin, OEM in Zhongshan), but it does not imply a "Hangzhou"
> solution vendor. Sources: see the [README](../README.en.md) *Device facts* section.
>
> **About `kHID`**: it is the Bluetooth module's **factory-default advertising name**, not the
> product's brand name. The cause is that the upstream vendor (**Shanghai Laifeng Household
> Products Co., Ltd.**, `sh-lifefun.com`; "QUANGE" is its own brand) reused the firmware
> configuration of an HID product line (selfie remote / keyboard) and **never changed
> the advertising setup** when repurposing it as a sterilizer. The vendor app's "rename device"
> feature only calls a cloud API and never writes to the device (see miniprogram doc §3.7), so
> this name can only have been burned in at the factory.
>
> **`0x1812` in the advertisement is the same leftover, not a capability.** A full GATT dump
> (2026-11-01) shows **no HID service at all** — only GAP/GATT/DIS/Battery plus `000000FB` and
> the Telink OTA service. In other words the device advertises a service it does not provide.
>
> Practical consequence: **the advertising name and `0x1812` come from the same config block,
> so neither is a stable identifier.** Renaming is a cloud-only operation with a dead backend
> and no device-side write path, so "does `0x1812` vanish with the name" cannot be measured;
> it is **closed as untestable** (see §9). **Only the MAC is reliable.**
>
> Conversely, **the original mini program only accepts `QUANGE-WY020702`** (hardcoded twice in
> `conble.js`), so it cannot find the device while it advertises as `kHID` — a bug in the vendor
> code, not a faulty device. Our `phone.html` / `set_timer.py` accept three prefixes plus the
> service fallback, so they connect in either state.
>
> **What triggers the switch is now measured (2026-11-08, USB powered).** Two 60 s raw
> advertisement captures: `kHID` appeared in **only the first packet of each scan**
> (1/121 in round A, 1/98 in round B), everything after was `QUANGE-WY020702`; RSSI,
> service UUIDs and manufacturer data were identical throughout. Connecting once and
> disconnecting, then scanning again, reproduced the same pattern. So it is **not an
> alternation between two names** — it is a startup default name followed by the fixed one.
> `kHID` may be a cached advertisement replayed when the scanner starts, or the firmware's
> first packet; **the mechanism is undecided, but the behaviour is settled**. In practice,
> do not decide by name during the first second of a scan, or just connect by MAC.

> **Do not conflate two things.** "No encryption" here refers to the **BLE frames on the air**.
> The mini program bundle itself **is** encrypted (a `V1MMWX` container: drop the 6-byte header,
> then XOR the whole body with `0x30`) — that is the vendor's packaging protection and has
> nothing to do with the device protocol.
> In short: **the bundle must be decrypted; the protocol does not.**

> The private service UUID is **not** present in the advertising payload (it only shows up after
> connecting), so you cannot filter by the business service. All you have is the name and that
> leftover `0x1812` declaration — and both travel with the config. See the note above.

### GATT layout

| Service | Characteristic | Properties | Purpose |
| --- | --- | --- | --- |
| `00001800` | `2A00` / `2A01` / `2A04` | read | Standard GAP |
| `00001801` | `2A05` | indicate | Standard GATT |
| `0000180A` | `2A50` | read | PnP ID |
| `0000180F` | `2A19` | read / notify | Battery level |
| `000000FB` | **`00001001-0000-1000-8000-00805F9B34FB`** | read / **write-without-response** / notify | **Commands** |
| `000000FB` | **`00001002-0000-1000-8000-00805F9B34FB`** | read / notify | **Device replies** |
| `00010203-0405-0607-0809-0A0B0C0D1912` | `...0A0B0C0D2B12` | read / write-without-response | OTA only |

`1001`'s CCCD is permission-protected (subscribing returns `Write Not Permitted`), but **writing is
allowed**. Replies arrive on `1002`, which can be subscribed to normally.

---

## 2. Frame conventions

- Host → device frames start with `0xDB`; device → host frames start with `0xBD`
- Multi-byte fields are **big-endian**
- Numeric fields hold the **value itself** (no BCD): 15:00 is `0x0F`, not `0x15`

### Structure

```
DB | CMD | SUB | [LEN] | [DATA...]
```

`CMD` + `SUB` form the function code, e.g. `DB 02 04` = power/state class, `DB 08 08` = schedule class.

---

## 3. Command reference

| Action | Frame | Reply |
| --- | --- | --- |
| Start sterilization now | `DB 02 04 01` | `BD 0B 02` |
| Stop | `DB 02 04 00` | `BD 0B 02` |
| Query state | `DB 04 02` + 4-byte unix seconds | `BD 0E 02` + … (§5.1); **the first frame after each connection is dropped — send it twice** (measured 2026-11-08, see §3.5) |
| **Query schedule** | **`DB 01 07`** | `BD 0D 07` |
| Query usage log | `DB 01 05` | `BD 08 05` |
| **Set schedule (whole-list replace)** | `DB 08 08` + `Count` + `[HH MM 0D] × Count` | `BD 0D 08`, **but it may not reply**; always verify with `DB 01 07` |
| Delete entries | `DB 00 08` + `Count` + `[HH MM 0D] × Count` | — |
| **Query battery** | **`DB 00 03`** | `BD 02 03 <percent> 19` (measured `64 19` = 100%) |
| **Read serial block** | **`DB 00 09`** | `BD 10 09` + 16 bytes (flash `0x43000`) |
| Version | `DB 01 A4` | `BD 06 A2` + version field (parsed as `14`, see note below) |
| Device info queries | `DB 01 A0` / `A2` / `A3` / `A5` / `A6` | see §3.5 (measured 2026-11-08) |
| Device reset (old label, **not reproduced**) | `DB 01 A0` | replied `BD 01 A0 00`, device did not reset — see §3.5 |
| Log acknowledgement | `DB 06 06 01` + 4-byte timestamp | — |
| OTA chunks | `01 FF` / `02 FF ...` | — |

> Sending `DB 01 07` on its own returns **nothing**. The device only answers after the full
> sequence `DB 04 02` → `DB 01 05` → `DB 01 07`. This is the least intuitive part of the
> protocol and cost real debugging time.

### 3.1 Power / immediate run

```
DB 02 04 01     start (UVC runs ~3 minutes, indicator breathes)
DB 02 04 00     stop
```

### 3.2 Query state

```
DB 04 02 | TS (4 bytes big-endian unix seconds)
```

The timestamp calibrates the device clock, and it is the prerequisite for the later
`DB 01 07` / `DB 01 A4` frames. **Send this first after every connection.**

> ⚠️ **Subscribe to `1002` before sending this frame.** Measured 2026-11-07:
>
> | Condition | Result |
> | --- | --- |
> | Sent while not subscribed to `1002` | **no reply**, and **not buffered** — subscribing afterwards does not recover it |
> | Sent while subscribed | replies immediately with `BD 0E 02 ...` |
> | Subscribed to `2A19` (battery) first | replies normally either way — `2A19` is irrelevant |
>
> The older note "this frame never replies" was an artefact of the ordering above: the reply
> was dropped because nothing was listening yet. `set_timer.py` and `phone.html` both subscribe
> before sending and are therefore unaffected; a hand-written client must keep that order.
>
> **The timestamp in this frame *is* the device clock** (measured 2026-11-08): setting it to
> `0x00000100` made the state reply echo `00000100` in `26..34`, and `next run` became
> `0x00006270` — i.e. the next schedule point 15:00 local (07:00 UTC = 25200 s) after
> 08:04 local. So the device **evaluates schedules in UTC+8 local HH:MM**. Send real unix
> seconds; no conversion needed.
>
> **State replies are normal during a run** (6/6 samples): `BD0E02 01 ...` kept arriving,
> with `12..16` climbing from `001E` (30 s) to `00A0` (160 s) and resetting to zero at the
> end. The earlier single "no reply during the power-on run" observation does not hold;
> the device was probably not ready yet right after power-up.

### 3.3 Set schedule

```
DB 08 08 | Count (1 byte) | [HH (1B) MM (1B) 0D (1B)] × Count
```

- `Count`: total number of entries **after** this write — the device replaces the whole table
- `HH`: hour, 0–23
- `MM`: minute, 0–59
- `0D`: duration in minutes, **one byte**. The firmware **does not validate the range** —
  `0x00` / `0x07` / `0x0F` were all accepted verbatim on 2026-11-07 (see §8.4). The
  3 / 4 / 5 / 6 limit is **front-end only**; the mini program's `f"0{d}"` string building
  makes single digits look like "`0` + digit", but that is just the high nibble, not a
  protocol-level fixed prefix.

Examples:

| Goal | Frame |
| --- | --- |
| Daily 03:00, 5 min | `DB 08 08 01 03 00 05` |
| Daily 02:00, 3 min | `DB 08 08 01 02 00 03` |
| 03:00/5min + 15:30/4min | `DB 08 08 02 03 00 05 0F 1E 04` |

**Multiple entries are verified working**: after writing two entries the device replied
`BD0D08 030005 0F1E04 FF FF FF FF FF FF 00`, and `DB 01 07` read back the same two.

**The "4 entries" ceiling is a firmware limit (measured).** Sending five:

```
sent    DB 08 08 05  02 00 06  08 00 03  0C 00 03  12 00 03  16 00 03
reply   BD 0D 08     02 00 06  08 00 03  0C 00 03  12 00 03  00
```

The fifth entry (22:00) is **silently dropped** — no error code, no rejection reply. The reason
is structural: the `BD0D07` / `BD0D08` payload has **exactly four slots**, so there is nowhere to
put a fifth (see §4).

**Empty slots and the trailing byte**: the `BD0D07` / `BD0D08` payload is **exactly four fixed
slots** (3 bytes per slot, empty slots are `FF FF FF`) followed by one extra byte.
**Settled by a controlled probe on 2026-11-08**: changing byte 3 of the clock-sync timestamp
to `4D` / `4E` / `4F` made the `BD0D07` trailing byte follow exactly `4D` / `4E` / `4F`;
repeating the same offset gave `00` (`BD0D08` is always `00`). So it is a **volatile field
derived from the device's internal clock** (it carries a clock byte when the clock changes) —
not a checksum, not battery level, and unrelated to the schedule contents.
**Skip `FF` slots and ignore the trailing byte**; do not try to interpret it.

> Because the semantics are a whole-table replace, **you never need to read the current list
> first** — just write the list you want.

### 3.4 Delete entries

```
DB 00 08 | remaining count (1 byte) | [entries to KEEP] × remaining count
```

The mini program builds `"DB00080" + remainingCount + remainingEntries`. Note `"DB00080"` is
**7 characters** — its trailing `0` merges with the count into a single byte, so on the wire it
looks like:

| Remaining | Actual frame | Note |
| --- | --- | --- |
| 1 | `DB 00 08 01 03 00 05` | byte 4 = `01` |
| 2 | `DB 00 08 02 03 00 05 0F 1E 04` | byte 4 = `02` |
| 0 | `DB 00 08 00` | clears the whole table |

**Byte 4 is the number of entries to keep** (same semantics as `DB 08 08 | count` on write).
Include only the entries you want to keep, never the ones you want to delete.

> In the source this number is `listLen`, set from `t.len - 1` (the existing total minus one), so
> after splicing one entry out it equals exactly "remaining count".
> Because the maximum is only 4, `0N` looks like BCD, but it is a plain hexadecimal integer.

**Measured 2026-11-07 (see §8.4)**: the delete frame really works; until now it was only
inferred from the source.

| Sent | Reply | Result |
| --- | --- | --- |
| `DB 00 08 01 02 00 03` | `BD0D08 020003 FFFFFFFFFFFFFFFFFF 00` | Table reduced to 1 entry |
| `DB 00 08 00` | 0 frames in this window; an all-`FF` empty table arrived in the next | Cleared, but the reply was delayed |

As with `DB 08 08`: **clearing does not guarantee an immediate reply — always read back.**

### 3.5 Device info queries (measured 2026-11-08)

`DB 01` followed by `A0`–`A6` is a group of queries the **vendor mini program never uses**
(those constants do not appear in `miniprogram/app-service.js`; they are firmware-side leftovers).
Measured on real hardware, one frame at a time:

| Sent | Reply | Reading |
| --- | --- | --- |
| `DB 01 A0` | `BD 01 A0 00` | 1 status byte; **no reset observed**, later commands still worked |
| `DB 01 A2` | `BD 07 A2 1C45C2009BB6 00` | MAC + `00`, stable across reads |
| `DB 01 A3` | `BD 11 A3 4C4657593032303730322F 27BC5DB2 0002` | `"LFWY020702/"` + 6 bytes, tail meaning unknown |
| `DB 01 A4` | `BD 06 A2 303030303134` | ASCII `"000014"`, firmware version (**reply type is `A2`, not `A4`**) |
| `DB 01 A5` | `BD 07 A5 1C45C2009BB6 00` | identical to `A2` |
| `DB 01 A6` | `BD 00 00` | empty reply |
| `DB 01 A1` / `A7` / `A8` | `BD 01 00 30` | default / unimplemented |
| `DB 01 A9` | `BD 01 00 1C` | also 1 byte but a different value, meaning unknown |

Three measured constraints:

- **The first frame after each connection is always dropped**; send one warm-up frame first. All rows above came after it.
  This also explains the old conclusion "`DB 04 02` never replies on this firmware" — on 2026-11-08 two
  `DB 04 02` frames were sent back to back and the second immediately returned
  `BD 0E 02 00 00B4 0000 64 …`; the device is perfectly healthy.
- Replies stay `BD <LEN> <TYPE> <DATA>`; the `LEN` formula differs per command (see §3.6), so it is not a payload length.
- The device disconnects itself after 3–4 consecutive frames per connection; test in batches.

> `DB 01 A0` was previously labelled "device reset", but **with no argument it only returns
> `BD 01 A0 00` and the device does not reset** — the old label has no basis. Whether
> `DB 01 A0 xx` resets was not tested (it would trigger the power-on auto cycle and disturb the rest).

### 3.6 Full command map (from the firmware disassembly, 2026-11-08)

Cross-checking hardware with the disassembly shows the firmware **dispatches on `frame[2]`**, not `frame[1]`:

```
DB <frame[1]> <frame[2]=cmd> <payload...>
```

`frame[1]` is a payload length for most commands but is not validated by all of them.
The dispatcher sits at `0x506E` and disables interrupts on entry (clears IRQMODE at `0x800643`).
Replies are built in a fixed buffer at `0x844ACC`: `[0]=0xBD`, `[1]=length`, `[2]=cmd` copied
verbatim, `[3..]` payload. So **the second reply byte is a length and the third is the command**.

`LEN` is not consistent across commands: `07` uses `1+12` (cmd byte + 12-byte table), `05` uses `8`
(cmd byte + 7 bytes), `A3` uses `1+16`. **Do not validate with it** — parse by command byte.

| `frame[2]` | Handler | Behaviour | Reply |
| --- | --- | --- | --- |
| `00` `01` | `0x5224` | Not implemented | `BD 01 00 xx` (trailing byte is buffer residue and changes) |
| `02` | `0x5438` | State query + time sync | `BD 0E 02` + … (§5.1) |
| `03` | `0x5424` | **Battery query**, reads RAM `0x8435A0` | `BD 02 03 <pct> 19` |
| `04` | `0x555A` | Start/stop, or set schedule | `BD 0B 02` |
| `05` | `0x551A` | Read one log record | `BD 08 05` + 8 bytes |
| `06` | `0x5536` | Log ACK, then returns **the next** record | `BD 08 06` + 8 bytes |
| `07` | `0x50F6` | Read the 4-slot table (3 B per slot, payload not parsed) | `BD 0D 07` + 12 bytes |
| `08` | `0x51A4` | Write the table (payload parsed at `0x604C` first) | `BD 0D 08`, may not reply |
| `09` | `0x5242` | **Read the serial block** (flash `0x43000`, 15 bytes) | `BD 10 09` + 16 bytes |
| `A0` | `0x5382` | Housekeeping + load default table + branch (possibly factory reset, **unconfirmed**) | `BD 01 A0 00` |
| `A2` | `0x52F2` | MAC: read; **writes only while the stored MAC is still `FF×6`** | `BD 07 A2` + 6 bytes + `00` |
| `A3` | `0x53DC` | Serial: **writes** it when the block is blank, then returns it | `BD 11 A3` + 17 bytes |
| `A4` | `0x564E` | Version, a **literal constant `"000014"`** (reply type hardcoded to `A2`) | `BD 06 A2` + `"000014"` |
| `A5` | `0x566A` | Read-only MAC (reads `0x76000[0..5]` and reverses it) | `BD 07 A5` + 6 bytes + `00` |
| `A6` | `0x5182` | **Erases sector `0x44000` and writes a single `01` byte** | none (default buffer) |

Three commands carry **write side effects** — documented, but do not fire them casually:

- `A2` overwrites the calibration block with the 6 payload bytes when the MAC at `0x76000` equals
  `FF FF FF FF FF FF` (constant at `0xCDB4`). A provisioned unit never matches, but that check is
  the only guard — one misread bit and you have rewritten the MAC.
- `A3` **writes the frame content** when `0x43000` is blank (`0x5834` erases the sector, then writes
  16 bytes). On this unit the block was empty; one `DB 01 A3` with no payload on 2026-11-08
  turned it into `"LFWY020702/" + 27 BC 5D B2 00` — the trailing bytes came from buffer residue,
  i.e. a serial number was **invented**. Always send a proper payload.
- `A6` takes no argument and returns nothing: it erases `0x44000` and writes `01` (a marker).
  It was sent once by accident on 2026-11-08; the sector was all `FF`, so nothing of value was lost.

---

## 4. Schedule slot encoding

The device stores the schedule in fixed-size slots of 3 bytes, **exactly four of them**. Empty
slots are padded with `FF FF FF`.

Example reply for a single 03:00/5min entry:

```
BD 0D 08 | 03 00 05 | FF FF FF FF FF FF FF FF FF | 0C
                        └── three empty slots (9 bytes)
```

**Two** entries were written and read back successfully. With four slots, **a fifth entry is
silently dropped** (measured, see §3.3) — so 4 is a firmware limit, not a UI convention.

---

## 5. Reply parsing

All replies start with `BD`. **The command word is not fixed** — observed values include
`BD0B02`, `BD0D08`, `BD0E02`.

How to classify: **take the first 6 hex characters (3 bytes) as the command word and match it
exactly.** That is what the mini program does — `buf2hex(value).substring(0,6)` followed by a
chain of `else if("bd0b02"==a)`. `phone.html` and `set_timer.py` use the same rule.

```
prefix (hex 0..6)        Meaning
BD 0B 02 / BD 0E 02 /
BD 11 02 / BD 00 02 /
BD 02 02                 State class (see 5.1)
BD 0D 07                 Schedule read-back (see 5.2)
BD 0D 08                 Schedule saved (see 5.2)
BD 08 05 / BD 08 06      Usage log (see 5.3)
BD 06 A2                 Firmware version (also triggers the OTA check; see mini program §5.1)
BD 05 A1                 Low battery warning
```

> Do **not** use "is byte 4 `0x00`/`0x01`" to classify replies — byte 4 of `BD0B02` is `0x00`
> while that of `BD0D07` is `0x07`, and the rule misfires. Just enumerate the command words.

### 5.1 State class (`BD0B02` / `BD0E02` / `BD1102` / `BD0002` / `BD0202`)

Indices below are positions in the **hex string** (1 hex char = 4 bits, 2 hex = 1 byte).
All five command words share the same field layout.

| hex index | len | Meaning |
| --- | --- | --- |
| `0..6` | 6 | Command word |
| `6..8` | 2 | State: `01` sterilizing / `00` idle |
| `8..12` | 4 | Counter A (equals the run's total duration at start; measured `00B4` = 180 s) |
| `12..16` | 4 | Counter B (increments during a run; starts at `0000`) |
| `16..18` | 2 | Battery percent (hex, `64` = 100%) |
| `18..26` | 8 | **Next run, unix timestamp** (only present when idle) |
| `26..34` | 8 | Current unix timestamp (seen only in the idle sample) |

While sterilizing, remaining seconds = `sub(8,12) - sub(12,16)`
(measured `B4 - 0 = 180 s`, matching the 3-minute default).

> **About `8..12` / `12..16` (confirmed 2026-11-08)**: these are not timestamps. They are
> **total seconds / elapsed seconds of the current run**. Sampled through one real 180 s run:
>
> | Sample | `8..12` | `12..16` | State |
> | --- | --- | --- | --- |
> | +33 s | `00B4` (180) | `001E` (30) | `01` running |
> | +65 s | `00B4` | `003E` (62) | `01` |
> | +98 s | `00B4` | `005F` (95) | `01` |
> | +130 s | `00B4` | `007F` (127) | `01` |
> | +163 s | `00B4` | `00A0` (160) | `01` |
> | +196 s | `00B4` | `0000` | `00` idle, reset |
>
> Remaining = `sub(8,12) - sub(12,16)`. Good for a progress display; **never a timestamp**.

> **Why you cannot blindly read `18..26`:**
>
> Only the **idle** reply (state `00`) carries the `18..26` next-run timestamp. When the state
> is `01` (sterilizing) that segment is absent, and reading `sub(18,26)` yields something like
> `0005EEC0`, which converts to 1970.
>
> Correct approach: **check the `6..8` state byte first, then decide whether to read `18..26`** —
> or validate the value (`> 1600000000`, i.e. after Sep 2020). Both `phone.html` and
> `set_timer.py` do this.
>
> Note: the two samples below were transcribed from early notes and their byte grouping was
> simplified in transcription. **Do not use them to infer frame length** — use the index table
> above for field positions.

Real sample (start, state `01`):

```
BD 0B 02 | 01 | 00 B4 | 00 00 | 64 | 00 05 | EE C0 | 00
```

| Segment | Value | Meaning |
| --- | --- | --- |
| `BD 0B 02` | command word | power/state class reply |
| `01` | state | sterilizing |
| `00 B4` | counter A | `0x00B4` = 180 s, i.e. the run's total duration |
| `00 00` | counter B | 0 s elapsed |
| `64` | battery | `0x64` = 100% |
| `00 05 EE C0 00` | unknown | meaning unconfirmed; `0005EEC0` is not a plausible timestamp — **do not read** |

Real sample (idle, schedule set to 03:00):

```
BD 0E 02 | 00 | 00 B4 | 00 00 | 64 | 6A DA 5D 30 | 6A D9 F8 82
```

| Segment | Value | Meaning |
| --- | --- | --- |
| `BD 0E 02` | command word | state class reply |
| `00` | state | idle |
| `00 B4` | counter A | 180 s |
| `00 00` | counter B | 0 s |
| `64` | battery | 100% |
| `6A DA 5D 30` | next run | unix seconds → **2026-10-23 03:00:00** |
| `6A D9 F8 82` | current time | unix seconds → **2026-10-22 19:50:26** (7.2 h before the next run) |

### 5.2 Schedule list (`BD0D07` / `BD0D08`)

`BD0D07` = query result, `BD0D08` = save acknowledged. Payload is the fixed-slot table described
in section 4.

Both replies carry **identical payloads** (12 bytes = 4 slots): `07` only reads the table, `08`
parses the payload first and then reads it back. To verify a `08`, compare content — not the
mere presence of a reply.

### 5.3 Logs (`BD0805` / `BD0806`)

| hex index | Meaning |
| --- | --- |
| `6..14` | Start timestamp (8 hex, unix seconds) |
| `14..18` | Duration in seconds |
| `18..20` | Trigger: `0` scheduled / `1` non-scheduled (button, **power-on auto run**, see §8.4) |
| `20..22` | Record type: `00` start / `01` end (44 of 45 were `01`; the oldest was `00`) |

Real sample:

```
BD 08 05 6A D9 F7 9A 00 B4 01 01
         ↑start ts    ↑180s  ↑type ↑end
```

**Logs are a stream: the device pushes one at a time and will not send the next until you
acknowledge the current one.**

Flow:

```
send DB 01 05
  → receive BD0805 (record 1; only the first frame uses this command word)
  → reply DB 06 06 01 + that record's start timestamp (4 bytes)
  → receive BD0806 (every subsequent record uses this command word)
  → reply DB 06 06 01 + timestamp
  → …
  → BD0806 FFFFFFFF FFFFFF 00 marks the end of the buffer

(Measured 2026-11-07: one full drain yielded 45 records — the first `BD0805`, the other
44 `BD0806` — ending with `BD0806 FFFFFFFF FFFFFF 00`. Older notes saying "every record
is BD0805" were wrong.)
```

The original mini program stores both `00` (start) records and `01` (end) records, the latter
only when duration is non-zero, and uploads the batch to its backend once `FFFFFFFF` arrives.

> Because it is a stream, sending `DB 01 05` **without** acknowledging only ever yields the
> first record. The acknowledgement carries the record's *start timestamp*, not a sequence number.

#### Read-once: `DB 01 05` does not rescan from the newest ★

**The log is a pending-upload queue, not a re-readable ring buffer.** `DB 01 05` returns
records that have not been acknowledged yet; each `DB 06 06 01` consumes one, and
`FFFFFFFF` means the queue is empty. The vendor app uploads every record to
`uploads_device_use_log` as it arrives and reads history from the server
([miniprogram.en.md](miniprogram.en.md) §5.2) — the device only keeps what has not been
synced. That is exactly what a queue is for.

**Acknowledged records never come back**: three consecutive reads are strictly contiguous
with zero overlap (table below), and even a power cycle on 11-07 did not bring them back.
On 2026-11-08, six historical timestamps (including `00000000` and `FFFFFFFF`) were sent
as acknowledgements to try to seek backwards — every one returned only `FFFFFFFF` (§8.5).
⚠️ The BLE layer cannot tell deletion from marking, but **the firmware answers it** (§3.6 and
`docs/firmware-structure.en.md` §6): the records live in a 200 × 8 B table at flash `0x40000`,
and the **queue index is a single byte at `0x45000`** — increment on append, decrement on
acknowledge, `0xFF` = empty. An ack **only moves that byte; nothing is erased**, which is why
all 200 slots still hold their history after the queue has been drained. Only observable
behaviour is described below. Without an ack, a second `DB 01 05` **re-sends the same record**.

Measured 2026-11-07, three consecutive connections with no sterilization in between:

| Run | Last record acked | First record of the next run |
| --- | --- | --- |
| 1 | `0x00023760` (66 h) | `0x00030570` (55 h) — exactly the next one |
| 2 | `0x69CEAEA0` (2026-04-03 02:00) | `0x69CD5D20` (2026-04-02 02:00) — exactly the next one |

Corroborating: `DB 01 05` served `0x00084B70`; without acking, a second `DB 01 05` returned
**the same `0x00084B70`**.

⟹ Three consequences for any implementation:

1. **One "read logs" tap returns "the next N unacknowledged records", not "the newest N".**
   Tapping twice yields two non-overlapping slices and **already-read records never come
   back**, which looks like "records went missing". Save the output on the first read if
   you need an archive.
2. **No ack, no consumption**: re-querying without acking returns the same record and can
   look like a hang.
3. **An emptied queue cannot be rewound over the protocol**: the end-marker ack,
   re-syncing the clock, reading the schedule, the full init sequence, and arbitrary
   historical timestamps all return `BD0805/BD0806 FFFFFFFF FFFFFF 00`.
   **The log becomes readable again once the next scheduled run writes a record**
   (measured 07:09, see §8.5): after the 02:00 point, a bare `DB 01 05` returned
   `BD0805 6AEF6720 00B4 00 00` (02:00 / 180 s / scheduled / **start-type**), then the
   end marker after the ack.
   ⟹ **A USB-powered unit does not need a power cycle**: wait for the next scheduled
   point; a power cycle does not bring consumed records back either.
   Also, a run started with `DB 02 04 01` produced **no new log record** (one A/B
   comparison) — only scheduled runs write logs (§8.5).

> **The earlier "a power cut really loses records" inference is withdrawn** (reviewed
> 2026-11-08). What was seen on 11-07 — class-B timestamps and `2026-04-03` gone, the chain
> starting at `04-02` — was read as "the most recent records were never flushed". Laying the
> three dumps out in time shows those records had **already been acknowledged and consumed in
> earlier runs**: s1 `11-01 → 05-08`, s4 `05-08 → 04-03`, s6 `04-02 → 02-18`, contiguous
> with zero overlap. "Already consumed" needs no extra assumption about power loss.
> **Whether a power cut loses anything on top of that is unproven.**

Observed behaviour:

- **Newest first within the queue**;
- **45 is not a buffer capacity**: the three reads yielded 37 / 42 / 45 records — those
  are just the **unread queue lengths** at the time. Real capacity is unknown; §8.3's
  "depth ≥ 42" and §8.4's "= 45" both mistook queue length for capacity;
- 44 of 45 had `20..22` = `01` (end), **the oldest was `00`** — so "always `01`" is wrong and
  start-type records do exist, just rarely. All 45 here were 180 s (300 s was measured in §8.2);
- Timestamps come in two families. **A**: real unix seconds (44 records here,
  `2026-02-18` … `2026-04-02`, 02:00 every day, exactly 24 h apart). **B**: small values
  (`00000000`, `0003D4C2`, `00030570`, …) that are **exact multiples of 3600** and alternate
  **13 h / 11 h** apart, matching the `02:00` and `15:00` schedules.
- Class B stops appearing in later reads while class A follows on, consistent with
  **consumption in time order**; the earlier "class B is RAM-only and lost on power cut"
  was an **inference, now withdrawn**. Why class B values are exact multiples of 3600 is
  still unknown (on USB power they cannot recur, see §9). Both families **must be
  acknowledged**, otherwise the records behind them are unreachable.

### 5.4 Warnings

`BD05A1` = low battery.

---

## 6. Post-connection sequence

The mini program's original flow, safe to copy:

```
connect
 → subscribe to every notifiable characteristic (especially 1002)
 → DB 04 02 + current unix seconds   // clock sync + state
 → DB 01 05                          // usage log
 → DB 01 07                          // schedule list (critical)
 → DB 01 A4                          // version
 → DB 04 02 + current unix seconds   // sync again
```

If the full state reply is not received within 15 s, the mini program disconnects and retries.

> **Do not send these frames too close together** (measured 2026-11-08): at 0.25 s spacing,
> 8 of 12 read-back rounds got no `BD0D07`; at 0.6 s, 8/8 did. `set_timer.py` uses 1.2 s and
> is safe. Keep **at least 0.5 s** between adjacent frames in your own client.

---

## 7. Minimal implementation

Three steps are enough to change the schedule:

```python
# 1. connect over BLE
#    the advertising name may be QUANGE-WY020702, or the module default kHID (GAP name starts Hi-)
#    -- accept all three prefixes, or just connect by MAC. Do not hard-code "QUANGE" only.
#    Also: the device advertises 0x1812, but that comes from the same config block as the name
#    (the device has no HID service at all) — it may vanish if the name is rewritten. Not a
#    stable identifier; the MAC is.
# 2. write  DB 08 08 <count> <HH> <MM> <0D>  to 00001001-... (write-without-response)
# 3. write  DB 04 02 + unix_seconds to the same characteristic, subscribe to 1002 to confirm
```

**Writing the schedule does not need `DB 01 05`** — that one is "query the log" and is unrelated
to setting the schedule.

To **read back** the current schedule, send three frames in order:

```
DB 04 02 + ts     time sync (sync first, otherwise device-side timestamps are unreliable)
DB 01 05          query the log (optional; usually preceded by a sync)
DB 01 07          read the schedule -> replies BD 0D 07
```

`DB 01 05` is a **stream**: the device pushes one record at a time, and you must reply
`DB 06 06 01 + that record's start timestamp` before it releases the next one, until `FFFFFFFF`.
**Send without acknowledging and you will only ever get the first record.**

Note: Windows defaults to MTU 23 → a 20-byte write limit. The longest frame in this protocol is
**16 bytes** (a 4-entry write, `DB 08 08 04` plus 12 payload bytes, and the 4-slot `BD 0D 07`
read-back). That still fits in 20 bytes, so **no chunking is needed**; slice it yourself if you
extend beyond that.

---

## 8. Verification log

### 8.1 2026-10-22 (Windows + `bleak`, ~30 cm away, RSSI −55 to −72 dBm, stable link)

| Step | Sent | Received | Result |
| --- | --- | --- | --- |
| Channel check | `DB 02 04 01` | `BD0B02 01 00B4 0000 64 0005 EEC0 00` | Indicator switched to breathing, device obeyed |
| Write schedule | `DB 08 08 01 03 00 05` | `BD0D08 030005 FF×9 0C` | Saved, previous list replaced |
| Confirm state | `DB 04 02 + ts` | `BD0E02 00 ...` | Next run = 2026-10-23 03:00:00 |
| **Multiple entries** | `DB 08 08 02 03 00 05 0F 1E 04` | `BD0D08 030005 0F1E04 FF×6 00` | Both accepted |
| **Read back list** | `DB 04 02` → `DB 01 05` → `DB 01 07` | `BD0D07 030005 0F1E04 FF×6 00` | Same two entries, exact match |
| Log query | `DB 04 02` → `DB 01 05` | `BD0805 6AD9F79A 00B4 01 01` | Parsed as "start ts / 180 s / type 1 / end" |
| Log streaming ack | `DB 06 06 01` + start ts | one record per ack | **Verified**: 20 records, newest first, can keep going back |

### 8.2 2026-11-01 (same unit, farther away — RSSI −87 to −92 dBm, ~1 in 3 connects succeed)

| Step | Sent | Received | Result |
| --- | --- | --- | --- |
| Full GATT dump | — (connect and walk only) | 6 services, **no HID service** | `000000FB` and Telink OTA both present; `0x1812` confirmed to be advertisement-only |
| PnP ID | read `2A50` | `02 8A 24 66 82 01 00` | `VID=0x248A` (Telink), **`PID=0x8266`** (little-endian). ⚠️ This is an SDK default constant and **does not identify the chip**, see §1 |
| Battery | read `2A19` | `63` | 99% |
| Firmware version | `DB 01 A4` | `BD 06 A2 30 30 30 30 31 34` | Payload is **ASCII `"000014"`**, see note |
| **Five entries** | `DB 08 08 05 02 00 06 08 00 03 0C 00 03 12 00 03 16 00 03` | `BD0D08 020006 080003 0C0003 120003 00` | **Fifth entry silently dropped — firmware caps at 4** |
| **30-minute gap** | `DB 08 08 02 02 00 06 02 1E 03` | `BD0D07 020006 021E03 FFFFFF FFFFFF 00` | **Firmware does not check spacing** — both stored verbatim (see note) |
| **Duration honoured** | set `15:00 / 5min`, wait for it to run | log `BD 08 05 6AE2EEF0 012C 00 01` | `0x012C` = **300 s**, matching 5 min (see note) |
| Restore and re-read | `DB 08 08 02 02 00 03 0F 00 05` → `DB 01 07` | `BD0D07 020003 0F0005 FFFFFF FFFFFF 00` | Field-for-field identical to before the test |

> **The spacing rule exists only in the mini program's UI (measured).**
> The second row writes two entries **30 minutes** apart — far below the 59-minute UI minimum —
> and the device stores them verbatim. Combined with the `±59` and `1380` checks in
> `app-service.js`, this settles it: **both the "≥59 minutes" rule and the "23-hour window" are
> front-end-only; the firmware does not check either.**
> `set_timer.py` / `phone.html` still enforce them **on purpose**, to stay consistent with the
> vendor app and prevent configurations the original app could never produce. Use `--force` to
> bypass.

> **The duration byte `0D` does take effect (measured).** Log record
> `BD 08 05 6A E2 EE F0 01 2C 00 01`: timestamp `0x6AE2EEF0` = 2026-10-29 15:00:00,
> duration `0x012C` = 300 s — exactly the `15:00 / 5min` entry. **The device honours it.**

> **The log `type` field distinguishes the trigger (measured)**: `type 0` records have on-the-hour
> timestamps (02:00:00 / 15:00:00) = **scheduled**; `type 1` has arbitrary moments (e.g. 19:09:09)
> = **manual / button triggered**.

> **The `BD 06 A2` payload is an ASCII string**: the 6 bytes `30 30 30 30 31 34` are `"000014"`.
> The mini program's trick of joining hex `15..16` with `17..18` only yields `14` here because
> the ASCII digits happen to land on those indices — **the algorithm is wrong, merely lucky**.
> The correct read is `payload.decode("ascii")`.
> (Full OTA flow: [miniprogram.en.md](miniprogram.en.md) §5.1.)

Conclusion: writes to `1001` are honoured, replies arrive on `1002`, and no binding is involved.
Subscribing to `1001` is refused (`Write Not Permitted`), but writing data to it works fine.

> **A write does not always produce a reply.** The restore write on 2026-11-01 produced no
> `BD 0D 08`, yet reading back showed the data had in fact been stored. **Always verify by
> reading back; never trust the absence of a reply.**

---

### 8.3 2026-11-07 (same unit, RSSI −86 to −95 dBm, fewer than half the connects succeeded)

| Step | Sent | Received | Result |
| --- | --- | --- | --- |
| State frame before subscribing | `DB 04 02` + ts, not subscribed to `1002` | **0 frames** | reply dropped |
| Subscribe afterwards | subscribe `1002`, wait 6 s | **still 0 frames** | **not buffered, not replayed** |
| Same frame once subscribed | as above | `BD0E02 00 012C 0000 64 6AEF6720 6AEF3956` | immediate reply; `next run` = `2026-11-08 02:00:00` |
| Idle listen | — (12 s, nothing sent) | **0 frames** | no unsolicited pushes **while idle** (not tested during a run — deliberately dropped, see §9) |
| Re-query without ack | `DB 01 05` twice, no ack in between | both times `BD0805 00084B70 012C 00 01` | no ack, no consumption; same record re-sent |
| Continuous read | `DB 06 06 01` ×42 | 42 records, ending at `0x69CEAEA0` (2026-04-03 02:00) | **unread queue ≥ 42** (not capacity, see §5.3) |
| **Resume across connections** | reconnect, then `DB 01 05` | first record `0x69CD5D20` (2026-04-02 02:00) | **consumed records do not return**; queue continues (see §5.3) |

> **Log time base anomaly (measured, mechanism unknown).** At the same moment:
> - state reply `next run` = `0x6AEF6720` = **2026-11-08 02:00:00** (correct wall clock)
> - log timestamps like `0x00030570` = 198 000 s (not wall clock), the whole batch being
>   **exact multiples of 3600**: `0 h / 7 h / 18 h / 31 h / 42 h / 55 h`, spaced alternately
>   **13 h / 11 h** — exactly the gap between the `02:00` and `15:00` schedules.
>
> All that can be said is "logs and scheduling use two different time bases".
> **Why, and how to map it back to wall clock, is unknown.**
> (After the USB power mod the clock no longer drops, so class B cannot recur; this item
> is closed, see §9.)

### 8.4 2026-11-07 evening (laptop moved next to the device, RSSI −70 to −82 dBm, stable link)

The user power-cycled the unit by long-press (**it runs one sterilization cycle at power-on**).
Two connections: one for read-only probes, one for the write probes. **The original schedule
was restored and read back after all write cases** (last row).

| Step | Sent | Received | Result |
| --- | --- | --- | --- |
| State reply | `DB 04 02` + ts, `1002` already subscribed | `BD0E02 00 00B4 0000 64 6AEF6720 6AEF443F` | `next run` = 11-08 02:00; `6AEF443F` = **device clock 23:31:11**, sync worked |
| Full log drain | `DB 01 05` → `DB 06 06 01` ×45 | 45 records + `BD0806 FFFFFFFF FFFFFF 00` | **unread queue = 45** (not capacity, see §5.3); first frame `BD0805`, the rest `BD0806` |
| Queue emptied | `DB 01 05` again after the end marker | `BD0805 FFFFFFFF FFFFFF 00` | consumed records **do not return** |
| Idle listen | — (10 s; another 60 s run) | 0 frames | no unsolicited pushes **while idle** (not tested during a run — deliberately dropped, see §9) |
| **Delete frame** | `DB 00 08 01 020003` | `BD0D08 020003 FF×6 00` | delete frame works (previously only inferred) |
| Delete, clear all | `DB 00 08 00` | 0 frames here; all-`FF` empty table in the next window | cleared, reply delayed |
| **Duration bounds** | duration byte `00` / `0F` / `07` | replies `020000` / `02000F` / `020007` | **firmware does not validate duration**; 3–6 min is front-end only |
| Spacing recheck | 30 min / 59 min pairs | both stored verbatim | consistent with §8.2 |
| 1–4 entries | `DB 08 08 01..04` | slot count matches, trailing byte always `00` | 4-slot structure reconfirmed |
| **Restore and read back** | `DB 08 08 02 020003 0F0005` → full `DB 01 07` sequence | `BD0D07 020003 0F0005 FF×6 44` | field-for-field identical to before the tests |

> **Write replies can slip into the next command's window.** Four of the 12 cases produced
> no reply on the spot, yet their `BD0D08` showed up in the very next case's 1 s window
> (the `del0` empty table landed in `dur00`, `dur0F`'s `02000F` in `dur07`). This confirms
> §8.2 ("a write does not always produce a reply") and explains it: **not lost, delayed**.
> Clients still must read back rather than trust the reply.

> **The power-on auto run left a log record.** The first record of the drain was
> `BD0805 00000000 00B4 01 01` (`ts=0` / 180 s / `type=1` / end), matching the user's
> "it starts sterilizing right after power-on". The clock had not been synced since reboot,
> hence `ts=0`. **A single observation.**

> **Log chain across the power cut (reinterpreted 2026-11-08).** Before it (§8.3) the
> chain held class-B "multiples of 3600" timestamps and `2026-04-03`; afterwards the 44
> historical records were all class-A real unix seconds (`2026-02-18` … `2026-04-02`).
> This was recorded as "power cut loses records"; under the consumption queue model (§5.3)
> **those had already been acknowledged in earlier runs**, so the chain simply continued
> at `04-02`. Whether a power cut loses anything extra is unproven.

### 8.5 2026-11-08 (USB powered, RSSI −70 to −74 dBm, stable link)

> The test unit has been converted to **permanent USB power** by the user: it no longer
> powers itself off and no longer loses its clock, so power-cut / battery-swap behaviour
> does not recur here. The corresponding §9 items are closed.

| Step | Action | Result | Conclusion |
| --- | --- | --- | --- |
| Trailing-byte sampling | 12 full-sequence reads, 0.25 s apart | only 4 got a `BD0D07` | **frames too close together lose replies** |
| Controlled tail probe | clock-sync byte 3 set to `4D` / `4E` / `4F` | tail followed exactly `4D` / `4E` / `4F`, repeated offset gave `00` | **clock-derived field, ignore it** |
| Spacing fix | same sequence at 0.6 s | 8/8 received | keep ≥ 0.5 s between frames |
| Fake clock | `DB 04 02` + `0x00000100` | state echoed `00000100`, `next run` = `0x6270` | **the timestamp is the clock; schedules use UTC+8 local HH:MM** |
| State during a run | `DB 02 04 01` under the fake clock, 6 samples at 30 s | 6/6 replied `BD0E02 01`, `12..16` climbed 30→160 s then reset | **counters = total / elapsed; replies are fine during a run** |
| Queue rewind attempts | ACK `FFFFFFFF` / re-sync / read table / full sequence | all still returned `FFFFFFFF` | consumed records **cannot be revisited** |
| Historical timestamp seek | `DB 06 06 01` + 6 old ts (02-18 / 04-02 / 11-01 / 11-08 / `00000000` / `FFFFFFFF`) | 6/6 only `BD0806 FFFFFFFF`, then `DB 01 05` also `FFFFFFFF` | **no seeking or replay by timestamp** |
| Real-clock run (command-triggered) | `DB 02 04 01` for 209 s, then read the log | still `BD0805 FFFFFFFF` | **a command-triggered run writes no log**; it says nothing about the queue |
| Scheduled point recheck | 07:09, bare `DB 01 05` after the 02:00 run | `BD0805 6AEF6720 00B4 00 00`, then `BD0806 FFFFFFFF` after ACK | **a scheduled run writes a record and the log is readable again** |
| Advertising name | 60 s scan → connect → 60 s scan | `kHID` was only the first packet of each round (1/121, 1/98), all others `QUANGE-WY020702` | **not an alternation; startup default then fixed** |
| Post-reboot read-only check | 10:44 long-press reboot, GATT inventory + every readable value | `180A` has only `2A50` (`028A2466820100`); OTA char reads `00`; battery 99%; `2A00` = `Hi-YM01-12DC2009BB6` | **no chip clue at the BLE layer**, matches 10-29 (later overturned by §8.6) |
| State after reboot | `DB 04 02` + real time | `BD0E02 … 6AF01DF0 6AEFE207`: idle, `next run` 15:00, device clock 10:44:23 | **a long-press reboot on USB power does not lose the clock** |
| Power-on run log | bare `DB 01 05` after reboot (**no ACK**) | `BD0805 00000000 00B4 01 00` | **second observation** of `type=1` / `ts=0`; `rec_type=00` (start), record left unread in the queue |

> **Read-once logs vs USB power**: the log is a pending-upload queue (§5.3) — each ACK
> consumes one record, and an emptied queue cannot be rewound, but **no power cycle is
> needed**: the next scheduled run writes a new record and the log is readable again.
> The 02:00 run is confirmed by the state reply
> `BD0E02 00 00B4 0000 64 6AF01DF0 6AEFAFB5` (`next run` = 11-08 15:00, device clock
> 07:09:41, battery 100%, idle).
> ⚠️ The old "read cursor + 45-record ring buffer" model is disproven: three dumps are
> contiguous with zero overlap (even across a power cycle), six historical timestamp
> seeks all failed, and 45 was just that run's unread queue length. Whether records are
> physically deleted or merely marked read is undecidable here. Also, a `DB 02 04 01`
> run writes no log — that caused an earlier misreading. Schedule reads/writes were
> unaffected throughout; the real unix clock was in place and the schedule remained
> `02:00/3min + 15:00/5min`.

### 8.6 2026-11-08 11:00–11:35: ROM dump succeeded (USB power, −68 to −74 dBm)

The user chose to accept the bricking risk and run one OTA dump. **It succeeded end to end,
and the device was restored to the vendor firmware and verified.**

| Step | Action | Result | Conclusion |
| --- | --- | --- | --- |
| Frame check | read the unpacked `app-service.js` | vendor OTA = `01FF` + 20 B frames (seq2 + 16 B + CRC16 LE) + 18 B end frame | **incompatible with TelinkMiFlasher** (32 B blocks / `00FF` prefix / 6 B end frame); the web tool alone would fail |
| Handshake probe | send only `01FF`, no data, disconnect and read back | OTA char `00` before and after; advertising, schedule and log queue all intact | `01FF` is harmless; the device does not enter a bootloader |
| Flashing | 2480 x 20 B in 44.2 s; end frame `02FF AF09 50F6 0000` twice + CRC | rebooted as `BLE_05F834` (`C0:D4:B2:05:F8:34`), −74 dBm | **binary-compatible with TLSR8258**; bootloader accepted third-party firmware |
| Read channel | `0x1f10` / `0x1f1f`, `D4 000000 100000` | `D4 000000 56800000 00005D02 …` | flash is readable |
| Full dump | `D4 000000 000008` | 524288 B (32768 notifications); first 10 packets lost, patched by single-address reads | complete ROM, `sha256 ae711549…` |
| Layout | string search + image comparison | `0x00000–0x0DFFF` vendor firmware (`QUANGE` @`0xCCEE`, `Hi-YM` @`0x2F8C`/`0xD3BA`); `0x20000` = exact BLE-Hacker.bin; `0x40000+` / `0x76000+` config and calibration | **dual-slot layout confirmed**, vendor firmware never touched |
| Restore | `D7` Change Start Boot | back to `QUANGE-WY020702` at the original MAC | switch worked |
| Verify | full init sequence | `BD0D07 020003 0F0005 FF×6 ED`; `BD1102 …` battery 100% / `next run` 15:00; log head normal | fully functional, schedule unchanged |

> **Two earlier judgements corrected**: (1) "TelinkMiFlasher shares the frame format and
> would very likely write" was wrong — block size, handshake and end frame all differ;
> success required a byte-for-byte reproduction of `app-service.js`. (2) "flashing may
> brick it permanently and the vendor ROM cannot come back" is disproven — with dual
> slots the vendor firmware stays at `0x00000` and `D7` switches back.
> ⚠️ **That does not make the earlier caution wrong**: neither was knowable beforehand.
> Also, the BLE-Hacker firmware's `2A26` string `TLSR825x` is its own hard-coded value,
> **not** evidence of the part number. "8258-compatible" is only a **functional inference**
> (a binary built for 8258 with `-llt_8258` booted fully and operated the flash); the exact
> silkscreen part is still unknown.

> Artifacts are kept locally, **not committed to the public repo**: `rom_512k.bin`
> (512 KB, `sha256 ae711549b42f2c1598df7edaf4bf61a8f8aaad96163cfb263afd4ffc2475d096`) and
> `rom_vendor_firmware.bin` (`0x00000–0x0E000`, 57,344 B,
> `sha256 79fa1730ec9f817319ae4414b0c0b91a3f8ea3ca46d0b40e8b304c1b7b468669`).
> The vendor firmware is third-party copyrighted and is not distributed with this repo.
> The reproduction script `ota_dump.py` is kept alongside them.

---

## 9. Unverified

> Items confirmed on real hardware are in §8.2 – §8.6. Only **genuinely open** questions that
> are worth further effort remain below.

- **Exact Telink silkscreen part number** — the case is still unopened, so the precise
  part cannot be read. But the 2026-11-08 measurement narrows it: `BLE-Hacker.bin`, built
  for TLSR8258 with `-llt_8258`, **booted fully and operated the flash** on this unit
  (§8.6), so it is binary-compatible with 8258. PnP ID `0x8266` remains an SDK default and
  the BLE layer has nothing further; the exact silkscreen needs disassembly. **Not pursued.**
  The earlier worry that the dumper would be blocked by an unknown part is resolved.
- **Do later scheduled points keep the log readable?** — confirmed once (11-08 02:00,
  see §8.5); USB power needs no long-press restart. What is still missing is a **second
  and a multi-day** repetition. The next natural scheduled point is 11-08 15:00 — just
  read the log again then; no dedicated experiment or device change is needed.
- **Physical mechanism and real capacity of the log queue** — behaviour is measured
  (ack consumes, no rewind), but "physical delete" vs "non-rewindable read marker" is
  indistinguishable at the BLE layer, and the capacity is unknown (37 / 42 / 45 were
  only the unread lengths). Not worth pursuing without reading the Flash directly.

**Deliberately closed, no longer tracked** (with reasons, to avoid repeating the work):

| Item | Why closed |
| --- | --- |
| How many logs a power cut loses / does it affect the queue / does the schedule survive a battery swap | The test unit is now on **permanent USB power**; these scenarios no longer occur. The old "power cut loses records" inference is withdrawn (§5.3) |
| Does the power-on auto run write a `type=1` log? | **Measured twice** (11-07 / 11-08 long-press reboots). A long-press reboot still happens on USB power, so this is not a "can no longer recur" item — see §8.5 |
| Mapping class-B log time base (exact multiples of 3600) | Class B was a product of a **lost / unsynced clock**; on USB power the clock never drops, so it cannot recur. Why two time bases existed is still unknown, but has no practical impact |
| Does the state reply vanish during the power-on run? | Disproven: 6/6 replies during a run (§8.5). The earlier single zero-reply case was likely a not-yet-ready device |
| Button / body-radar notifications | No control or configuration interface for either exists in the protocol; a positive result could not control anything |
| Meaning of the trailing byte in `BD0D07` / `BD0D08` | Settled: clock-derived field, ignore it (§8.5) |
| What triggers the advertising name switch | Settled: `kHID` appears only in the first packet of a scan, then stays fixed (§8.5) |
| Does `0x1812` disappear with a renamed device? | Renaming is cloud-only with a dead backend; **no device-side write path**, so it cannot be measured |
| Delete frame / duration byte / `20..22` / queue consumption | All measured, see §8.4 / §8.5. "Ring depth 45" and "cursor wrap" were the old model and are disproven |
