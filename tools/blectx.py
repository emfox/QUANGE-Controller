#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blectx.py - shared BLE context helpers (scan / match / connect)

Imported by set_timer.py; not meant to be run on its own.

One hard gotcha on Windows: you cannot hand a MAC address string to
BleakClient(address). You must scan first and connect with the BLEDevice object,
otherwise you often get:
    BleakDeviceNotFoundError: Device with address ... was not found.
This module centralises that workaround.

Device matching: three name prefixes (QUANGE / Hi- / kHID) plus a fallback on the
services advertised by the device. `kHID` is the Bluetooth module's factory
default name, and `Hi-` is the GAP name prefix, so matching only one of them
inevitably misses the device. The rules mirror NAME_FILTERS in phone.html.
"""
import asyncio

from bleak import BleakClient, BleakScanner


def short_uuid(u):
    u = str(u).lower()
    if u.startswith("0000") and u.endswith("-0000-1000-8000-00805f9b34fb"):
        return u[4:8]
    return u


def hexs(b):
    return b.hex(" ").upper() if b else ""


async def scan_all(timeout: float = 10.0):
    """Return {address: (BLEDevice, AdvertisementData)}"""
    res = await BleakScanner.discover(timeout=timeout, return_adv=True)
    # bleak 3.x guarantees a dict; older versions may return a list
    if isinstance(res, dict):
        return res
    return {d.address: (d, adv) for d, adv in res}


def _norm(a: str) -> str:
    return a.replace(":", "").replace("-", "").upper()


# Kept in sync with NAME_FILTERS in phone.html so the web page and the scripts
# never disagree about what counts as the device.
DEFAULT_NAME_PREFIXES = ("QUANGE", "Hi-", "kHID")
DEFAULT_NAME_SPEC = "|".join(DEFAULT_NAME_PREFIXES)

# The device always advertises 0x1812 (HID). That is firmware behaviour and does
# not depend on the name, which makes it far more reliable than name matching.
# The vendor mini program scans by this service only
# (conble.js: services: ["00001812-..."]).
HID_SERVICE = "00001812-0000-1000-8000-00805f9b34fb"
BATT_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb"


def _uuid_match(adv, want: str) -> bool:
    """Check whether an advertised service list contains `want`.

    bleak may report either a short UUID or a full 128-bit one, so both forms
    have to match.
    """
    keys = {want.lower(), want[:8].lower(), want[4:8].lower()}
    for u in (adv.service_uuids or []):
        ul = u.lower()
        if ul in keys or ul.startswith(want[:8].lower()):
            return True
    return False


def _looks_like_device(adv) -> bool:
    """Match on advertised services only - the name can be changed, the services cannot."""
    return _uuid_match(adv, HID_SERVICE) or _uuid_match(adv, BATT_SERVICE)


def _name_match(nm: str, spec: str) -> bool:
    """`|` or `,` in `spec` separates alternatives; any hit counts as a match.

    - The default DEFAULT_NAME_SPEC uses prefix matching, same semantics as
      Web Bluetooth's namePrefix filter.
    - A name supplied explicitly by the user uses substring matching, which
      helps when only part of the name is remembered.
    """
    if not nm:
        return False
    low = nm.lower()
    if spec == DEFAULT_NAME_SPEC:
        return any(low.startswith(p.lower()) for p in DEFAULT_NAME_PREFIXES)
    for part in spec.replace(",", "|").split("|"):
        part = part.strip().lower()
        if part and part in low:
            return True
    return False


async def find_device(name=DEFAULT_NAME_SPEC, address=None, timeout: float = 10.0,
                      quiet=False):
    """Scan once and locate the device by MAC or name.

    Returns (BLEDevice, AdvertisementData), or (None, None).

    Match order: MAC > name prefix > advertised service (0x1812 / 0x180F). The
    last tier covers the case where the device advertises under an arbitrary
    name - the service list cannot be changed.
    """
    if not quiet:
        print(f"[*] Scanning for {timeout:.0f}s ...")
    found = await scan_all(timeout)

    hits = []
    if address:
        n = _norm(address)
        for addr, (dev, adv) in found.items():
            if _norm(addr) == n or _norm(dev.address) == n:
                hits.append((dev, adv, 0))
    if name:
        for addr, (dev, adv) in found.items():
            nm = (adv.local_name or dev.name or "")
            if _name_match(nm, name):
                hits.append((dev, adv, 1))

    # Fallback: the name did not match but the advertisement looks right.
    # Name matching breaks once the device is renamed; services do not.
    seen = {id(h[0]) for h in hits}
    for addr, (dev, adv) in found.items():
        if id(dev) in seen:
            continue
        if _looks_like_device(adv):
            hits.append((dev, adv, 2))

    if hits:
        hits.sort(key=lambda x: (x[2], -((x[1].rssi if x[1].rssi is not None else -999))))
        dev, adv, how = hits[0]
        if not quiet:
            tag = {0: "by MAC", 1: "by name", 2: "by advertised service"}[how]
            print(f"[+] Matched {adv.local_name or dev.name or '(unnamed)'} @ {dev.address} "
                  f"({adv.rssi} dBm, {tag})")
        return dev, adv

    if not quiet:
        print(f"[!] No target found (name rule: {name!r}). Visible devices, strongest first:")
        rows = sorted(found.values(), key=lambda x: -((x[1].rssi if x[1].rssi is not None else -999)))
        for dev, adv in rows[:20]:
            print(f"    {str(adv.rssi):>4}dBm  {adv.local_name or dev.name or '(unnamed)':26}  {dev.address}")
        print("    -- If the target is missing: make sure it was powered on with a 3 s")
        print("       long-press; turn off phone Bluetooth so it is not hogging the link;")
        print("       try fresh batteries.")
        print("    -- The advertising name may be QUANGE-WY020702, or fall back to the")
        print("       module default kHID.")
        print("       Matching already fell back to the 0x1812/0x180F services; if it is")
        print("       still empty, pass -a <MAC> to address the device directly.")
    return None, None


async def connect(name=None, address=None, scan_time=10.0, timeout=20.0,
                  on_disconnect=None, quiet=False, retries=3):
    """Scan then connect, retrying on failure.

    Every attempt rescans so the BLEDevice is fresh. With a weak signal (below
    -80 dBm) Windows frequently times out during GATT discovery, and a retry
    usually recovers it.
    """
    last_err = None
    for attempt in range(1, retries + 1):
        dev, adv = await find_device(name, address, scan_time, quiet)
        if dev is None:
            last_err = "device not found"
            await asyncio.sleep(2)
            continue
        rssi = adv.rssi if adv.rssi is not None else -999
        if not quiet:
            print(f"[*] Connect attempt {attempt}/{retries} to {dev.address} (RSSI {rssi}) ...")
        client = BleakClient(dev, timeout=timeout, disconnected_callback=on_disconnect)
        try:
            await client.connect()
            if client.is_connected:
                return client
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            if not quiet:
                print(f"[!] Connection failed: {last_err}")
            try:
                await client.disconnect()
            except Exception:
                pass
            await asyncio.sleep(3)
            continue

    print(f"[x] Giving up ({last_err})")
    print("    Checklist: 1) move the holder within 30 cm of the computer; the signal "
          "needs to be above -70 dBm;"
          " 2) turn off phone Bluetooth and the mini program;"
          " 3) fit three fresh alkaline cells;"
          " 4) long-press to power off, long-press to power on, then retry immediately.")
    return None


def find_char(client, spec: str):
    """Locate a characteristic by full UUID, short UUID or handle."""
    s = str(spec).lower().replace("-", "").strip()
    chars = [c for svc in client.services for c in svc.characteristics]
    for c in chars:
        if c.uuid.lower() == s:
            return c
    if s.isdigit() and len(s) <= 3:
        for c in chars:
            if c.handle == int(s):
                return c
    short = s[-4:]
    for c in chars:
        if short_uuid(c.uuid) == short:
            return c
    for c in chars:
        if c.uuid.lower().replace("-", "").startswith("0000" + short):
            return c
    # Vendor UUIDs on a non-standard base: match the tail of the raw UUID instead.
    for c in chars:
        if c.uuid.lower().replace("-", "").endswith(short):
            return c
    return None


def list_chars(client):
    out = []
    for svc in client.services:
        for c in svc.characteristics:
            out.append(c)
    return out


def writable(client):
    return [c for c in list_chars(client)
            if "write" in c.properties or "write-without-response" in c.properties]


def notifiable(client):
    return [c for c in list_chars(client)
            if "notify" in c.properties or "indicate" in c.properties]


async def dump_gatt(client, log=print, listen=0.0, subscribe=True):
    """Walk the whole GATT tree, read what is readable and subscribe to notifications.

    Returns a dict:
    {"tree": [...], "writable": [...], "notifiable": [...], "notifications": [...]}
    """
    notifications = []

    def on_notify(char, data: bytearray):
        line = f"[NOTIFY] {short_uuid(char.uuid)} <- {hexs(data)}"
        notifications.append(line)
        log(line)

    tree, readable, writable, notifiable = [], [], [], []

    log("\n--------------- GATT tree ---------------")
    for svc in client.services:
        log(f"\n[SERVICE] {svc.uuid}  ({short_uuid(svc.uuid)})")
        for c in svc.characteristics:
            props = "|".join(c.properties)
            log(f"    [CHAR] {short_uuid(c.uuid):8}  h={c.handle:<4} props={props:32} "
                f"{(c.description or '')[:34]}")
            tree.append({"service": svc.uuid, "char": c.uuid, "handle": c.handle,
                         "props": c.properties, "description": c.description})
            if "read" in c.properties:
                readable.append(c)
            if "notify" in c.properties or "indicate" in c.properties:
                notifiable.append(c)
            if "write" in c.properties or "write-without-response" in c.properties:
                writable.append(c)

    log("\n--------------- Readable values ---------------")
    if not readable:
        log("(none)")
    for c in readable:
        try:
            val = await client.read_gatt_char(c)
            asc = "".join(chr(b) if 32 <= b < 127 else "." for b in val)
            log(f"  {short_uuid(c.uuid):8} h{c.handle:<4} = {hexs(val):58} |{asc}|")
        except Exception as e:
            log(f"  {short_uuid(c.uuid):8} h{c.handle:<4} read failed: {type(e).__name__}: {e}")

    log("\n--------------- Summary ---------------")
    log("WRITE  : " + (", ".join(f"{short_uuid(c.uuid)}(h{c.handle})" for c in writable) or "none"))
    log("NOTIFY : " + (", ".join(f"{short_uuid(c.uuid)}(h{c.handle})" for c in notifiable) or "none"))
    if writable:
        log("[result] A writable channel exists, so parameters can be probed.")
    else:
        log("[result] No writable characteristic, so a generic BLE tool cannot set anything.")

    if subscribe:
        for c in notifiable:
            try:
                await client.start_notify(c, on_notify)
                log(f"[+] Subscribed to {short_uuid(c.uuid)}")
            except Exception as e:
                log(f"[!] Subscribe to {short_uuid(c.uuid)} failed: {type(e).__name__}: {e}")

    if notifiable and listen > 0:
        log(f"\n[*] Listening for {listen:.0f}s - press the button on the device now "
            f"(double-press = start sterilizing) and watch for reports.")
        await asyncio.sleep(listen)

    return {"tree": tree,
            "writable": [c.uuid for c in writable],
            "notifiable": [c.uuid for c in notifiable],
            "notifications": notifications}


if __name__ == "__main__":
    print("blectx is a library module. Running it directly performs one scan as a "
          "connectivity self-check:")
    asyncio.run(find_device())
