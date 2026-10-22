# Mini Program Internals & Bundle Extraction

Vendor mini program appid: `wx9528fce803d3ba0e`. This analysis covers bundle **version 18**.

---

## 1. Extracting the bundle

### 1.1 The phone no longer holds it

WeChat 8.x moved mini program bundles into the **app's private storage**
(`/data/data/com.tencent.mm/...`), which requires root.
`/sdcard/Android/data/com.tencent.mm/MicroMsg/<hash>/appbrand/` is typically empty, and a
full-storage search for `wxapkg` returns nothing.

### 1.2 Use WeChat for PC instead (recommended)

The PC client downloads the bundle to a readable path:

```
%APPDATA%\Tencent\xwechat\radium\users\<32-hex>\applet\packages\<appid>\<version>\__APP__.wxapkg
```

Actual path in this case:

```
C:\Users\<user>\AppData\Roaming\Tencent\xwechat\radium\users\<hash>\
    applet\packages\wx9528fce803d3ba0e\18\__APP__.wxapkg
```

**Steps**

1. Phone WeChat → Discover → Mini Programs → open *莱枫智能生活* → top-right `···` → forward to
   *File Transfer*;
2. On PC WeChat, open *File Transfer* and click that card;
3. Wait until the LOGO appears (**hanging there is fine — the bundle is already on disk**);
4. Grab `__APP__.wxapkg` from the path above.

> Sanity check: if the LOGO renders, the bundle is complete. The LOGO ships inside the bundle;
> it is not fetched from the network (the backend is dead and would return nothing).

Older WeChat 3.x used `Documents\WeChat Files\Applet\<appid>\<version>\`, but current builds no
longer write there.

---

## 2. Bundle format: `V1MMWX` (WeChat 4.x container)

The legacy format starts with `0xBE`; the new container is different:

```
offset 0..6    magic ASCII "V1MMWX"
offset 6..     entire payload, single-byte XOR with 0x30
```

**The bundle itself is encrypted** — Tencent's container adds a XOR layer, so a `.wxapkg`
cannot simply be unzipped; it has to be decrypted first. Note however that **only the bundle is
encrypted — the device protocol is plaintext** (see [protocol.en.md](protocol.en.md)). The two
are easy to conflate.

How to detect it: check the entropy. Undecrypted it sits around **6.64** (AES output would be
near 8.0) and shows many repeated printable-character patterns — the signature of a repeating-key
XOR.

After decrypting, the layout resembles the old wxapkg but there is **no `0xBE` magic header and no
trustworthy `indexInfoLength`**, so the index offset has to be located by scanning:

```
decrypted buffer (407,840 bytes here = 407,846 − 6):

    offset 0 .. 1046       other content (~1 KB, not the index)
    offset 1047 .. 1758    index:
                           [4B name length][UTF-8 path][4B offset][4B size] × 19
    offset 1759 .. …       other blocks (here a chunk starting with PNG magic 89 50 4E 47)
    offset 90088 ..        the actual file contents (incl. /app-service.js)
```

**Key difference: offsets are absolute within the buffer**, not relative to a data section.
To extract a file just do `buf[offset : offset+size]` — do not add or subtract any base.

Verified: the 19 offsets are contiguous (`90088+147606 = 237694` → … → last ends at 407,839), and
`buf[90088:90088+147606]` is **byte-identical** to `miniprogram/app-service.js` in this repo.

> Index offset 1047 only holds for this particular bundle. `tools/wxapkg_unpack.py` scans the
> whole buffer for the longest run of consecutive index entries instead, so it also works on
> other versions.

### File manifest (19 entries)

| Offset | Size | Path |
| --- | --- | --- |
| 90088 | 147606 | `/app-service.js` ← **all business logic** |
| 237694 | 469 | `/component/blepop/blepop.html` |
| 238163 | 477 | `/component/inputPop/inputPop.html` |
| 238640 | 469 | `/component/navbar/navbar.html` |
| 239109 | 465 | `/component/popup/popup.html` |
| 239574 | 473 | `/component/timepop/timepop.html` ← time picker |
| 240047 | 469 | `/pages/addtiming/addtime.html` ← **new schedule** |
| 240516 | 461 | `/pages/conble/conble.html` ← **BLE connect** |
| 240977 | 477 | `/pages/deviceInfo/deviceInfo.html` |
| 241454 | 477 | `/pages/edittiming/edittiming.html` ← edit schedule |
| 241931 | 465 | `/pages/history/history.html` |
| 242396 | 457 | `/pages/index/index.html` ← home |
| 242853 | 453 | `/pages/init/init.html` ← splash (where it hangs) |
| 243306 | 453 | `/pages/logs/logs.html` |
| 243759 | 465 | `/pages/problem/problem.html` |
| 244224 | 449 | `/pages/set/set.html` ← settings (rename / unbind) |
| 244673 | 453 | `/pages/test/test.html` |
| 245126 | 461 | `/pages/timing/timing.html` ← **schedule list** |
| 245587 | 162252 | `/page-frame.html` ← WebView renderer |

### Unpacking

`tools/wxapkg_unpack.py` handles the legacy `0xBE` format, the PC-encrypted variant
(`--appid`) and the `V1MMWX` layout. Pure local, no third-party deps, keyword search built in:

```bash
# self-test (builds fake bundles of all three formats and parses them back)
python3 tools/wxapkg_unpack.py --selftest

