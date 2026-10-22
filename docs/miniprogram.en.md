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

## 6. Why the name says `Hi-`

The GAP name is `Hi-YM01-XXXXXXXXXXXX`. The `Hi-` prefix plus `YM01` is the HiLink-platform naming
used by the sibling white-label units (婴觅 / 得途), and the GATT does expose the Huawei HiLink
service template:

```
00010203-0405-0607-0809-0a0b0c0d1912   (char ...2b12, OTA)
000000fb-0000-1000-8000-00805f9b34fb   (1001/1002, the actual control channel)
```

But the vendor **never used HiLink's JSON + SPEKE encrypted protocol**. Instead they shipped a
plaintext hex frame format on the module's vendor channel. That also explains the missing HiLink
beacon in the advertising payload — the device never went through Huawei's onboarding.

> Lesson: seeing HiLink services in a GATT table does not mean the device speaks HiLink.
