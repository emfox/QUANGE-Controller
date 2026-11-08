# Route 3: can the whitelist be avoided, and how far can "pretending to be a sterilizer" go

2026-11-08. Two questions: can the device be disguised as a sterilizer without applying for the official whitelist; and if not, what is left of route 3.

**Answer**: getting into the Mi Home app cannot be avoided — all three gates are cloud identity, not frame format. But **protocol-level self-testing can be done with zero dependence on Xiaomi**, because we can play the phone's role ourselves.

---

## 1. Three gates, with the official wording

| Gate | What blocks it | Official text |
| --- | --- | --- |
| ① App discovery | the Product ID must exist in the platform's product table and the account must be in its visible scope | "If `PRODUCT_ID` is not defined it defaults to 156, the Xiaomi Bluetooth dev board, and **this product is visible only to whitelisted users** (apply for whitelist permission to use this PID for functional verification)" |
| ② Binding | the cloud issues the token for that MAC | "check whether the device is online, or whether **the user's Xiaomi ID is in the device's whitelist**"; "binding fails after changing the PID, most likely because the **server side is not live**" |
| ③ Mesh provisioning | the certificate chain | "for high-security or mesh authentication, **each secure chip / certificate chain can only be bound to one PID and one MAC**; to change the PID or MAC, replace the secure chip / certificate chain" |

Plus: "when flashing firmware… if the module is **fully erased** the **certificate chain is lost** and provisioning can never succeed."

Together those draw the line:

| Auth mode | Requirement | Can we make it ourselves |
| --- | --- | --- |
| Standard (weak binding) BLE direct | PID + token, the token being issued by the cloud for that MAC | the token can be anything we like, but **the cloud does not know this MAC**, so login always fails |
| High-security / Mesh | certificate chain, one per chip | **no** — Xiaomi issues it |

So what "pretending to be a sterilizer" lacks was never the frame format. It is **one registration record in the cloud**.

## 2. Good news: this device is already a direct-connection device

The current firmware exposes private GATT services (`1001`/`1002`) and the phone or mini program connects straight to it. It is **not** mesh.

⟹ Route 3 should take the **`0xFE95` direct branch**, not a mesh conversion:

- the mesh path is a certificate-chain wall and physically impassable;
- the direct path is short exactly one cloud registration, and its protocol stack is fully documented in public;
- the change surface is far smaller: the existing `1001` service can stay and run in parallel, so the mini program still works as a fallback.

## 3. Correction: the L1 broadcast patch cannot be a static patch

The earlier "L1 is done" claim (`591725f`) **is wrong**. Reading `0x47D0` in full:

```
0x47D0  r0 = sp + 0x14                      ; broadcast buffer on the stack
0x47D2  r7 = 0xCD00                         ; template
0x47D8  tloadm / tstorem x2                 ; copy 27 bytes onto the stack
0x47E6  byte[r4+5] -> buf[21]
0x47E8  byte[r4+4] -> buf[22]
  ...                                        ; six tloadrb/tstorerb pairs
0x47FC  byte[r4+0] -> buf[26]                ; write r4's six bytes reversed into buf[21..26]
0x47FE  r1 = 27
0x4800  tjl 0x90F8                          ; set the broadcast data (length hardcoded to 27)
```

The template at `0xCD13` is `07 FF AA AA AA AA AA AA`, and offsets **21..26 are exactly those six `AA` bytes**. In other words:

**those six bytes are a placeholder for the MAC and are overwritten with the real MAC before every broadcast.**

The previous patch wrote company / Frame Control / PID into those six bytes, putting the PID at offsets 25 and 26 — **wiped by the low two bytes of the MAC on every boot**. What goes on air is not a MiBeacon.

There is also no room in the layout: the template reserves 8 bytes for that AD element (`07 FF` + 6), while MiBeacon mandates Frame Control(2) + Product ID(2) + Frame Counter(1), which needs 9 bytes including the company ID.

⟹ **The broadcast layer has to be generated in code, not patched in a template.** MiBeacon cannot be a static template anyway: the frame counter increments and capability/object are filled from state.

`tools/mi_patch.py` has therefore been deleted, and the "L1 needs no code change" conclusion is withdrawn. Nothing is lost: route 3 has to write its own broadcast regardless, and finding this now beats finding it after flashing.

## 4. How far "pretending to be a sterilizer" goes

| Layer | Achievable | Does Mi Home accept it |
| --- | --- | --- |
| Broadcast | a fully valid MiBeacon with any PID | **no** — the PID is not in the product table, or the account is not whitelisted |
| `0xFE95` + standard auth | complete handshake, AES-CCM encrypted read/write, behaviour identical to a real device | **no** — the cloud has no token for this MAC |
| App shows it as a "sterilizer" | needs a PID + MAC + token registered under the `sterilizer` category | **impossible**, the PID is assigned when a product is created |