# list the 19 files in the bundled bundle
python3 tools/wxapkg_unpack.py -f miniprogram/QUANGE-WY020702__APP__.wxapkg --list

# unpack and grep (writes to tools/unpacked/)
python3 tools/wxapkg_unpack.py -f miniprogram/QUANGE-WY020702__APP__.wxapkg --grep 2b12 DB0402

# if the index cannot be located, treat the whole decrypted buffer as one blob
python3 tools/wxapkg_unpack.py -f miniprogram/QUANGE-WY020702__APP__.wxapkg --raw --grep DB0808
```

Measured: the bundled 407,846-byte package is detected as `V1MMWX` and unpacks into 19 files in
0.2 s, with `app-service.js` byte-identical to `miniprogram/app-service.js`.

---

## 3. Structure

13 pages + 5 components. All logic lives in `app-service.js`.

| Page | Purpose |
| --- | --- |
| `index` | Home: state, countdown, battery, next run. **Every BLE reply handler lives here** |
| `init` | Splash. Runs `get_3rd_session` → `get_user_info` in sequence — **hangs forever now that the backend is gone** |
| `conble` | Scan and connect (scans by HID service `0x1812`, see §3.3) |
| `timing` | Schedule list, edit/delete |
| `addtiming` | Create a schedule (time + 3–6 min) |
| `edittiming` | Edit/delete an existing schedule |
| `history` | Usage history — data lives on the **server**, see §5.2 |
| `set` | Rename device, unbind/remove device |
| `deviceInfo` | Shows the cached version number (`Version`), read-only |
| `problem` | FAQ + **support contacts** (see §7) |
| `logs` / `test` | Boot timestamps / vendor's own debug page (see §3.4) |

The components `blepop` / `inputPop` / `navbar` / `popup` / `timepop` are pure UI shells.
`timepop` hardcodes durations `[3,4,5,6,7,8,9,10]`, while `addtime` and `edittiming` each
narrow it to `[3,4,5,6]` — so in practice you can only pick **3–6 minutes**.

### 3.3 The scan uses the HID service, not the business service

From `conble.js`:

```js
wx.startBluetoothDevicesDiscovery({
  services: ["00001812-0000-1000-8000-00805F9B34FB"],   // HID, not 0xFB
  success: function (t) {
    setTimeout(function () { o.stopBluetoothDevicesDiscovery() }, 60000)   // 60 s timeout
    setTimeout(function () { e.getBluetoothDevices(), e.onBluetoothDeviceFound() }, 2000)
  }
})
```

Two counter-intuitive points:

1. **It filters on `0x1812` (HID), not on its own `0xFB`** — meaning the advertisement
   always carries `0x1812`, while `0xFB` only appears after connecting. This also explains
   the `kHID` name in §6: the module was originally configured as an HID peripheral
   (selfie remote / keyboard) and the advertising config was never changed when it was
   repurposed as a sterilizer.
2. **The name filter is hardcoded to `"QUANGE-WY020702"`** — in both `getBluetoothDevices`
   and `onBluetoothDeviceFound`:

   ```js
   "QUANGE-WY020702" == t.devices[a].localName && e.setData({ list: ... })
   ```

   **The vendor app does not accept `kHID`, nor `Hi-`.** Once the device is renamed or
   reverts to the module default name, the original app can never find it again —
   very likely the cause of most "the mini program can't find my device" reports.

iOS takes a special branch to recover the MAC from the advertisement:

```js
"iOS" == e.data.system && (
  t.devices[o].IosdeviceId = e.jiequ(e.ab2hex(t.devices[o].advertisData), 2)
)
```

It converts `advertisData` to hex, slices it into 2-byte groups, and joins with `:` —
i.e. **the first 6 bytes of the manufacturer data are the MAC** (matching the advertising
layout in the appendix). Android just uses the system `deviceId` (already a MAC); iOS has
to parse it because the OS withholds the MAC.

Results are sorted by RSSI before display. A failed scan reports
`uploads_user_mobile_info` (with `locationEnabled` / `bluetoothEnabled`) — a vendor
diagnostics hook.

### 3.4 The `test` page is the vendor's own debug page

`pages/test/test.js` is not linked from any page, yet the code is fully present in the
bundle — and it **hardcodes the developer's own device MAC**:

```js
deviceId: "AE:C1:38:6E:5F:13"       // appears twice, in notify and writeBle
```

What it exposes:

| Method | Behaviour |
| --- | --- |
| `getState` | Sends `"DB0402" + (Date.now()/1000).toString(16)` — time sync + state query |
| `startKill` | Sends `DB020401` — start sterilizing |
| `stopKill` | Sends `DB020400` — stop |
| `EditKill` | Sends **whatever hex is in the input box** |

So if you can get that page running (after fixing `deviceId`), you have a ready-made
arbitrary-command sender. Our `phone.html` and `tools/set_timer.py` already cover the same
ground without hardcoding a MAC.

### 3.5 Reply dispatch (`notify` in `index.js`)

The `onBLECharacteristicValueChange` handler registered in `notify` is the only place in
the whole app that processes device replies. Dispatch is **an exact comparison of the
first 6 hex characters**:

```js
var a = t.buf2hex(i.value).substring(0, 6);
if ("bd06a2" == a) { ... }          // firmware version → triggers OTA check
else if ("bd0e02" == a) { ... }     // state (extended)
else if ("bd0805" == a || "bd0806" == a) { ... }   // one log record
else if ("bd0705" == a) { ... }     // log stream end marker
else if ("bd1102" == a || "bd0002" == a || "bd0202" == a) { ... }  // power on/off reply
else if ("bd0b02" == a) { ... }     // state (query)
else if ("bd0d07" == a) { ... }     // schedule list
else if ("bd0d08" == a) { ... }     // write OK, navigate back after 2 s
else if ("bd05a1" == a) { t.setData({ DLwran: !0 }) }  // low battery warning
```

The `bd0e02` and `bd0b02` branches are **line-for-line duplicates** — a copy-paste leftover.
Neither validates length; both read `substring(18,26)` as the "next run" timestamp — which
is exactly the 1970 trap described in §5.1.

One easily-missed detail: in the `bd0805`/`bd0806` branch, the record is only stored
locally and ACKed when `action_type` is `00` or `01` **and** the start timestamp is not
`ffffffff`:

```js
var p = "DB060601" + t.data.resStr.substring(6,14);   // ACK, timestamp echoed back
t.writeBle(t.data.deviceId, t.data.serviceId, p);
```

When `g=="00"` and the timestamp *is* `ffffffff`, it calls `syncLogData()` instead —
**that is the "log fully read" condition**: an empty slot's `FF FF FF FF` timestamp.

The `bd0705` branch appends one record if `continuous != 0`, then immediately calls
`syncLogData()` — so it behaves as a final/summary frame.

### 3.6 Bugs in the vendor code (all of them affect real use)

Confirmed after reading all 23 modules, ordered by severity:

| # | Location | Problem | Impact |
| --- | --- | --- | --- |
| 1 | `addtime.js` `saveTiming` | The single-schedule branch condition `a[0].min+59<r\|\|a[0].min>r+59` has muddled precedence; it effectively means "more than 59 min apart", so both 59- and 60-minute gaps pass, but a new time *earlier* than the existing one is misjudged | Boundaries don't match the documented "≥ 1 hour" rule |
| 2 | `addtime.js` `saveTiming` | The 1380 check is written as `r - a[0].min <= 1380`, comparing **only against the first existing schedule**, not the whole table's span | 3–4 schedules can exceed 23 h overall |
| 3 | `edittiming.js` `preData` | Builds `r` by skipping `l != n`, then uses `r[0].min` as the baseline — `r[0]` isn't necessarily the earliest | Span check uses the wrong reference |
| 4 | `edittiming.js` `preData` | `Number(a).toString(16)` isn't zero-padded; a `timing` of `0x0a` yields `"a"` (one char), inconsistent with the `"0"+t` used elsewhere | Would emit a malformed frame for durations ≥ 10 min (UI limits to 3–6, so unreachable) |
| 5 | `index.js` `SendBlePkg` | `for (e = 0; e <= updata_press; e++)` uses `<=` while `updata_press` is already the chunk count (ceiling) — **one extra all-`FF` chunk is sent** | One more frame than the file needs; may fail if the device validates strictly |
| 6 | `index.js` `SendBlePkg` | `e % 256` / `e / 256` aren't truncated; `parseInt` saves it but the intent is muddled | For firmware > 256 chunks (4 KB), seq relies on JS coercion |
| 7 | `index.js` `StartOTA` | The end frame `d = new Uint8Array(8)` only assigns `[0]..[5]`; `[6][7]` stay zero — the comment says "8 bytes + CRC16", reality is 6 meaningful bytes + 2 zeros | Consistent with the docs, but "`[6..7]=00 00`" is a default, not explicitly written |
| 8 | `index.js` `upVal` | `Math.round(updata_press/100)*upVal <= cnt` is essentially always true/false depending on magnitude — the progress bar barely moves | Cosmetic only |
| 9 | `conble.js` | Name hardcoded to `QUANGE-WY020702`; `kHID` / `Hi-` are rejected (see §3.3) | Original app can't find a renamed device |
| 10 | `test.js` | Hardcoded developer MAC `AE:C1:38:6E:5F:13` | That page is useless for any other device |

Our `phone.html` and `tools/set_timer.py` **avoid all of these**: validation follows the
documented "59-minute minimum gap + 23-hour span from the first schedule", and frames are
built as explicit byte arrays rather than string concatenation.

### 3.7 The device name is stored server-side, not on the device

`getName` / `_confirmInput` in `set.js` are entirely cloud-based:

```js
GET /wx_mini/v1/hilinkdevice/get_device_config?mac=...    → device_name
GET /wx_mini/v1/hilinkdevice/update_device_config?mac=...&name=...
```

The name only ever lives on the server and in local storage (`deviceName`) — **it is never
written to the device**. With the server gone, `getName` always fails, but the code has a
fallback:

```js
"" != o ? (...set deviceName...) : e.setData({ deviceName: "智能杀菌牙刷杯架", ... })
```

That is the basis for standardising the product name as "智能杀菌牙刷杯架" in this repo
(it appears twice in `app-service.js`, and `getdeviceName` in `index.js` has the same fallback).

---

## 4. There is no binding logic

Full-text search of `app-service.js`:

```
绑定 0   解绑 0   authCode 0   createSession 0
speke 0  sessionKey 0  register 0  owner 0  unbind 0
bind 16 ← all of them are bindChange / bindKeyInput / bindViewTap (WXML events)
```

**Control does not depend on binding at all.** The device is identified by MAC address, stored in
local Storage (`deviceId` / `serviceId`); there is no device-list endpoint, so switching phones
means scanning again.

The only "unbind" action lives on the `set` page:

```js
POST /wx_mini/v1/hilinkdevice/reset_device   { mac }   // tell the cloud to drop the record
  → writeBle(deviceId, serviceId, "DB01A0")              // send reset to the device
  → closeBLEConnection
