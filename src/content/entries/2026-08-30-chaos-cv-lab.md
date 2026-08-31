---
title: "Chaos CV Lab — Nonlinear Signal Guide"
date: 2026-08-30T00:00:00
tags:
  - dsp
  - chaos
  - eurorack
  - cv
  - code
---

Notes for a pair of command-line tools that send nonlinear and chaotic signals into the modular through an audio interface. What follows is the working design document: what the distinction between shaping and chaos actually is, which curves to use, which chaos engines to build, and the rules that keep the whole thing from blowing up.

## 1. The essential distinction

A nonlinear shape is not yet chaos.

A formula such as `x*x` has no memory: identical inputs always produce identical outputs. Chaos needs state that evolves through feedback, delay, forcing, or coupled variables.

**Memoryless processor** — `input x → f(x) → output y`

`cv_transform`: a dedicated binary for square, cube, rectification, saturation and folding. It stays small — one input sample, one selected function, one output sample, no persistent dynamical state.

```
./cv_transform --mode square --input 1 --output 1
./cv_transform --mode cube   --input 1 --output 1
./cv_transform --mode sine   --drive 2.5 --input 1 --output 1
```

**Dynamical system** — `state → nonlinearity → update ↺ feedback / delay`

`cv_chaos`: a separate binary for Logistic, Duffing, Lorenz and Mackey–Glass. It owns persistent state, numerical integrators, delay buffers, parameter CV and multiple outputs.

```
./cv_chaos --engine logistic --output 1
./cv_chaos --engine duffing --input 1 --outputs 1,2
./cv_chaos --engine lorenz --outputs 1,2,3
```

Why separate them? A transform failure cannot destabilize the chaos engine, and the simple binary remains easy to understand and verify. Generic audio-device discovery, channel routing, clipping and error handling can live in small common source files without combining the executables.

## 2. Transformation atlas

Choose a curve for its behavior. Smooth odd functions are friendliest in feedback. Even functions create positive DC. Discontinuous functions create the most high-frequency energy and aliasing.

| Function | Shape | CV effect | Audio effect | Best role |
|---|---|---|---|---|
| `x²` | Square — even / unipolar | Rectification, LFO doubling, magnitude extraction | DC and even harmonics | Shaper |
| `x³` | Signed cube — odd / bipolar | Gentle center, strong extremes | Odd harmonics, no DC when centered | Feedback shaper |
| `x − x³` | Double well — odd / non-monotonic | Competing regions with feedback | Turning-point overtones | Restoring force |
| `tanh(gx)` | Soft saturation — odd / bounded | Smooth runaway control | Rounded peak limiting | Limiter |
| `sin(gx)` | Sine fold — periodic folds | Repeating control zones | Bright folded spectrum | Feedback map |
| `sign(x)` | Comparator — discontinuous | Gate extraction | Square-wave spectrum | Switch |

Curve by curve:

- **Square, `y = x²`.** Folds both polarities upward. Bipolar motion becomes unipolar; a sine LFO runs at twice the rate. In audio it creates DC and even harmonics — a centered sine becomes mostly an octave plus a positive offset.
- **Signed cube, `y = x³`.** Keeps polarity while reducing small movements. Useful when feedback must remain bipolar. Adds odd harmonics with a smooth symmetric curve and no DC for centered input.
- **Double well, `y = gx − x³`.** An S-shaped restoring force. With state and feedback it can support two competing regions. Non-monotonic shaping: louder input can turn back toward zero, producing complex overtones.
- **Soft saturation, `y = tanh(gx)`.** Limits runaway feedback smoothly while preserving sign and gentle motion near zero. Rounds peaks progressively; more drive approaches hard limiting without an abrupt corner.
- **Sine fold, `y = sin(gx)`.** Creates repeated rising and falling control regions as drive increases. Wavefolding produces a bright metallic spectrum and increasingly dense harmonics.

## 3. Route to chaos

One equation, radically different regimes. The logistic map repeatedly feeds its output back into itself:

```
x[n+1] = r·x[n]·(1 − x[n])
```

As `r` rises, one stable value splits into two, four, eight, and eventually a dense chaotic set.

- `r < 3` — settles toward one value.
- `r ≈ 3…3.57` — period-doubling cascade.
- `r ≳ 3.57` — mostly chaos, interrupted by periodic windows.

## 4. Chaos engines

Four systems worth building. Each engine keeps state between PortAudio callbacks. The same engine can be slow CV or an audio oscillator: change its update rate or integration time scale, not its mathematical structure.

Use `double` for internal state and `float` at the audio/CV I/O boundary. Allocate every buffer before starting PortAudio.

```c
float raw = engine_tick(&engine, input[i]);
float y = (float)(raw * output_scale);
/* Protect the physical output, not the internal state. */
if (y >  1.0f) y =  1.0f;
if (y < -1.0f) y = -1.0f;
output[i] = y;
```

Real-time rule: no allocation, file access, locks or printing inside `engine_tick()`. Detect non-finite state there, but report or count the error from the main thread.

### 01 · Logistic map — 1 state, discrete

Cycles, doubling and digital chaos.

```
x[n+1] = r*x[n]*(1-x[n])
```

**CV:** clock slowly for stepped deterministic modulation. Sweep `r` through stable and chaotic regions. **Audio:** update every sample for bright digital chaos, or divide the update rate for pitch.

