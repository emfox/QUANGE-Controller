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

### 3.1 Pages

| Page | Purpose |
| --- | --- |
| `index` | Home: state, countdown, battery, next run |
| `init` | Splash. Requests `get_access_token` first — **hangs forever now that the backend is gone** |
| `conble` | Scan and connect; runs the post-connection sequence |
| `timing` | Schedule list, edit/delete |
| `addtiming` | Create a schedule (time + 3–6 min) |
| `edittiming` | Edit an existing schedule |
| `history` | Usage history (local `logDataList`) |
| `set` | Rename device, unbind/remove device |
| `deviceInfo` | Version, OTA entry |
| `problem` / `logs` / `test` | Help, boot log, self-test |

### 3.2 Key code locations (`app-service.js`)

| Feature | Marker |
| --- | --- |
| Scan/connect | `createBLEConnection`, `getBLEDeviceServices` |
| Write command | `writeBle(`, characteristic `00001001-0000-1000-8000-00805F9B34FB` |
| Receive reply | `onBLECharacteristicValueChange` |
| Add schedule | `"DB08080"+t.data.len+t.data.listvalue+e+n+o` |
| Edit schedule | `"DB08080"+(this.data.listLen+1)+a.join("")` |
| Delete schedule | `"DB00080"+this.data.listLen+a.join("")` |
| Power on/off | `"DB020401"` / `"DB020400"` |
| State query | `"DB0402"+(e/1e3).toString(16)` |
| Reply dispatch | the `if("bd0d07"==a)` chain over `resStr` |
| Unbind | `reset_device` → `writeBle("DB01A0")` |
| OTA | `query_update_soft` + `CRC16S` chunking |

Frame construction, verbatim (`addtime.js`):

```js
l = "0" + Number(t.data.timing).toString(16);           // duration 3~6 → "03".."06"
e = Number(t.data.value[0]) < 16 ? "0" + ... : ...;      // hour
n = Number(t.data.value[1]) < 16 ? "0" + ... : ...;      // minute
o = l;
var s = "DB08080" + t.data.len + t.data.listvalue + e + n + o;
```

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

> Aside: to capture the raw `DB 06 A2` reply, note that `python3 tools/set_timer.py --query` dumps
> every reply to the log, but the version frame needs `DB 01 A4`, which the script does not send
> yet — you can add one line temporarily.

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
