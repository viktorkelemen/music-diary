---
title: "Multiband Resonator — Legio, Seed 3, and the Browser"
date: 2026-10-17T00:00:00Z
tags:
  - firmware
  - eurorack
  - legio
  - daisy
  - dsp
  - code
---

I built a six-band resonator inspired by the 4ms Spectral Multiband Resonator, with firmware for the Noise Engineering Legio and Daisy Seed 3 Eurorack Dev Kit, plus a browser instrument. A short burst of noise excites a chord; external audio can feed it continuously. The bands alternate between left and right outputs.

**[Open Multiband Resonator and play](/multiband-resonator/)**. Press **Start audio**, then **Send a ping**. The browser version runs locally on your device; it does not upload audio.

The chord banks come from my other instruments: HEX's five shapes, the nine cvChord types, and Chordery sets 14–26. Four-note chords gain root and fifth octave copies to fill six bands. Shorter Chordery voicings are expanded using octave copies of their existing notes. Rotation moves through the chord types, or through keys in the keyed Chordery sets.

The first version stayed too low for the brighter sounds I wanted. The Seed 3 and browser root controls now span **C1–C6**, with an additional octave above or below. For bells, start around **A4**, select **+1 octave**, and bring resonance down to about the middle. Each band has its own excitation level: reducing it changes new sound entering that band while its existing tail continues.

**Freeze** latches the current tuning, closes the excitation input, and raises resonance. The chord still decays naturally. It does not sustain forever.

### Feeding it audio

Choose **Noise** for continuous internal excitation, **Audio file** for a local loop, or **Live input** to connect an audio interface through the browser's permission prompt. External audio does not need a trigger. The input meter shows captured audio before the resonator, and **Monitor input** temporarily lets you hear that signal directly, bypassing Freeze and band levels. Return to the resonator by turning monitoring off.

### On the Seed 3 kit

- **VR1:** chromatic root, C1–C6; halfway is F♯3.
- **VR2:** resonance, from a short response to a long ring.
- **VR3–VR8:** excitation levels for bands 1–6.
- **SW1 / SW2:** next bank / next chord.
- **SW3 / SW4:** octave / freeze.
- **Gate 2:** trigger the internal noise ping. It is the D21 jack directly above SW4.
- **Gate 1:** hold Freeze while high.

The Seed 3 diagnostic build adds an input indicator on the Seed board's LED and direct monitoring while both buttons are held. I'm still investigating external-input behavior on the physical kit; passing software tests is not a substitute for that check.

The DSP tests measure tuning, run full-scale noise through every bank, and check rotation, freeze, and limiter behavior. The browser DSP is also compared against the C++ implementation. The project lives in my private [multiband-resonator repository](https://github.com/viktorkelemen/multiband-resonator); the playable browser version is available here without repository access.
