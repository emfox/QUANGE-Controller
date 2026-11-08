# ROM 备份（自有设备导出）

本目录保存 **2026-11-08 从一台自有的 QUANGE WY020702 设备导出的 flash 镜像**，
用途是个人备份与互操作性研究。导出过程与复现步骤见
[中文](../docs/ota-dump.zh-CN.md) / [English](../docs/ota-dump.en.md)。

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| `rom_512k.bin` | 524,288 B | `ae711549b42f2c1598df7edaf4bf61a8f8aaad96163cfb263afd4ffc2475d096` |
| `rom_vendor_firmware.bin` | 57,344 B | `79fa1730ec9f817319ae4414b0c0b91a3f8ea3ca46d0b40e8b304c1b7b468669` |

## 导出来源

- 设备：`QUANGE-WY020702`，MAC `1C:45:C2:00:9B:B6`，固件版本回包 ASCII `000014`
- 方法：OTA 写入第三方 `BLE-Hacker.bin` → 通过 `0xD4` 命令读整片 flash → `0xD7` 切回原固件
- 导出后设备已恢复原固件并验收通过（定时表、状态、电量、日志均正常）

## 镜像布局

| 偏移 | 内容 |
| --- | --- |
| `0x00000–0x0D3E4` | **原厂固件有效部分**（54,244 B，头部 `0x18` 长度字段确认） |
| `0x20000–0x29AE4` | 导出时刷入的 `BLE-Hacker.bin`（39,652 B，**不是原厂内容**） |
| `0x40000–0x40640` | **运行日志表**，200 槽 × 8 B，导出时 189 槽有数据 |
| `0x41000` / `0x42000` / `0x45000` / `0x46000` | 配置标量（含最后一次对时时间戳） |
| `0x76000–0x76008` | 反序 MAC + 2 B 校准 |
| `0x77000` / `0x770C0` / `0x771C0` | 射频校准值 |
| 其余 | 空白 `0xFF`（含 `0x03000` 起 4 KiB 近全零区） |

`rom_vendor_firmware.bin` 是 `0x00000–0x0E000` 的切片（57,344 B），尾部多出的是空白，
**有效内容只到 `0x0D3E4`**。

⚠️ **`rom_512k.bin` 不是纯净的原厂固件镜像**：它包含一次成功的调试固件写入。
需要原厂固件请用 `rom_vendor_firmware.bin` —— 该区域在导出过程中未被修改，
已通过双区布局与镜像比对确认。

静态分析结论（固件头、广播/GATT 数据、日志表结构、时间基）见
[中文](../docs/firmware-analysis.zh-CN.md) / [English](../docs/firmware-analysis.en.md)；
反汇编与功能结构见 [中文](../docs/firmware-structure.zh-CN.md) / [English](../docs/firmware-structure.en.md)。
复现命令：`python tools/rom_analyze.py`（`--logs` 打印全部日志槽）、
`python tools/tc32_disasm.py --functions --xrefs --tables`。

## 权利与许可

- 原厂固件版权归原权利人所有，**不在本项目的 [MIT](../LICENSE) 许可范围内**。
  此处仅作为自有设备的个人备份存档，供研究与互操作性参考，
  不得用于商业分发或移植到其它产品。
- `BLE-Hacker.bin` 来自 [pvvx/TLSR825x_OTA_Flash_Hacker](https://github.com/pvvx/TLSR825x_OTA_Flash_Hacker)，
  **未包含在本仓库**；请按复现文档自行获取（SHA-256
  `f0235125e3a7a66d6b9ec556db5d8ec2451f6d50e626b8fef080d200a08238f2`）。
- 镜像里可能含有设备唯一信息（MAC、校准值）。公开分享前请自行评估。
