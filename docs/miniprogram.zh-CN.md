# 「莱枫智能生活」小程序结构与取包方法

厂商小程序 appid：`wx9528fce803d3ba0e`，本文分析的是第 **18** 版包。

---

## 1. 如何把包取出来

### 1.1 手机端已经取不到了

微信 8.x 把小程序的包挪进了**应用私有目录**（`/data/data/com.tencent.mm/...`），
需要 root 才能读。`/sdcard/Android/data/com.tencent.mm/MicroMsg/<hash>/appbrand/` 下
通常已经没有 `*.wxapkg`，全盘搜 `wxapkg` 也搜不到。

### 1.2 走电脑版微信（推荐）

小程序包在 PC 端会被下载到磁盘，路径可读：

```
%APPDATA%\Tencent\xwechat\radium\users\<32位hash>\applet\packages\<appid>\<版本>\__APP__.wxapkg
```

本次实际路径：

```
C:\Users\<user>\AppData\Roaming\Tencent\xwechat\radium\users\<hash>\
    applet\packages\wx9528fce803d3ba0e\18\__APP__.wxapkg
```

**操作步骤**

1. 手机微信 → 发现 → 小程序 → 找到「莱枫智能生活」→ 右上角「···」→ 转发给「文件传输助手」；
2. 电脑微信打开「文件传输助手」，点那张卡片；
3. 等它加载到出现 LOGO（**卡住也没关系，包已经落盘了**）；
4. 去上面的路径找 `__APP__.wxapkg`。

> 判断包是否完整：能显示 LOGO 说明前端资源齐全，因为 LOGO 是打包在包里的，
> 不是从网络拉的（服务器已死，拉不到图）。

旧版微信（3.x）的路径是 `Documents\WeChat Files\Applet\<appid>\<版本>\`，
但新版微信已不再写入这里。

---

## 2. 包格式：`V1MMWX`（微信 4.x 新容器）

老格式以 `0xBE` 开头，新版换了容器：

```
偏移 0..6    魔数 ASCII "V1MMWX"
偏移 6..     整段数据，单字节 XOR 0x30
```

**包本身是加密的** —— 腾讯给的容器加了层 XOR 混淆，所以拿到 `.wxapkg` 不能直接当 zip 解，
必须先按上面的规则解一遍。但注意：**加密的只有包，设备协议是明文**（见
[protocol.zh-CN.md](protocol.zh-CN.md)），这两件事别混。

判定依据：直接看信息熵。未解密时约 **6.64**（AES 密文会接近 8.0），
且存在大量可打印字符的重复模式 —— 典型的重复密钥 XOR。

解密后结构（与老 wxapkg 类似，但**没有 `0xBE` 魔数头，也没有可信的 indexInfoLength**，
所以索引区位置只能靠扫描定位）：

```
解码后缓冲区（本例 407840 字节 = 原 407846 − 6）：

    偏移 0 .. 1046      其他内容（约 1KB，不是索引）
    偏移 1047 .. 1758    索引区：
                          [4B 名称长度][路径 UTF-8][4B 偏移][4B 大小] × 19
    偏移 1759 .. …      其他块（本例紧跟一段以 PNG 魔数 89 50 4E 47 开头的数据）
    偏移 90088 ..        各文件的实际内容（含 /app-service.js）
