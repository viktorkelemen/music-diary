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

I've been writing command-line tools that send nonlinear and chaotic signals into the modular through the audio interface. These are the working notes: what shaping is, what chaos is, which curves are worth having, and which systems to build.

## Shape is not chaos

A formula like `x*x` has no memory. Identical inputs always produce identical outputs. Chaos needs state that evolves — through feedback, delay, forcing, or coupled variables.

So there are two binaries, not one.

`cv_transform` is memoryless: one input sample, one selected function, one output sample. Square, cube, rectification, saturation, folding.

```
./cv_transform --mode square --input 1 --output 1
./cv_transform --mode cube   --input 1 --output 1
./cv_transform --mode sine   --drive 2.5 --input 1 --output 1
```

`cv_chaos` owns persistent state, integrators, delay buffers, parameter CV and multiple outputs.

```
./cv_chaos --engine logistic --output 1
./cv_chaos --engine duffing --input 1 --outputs 1,2
./cv_chaos --engine lorenz --outputs 1,2,3
```

Keeping them apart means a transform failure can't destabilize the chaos engine, and the simple binary stays easy to verify. Device discovery, channel routing, clipping and error handling live in shared source files.

## The transfer curve

Pick a transformation and move the drive. The left chart is the rule; the right one runs a bipolar sine through it, sample by sample.

<div class="sig-explorer">
<div class="sig-controls">
<div class="sig-modes" id="sig-modes" aria-label="Transformation"></div>
<label class="sig-drive">Drive <input id="sig-drive" type="range" min="0.25" max="5" step="0.05" value="1"><output id="sig-driveValue">1.00</output></label>
</div>
<div class="sig-charts">
<figure>
<figcaption><span class="sig-label">Transfer curve</span><span class="sig-formula" id="sig-formula">y = x²</span></figcaption>
<svg id="sig-transferChart" class="sig-chart" viewBox="0 0 600 300" role="img" aria-label="Input to output transfer curve"></svg>
</figure>
<figure>
<figcaption><span class="sig-label">Oscilloscope</span><span class="sig-legend"><span><i class="sig-in"></i>IN</span><span><i class="sig-out"></i>OUT</span></span></figcaption>
<svg id="sig-waveChart" class="sig-chart" viewBox="0 0 600 300" role="img" aria-label="Input and transformed output waveforms"></svg>
</figure>
</div>
<div class="sig-effects">
<div class="sig-effect"><strong>CV</strong><p id="sig-cvEffect"></p></div>
<div class="sig-effect"><strong>Audio</strong><p id="sig-audioEffect"></p></div>
</div>
</div>

Smooth odd functions are friendliest in feedback. Even functions create positive DC. Discontinuous functions make the most high-frequency energy and aliasing.

| Function | Shape | CV effect | Audio effect | Role |
|---|---|---|---|---|
| `x²` | even / unipolar | rectification, LFO doubling | DC and even harmonics | shaper |
| `x³` | odd / bipolar | gentle center, strong extremes | odd harmonics, no DC | feedback shaper |
| `x − x³` | odd / non-monotonic | competing regions with feedback | turning-point overtones | restoring force |
| `tanh(gx)` | odd / bounded | smooth runaway control | rounded peak limiting | limiter |
| `sin(gx)` | periodic folds | repeating control zones | bright folded spectrum | feedback map |
| `sign(x)` | discontinuous | gate extraction | square-wave spectrum | switch |

## One equation, different regimes

The logistic map feeds its output back into itself: `x[n+1] = r·x[n]·(1 − x[n])`. As `r` rises, one stable value splits into two, four, eight, and eventually a dense chaotic set.

<figure class="sig-figure">
<figcaption><span class="sig-label">Bifurcation diagram</span><span class="sig-formula">xₙ₊₁ = r xₙ(1−xₙ)</span></figcaption>
<canvas id="sig-bifurcation" aria-label="Logistic map bifurcation diagram"></canvas>
</figure>

Below `r = 3` it settles on one value. Between 3 and about 3.57 it doubles. Above that it's mostly chaos, interrupted by periodic windows.

## Four engines

Each keeps state between PortAudio callbacks. The same engine can be slow CV or an audio oscillator — change the update rate or the integration time scale, not the mathematical structure. Use `double` internally and `float` at the I/O boundary, and allocate every buffer before PortAudio starts.

```c
float raw = engine_tick(&engine, input[i]);
float y = (float)(raw * output_scale);
/* Protect the physical output, not the internal state. */
if (y >  1.0f) y =  1.0f;
if (y < -1.0f) y = -1.0f;
output[i] = y;
```

