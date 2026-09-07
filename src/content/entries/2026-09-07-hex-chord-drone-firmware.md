---
title: "Chord Drone Firmware for the Acid Rain HEX"
date: 2026-09-07T00:00:00
tags:
  - eurorack
  - firmware
  - acid-rain
  - hex
  - drone
  - code
---

Custom firmware for my Acid Rain Technology HEX, running Ripsaw, turning it into a four-voice chord drone instrument. One V/oct input plays and transposes a whole chord; the encoder moves through voicings and chords. The synthesis engine, calibration, and settings storage are untouched.

<div class="fw-note">

An unofficial modification, made for my own module. Not an Acid Rain Technology release, not endorsed by or affiliated with them, and nothing to do with the official Ripsaw firmware beyond being patched on top of it. Acid Rain Technology, HEX, and Ripsaw are their names, used here to say which module this is.

Flashing modified firmware can render a module unusable and may void a warranty. These are notes on what I did to mine, not instructions for doing it to yours.

</div>

## Background

My live set leans on one specific chord combination, and I needed a simple way to generate those chords with variations. First attempt was Morphagene, recording the chords in by hand. Then I tried writing firmware for a Noise Engineering Librae Legio — the Legio platform is open for custom development through libDaisy — but what I got out of it wasn't usable enough.

The Ripsaw had been out of my rack for a while. It's already a four-voice oscillator, so the question was whether changing a few things would be enough. It was.

This modification is very specific to that chord combination. Rewriting it for a different set is easy, but for my upcoming live sets this is sufficient.

## Patches

There is no binary to download here. The patch list is my own work; the firmware it applies to is Acid Rain's, so you supply that yourself from your own module.

<div class="fw-download">

**[hex_chord_drone_patches.json](/firmware/hex_chord_drone_patches.json)**

13 patches, 330 replaced instruction bytes, applied to the 96 KB application region at `0x10000000`. Each entry carries a flash offset, the original bytes, and the replacement bytes, so a patcher can refuse to touch anything that doesn't already match.

Built against one specific `chainsaw2 1.0.0` image, SHA-256 `99ef27b4…36600`, and not compatible with arbitrary Ripsaw releases. Non-commercial use only.

</div>

Dump your own module, check it matches, then apply:

```python
import json, hashlib
img = bytearray(open("hex-full-flash.bin", "rb").read())
man = json.load(open("hex_chord_drone_patches.json"))

assert hashlib.sha256(img).hexdigest() == man["original_full_flash_sha256"]

for p in man["patches"]:
    off, orig = int(p["flash_offset"], 16), bytes.fromhex(p["original_hex"])
    assert img[off:off + len(orig)] == orig, p["name"]
    img[off:off + len(orig)] = bytes.fromhex(p["candidate_hex"])

open("hex-chord-drone.bin", "wb").write(img[:0x18000])
```

The result should hash to the `expected_result` value in the manifest. That's the image that was flashed and read back on my module, with calibration and settings untouched.

## Controls

| Control | Behavior |
|---|---|
| First V/oct input | Transposes all automatically generated chord voices together, one octave per volt |
| V/oct inputs 2–4 | Override their corresponding voices individually |
| Top encoder, normal mode | Selects five octave voicings of the current chord |
| Short encoder press | Switches between voicing and chord selection |
| Long encoder press | Resets to the original suspended chord and first voicing |

The former fine-tuning mode became chord selection. Everything else kept its existing behavior.

## Chords

Five choices, shown with compact LED labels:

| Display | Notes relative to C |
|---|---|
| `S2` | C–D–F–G |
| `P5` | C–G–C–G |
| `7S` | C–D–G–B♭ |
| `m7` | C–E♭–G–B♭ |
| `M7` | C–E–G–B |

## Pitch

With the default chord and voicing, 0 V produces C2–D2–F2–G2, and +1 V raises the whole chord to C3–D3–F3–G3. Fractional voltages transpose continuously. Range is MIDI 12–96.

Each input keeps its own original calibration.



## Working from the flash

HEX is Acid Rain's swappable-firmware platform — Ripsaw is the first firmware on it, and further firmwares are advertised as free downloads. What they haven't published is source or an SDK, so there is nothing to build against. Everything here is patched into the compiled application.

First step was the hardware and the USB connection: an RP2040, a full 2 MB flash backup, then everything done against the saved image. Rather than rewrite the instrument from scratch I patched specific parts of the existing application, so its synthesis engine, calibration, and settings storage all survived intact.

<style>
.fw-note { border: 1px solid var(--border); border-left: 3px solid var(--accent); background: #fff; padding: 16px 18px; margin: 1.5rem 0; color: var(--muted); font-size: 13px; }
.fw-note > :first-child { margin-top: 0; }
.fw-note > :last-child { margin-bottom: 0; }
.fw-download { border: 1px solid var(--border); border-left: 3px solid var(--accent); background: #fff; padding: 16px 18px; margin: 1.5rem 0; }
.fw-download > :first-child { margin-top: 0; }
.fw-download > :last-child { margin-bottom: 0; }
.fw-download a { font: 14px var(--mono); }
.fw-download p:last-of-type { color: var(--muted); font-size: 13px; }
</style>
