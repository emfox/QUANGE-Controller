# QUANGE-Controller

Third-party controller and BLE protocol documentation for the **QUANGE (全格) WY020702**
smart sterilizing toothbrush holder.

The vendor's WeChat mini program (*莱枫智能生活*) went offline together with its backend, leaving the
device locked to its factory schedule. This repository reconstructs the device's **plaintext BLE
protocol** from the mini program bundle and ships two ready-to-use controllers:

| Option | Description | Works on |
| --- | --- | --- |
| **[Web app](phone.html)** | Talk to the device directly from a phone browser, nothing to install | Android + Chrome |
| **[Python script](tools/set_timer.py)** | Set the schedule from a shell, easy to automate | Windows / macOS / Linux |

> Live demo: **https://emfox.github.io/QUANGE-Controller/**
> (open in Chrome on Android, then *Add to Home screen* — it feels just like the old mini program)

---

## Quick start

### Web app (recommended)

1. Open https://emfox.github.io/QUANGE-Controller/ in **Chrome on Android**
2. Long-press the button for **3 seconds** to power it on (skip this on a USB-powered unit,
   which no longer powers itself off)
3. Tap *Connect* → pick the device (the main advertising name is fixed at `QUANGE-WY020702`;
   the module default `kHID` appears only in the **first packet** of each scan, see *Known limitations*)
4. Tap *Read from device* → add/remove entries → *Save to device*

The page shows live state: idle / sterilizing with countdown, next run, battery, firmware version
and the most recent run. Up to **4** schedule entries, 3–6 minutes each, fully editable
(multiple entries verified). A *Read log* button pulls the device's sterilization history.

> Web Bluetooth is not available in iOS Safari. Apple devices cannot use the web app.

### Script

```bash
pip install bleak

python tools/set_timer.py --at 03:00 --dur 5        # 03:00 daily, 5 minutes
python tools/set_timer.py --at "07:00=4,22:00=5"    # twice a day
python tools/set_timer.py --query                   # read state + next run
python tools/set_timer.py --start                   # sterilize right now
python tools/set_timer.py --list                    # read the schedule from the device
python tools/set_timer.py --logs                    # read the usage log (read-only, read-once)
python tools/set_timer.py --logs-all                # drain the unread queue
python tools/set_timer.py --version                 # read the firmware version
python tools/set_timer.py --stop                    # stop immediately
python tools/set_timer.py --at 03:00 --dry-run      # print the frame, do not connect
```

Device names default to the `QUANGE` / `Hi-` / `kHID` prefixes, plus a fallback match on the
`0x1812` / `0x180F` services in the advertisement (so a renamed device is still found — same as
the web app). If the scan comes up empty, address it directly:

```bash
python tools/set_timer.py -a AA:BB:CC:DD:EE:FF --query
python tools/set_timer.py -n kHID --query            # match one prefix only
```

---

## Protocol at a glance

Commands are written to characteristic `00001001-0000-1000-8000-00805F9B34FB`;
frames start with `DB`. The device replies on `00001002-...` with frames starting with `BD`.
**Plaintext, no encryption, no checksum, no pairing or binding required.**

| Action | Frame |
| --- | --- |
| Start now | `DB 02 04 01` |
| Stop | `DB 02 04 00` |
| Query state | `DB 04 02` + 4-byte big-endian unix seconds |
| Query schedule | `DB 01 07` (not answered unless `DB 04 02` + `DB 01 05` precede it) |
| **Set schedule (whole-list replace)** | `DB 08 08 <total count>` + `[HH MM 0D] × total count` |
| Delete | `DB 00 08 <remaining count>` + `[entries to KEEP] × remaining count` |

Each schedule entry is 3 bytes: `HH` hour (hex), `MM` minute (hex), `0D` duration
(**one byte, minutes**). This project follows the vendor UI and offers only 3 / 4 / 5 / 6
minutes; measured 2026-11-07, **the firmware does not validate the range** (`0x00`, `0x07`
and `0x0F` were all accepted). The "leading `0`" is just the high nibble from the vendor's
string building, not a protocol prefix.

Example — every day at 03:00 for 5 minutes → `DB 08 08 01 03 00 05`

Full field descriptions, reply parsing and the init sequence:
**[docs/protocol.en.md](docs/protocol.en.md)** · [中文](docs/protocol.zh-CN.md)

