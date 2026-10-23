---
title: "From Multiband Resonator to Spectral Chord Resynth"
date: 2026-10-18T00:00:00Z
tags:
  - firmware
  - eurorack
  - daisy
  - dsp
  - code
---

*Updated October 23, 2026.*

The resonator started out too quiet and muddy. Raising the tuning range helped, but I ended up taking it in a different direction: incoming audio now drives up to twelve synthesized voices, tuned to a chord.

I kept root, chord and voicing changes. Individual note tuning is gone; the knobs control the whole sound. Morph moves continuously from sine through triangle and saw to square.

**[Play Spectral Chord Resynth](/spectral-chord-resynth/)** — start with Demo, or use a recording or live input. It runs the same audio engine as the current Daisy Seed 3 build (v0.10).

| Knob | Control |
|---|---|
| VR1 | Root, C2–C6 |
| VR2 | Brightness |
| VR3 | Attack, 2–500 ms |
| VR4 | Detail, 1–12 input partials |
| VR5 | Dry/wet |
| VR6 | Output level; noon is unity |
| VR7 | Waveform morph |
| VR8 | Release, 25 ms–4 s |

SW1 changes chord; SW2 changes voicing. SW4 or Gate 1 freezes the notes. Brightness, morph, mix and level still work while frozen. The browser has the same controls, with Space for freeze.

The [earlier multiband resonator](/multiband-resonator/) is still playable. It uses six resonant filters; this version analyzes and resynthesizes the input.
