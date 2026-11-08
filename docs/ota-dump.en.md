# Dumping the firmware over OTA (ROM dump)

> Recorded from one successful run on a personally owned `QUANGE-WY020702`
> (MAC `1C:45:C2:00:9B:B6`) on 2026-11-08.
> [中文](ota-dump.zh-CN.md) · [Back to README](../README.md) · [Protocol](protocol.en.md) §8.6

> ⚠️ **This is an irreversible hardware operation.** The very first step writes third-party
> firmware into the device flash. A power cut, a malformed frame or an incompatible chip can
> **brick the unit permanently**, with no OTA rollback path. Read this document fully, make
> sure you have a backup of the vendor firmware, and accept the risk before starting.
> **The project takes no responsibility for damaged hardware.**

---

## 1. Scope and outcome

| Item | Value |
| --- | --- |
| Test unit | QUANGE WY020702, firmware version reply ASCII `000014` |
| SoC | Telink, **binary-compatible with TLSR8258** (functional inference, not a silkscreen reading) |
| Flash size | `0x80000` = 512 KB |
| Result | Full 512 KB dumped, `0xD7` restored the vendor firmware, device verified, schedule unchanged |
| Artifacts | [`firmware/rom_512k.bin`](../firmware/rom_512k.bin), [`firmware/rom_vendor_firmware.bin`](../firmware/rom_vendor_firmware.bin) |

⚠️ **Not guaranteed for other batches or firmware versions.** Partition layout, bootloader
magic and OTA framing may differ. Always run the handshake probe in §5.2 first and confirm
`probe.py` enumerates the same OTA service.

---

## 2. How it works: write-to-read + dual slots

`TLSR825x_OTA_Flash_Hacker` (pvvx) **cannot read the vendor firmware losslessly**:

```
1. Flash BLE-Hacker.bin (39,652 B, built for TLSR8258, linked with -llt_8258) over OTA
        ↓  ← this step is the irreversible write
2. Device reboots into that firmware, advertising as BLE_xxxxxx (the MAC changes too),
   exposing a private service 0x1f10 / characteristic 0x1f1f
   (notify + read + write-without-response)
        ↓
3. Read the whole flash with the 0xD4 command; the firmware streams it back via notify
        ↓
4. Send 0xD7 "Change Start Boot" to switch the boot address back to the vendor firmware
```

The unit uses a **dual-slot layout** — this is what makes recovery possible (confirmed):

| Offset | Content |
| --- | --- |
| `0x00000–0x0DFFF` | Vendor firmware, **never modified during the dump** |
| `0x20000` | OTA slot; `BLE-Hacker.bin` lands here (exact match) |
| `0x40000+` / `0x76000+` | Config / usage records / MAC and RF calibration |
| Rest | Blank `0xFF` |

`0xD7` only switches the boot address back to `0x00000`, so the vendor image is always there.
**On a single-slot OTA device this procedure would erase the vendor firmware — do not copy it blindly.**

---

## 3. Prerequisites

| Item | Requirement |
| --- | --- |
| Python | 3.8+, `pip install "bleak>=3.0,<4"` (3.0.2 tested) |
| Bluetooth | Host with a BLE adapter; Windows / Linux verified, macOS untested |
| Signal | **RSSI > −70 dBm**. At −87 to −92 dBm only ~1 in 3 connects succeeds; a disconnect mid-flash bricks the unit |
| Power | Stable. **The test unit is on permanent USB power**; on batteries, use fresh ones — a power cut mid-write is unrecoverable |
| Vendor backup | **Required**. `firmware/rom_vendor_firmware.bin` is a backup from the same model, but is not guaranteed across units |
| Record | Note the original MAC and save the schedule with `set_timer.py --list` first |

Download the third-party firmware (**not shipped in this repo**, see [`firmware/README.md`](../firmware/README.md)):

```bash
curl -L -o BLE-Hacker.bin \
  https://github.com/pvvx/TLSR825x_OTA_Flash_Hacker/raw/main/BLE-Hacker.bin
sha256sum BLE-Hacker.bin
# f0235125e3a7a66d6b9ec556db5d8ec2451f6d50e626b8fef080d200a08238f2
```

---

## 4. Frame format (the critical part, from first-party source)

**The authoritative source is `miniprogram/app-service.js`**, not any third-party tool.
Relevant functions: `SendBlePkg` / `ReadyOTA` / `StartOTA` / `CRC16S` / `CRC16` /
`toString` / `buf2hex`.

### 4.1 CRC16

CRC16-Modbus, polynomial `0xA001` (reflected), initial value `0xFFFF`,
**emitted as 2 bytes little-endian**. `CRC16()` returns `[hi, lo]` and `toString()` —
with its default argument — computes `t[0] + 256*t[1]` before hex-encoding,
which yields byte order `[lo, hi]`.

Test vector: `crc16(b"123456789")` → `0x4B37` → output `37 4B`.
`crc16()` in `tools/ota_dump.py` implements exactly this and was verified.

### 4.2 Data blocks

