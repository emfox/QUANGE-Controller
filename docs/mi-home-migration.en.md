# Migrating to Mi Home: comparable devices and property mapping

Surveyed 2026-11-08. The question: if this device has to speak the Mi Home protocol, is there anything in the market we can copy or borrow outright?

Short answer: **yes, on three different levels.**

- Functionally it is a **Bluetooth timer switch** — BLE + one load + schedules + a WeChat mini program. That is a mature reference design, not a one-off.
- Category-wise, Mi Home already has a formal **`sterilizer`** device type whose property set lines up with our internal state almost one to one, so there is no need to invent a model.
- Hardware-wise, the module inside a Mi Home BLE-Mesh relay (MHCB07P / MHCB12S) ships with an inching timer, so a ~20 CNY relay covers the entire functional surface of this control board.

---

## 1. What this device actually does

Established from the protocol work and the disassembly:

| Capability | Where |
| --- | --- |
| Single disinfection load, on/off | command `04` |
| 4-slot local schedule (hh:mm + minutes), survives power loss | commands `07`/`08`, flash `0x41000` |
| Profile duration table + a fixed 180 s profile | `0x6538`: `+0x60` profile index, `0x50` onwards second table, `+0x35 != 0` selects 180 s |
| Elapsed / total seconds | `+0x3C` (this session) / `+0x48` (since boot) |
| End reason: completed / aborted | `0x64D0` teardown, the `fault` semantic |
| 200 log records, consumed as a stack | flash `0x40000`, commands `05`/`06` |
| Battery percentage | command `03`, RAM `0x8435A0` |
| Serial / MAC / version | commands `09`/`A2`/`A3`/`A5`/`A4` |

## 2. Class 1 — the same thing under another name: Bluetooth timer switches

The "wide-voltage Bluetooth timer switch" sold on Taobao/1688 is the public reference design for this shape:

- 12–260 V AC/DC, 6 A average current;
- BLE direct connection, controlled by a **WeChat mini program** (no app, no gateway);
- 30 schedules, 1 s to 168 h, kept by an internal clock chip across power loss;
- manual on/off plus scheduled on/off.

Against our device the differences are only three: we have 4 schedule slots instead of 30, we carry 200 log records, and we report battery level. The control path — mini program plus BLE private frames — is identical.

⟹ This confirms the "mini program + BLE private protocol + timer + one load" combination is a mature design. Our unit is one customised shell of it, not an orphan.

## 3. Class 2 — the Mi Home category: `sterilizer`

Mi Home has a formal device type `urn:miot-spec-v2:device:sterilizer:0000A04F`, with at least five models online:

| Model | Product | Property set |
| --- | --- | --- |
| `uvfive.steriliser.suger` | FIVE steriliser (basic) | `fault` `mode`(15/30/60 min) `on` `status`(Idle/Busy) `target-time` `working-time` `left-time` + `alarm` `physical-controls-locked` `door-state` |
| `uvfive.steriliser.maine` | FIVE knife/chopstick steriliser | `fault`(ok/done/aborted) `mode`(normal/fast/favourite) `on` `status`(idle/fan/heat/heat+fan/light/…) `target-time` 15–90 step 5 `working-time` `left-time` |
| `xiaomi.steriliser.uvs01` | Mijia smart steriliser | 11 properties; adds `reservation-complete-time` `reservation-left-time` `target-temperature` `door-state`; `target-time` 0–4320 |
| `viomi.steriliser.v1` | Viomi disinfection cabinet | minimal: `mode` `status` `left-time` |
| `iot.steriliser.gc01t` | — | — |

**`uvfive.steriliser.suger` is essentially the same device as ours**: the profile *is* the duration (15/30/60 min), there is a single Busy state, and all it reports is remaining time — none of the fan/heat/light multi-actuator semantics. Our fixed 180 s profile lands exactly on `mode`.

That matters: **the Mi Home side needs no new category and no custom model.** Report as `sterilizer` and the Mi Home app renders the right control card (switch + profile + countdown), and Xiao Ai understands "turn on the steriliser".

## 4. Class 3 — Mi Home hardware we could carry the load with

