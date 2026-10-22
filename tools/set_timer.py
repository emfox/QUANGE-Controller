#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
set_timer.py - write schedules directly to the QUANGE UV toothbrush holder (WY020702)

Full protocol: ../docs/protocol.en.md (Chinese: ../docs/protocol.zh-CN.md)

Usage:
    # Verify the channel first: send "start now" and watch the indicator breathe
    python3 set_timer.py --start

    # One schedule: every day at 03:00 for 5 minutes (replaces everything else)
    python3 set_timer.py --at 03:00 --dur 5

    # Two schedules: 03:00 for five minutes, 15:30 for four
    python3 set_timer.py --at "03:00=5,15:30=4"

    # Query state (device reply plus next run time)
    python3 set_timer.py --query

    # Read the schedule table off the device (syncs time and log first, then DB 01 07)
    python3 set_timer.py --list

    # Read the sterilization log
    python3 set_timer.py --logs

    # Read the firmware version (DB 01 A4 -> BD 06 A2, read-only, never triggers an update)
    python3 set_timer.py --version

    # Print the frames that would be sent, without connecting
    python3 set_timer.py --at 03:00 --dur 5 --dry-run

    # If the advertising name does not match, address the device by MAC
    python3 set_timer.py -a AA:BB:CC:DD:EE:FF --query

Device matching:
    Three name prefixes are accepted by default: QUANGE / Hi- / kHID (same as
    phone.html), plus a fallback on the advertised 0x1812/0x180F services.
    Use -n to narrow it down; separate alternatives with |, e.g. -n "kHID" or
    -n "QUANGE|Hi-".

Frame formats:
    Set schedule  DB 08 08 <count> [HH MM 0D] * count
    Delete        DB 00 08 <remaining count> [entries to keep] * remaining count
    On/off        DB 02 04 01 / DB 02 04 00
    Query state   DB 04 02 <unix seconds, 4 bytes>
    Read log      DB 01 05 (streaming; each record needs DB 06 06 01 + its start timestamp)
    Read list     DB 01 07 (requires DB 04 02 and DB 01 05 first; on its own the device stays silent)