```

There is also `delDevice`, which merely calls `wx.clearStorage()` and closes Bluetooth — purely
local, it never touches the device.

> In other words: unbinding does not lock you out — any BLE host can still control the device.
> Conversely, `DB01A0` may wipe the schedule, but you can simply write it again.

---

## 5. Backend endpoints

Single domain: `https://api.sh-lifefun.cn` (dead, connection fails).

| Endpoint | Purpose |
| --- | --- |
| `/wx_mini/v1/user/get_access_token` | Session token — **the reason the app hangs on the splash** |
| `/wx_mini/v1/user/get_user_info` | Profile |
| `/wx_mini/v1/user/regist_update_user` | Register/update user |
| `/wx_mini/v1/user/uploads_user_mobile_info` | Device telemetry |
| `/wx_mini/v1/hilinkdevice/get_device_config` | Read display name |
| `/wx_mini/v1/hilinkdevice/update_device_config` | Write display name |
| `/wx_mini/v1/hilinkdevice/query_update_soft` | OTA check |
| `/wx_mini/v1/hilinkdevice/mac_version_log` | Version reporting |
| `/wx_mini/v1/hilinkdevice/reset_device` | Unbind |
| `/wx_mini/v1/hilinkdevice/download` | OTA download |
| `/wx_mini/v1/device/get_device_use_log` | Usage log |
| `/wx_mini/v1/device/uploads_device_use_log` | Usage log upload |