The third row is a dead end; the first two are "protocol correct, identity missing".

## 5. Three things possible without applying for anything

### 5.1 Protocol sandbox (recommended, the only zero-dependency path)

Play the phone's role. **We choose the token**, so no cloud is involved:

- device side: MiBeacon + `0xFE95` + standard login, the token fixed at compile time;
- host side: Python + `cryptography` (ECDH P-256, HKDF-SHA256, AES-CCM-128) acting as the Mi Home app;
- exercise discovery → binding → login → encrypted property read/write end to end.

Checklist, each independently decidable:

1. the broadcast parses as MiBeacon with correct PID / counter / capability;
2. the `0xFE95` service and characteristic table match the spec;
3. the public-key exchange succeeds and both sides derive the same shared secret;
4. HKDF produces identical session keys;
5. the binding packet (device public key + CRC32), once encrypted, verifies on the other side;
6. property read/write after login decrypts correctly;
7. a reconnect goes through login rather than binding;
8. binding data survives a power cycle (correct flash persistence).

The value: **once a whitelist or our own PID arrives, only two constants change — PID and token — and nothing else.**

### 5.2 Borrow a real module (zero whitelist, but the identity is a relay)

Take apart a Mi Home BLE-Mesh relay: the certificate chain, PID and MAC in that module are real and already registered in the production system. It joins Mi Home, switches, and can do a 180 s inching pulse. But it shows up as a **relay**, not a sterilizer — that is decided by the PID.

### 5.3 Wait for the whitelist

The personal-developer programme is currently "closed, quota full"; enterprise developers need a business licence. Not a technical question.

## 6. Recommended order

1. **Sandbox** (most of it doable this week): get the stack and the property mapping working locally, with no Xiaomi resources at all;
2. then fix the application layer against the `sterilizer` property set (`on` / `mode` / `status` / `target-time` / `working-time` / `left-time` / `fault`), see the [comparable-device survey](mi-home-migration.en.md) §3;
3. only then decide where the identity comes from: our own PID, or 156 plus a whitelist for verification.

The sandbox does not depend on that decision, so the work is not wasted.

## 7. What the sandbox must implement on the TC32

| # | Item | Reference |
| --- | --- | --- |
| 1 | MiBeacon transmission (counter, capability, object) | `tools/mibeacon.py` is the Python reference for this layer and self-tests |
| 2 | `0xFE95` service and characteristics | align with `mible_server_miservice_init` semantics; do not invent UUIDs |
| 3 | standard login: ECDH P-256 + HKDF-SHA256 + AES-CCM-128 | the firmware only has a TRNG today — **AES and ECC must be written from scratch**; this is the bulk of the work |
| 4 | miot-spec property mapping | see the comparable-device survey §5 |
| 5 | run in parallel with the existing `1001`/`1002` private service | two GATT services can coexist |

Item 3 is the real effort: AES-128, CCM mode, P-256 point multiplication, SHA-256 and HKDF all have to be added to the TC32 image. Only the TRNG exists.

## 8. Open questions

- Is the six-byte block at `r4` really the BLE address? (reversed write plus a length of six is strong evidence, but it has not been confirmed by reading RAM on the device.)
- Is the hardcoded broadcast length `27` at `0x47FE` the only place it is set, or is it reset elsewhere?
- If L1 ever needs verifying on hardware, one scan-response capture in nRF Connect settles it — no code change required.

## 9. Appendix: product IDs found (surveyed 2026-11-08)

### 9.1 Sterilizer / germicidal categories — all Wi-Fi

| Category | Model | Product ID | Protocol | Vendor | Released |
| --- | --- | --- | --- | --- | --- |
| `sterilizer` | `uvfive.steriliser.maine` (FIVE smart knife/chopstick steriliser) | **6638** | **Wi-Fi** | FIVE | 2021-11 |
| `sterilizer` | `xiaomi.steriliser.uvs01` (Mijia smart steriliser, 25 L) | **25643** | **Wi-Fi** | Xiaomi | 2025-10 |
| `germicidal-lamp` | `uvfive.s_lamp.slmap2` (FIVE smart UVC lamp) | **68812** | **MiIO/Wi-Fi** | FIVE | 2020-03 |
| `germicidal-lamp` | `ziwooo.s_lamp.uvc` (Ziwooo UVC lamp Pro) | **70276** | **MiIO/Wi-Fi** | Ziwooo (Shanghai) | 2020-09 |
| `foot-bath` | `xiaomi.foot_bath.mizs1` (Mijia **sterilising** foot bath) | **13223** | **BLE Mesh** | Xiaomi | — |

