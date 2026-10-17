---
title: "Pulsar Lab — between rhythm and resonance"
date: 2026-10-17T00:00:00-04:00
tags:
  - pulsar
  - microsound
  - synthesis
  - dsp
  - code
---

I built **[Pulsar Lab, a playable browser instrument](/pulsar-lab/)** to explore the space between a repeating grain and a pitched tone. Press **Start audio** to play; the five starting patches move from soft resonance to scattered clicks and slow bursts.

The starting point is pulsar synthesis, described by Curtis Roads in [*Sound Composition with Pulsars*](https://www.curtisroads.net/s/SoundCompwithPulsars.pdf). Instead of a continuous waveform, the instrument repeats a short, windowed burst followed by silence. The waveform inside the burst and the speed of repetition can move independently.

Three controls make that relationship tangible. **Rate / pitch** sets how often the burst repeats. **Formant** sets the frequency inside it. **Duration** sets its length. At audio rates, repetition produces a pitch; slow it down and the individual events become a rhythm.

I wanted the interface to show that small structure directly: waveform, window, and the silence before the next burst. The spectrum shows how those choices reshape the output.

Start with **Soft vowel**. Leave the formant fixed and move the rate, then hold the rate and sweep the formant. Listen for the difference between changing the note and changing its color. Shorten the duration to hear the burst become more percussive.

**Dust particles** starts with short bursts, gaps, and a wide stereo spread. Masking gives each burst a chance of being skipped; spread randomly places the remaining bursts across the stereo field. **Glass current** adds folding and slow formant movement. **Folded bass** moves into a lower register, while **Slow orbit** leaves enough time to hear each event separately.

Duration is capped at one repetition period. Locking milliseconds keeps the requested burst length fixed as rate changes, up to that cap. Locking the duty ratio adjusts duration with the rate, within the controls’ limits. I like having both relationships available to compare.

The browser version is ready to play. A port for the Daisy Seed3 Eurorack development kit is also prepared, but it has not yet been tested on the hardware.
