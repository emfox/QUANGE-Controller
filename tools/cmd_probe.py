#!/usr/bin/env python3
"""Send raw frames to the device and log every notification it returns."""

import argparse
import asyncio
import json
import time
from datetime import datetime
from pathlib import Path

import blectx as bx

CHAR = "1001"
DEFAULT = "DB01A4,DB01A0,DB01A2,DB01A3,DB01A5,DB01A6"


async def run(frames, gap, listen, name, address):
    out = []

    def on_notify(ch, data):
        b = bytes(data)
        out.append({"t": round(time.time(), 3), "ch": bx.short_uuid(ch.uuid), "data": b.hex().upper()})
        print(f"[RX] {bx.short_uuid(ch.uuid)} <- {b.hex(' ').upper()}", flush=True)

    client = await bx.connect(name, address, 8.0, 25.0,
                              on_disconnect=lambda _: print("[!] disconnected", flush=True))
    if client is None:
        return out
    try:
        for c in bx.notifiable(client):
            try:
                await client.start_notify(c, on_notify)
                print(f"[+] subscribe {bx.short_uuid(c.uuid)}", flush=True)
            except Exception as exc:
                print(f"[!] subscribe {bx.short_uuid(c.uuid)} failed: {exc}", flush=True)
        target = bx.find_char(client, CHAR)
        if target is None:
            print("[x] characteristic 1001 not found", flush=True)
            return out
        for f in frames:
            try:
                await client.write_gatt_char(target, f, response=False)
                print(f"[TX] {f.hex(' ').upper()}", flush=True)
            except Exception as exc:
                print(f"[!] write failed, stopping: {exc}", flush=True)
                break
            await asyncio.sleep(gap)
        await asyncio.sleep(listen)
    finally:
        try:
            await client.disconnect()
        except Exception:
            pass
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--frames", default=DEFAULT, help="comma separated hex frames")
    ap.add_argument("--gap", type=float, default=1.5, help="seconds between frames")
    ap.add_argument("--listen", type=float, default=4.0, help="seconds to wait after the last frame")
    ap.add_argument("-n", "--name", default=bx.DEFAULT_NAME_SPEC)
    ap.add_argument("-a", "--address", default=None)
    args = ap.parse_args()

    frames = [bytes.fromhex(x.strip()) for x in args.frames.split(",") if x.strip()]
    print(f"[*] {len(frames)} frames: " + ", ".join(f.hex().upper() for f in frames))
    replies = asyncio.run(run(frames, args.gap, args.listen, args.name, args.address))

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    outdir = Path(__file__).resolve().parent / "logs"
    outdir.mkdir(parents=True, exist_ok=True)
    path = outdir / f"probe_{stamp}.json"
    path.write_text(json.dumps({"frames": [f.hex().upper() for f in frames],
                                "replies": replies}, indent=2), encoding="utf-8")
    print(f"[*] {len(replies)} notifications saved to {path}")


if __name__ == "__main__":
    main()