---

## Repository layout

```
.
├── index.html                        GitHub Pages entry point
├── phone.html                        Web Bluetooth controller
├── tools/
│   ├── set_timer.py                  CLI schedule setter (recommended)
│   ├── blectx.py                     Shared BLE helpers
│   ├── probe.py                      Read-only diagnostics (scan / listen)
│   ├── ota_dump.py                    OTA ROM dump (⚠️ irreversible, see docs/ota-dump.en.md)
│   ├── rom_analyze.py                 Static ROM analysis (read-only)
│   ├── tc32_disasm.py                 TC32 disassembly and call graph (read-only)
│   ├── tc32_ram.py                    RAM/IO access matrix (constant propagation, read-only)
│   ├── mibeacon.py                    MiBeacon broadcast codec (self-tested)
│   ├── cmd_probe.py                   Send raw frames and log replies (unknown-command probing)
│   └── wxapkg_unpack.py              wxapkg unpacker (incl. the V1MMWX format)
├── firmware/
│   ├── rom_512k.bin                   Full flash backup (512 KB)
│   ├── rom_vendor_firmware.bin        Vendor firmware slice (0x00000–0x0E000)
│   └── README.md                      Checksums, layout and rights
├── miniprogram/
│   ├── QUANGE-WY020702__APP__.wxapkg Original bundle (archived)
│   └── app-service.js                Extracted application logic
└── docs/
    ├── protocol.zh-CN.md             协议全文（Chinese）
    ├── protocol.en.md                Protocol (English)
    ├── ota-dump.zh-CN.md              ROM dump procedure（Chinese, ⚠️ irreversible）
    ├── ota-dump.en.md                 ROM dump procedure (English)
    ├── firmware-code-map.zh-CN.md     固件代码结构图（Chinese）
    ├── firmware-code-map.en.md        Firmware code map (English)
    ├── firmware-analysis.zh-CN.md     原厂固件静态分析（Chinese）
    ├── firmware-analysis.en.md        Vendor firmware analysis (English)
    ├── firmware-structure.zh-CN.md    原厂固件功能结构（Chinese）
    ├── firmware-structure.en.md       Vendor firmware structure (English)
    ├── miniprogram.zh-CN.md          小程序结构与取包方法（Chinese）
    ├── miniprogram.en.md             Mini program internals (English)
    ├── mi-home.zh-CN.md               Mi Home: feasibility and boundaries (Chinese)
    └── mi-home.en.md                  Mi Home: feasibility and boundaries (English)
```

---

## Device facts

| Item | Value |
| --- | --- |
| Model | WY020702 |
| Brand / responsible entity | **Shanghai Laifeng Household Products Co., Ltd.** ("QUANGE" is its own brand; USCC `91310120MA1HQ17M3W`, `sh-lifefun.com`) |
| Advertising name | `QUANGE-WY020702`; `kHID` appears only in the **first packet** of each scan, then stays fixed (measured, §8.5 — not an alternating name) |
| GAP device name | `Hi-YM01-XXXXXXXXXXXX` |
| SoC | Telink. **Measured binary-compatible with TLSR8258**; the exact silkscreen part is still unknown (§8.6). Disassembly has been dropped — no further pursuit |
| Power | Stock: 3 × AA cells (nameplate `AA LR6 1.5 V × 3`, `4.5 V / 0.81 W`). **The test unit has been converted to USB power**: 5 V stepped down to ~4.5 V by a DC-DC module into the battery contacts (no auto power-off, no clock loss) |
| Nameplate / type approval | Rear nameplate: `WY020702`, `4.5 V / 0.81 W`, Shanghai Laifeng Household Products Co., Ltd.; radio type approval code **`CMIIT ID: 2021DP13837`** (certificate `2021-13837`, equipment "Bluetooth device", applicant/manufacturer Shanghai Laifeng, issued 2021-10-22, valid five years) |
| Manufactured in | Zhongshan, Guangdong |
| UVC | Seoul Viosys 275 nm |
| Original app | WeChat mini program *莱枫智能生活* (appid `wx9528fce803d3ba0e`, offline) |

