# QUANGE-Controller

全格（QUANGE）智能杀菌牙刷杯架 **WY020702** 的第三方控制器与蓝牙协议文档。

厂商的微信小程序「莱枫智能生活」已随服务器下线，设备只能按出厂默认时间自动杀菌，无法再调整。
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
2. 长按杯架按键 **3 秒**开机（指示灯亮）；USB 常供电的机器不再自动关机，可跳过此步
3. 点「连接设备」→ 在弹窗里选设备（主广播名固定为 `QUANGE-WY020702`；模块默认名 `kHID`
   只在**每轮扫描的第一个包**偶现，之后固定不变，见「已知限制」）
4. 点「从设备读取」拉取现有定时 → 增删条目 → 「保存到设备」

页面上可以直接看到：待机/消杀中剩余时间、下次消杀时间、电量、固件版本、最近一次消杀。
定时最多 **4 条**，每条 3~6 分钟，支持增删改（已实测多条可用）；
另有「**读取记录**」可以把设备上的消杀历史逐条拉下来 —— 每条都**先落盘到浏览器本地存档再确认**，
可导出 JSON / CSV，刷新页面也不会丢（见「已知限制」里关于日志队列的说明）。

> iOS 的 Safari 不支持 Web Bluetooth，苹果设备无法使用网页版。

### 脚本版

```bash
pip install bleak

python tools/set_timer.py --at 03:00 --dur 5        # 每天 03:00 消杀 5 分钟
python tools/set_timer.py --at "07:00=4,22:00=5"    # 一天两次
python tools/set_timer.py --query                   # 查状态与下次杀菌时间
python tools/set_timer.py --start                   # 立即消杀一次
python tools/set_timer.py --list                    # 读取设备上的定时列表
python tools/set_timer.py --logs                    # 读取消杀记录（只读，一次性）
python tools/set_timer.py --logs-all                # 一直读到队列为空
python tools/set_timer.py --version                 # 读固件版本
python tools/set_timer.py --stop                    # 立即停止
python tools/set_timer.py --at 03:00 --dry-run      # 只打印帧，不连接设备
```

设备名默认同时认 `QUANGE` / `Hi-` / `kHID` 三个前缀，还会按广播里的 `0x1812` / `0x180F`
服务兜底匹配（脚本走 `bleak`，没有浏览器那层限制）。扫不到时可以直接指定地址：

```bash
python tools/set_timer.py -a AA:BB:CC:DD:EE:FF --query
python tools/set_timer.py -n kHID --query            # 只按某个前缀找
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
| 查询定时列表 | `DB 01 07`（单独发设备不回，需先发 `DB 04 02` + `DB 01 05`） |
| **设置定时（整表覆盖）** | `DB 08 08 <总条数>` + `[HH MM 0D] × 总条数` |
| 删除定时 | `DB 00 08 <剩余条数>` + `[要保留的项] × 剩余条数` |

定时项 3 字节：`HH` 小时（hex）、`MM` 分钟（hex）、`0D` 消杀时长（**1 字节分钟数**）。
本项目按原厂限制只让填 3 / 4 / 5 / 6 分钟；实测**固件不校验范围**
（`0x00` / `0x07` / `0x0F` 都被接受），3~6 分钟只是小程序前端的限制。

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
│   ├── probe.py                       只读诊断（扫描 / 监听通知）
│   ├── ota_dump.py                    OTA 导出 ROM（⚠️ 不可逆，见 docs/ota-dump.zh-CN.md）
│   ├── rom_analyze.py                 ROM 静态分析（只读）
│   ├── tc32_disasm.py                 TC32 反汇编与调用图（只读）
│   ├── tc32_ram.py                    RAM/IO 访问矩阵（常量传播，只读）
│   ├── mibeacon.py                    MiBeacon 广播编解码（含自检）
│   ├── cmd_probe.py                   发原始帧并记录回包（用于验证未知命令）
│   └── wxapkg_unpack.py               wxapkg 解包器（含 V1MMWX 新格式）
├── firmware/
│   ├── rom_512k.bin                   整机 flash 备份（512 KB）
│   ├── rom_vendor_firmware.bin        原厂固件切片（0x00000–0x0E000）
│   └── README.md                      校验值、布局与权利说明
├── miniprogram/
│   ├── QUANGE-WY020702__APP__.wxapkg  小程序原件（存档）
│   └── app-service.js                 解包出的业务逻辑
└── docs/
    ├── protocol.zh-CN.md              协议全文（中文）
    ├── protocol.en.md                 Protocol (English)
    ├── ota-dump.zh-CN.md              ROM 导出复现步骤（中文，⚠️ 不可逆）
    ├── ota-dump.en.md                 ROM dump procedure (English)
    ├── firmware-code-map.zh-CN.md     固件代码结构图（函数级，中文）
    ├── firmware-code-map.en.md        Firmware code map (English)
    ├── firmware-analysis.zh-CN.md     原厂固件静态分析（中文）
    ├── firmware-analysis.en.md        Vendor firmware analysis (English)
    ├── firmware-structure.zh-CN.md    原厂固件功能结构 / 反汇编（中文）
    ├── firmware-structure.en.md       Vendor firmware structure (English)
    ├── miniprogram.zh-CN.md           小程序结构与取包方法（中文）
    ├── miniprogram.en.md              Mini program internals (English)
    ├── mi-home.zh-CN.md               接入米家：可行性与边界（中文）
    └── mi-home.en.md                  Mi Home: feasibility and boundaries (English)
```

