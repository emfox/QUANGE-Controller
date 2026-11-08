# Static Analysis of the Vendor Firmware

> 2026-11-08, based on `firmware/rom_512k.bin` dumped from a personally owned device and the
> `firmware/rom_vendor_firmware.bin` slice. Static analysis only: nothing was executed or modified.
> Reproduce with `python tools/rom_analyze.py` (add `--logs` to print all 200 log slots); Python stdlib only.

## 1. Image layout

524,288 B total, 82.0% `0xFF`. Non-blank regions:

| Offset | Size | Content |
| --- | --- | --- |
| `0x00000–0x0D3E4` | 54,244 B | **Vendor firmware** (code, constants, advertising/GATT data) |
| `0x20000–0x29AE4` | 39,652 B | `BLE-Hacker.bin` written during the dump, not vendor code |
| `0x40000–0x40641` | 1,601 B | **Persistent log table**, 200 slots x 8 B (see §4) |
| `0x41000`, `0x42000`, `0x45000`, `0x46000` | a few bytes | Config scalars (see §4) |
| `0x76000–0x76008` | 8 B | Reversed MAC + 2 B calibration |
| `0x77000` / `0x770C0` / `0x771C0` | 1–2 B each | RF calibration |
| `0x03000–0x03FFF` | 4 KiB | Nearly all zero (only 220 non-zero bytes), purpose unknown |

**Firmware header** (`0x00–0x27`), cross-checked against both images:

| Offset | Vendor | BLE-Hacker | Meaning |
| --- | --- | --- | --- |
| `0x00` | `00008056` | `00008026` | RAM address |
| `0x04` | `025d0000` | same | Fixed config word |
| `0x08` | `00000000` | `544c4e4b` (`KNLT`) | pvvx OTA marker, absent in vendor firmware |
| `0x0C` | `008803e9` | `008803ab` | Unknown |
| `0x10` | `000080c6` | `00008086` | RAM address |
| `0x18` | **`0000d3e4` (54,244)** | **`00009ae4` (39,652)** | **Firmware length**, exactly matches the measured non-blank region |
| `0x20` | startup code | startup code | One byte differs |
| `0x28–0xA7` | `c0 06` x 64 | same | Vector / filler slots |

The last 4 bytes are a checksum. BLE-Hacker uses a standard complemented CRC32 (`crc32(whole) = 0xFFFFFFFF`); the vendor firmware uses a private scheme (`crc32(body[:-4]) = 0x4999d8e6` does not match the stored `0xc79156b0`).

## 2. Disassembly feasibility

The chip uses Telink's **TC32** core, a clone of the 16-bit ARM9 Thumb ISA with modified opcode encodings. A standard Thumb decoder (Capstone 5) produces essentially the same instruction mix for code regions and for pure data regions (`lsls`/`adr`/`ldr` dominate, almost no `bl`/`push`/`pop`), so **a standard Thumb decoder cannot be used**. Halfword byte-swapping and big-endian mode do not help.

