---
title: "Fluid Particles"
date: 2026-10-23T00:00:00-04:00
tags:
  - generative-art
  - visuals
  - audio-reactive
  - code
---

I built **[Fluid Particles, an audio-reactive visual experiment](/fluid-particles/)** to see how many ways the same short track can move light. Click once to start the audio; the number keys **1–5** switch between five modes, and every parameter is exposed as a slider.

[![Fluid Particles start screen: white silk-like particle strands swirling on a pale background](/moodboards/2026-10-23-fluid-particles/fluid-particles.jpg)](/fluid-particles/)

Everything listens to one analysis of the sound: five auto-gained frequency bands, overall loudness, soft onsets and the dominant pitch. The track is dark and tonal, with almost nothing above 6 kHz, so each band normalizes itself against its own recent peak. Without that, the highs would barely register.

**Breathing silk** is a cloud of up to a million particles riding a curl-noise flow field. Bass pushes the flow, loudness lets the cloud open and close, and each onset sends a soft ripple outward. In the quiet intro it pulls into a tight knot; as the track builds it spreads into wide ribbons.

**Cymatic fluid** places a ring of emitters around a fluid simulation. Each emitter is one frequency band pushing inward, so the sound literally stirs the liquid. **Ink in milk** drops ink on every onset and lets the low end stir it. **Chladni sand** shakes particles off the antinodes of a vibrating plate until they settle on the nodal lines; the pattern changes with the dominant pitch.

**Horizontal lines** is the quietest of the five: rows of particles lifted by a smoothed spectrum, bass in the middle and the highs toward the edges.

Settings can be saved and loaded as files, the frame defaults to 9:16, and **render video** records the whole track straight from the canvas.
