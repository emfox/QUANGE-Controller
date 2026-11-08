# 通过 OTA 导出固件（ROM dump）

> 2026-11-08 在自有设备 `QUANGE-WY020702`（MAC `1C:45:C2:00:9B:B6`）上一次成功实测的记录。
> [English](ota-dump.en.md) · [返回 README](../README.md) · [协议全文](protocol.zh-CN.md) §8.6

> ⚠️ **这是不可逆的硬件操作。** 第一步就是向设备 flash 写入第三方固件，
> 中途断电、写错帧或芯片不兼容都可能让设备**永久变砖**，且没有 OTA 回滚通道。
> 请先读完本文、确认有原厂固件备份、并接受风险再动手。**本项目不对损坏负责。**

---

## 1. 适用范围与结论

| 项 | 说明 |
| --- | --- |
| 实测设备 | 全格 QUANGE WY020702，固件版本回包 ASCII `000014` |
| 主控 | Telink，与 **TLSR8258 二进制兼容**（功能性推断，非丝印确认） |
| Flash 大小 | `0x80000` = 512 KB |
| 结果 | 导出完整 512 KB，`0xD7` 切回原固件，设备验收通过、定时表未变 |
| 产物 | [`firmware/rom_512k.bin`](../firmware/rom_512k.bin)、[`firmware/rom_vendor_firmware.bin`](../firmware/rom_vendor_firmware.bin) |

⚠️ **不保证适用于其它批次/固件版本。** 分区布局、bootloader 魔数、OTA 帧格式都可能在别的版本里不同。
动手前先按 §5.2 做握手试探，并确认 `probe.py` 能枚举出同样的 OTA 服务。

---

## 2. 原理：以写换读 + 双区布局

`TLSR825x_OTA_Flash_Hacker`（pvvx）**不能无损读取**原厂固件。它的流程是：

```
1. OTA 写入 BLE-Hacker.bin（39,652 B，为 TLSR8258 编译，链接 -llt_8258）
        ↓  ← 这一步就是不可逆写入
2. 设备重启，跑这段第三方固件，广播名变成 BLE_xxxxxx（MAC 也会变）
   提供私有服务 0x1f10 / 特征 0x1f1f（notify + read + write-without-response）
        ↓
3. 用 0xD4 命令读整片 flash，固件以 notify 流式回传
        ↓
4. 发 0xD7 "Change Start Boot" 改启动标志，切回原厂固件
```

本机是**双区布局**，这是整个操作能恢复的关键（实测确认）：

| 偏移 | 内容 |
| --- | --- |
| `0x00000–0x0DFFF` | 原厂固件，**导出全程未被修改** |
| `0x20000` | OTA 区，`BLE-Hacker.bin` 刷在这里（精确匹配） |
| `0x40000+` / `0x76000+` | 配置 / 运行记录 / MAC 与射频校准 |
| 其余 | 空白 `0xFF` |

`0xD7` 只是把启动地址切回 `0x00000`，所以原厂固件始终都在。
**如果目标设备是单区覆盖式 OTA，这套方法会直接抹掉原厂固件，不要照搬。**

### 2.1 机制细节（pvvx 源码级核查）

- 命令集（`cmd_parser.h`）：`0xD4` 读 flash 块 / `0xD3` 写 flash / `0xD5` 擦扇区 /
  `0xD7` 换启动 / `0xD1` 清 OTA 区；
- 切换启动靠镜像偏移 `+8` 处的 4 字节魔数 **`0x544c4e4b`**（`BLE-Hacker.bin` 第 8 字节就是它），
  `chk_addr_cur_boot()` 从 `0` 按 `0x10000` 步进扫到 `0x40000` 找魔数 ⟹ **镜像必须 64 KB 对齐**；
- 只针对 TLSR8258：`makefile` 里写死 `-DCHIP_TYPE=CHIP_TYPE_8258`，链接 `-llt_8258`；
- 两个风险：`chng_boot()` 的 `fsec_patch()` 是「读 4 KB → 擦扇区 → 整块重写」，中途掉电该槽报废；
  `CMD_ID_WRFB` 写 flash **不校验地址**，可以覆盖 MAC 与射频校准区。

---

## 3. 前置条件