```

**关键差异：偏移是相对整个缓冲区的绝对值**，不是相对数据区起点。
所以取文件时直接 `buf[offset : offset+size]`，不要去加减任何基址。

实测校验：19 项的偏移首尾相接（`90088+147606 = 237694` → … → 最后一项结束于 407839），
且 `buf[90088:90088+147606]` 与仓库里的 `miniprogram/app-service.js` **逐字节一致**。

> 索引区起点 1047 只对这一个包成立。`tools/wxapkg_unpack.py` 的做法是
> 扫描整个缓冲区、找最长的连续索引项序列，因此换版本也能解。

### 本题包的文件清单（19 项）

| 偏移 | 大小 | 路径 |
| --- | --- | --- |
| 90088 | 147606 | `/app-service.js` ← **全部业务逻辑** |
| 237694 | 469 | `/component/blepop/blepop.html` |
| 238163 | 477 | `/component/inputPop/inputPop.html` |
| 238640 | 469 | `/component/navbar/navbar.html` |
| 239109 | 465 | `/component/popup/popup.html` |
| 239574 | 473 | `/component/timepop/timepop.html` ← 时间选择器 |
| 240047 | 469 | `/pages/addtiming/addtime.html` ← **新建定时** |
| 240516 | 461 | `/pages/conble/conble.html` ← **连接蓝牙** |
| 240977 | 477 | `/pages/deviceInfo/deviceInfo.html` |
| 241454 | 477 | `/pages/edittiming/edittiming.html` ← 编辑定时 |
| 241931 | 465 | `/pages/history/history.html` |
| 242396 | 457 | `/pages/index/index.html` ← 主页 |
| 242853 | 453 | `/pages/init/init.html` ← 启动页（卡 LOGO 的地方） |
| 243306 | 453 | `/pages/logs/logs.html` |
| 243759 | 465 | `/pages/problem/problem.html` |
| 244224 | 449 | `/pages/set/set.html` ← 设置（改名 / 解绑） |
| 244673 | 453 | `/pages/test/test.html` |
| 245126 | 461 | `/pages/timing/timing.html` ← **定时列表** |
| 245587 | 162252 | `/page-frame.html` ← WebView 渲染框架 |

### 解包

仓库里的 `tools/wxapkg_unpack.py` 能处理老格式（`0xBE`）、PC 加密格式
（`--appid`）以及本文的 `V1MMWX` 结构，纯本地、无第三方依赖，并支持按关键字检索：

```bash
# 自检（造假包再解回来，验证三种格式的解析都正确）
python3 tools/wxapkg_unpack.py --selftest

# 列出仓库自带的小程序包里的 19 个文件
python3 tools/wxapkg_unpack.py -f miniprogram/QUANGE-WY020702__APP__.wxapkg --list

# 解包并搜索关键字（会输出到 tools/unpacked/）
python3 tools/wxapkg_unpack.py -f miniprogram/QUANGE-WY020702__APP__.wxapkg --grep 2b12 DB0402

