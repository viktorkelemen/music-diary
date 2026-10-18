---
title: "Multiband Resonator: Finding the Bright End"
date: 2026-10-18T00:00:00Z
tags:
  - firmware
  - eurorack
  - legio
  - daisy
  - dsp
  - code
---

The first patches with my Multiband Resonator sounded quieter and muddier than I wanted. Getting the firmware onto the Seed 3 was one step; finding a useful playing range was another. This is a follow-up to the [project introduction](/entry/2026-10-17-multiband-resonator/), with the changes that came out of trying it on the Eurorack kit.

**[Play Multiband Resonator in the browser](/multiband-resonator/)**. Start audio and send a ping, or choose Noise for continuous excitation. The browser now has the wider tuning range and six individual band levels from the Seed 3 version.

### Why it started so dark

The original root control covered C1–C3, with C2 in the middle. On the default HEX/S2 chord, a C2 root puts the six resonances at roughly 65, 73, 87, 98, 131, and 196 Hz. Those are all low frequencies. Long tails overlapping in that region explain a lot of the mud.

The Seed 3 and browser root controls now cover **C1–C6**, still in chromatic steps. The octave switch adds another octave above or below, so the root can reach C7. The middle of the Seed's VR1 is now F♯3; three-quarters is approximately A4. The Legio version keeps its original root range.

Higher tuning brings the ringing into the kilohertz range. At the same resonance setting, higher notes also decay faster, so moving upward changes both the brightness and the length of the response.

There was a separate level problem: an extra 12 dB of attenuation had been added before the filters. That has been removed. The requested resonance compensation, `1/√Q`, remains, along with the final soft limiter. The limiter's ceiling is unchanged.

### The harmony comes from my other instruments

The resonator has six bands, with alternate bands sent left and right. The chord tables come from three places:

| Bank | Chords |
|---|---|
| HEX | S2, P5, 7S, m7, M7 |
| cvChord | Major, minor, maj7, min7, dominant7, sus4, sus2, diminished, augmented |
| Chordery | Sets 14–26: octave, fourth, and fifth stacks, followed by the Utility sets |

For a four-note chord, the two extra bands are the root and fifth an octave up, each 3 dB quieter. Shorter Chordery shapes fill the bank with octave copies of the supplied notes. In the keyed Chordery sets, rotation moves through keys; in HEX and cvChord, it changes the chord type at the current root.

The six level controls change how much new sound enters each band. Turning one down lets its existing tail continue, rather than cutting off a ringing note.

### A brighter starting patch

On the Seed 3 Eurorack kit:

1. Send a slow clock into **Gate 2**, the D21 jack directly above SW4. Each rising edge creates a short internal noise burst.
2. Put **VR1 around three-quarters**, choose **+1 octave** with SW3, and set **VR2 around noon**.
3. Start with **VR3–VR8 fully clockwise**. Reduce VR3 and VR4 if the lowest two bands dominate.
4. Leave **SW4's freeze off** and Gate 1 unpatched. Listen to one ping at a time before increasing the clock speed.

SW1 advances the bank and SW2 advances the chord. For more space between the chord tones, try HEX's P5 shape. Once the individual strikes are clear, raise resonance or bring the triggers closer together to overlap them.

### External audio is still being checked

Gate 2 generates its own excitation. Incoming audio is supposed to feed the resonators continuously, without a gate, and mix with those internal pings. It does not modulate the ping generator itself. In normal operation the output is entirely wet, so the original sound's broadband attack can disappear into the six narrow resonances.

I have not yet isolated the external-input issue on the physical kit. A diagnostic build is prepared: the Seed's onboard LED indicates captured input, and holding both buttons temporarily monitors that input directly. The browser has an input meter and a **Monitor input** button for the same distinction: is sound arriving, and what happens after it enters the resonator?

The software checks cover tuning, sustained full-scale noise, chord changes, freeze, and continuous external input without triggers. The brighter firmware has been flashed and read back successfully, but that alone cannot verify the analog input path. That physical check is the next part of the experiment.