| 条件 | 要求 |
| --- | --- |
| Python | 3.8+，`pip install "bleak>=3.0,<4"`（实测 3.0.2） |
| 蓝牙 | 本机带 BLE 适配器；Windows / Linux 实测可行，macOS 未测 |
| 信号 | **RSSI > −70 dBm**。−87 ~ −92 dBm 时连接成功率约 1/3，刷写中途断连会变砖 |
| 供电 | 稳定。**实测机已改 USB 常供电**；电池机请换新电池，中途断电无救 |
| 原厂备份 | **必须先有**。本仓库 `firmware/rom_vendor_firmware.bin` 是同型号备份，但跨设备不保证通用 |
| 记录 | 动手前记下原 MAC，并用 `set_timer.py --list` 备份定时表 |

下载第三方固件（**不在本仓库内**，见 [`firmware/README.md`](../firmware/README.md)）：

```bash
curl -L -o BLE-Hacker.bin \
  https://github.com/pvvx/TLSR825x_OTA_Flash_Hacker/raw/main/BLE-Hacker.bin
sha256sum BLE-Hacker.bin
# f0235125e3a7a66d6b9ec556db5d8ec2451f6d50e626b8fef080d200a08238f2
```

---

## 4. 帧格式（关键，来自一手源码）

**权威来源是 `miniprogram/app-service.js`**，不是任何第三方工具。
相关函数：`SendBlePkg` / `ReadyOTA` / `StartOTA` / `CRC16S` / `CRC16` / `toString` / `buf2hex`。

### 4.1 CRC16

CRC16-Modbus，多项式 `0xA001`（reflected）、初值 `0xFFFF`，
**输出为小端 2 字节**。源码里 `CRC16()` 返回 `[hi, lo]`，
`toString()` 默认参数下算 `t[0] + 256*t[1]` 再转 4 位 hex，
结果等于字节序 `[lo, hi]`。

自测向量：`crc16(b"123456789")` → `0x4B37` → 输出 `37 4B`。
`tools/ota_dump.py` 里的 `crc16()` 已按此实现并验证。

### 4.2 数据块

```python
press = ceil(len(fw) / 16)
for seq in range(press + 1):          # 注意循环含 e == press
    body = seq.to_bytes(2, "little") + fw[seq*16 : seq*16+16].ljust(16, b"\xFF")
    frame = body + crc16(body)        # 18 + 2 = 20 字节
```

- 循环条件是 `e <= updata_press`，所以实际发 **press+1 块**，最后一块是全 `0xFF` 填充。
  `BLE-Hacker.bin` = 39,652 B → `press = 2479` → **2480 块**。
- 块间隔 **15 ms**（实测 2480 块共 44.2 s）。
- 写入特征 `00010203-0405-0607-0809-0a0b0c0d2b12`，`write-without-response`。

### 4.3 握手与结束帧

| 阶段 | 帧 |
| --- | --- |
| 握手 | `01 FF`（2 B）。**没有** `00 FF` 前置 |
| 结束 | **18 B**：`02FF` + cnt(2 LE) + `~cnt`(2 LE) + `0000`，**重复两遍**，再接 CRC16 |

结束帧的源码写法是 `t.buf2hex(d) + t.CRC16S(d)`，
而 `CRC16S()` 内部已经包含一遍 `hex(d)`，于是 `d` 被发了两次。
**看起来像上游 bug，但本机固件就认这个，必须逐字节照抄。**
`press = 2479` 时实测结束帧：

```
02FF AF09 50F6 0000 02FF AF09 50F6 0000 FBB1
```

> 另：`close()` 发的是 `DB 02 04 00`（停止消杀）到业务通道 `1001`，**不是断开 BLE 连接**。
> OTA 是在同一个连接、原固件仍在运行时完成的，结束后才由 bootloader 切换。
> 设备待机时可省略这一帧。

### 4.4 不要直接用 TelinkMiFlasher 网页版

网页工具与本机流程**不能互换**，帧格式差异很大：