# 万一定位不到索引区，直接把解码后的整段缓冲当一个大文件搜
python3 tools/wxapkg_unpack.py -f miniprogram/QUANGE-WY020702__APP__.wxapkg --raw --grep DB0808
```

实测：仓库自带的包（407,846 字节）会被识别为 `V1MMWX`，0.2 秒内解出 19 个文件，
其中 `app-service.js` 与 `miniprogram/app-service.js` 逐字节一致。

---

## 3. 小程序结构

### 3.1 页面职责

共 13 个页面 + 5 个组件，全部逻辑都在 `app-service.js` 里。

| 页面 | 作用 |
| --- | --- |
| `index` | 主页，显示状态、倒计时、电量、下次消杀时间，**全部 BLE 收包处理都在这里** |
| `init` | 启动页，串行跑 `get_3rd_session` → `get_user_info`，**服务器挂了所以永远卡在这里** |
| `conble` | 扫描并连接设备（按 HID 服务 `0x1812` 扫，见 §3.3） |
| `timing` | 定时列表，可编辑/删除 |
| `addtiming` | 新建定时（时间 + 3~6 分钟时长） |
| `edittiming` | 编辑/删除已有定时 |
| `history` | 消杀历史 —— 数据在**服务器**，见 §5.2 |
| `set` | 设备名修改、解绑/删除设备 |
| `deviceInfo` | 展示缓存里的版本号（`Version`），只读 |
| `problem` | 常见问题 + **客服联系方式**（见 §7） |
| `logs` / `test` | 启动时间戳日志 / 原厂开发者调试页（见 §3.4） |

组件 `blepop` / `inputPop` / `navbar` / `popup` / `timepop` 都是纯 UI 弹窗壳子，
其中 `timepop` 内写死时长候选 `[3,4,5,6,7,8,9,10]`，`addtime` 与 `edittiming` 又各自
限定成 `[3,4,5,6]` —— 实际只能选 **3~6 分钟**。

### 3.2 关键代码位置（`app-service.js`）

| 功能 | 特征串 |
| --- | --- |
| 扫描连接 | `createBLEConnection`、`getBLEDeviceServices` |
| 写指令 | `writeBle(`，特征值 `00001001-0000-1000-8000-00805F9B34FB` |
| 收回包 | `onBLECharacteristicValueChange` |
| 新建定时 | `"DB08080"+t.data.len+t.data.listvalue+e+n+o` |
| 编辑定时 | `"DB08080"+(this.data.listLen+1)+a.join("")` |
| 删除定时 | `"DB00080"+this.data.listLen+a.join("")` |
| 开关 | `"DB020401"` / `"DB020400"` |
| 状态查询 | `"DB0402"+(e/1e3).toString(16)` |
| 回包分派 | 判断 `resStr` 前缀的 `if("bd0d07"==a)` 链 |
| 解绑 | `reset_device` → `writeBle("DB01A0")` |
| OTA | `query_update_soft` + `CRC16S` 分包 |

定时帧的拼装原文（`addtime.js`）：

```js
l = "0" + Number(t.data.timing).toString(16);          // 时长 3~6 → "03".."06"
e = Number(t.data.value[0]) < 16 ? "0" + ... : ...;     // 小时
n = Number(t.data.value[1]) < 16 ? "0" + ... : ...;     // 分钟
o = l;
var s = "DB08080" + t.data.len + t.data.listvalue + e + n + o;
```

注意 `"DB08080"` 这个字符串只有 7 个十六进制字符，末位 `0` 与 `len` 拼成同一个字节 ——
`len=2` 时得到 `DB 08 08 02 …`，即"低半字节写条数"。`edittiming.js` 的写法
`"DB08080"+(listLen+1)+a.join("")` 完全一致，**没有"追加"和"整表覆盖"两种帧，
永远是把整张表重写一遍**。

### 3.3 扫描用的是 HID 服务，不是业务服务

`conble.js` 里的原文：

```js
wx.startBluetoothDevicesDiscovery({
  services: ["00001812-0000-1000-8000-00805F9B34FB"],   // HID，不是 0xFB
  success: function (t) {
    setTimeout(function () { o.stopBluetoothDevicesDiscovery() }, 60000)   // 60 秒超时
    setTimeout(function () { e.getBluetoothDevices(), e.onBluetoothDeviceFound() }, 2000)
  }
})
```

这里有两个反直觉的点：

1. **按 `0x1812`（HID 服务）过滤，而不是它自己用的 `0xFB`** —— 说明设备的广播包里
   一定带 `0x1812`，而 `0xFB` 只在连接后才出现。这也解释了 §6 里 `kHID` 这个名字的由来：
   设备出厂固件是当 HID 设备（自拍器/键盘类）做的，改造成杀菌盒时没改广播配置。
2. **广播名过滤写死成 `"QUANGE-WY020702"`**，`getBluetoothDevices` 和
   `onBluetoothDeviceFound` 两处都是：

   ```js
   "QUANGE-WY020702" == t.devices[a].localName && e.setData({ list: ... })
   ```

   **原厂小程序不认 `kHID`，也不认 `Hi-`。** 一旦设备改名或退化成模块默认名，
   原厂 App 就再也扫不到了 —— 这大概率就是很多人"小程序搜不到设备"的原因。

iOS 还走一条特殊分支：从广播包里抠 MAC。

```js
"iOS" == e.data.system && (
  t.devices[o].IosdeviceId = e.jiequ(e.ab2hex(t.devices[o].advertisData), 2)
)
```

即把 `advertisData` 转成 hex、按 2 字节切开、再用 `:` 连起来 —— 也就是
**Manufacturer Data 的前 6 字节就是 MAC**（与 §附录里的广播结构一致）。
Android 直接用系统的 `deviceId`（本身就是 MAC），iOS 因为系统不给 MAC 才要自己解析。

扫描结果按 RSSI 排序后再展示。扫描失败会上报 `uploads_user_mobile_info`
（带 `locationEnabled` / `bluetoothEnabled`），是原厂的排障埋点。

### 3.4 `test` 页是原厂开发者调试页

`pages/test/test.js` 没有被任何页面链接，但代码完整保留在包里，且**硬编码了
开发者自己的设备 MAC**：

```js
deviceId: "AE:C1:38:6E:5F:13"       // 出现 2 次，写死在 notify 和 writeBle 里
```

它提供的能力：

| 方法 | 行为 |
| --- | --- |
| `getState` | 发 `"DB0402" + (Date.now()/1000).toString(16)` —— 对时 + 查状态 |
| `startKill` | 发 `DB020401` —— 直接启动杀菌 |
| `stopKill` | 发 `DB020400` —— 直接停止 |
| `EditKill` | 把输入框里的**任意 hex 原样发出去** |

也就是说，只要你能跑起这个页面（改一下 `deviceId`），就有一个现成的任意指令发送器。
不过我们的 `phone.html` 和 `tools/set_timer.py` 已经覆盖了这些能力，且不写死 MAC。

### 3.5 收包分派链（`index.js` 的 `notify`）

`notify` 里注册的 `onBLECharacteristicValueChange` 是整个 App 唯一处理设备回包的地方，
分派方式是**取前 6 个 hex 字符做精确等值比较**：

```js
var a = t.buf2hex(i.value).substring(0, 6);
if ("bd06a2" == a) { ... }          // 固件版本 → 触发 OTA 检查
else if ("bd0e02" == a) { ... }     // 状态（带额外字段）
else if ("bd0805" == a || "bd0806" == a) { ... }   // 一条日志记录
else if ("bd0705" == a) { ... }     // 日志流结束标记
else if ("bd1102" == a || "bd0002" == a || "bd0202" == a) { ... }  // 开关回包
else if ("bd0b02" == a) { ... }     // 状态（查询用）
else if ("bd0d07" == a) { ... }     // 定时列表
else if ("bd0d08" == a) { ... }     // 定时写入成功，2 秒后返回上一页
else if ("bd05a1" == a) { t.setData({ DLwran: !0 }) }  // 低电量警告
```

`bd0e02` 和 `bd0b02` 的处理逻辑**逐行重复**，是复制粘贴留下的。两者都不做长度校验，
直接读 `substring(18,26)` 当"下次消杀时间戳"—— 这就是 §5.1 那个"会读出 1970 年"的坑。

一个容易忽略的细节：`bd0805`/`bd0806` 分支里，只有 `action_type` 为 `00` 或 `01`
**且** 起始时间戳不是 `ffffffff` 时才写本地日志并向设备回 ACK：

```js
var p = "DB060601" + t.data.resStr.substring(6,14);   // ACK，原样回带时间戳
t.writeBle(t.data.deviceId, t.data.serviceId, p);
```

而当 `g=="00"` 且时间戳恰好是 `ffffffff` 时，转去 `syncLogData()` ——
**这就是"日志读完了"的判定条件**：空槽位的 `FF FF FF FF` 时间戳。

`bd0705` 分支则对 `continuous != 0` 的记录补一条，然后立刻 `syncLogData()`，
说明它是"最后一条/汇总"帧。

### 3.6 原厂代码里的 bug（都会影响真实使用）

读全部 23 个模块后确认的问题，按严重程度排：

| # | 位置 | 问题 | 后果 |
| --- | --- | --- | --- |
| 1 | `addtime.js` `saveTiming` | 校验循环里 `for` 内先 `setData({isAdd:!0})`，但 `break` 时不重置；单条定时分支 `a[0].min+59<r\|\|a[0].min>r+59` 的运算符优先级写反，实际判定是 `(a+59 < r) \|\| (a > r+59)` 恒等于"相差超过 59 分钟"，**恰好 59 分钟边界放行、60 分钟也放行**，但"新建时间早于已有时间"时会误判 | 边界情况能存进去，但和 FAQ 说的"间隔不小于 1 小时"不完全一致 |
| 2 | `addtime.js` `saveTiming` | `1380` 检查写成 `r - a[0].min <= 1380`，**只对第一条已存在定时比**，不是整表跨度 | 3~4 条定时可能整体跨度超 23 小时 |
| 3 | `edittiming.js` `preData` | 拼 `r` 数组时跳过 `l != n`，之后却用 `r[0].min` 当基准 —— `r[0]` 不一定是时间最早的那条 | 跨度校验基准错位 |
| 4 | `edittiming.js` `preData` | `a = Number(a).toString(16)` 不补零，`timing` 若是 `0x0a` 会得到 `"a"` 单字符，与后面 `"0"+t` 的写法不一致 | 理论上时长 ≥10 分钟会发出错帧（UI 限 3~6，实际触发不到） |
| 5 | `index.js` `SendBlePkg` | `for (e = 0; e <= updata_press; e++)` 用了 `<=`，而 `updata_press` 已是块数（ceiling），**会多发一包全 `FF` 的块** | OTA 帧数比实际文件多 1；若设备严格校验可能失败 |
| 6 | `index.js` `SendBlePkg` | `e % 256` / `e / 256` 未取整，`parseInt` 兜住但语义模糊 | 大固件（> 256 块 = 4KB）后 seq 计算依赖 JS 隐式转换 |
| 7 | `index.js` `StartOTA` | 结束帧 `d = new Uint8Array(8)` 只赋了 `[0]..[5]`，`[6][7]` 保持 0 —— 注释写的是 "8 字节 + CRC16"，实际是 6 字节有效 + 2 字节零 | 与文档描述一致，但"`[6..7]=00 00`"是默认值而非显式写 |
| 8 | `index.js` `upVal` 进度 | `Math.round(updata_press/100)*upVal <= cnt` 这个表达式恒真/恒假取决于量级，进度条基本不动 | 纯 UI，不影响功能 |
| 9 | `conble.js` | 广播名写死 `QUANGE-WY020702`，不认 `kHID` / `Hi-`（见 §3.3） | 设备改名后原厂 App 扫不到 |
| 10 | `test.js` | 硬编码开发者 MAC `AE:C1:38:6E:5F:13` | 该页面对任何其他设备都无效 |

这些问题我们的 `phone.html` 和 `tools/set_timer.py` **都已经避开**：
校验改用与 FAQ 一致的"最小间隔 59 分钟 + 首个定时起 23 小时跨度"，
帧拼装全部走显式字节数组，不依赖字符串拼接。

### 3.7 设备名是服务器存的，不是设备里的

`set.js` 的 `getName` / `_confirmInput` 全部走云端：

```js
GET /wx_mini/v1/hilinkdevice/get_device_config?mac=...    → device_name
GET /wx_mini/v1/hilinkdevice/update_device_config?mac=...&name=...
```

设备名只存在服务器和本地 Storage（`deviceName`），**从来不写给设备**。
服务器没了以后，`getName` 永远失败，但代码里有个兜底：

```js
"" != o ? (...set deviceName...) : e.setData({ deviceName: "智能杀菌牙刷杯架", ... })
```

这就是仓库里产品名统一成"智能杀菌牙刷杯架"的依据（`app-service.js` 里出现 2 次，
`index.js` 的 `getdeviceName` 里也有同样的兜底）。

---

## 4. 没有绑定逻辑

全文检索 `app-service.js`：

```
绑定 0   解绑 0   authCode 0   createSession 0
speke 0  sessionKey 0  register 0  owner 0  unbind 0
bind 16 ← 全部是 bindChange / bindKeyInput / bindViewTap（WXML 事件）
```

**控制链路完全不依赖绑定。** 设备身份就是一个 MAC 地址，存在手机本地 Storage
（`deviceId` / `serviceId`），没有"设备列表"接口，换手机要重新扫描。

唯一的"解绑"动作在 `set` 页：

```js
POST /wx_mini/v1/hilinkdevice/reset_device   { mac }   // 通知云端删记录
  → writeBle(deviceId, serviceId, "DB01A0")              // 发复位指令给设备
  → closeBLEConnection
```

另有一个 `delDevice`，只是 `wx.clearStorage()` + 关蓝牙，纯本地删除，不碰设备。

> 也就是说：即使"解绑"了，设备依然能被任何蓝牙主机控制；
> 反过来，`DB01A0` 复位可能清掉定时列表，但清掉后重新写一次即可。

---

## 5. 服务端接口清单

域名只有一个：`https://api.sh-lifefun.cn`（已失效，连接不上）。

| 接口 | 用途 |
| --- | --- |
| `/wx_mini/v1/user/get_access_token` | 登录态 —— **卡 LOGO 的元凶** |
| `/wx_mini/v1/user/get_user_info` | 用户信息 |
| `/wx_mini/v1/user/regist_update_user` | 注册/更新用户 |
| `/wx_mini/v1/user/uploads_user_mobile_info` | 机型信息上报 |
| `/wx_mini/v1/hilinkdevice/get_device_config` | 读设备显示名 |
| `/wx_mini/v1/hilinkdevice/update_device_config` | 改设备显示名 |
| `/wx_mini/v1/hilinkdevice/query_update_soft` | OTA 检查 |
| `/wx_mini/v1/hilinkdevice/mac_version_log` | 版本上报 |
| `/wx_mini/v1/hilinkdevice/reset_device` | 解绑 |
| `/wx_mini/v1/hilinkdevice/download` | OTA 固件下载 |
| `/wx_mini/v1/device/get_device_use_log` | 使用日志 |
| `/wx_mini/v1/device/uploads_device_use_log` | 使用日志上报 |

**没有任何一个接口与定时有关。** 定时完全是本地蓝牙直写。

---

## 5.1 固件更新（OTA）

小程序**有完整的 OTA 实现**，而且是 Telink 系标准的 OTA 服务。但它**强依赖已下线的服务器**，
所以今天跑不起来 —— 下面把机制记全，一是备查，二是万一以后能拿到 `.bin` 固件，可以直接手写。

### 5.1.1 触发链路

```
连上设备 → 依次发 DB 04 02 / DB 01 05 / DB 01 07 / DB 01 A4
                                        ↑ 最后这条才是"读固件版本"
   ↓
设备回 BD 06 A2 <版本号>
   ↓
小程序解析版本号 → 带版本号请求服务器
   GET /wx_mini/v1/hilinkdevice/query_update_soft
       ?version_now=<版本号>&product_code=disinfect_box&soft_type=1
   ↓
code == 200 且 is_must == 1 → 弹"必须升级"，记下 path / version / notice
code == 300 → 已是最新
   ↓
GET /wx_mini/v1/hilinkdevice/download?path=<path>   ← 下载固件 .bin
   ↓
连 OTA 服务，开始分包写入
```

注意 `product_code` 写死是 **`disinfect_box`**（消毒盒），`soft_type` 写死 `1` —— 说明这套固件
在厂商后台是按"消毒盒"这个产品品类管理的。

### 5.1.2 版本号怎么解析

```js
var s = Number(buf2hex(value).substring(15,16) + buf2hex(value).substring(17,18));
```

即：取 **hex 第 2 个字节的高位 nibble**（`15..16`）和 **第 4 个字节的低位 nibble**（`17..18`）
拼成十进制数。实测 `...000014` 得到 **14**。

> ⚠️ 这里文档过去的样本 `BD06A2` + `"000014"` 只有 6 字节，**不够长**（要读到 hex 第 18 位
> 至少要 9 字节）。真实回包比这个样本长，具体布局**未完整核实**，只能说这个下标能读出 14。
> 想自己实现版本读取的话，建议先把 `DB 01 A4` 的原始回包完整打印出来再定解析。

### 5.1.3 OTA 通道

| 项 | 值 |
| --- | --- |
| OTA 服务 | `00010203-0405-0607-0809-0A0B0C0D1912` |
| OTA 特征值 | **运行时取 `characteristics[0].uuid`** |
| 写入方式 | `write-without-response` |
| 校验 | **CRC16**（Modbus 多项式 `0xA001`，初值 `0xFFFF`） |

> **关于 `...0A0B0C0D2B12`**：这个值在 `app-service.js` 里**一次都没出现**。
> 小程序取的是 `characteristics[0].uuid`（动态），所以这个具体 UUID 属于
> **合理推断但未经证实**。要确认只能真机枚举该服务下的特征值。
> （同理，业务通道的写特征值也是动态取的 `characteristics[1].uuid`，
> 只是实测确实是 `1001`。）

### 5.1.4 分包与状态机

```js
// 1. 按 16 字节切块
updata_press = (len % 16 == 0) ? len/16 : floor(len/16) + 1

// 2. 每块组 18 字节：seq(2, 小端) + data(16，不足补 0xFF)
//    然后对 18 字节算 CRC16，结果拼成 hex 字符串存进 otaArr

// 3. ReadyOTA：先发 01 FF（握手/进入 OTA 模式）
//    → 成功后记 OTAtime，进 StartOTA

// 4. StartOTA：setInterval 每 15ms 发一块
//    每块发完 updata_buff_cnt++
//    遇到 fail：若 BleCon 还在就重试（a--，退回重发），否则整个升级失败

// 5. 全部发完后发结束帧（8 字节）：
//    [0]=02 [1]=FF [2..3]=updata_press(小端) [4..5]=~updata_press(小端) [6..7]=00 00
//    + CRC16
```

要点：

- **CRC16 是对"帧内容"算的，结果以 hex 字符串形式追加在后面**（不是原始字节），
  长度不固定 —— 这点跟业务通道"无校验"的风格完全不同；
- 分包间隔 **15 ms**，属于比较保守的节奏；
- 写入过程中**要先 `close()` 断掉业务连接**，再走 OTA（`t.close()` 后延迟 2 秒才开始发）。

### 5.1.5 现在还能不能升级

**基本不能。** 实测 `api.sh-lifefun.cn` 已完全下线：

```
DNS:  api.sh-lifefun.cn → 182.92.167.52   （记录还在）
443:  连接超时
 80:  连接超时
```

所以：

| 条件 | 现状 |
| --- | --- |
| 检查有无新版本 | ❌ 需要服务器 |
| 下载固件 | ❌ 需要服务器 |
| 手动刷入 | ⚠️ 协议已知，但**没有固件文件**，且需先确认 OTA 特征值 |

**理论上**，只要能拿到一个 `.bin`，按 5.1.4 的分包规则是可以手写刷入的。
但风险很高（写坏即变砖，且没有原厂固件可回滚），**不建议在没有原厂固件的前提下尝试**。

> 顺带：想看 `BD 06 A2` 的原始回包，直接跑
> `python3 tools/set_timer.py --version`（发 `DB 01 A4` 并解析版本号）。
> 完整回包 hex 会打在日志里，方便核对 `[15:16]+[17:18]` 这个取值下标。

---

## 5.2 消杀历史记录：全部在云端，已永久丢失

这一点之前漏了，但影响不小 —— **`history` 页的数据完全不在设备里**。

`history.js` 的 `getLogData`：

```js
var e = {
  rd_session: wx.getStorageSync("session"),
  mac:        wx.getStorageSync("deviceId"),
  log_type:   a.data.idx,           // 1=日  2=周  3=月
  date_value: a.data.dDeviation      // 相对今天的偏移，0=今天，-1=昨天
};
t.Get("/wx_mini/v1/device/get_device_use_log", e, function (t) {
  // 累加每条记录的 continuous 字段得到"累计消杀"
  for (var e = 0, i = 0; i < t.data.list.length; i++) e += t.data.list[i].continuous;
  ...
})
```

设备侧的日志是**流式推上来的**，App 收到后立刻转存服务器：

| 方向 | 接口 | 触发时机 |
| --- | --- | --- |
| 设备 → App | `DB 01 05` 后有 `BD 08 05` / `BD 08 06` 逐条推 | 每次连上设备 |
| App → 服务器 | `/wx_mini/v1/device/uploads_device_use_log` | 每收完一条（`syncLogData`） |
| 服务器 → App | `/wx_mini/v1/device/get_device_use_log` | 打开 `history` 页 |
| App → 设备 | `DB 06 06 01` + 时间戳 | 每条日志的 ACK，设备收到才会发下一条 |

服务器记录的字段结构（从 `toDayList` 反推）：

```
start_time   形如 "MM/DD HH:MM"，注意不是标准日期格式（toDate 用 split("/") 解析）
continuous   持续秒数（整数）
action_type  动作类型
```

**服务器下线后，这条链路彻底断了。** 后果：

1. 新的消杀记录**不会再被保存** —— 设备内存里的记录是环形缓冲，写满就覆盖；
2. 历史曲线（日/周/月三个视图）**永久不可用**；
3. 用 `tools/set_timer.py --log` 仍然可以**当场把设备里的记录读出来**，
   只是读出来的东西没法再存到云上，也没有现成的图形界面。

> 如果你确实想留档，目前唯一办法是定期跑一次 `--log` 把输出存成文本。
> 设备里大概能存多少条、什么时候覆盖，`app-service.js` 里没有体现，需要实测。

`syncLogData` 还有一个值得注意的细节：上报失败时会**自动重新 `wx.login` 换 session 再重试**，
说明 `rd_session` 是有有效期的 —— 这也能反推出为什么 `init` 页每次启动都要重新拿 session。

---

## 6. 为什么名字里有 `Hi-`

GAP 设备名是 `Hi-YM01-XXXXXXXXXXXX`，`Hi-` 前缀 + `YM01` 是同源白牌（婴觅/得途）的
HiLink 平台命名，GATT 里也确实带着华为 HiLink 的服务模板：

```
00010203-0405-0607-0809-0a0b0c0d1912   （char ...2b12，OTA 用）
000000fb-0000-1000-8000-00805f9b34fb   （1001/1002，实际业务通道）
```

但厂商**没有使用 HiLink 那套 JSON + SPEKE 加密协议**，而是在模块的 vendor 模式下
自己拼了一套明文十六进制帧。这也解释了为什么广播里没有 HiLink beacon ——
它从来没走过华为的认证配网流程。

> 结论：不要被 GATT 结构误导。看到 HiLink 服务不等于真的在用 HiLink 协议。

---

## 7. 原厂客服联系方式（`problem` 页里的）

`pages/problem/problem.js` 的 `problemList` 第一项就是联系方式，直接抄下来：

```
微信：laifeng-sh
电话：400-009-8685
电话客服工作时间：9:00-18:00
```

其余四条 FAQ 是：

| 问题 | 原厂回答 |
| --- | --- |
| 消杀时间设置失败？ | 请注意两次定时消杀时间间隔不小于 1 小时，且最多设置四条消杀，最少一条。 |
| 设备连接缓慢或多次连接不上？ | 请在后台清除微信和小程序，并重启蓝牙和定位。 |
| 固件升级失败？ | 升级过程中请尽量确保手机靠近设备且保持连接。 |
| 开启了蓝牙及定位仍无法连接？ | 请确保微信定位以及蓝牙已授权。 |

**注意：** 品牌（全格家居）公众号已停更，但这个 400 电话和微信号是写在 2022 年包里的小程序
客服入口，是否还能打通需要实测。如果能联系上，最值得问的两件事是：

1. 还有没有可用的固件文件（用于理论上的手动刷入）；
2. 新版小程序包（如果有），哪怕只拿到 `.wxapkg` 也能再挖一轮。

---

## 8. 这台设备到底有哪些能力（全量清单）

把 23 个模块、全部 `DB` 开头的指令串穷举后的结果 —— 这就是原厂 App 能做的**全部**事情：

| 能力 | 指令 | 我们是否已实现 | 说明 |
| --- | --- | --- | --- |
| 对时 | `DB 04 02` + unix 秒(4B) | ✅ | 每次连接都会发，是后续一切的前提 |
| 查状态 | `DB 04 02` + 时间戳 | ✅ | 回 `BD 0B 02` / `BD 0E 02`，带电量与下次时间 |
| 启动杀菌 | `DB 02 04 01` | ✅ | |
| 停止杀菌 | `DB 02 04 00` | ✅ | |
| 读定时表 | `DB 01 07` | ✅ | 回 `BD 0D 07` |
| 写定时表 | `DB 08 08` + 条数 + 整表 | ✅ | 新建/编辑都是整表覆盖 |
| 删定时 | `DB 00 08` + 剩余条数 + 保留项 | ✅ | |
| 读日志 | `DB 01 05` | ✅ | 流式推 `BD 08 05`/`BD 08 06` |
| 日志 ACK | `DB 06 06 01` + 时间戳 | ✅ | 不回 ACK 设备不推下一条 |
| 读固件版本 | `DB 01 A4` | ✅ | 回 `BD 06 A2` |
| 设备复位 | `DB 01 A0` | ⚠️ **未实现，也不建议加** | 解绑时发，可能清掉定时表 |
| 低电量警告 | （设备主动推 `BD 05 A1`） | ⚠️ 未处理 | 原厂收到后禁止启动杀菌并提示换电池 |
| 固件升级 | OTA 通道 + Telink 协议 | ❌ | 服务器已下线，见 §5.1 |
| 改设备名 | 云端接口，**不碰设备** | ❌ | 服务器已下线，见 §3.7 |
| 消杀历史 | 云端接口，**设备只缓存** | ❌ | 服务器已下线，见 §5.2 |

**没有**的：LED/灯光控制、童锁、定时之外的场景模式、固件参数配置、
灵敏度调节、声音开关 —— 全部 23 个模块里一个都没有。这个设备的可调项就是
**"最多 4 条定时，每条 = 时间 + 3~6 分钟时长"**，别无其他。

### 8.1 一个好消息：`kHID` 状态可能不是什么坏事

之前仓库里写"广播名在 `QUANGE-WY020702` 和 `kHID` 之间来回切"，
现在看完 `conble.js` 可以更准确地说：

- `kHID` 是模块（Telink/YC）的**出厂默认广播名**，说明设备的用户配置区可能被复位了，
  或者压根没写进去；
- 但**广播里带 `0x1812` 服务**是固件行为，和名字无关 —— 所以即使叫 `kHID`，
  设备的业务服务 `0xFB` 依然在，功能不受影响；
- 原厂 App 只认 `QUANGE-WY020702`，所以它在 `kHID` 状态下搜不到 —— **这是原厂的锅，不是设备坏了**。

我们的 `phone.html` 和 `set_timer.py` 认三个前缀，所以在两种状态下都能连上。

---

## 9. 复盘：这台设备还能用多久

| 风险 | 判断 |
| --- | --- |
| App 不能用了 | ✅ 已解决，网页版 + Python 脚本都能改定时 |
| 服务器挂了影响功能 | ✅ 不影响核心控制，只损失历史记录、改名、OTA |
| 电池 | ⚠️ 电量低于阈值会推 `BD 05 A1` 并拒绝启动 —— 需要换电池 |
| 固件写坏 | ⚠️ 无原厂固件可回滚，别乱试 OTA |
| UV 灯管老化 | ⚠️ 汞灯/LED 都有寿命，属于耗材，无法通过软件得知 |
| 蓝牙模块失效 | ❌ 无替代方案，设备就变普通牙刷架 |

结论：**软件层面已经彻底盘干净了**，剩下的都是硬件寿命问题。
把定时设成你想要的时间，然后这份文档就可以封存了。
