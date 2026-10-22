# QUANGE WY020702 — Full BLE Protocol

> Reconstructed from the discontinued WeChat mini program *莱枫智能生活*
> (appid `wx9528fce803d3ba0e`, v18). Every item below was verified against real hardware;
> see section 8 for the verification log.

---

## 1. Transport

| Item | Value |
| --- | --- |
| Advertising name | `QUANGE-WY020702` **or** `kHID` — the device alternates between the two |
| GAP device name | `Hi-YM01-XXXXXXXXXXXX` |
| Advertising payload | Service UUIDs `0x1812` (HID) + `0x180F` (Battery); manufacturer data starts with the MAC prefix |
| SoC | Telink, PnP ID `0x248A:0x6682` |
| Pairing | **Not required** — no pairing, no bonding, no encryption |
| Frame encryption | **None** — plaintext hexadecimal |
| Checksum | **None** — no CRC (OTA excepted) |

> **Do not conflate two things.** "No encryption" here refers to the **BLE frames on the air**.
> The mini program bundle itself **is** encrypted (a `V1MMWX` container: drop the 6-byte header,
> then XOR the whole body with `0x30`) — that is the vendor's packaging protection and has
> nothing to do with the device protocol.
> In short: **the bundle must be decrypted; the protocol does not.**

> The private service UUID is **not** present in the advertising payload, so you cannot filter
> by service when scanning. Filter by name, or list all devices.

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
| Query state | `DB 04 02` + 4-byte unix seconds | `BD 0E 02` / `BD 11 02` / `BD 00 02` / `BD 02 02` |
| **Query schedule** | **`DB 01 07`** | `BD 0D 07` |
| Query usage log | `DB 01 05` | `BD 08 05` |
| **Set schedule (whole-list replace)** | `DB 08 08` + `Count` + `[HH MM 0D] × Count` | `BD 0D 08` |
| Delete entries | `DB 00 08` + `Count` + `[HH MM 0D] × Count` | — |
| Version | `DB 01 A4` | `BD 06 A2` + ASCII version (observed `000014`) |
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

The timestamp calibrates the device clock and triggers the state reply.
**Send this first after every connection.**

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
The vendor UI allows at most 4, so design for 4.

**Empty slots and the trailing byte**: the `BD0D07` / `BD0D08` payload is a fixed-slot table
(3 bytes per slot, empty slots are `FF FF FF`) followed by one extra byte (observed `0C` and
`00`; purpose unknown and not needed when writing). Skip `FF` slots and ignore the last byte.

> Because the semantics are a whole-table replace, **you never need to read the current list
> first** — just write the list you want.

### 3.4 Delete entries

```
DB 00 08 | 0N (entry count) | [entries to KEEP] × N
```

The mini program builds `"DB00080" + remainingCount + remainingEntries`, i.e. the fourth byte is
`0x0N`. Include only the entries you want to keep.

---

## 4. Schedule slot encoding

The device stores the schedule in fixed-size slots of 3 bytes. Empty slots are padded with
`FF FF FF`.

Example reply for a single 03:00/5min entry:

```
BD 0D 08 | 03 00 05 | FF FF FF FF FF FF FF FF FF | 0C
                        └── three empty slots (9 bytes)
```

**Two** entries were written and read back successfully; design for the vendor UI's limit of
**4**. Whether the firmware accepts more is unverified.

---

## 5. Reply parsing

All replies start with `BD`. **The command word is not fixed** — observed values include
`BD0B02`, `BD0D08`, `BD0E02`. Judge state-class replies by "starts with `BD` and byte 4 is
`0x00`/`0x01`" rather than matching one exact prefix.

### 5.1 State class

Indices below are positions in the **hex string** (1 hex char = 4 bits).

