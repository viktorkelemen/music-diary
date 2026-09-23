---
title: "Smash Crash — Falling Metal Ribbons"
date: 2026-09-22T00:00:00
tags:
  - music
  - visualization
  - generative-art
  - code
  - short
videoUrl: "https://youtube.com/shorts/vX4jVxH2w2c?feature=share"
---

A 50-second sound and image study for the track *smash_crash*. Strips of metal fall through black space, collide, and grind against each other. The image is black and white, lit by one fixed light placed where the camera is.

Everything on screen is driven by the track:

- **How many ribbons fall** follows how much is happening in the music, not how loud it is. The hits and clicks in the track were mapped out beforehand. Where they are densest, from about 28 seconds to the end, the frame fills with over a hundred ribbons. In the empty stretch around 20 seconds, only two or three drift through.
- **Hits** make a ribbon flare.
- **Clicks and cuts** put a sharp kink into a ribbon and snap its twist to a new angle.
- **The light** flickers with the music. It buzzes harder in loud passages and pops on hits.

The ribbons do not pass through each other. When they touch, they grip until they slide fast enough to break loose, then they chatter and glint while they grind. They cast shadows on each other and reflect their neighbours.

Built in the browser with three.js. The ribbons are simple physics chains, and the video was exported frame by frame so the image stays locked to the audio.

A lot was tried and taken out along the way: a fish video mapped onto the ribbons, fading trails, drifting plankton, explosions and shockwaves on the big hits, a floor for the ribbons to crash onto, a backlight, and a fully path-traced version that was too slow and too noisy to be worth it. What was left is sparser.

[Watch on YouTube](https://youtube.com/shorts/vX4jVxH2w2c?feature=share).