| | 本机小程序（一手源码） | TelinkMiFlasher / TelinkOTA |
| --- | --- | --- |
| 握手 | `01 FF` | `00 FF` → `01 FF` |
| 数据块 | seq2 + **16 B** + CRC2 = 20 B | seq2 + **32 B** + CRC2 = 36 B |
| 块数 | `press + 1`（含填充块） | `blockCount` |
| 结束帧 | **18 B**，重复前缀 + CRC | **6 B**，`02FF` + (cnt−1) + ~(cnt−1) |
| 每 8 块读状态 | 无 | 有 |

**直接拿网页工具刷本机大概率失败。** 本仓库的 `tools/ota_dump.py` 是按
`app-service.js` 复刻的实现，CRC 与结束帧都已用真机验证。

---

## 5. 执行步骤

以下命令都在 `tools/` 目录下执行；把 `<MAC>` 换成你的设备 MAC。
脚本默认 **dry-run**，只有加 `--commit` 才会真的写硬件。

### 5.1 先看帧，不碰设备

```bash
python ota_dump.py --firmware ./BLE-Hacker.bin
```

应打印 `2480 blocks`、首块 `0000 26800000 00005D02 4B4E4C54 AB038800 8246`、
结束帧 `02FFAF0950F6000002FFAF0950F60000FBB1`。对不上就别往下走。

### 5.2 握手试探（强烈建议）

```bash
python ota_dump.py --firmware ./BLE-Hacker.bin --commit \
  --phase handshake --target-mac <MAC>
```

只发 `01 FF`、不写任何固件数据，然后断开。实测 OTA 特征读回仍是 `00`，
广播名、定时表、日志队列全部完好 —— 说明握手本身无害、且设备**不会**进 bootloader。
断开后回读确认：

```bash
python probe.py --scan-only --scan-time 10 | grep -i quange
python set_timer.py -a <MAC> --list
```

设备不对劲就到此为止。

### 5.3 灌入固件

```bash
python ota_dump.py --firmware ./BLE-Hacker.bin --commit \
  --phase flash --target-mac <MAC> --scan-time 25
```

成功标志是最后打印：

```
hacker device: C0:D4:B2:05:F8:34  name='BLE_05F834'  rssi=-74
```

**把这行里的新 MAC 记下来**，后面 dump / restore 要用。
若没有出现 `BLE_xxxxxx`，**不要盲目重试**，先看 §8。

### 5.4 读整片 flash

```bash
python ota_dump.py --commit --phase dump \
  --mac <BLE_MAC> --out ../firmware/my_rom.bin --timeout 240
```

协议：向 `00001f1f-0000-1000-8000-00805f9b34fb` 写

```
D4 | addr(3 B, 小端) | len(3 B, 小端)
```

全片读发 `D4 000000 000008`（addr=0，len=`0x80000`），
固件以 notify 流式回传，每包 `D4 + addr(3) + data(16)`，共 32768 包。

脚本用「静默 3 秒」判定流结束，别改成长等待：
首次固定等 540 s 也只多收到 1 个包。

### 5.5 补齐流式丢包（必做）

实测**全片流式读的前 10 包（地址 `0x0`–`0x90`，共 160 B）会系统性丢失**，
而单独发 `ReadFlash(0,16)` 能正常返回。原因是订阅刚建立时首包被丢。
重跑一次 `--merge` 也只能补回 1 块，必须按地址单点补：

```python
# 对每个缺失的 16 B 块单独发一次读，把 notify 回填
cmd = bytes([0xD4, off & 0xFF, (off >> 8) & 0xFF, (off >> 16) & 0xFF,
             16, 0, 0])
# notify: D4 + addr(3) + data(16) -> buf[addr:addr+len] = data
```

补完校验 `@0` 应为 `56800000 00005D02 00000000 E9038800 …`，
而不是一片 `FF`。完整 ROM 的 SHA-256 见 [`firmware/README.md`](../firmware/README.md)。

### 5.6 切回原固件

```bash
python ota_dump.py --commit --phase restore --mac <BLE_MAC>
```

只发 1 字节 `D7`。设备应立刻回到 `QUANGE-WY020702` @ **原 MAC**。

> `0xD1`（清 OTA 区）、`0xD3`（写 flash）、`0xD5`（擦扇区）**都不要碰**。
> 它们没有地址校验，可能覆盖 MAC 与射频校准区。

### 5.7 验收

```bash
python set_timer.py -a <MAC> --list
```

实测回包：