| hex index | len | Meaning |
| --- | --- | --- |
| `0..6` | 6 | Command word |
| `6..8` | 2 | State: `01` sterilizing / `00` idle |
| `8..12` | 4 | Sterilization start timestamp (low 32-bit fragment) |
| `12..16` | 4 | Current timestamp fragment |
| `16..18` | 2 | Battery percent (hex, `64` = 100%) |
| `18..26` | 8 | **Next run, unix timestamp** (valid while idle) |

While sterilizing, remaining seconds = `sub(8,12) - sub(12,16)`.

Real sample (start):

```
BD 0B 02 | 01 | 00 B4 | 00 00 | 64 | 00 05 | EE C0 | 00
           ↑run   ↑180s  ↑elapsed ↑100%  ↑duration
```

Real sample (idle, schedule set to 03:00):

```
BD 0E 02 | 00 | 00 B4 | 00 00 | 64 | 6A DA 5D 30 | 6A D9 F8 82
           ↑idle                      ↑next run     ↑now
```

### 5.2 Schedule list (`BD0D07` / `BD0D08`)

`BD0D07` = query result, `BD0D08` = save acknowledged. Payload is the fixed-slot table described
in section 4.

### 5.3 Logs (`BD0805` / `BD0806`)

| hex index | Meaning |
| --- | --- |
| `6..14` | Start timestamp (8 hex, unix seconds) |
| `14..18` | Duration in seconds |
| `18..20` | Action type |
| `20..22` | `00` start / `01` end |

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
# 1. connect over BLE (filter by advertising name "QUANGE")
# 2. write  DB 08 08 01 HH MM 0D  to 00001001-... (write-without-response)
# 3. write  DB 04 02 + unix_seconds to the same characteristic, subscribe to 1002 to confirm
```

Note: Windows defaults to MTU 23 → a 20-byte write limit. The longest frame in this protocol is
10 bytes, so no chunking is needed; slice by 20 bytes if you extend it.

---

## 8. Verification log

Environment: Windows + Python `bleak`; ~30 cm away, RSSI −55 to −72 dBm.

| Step | Sent | Received | Result |
| --- | --- | --- | --- |
| Channel check | `DB 02 04 01` | `BD0B02 01 00B4 0000 64 0005 EEC0 00` | Indicator switched to breathing, device obeyed |
| Write schedule | `DB 08 08 01 03 00 05` | `BD0D08 030005 FF×9 0C` | Saved, previous list replaced |
| Confirm state | `DB 04 02 + ts` | `BD0E02 00 ...` | Next run = 2026-10-23 03:00:00 |
| **Multiple entries** | `DB 08 08 02 03 00 05 0F 1E 04` | `BD0D08 030005 0F1E04 FF×6 00` | Both accepted |
| **Read back list** | `DB 04 02` → `DB 01 05` → `DB 01 07` | `BD0D07 030005 0F1E04 FF×6 00` | Same two entries, exact match |
| Firmware version | `DB 01 A4` | `BD06A2` + `"000014"` | Firmware `000014` |
| Log query | `DB 04 02` → `DB 01 05` | `BD0805 6AD9F79A 00B4 01 01` | Parsed as "start ts / 180 s / type 1 / end" |
| Log streaming ack | `DB 06 06 01` + start ts | one record per ack | **Verified**: 20 records, newest first, can keep going back |

Conclusion: writes to `1001` are honoured, replies arrive on `1002`, and no binding is involved.

---

## 9. Unverified

- Whether "two schedules must be ≥ 1 hour apart" is enforced by firmware or only by the UI
- **Whether the duration byte (`0D`) actually takes effect** — every historical log entry shows
  180 s, while the current schedule asks for 5 minutes; read the log again after the next
  scheduled run to find out
- Whether the schedule survives a battery swap (it should)
- Depth limit of the log ring buffer
- Whether "start" records exist at all (every record observed was `01` = end)
- Whether the leading `0` in `0D` is a fixed prefix or a length/type marker
- Full field layout of `BD0D07`
- Maximum number of schedule entries