All four Wi-Fi/MiIO devices are listed as "gateway required: no" — they join the router, not Bluetooth.

Separately, `uvfive.steriliser.suger` **has a spec but no product page**: its service tree is the
standard seven-property model (`fault` / `mode` 15·30·60 / `on` / `status` Idle·Busy /
`target-time` 15–60 step 15 / `working-time` / `left-time`, plus `alarm`,
`physical-controls-locked` and `door`), yet `home.miot-spec.com/p/uvfive.steriliser.suger` is a 404
and the page only carries a `v2debug` tag. ⟹ an **unreleased template**, with no PID.

Conclusion: **there is no BLE model in this category at all.** And the PID does not just tag the category, it picks the **provisioning channel** — given a Wi-Fi PID, Mi Home runs the Wi-Fi flow, so a BLE device does not even behave correctly at the discovery stage. "Borrow a sterilizer PID" is the empty set.

The only BLE one is the foot bath `13223`, which is a foot bath and is mesh (certificate chain).

### 9.1b Correction: the Oclean S1 has **no PID and no app at all**

The previous version held the Oclean S1 up as an example of genuine Mi Home integration. **Wrong.**
Checked against the official product page and Oclean's own FAQ:

- it is not in `home.miot-spec.com` — **no model, no PID**;
- every operation in the official FAQ happens on the device itself: "hanging on the wall it
  auto-sterilises every **6 hours for 2 minutes**; pull the cord once for a **5 minute** cycle, then
  back to standby; take it off the wall and it powers down";
- the spec sheet lists a 1000 mAh cell, Type-C, UVC-LED plus a blue indicator and a hall switch —
  **no wireless connectivity item of any kind** (no BLE, no Wi-Fi).

⟹ The Oclean S1 is a **purely electromechanical timer product** that merely *sells* on Youpin. Its
"every 6 hours" is the same design idea as this unit's four slots, which shows that **the default
shape of this category is not connected at all**.

Genuinely integrated: only FIVE (6638 / 68812), Ziwooo (70276) and Xiaomi itself (25643) — and all
four of those are **Wi-Fi**.

### 9.2 Switch / relay category — BLE Mesh is everywhere

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
| `function.default` | ON / OFF / Memory | power-on default state |
| `function.inteligent-switch` | 0 / 1 | toggle on power loss |
| `function.device-reset` | write 1 | factory reset |
| `remote.*` | 8 remote slots | no equivalent |

⟹ If a PID must be borrowed, `4380` is semantically the closest: right category, right provisioning channel, and an inching range that covers our 180 s.

One more thing worth recording from the `zxlink.switch.zxltdq` FAQ: "in the Mi Home app, switch the device from gateway mode to **BLE direct mode**" — so this category already has a phone-direct-connection mode without a gateway.

**But be clear**: borrowing a PID only makes the category and provisioning channel line up; it does not supply an identity. Binding still needs the cloud's (PID, MAC) record, and Mesh still needs the certificate chain. This section is reference data, not a pass.

## 10. The application route: is there really no door for individuals

### 10.1 The official line: enterprises only

The "Become a developer" page says: "**currently the Xiaomi IoT platform is open to enterprise developers only**" and "only to companies registered in mainland China". An enterprise group must supply full name, short name, identifier (3–6 lowercase letters or digits), legal representative, address and business licence.

Read literally, there is no door for an individual.

### 10.2 But the personal-developer channel exists, and its permissions fit exactly

The personal developer programme opened for internal testing on **2023-12-01**: first batch 1,000 places, one free module dev board each, five working days for review. The documentation page currently carries: "**internal-testing quota is full, temporarily closed**".

What it actually grants:

| Personal-developer permission | What it means for us |
| --- | --- |
| **no need to create a product**; use a built-in template | no PID to apply for |
| templates include **light, switch, socket/strip, relay/contactor, curtain motor**, plus a custom template | "relay/contactor" is exactly our category |
| cannot add or modify template functions | enough: `on` + inching + delay are in the template |
| cannot ship the product, cannot share the device | we only need it for ourselves |
| **can control the device with your own account** | that is the goal |
| firmware flashed to the device + extension flashed to the **debug build of the Mi Home app** | ← the key line |

That last row matters: personal developers use a **debug build of the Mi Home app**. Which means the wall "the PID must be visible to your account" does not exist on this path — the debug build does not consult cloud visibility. Equally, no launch review and no shipping hardware to Xiaomi for evaluation.

In other words: **gate ① (app discovery) and half of gate ② (pre-binding visibility) are bypassed here.**

### 10.3 What this path still does not solve