**None of them relate to scheduling.** Scheduling is pure local BLE.

---

## 5.1 Firmware update (OTA)

The mini program **contains a complete OTA implementation**, and it speaks Telink's standard OTA
service. It **depends entirely on the now-dead backend**, so it cannot run today — the mechanism
is documented below for the record, and in case a `.bin` ever surfaces.

### 5.1.1 Trigger chain

```
connect -> send DB 04 02 / DB 01 05 / DB 01 07 / DB 01 A4 in sequence
                                            ^ this last one reads the firmware version
   |
   +-> device replies BD 06 A2 <version>
   |
   +-> app requests the backend with that version
       GET /wx_mini/v1/hilinkdevice/query_update_soft
           ?version_now=<ver>&product_code=disinfect_box&soft_type=1
   |
   +-> code == 200 and is_must == 1 -> mandatory-upgrade dialog, keep path / version / notice
       code == 300                  -> already up to date
   |
   +-> GET /wx_mini/v1/hilinkdevice/download?path=<path>   (downloads the .bin)
   |
   +-> connect to the OTA service and stream chunks
```

Note `product_code` is hard-coded to **`disinfect_box`** and `soft_type` to `1` — the firmware is
managed under a "disinfection box" product category in the vendor backend.

### 5.1.2 Version parsing

