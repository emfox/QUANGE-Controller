#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
probe.py - read-only device survey for the QUANGE WY020702 toothbrush holder

Answers the two open questions from the handoff (section 9, items 1 and 2):
    1. Does the device expose a Telink OTA service?  -> decides whether a
       no-disassembly firmware dump is even possible
    2. What does the whole GATT tree look like       -> confirms 00FB/1001/1002

Sends nothing that changes device state. The only writes are CCCD subscriptions
performed by the BLE stack itself.

Usage:
    python3 probe.py                 # scan, connect, dump, exit
    python3 probe.py --listen 20     # also watch notifications for 20s
    python3 probe.py -a AA:BB:CC:DD:EE:FF
    python3 probe.py --scan-only     # just list what is advertising
"""
import argparse
import asyncio
import os
import sys
from datetime import datetime

import blectx as bx

HERE = os.path.dirname(os.path.abspath(__file__))
LOGDIR = os.path.join(HERE, "logs")

# Telink OTA service, as implemented by the mini program.
TELINK_OTA = "00010203-0405-0607-0809-0a0b0c0d1912"
VENDOR_SVC = "000000fb-0000-1000-8000-00805f9b34fb"

_fh = None


def log(msg):
    print(msg, flush=True)
    if _fh:
        _fh.write(str(msg) + "\n")
        _fh.flush()


async def scan_only(timeout):
    found = await bx.scan_all(timeout)
    log(f"{'RSSI':>6}  {'NAME':30} {'ADDRESS':18} SERVICES")
    rows = sorted(found.values(),
                  key=lambda x: -((x[1].rssi if x[1].rssi is not None else -999)))
    for dev, adv in rows:
        name = adv.local_name or dev.name or "(unnamed)"
        uuids = ",".join(bx.short_uuid(u) for u in (adv.service_uuids or []))
        log(f"{str(adv.rssi):>6}  {name:30} {dev.address:18} {uuids}")
    log(f"[*] {len(rows)} devices in range")
    return 0


async def survey(a):
    client = await bx.connect(a.name, a.address, a.scan_time, a.connect_timeout,
                              on_disconnect=lambda _: log("[!] Device disconnected"))
    if client is None:
        return 1

    try:
        svc_uuids = [str(s.uuid).lower() for s in client.services]
        log(f"[*] {len(svc_uuids)} services discovered")

        await bx.dump_gatt(client, log=log, listen=a.listen)

        # ---- item 2: is there an OTA service? ----
        log("\n--------------- OTA check ---------------")
        has_ota = any(TELINK_OTA in u for u in svc_uuids)
        has_vendor = any(VENDOR_SVC in u for u in svc_uuids)
        log(f"Telink OTA service {TELINK_OTA}: {'FOUND' if has_ota else 'NOT PRESENT'}")
        log(f"Vendor service 0x00FB: {'FOUND' if has_vendor else 'NOT PRESENT'}")
        if has_ota:
            log("[result] A no-disassembly dump may be possible. Do NOT flash anything")
            log("         before a full factory backup exists.")
        else:
            log("[result] No OTA service, so no wireless dump path. Only SWS wiring")
            log("         could read the flash, which means opening the shell.")

        # ---- item 3 (cheap): firmware version ----
        target = bx.find_char(client, "1001")
        if target is not None:
            log("\n--------------- Firmware version ---------------")
            await client.write_gatt_char(target, bytes.fromhex("DB01A4"), response=False)
            log("[TX] DB 01 A4")
            await asyncio.sleep(2.0)
    finally:
        try:
            await client.disconnect()
            log("[*] Disconnected")
        except Exception:
            pass
        return 0


def cli():
    global _fh
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--name", default=bx.DEFAULT_NAME_SPEC,
                    help="advertising name prefix, alternatives separated by |")
    ap.add_argument("-a", "--address", default=None, help="connect by MAC")
    ap.add_argument("--scan-time", type=float, default=10.0)
    ap.add_argument("--connect-timeout", type=float, default=25.0)
    ap.add_argument("--listen", type=float, default=0.0,
                    help="seconds to watch notifications after subscribing")
    ap.add_argument("--scan-only", action="store_true",
                    help="list advertising devices without connecting")
    args = ap.parse_args()

    if args.scan_only:
        return asyncio.run(scan_only(args.scan_time))

    os.makedirs(LOGDIR, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(LOGDIR, f"probe_{stamp}.log")
    _fh = open(path, "a", encoding="utf-8")
    log(f"=== probe @ {datetime.now():%Y-%m-%d %H:%M:%S} ===")
    log(f"=== log: {path} ===")
    try:
        return asyncio.run(survey(args))
    except KeyboardInterrupt:
        return 130
    finally:
        _fh.close()


if __name__ == "__main__":
    sys.exit(cli())