"""
import argparse
import asyncio
import os
import sys
import time
from datetime import datetime

from bleak import BleakClient

import blectx as bx

HERE = os.path.dirname(os.path.abspath(__file__))
LOGDIR = os.path.join(HERE, "logs")
STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
CHAR = "1001"
_fh = None


def log(msg):
    print(msg, flush=True)
    if _fh:
        _fh.write(msg + "\n")
        _fh.flush()


LOG_Q = None  # asyncio.Queue holding raw BD0805/BD0806 payloads as they arrive


# ---------------- frame construction ----------------

# Upper limit quoted in the vendor FAQ. Nothing in the code enforces it, but
# staying within it is the safest bet.
MAX_ITEMS = 4


def timer_frame(items):
    """items: [(hour, minute, duration), ...] -> the complete frame as bytes"""
    body = "".join(f"{h:02X}{m:02X}0{d}" for h, m, d in items)
    frame = f"DB0808{len(items):02X}" + body
    return bytes.fromhex(frame)


def validate(items):
    """Front-end validation matching phone.html and the mini program's addtime page.

    The vendor checks "gap of +/-59 minutes", i.e. 59 minutes or more passes (it is
    not a strict > 60). In addition, every schedule must fall within 23 hours
    (1380 minutes) of the first one.

    These are front-end checks; whether the firmware also rejects bad values has
    not been measured.
    """
    if not items:
        raise SystemExit("[x] At least one schedule is required")
    if len(items) > MAX_ITEMS:
        log(f"[!] More than the vendor's {MAX_ITEMS} entries (not enforced in code, sending anyway)")

    mins = sorted(h * 60 + m for h, m, _ in items)
    for i, cur in enumerate(mins):
        nxt = mins[i + 1] if i + 1 < len(mins) else mins[0] + 1440
        if nxt - cur < 59:
            raise SystemExit(
                f"[x] Two schedules must be at least 1 hour apart (vendor limit): "
                f"{cur // 60:02d}:{cur % 60:02d} and {nxt % 1440 // 60:02d}:{nxt % 60:02d}")
    if mins[-1] - mins[0] > 1380:
        raise SystemExit("[x] All schedules must fall within 23 hours of the first one "
                         "(vendor limit)")


def parse_at(spec):
    """'03:00=5,15:30=4' -> [(3,0,5),(15,30,4)]"""
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "=" in part:
            hhmm, dur = part.split("=", 1)
        else:
            hhmm, dur = part, "5"
        hh, mm = hhmm.split(":")
        h, m, d = int(hh), int(mm), int(dur)
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise SystemExit(f"[x] Invalid time: {hhmm}")
        if d not in (3, 4, 5, 6):
            raise SystemExit(f"[x] Duration must be 3/4/5/6 minutes, got {d}")
        out.append((h, m, d))
    if not out:
        raise SystemExit("[x] No schedule entries parsed")
    return out


def status_frame():
    ts = int(time.time())
    return bytes.fromhex(f"DB0402{ts:08X}")


# ---------------- main flow ----------------

async def read_logs(client, target, wait=3.0, limit=12):
    """Read the sterilization log.

    The device pushes one record at a time; each must be acknowledged with
    DB060601 + its start timestamp before the next one is sent.
    """
    global LOG_Q

    LOG_Q = asyncio.Queue()
    while not LOG_Q.empty():
        LOG_Q.get_nowait()

    log("=== Reading sterilization log ===")
    await client.write_gatt_char(target, status_frame(), response=False)
    log("[TX] time sync")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(target, bytes.fromhex("DB0105"), response=False)
    log("[TX] log query")

    rows = []
    for i in range(limit):
        try:
            data = await asyncio.wait_for(LOG_Q.get(), timeout=wait)
        except asyncio.TimeoutError:
            log(f"    Timed out waiting for record {i+1}; stream finished")
            break

        s = bytes(data).hex().upper()
        tsh = s[6:14]
        if tsh == "FFFFFFFF":
            log("    Device reply: no more records")
            break
        dur = int(s[14:18], 16)
        typ = int(s[18:20], 16)
        st = int(s[20:22], 16)
        tsv = int(tsh, 16)
        when = datetime.fromtimestamp(tsv) if tsv > 1600000000 else None
        rows.append((when, dur, typ, st))
        when_s = f"{when:%Y-%m-%d %H:%M:%S}" if when else "time unknown (clock reset)"
        log(f"    record {i+1}: {when_s}  duration {dur}s  "
            f"type {typ}  {'end' if st == 1 else 'start'}")

        ack = bytes.fromhex("DB060601" + tsh)
        await client.write_gatt_char(target, ack, response=False)
        log(f"[TX] ack {tsh}")
        await asyncio.sleep(0.4)

    log(f"[*] {len(rows)} records read in total")
    LOG_Q = None
    return rows


async def run(a):
    os.makedirs(LOGDIR, exist_ok=True)

    # Build the frames first. The list query has to replay the mini program's
    # initialisation order, because DB0107 alone gets no reply.
    if a.start:
        todo = [(bytes.fromhex("DB020401"), "start sterilizing now")]
    elif a.stop:
        todo = [(bytes.fromhex("DB020400"), "stop")]
    elif a.query:
        todo = [(status_frame(), "query state")]
    elif a.version:
        # DB 01 A4 -> BD 06 A2, used to capture the firmware version. OTA died
        # with the backend, so this is read-only.
        todo = [(bytes.fromhex("DB01A4"), "read firmware version")]
    elif a.list:
        todo = [(status_frame(), "time sync"),
                (bytes.fromhex("DB0105"), "log query"),
                (bytes.fromhex("DB0107"), "read schedule table")]
    elif a.logs:
        todo = []
    else:
        items = parse_at(a.at)
        validate(items)
        todo = [(timer_frame(items),
                 "set schedules " + ", ".join(f"{h:02d}:{m:02d}/{d}min" for h, m, d in items))]

    for f, d in todo:
        log(f"=== {d} ===")
        log(f"    frame: {f.hex(' ').upper()}  ({len(f)} bytes)")

    if a.dry_run:
        log("    (dry-run, nothing sent)")
        return 0

    global _fh
    _fh = open(os.path.join(LOGDIR, f"settimer_{STAMP}.log"), "a", encoding="utf-8")
    log(f"=== session @ {datetime.now():%Y-%m-%d %H:%M:%S} ===")

    got = []

    def on_notify(ch, data):
        line = f"[reply] {bx.short_uuid(ch.uuid)} <- {bx.hexs(data)}"
        got.append((bx.short_uuid(ch.uuid), bytes(data)))
        log(line)
        h = bytes(data).hex().upper()
        if LOG_Q is not None and (h.startswith("BD0805") or h.startswith("BD0806")):
            LOG_Q.put_nowait(bytes(data))
        _decode(bytes(data))

    client = await bx.connect(a.name, a.address, a.scan_time, a.connect_timeout,
                              on_disconnect=lambda _: log("[!] Device disconnected"))
    if client is None:
        return 1

    try:
        for c in bx.notifiable(client):
            try:
                await client.start_notify(c, on_notify)
                log(f"[+] Subscribed to {bx.short_uuid(c.uuid)}")
            except Exception as e:
                log(f"[!] Subscribe to {bx.short_uuid(c.uuid)} failed "
                    f"(replies may be lost)")

        target = bx.find_char(client, CHAR)
        if target is None:
            log(f"[x] Characteristic {CHAR} not found")
            return 2

        if a.logs:
            await read_logs(client, target, wait=3.0, limit=20)

        for frame, desc in todo:
            await client.write_gatt_char(target, frame, response=False)
            log(f"[TX OK] {desc} -> {bx.short_uuid(target.uuid)}")
            await asyncio.sleep(1.2 if len(todo) > 1 else 0.5)

        log(f"[*] Waiting {a.listen:.0f}s for replies ...")
        await asyncio.sleep(a.listen)

        if not got:
            log("[!] No replies at all. Either replies arrive on 1001 (subscription "
                "refused), or this command simply does not answer.")
            log("    Tip: if you just sent --at, wait a few seconds and run --query again.")
    finally:
        try:
            await client.disconnect()
        except Exception:
            pass

    _fh.close()
    return 0


def _decode(b: bytes):
    """Decode a reply according to ../docs/protocol.en.md"""
    s = b.hex().upper()
    pre = s[:6]
    try:
        if pre in ("BD1102", "BD0002", "BD0202", "BD0B02", "BD0E02"):
            st = s[6:8]
            bat = int(s[16:18], 16) if len(s) >= 18 else None
            log(f"    -> status   state byte=0x{st}  battery={bat}%")
            if st == "01":
                # Sterilizing: sub(8,12) = start timestamp, sub(12,16) = current timestamp
                a0 = int(s[8:12], 16) if len(s) >= 12 else 0
                a1 = int(s[12:16], 16) if len(s) >= 16 else 0
                log(f"    -> sterilizing, about {max(0, a0 - a1)}s remaining")
            else:
                # Idle: sub(18,26) is the next run as a unix timestamp.
                # Only the idle reply carries this field; reading it mid-cycle
                # yields garbage (often a 1970 date).
                if len(s) >= 26:
                    nxt = int(s[18:26], 16)
                    if nxt > 1600000000:
                        log(f"    -> next run: {datetime.fromtimestamp(nxt):%Y-%m-%d %H:%M:%S}")
                    else:
                        log(f"    -> next run field=0x{s[18:26]} (unset or expired)")
                else:
                    log(f"    -> reply too short ({len(s)//2} bytes), next run field absent")
        elif pre in ("BD0D07", "BD0D08"):
            body = s[6:]
            items = []
            for i in range(0, len(body) - 5, 6):
                c = body[i:i + 6]
                h, m, d = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
                if h == 0xFF or m == 0xFF:
                    continue
                if 0 <= h < 24 and 0 <= m < 60 and 1 <= d <= 6:
                    items.append((h, m, d))
            pretty = ", ".join(f"{h:02d}:{m:02d} / {d}min" for h, m, d in items) or "empty"
            log(f"    -> schedule table ({len(items)} entries): {pretty}")
        elif pre in ("BD0805", "BD0806"):
            log("    -> sterilization log record")
        elif pre == "BD06A2":
            # Version parsing copies the mini program: hex[15:16] + hex[17:18]
            # as a decimal number. A reply shorter than 9 bytes cannot provide
            # this, so print the raw hex instead of guessing.
            if len(s) >= 18:
                log(f"    -> firmware version (mini program algorithm): "
                    f"{int(s[15:16] + s[17:18], 16)}  [raw hex: {s}]")
            else:
                log(f"    -> firmware reply is only {len(s)//2} bytes, too short to "
                    f"index  [raw hex: {s}]")
        elif pre == "BD05A1":
            log("    -> low battery warning")
        else:
            log(f"    -> unknown reply prefix {pre}")
    except Exception as e:
        log(f"    (parse failed: {e})")


def cli():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--name", default=bx.DEFAULT_NAME_SPEC,
                    help="advertising name prefix; separate alternatives with | "
                         "(defaults to QUANGE / Hi- / kHID, same as phone.html)")
    ap.add_argument("-a", "--address", default=None,
                    help="connect by MAC, skipping name matching")
    ap.add_argument("--at", default=None, help='e.g. 03:00 or "03:00=5,15:30=4"')
    ap.add_argument("--dur", type=int, default=5, help="duration in minutes: 3/4/5/6")
    ap.add_argument("--start", action="store_true",
                    help="start sterilizing now (channel check)")
    ap.add_argument("--stop", action="store_true", help="stop")
    ap.add_argument("--query", action="store_true", help="query state")
    ap.add_argument("--version", action="store_true",
                    help="read firmware version (DB 01 A4 -> BD 06 A2)")
    ap.add_argument("--list", action="store_true", help="read the schedule table")
    ap.add_argument("--logs", action="store_true", help="read the sterilization log")
    ap.add_argument("--listen", type=float, default=6.0,
                    help="seconds to wait for replies")
    ap.add_argument("--scan-time", type=float, default=8.0,
                    help="scan duration in seconds")
    ap.add_argument("--connect-timeout", type=float, default=25.0,
                    help="connection timeout in seconds")
    ap.add_argument("--dry-run", action="store_true",
                    help="print frames without connecting")
    args = ap.parse_args()

    if args.at and "=" not in args.at:
        args.at = f"{args.at}={args.dur}"
    if not (args.at or args.start or args.stop or args.query or args.version
            or args.list or args.logs):
        ap.print_help()
        return 2
    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(cli())