| Module | Chip | Notes |
| --- | --- | --- |
| **MHCB07P** | Realtek RTL8762CGL | the module inside Mi Home BLE-Mesh relays; officially 5.99 CNY, **not sold to individuals**; datasheet is confidential |
| **MHCB12S** | — | supports Mi Home BLE Mesh 2.0 |

The 8-pin breakout board behind the module is silkscreened `GND / 3V3 / W / Y / R / G / B / AC`; `W` is the single output (3.3 V high). The relay only uses `W` and `AC`.

What the factory firmware already offers from the Mi Home app:

- on/off, schedules, countdown, power-on default state;
- **inching delay 1–7199 s** (`click-one-timeout`), auto-off when it expires;
- "lingdong" (toggle on power loss), LED mode, relay state readback.

⟹ "inching 180 s" *is* our fixed profile. **A 20 CNY Mi Home relay already covers everything this device does except the log.**

Also: Mi Home BLE-Mesh schedules and countdowns are **dispatched by the gateway/cloud**, not stored on the device. So after migrating, the 4-slot schedule table, the soft-timer subsystem and the log queue can be deleted outright — **fewer features to implement, less code**.

## 5. Property mapping: 15 private commands → sterilizer

| Our command | Current behaviour | Mi Home equivalent |
| --- | --- | --- |
| `04` | on/off now, with a duration | `on`(bool) + `target-time` |
| `02` | status query + time sync | `status` + `working-time` + `left-time` |
| profile (`+0x60`) | profile duration table | `mode` |
| `0x64D0` teardown | completed / aborted | `fault` = 1 done / 2 aborted |
| `03` | battery percentage | standard `battery-level` service |
| `07` / `08` | 4-slot local schedule | **not needed** — the gateway schedules |
| `05` / `06` | 200 log records (stack) | no equivalent; keep as a private service or drop it |
| `09` / `A2` / `A3` / `A5` / `A4` | serial / MAC / version | handled by Mi Home provisioning and OTA |
| `A0` | factory reset | Mi Home "remove device / reset" |

In one sentence: **the business semantics are a superset and map cleanly; the engineering stack is a different one and does not.**

## 6. Three ways to land it

| Route | Approach | Firmware change | What survives | Cost / risk |
| --- | --- | --- | --- | --- |
| **1. Hardware bridge** | Leave the board untouched; hang a Mi Home relay off it and drive the disinfection loop from its `W` pin (or make the Mi module a BLE central that talks to the original) | **zero** | only on/off + inching | one hardware rewire; two power supplies; the mini program still works |
| **2. Replace the control board** | drop the original MCU, let the Mi relay module drive the load | **zero** | full Mi Home, but the log and local schedules are gone | irreversible (the original board is removed); need a module source |
| **3. Write our own Mi Mesh firmware** | Mi mesh SDK on the TLSR8258, implement the `sterilizer` model | **whole business layer rewritten** | everything, including `mode`/`left-time` | needs a PID plus the certification library; the personal-developer programme is currently "closed, quota full"; the library needs a company |

The barriers differ a lot, but **none of them requires forging someone else's PID**: routes 1 and 2 use modules that are already certified, and route 3 goes through official registration.

## 7. Recommendation

Prototype route 1 first. It touches no firmware, is fully reversible, and immediately answers the real question: will Mi Home display and control this device correctly? Once that is proven, decide whether the `left-time` countdown and profile display are worth route 3.

Route 2 only makes sense if the original board is already dead or the mini program is definitively abandoned — it turns a reversible modification into an irreversible one.

## 8. Appendix: where the L1 broadcast patch fits

The broadcast layer was originally going to be a static patch (replace the trailing `07 FF AA AA AA AA AA AA` of the scan response with a MiBeacon frame). **That approach is proven impossible**: those six `AA` bytes are a placeholder for the MAC and are overwritten before every broadcast, and the element reserves only 8 bytes, too few for MiBeacon's mandatory fields.

⟹ The broadcast has to be **generated in code**. See the [route 3 analysis](mi-home-route3.en.md) §3. What remains in the repo is `tools/mibeacon.py`, the encode/decode reference for this layer (with a self-test), usable to validate any MiBeacon frame.
