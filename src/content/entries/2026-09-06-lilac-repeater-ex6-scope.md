---
title: "Custom Firmware for the LilaC Repeater"
date: 2026-09-06T00:00:00
unlisted: true
tags:
  - eurorack
  - firmware
  - lilac-repeater
  - looper
  - code
---

I built a custom firmware for the centrevillage LilaC Repeater. The starting point is the official 2.0 binary, `lr_v2_0.bin`. There is no source, so every change is a patch made directly to the binary — locate the instruction or the bitmap, write new bytes, verify the diff against the original. I can show byte-level differences against the file I started from; I can't authenticate that file's provenance beyond the file itself.

The current build is `2.0-EX6 Scope R2`.

## Download

<div class="fw-download">

**[lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin](/firmware/lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin)** — 387,600 bytes

SHA-256: `fb89a9a8d5664debbb51481a794ceb90f1c991239a05a49310948c0f0c3aa005`

Verify before flashing:

```sh
shasum -a 256 lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin
```

This is an unofficial modification of centrevillage's LilaC Repeater v2.0 firmware, built by patching the official binary. It is not a centrevillage release and is not endorsed by them. It has not been tested on hardware — flashing it may render a module unusable and may void your warranty. Use it at your own risk.

</div>

## Recording level

The thing that started all of this. On the stock firmware the DRY fader sets both the monitoring level and the level at which DRY material is recorded, so quiet monitoring means a quiet recording. In EX6 the recording is captured at full unscaled input level and DRY only controls what you hear. Set the level upstream, then monitor at whatever volume the room wants.

## The faders do two jobs

The two faders now trim the loop without any modifier:

- **FDBK alone** — playback start position.
- **SPEED alone** — playback end position. Fully up is the sample end; sliding down brings the end earlier.

Full range is FDBK down, SPEED up. Holding FUNC returns them to their original functions:

- **FUNC + FDBK** — global overdub feedback.
- **FUNC + SPEED** — global tempo, 60–240 BPM.

Getting the modifier transitions right took most of the work. An earlier build (EX2) had a smoothing tail on FUNC release that would audibly slur the parameter as you let go of the button.

## Per-track variable speed

Hold a single track button and move SPEED, and you get that track's own continuous VARI multiplier from 0.5× to 2×, with 1× around the center. The gesture opens that track's detail view and the multiplier updates live while you move.

This is deliberately session-only. Saved sample metadata is untouched, and a native menu or MIDI edit, or any reset or load, clears the temporary override. I didn't want an undocumented value leaking into the on-disk format of a module I'm patching blind.

Menu taps inside the detail view act on release rather than press, so the module can tell a tap from the beginning of a speed gesture. Standalone menu hold-repeat is disabled for the same reason.

## Scope splash

The R2 part of the name is cosmetic. The startup screen replaces the original 123×56 logo with an oscilloscope trace drawing `EX6`, then hands off to the module's native particle dissolve and the `2.0-EX6` label.

The bitmap sits at `0x3e028` in SSD1306 page-major format, one bit per pixel. Immediately after the seven pages of logo data the original linker placed a hardware table, referenced by a pointer at `0x2a16c`, so the builder has to write the new artwork and leave that table and its three bytes of padding exactly where they were. 665 bytes change, all inside the bitmap range. No code changes at all between this and the plain EX6 build.

## Status

Everything else — trimming, playback, recording, effects, sync, audio paths — is the stock EX6 behavior.

This is experimental. It passes emulator checks and has not been tested on hardware. Bootloader acceptance is unverified, and the binary is 2,520 bytes larger than the previous build, which is exactly the kind of thing a bootloader might refuse. Recording workflows end to end, SD storage and recovery are all untested on a real module. Not affiliated with centrevillage.

Next step is flashing it and finding out.

<style>
.fw-download { border: 1px solid var(--border); border-left: 3px solid var(--accent); background: #fff; padding: 16px 18px; margin: 1.5rem 0; }
.fw-download > :first-child { margin-top: 0; }
.fw-download > :last-child { margin-bottom: 0; }
.fw-download a { font: 14px var(--mono); }
.fw-download p:last-of-type { color: var(--muted); font-size: 13px; }
</style>