---

## 设备信息

| 项目 | 值 |
| --- | --- |
| 型号 | WY020702 |
| 品牌 / 责任主体 | **上海莱枫生活用品有限公司**（「全格 QUANGE」是其自有品牌；统一社会信用代码 `91310120MA1HQ17M3W`，官网 `sh-lifefun.com`） |
| 广播名 | `QUANGE-WY020702`；`kHID` 仅在每轮扫描的**首个包**出现，之后固定 |
| GAP 设备名 | `Hi-YM01-XXXXXXXXXXXX` |
| 芯片 | Telink（泰凌微）。**实测与 TLSR8258 二进制兼容**，精确丝印型号仍未知（§8.6）；已决定不拆机，不再追查 |
| 供电 | 原厂 3 × AA 电池（铭牌 `AA LR6 1.5 V × 3`、`4.5 V ⎓ / 0.81 W`）；**实测机已改 USB 常供电**：5 V 经 DC-DC 降至约 4.5 V 接电池仓触点，不再自动关机、不掉时钟 |
| 铭牌 / 核准 | 机身背面铭牌：`WY020702`、`4.5 V ⎓ / 0.81 W`、公司名称上海莱枫生活用品有限公司；无线电发射设备型号核准代码 **`CMIIT ID: 2021DP13837`**（核准证 `2021-13837`，设备名称「蓝牙设备」，申请单位 / 生产厂商上海莱枫，发证 2021-10-22，有效期五年） |
| 生产地 | 广东省中山市 |
| UVC | 首尔伟傲世 275nm |
| 原厂 App | 微信小程序「莱枫智能生活」（appid `wx9528fce803d3ba0e`，已下线） |

