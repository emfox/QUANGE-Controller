# Mi Home: feasibility and boundaries

The stock firmware speaks only a WeChat mini program plus a private BLE protocol. It has **never**
been connected to Mi Home. This document answers three questions: how much protocol work
integration needs, whether the category fits, and what the identity gate actually requires.

**Conclusion**: the protocol layer is ours to build, and the business semantics map almost
one-to-one onto Mi Home's `sterilizer` category. The real barrier is **one cloud-side `(PID, MAC)`
registration record**, not the frame format.

> Status: **paused** (2026-11-08). The code and conclusions stay; resume once the identity question
> has an answer.

---

## 1. What this unit is

**QUANGE smart sterilising toothbrush cup holder, model WY020702** (brand QUANGE, Shanghai Laifeng
Household Products Co., Ltd.).

| Evidence in the firmware | The real product |
| --- | --- |
| broadcast name `QUANGE-WY020702` (`0xCCEB`) | brand QUANGE + model WY020702 |
| serial `LFWY020702/…` (flash `0x43000`) | same, `LFWY` + model |
| model string `Hi-YM01-12DC2110000` (`0x2F8C`) | internal part number |
| battery query (command `03`, RAM `0x8435A0`) | battery powered — this variant is the cell version |
| four local schedule slots | the manual says "auto-sterilise every 6 hours", four times a day |
| fixed 180 s profile (`0x6538`, `+0x35 != 0`) | UVC exposure time |
| long-press flag `+0xB` | the manual says "long press to toggle, double press to force a cycle" |

The reviews also mention a "smart radar sensor that only works when nothing moves within 1.5 m";
which GPIO that maps to is still unresolved.

**Its "Mi Home compatibility" is about size, not protocol.** The review's wording is "fits all
Mijia electric toothbrushes" — the holder slots are wide enough. That is the norm in this category:

| Kind | Test | Example |
| --- | --- | --- |
| genuinely integrated | shows up in Mi Home, binds, can be controlled | FIVE, Ziwooo, Xiaomi's own |
| marketing only | "fits Mijia", "sold on Youpin", "ecosystem brand" — not connected | this unit, Oclean S1 |
| a different ecosystem | its own app or mini program | most white-label holders |

Oclean S1 is the clearest case: sold on Youpin, made by a Huami-affiliated brand, and it has **no
PID, no model and no wireless connectivity of any kind**. Every operation in its official FAQ is on
the device itself — auto every 6 hours for 2 minutes, pull the cord for a 5 minute cycle, powers
down when removed from the wall; the spec sheet lists only a 1000 mAh cell, Type-C, UVC-LED, a blue
indicator and a hall switch. Its "every 6 hours" is the same idea as this unit's four slots, which
shows the **default shape of this category is not connected at all**.

## 2. The Mi Home category: `sterilizer` and its released models

Mi Home has a formal device type `urn:miot-spec-v2:device:sterilizer:0000A04F`. Released models:

| Category | Model | Product ID | Protocol | Vendor | Released |
| --- | --- | --- | --- | --- | --- |
| `sterilizer` | `uvfive.steriliser.maine` (FIVE smart knife/chopstick steriliser) | **6638** | **Wi-Fi** | FIVE | 2021-11 |
| `sterilizer` | `xiaomi.steriliser.uvs01` (Mijia smart steriliser, 25 L) | **25643** | **Wi-Fi** | Xiaomi | 2025-10 |
| `germicidal-lamp` | `uvfive.s_lamp.slmap2` (FIVE smart UVC lamp) | **68812** | **MiIO/Wi-Fi** | FIVE | 2020-03 |
| `germicidal-lamp` | `ziwooo.s_lamp.uvc` (Ziwooo UVC lamp Pro) | **70276** | **MiIO/Wi-Fi** | Ziwooo (Shanghai) | 2020-09 |
| `foot-bath` | `xiaomi.foot_bath.mizs1` (Mijia **sterilising** foot bath) | **13223** | **BLE Mesh** | Xiaomi | — |

All four Wi-Fi/MiIO devices say "gateway required: no" — they join the router.

`uvfive.steriliser.suger` has a spec but no product page (`/p/` returns 404, only a `v2debug` tag):
an **unreleased template** with no PID. Its service tree is exactly the one we would want:

`fault` · `mode` (15/30/60 min) · `on` · `status` (Idle/Busy) · `target-time` (15–60, step 15)
· `working-time` · `left-time`, plus `alarm`, `physical-controls-locked` and `door`.

**Key fact: this category has no BLE model at all.** And the PID does not just tag the category, it
picks the **provisioning channel** — given a Wi-Fi PID, Mi Home runs the Wi-Fi flow, so a BLE
device does not even behave correctly at the discovery stage. "Borrow a sterilizer PID for a BLE
device" is therefore the empty set.

The only BLE one is the foot bath `13223`, which is a foot bath and is mesh.

## 3. Attribute mapping

### 3.1 Via `sterilizer` (best semantics, but the category is Wi-Fi only)

