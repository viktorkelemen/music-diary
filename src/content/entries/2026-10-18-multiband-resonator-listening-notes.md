---
title: "Resonant Prototype & Spectral Resynth"
date: 2026-10-18T00:00:00Z
tags:
  - firmware
  - eurorack
  - daisy
  - dsp
  - code
---

*Updated October 23, 2026.*

Two versions for the [Daisy Seed 3 Eurorack Dev Kit](https://daisy.audio/products/seed-3-eurorack-dev-kit). The resonator rings through tuned filters. The resynth turns incoming audio into synthesized chord tones.

## Resonant prototype

Six resonant bands, each with its own excitation level. Feed it audio or trigger a noise ping. Freeze closes the input and holds the tuning; the ringing still decays.

**[Play the resonator](/multiband-resonator/)** · **[Seed 3 firmware on GitHub](https://github.com/viktorkelemen/multiband-resonator/tree/main/firmware_seed3)**

[![Resonant prototype control map in the Daisy Seed 3 layout: root, resonance, six band levels, bank, chord, octave and freeze.](/diagrams/seed3-resonator.svg)](/diagrams/seed3-resonator.svg)

VR3–VR8 affect new excitation, leaving existing tails to ring. SW3 selects −1 / 0 / +1 octave. CV 1 advances the chord at rising 0.42 V steps; CV 2 adds to resonance. Gate 2 triggers the ping. Hold both buttons for half a second to monitor the input directly.

## Spectral resynth

Up to twelve voices follow the input, mapped to a selected chord and voicing. Morph blends sine → triangle → saw → square. This is the current v0.10 Seed 3 engine, also running in the browser.

**[Play the resynth](/spectral-chord-resynth/)** · **[Seed 3 firmware on GitHub](https://github.com/viktorkelemen/spectral-chord-resynth/tree/main/firmware/seed3)**

[![Spectral resynth control map in the Daisy Seed 3 layout: root, brightness, attack, detail, dry/wet, level, morph, release, chord, voicing and freeze.](/diagrams/seed3-resynth.svg)](/diagrams/seed3-resynth.svg)

Freeze holds the synthesized notes. Brightness, morph, dry/wet and level remain live. SW3, Gate 2 and CV are unused in this version.

Both versions use SW4 or Gate 1 for freeze. MIDI and SD are unused. The diagrams follow the [official panel layout](https://docs.daisy.audio/product/Seed3-Euro-Dev-Kit/); tap either to enlarge.

The firmware repositories are private and require GitHub access. The browser instruments are public. Use the Seed 3 targets for this kit; the separate Legio firmware is not compatible. Hardware input and CV calibration on the resonant prototype still need checking.
