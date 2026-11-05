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
| Advertising name | `QUANGE-WY020702` (normal) **or** `kHID` (the module's factory default, see note below) |
| GAP device name | `Hi-YM01-XXXXXXXXXXXX` |
| Advertising payload | Service UUIDs `0x1812` (**declared only — the device provides no HID service**) + `0x180F` (battery, real); manufacturer data payload = **last 4 bytes of the MAC**, company ID `0x451C` |
| SoC | Telink. **Exact part number unknown** — see note below |
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
> silkscreen after disassembly.**

> **About `kHID`**: it is the Bluetooth module's **factory-default advertising name**, not the
> product's brand name. The cause is that the upstream vendor (Hangzhou Laifeng) reused the
> firmware configuration of an HID product line (selfie remote / keyboard) and **never changed
> the advertising setup** when repurposing it as a sterilizer. The vendor app's "rename device"
> feature only calls a cloud API and never writes to the device (see miniprogram doc §3.7), so
> this name can only have been burned in at the factory.
>
> **`0x1812` in the advertisement is the same leftover, not a capability.** A full GATT dump
> (2026-11-01) shows **no HID service at all** — only GAP/GATT/DIS/Battery plus `000000FB` and
> the Telink OTA service. In other words the device advertises a service it does not provide.
>
> Practical consequence: **the advertising name and `0x1812` come from the same config block,
> so neither is a stable identifier.** If the name is rewritten, the `0x1812` declaration may
> vanish with it (not measured yet — a caution, not a conclusion). **Only the MAC is reliable.**
>
> Conversely, **the original mini program only accepts `QUANGE-WY020702`** (hardcoded twice in
> `conble.js`), so it cannot find the device while it advertises as `kHID` — a bug in the vendor
> code, not a faulty device. Our `phone.html` / `set_timer.py` accept three prefixes plus the
> service fallback, so they connect in either state.

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
| Query state | `DB 04 02` + 4-byte unix seconds | `BD 0E 02` etc. by design (§5.1); **this firmware never replies**, see §9 |
| **Query schedule** | **`DB 01 07`** | `BD 0D 07` |
| Query usage log | `DB 01 05` | `BD 08 05` |
| **Set schedule (whole-list replace)** | `DB 08 08` + `Count` + `[HH MM 0D] × Count` | `BD 0D 08`, **but it may not reply**; always verify with `DB 01 07` |
| Delete entries | `DB 00 08` + `Count` + `[HH MM 0D] × Count` | — |
| Version | `DB 01 A4` | `BD 06 A2` + version field (parsed as `14`, see note below) |
| Device reset | `DB 01 A0` | — |
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

> ⚠️ On this firmware this frame **never produces a reply** (see §9). Send it anyway: it exists
> to sync the clock and to unlock the frames that follow, not to get an answer. Never judge
> whether it worked by looking for a reply.

### 3.3 Set schedule

```
DB 08 08 | Count (1 byte) | [HH (1B) MM (1B) 0D (1B)] × Count
```

- `Count`: total number of entries **after** this write — the device replaces the whole table
- `HH`: hour, 0–23
- `MM`: minute, 0–59
- `0D`: duration in minutes; only **3 / 4 / 5 / 6** are supported (`0` is a fixed prefix)

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
slots** (3 bytes per slot, empty slots are `FF FF FF`) followed by one extra byte (observed `0C`
and `00`; purpose unknown and not needed when writing). Skip `FF` slots and ignore the last byte.

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

> **About `8..12` / `12..16`**: these were once documented as "sterilization start timestamp /
> current timestamp", but that was **only a guess** — each segment holds 4 hex characters
> (2 bytes), nowhere near a 32-bit unix second value, and it contradicts the annotations on the
> sample in this same section (`180s` / `elapsed 0`). **Their exact nature is still unconfirmed**;
> all that is measured is that "total − elapsed" behaves correctly. Good enough for a progress
> display, but do not treat them as timestamps.

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

### 5.3 Logs (`BD0805` / `BD0806`)

| hex index | Meaning |
| --- | --- |
| `6..14` | Start timestamp (8 hex, unix seconds) |
| `14..18` | Duration in seconds |
| `18..20` | Trigger: `0` scheduled / `1` manual (see §8.2) |
| `20..22` | Record type: `00` start / `01` end (always `01` in practice) |

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
  → receive BD0805 (record 1)
  → reply DB 06 06 01 + that record's start timestamp (4 bytes)
  → receive BD0805 (record 2)
  → reply DB 06 06 01 + timestamp
  → …
  → when sub(6,14) == FFFFFFFF and state is 00, there are no more records
```

The original mini program stores both `00` (start) records and `01` (end) records, the latter
only when duration is non-zero, and uploads the batch to its backend once `FFFFFFFF` arrives.

> Because it is a stream, sending `DB 01 05` **without** acknowledging only ever yields the
> first record. The acknowledgement carries the record's *start timestamp*, not a sequence number.

**Verified on real hardware (2026-10-22)**: the ack loop works — 20 records read back to back,
each one only arriving after the previous was acknowledged.

Observed behaviour:

- **Newest first**;
- The device keeps a **ring buffer** of unknown depth: 20 records were read without reaching
  the end, and reading further keeps going back in time;
- Every record describes a **completed** run (status byte always `01`), duration always 180 s
  in the observed history;
- Some older records carry timestamps near zero (`00000000`, `0003D4C2`, …), which means the
  **device clock had been reset** (battery swap without a time sync). Treat those times as
  unknown — but they **still must be acknowledged**, otherwise the records behind them are
  unreachable.

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

## 9. Unverified

> Items settled on real hardware are no longer listed here — see §8.2.
> Only genuinely open questions remain.

- **Why `DB 04 02` gets no reply** — sent standalone and mid-sequence, **never answered** in any
  measurement. The `BD0E02` recorded in §8.1 came from an earlier session and was never
  reproduced. To investigate: is MTU 23 the cause? Does subscribing to `2A19` matter? Or does this
  firmware version simply not reply?
- **Do button presses / the body radar produce BLE notifications?** — two listening sessions
  (90 s / 200 s) produced **zero notifications**. (In one of them the user accidentally
  long-pressed and powered the device off; it was silent for ~2.5 min and then recovered, with no
  new log record.)
- **Loses the 3 most recent log records after a power cycle** — anomalous, unexplained. Before the
  power cycle the newest four were `10-29 15:00 / 10-29 02:00 / 10-28 15:00 / 10-28 02:00`; after
  power-up the newest became `10-28 02:00`. Not flushed from RAM? Different read start point?
  **No evidence — no conclusion.**
- Whether the schedule survives a battery swap (it should)
- Depth limit of the log ring buffer
- Whether "start" records exist at all (every record observed was `01` = end)
- Meaning of the single trailing byte in `BD 0D 07` / `BD 0D 08` (`00` throughout this round;
  `0C` in earlier records)
- Whether the leading `0` in the duration byte `0D` is a fixed prefix or a length/type marker
- What makes the advertising name flip between `kHID` and `QUANGE-WY020702`. Measured
  2026-11-01: it switched once within 40 s and then stayed, with every other advertising field
  unchanged. **Trigger unknown.**
- Whether the `0x1812` declaration in the advertisement disappears along with the name
  (expected to, but not measured)
- **Exact Telink part number** — undeterminable at the BLE layer (see §1); needs the silkscreen
