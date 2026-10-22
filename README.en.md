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
2. Long-press the button on the device for **3 seconds** to power it on
3. Tap *Connect* → pick the device (normally `QUANGE-WY020702`, possibly the module default `kHID`)
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
python tools/set_timer.py --version                 # read the firmware version (read-only)
python tools/set_timer.py --at 03:00 --dry-run      # print the frame, do not connect
```

Device names default to the `QUANGE` / `Hi-` / `kHID` prefixes, plus a fallback match on the
`0x1812` / `0x180F` services in the advertisement (so a renamed device is still found — same as
the web app). If the scan comes up empty, address it directly:

```bash
python tools/set_timer.py -a AA:BB:CC:DD:EE:FF --query
python tools/set_timer.py -n kHID --query            # match one prefix only
python tools/set_timer.py --version                  # read firmware version (sends DB 01 A4)
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
(3/4/5/6 minutes — the leading `0` is a fixed prefix, the second digit is the duration).

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
│   └── wxapkg_unpack.py              wxapkg unpacker (incl. the V1MMWX format)
├── miniprogram/
│   ├── QUANGE-WY020702__APP__.wxapkg Original bundle (archived)
│   └── app-service.js                Extracted application logic
└── docs/
    ├── protocol.zh-CN.md             协议全文（Chinese）
    ├── protocol.en.md                Protocol (English)
    ├── miniprogram.zh-CN.md          小程序结构与取包方法（Chinese）
    └── miniprogram.en.md             Mini program internals (English)
```

---

## Device facts

| Item | Value |
| --- | --- |
| Model | WY020702 |
| Advertising name | `QUANGE-WY020702` (normal) **or** `kHID` (module factory default; harmless) |
| GAP device name | `Hi-YM01-XXXXXXXXXXXX` |
| SoC | Telink, PnP ID `0x248A:0x6682` |
| Power | 3 × AA cells, BLE only, no Wi-Fi |
| UVC | Seoul Viosys 275 nm |
| Original app | WeChat mini program *莱枫智能生活* (appid `wx9528fce803d3ba0e`, offline) |

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
  factory-default name (meaning the user config area was reset), not "the device alternating
  between two names". The good news is that **functionality is unaffected** — `0x1812` in the
  advertisement is firmware behaviour, and the business service `0xFB` works normally once
  connected. The vendor app only accepts `QUANGE-WY020702`, so it actually can't see the device in
  the `kHID` state. This project matches **three name prefixes + the `0x1812`/`0x180F` services**,
  so a renamed device is still found; failing that, connect by MAC
  (`-a <MAC>` in the script, *Show all devices* in the web app);
- **The device stops advertising while connected**: a BLE peripheral halts advertising once a
  central connects, so **only one host can control it at a time**. While your phone is connected
  the PC cannot see it, and vice versa. Press *Disconnect* before switching controllers;
- **The schedule is replaced, not appended**: saving writes your whole edited list over the
  device's configuration. Up to 4 entries (per the vendor FAQ, not hard-coded), 3–6 minutes each;
  to remove one, delete it in the editor and save;
- **Spacing constraint**: the vendor front end requires ≥ 59 minutes between entries and all
  entries within 23 hours of the first. The web app and the script enforce the same rules (these
  are front-end checks; whether the firmware also enforces is unverified);
- Whether the schedule survives a battery swap is untested (it should — it appears to live in
  flash);
- **Usage history is permanently lost**: the history never lives on the device — the mini program
  streams the log (`BD 08 05`) up to `api.sh-lifefun.cn`, then reads it back through
  `get_device_use_log` to draw the charts. With the backend gone that chain is dead: new sessions
  are no longer recorded and the day/week/month charts are gone for good. `--log` still reads the
  records currently on the device, but there's nowhere to keep them.
  See [docs/miniprogram.en.md](docs/miniprogram.en.md) §5.2;
- **The device name can't be changed**: `get_device_config` / `update_device_config` are both
  cloud endpoints; the name only ever lives on the server and in local storage and is **never
  written to the device**. Unavailable now;
- `DB 01 A0` (device reset) is **deliberately not implemented** — the vendor sends it on unbind,
  it may wipe the schedule, and it has no non-destructive use;
- **Firmware update is no longer possible**: the mini program ships a complete OTA implementation
  (Telink-style OTA with CRC16 chunking), but both the update check and the download go through
  `api.sh-lifefun.cn`, whose DNS record survives while ports 80/443 time out. The mechanism is
  documented in [docs/miniprogram.en.md](docs/miniprogram.en.md) §5.1, but with no firmware file
  there is nothing to flash (a bad write bricks the unit, with no rollback);
- The device advertises very rarely. If connecting fails, move it closer and power-cycle it.

---

## Disclaimer

Not affiliated with QUANGE, Shanghai Lifefun Commodity Co., Tencent or Huawei.

The protocol was derived from a client bundle of a discontinued app, solely to keep
already-purchased hardware usable (interoperability). Files under `miniprogram/` are archived
artifacts of the vendor's mini program; copyright remains with the original rights holder, and
they are included for research and interoperability reference only — not for commercial
redistribution.

Sending commands to your hardware is at your own risk.