> **Entity**: the WY020702 box/manual names Shanghai Laifeng, matching its business registration,
> its domain and a related-party disclosure by listed company Chahua. **"莱枫智能生活" is the mini
> program's name, not a company.** Brand owner ≠ module/firmware/OEM (Telink module,
> OUI `1C:45:C2` = Huizhou Sanxin, OEM in Zhongshan).
>
> **Physical and official cross-check**: the rear nameplate itself reads "Shanghai Laifeng
> Household Products Co., Ltd.", and the SRRC record for `2021DP13837` lists the same company as
> applicant/manufacturer with equipment model WY020702. The certificate only publishes RF
> parameters (2400–2483.5 MHz, ≤20 dBm EIRP, occupied bandwidth ≤3 MHz) and **does not disclose
> the chip/module part number** — it cannot replace reading the silkscreen.
> See [nameplate and approval label](docs/images/nameplate.jpg) and
> [printed guide and branding on the side](docs/images/side-printed-text.jpg) (the nameplate photo
> shows this unit's MAC/SN, published with the owner's consent).
>
> Sources: [box/manual photos](http://mp.weixin.qq.com/s?__biz=MzU0MjQxMDE3Mw==&mid=2247484008&idx=1&sn=1f52900b12f12ef3149395d5854b7d32), [business registry](https://aiqicha.baidu.com/company_detail_10059015340660), [Chahua disclosure](http://static.cninfo.com.cn/finalpage/2025-08-23/1224554808.PDF), [SRRC approval lookup](https://ythzxfw.miit.gov.cn/jgcx/index.html) (code `2021DP13837`).

---

## Why it looked unfixable

After the mini program died, the common assumption was that the cloud backend had bricked the
device. That is not what happened:

- the device has **no cloud dependency** — all control happens over local BLE;
- the protocol is **plaintext hexadecimal frames** — no authCode, no session key, no bonding;
- the mini program is a thin frontend; the backend only handled login, device naming, OTA and
  usage-log upload.

The only real obstacle was that **the frame format was unknown**. Once `app-service.js` was
recovered, everything fell into place.

Two things are easy to conflate here, so to be precise:

| | Encrypted? |
| --- | --- |
| **Mini program bundle** (`__APP__.wxapkg`) | **Yes.** A `V1MMWX` container: drop the 6-byte header, XOR the whole body with `0x30`. It must be decrypted before the code can be read |
| **Device BLE protocol** (`DB` / `BD` frames) | **No.** Plaintext hex — no checksum, no session key, no bonding |

In short: **the bundle must be decrypted; the protocol does not.**

---

## Known limitations

- **The advertising name isn't always `QUANGE-WY020702`**: `kHID` is the Bluetooth module's
  factory-default name — the upstream vendor reused an HID product line's firmware config and
  never changed the advertising setup. **Settled by measurement on 2026-11-08 (§8.5)**:
  `kHID` appears only in the **first packet** of each scan (1/121, 1/98) and the name then
  stays `QUANGE-WY020702` — **not an alternating name**; the older "switched once in 40 s,
  trigger unknown" observation has been overturned. Functionality is unaffected — the
  business service `0xFB` works normally once connected, and the `0x1812` in the advertisement
  is **only a declaration; the device has no HID service**. The vendor app only accepts
  `QUANGE-WY020702`, so it actually can't see the device in
  the `kHID` state. This project matches **three name prefixes + the `0x1812`/`0x180F` services**,
  but all of those come from the same config block — **only the MAC is reliable**
  (`-a <MAC>` in the script, *Show all devices* in the web app);
- **The device stops advertising while connected**: a BLE peripheral halts advertising once a
  central connects, so **only one host can control it at a time**. While your phone is connected
  the PC cannot see it, and vice versa. Press *Disconnect* before switching controllers;
- **The schedule is replaced, not appended**: saving writes your whole edited list over the
  device's configuration. Up to 4 entries (a **measured firmware limit** — a fifth is silently
  dropped), 3–6 minutes each (**front-end limit only** — the firmware does not validate it,
  see protocol §8.4);
  to remove one, delete it in the editor and save;
- **Spacing constraint**: the vendor front end requires ≥ 59 minutes between entries and all
  entries within 23 hours of the first. **Measured: the firmware checks neither — these are
  mini program UI rules** (two entries 30 minutes apart were stored verbatim). The web app and
  script still enforce them **on purpose**, to match the vendor app and prevent configurations
  the original app could never produce; bypass with `set_timer.py --force`;