```js
var s = Number(buf2hex(value).substring(15,16) + buf2hex(value).substring(17,18));
```

That is: take the **high nibble of hex byte 2** (`15..16`) and the **low nibble of hex byte 4**
(`17..18`) and concatenate them. The observed `...000014` yields **14**.

> ⚠️ The previously documented sample `BD06A2` + `"000014"` is only 6 bytes — **too short**
> (reaching hex index 18 requires at least 9 bytes). The real reply is longer; its full layout has
> **not been verified**. If you want to implement version reading yourself, dump the whole
> `DB 01 A4` reply first and decide the parsing from that.

### 5.1.3 OTA channel

| Item | Value |
| --- | --- |
| OTA service | `00010203-0405-0607-0809-0A0B0C0D1912` |
| OTA characteristic | **taken at runtime as `characteristics[0].uuid`** |
| Write mode | `write-without-response` |
| Checksum | **CRC16** (Modbus polynomial `0xA001`, init `0xFFFF`) |

> **About `...0A0B0C0D2B12`**: that value **never appears in `app-service.js`**. The app reads
> `characteristics[0].uuid` dynamically, so this specific UUID is a **plausible inference, not a
> verified fact**. Confirming it requires enumerating the service's characteristics on a real
> device. (Likewise the control channel's write characteristic is taken as `characteristics[1].uuid`
> — it just happens to be `1001` in practice.)

### 5.1.4 Chunking and state machine

```js
// 1. split into 16-byte blocks
updata_press = (len % 16 == 0) ? len/16 : floor(len/16) + 1

// 2. build 18 bytes per block: seq(2, little-endian) + data(16, 0xFF-padded)
//    then CRC16 the 18 bytes; store the result as a hex string in otaArr

// 3. ReadyOTA: send 01 FF first (handshake / enter OTA mode)
//    -> on success record OTAtime, proceed to StartOTA

// 4. StartOTA: setInterval, one block every 15 ms
//    updata_buff_cnt++ after each block
//    on failure: if BleCon is still up, retry (a--, resend); otherwise fail the whole upgrade

// 5. after the last block, send an 8-byte trailer:
//    [0]=02 [1]=FF [2..3]=updata_press (LE) [4..5]=~updata_press (LE) [6..7]=00 00
//    + CRC16
```

Key points:

- **CRC16 is computed over the frame content and appended as a hex string** (not raw bytes), so
  the length varies — very different from the control channel, which has no checksum at all;
- block interval is **15 ms**, deliberately conservative;
- the app **closes the control connection first** (`t.close()`), then waits 2 s before streaming.