```python
press = ceil(len(fw) / 16)
for seq in range(press + 1):          # note the loop includes e == press
    body = seq.to_bytes(2, "little") + fw[seq*16 : seq*16+16].ljust(16, b"\xFF")
    frame = body + crc16(body)        # 18 + 2 = 20 bytes
```

- The loop condition is `e <= updata_press`, so **press+1 blocks** are sent, the last one
  being all `0xFF` padding. `BLE-Hacker.bin` = 39,652 B → `press = 2479` → **2480 blocks**.
- Inter-block delay **15 ms** (2480 blocks took 44.2 s in practice).
- Write characteristic `00010203-0405-0607-0809-0a0b0c0d2b12`, `write-without-response`.

### 4.3 Handshake and end frame

| Phase | Frame |
| --- | --- |
| Handshake | `01 FF` (2 B). **No** `00 FF` prefix |
| End | **18 B**: `02FF` + cnt(2 LE) + `~cnt`(2 LE) + `0000`, **twice**, then CRC16 |

The upstream code builds `t.buf2hex(d) + t.CRC16S(d)`, while `CRC16S()` already contains
one copy of `hex(d)` — so `d` is emitted twice. **It looks like an upstream bug, but this
firmware accepts exactly that; reproduce it byte for byte.** For `press = 2479`:

```
02FF AF09 50F6 0000 02FF AF09 50F6 0000 FBB1
```

> Also: `close()` sends `DB 02 04 00` (stop the current run) to the `1001` control
> characteristic — it does **not** disconnect BLE. OTA runs on the same connection while the
> vendor firmware is still alive; the bootloader switches only at the end. It can be skipped
> when the device is idle.

### 4.4 Do NOT use the TelinkMiFlasher web tool directly

The web tool is **not** interchangeable with the vendor flow — the framing differs:

| | Vendor mini program (first-party) | TelinkMiFlasher / TelinkOTA |
| --- | --- | --- |
| Handshake | `01 FF` | `00 FF` → `01 FF` |
| Data block | seq2 + **16 B** + CRC2 = 20 B | seq2 + **32 B** + CRC2 = 36 B |
| Block count | `press + 1` (incl. padding) | `blockCount` |
| End frame | **18 B**, duplicated prefix + CRC | **6 B**, `02FF` + (cnt−1) + ~(cnt−1) |
| Status read every 8 blocks | No | Yes |

**Flashing this unit with the web tool alone will most likely fail.**
`tools/ota_dump.py` in this repo reproduces `app-service.js`; its CRC and end frame were
verified against real hardware.

---

## 5. Procedure

Run these from `tools/`. Replace `<MAC>` with your device MAC.
The script is **dry-run by default** — only `--commit` touches hardware.

### 5.1 Review the frames without touching the device

```bash
python ota_dump.py --firmware ./BLE-Hacker.bin
```

Expect `2480 blocks`, first block
`0000 26800000 00005D02 4B4E4C54 AB038800 8246`, and end frame
`02FFAF0950F6000002FFAF0950F60000FBB1`. Stop if they differ.

### 5.2 Handshake probe (strongly recommended)

```bash
python ota_dump.py --firmware ./BLE-Hacker.bin --commit \
  --phase handshake --target-mac <MAC>
```

This sends only `01 FF`, no firmware data, then disconnects. In the test run the OTA
characteristic still read `00`, and advertising, schedule and log queue were all intact —
the handshake is harmless and the device does **not** enter a bootloader. Verify after
disconnecting:

```bash
python probe.py --scan-only --scan-time 10 | grep -i quange
python set_timer.py -a <MAC> --list
```

If anything looks wrong, stop here.

### 5.3 Flash the firmware

```bash
python ota_dump.py --firmware ./BLE-Hacker.bin --commit \
  --phase flash --target-mac <MAC> --scan-time 25
```

Success looks like:

```
hacker device: C0:D4:B2:05:F8:34  name='BLE_05F834'  rssi=-74
```

**Write down the new MAC** — `dump` and `restore` need it.
If no `BLE_xxxxxx` appears, **do not blindly retry**; see §8.

### 5.4 Dump the whole flash

```bash
python ota_dump.py --commit --phase dump \
  --mac <BLE_MAC> --out ../firmware/my_rom.bin --timeout 240
```

Protocol: write to `00001f1f-0000-1000-8000-00805f9b34fb`:

```
D4 | addr (3 B, LE) | len (3 B, LE)
```

A full read sends `D4 000000 000008` (addr=0, len=`0x80000`); the firmware streams
`D4 + addr(3) + data(16)` notifications, 32768 of them.

The script ends the stream after **3 s of silence** — keep that behaviour. A fixed 540 s wait
in the first run yielded just one extra packet.

### 5.5 Patch the dropped leading packets (required)

In practice **the first 10 packets of a full streaming read (addresses `0x0`–`0x90`,
160 B) are always lost**, while a standalone `ReadFlash(0,16)` returns them fine — the
first notifications arrive before the subscription is fully established.
Re-running with `--merge` recovered only one more block; patch by explicit address:

```python
# For each missing 16-byte block, issue a single read and copy the notify back
cmd = bytes([0xD4, off & 0xFF, (off >> 8) & 0xFF, (off >> 16) & 0xFF,
             16, 0, 0])
# notify: D4 + addr(3) + data(16) -> buf[addr:addr+len] = data
```

After patching, `@0` should start `56800000 00005D02 00000000 E9038800 …`,
not a wall of `FF`. Full-image SHA-256 values are in [`firmware/README.md`](../firmware/README.md).

### 5.6 Restore the vendor firmware

```bash
python ota_dump.py --commit --phase restore --mac <BLE_MAC>
```

Sends the single byte `D7`. The device should return to `QUANGE-WY020702` at the
**original MAC**.

> Leave `0xD1` (clear OTA area), `0xD3` (write flash) and `0xD5` (erase sector) alone.
> They perform no address validation and can overwrite the MAC / RF calibration area.

### 5.7 Verify

```bash
python set_timer.py -a <MAC> --list
```

Observed replies:

```
BD 0D 07 02 00 03 0F 00 05 FF FF FF FF FF FF ED   -> 02:00/3min, 15:00/5min
BD 11 02 ...                                       -> battery 100%, next run 15:00
BD 08 05 ...                                       -> log head normal
```

⚠️ Standalone `--version` / `--query` often get no reply (known intermittent behaviour).
**Always verify with the full `--list` sequence**, do not mistake a missing reply for a
broken device.

---

## 6. Pitfalls at a glance

| Pitfall | Handling |
| --- | --- |
| Web TelinkMiFlasher won't flash | Different framing, see §4.4 — use this repo's script |
| First 160 B of the dump are `FF` | Streaming always drops the first 10 packets; patch per §5.5 |
| `dump` waits forever | Use the 3 s idle timeout, or `--timeout 240` |
| MAC changes after flashing | `BLE_xxxxxx` uses a different MAC; save it for `--mac` |
| `--merge` overwrites the dump | Keep a copy of the first pass; merge writes in place to `--out` |
| The 512 KB image contains debug firmware | Not a pristine vendor image — use `rom_vendor_firmware.bin` |
| Weak signal / disconnect | No interruptions during the 44 s write; keep RSSI > −70 dBm |
| OTA characteristic reads `00` | Normal; it means neither failure nor "bootloader entered" |

---

## 7. Artifacts and checksums

| File | Size | SHA-256 |
| --- | --- | --- |
| `rom_512k.bin` | 524,288 B | `ae711549b42f2c1598df7edaf4bf61a8f8aaad96163cfb263afd4ffc2475d096` |
| `rom_vendor_firmware.bin` | 57,344 B | `79fa1730ec9f817319ae4414b0c0b91a3f8ea3ca46d0b40e8b304c1b7b468669` |

The image contains `QUANGE` @`0xCCEE`, `Hi-YM` @`0x2F8C` / `0xD3BA` and
`KNLT` @`0x20008` (bootloader magic). Sanity check:

```python
d = open("rom_512k.bin", "rb").read()
assert d[0x20000:0x20010] == open("BLE-Hacker.bin", "rb").read(16)
```

Rights: see [`firmware/README.md`](../firmware/README.md). The vendor firmware is **not**
covered by this project's MIT license and is kept only as a backup of a personally owned
device for research and interoperability.

---

## 8. If it fails

| Symptom | Action |
| --- | --- |
| No `BLE_xxxxxx` after flashing | **Do not flash again blindly.** Long-press off/on once and check whether `QUANGE-WY020702` comes back. If it does, recheck §4 framing and CRC byte order, then retry once |
| Still no advertising after a power cycle | The bootloader is probably damaged and the OTA channel is gone. **A vendor firmware backup cannot help here** (there is no write path); the only route is SWS/SWM single-wire debugging straight to the Flash, which requires opening the case and reaching test pads |
| `D7` did not switch back | Keep power on and long-press off/on once; usually the boot flag was changed but the device did not reboot immediately |
| ROM is mostly `FF` | Blank flash is expected (82% of the test image was `0xFF`); only the ten blocks at `0x0–0x90` are dropped packets |

---

## 9. References

- `tools/ota_dump.py` — implementation of this document, dry-run by default
- [`firmware/README.md`](../firmware/README.md) — artifacts, layout and rights
- [`protocol.en.md`](protocol.en.md) §8.6 — full measurement log and raw frames
- [`miniprogram.en.md`](miniprogram.en.md) §5.1 — the mini program's OTA chain and chunking state machine
- `miniprogram/app-service.js` — **the only authoritative source for the frame format**
- [pvvx/TLSR825x_OTA_Flash_Hacker](https://github.com/pvvx/TLSR825x_OTA_Flash_Hacker) — `BLE-Hacker.bin` and `TLSR825xOTA_Hacker.html`
- [pvvx/ATC_MiThermometer / TelinkMiFlasher](https://pvvx.github.io/ATC_MiThermometer/TelinkMiFlasher.html) — standard Telink OTA (**incompatible with this unit**)
