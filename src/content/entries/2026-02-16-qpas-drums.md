---
title: "Making Drums from Gate Signals via the QPAS"
date: 2026-02-16
---

The core concept is elegant: a gate signal has a sharp transient attack followed by a sustain and release. By driving the QPAS's radiate/resonance into self-oscillation, you can treat the filter itself as a pitched sound source, and then use the gate (often via an envelope) to excite it — like physically striking a tuned resonator.

## The Core Technique: Filter Ping

The QPAS has a pair of bandpass filters in a stereo configuration with its unique Radiate parameter controlling the interaction between them. When you push Radiate high and increase Q (resonance), the filters approach and eventually enter self-oscillation — they ring at their cutoff frequencies like tuning forks.

A short trigger or gate sent to the audio input (or used to modulate the input level via a VCA) causes the filters to "ping" — they ring out at their tuned frequency and naturally decay. This is the same physics as hitting a bell or a drum: an impulse excites a resonant body, which then decays at its natural frequency.

**Basic patch:**

- Send a gate or trigger from your clock/sequencer into a fast envelope (e.g. Zadar or Maths)
- Run the envelope into a VCA, with white noise or the gate itself as the audio input
- Patch that VCA output into QPAS audio input
- Set QPAS resonance high (close to or at self-oscillation)
- The Radiate parameter controls the stereo character — low Radiate = both filters in phase (thicker, mono-ish), high Radiate = filters spread into stereo image

## Drum Voices You Can Make

**Kick drum:** Tune QPAS low (60–100 Hz range), hit it with a short impulse, then modulate the cutoff frequency downward with a fast envelope (pitch drop is key for a convincing kick). The Zadar is great here — use one channel as the audio envelope, another for cutoff CV with a sharp initial peak that falls fast.

**Tom / resonant thud:** Slightly higher tuning, slower pitch envelope decay, moderate Q. The QPAS's stereo bandpass character gives toms a rich spatial quality that mono filters don't.

**Hi-hat / snare-adjacent texture:** Mix noise into the input, tune QPAS higher, use very short gate/envelope. Adjust Radiate to spread the stereo image — high Radiate creates a nice wash. Adding both cutoffs spread apart creates a more complex, metallic texture.

**Clap / transient crack:** Very short ping, fast envelope, mid-high frequency, high Q but not quite self-oscillating. The transient becomes the sound rather than the sustain.

**Cowbell / metallic perc:** This is where QPAS really shines. Because it has two filters, you can tune them to non-harmonically related frequencies (say, a minor 7th or minor 9th interval apart). The two pitches beating against each other create that characteristic metallic inharmonicity. Push Radiate to control how separated vs. blended they are.

## Key Parameters to Modulate

The QPAS has dedicated CV inputs that make this really playable:

- **ωA and ωB** (the two cutoff frequencies) — Sweep these with a fast envelope for pitch drop/pitch bend. Patching both from the same envelope with slight offset between them creates movement.
- **Radiate** — Modulate with a slow LFO for evolving stereo width on repeating hits
- **Q** — Dynamic resonance control, can push into self-oscillation territory on peaks
- **ΔFreq** — Offsets the two cutoffs relative to each other; modulating this creates metallic shimmer