No allocation, file access, locks or printing inside `engine_tick()`. Detect non-finite state there, but report it from the main thread.

### Logistic map — one state, discrete

Cycles, doubling, digital chaos. Clocked slowly it's stepped deterministic modulation; at sample rate it's bright digital noise, and dividing the update rate gives pitch.

Store `x`, `r`, the update rate and a phase accumulator. When the accumulator crosses one update, run the map once; otherwise hold.

```c
phase += update_rate / sample_rate;
if (phase >= 1.0) {
    phase -= 1.0;
    x = r * x * (1.0 - x);
}
out = 2.0 * x - 1.0;
```

Initial `x` 0.417, `r` 3.90, CV update 1–20 Hz. Input CV maps `r` into roughly 2.5–4.0; the output is the bipolar map state. Never seed exactly 0 or 1.

### Duffing — two states plus drive

The one I want to build next. It moves from tone to subharmonics to noisy transitions and chaotic motion; as CV, position and velocity are related wandering controls.

Store position, velocity and forcing phase. Calculate both derivatives from one consistent state and integrate with RK4.

```c
dx = v;
dv = x - x*x*x
   - damping*v
   + drive*cos(phase)
   + input_gain*input;
dt = simulation_speed / sample_rate;
```

Damping 0.20, drive 0.30, omega 1.20, initial `x,v` 0.1 and 0. Input 1 is external force; output 1 scaled position, output 2 scaled velocity. More inputs later for damping, drive and speed.

### Lorenz — three coupled states

Three related but distinct outputs: pitch, timbre, spatial modulation. Scaled into audio rates it's turbulent oscillation.

```c
dx = sigma * (y - x);
dy = x * (rho - z) - y;
dz = x * y - beta * z;
```

RK4 has to advance the three together — don't update one and use its new value for the next. Sigma 10, rho 28, beta 8/3, initial `x,y,z` 0.1, 0, 0. Outputs 1–3 are separately scaled `x`, `y`, `z`; a CV input can modulate rho. Never clip the internal states.

### Mackey–Glass — one state plus history

Chaos from delayed feedback. A long delay gives smooth aperiodic contours; a short one gives pitched feedback that breaks into texture.

Allocate the circular history buffer before PortAudio starts. Each update reads the value from `delay_samples` ago, advances `x`, then writes the new state.

```c
delayed = history[read_index];
dx = beta*delayed
   / (1.0 + pow(delayed, exponent))
   - gamma*x;
x += dt * dx;
history[write_index] = x;
```

Beta 0.20, gamma 0.10, exponent 10, delay 17. Changing the delay continuously needs fractional-delay interpolation.

## Feedback through the rack

Send the chaotic state out, run it through attenuation, bias, filtering and a VCA, and bring it back in. The rack becomes part of the equation and the USB round-trip becomes its delay.

Start with heavy attenuation. Uncontrolled feedback usually hits clipping or a rail before it finds anything interesting. `x*x` also goes entirely positive, so signed functions — `x - x*x*x`, `tanh`, `sin` — work better in the loop.

## Rules

Protect the output, not the attractor.

- Don't clip state variables to ±1. That changes the equations and can destroy the attractor.
- Map state to interface range after updating it, then limit the physical output sample.
- Use RK4 or another tested integrator for Duffing, Lorenz and Rössler.
- Detect NaN or infinity, reset to a small nonzero seed, report outside the callback.
- Expect aliasing. Folds, switching and chaotic audio all put energy above Nyquist.
- Test stable, periodic and chaotic parameter sets, not just the arithmetic.

Also: normalized samples are not volts. Measure and calibrate the interface before trusting any exact voltage relationship.

## Build order

Extract the square processor into `cv_transform` and add cube, double-well, tanh and sine-fold. Pull device discovery, routing, clipping and error handling into shared I/O. Then `cv_chaos` with a clean stateful engine interface and the logistic map. Then Duffing with RK4, force input, position and velocity outputs. Then multi-channel input mapping. Lorenz and Mackey–Glass come after the multi-output and delay-buffer tests are in place.

Rössler and Chua after that.

