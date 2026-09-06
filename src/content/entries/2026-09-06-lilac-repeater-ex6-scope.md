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

Custom firmware for the centrevillage LilaC Repeater, built on the official 2.0 binary, `lr_v2_0.bin`. There is no source, so every change is a patch to the binary itself: locate the instruction or the bitmap, write new bytes, check the diff against the original. Byte-level differences against that file are verifiable. Its provenance beyond the file itself is not.

The current build is `2.0-EX6 Scope R2`.

## Download

<div class="fw-download">

**[lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin](/firmware/lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin)** — 387,600 bytes

SHA-256: `fb89a9a8d5664debbb51481a794ceb90f1c991239a05a49310948c0f0c3aa005`

Verify before flashing:

```sh
shasum -a 256 lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin
```

An unofficial modification of centrevillage's LilaC Repeater v2.0 firmware, made by patching the official binary. Not a centrevillage release, not endorsed by them, and not tested on hardware. Flashing it may make a module unusable and may void your warranty.

</div>

## Recording level

This is what started the project. On the stock firmware the DRY fader sets both the monitoring level and the level at which DRY material is recorded, so monitoring quietly gives you a quiet recording. In EX6 the recording is captured at full unscaled input level and DRY only controls what you hear. Set the level upstream instead.

## Faders

The two faders trim the loop with no modifier held:

- **FDBK** — playback start position.
- **SPEED** — playback end position. Fully up is the sample end; sliding down brings the end earlier.

Full range is FDBK down, SPEED up. Holding FUNC restores their original functions:

- **FUNC + FDBK** — global overdub feedback.
- **FUNC + SPEED** — global tempo, 60–240 BPM.

Most of the work went into the modifier transitions. An earlier build, EX2, had a smoothing tail on FUNC release that audibly slurred the parameter as you let go of the button.

## Per-track variable speed

Hold a single track button and move SPEED for that track's continuous VARI multiplier, 0.5× to 2×, with 1× around the center. The gesture opens the track's detail view and the multiplier updates live.

The setting is session-only. Saved sample metadata is untouched, and a native menu or MIDI edit, or any reset or load, clears the override. I'd rather not write an undocumented value into the on-disk format of a module I'm patching without source.

Menu taps inside the detail view act on release rather than press, so a tap can be told apart from the start of a speed gesture. Standalone menu hold-repeat is disabled for the same reason.

## Scope splash

R2 is a cosmetic revision. The startup screen replaces the original 123×56 logo with an oscilloscope trace drawing `EX6`, then hands off to the module's native particle dissolve and the `2.0-EX6` label.

<figure class="splash">
<img src="/moodboards/lilac-repeater-ex6-scope/splash.svg" alt="The EX6 startup screen: an oscilloscope trace forming the letters E X 6, with tick marks along the top and bottom edges" />
<figcaption>The 123×56 splash, decoded straight out of the binary at <code>0x3e028</code>. 1,011 lit pixels.</figcaption>
</figure>

The bitmap sits at `0x3e028`, SSD1306 page-major, one bit per pixel. Immediately after the seven pages of logo data the original linker placed a hardware table, referenced by a pointer at `0x2a16c`, so the builder writes the new artwork and leaves that table and its three bytes of padding where they were. 665 bytes change, all inside the bitmap range. No code differences between this and the plain EX6 build.

## Status

Trimming, playback, recording, effects, sync and the audio paths are stock EX6 behavior.

It passes emulator checks and has not been run on hardware. Bootloader acceptance is unverified, and the binary is 2,520 bytes larger than the previous build, which is a plausible reason for a bootloader to reject it. Full recording workflows, SD storage and recovery are all untested on a real module. Not affiliated with centrevillage.

<style>
.fw-download { border: 1px solid var(--border); border-left: 3px solid var(--accent); background: #fff; padding: 16px 18px; margin: 1.5rem 0; }
.fw-download > :first-child { margin-top: 0; }
.fw-download > :last-child { margin-bottom: 0; }
.fw-download a { font: 14px var(--mono); }
.splash { margin: 1.5rem 0; }
.splash img { display: block; width: 100%; image-rendering: pixelated; border: 1px solid var(--border); }
.splash figcaption { margin-top: 8px; color: var(--muted); font: 11px var(--mono); }
.fw-download p:last-of-type { color: var(--muted); font-size: 13px; }
</style>