- **Power-loss / battery-swap scenarios do not apply**: the test unit has been converted to USB
  power, so it neither powers off nor loses its clock (protocol §9);
- **Usage history is permanently lost**: the history never lives on the device — the mini program
  streams the log (`BD 08 05`) up to `api.sh-lifefun.cn`, then reads it back through
  `get_device_use_log` to draw the charts. With the backend gone that chain is dead: new sessions
  are no longer recorded and the day/week/month charts are gone for good. `--logs` / `--logs-all`
  still read the records currently on the device, but there's nowhere to keep them.
  Logs are **read once**: the device keeps a pending-upload queue and each ACK consumes
  one record, so already-read records never come back — save the output on the first read
  if you want an archive. Once empty, no protocol command can rewind it, but **the next
  scheduled run writes a new record and makes the log readable again** — a USB-powered
  unit needs no restart (a power cycle does not bring consumed records back either).
  See [docs/protocol.en.md](docs/protocol.en.md) §5.3.
  For the cloud side see [docs/miniprogram.en.md](docs/miniprogram.en.md) §5.2;
- **The device name can't be changed**: `get_device_config` / `update_device_config` are both
  cloud endpoints; the name only ever lives on the server and in local storage and is **never
  written to the device**. Unavailable now;
- `DB 01 A0` is **factory reset and deliberately not implemented** — it erases the log table, the
  config and the queue index and resets the schedule to 08:00 / 20:00. Destructive, irreversible,
  no non-destructive use;
- **Firmware update is no longer possible**: the mini program ships a complete OTA implementation
  (Telink-style OTA with CRC16 chunking), but both the update check and the download go through
  `api.sh-lifefun.cn`, whose DNS record survives while ports 80/443 time out. The mechanism is
  documented in [docs/miniprogram.en.md](docs/miniprogram.en.md) §5.1. On 2026-11-08 those
  frames were used to flash third-party firmware, dump the full ROM and switch back; a vendor
  firmware backup now exists ([docs/protocol.en.md](docs/protocol.en.md) §8.6, files under
  [`firmware/`](firmware/README.md)). The full reproduction procedure is in
  **[docs/ota-dump.en.md](docs/ota-dump.en.md)** ([中文](docs/ota-dump.zh-CN.md)).
  Flashing itself is reversible (dual-slot layout plus the `D7` boot flag), but **no third-party
  firmware is shipped here and DIY attempts are not recommended**;
- **The state reply depends on subscription order**: state, battery and next-run time all come
  from the reply to `DB 04 02`. You must **subscribe to `1002` before sending**, otherwise the
  reply is dropped and not buffered — that is the cause of "repeatedly no reply". Both clients
  here subscribe first and are unaffected (see [docs/protocol.en.md](docs/protocol.en.md) §3.2).
  **State replies are normal during a sterilization run** (6/6, protocol §8.5);
- The device advertises very rarely. If connecting fails, move it closer; on a stock
  battery-powered unit you can also power-cycle it (**not needed on the USB-powered test unit,
  and a restart cannot bring back already-consumed log records**).

---

## Disclaimer

Not affiliated with QUANGE, Shanghai Laifeng Household Products Co., Ltd., Tencent or Huawei.

The protocol was derived from a client bundle of a discontinued app, solely to keep
already-purchased hardware usable (interoperability). Files under `miniprogram/` are archived
artifacts of the vendor's mini program; copyright remains with the original rights holder, and
they are included for research and interoperability reference only — not for commercial
redistribution. The images under [`firmware/`](firmware/README.md) are a personal backup dumped
from a privately owned device; copyright in the vendor firmware remains with the original rights
holder and is **not covered by this project's MIT license** — research and interoperability
reference only, no commercial redistribution or porting to other products. The image also
contains device-unique data (MAC, RF calibration) and one debug-firmware write; it is not a
pristine vendor image. Assess this yourself before sharing it publicly.

Sending commands to your hardware is at your own risk.

## License

This project's own code and documentation are [MIT](LICENSE) licensed, © 2026 Emfox Zhou.
The archived vendor bundle under `miniprogram/` and the firmware images under `firmware/` are
**not covered** by this license — see the disclaimer above and [`firmware/README.md`](firmware/README.md).