Store `x`, `r`, the update rate and a phase accumulator. When the accumulator crosses one update, run the map once; otherwise hold the previous value.

```c
phase += update_rate / sample_rate;
if (phase >= 1.0) {
    phase -= 1.0;
    x = r * x * (1.0 - x);
}
out = 2.0 * x - 1.0;
```

Parameters: initial `x` 0.417, `r` 3.90, CV update 1–20 Hz, audio update at sample rate.
Routing: input CV → map `r` into about 2.5…4.0; output → bipolar map state. Never seed exactly 0 or 1.

### 02 · Duffing — 2 states + drive

The best next build for this project.

```
dx/dt = v
dv/dt = x - x³ - damping*v + drive*cos(phase) + input
```

**CV:** position and velocity become related wandering controls. CV can modulate force, damping or speed. **Audio:** moves from tone to subharmonics, noisy transitions and chaotic motion.

Store position `x`, velocity `v` and forcing phase. Calculate both derivatives from one consistent state and integrate them with RK4.

```c
dx = v;
dv = x - x*x*x
   - damping*v
   + drive*cos(phase)
   + input_gain*input;
dt = simulation_speed / sample_rate;
```

Parameters: damping 0.20, drive 0.30, omega 1.20, initial `x,v` 0.1, 0.
Routing: input 1 → external force; output 1 → scaled position; output 2 → scaled velocity. Add more inputs later for damping, drive and speed.

### 03 · Lorenz — 3 coupled states

Three correlated outputs.

```
dx = σ(y - x)
dy = x(ρ - z) - y
dz = xy - βz
```

**CV:** related but distinct outputs for pitch, timbre and spatial modulation. **Audio:** scale into audio rates for turbulent oscillation and related voices.

RK4 must advance the three variables together; do not update one and use its new value to calculate the next.

```c
dx = sigma * (y - x);
dy = x * (rho - z) - y;
dz = x * y - beta * z;
```

Parameters: sigma 10, rho 28, beta 8/3, initial `x,y,z` 0.1, 0, 0.
Routing: outputs 1–3 → separately scaled `x`, `y` and `z`. A CV input can modulate rho. Never clip the internal Lorenz states.

### 04 · Mackey–Glass — 1 state + history

Chaos from delayed feedback.

```
dx/dt = beta*delayed / (1 + delayedⁿ) - gamma*x
```

**CV:** long delay produces smooth, evolving aperiodic contours. **Audio:** short delay creates pitched feedback that breaks into complex texture.

Allocate a circular history buffer before PortAudio starts. Each update reads the value from `delay_samples` ago, advances `x`, then writes the new state.

```c
delayed = history[read_index];
dx = beta*delayed
   / (1.0 + pow(delayed, exponent))
   - gamma*x;
x += dt * dx;
history[write_index] = x;
```

Parameters: beta 0.20, gamma 0.10, exponent 10, delay 17.
Routing: output → centered and scaled state; input → small disturbance or feedback-strength control. Changing delay continuously requires fractional-delay interpolation.

**Engine implementation order** — build complexity one layer at a time:

1. Logistic: persistent scalar state and an independent update clock.
2. Duffing: two coupled states, external force and RK4 integration.
3. Lorenz: three simultaneous states and three mapped outputs.
4. Mackey–Glass: preallocated circular history and delayed reads.

## 5. Hybrid feedback

Put the modular inside the loop. Attenuation, offset, filtering and VCA movement in the rack become parameters of the feedback system. USB round-trip latency becomes its delay.

```
interface output (chaotic state)
  → rack processing (attenuate · bias · filter · VCA)
  → interface input (nonlinear update ↺)
```

Start with heavy attenuation. Uncontrolled feedback usually reaches clipping or a fixed rail before it finds an interesting attractor. `x*x` also becomes entirely positive; signed functions such as `x - x*x*x`, `tanh` and `sin` are more useful feedback elements.

## 6. Implementation rules

Protect the output, not the attractor. Keep the mathematical system intact internally. Scale and clip only the final value sent to the physical output.

- **Keep internal range.** Do not clip state variables to ±1. That changes the equations and may destroy the attractor.
- **Scale at the edge.** Map state to normalized interface range after updating it, then safely limit the physical output sample.
- **Integrate stably.** Use RK4 or another tested integrator for Duffing, Lorenz and Rössler systems.
- **Recover deliberately.** Detect NaN or infinity, reset to a small nonzero seed, and report outside the real-time callback.
- **Expect aliasing.** Folds, switching and chaotic audio create energy above Nyquist. Oversampling helps audio.
- **Test regimes.** Reference-test stable, periodic and chaotic parameter sets — not only individual arithmetic.

## Recommended build order

Two focused command-line tools:

1. `cv_transform`: extract the current square processor and add cube, double-well, tanh and sine-fold modes.
2. Common I/O: share only audio-device discovery, channel routing, clipping and error handling.
3. `cv_chaos`: start with a clean stateful engine interface and the Logistic map.
4. Add Duffing with RK4, external force input, position output and velocity output.
5. Add multi-channel input mapping for force, damping, drive and simulation speed.
6. Add Lorenz and Mackey–Glass after multi-output and delay-buffer tests are in place.

Next up after this: Rössler and Chua.

One caveat to keep in mind throughout: normalized samples are not volts. Measure and calibrate the connected interface before relying on an exact voltage relationship.
