# QUANGE-Controller

全格（QUANGE）智能杀菌牙刷杯架 **WY020702** 的第三方控制器与蓝牙协议文档。

厂商的微信小程序「莱枫智能」已随服务器下线，设备只能按出厂默认时间自动杀菌，无法再调整。
本仓库通过逆向该小程序，还原出设备的**明文蓝牙协议**，并提供两套可直接使用的控制方案：

| 方案 | 说明 | 适用 |
| --- | --- | --- |
| **[网页版](phone.html)** | 手机浏览器直连蓝牙，无需安装任何 App | Android + Chrome |
| **[Python 脚本](tools/set_timer.py)** | 命令行改定时，便于批量/自动化 | Windows / macOS / Linux |

> 在线版：**https://emfox.github.io/QUANGE-Controller/**
> （手机 Chrome 打开 → 加到主屏幕，用起来和小程序一样）

---

## 快速开始

### 网页版（推荐）

1. 安卓手机用 **Chrome** 打开 https://emfox.github.io/QUANGE-Controller/
2. 长按杯架按键 **3 秒**开机（指示灯亮）
3. 点「连接设备」→ 在弹窗里选 `QUANGE-WY020702`
4. 改时间 → 保存

页面上可以直接看到：待机/消杀中剩余时间、下次杀菌时间、电量。

> iOS 的 Safari 不支持 Web Bluetooth，苹果设备无法使用网页版。

### 脚本版

```bash
pip install bleak

python tools/set_timer.py --at 03:00 --dur 5        # 每天 03:00 消杀 5 分钟
python tools/set_timer.py --at "07:00=4,22:00=5"    # 一天两次
python tools/set_timer.py --query                   # 查状态与下次杀菌时间
python tools/set_timer.py --start                   # 立即消杀一次
```

---

## 协议速查

指令写在特征值 `00001001-0000-1000-8000-00805F9B34FB`，帧以 `DB` 开头；
设备在 `00001002-...` 上以 `BD` 开头的帧回包。**明文、无加密、无校验、无需绑定。**

| 功能 | 帧 |
| --- | --- |
| 立即开启 | `DB 02 04 01` |
| 关闭 | `DB 02 04 00` |
| 查询状态 | `DB 04 02` + 4 字节 unix 秒（大端） |
| 查询定时列表 | `DB 01 05` |
| **设置定时（整表覆盖）** | `DB 08 08 <条数>` + `[HH MM 0D] × 条数` |
| 删除定时 | `DB 00 08 <条数>` + `[HH MM 0D] × 条数` |

定时项 3 字节：`HH` 小时（hex）、`MM` 分钟（hex）、`0D` 消杀时长（3/4/5/6 分钟）。

例：每天 03:00 消杀 5 分钟 → `DB 08 08 01 03 00 05`

完整字段、回包解析、初始化时序见 **[docs/protocol.zh-CN.md](docs/protocol.zh-CN.md)** ·
[English](docs/protocol.en.md)

---

## 仓库结构

```
.
├── index.html                         GitHub Pages 入口
├── phone.html                         网页版控制器（Web Bluetooth）
├── tools/
│   ├── set_timer.py                   命令行改定时（推荐）
│   ├── blectx.py                      BLE 公共模块
│   └── wxapkg_unpack.py               wxapkg 解包器（含 V1MMWX 新格式）
├── miniprogram/
│   ├── QUANGE-WY020702__APP__.wxapkg  小程序原件（存档）
│   └── app-service.js                 解包出的业务逻辑
└── docs/
    ├── protocol.zh-CN.md              协议全文（中文）
    ├── protocol.en.md                 Protocol (English)
    ├── miniprogram.zh-CN.md           小程序结构与取包方法（中文）
    └── miniprogram.en.md              Mini program internals (English)
```

---

## 设备信息

| 项目 | 值 |
| --- | --- |
| 型号 | WY020702 |
| 广播名 | `QUANGE-WY020702` |
| GAP 设备名 | `Hi-YM01-XXXXXXXXXXXX` |
| 芯片 | Telink（泰凌微），PnP ID `0x248A:0x6682` |
| 供电 | 3 × AA 电池，纯 BLE，无 Wi-Fi |
| UVC | 首尔伟傲世 275nm |
| 原厂 App | 微信小程序「莱枫智能」（appid `wx9528fce803d3ba0e`，已下线） |

---

## 为什么之前“改不了”

小程序下线后，常见结论是“云端服务没了所以设备锁死了”。实际情况并非如此：

- 设备**不依赖云端**，所有控制都在本地蓝牙完成；
- 协议是**明文十六进制帧**，没有 authCode、没有会话密钥、不需要配对绑定；
- 小程序只有一个 serverless 前端，服务器只负责登录、改设备名、OTA、日志上报。

真正的障碍只是**帧格式未知**。拿到 `app-service.js` 后，一切迎刃而解。

---

## 已知限制

- **设备的广播名会切换**：实测在 `QUANGE-WY020702` 和 `kHID` 之间来回变。
  按名字扫描时两个都要认，否则会扫不到（网页版已同时匹配这两个名字）；
- 单次只写一条定时，原有列表会被整表覆盖（这是设备语义，不是本项目的限制）；
- 小程序前端有「两条定时间隔需大于 1 小时」的校验，固件是否也强制，未验证；
- 换电池后定时是否保留，未实测（推断在 Flash 中，应当保留）；
- 设备广播非常稀疏，连接困难时请把设备靠近、并重新开关机一次。

---

## 免责声明

本项目与全格、上海莱枫生活用品有限公司、腾讯、华为均无关联。

协议信息来自对已下线小程序客户端包的分析，目的仅为**让已停止维护的自有硬件继续可用**（互操作性目的）。
`miniprogram/` 目录下的文件为原厂小程序产物的存档，版权归原权利人所有，仅供研究与互操作性参考，不得用于商业分发。

使用本项目的指令直接操作硬件，风险自负。