### 5.1.5 Can it still be updated?

**Basically no.** `api.sh-lifefun.cn` is completely gone:

```
DNS:  api.sh-lifefun.cn -> 182.92.167.52   (record still present)
443:  connection timed out
 80:  connection timed out
```

So:

| Step | Status |
| --- | --- |
| Check for a new version | ❌ needs the backend |
| Download firmware | ❌ needs the backend |
| Flash manually | ⚠️ protocol known, but **no firmware file**, and the OTA characteristic is unconfirmed |

**In theory**, given a `.bin` you could hand-flash it using 5.1.4. But the risk is high (a bad
write bricks the unit, with no factory image to roll back), so **do not attempt this without an
original firmware file**.

> Aside: to capture the raw `BD 06 A2` reply, just run
> `python3 tools/set_timer.py --version` (sends `DB 01 A4` and parses the version).
> The full reply hex is printed to the log so you can verify the `[15:16]+[17:18]` indices.

---

## 5.2 Usage history: cloud-only, permanently lost

This was missed earlier but matters a fair bit — **the data behind the `history` page never
lives on the device**.

`getLogData` in `history.js`:

```js
var e = {
  rd_session: wx.getStorageSync("session"),
  mac:        wx.getStorageSync("deviceId"),
  log_type:   a.data.idx,            // 1=day  2=week  3=month
  date_value: a.data.dDeviation       // offset from today, 0=today, -1=yesterday
};
t.Get("/wx_mini/v1/device/get_device_use_log", e, function (t) {
  // sum every record's "continuous" field to get the accumulated total
  for (var e = 0, i = 0; i < t.data.list.length; i++) e += t.data.list[i].continuous;
  ...
})
```

The device side **streams** its log up, and the app immediately forwards it to the server:

| Direction | Endpoint | Trigger |
| --- | --- | --- |
| device → app | `BD 08 05` / `BD 08 06` pushed one at a time after `DB 01 05` | every connection |
| app → server | `/wx_mini/v1/device/uploads_device_use_log` | after each record (`syncLogData`) |
| server → app | `/wx_mini/v1/device/get_device_use_log` | opening the `history` page |
| app → device | `DB 06 06 01` + timestamp | ACK per record; the device waits for it |

Server-side record shape (reverse-engineered from `toDayList`):

```
start_time   like "MM/DD HH:MM" — not a standard date format (toDate splits on "/")
continuous   duration in seconds
action_type  action type
```

**With the server gone, this chain is dead.** Consequences:

1. New sessions are **no longer recorded** — the device's log is a ring buffer that overwrites
   itself once full;
2. The history charts (day/week/month) are **permanently unavailable**;
3. `tools/set_timer.py --log` can still **read the records out of the device on the spot**,
   but there's nowhere to store them and no chart UI.

> If you want an archive, the only option today is to run `--log` periodically and save the
> output as text. How many records the device holds and when it wraps isn't visible in
> `app-service.js` — it needs measurement.

One notable detail in `syncLogData`: on upload failure it **automatically calls `wx.login`
for a fresh session and retries**, which tells you `rd_session` expires — and that in turn
explains why the `init` page fetches a new session on every launch.

---

## 6. Why the name says `Hi-`

The GAP name is `Hi-YM01-XXXXXXXXXXXX`. The `Hi-` prefix plus `YM01` is the HiLink-platform naming
used by the sibling white-label units (婴觅 / 得途), and the GATT does expose the Huawei HiLink
service template:

```
00010203-0405-0607-0809-0a0b0c0d1912   (OTA service; char UUID resolved at runtime)
000000fb-0000-1000-8000-00805f9b34fb   (1001/1002, the actual control channel)
```

But the vendor **never used HiLink's JSON + SPEKE encrypted protocol**. Instead they shipped a
plaintext hex frame format on the module's vendor channel. That also explains the missing HiLink
beacon in the advertising payload — the device never went through Huawei's onboarding.

> Lesson: seeing HiLink services in a GATT table does not mean the device speaks HiLink.

---

## 7. Vendor support contacts (from the `problem` page)

The first entry in `problemList` (`pages/problem/problem.js`) is the contact info, copied verbatim:

```
WeChat: laifeng-sh
Phone:  400-009-8685
Phone support hours: 9:00–18:00 (CST)
```

The other four FAQ entries:

| Question | Vendor answer |
| --- | --- |
| Schedule setting fails? | Gaps between sessions must be ≥ 1 hour; at most four, at least one. |
| Slow or failing connections? | Clear WeChat and the mini program from the background, then restart Bluetooth and location. |
| Firmware update failed? | Keep the phone close to the device and stay connected during the update. |
| Still can't connect with Bluetooth and location on? | Make sure WeChat has location and Bluetooth permission. |

**Note:** the brand's official WeChat account has been dormant for a long time, but this 400
number and WeChat ID come from the 2022 bundle, so availability needs testing. If you can reach
them, the two things worth asking are:

1. Whether any firmware file still exists (for a theoretical manual flash);
2. Whether a newer mini-program bundle exists — even a bare `.wxapkg` would be worth another pass.

---

## 8. Everything this device can actually do

Exhaustive result after enumerating every `DB`-prefixed command across all 23 modules — this is
the **complete** set of things the vendor app could do:

| Capability | Command | Implemented here | Notes |
| --- | --- | --- | --- |
| Time sync | `DB 04 02` + unix seconds (4B) | ✅ | Sent on every connection; prerequisite for everything |
| Query state | `DB 04 02` + timestamp | ✅ | Replies `BD 0B 02` / `BD 0E 02` with battery and next run |
| Start | `DB 02 04 01` | ✅ | |
| Stop | `DB 02 04 00` | ✅ | |
| Read schedules | `DB 01 07` | ✅ | Replies `BD 0D 07` |
| Write schedules | `DB 08 08` + count + whole table | ✅ | Both create and edit rewrite the whole table |
| Delete schedule | `DB 00 08` + remaining count + kept entries | ✅ | |
| Read log | `DB 01 05` | ✅ | Streams `BD 08 05`/`BD 08 06` |
| Log ACK | `DB 06 06 01` + timestamp | ✅ | Device won't send the next record without it |
| Read firmware version | `DB 01 A4` | ✅ | Replies `BD 06 A2` |
| Device reset | `DB 01 A0` | ⚠️ **not implemented, and shouldn't be** | Sent on unbind; may wipe the schedule |
| Low battery warning | (device pushes `BD 05 A1`) | ⚠️ unhandled | Vendor app blocks start and asks for a battery change |
| Firmware update | OTA channel + Telink protocol | ❌ | Backend is gone, see §5.1 |
| Rename device | cloud endpoint, **never touches the device** | ❌ | Backend gone, see §3.7 |
| Usage history | cloud endpoint, **device only caches** | ❌ | Backend gone, see §5.2 |

**Not present:** LED/light control, child lock, scene modes beyond schedules, firmware parameter
tuning, sensitivity adjustment, sound toggle — none of these exist in any of the 23 modules.
The device's entire configurability is **"up to 4 schedules, each = time + 3–6 minute duration"**.
Nothing else.

### 8.1 Good news: the `kHID` state probably isn't a fault

The repo previously said "the advertising name alternates between `QUANGE-WY020702` and `kHID`".
Having read `conble.js`, here's the more accurate version:

- `kHID` is the module's (Telink/YC) **factory-default advertising name**, suggesting the user
  config area was reset or never written;
- But **the `0x1812` service in the advertisement is firmware behaviour** and independent of the
  name — so even when it advertises as `kHID`, the business service `0xFB` is still there and
  functionality is unaffected;
- The vendor app only accepts `QUANGE-WY020702`, so it can't see the device while it's in the
  `kHID` state — **that's the vendor's bug, not a broken device**.

Our `phone.html` and `set_timer.py` accept three prefixes plus the HID service, so they connect
in either state.

---

## 9. How long will this device last?

| Risk | Assessment |
| --- | --- |
| App unusable | ✅ Solved — both the web page and the Python script set schedules |
| Backend gone | ✅ Core control unaffected; only history, rename and OTA are lost |
| Battery | ⚠️ Below threshold it pushes `BD 05 A1` and refuses to start — replace the cells |
| Bricked firmware | ⚠️ No factory image to roll back; don't experiment with OTA |
| UV tube ageing | ⚠️ Mercury or LED tubes have finite life; not readable in software |
| Bluetooth module failure | ❌ No workaround; it becomes an ordinary toothbrush holder |

Bottom line: **the software side has been taken apart completely.** What's left is hardware
wear. Set the schedule you want, then this documentation can be archived.