> **主体**：WY020702 的包装 / 说明书上印的就是上海莱枫，与工商登记、官网域名及上市公司
> 茶花股份的关联交易公告一致。「**莱枫智能生活**」是**小程序名称，不是公司名**。
> 「品牌方 ≠ 模组 / 固件 / 代工方」成立（Telink 模组、MAC OUI `1C:45:C2` 属惠州三信、
> 广东中山代工）。
>
> **实物与官方双重印证**：机身背面铭牌直接印有「上海莱枫生活用品有限公司」；
> SRRC 核准数据库中 `2021DP13837` 的申请单位 / 生产厂商同样是该公司，设备型号正是 WY020702。
> 核准证只列射频参数（2400–2483.5 MHz、≤20 dBm EIRP、占用带宽 ≤3 MHz），
> **不公开芯片 / 模组型号**，不能替代主控丝印。
> 见 [铭牌与核准标签实拍](docs/images/nameplate.jpg)、
> [机身侧面印刷说明与品牌标识实拍](docs/images/side-printed-text.jpg)
> （铭牌照片含本机 MAC / SN，经设备所有者同意公开）。
>
> 依据：[包装与说明书实拍](http://mp.weixin.qq.com/s?__biz=MzU0MjQxMDE3Mw==&mid=2247484008&idx=1&sn=1f52900b12f12ef3149395d5854b7d32)、[工商登记](https://aiqicha.baidu.com/company_detail_10059015340660)、[茶花股份公告](http://static.cninfo.com.cn/finalpage/2025-08-23/1224554808.PDF)、[SRRC 核准结果查询](https://ythzxfw.miit.gov.cn/jgcx/index.html)（核准代码 `2021DP13837`）。

---

## 小程序下线后为什么还能控制

常见结论是“云端服务没了所以设备锁死了”。实际情况并非如此：

- 设备**不依赖云端**，所有控制都在本地蓝牙完成；
- 协议是**明文十六进制帧**，没有 authCode、没有会话密钥、不需要配对绑定；
- 小程序只有一个 serverless 前端，服务器只负责登录、改设备名、OTA、日志上报。

真正的障碍只是**帧格式未知**。拿到 `app-service.js` 后，一切迎刃而解。

这里要区分两件事，很容易被混为一谈：

| | 有没有加密 |
| --- | --- |
| **小程序包**（`__APP__.wxapkg`） | **有**。`V1MMWX` 容器，去掉 6 字节头后整段 XOR `0x30`，得先解出来才能读代码 |
| **设备 BLE 协议**（`DB`/`BD` 帧） | **没有**。明文十六进制，无校验、无会话密钥、不需要绑定 |

也就是：**包要解密，协议不用。**

---

## 已知限制

- **广播名不一定是 `QUANGE-WY020702`**：`kHID` 是蓝牙模块的出厂默认名 —— 上游复用了 HID 产品线
  （自拍器/键盘）的固件配置，改造成杀菌盒时没改广播配置。**2026-11-08 实测已定案（§8.5）**：
  `kHID` 只出现在每轮扫描的**第 1 个包**（1/121、1/98），之后固定为 `QUANGE-WY020702`，
  不是两者交替。
  功能上不受影响：连上后业务服务 `0xFB` 照常可用，
  而且广播里的 `0x1812` **只是个声明，设备实际并没有 HID 服务**。
  原厂小程序只认 `QUANGE-WY020702`，所以在 `kHID` 状态下它反而搜不到。
  **网页版只能按三个名称前缀 + `0x180F` 匹配**：`0x1812` 在 Web Bluetooth 的支持服务
  黑名单里，一旦写进 `filters`，整个 `requestDevice()` 会被浏览器直接拒绝
  （`SecurityError: blocklisted UUID`，2026-11-08 真机复现）。脚本走 `bleak`，没有这层限制；
  但这些标识都出自同一块配置，**只有 MAC 是可靠的**（脚本 `-a <MAC>`，网页版点「显示全部设备」）；
- **连接期间设备不广播**：BLE 从设备被连上后就停止对外广播，所以**同一时间只能有一个主机控制它**。
  手机连着的时候，电脑搜不到它；反过来也一样。切换控制端之前先点「断开」；
- **定时是「整表替换」，不是追加**：保存时会把你编辑的列表整体写下去，替换设备上原有配置。
  最多 4 条（**实测的固件上限，发第 5 条会被静默丢弃**），每条 3~6 分钟（**前端限制**，
  固件不校验，见协议文档 §8.4）；想删某条就在页面上删掉再保存；
- **两条定时的间隔约束**：原厂前端要求间隔 ≥ 59 分钟，且都落在首个定时之后 23 小时内。
  **实测确认：固件完全不校验这两条，纯属小程序前端规则**（相隔 30 分钟的两条被原样接受）。
  网页版和脚本仍按同一套规则校验，是**有意与小程序保持一致**，避免设出原厂 App 里做不到的
  配置；要绕过用 `set_timer.py --force`；
- **断电 / 换电池场景不适用**：实测机已改 USB 常供电，不再自动关机或掉时钟（协议文档 §9）；
- **云端消杀历史已永久丢失，但本地可以自建存档**：历史数据在小程序连上设备后把日志流
  （`BD 08 05`）转存到 `api.sh-lifefun.cn`，再由 `get_device_use_log` 读回来画图。
  服务器没了，这条链路彻底断掉 —— 下线期间产生的历史无法找回，日/周/月曲线也不再自动生成。
  日志是**一次性读取**（待同步队列）：确认一条就消费一条，读过的不会再回来，
  排空后协议手段无法回溯，但下一次定时消杀写入新记录后会自动重新可读，
  USB 常供电不必重启（重启也找不回已读记录），见 [docs/protocol.zh-CN.md](docs/protocol.zh-CN.md) §5.3；
  云端那一侧见 [docs/miniprogram.zh-CN.md](docs/miniprogram.zh-CN.md) §5.2。
  **网页版现在会先把每条记录写入浏览器本地存档、再回确认帧**，并在读取前提示队列将被消费，
  可取消；存档可一键导出 JSON / CSV（Excel 直开），刷新或误关页面都不会丢。
  脚本 `--logs` / `--logs-all` 仍是纯文本输出，需要留档请自行重定向到文件；
- **设备名改不了**：`get_device_config` / `update_device_config` 都是云端接口，
  名字只存服务器和手机本地，**从来没写进设备**。服务器下线后无法修改；
- **固件升级已不可用**：小程序里的 OTA 实现完整（Telink 标准 OTA + CRC16 分包），
  但检查更新和下载固件都要走 `api.sh-lifefun.cn`，该域名 DNS 还在、80/443 全部超时。
  协议机制已整理在 [docs/miniprogram.zh-CN.md](docs/miniprogram.zh-CN.md) §5.1；
  2026-11-08 已按该机制成功刷入第三方固件、导出整片 ROM 并切回原厂固件，
  原厂固件备份也已取得（见 [docs/protocol.zh-CN.md](docs/protocol.zh-CN.md) §8.6，
  备份文件在 [`firmware/`](firmware/README.md)）。完整的导出与复现步骤见
  **[docs/ota-dump.zh-CN.md](docs/ota-dump.zh-CN.md)**（[English](docs/ota-dump.en.md)）。
  刷写本身可回滚（双区布局 + `D7` 启动标志），但**本项目不提供第三方固件文件、也不建议自行尝试**；
- `DB 01 A0` 是**恢复出厂**，本项目不实现 —— 它会擦日志表、配置和队列索引，并把定时表重置成
  08:00 / 20:00。破坏性、不可逆，没有非破坏性用途；
- **状态回包依赖订阅顺序**：状态、电量、下次杀菌时间都来自 `DB 04 02` 的回包。2026-11-07 实测：
  **必须先订阅 `1002` 再发**，否则回包被直接丢弃且不缓存（「多次实测无回包」就是这个原因）。
  本项目两个客户端都是先订阅再发，不受影响（见 [docs/protocol.zh-CN.md](docs/protocol.zh-CN.md) §3.2）。
  已复测：**消杀期间状态回包正常**（6/6 次，见协议文档 §8.5）；
- 设备广播非常稀疏，连接困难时请把设备靠近；电池供电的机器可重新开关机一次
  （**USB 常供电的实测机不需要，重启也找不回已消费的日志**）。

---

## 免责声明

本项目与全格、上海莱枫生活用品有限公司、腾讯、华为均无关联。

协议信息来自对已下线小程序客户端包的分析，目的仅为**让已停止维护的自有硬件继续可用**（互操作性目的）。
`miniprogram/` 目录下的文件为原厂小程序产物的存档，版权归原权利人所有，仅供研究与互操作性参考，不得用于商业分发。
[`firmware/`](firmware/README.md) 下的镜像是从自有设备导出的个人备份；其中原厂固件版权归原权利人所有，
**不在本项目的 MIT 许可范围内**，仅供研究与互操作性参考，不得用于商业分发或移植到其它产品。
镜像含设备唯一信息（MAC、射频校准）及一次调试固件写入，并非纯净原厂包，公开使用前请自行评估。

使用本项目的指令直接操作硬件，风险自负。

## 许可证

本项目自有的代码与文档采用 [MIT](LICENSE) 许可，版权 © 2026 Emfox Zhou。
`miniprogram/` 下的原厂小程序存档与 `firmware/` 下的固件镜像**均不在本许可范围内**，
见上方免责声明与 [`firmware/README.md`](firmware/README.md)。