> **Solved later on 2026-11-08**: using the opcode table extracted from Telink's official objdump in
> [trust1995/Ghidra_TELink_TC32](https://github.com/trust1995/Ghidra_TELink_TC32), a pure-Python decoder
> `tools/tc32_disasm.py` was written (99.80% coverage) and the full image disassembled — see
> [Firmware Structure](firmware-structure.en.md). The conclusions below still come only from headers,
> constant tables, strings and runtime data.

## 3. Advertising and GATT: `kHID` / `0x1812` settled

Two advertising buffers sit next to each other:

- **ADV @`0xCCEC`**: `10 09` + `QUANGE-WY020702` (name only, then 3 B padding)
- **SCAN RSP @`0xCD00`**: `05 09 kHID`, `02 01 05` (Flags), `03 19 80 01` (Appearance), `05 02 12 18 0f 18` (UUID list `0x1812` + `0x180F`), `07 ff aa×6` (manufacturer placeholder)

Three conclusions:

1. **`kHID` is the scan-response name**; the main advertising packet carries `QUANGE-WY020702`. A scanner occasionally reports the scan-response name as the primary one, which explains why `kHID` was seen only in the first packet of each scan round.
2. **A full-image search for `12 18` (little-endian `0x1812`) has exactly one hit, inside that SCAN RSP UUID list.** All five HID characteristic UUIDs (`0x2A4A`/`0x2A4B`/`0x2A4C`/`0x2A4D`/`0x2A4E`) have **zero hits in the whole 512 KiB**. The GATT attribute data (`0xCD1C–0xD090`, 24 B per entry, containing `0x180F`, `0x180A`, `0x2A19`, `0x2A50`, `0x2902`, `OTA`, `1001/1002` and related constants) has no HID service or characteristic. The advertisement is a claim, not a capability — matching the live GATT export (6 services, no HID).
3. `Telink Remote` @`0x3A46` and `tModule` @`0x3748` appear at **matching offsets in both images**, i.e. they are library constants from Telink's HID Remote example SDK, not an implemented HID feature. Together with the `kHID` config this supports the "upstream example config / wrong provisioning value" diagnosis.

The six `AA` bytes in Manufacturer Data are a runtime placeholder; `0x76000` holds the reversed MAC `b6 9b 00 c2 45 1c` (`1C:45:C2:00:9B:B6`) plus `5a 90`.

Other strings: `Hi-YM01-12DC2110000` @`0x2F8C`, `Hi-YM01-12DC2000000` @`0xD3BA` (default GAP name), `LFWY020702/` @`0xD098`.

## 4. The persistent log table (main finding)

`0x40000` holds **200 slots x 8 B**, ending with a single `01` at `0x40640`:

| Bytes | Format | Meaning |
| --- | --- | --- |
| `0..3` | **big-endian** u32 | Unix seconds (same byte order as the BLE replies) |
| `4..5` | **big-endian** u16 | Duration in seconds; only 180 / 300 observed |
| `6` | u8 | Trigger: `0` scheduled / `1` manual or power-on auto cycle |
| `7` | u8 | `0xFF` on used slots; empty slots are all `0x00` |

189 slots were populated at dump time, 189–199 empty. Cross-checks:

- **Slot 188** = `6a d9 f7 9a 00 b4 01 ff`; the first 7 bytes match the live reply `BD0805 6AD9F79A 00B4 01 01` byte for byte. Log replies are read straight from this flash area.
- **Slots 2–177** = one scheduled cycle at 02:00 every day, 2026-02-20 → 2026-08-14. Gaps: 86,400 s (overnight) x133, 46,800 s (02:00→15:00) x13, 39,600 s (15:00→next 02:00) x11 — the historical schedule was essentially **02:00 and 15:00**; 16 records are 300 s, matching the 5-minute 15:00 entry.
- **Slots 0/1** = current power-cycle records; slot 1 is `0x6AEFE809` = 2026-11-08 11:10:01, minutes before the dump. The little-endian clock at `0x46000` (`0x6AEFE8EE` = 11:13:50) is 229 s later.
- **Slots 179–187**: see §5.

> **ACK does not delete the logs.** The dump happened after several `DB 01 05` rounds and 45 ACKs had drained the queue, yet all 189 historical records are still present in flash.
> This does **not** contradict the "pending-sync queue" model in [protocol §5.3](protocol.en.md): that is the protocol view. ACK advances a **sync cursor/flag** rather than erasing records; "empty" means no unsynced records, not no history.
> So "logs are deleted after reading" is ruled out: ACK only advances the cursor/flag.
>
> Still unverified: where that cursor lives. `0x40640 = 01`, `0x42000 = 85 (0x55)` and `0x45000 = 01` are candidates. Confirming it needs a second dump after consuming a few new records.

## 5. Time base (closes the open question in §8.2)

Slots 179–187 use a second time base: `0x0000FD20`, `0x00024EA0`, `0x0003A020`, `0x0004F1A0` … These are seconds since 1970-01-01 00:00 UTC. Converted to UTC+8, **every type=0 (scheduled) record lands on 02:00 each day** (64,800 s = 18:00 UTC = 02:00 CST), exactly where the normal records sit; the type=1 (manual / power-on) records in the same batch sit at arbitrary times.

So: **before the clock is set the RTC starts from zero and logs seconds since 1970; after `DB 04 02` time sync it logs Unix wall-clock time. Scheduling only uses `seconds mod 86400` to decide local 02:00, so cycles fire either way.** That explains the live observation of "whole batch is a multiple of 3600 and does not look like wall-clock time". The two areas use different byte orders (log table big-endian, `0x46000` runtime variable little-endian) because log records are stored in BLE reply format verbatim.

## 6. Still unresolved

- Header field `0x0C` and the vendor checksum algorithm
- Exact meaning of `0x41000` (`02 00 00 00 b4 0f 00 00 01 2c 00 00 … 02`), `0x42000 = 85`, `0x45000 = 01`
- The nearly-all-zero 4 KiB region at `0x03000` (disassembly confirms **0 calls, 0 literal refs**, so it is not code)
- The log-persistence code path (the dispatch table and scheduling are covered in the [code map](firmware-code-map.en.md) §14, §15)