<style>
.sig-explorer { border: 1px solid var(--border); background: #fff; margin: 1.5rem 0; }
.sig-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.sig-modes { display: flex; flex-wrap: wrap; gap: 6px; }
.sig-modes .mode { border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; padding: 5px 10px; font: 11px var(--mono); }
.sig-modes .mode:hover { color: var(--fg); }
.sig-modes .mode[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: rgba(0, 85, 204, 0.07); }
.sig-drive { display: flex; align-items: center; gap: 10px; font: 11px var(--mono); text-transform: uppercase; color: var(--muted); }
.sig-drive input[type="range"] { width: 120px; accent-color: var(--accent); }
.sig-drive output { color: var(--accent); min-width: 34px; }
.sig-charts { display: grid; grid-template-columns: 1fr 1fr; }
.sig-charts figure { margin: 0; padding: 14px; }
.sig-charts figure + figure { border-left: 1px solid var(--border); }
.sig-explorer figcaption, .sig-figure figcaption { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.sig-label { color: var(--muted); font: 10px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }
.sig-formula { font: 13px var(--mono); color: var(--fg); }
.sig-legend { display: flex; gap: 12px; color: var(--muted); font: 10px var(--mono); }
.sig-legend i { display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; }
.sig-legend .sig-in { background: var(--wordmark-orange); }
.sig-legend .sig-out { background: var(--accent); }
.sig-chart { display: block; width: 100%; height: auto; overflow: visible; }
.sig-chart .axis { stroke: #9a958e; stroke-width: 1; }
.sig-chart .grid { stroke: var(--border); stroke-width: 1; stroke-dasharray: 2 6; }
.sig-chart .curve-input { fill: none; stroke: var(--wordmark-orange); stroke-width: 1.6; opacity: 0.75; }
.sig-chart .curve-output { fill: none; stroke: var(--accent); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.sig-chart .chart-text { fill: var(--muted); font: 10px var(--mono); }
.sig-effects { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border); }
.sig-effect { padding: 14px; }
.sig-effect + .sig-effect { border-left: 1px solid var(--border); }
.sig-effect strong { display: block; margin-bottom: 4px; color: var(--muted); font: 10px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }
.sig-effect p { margin: 0; font-size: 13px; }
.sig-figure { margin: 1.5rem 0; padding: 14px; border: 1px solid var(--border); background: #fff; }
#sig-bifurcation { display: block; width: 100%; height: 360px; }
@media (max-width: 640px) {
  .sig-charts, .sig-effects { grid-template-columns: 1fr; }
  .sig-charts figure + figure, .sig-effect + .sig-effect { border-left: 0; border-top: 1px solid var(--border); }
  #sig-bifurcation { height: 260px; }
}
</style>

<script>
(() => {
  const transforms = {
    square: { name: 'Square', formula: 'y = x²', cv: 'Folds both polarities upward. Bipolar motion becomes unipolar; a sine LFO runs at twice the rate.', audio: 'Creates DC and even harmonics. A centered sine becomes mostly an octave plus positive offset.', fn: (x) => x*x },
    cube: { name: 'Signed cube', formula: 'y = x³', cv: 'Keeps polarity while reducing small movements. Useful when feedback must remain bipolar.', audio: 'Adds odd harmonics with a smooth symmetric curve and no DC for centered input.', fn: (x) => x*x*x },
    doubleWell: { name: 'Double well', formula: 'y = gx − x³', cv: 'An S-shaped restoring force. With state and feedback, it can support two competing regions.', audio: 'Non-monotonic shaping: louder input can turn back toward zero, producing complex overtones.', fn: (x,g) => g*x-x*x*x },
    tanh: { name: 'Soft saturation', formula: 'y = tanh(gx)', cv: 'Limits runaway feedback smoothly while preserving sign and gentle motion near zero.', audio: 'Rounds peaks progressively. More drive approaches hard limiting without an abrupt corner.', fn: (x,g) => Math.tanh(g*x) },
    sine: { name: 'Sine fold', formula: 'y = sin(gx)', cv: 'Creates repeated rising and falling control regions as drive increases.', audio: 'Wavefolding produces a bright metallic spectrum and increasingly dense harmonics.', fn: (x,g) => Math.sin(g*x) }
  };
  let selected = 'square';
  const modes = document.querySelector('#sig-modes');
  const drive = document.querySelector('#sig-drive');
  const value = document.querySelector('#sig-driveValue');
  if (!modes || !drive) return;
  const svgNS = 'http://www.w3.org/2000/svg';

  for (const [key, item] of Object.entries(transforms)) {
    const button = document.createElement('button');
    button.className = 'mode';
    button.textContent = item.name;
    button.type = 'button';
    button.setAttribute('aria-pressed', key === selected);
    button.addEventListener('click', () => {
      selected = key;
      [...modes.children].forEach((b) => b.setAttribute('aria-pressed', b === button));
      draw();
    });
    modes.append(button);
  }

  function sample(x) {
    return Math.max(-1, Math.min(1, transforms[selected].fn(x, Number(drive.value))));
  }
  function xy(x, y, bounds) {
    return [bounds.l + (x-bounds.x0)/(bounds.x1-bounds.x0)*(bounds.r-bounds.l), bounds.b - (y-bounds.y0)/(bounds.y1-bounds.y0)*(bounds.b-bounds.t)];
  }
  function element(name, attrs = {}) {
    const node = document.createElementNS(svgNS, name);
    for (const [key,val] of Object.entries(attrs)) node.setAttribute(key, val);
    return node;
  }
  function scaffold(svg, xDomain) {
    svg.replaceChildren();
    const b = { l: 42, r: 586, t: 12, b: 270, x0: xDomain[0], x1: xDomain[1], y0: -1, y1: 1 };
    for (let i=0;i<=4;i++) {
      const y=-1+i*.5, p=xy(b.x0,y,b);
      svg.append(element('line',{x1:b.l,y1:p[1],x2:b.r,y2:p[1],class:'grid'}));
      const text=element('text',{x:5,y:p[1]+4,class:'chart-text'}); text.textContent=y.toFixed(1); svg.append(text);
    }
    for (let i=0;i<=4;i++) {
      const x=b.x0+(b.x1-b.x0)*i/4, p=xy(x,0,b);
      const text=element('text',{x:p[0]-8,y:292,class:'chart-text'}); text.textContent=x.toFixed(1); svg.append(text);
    }
    const zeroY=xy(0,0,b)[1]; svg.append(element('line',{x1:b.l,y1:zeroY,x2:b.r,y2:zeroY,class:'axis'}));
    if (xDomain[0] <= 0 && xDomain[1] >= 0) { const zeroX=xy(0,0,b)[0]; svg.append(element('line',{x1:zeroX,y1:b.t,x2:zeroX,y2:b.b,class:'axis'})); }
    return b;
  }
  function pathFor(points, bounds) { return points.map(([x,y],i) => `${i?'L':'M'}${xy(x,y,bounds).join(',')}`).join(' '); }
  function draw() {
    const item=transforms[selected];
    value.textContent=Number(drive.value).toFixed(2);
    document.querySelector('#sig-formula').textContent=item.formula;
    document.querySelector('#sig-cvEffect').textContent=item.cv;
    document.querySelector('#sig-audioEffect').textContent=item.audio;

    const transfer=document.querySelector('#sig-transferChart'), tb=scaffold(transfer,[-1,1]);
    const transferPoints=Array.from({length:161},(_,i)=>{const x=-1+2*i/160;return [x,sample(x)];});
    transfer.append(element('path',{d:pathFor(transferPoints,tb),class:'curve-output'}));

    const wave=document.querySelector('#sig-waveChart'), wb=scaffold(wave,[0,2]);
    const input=[], output=[];
    for(let i=0;i<=200;i++){const t=2*i/200,x=.82*Math.sin(t*Math.PI*2);input.push([t,x]);output.push([t,sample(x)]);}
    wave.append(element('path',{d:pathFor(input,wb),class:'curve-input'}));
    wave.append(element('path',{d:pathFor(output,wb),class:'curve-output'}));
  }
  drive.addEventListener('input', draw);

  function drawBifurcation() {
    const canvas=document.querySelector('#sig-bifurcation');
    if (!canvas) return;
    const rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
    if (rect.width < 1) return;
    canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,rect.width,rect.height);
    const pad={l:42,r:14,t:16,b:30},w=rect.width-pad.l-pad.r,h=rect.height-pad.t-pad.b;
    ctx.strokeStyle='#d4d0ca';ctx.lineWidth=1;ctx.setLineDash([2,6]);
    for(let i=0;i<=4;i++){const y=pad.t+h*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+w,y);ctx.stroke();}
    ctx.setLineDash([]);ctx.fillStyle='#68645f';ctx.font='10px "Space Mono", ui-monospace, monospace';
    [2.5,3,3.5,4].forEach((r,i)=>ctx.fillText(r.toFixed(1),pad.l+w*i/3-8,rect.height-10));
    [1,.75,.5,.25,0].forEach((s,i)=>ctx.fillText(String(s),8,pad.t+h*i/4+3));
    ctx.fillStyle='rgba(0, 85, 204, .5)';
    for(let px=0;px<Math.floor(w);px++){const r=2.5+1.5*px/w;let x=.417;for(let n=0;n<210;n++){x=r*x*(1-x);if(n>165)ctx.fillRect(pad.l+px,pad.t+(1-x)*h,1,1);}}
  }
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawBifurcation, 150); });
  draw(); drawBifurcation();
})();
</script>