**The Mesh certificate chain.** Flashing your own board means no certificate chain, so it cannot be a Mesh device; it has to be **standard BLE (MiBeacon) direct** — which is the shape we already chose. The constraint matches the route, so there is no conflict.

### 10.4 Whether the enterprise route is worth trying depends on one question

A business licence is a hard requirement, no way around it. But note one detail:

- "enterprises registered in mainland China (**excluding individual businesses**)" appears in the *service-provider admission rules*;
- **the enterprise-developer registration docs contain no such exclusion.**

So whether an individual business (个体工商户) can register an enterprise group is not explicitly closed. That is a zero-cost question to ask — and in Hangzhou an individual business licence is essentially free and takes 1–3 days online.

### 10.5 Three things to do right now

1. **Check the entry point's live state**: log into iot.mi.com → console → "register as developer" → see whether "apply for personal-developer internal testing" is clickable. The "quota full" note in the docs may be stale; the live state of the button is what counts.
2. **Open a ticket with two questions** (tag "other" → service enquiry):
   - when personal-developer internal testing reopens, and whether there is a waiting list;
   - **whether an individual-business licence can register an enterprise developer group**.
3. If the answer to #2 is yes, getting the licence is the fastest deterministic path; if no, the only options are waiting for a quota or the university programme.

Steps 1 and 2 cost minutes. Do them before spending money on a licence.

## 11. How those "Mi Home integrated" toothbrush sterilisers actually work

### 11.1 First, an identification: this device is one of them

The evidence lines up — this unit is the **QUANGE (全格) smart sterilising toothbrush cup holder, model WY020702**, from Shanghai Caifeng Daily Necessities Co.

| Evidence in the firmware | The real product |
| --- | --- |
| broadcast name `QUANGE-WY020702` (`0xCCEB`) | brand QUANGE plus model WY020702 |
| serial `LFWY020702/…` (flash `0x43000`) | same, `LFWY` + model |
| model string `Hi-YM01-12DC2110000` (`0x2F8C`) | internal part number |
| battery query (command `03`, RAM `0x8435A0`) | battery powered — this variant is the cell version |
| four local schedule slots | the manual says "auto-sterilise every 6 hours", i.e. four a day |
| fixed 180 s profile (`0x6538`, `+0x35 != 0`) | UVC exposure time |
| long-press arms / short-press acts (`+0xB` flag) | the manual says "long press to toggle, double press to force a cycle" |

The reviews also mention a "smart radar sensor that only works when nothing moves within 1.5 m" — which GPIO that maps to in the firmware is still unresolved.

### 11.2 But its "Mi Home compatibility" is about size, not protocol

The review's exact wording is "**fits all Mijia electric toothbrushes**". That means the holder slots are wide enough, not that it joins the Mi Home app.

Its actual connection is the vendor's own WeChat mini program plus a private BLE protocol — the 15 commands reverse-engineered in `docs/protocol`. So this device **was never connected to Mi Home**; "make the firmware speak Mi Home" is really adding a path it never had.

### 11.3 How third parties that genuinely integrate do it

Take FIVE's knife/chopstick steriliser (`uvfive.steriliser.maine`, PID 6638). The path is the
standard three pieces, none skipped:

1. **enterprise identity**: business licence → Xiaomi IoT enterprise group;
2. **a Xiaomi module**: Wi-Fi module (with its triplet) or BLE module (with its certificate chain) — bought, already certified;
3. **a platform-registered PID**: assigned when the product is created, written into the firmware, bound to the MAC in the production system.

So they did not bypass the barrier — they **walked through it**, by obtaining the qualification, the module and the production registration.

Note their own choice of transport: both 6638 and 25643 say "gateway required: **no**", because they
talk to the router directly. **This category never even entered the BLE stack** — the gateway
question does not arise for them.

### 11.4 Three kinds of "Mi Home integrated"

| Kind | Test | Example |
| --- | --- | --- |
| **genuinely integrated** | shows up in Mi Home, binds, can be controlled | FIVE (6638 / 68812), Ziwooo (70276), Xiaomi (25643) |
| **marketing adjacency** | only "fits Mijia brushes", "sold on Youpin", "Mijia ecosystem brand" | this unit, WY020702, **Oclean S1** |
| **a different ecosystem** | its own app or mini program, borrowing the smart-home aura | most white-label holders |

Oclean S1 deserves its own line: it is sold on Youpin, made by a Huami-affiliated brand, and is
**completely unconnected**. It is not even "a different ecosystem" — it has no ecosystem, just a
timer and a hall switch.

The second kind is the majority. Which is why it looks like "everything has Mi Home" — **"Mijia" here is often a channel or a size, not a protocol**.