| Our command | Current behaviour | Mi Home equivalent |
| --- | --- | --- |
| `04` | start / stop + set duration | `on` (bool) + `target-time` |
| `02` | state query + time sync | `status` + `working-time` + `left-time` |
| profile (`+0x60`) | per-profile duration table | `mode` |
| `0x64D0` teardown | completed / aborted | `fault` = 1 completed / 2 aborted |
| `03` | battery percentage | standard `battery-level` service |
| `07` / `08` | four-slot local schedule | not needed — the gateway/cloud schedules |
| `05` / `06` | 200 log records (stack) | no equivalent; keep as a private service or drop |
| `09` / `A2` / `A3` / `A5` / `A4` | serial / MAC / version | taken over by Mi Home auth and OTA |
| `A0` | factory reset | Mi Home's "remove device / reset" |

The business semantics are a superset and fit; the engineering is a different stack.

### 3.2 Via switch / relay (BLE models are plentiful)

Switch-category PIDs are real, working BLE devices and the semantics suffice:

| Model | Product ID | Protocol | Vendor | Released |
| --- | --- | --- | --- | --- |
| `wainft.switch.sw0a02` (XG BLE-Mesh relay) | **4380** | BLE Mesh | Xingguang | 2021-03 |
| `zxlink.switch.zxltdq` (Zhixianglian Mesh 2.0 relay) | **35553** | BLE Mesh | Zhixianglian | 2026-04 |
| `bean.switch.bl04` (four-gang no-neutral switch V2 Mesh) | **14918** | BLE Mesh | Yishu | 2023-08 |

The spec of `wainft.switch.sw0a02` is almost exactly this device:

| Spec property | Range | Ours |
| --- | --- | --- |
| `switch.on` | bool | command `04` |
| `function.jog` | 0 off / 1 on | inching mode |
| `function.delaytime` | **1–3600 s** | the 180 s fixed profile fits |
| `function.default` | ON / OFF / Memory | power-on default |
| `function.inteligent-switch` | 0 / 1 | toggle on power loss |
| `function.device-reset` | write 1 | factory reset |
| `remote.*` | 8 remote slots | no equivalent |

The `zxlink.switch.zxltdq` FAQ also says: "in the Mi Home app, switch the device from gateway mode
to **BLE direct mode**" — this category already has a phone-direct, no-gateway mode.

The cost is that it shows up as a relay, not a steriliser. The PID decides the category.

## 4. The gate: three doors

| Door | What it blocks | Official wording |
| --- | --- | --- |
| ① Discovery | the PID must be in the platform's product table and visible to the account | "without `PRODUCT_ID` it defaults to 156, the Xiaomi BLE dev board; **this product is visible to whitelisted users only**" |
| ② Binding | the cloud issues a token per MAC | "confirm the device is online, or that **the user's Xiaomi ID is in the device whitelist**"; "binding fails after changing the PID, most likely because **it is not on the server**" |
| ③ Mesh provisioning | certificate chain | "for high-security or mesh certification, **each secure element / certificate chain can bind only one PID and MAC**; to change either, replace the secure element" |

And: "when flashing the module … a **full-chip erase** destroys the **certificate chain** and
provisioning will fail."

The dividing line:

| Certification | Gate | Can we make it? |
| --- | --- | --- |
| standard BLE direct | PID + token (token issued by the cloud per MAC) | token is ours to choose, but **the cloud does not know this MAC**, so login fails |
| high-security / Mesh | certificate chain, one per chip | **no** — issued by Xiaomi, not manufacturable |

**This unit is direct-connect** (private GATT `1001`/`1002`, phone direct, not mesh), so there is
only one direction: the `0xFE95` direct branch. The mesh branch is a certificate-chain wall and
physically unreachable; direct connectivity is one cloud record short, and the existing `1001` can
keep running in parallel, so the mini program still controls the device if anything goes wrong.

## 5. Application channels

**Enterprise group**: the "Become a developer" page says "currently the Xiaomi IoT platform is open
to enterprise developers only" and "only to companies registered in mainland China", requiring a
business licence, legal representative and address. One detail is worth asking about:
"**excluding individual businesses**" appears only in the *service-provider admission rules*;
**the enterprise-developer registration docs contain no such exclusion**, so whether an individual
business can register is not explicitly closed.

**The personal-developer channel** exists: opened for internal testing on 2023-12-01 (first 1,000
places, one module dev board each, five working days for review), currently marked "internal-testing
quota full, temporarily closed". Its permissions fit exactly:

| Permission | What it means for us |
| --- | --- |
| no product creation; use built-in templates | no PID to apply for |
| templates include light, switch, socket, **relay/contactor**, curtain motor | relay is the category we need |
| cannot change template functions | enough: `on` + inching + delay are all there |
| cannot ship or share | we only need it for ourselves |
| **can control the device with your own account** | that is the goal |
| firmware to the device + extension to the **debug build of Mi Home** | ← the key line |

