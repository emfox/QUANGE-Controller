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

| 页面 | 作用 |
| --- | --- |
| `index` | 主页，显示状态、倒计时、电量、下次消杀时间 |
| `init` | 启动页，先请求 `get_access_token`，**服务器挂了所以永远卡在这里** |
| `conble` | 扫描并连接设备，连接后跑初始化时序 |
| `timing` | 定时列表，可编辑/删除 |
| `addtiming` | 新建定时（时间 + 3~6 分钟时长） |
| `edittiming` | 编辑已有定时 |
| `history` | 消杀历史（本地 Storage 的 `logDataList`） |
| `set` | 设备名修改、解绑/删除设备 |
| `deviceInfo` | 版本号、OTA 入口 |
| `problem` / `logs` / `test` | 帮助、启动日志、自测 |

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