```
BD 0D 07 02 00 03 0F 00 05 FF FF FF FF FF FF ED   -> 02:00/3min, 15:00/5min
BD 11 02 ...                                       -> 电量 100%, next run 15:00
BD 08 05 ...                                       -> 日志首帧正常
```

⚠️ `--version` / `--query` 单发可能收不到回包（已知的间歇行为），
**验收一律用 `--list` 的全序列**，别误判成设备坏了。

---

## 6. 已知坑速查

| 坑 | 处理 |
| --- | --- |
| 网页 TelinkMiFlasher 刷不进 | 帧格式不同，见 §4.4，用本仓库脚本 |
| 全片读开头 160 B 是 `FF` | 流式首 10 包必丢，按 §5.5 单点补 |
| `dump` 傻等超时 | 用静默 3 秒收尾，或 `--timeout 240` |
| 刷完 MAC 变了 | `BLE_xxxxxx` 用另一个 MAC，记下来给 `--mac` |
| `--merge` 覆盖已有 dump | 先把首版另存，合并是原地写 `--out` 指向的文件 |
| 读出的 512 KB 含调试固件 | 不是纯净原厂镜像，用 `rom_vendor_firmware.bin` |
| 信号差 / 中途断连 | 刷写 44 s 内不能断；RSSI 至少 > −70 dBm |
| OTA 特征 read 回 `00` | 正常，不表示失败，也不表示已进入 bootloader |

---

## 7. 产物与校验

| 文件 | 大小 | SHA-256 |
| --- | --- | --- |
| `rom_512k.bin` | 524,288 B | `ae711549b42f2c1598df7edaf4bf61a8f8aaad96163cfb263afd4ffc2475d096` |
| `rom_vendor_firmware.bin` | 57,344 B | `79fa1730ec9f817319ae4414b0c0b91a3f8ea3ca46d0b40e8b304c1b7b468669` |

镜像里能搜到 `QUANGE` @`0xCCEE`、`Hi-YM` @`0x2F8C` / `0xD3BA`、
`KNLT` @`0x20008`（bootloader 魔数）。校验布局：

```python
d = open("rom_512k.bin", "rb").read()
assert d[0x20000:0x20010] == open("BLE-Hacker.bin", "rb").read(16)
```

权利说明见 [`firmware/README.md`](../firmware/README.md)：
原厂固件不在本项目 MIT 许可范围内，仅作自有设备备份与研究。

---

## 8. 失败时怎么办

| 现象 | 处理 |
| --- | --- |
| flash 后没出现 `BLE_xxxxxx` | **不要重复灌入**。先长按开关机一次，看能否回到 `QUANGE-WY020702`。设备若能回来，检查 §4 的帧格式与 CRC 字节序再重试一次 |
| 长按后仍不广播 | bootloader 可能已损坏，OTA 通道消失。此时**原厂备份也救不了**（没有写入通道），唯一出路是 SWS/SWM 单线调试直连 Flash，需要拆机接触板上测试点 |
| `D7` 后没切回 | 保持供电，再长按开关机一次；多数情况下启动标志已改，只是没立即重启 |
| ROM 大片 `FF` | 先确认是不是真的空白区（实测 82% 是 `0xFF` 属正常）；只有 `0x0–0x90` 那 10 块是丢包 |

---

## 9. 参考

- `tools/ota_dump.py` — 本文对应的实现，默认 dry-run
- [`firmware/README.md`](../firmware/README.md) — 备份产物、布局与权利说明
- [`protocol.zh-CN.md`](protocol.zh-CN.md) §8.6 — 本次实测的完整记录与帧数据
- [`miniprogram.zh-CN.md`](miniprogram.zh-CN.md) §5.1 — 小程序 OTA 链路与分包状态机
- `miniprogram/app-service.js` — **帧格式的唯一权威来源**
- [pvvx/TLSR825x_OTA_Flash_Hacker](https://github.com/pvvx/TLSR825x_OTA_Flash_Hacker) — `BLE-Hacker.bin` 与 `TLSR825xOTA_Hacker.html`
- [pvvx/ATC_MiThermometer / TelinkMiFlasher](https://pvvx.github.io/ATC_MiThermometer/TelinkMiFlasher.html) — 标准 Telink OTA 实现（**与本机不兼容**）