That last row matters: personal developers use the **debug build of Mi Home**, which does not
consult cloud visibility. So door ① and half of door ② do not exist on this path, and there is no
launch review or hardware evaluation. What it does not solve is the Mesh certificate chain — only
standard BLE direct is possible, which matches the direction already chosen.

What can be done now: log into iot.mi.com and check whether "apply for personal-developer internal
testing" is live (the "quota full" note may be stale), and open a ticket asking two things — when
internal testing reopens and whether there is a waiting list, and whether an individual-business
licence can register an enterprise group.

## 6. Three implementation routes

| Route | Approach | Firmware change | Keeps | Cost |
| --- | --- | --- | --- | --- |
| **bridge** | leave the board alone, add a Mi Home relay to drive the load | **0 lines** | Mi Home gets on/off + inching only | wiring; two power supplies; the mini program keeps working |
| **replace the board** | remove the OEM MCU, drive the load from a Mi Home module | **0 lines** | full Mi Home, loses logs and local schedule | irreversible |
| **write the firmware** | run the Xiaomi SDK on TLSR8258, implement the `sterilizer` model | business layer rewritten | full control | needs PID + auth library |

None of them requires faking someone else's PID: the first two use certified modules, the third
goes through official registration.

Carrier hardware: **MHCB07P** (Realtek RTL8762CGL, listed at ¥5.99, **not sold to individuals**)
and **MHCB12S** (Mesh 2.0). The 8-pin breakout behind the module is
`GND / 3V3 / W / Y / R / G / B / AC`, where `W` is a single output. The factory firmware already
has **inching delay 1–7199 s** — the 180 s profile fits inside. Mi Home Mesh schedules timers and
countdowns in the gateway/cloud rather than a local table, so migrating makes the four-slot table
and the soft timers redundant.

## 7. The broadcast layer has to be generated in code

The scan-response template at `0xCD00` ends with `07 FF AA AA AA AA AA AA`. Using it as a MiBeacon
slot does **not** work:

```
0x47D0  r0 = sp + 0x14                      ; advertising buffer on the stack
0x47D2  r7 = 0xCD00                         ; template
0x47D8  tloadm / tstorem x2                 ; copy 27 bytes
0x47E6  byte[r4+5] -> buf[21]
  ...                                        ; six tloadrb/tstorerb
0x47FC  byte[r4+0] -> buf[26]                 ; r4's 6 bytes, reversed, into buf[21..26]
0x47FE  r1 = 27                             ; length hardcoded
0x4800  tjl 0x90F8                          ; set advertising data
```

Offsets `21..26` are exactly those six `AA` bytes, and they are **overwritten by the real MAC
before every broadcast**. The element also reserves only 8 bytes, while MiBeacon's mandatory fields
(company 2 + Frame Control 2 + PID 2 + Frame Counter 1) need 9.

=> The broadcast must be generated in code. For MiBeacon that is the only option anyway: the frame
counter increments and capability/objects follow device state, which no static template can do.

`tools/mibeacon.py` is the encode/decode reference for this layer (self-tested against a real
LYWSD03MMC advertising frame) and can validate any MiBeacon frame.

## 8. Protocol sandbox: no Xiaomi resources needed

Play the phone side ourselves, with **a token of our own choosing**, never touching the cloud:

- device side: MiBeacon + `0xFE95` + standard login, token compiled in;
- host side: Python + `cryptography` (ECDH P-256, HKDF-SHA256, AES-CCM-128);
- run the whole "discover → bind → login → encrypted attribute read/write" flow.

Checklist, each independently decidable:

1. the advertisement parses as MiBeacon with correct PID / frame counter / capability;
2. the `0xFE95` service and characteristic table match the spec;
3. ECDH public-key exchange succeeds and both sides derive the same shared secret;
4. the HKDF session keys match;
5. the bind packet (device public key + CRC32) decrypts and verifies;
6. attribute reads/writes decrypt correctly after login;
7. a reconnect performs login, not binding;
8. the binding survives a power cycle.

The value: **once a whitelist entry or our own PID exists, only the PID and token constants
change — nothing else.**

What has to be implemented on TC32, by effort:

| # | Item | Reference |
| --- | --- | --- |
| 1 | MiBeacon transmission (frame counter, capability, objects) | `tools/mibeacon.py` |
| 2 | `0xFE95` service and characteristics | align with `mible_server_miservice_init`; do not invent UUIDs |
| 3 | standard login: ECDH P-256 + HKDF-SHA256 + AES-CCM-128 | the firmware has only a TRNG; **AES/ECC/SHA must all be written** |
| 4 | miot-spec attribute mapping | §3 |
| 5 | coexistence with the existing `1001`/`1002` | two GATT services can coexist |

Item 3 is the real work: AES-128, CCM, P-256 point multiplication, SHA-256 and HKDF on TC32.

## 9. Open questions

- whether the 6 bytes `r4` points at are the BLE address (reversed, length 6 — strongly implied, not
  verified by reading memory on the device);
- whether the advertising length constant `27` is set only at `0x47FE`, or elsewhere too;
- to verify the broadcast on hardware, one scan-response capture with nRF Connect settles it, with
  no code change.
