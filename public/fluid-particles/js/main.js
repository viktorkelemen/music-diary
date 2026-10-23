import { createGL, makeProgram, createFBO, createDoubleFBO, bindTarget, blit, hexToRgb } from './gl.js';
import * as S from './shaders.js';
import { AudioEngine, N_EMITTER_BANDS } from './audio.js';
import { Fluid } from './fluid.js';
import { DEFAULTS, MODE_PRESETS, MODE_INDEX, RANDOM_KEYS, PALETTES, buildGui } from './params.js';

const STORE_KEY = 'fluidParticles.presets.v1';
const LAST_KEY = 'fluidParticles.last.v1';
const STATE_W = 1024; // particle state texture is STATE_W x STATE_W (max ~1M particles)
const MAX_RIPPLES = 8;
const CHLADNI_PATTERNS = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 5], [3, 5], [4, 5], [2, 7], [3, 7], [5, 6],
];

const P = structuredClone(DEFAULTS);
try {
  Object.assign(P, JSON.parse(localStorage.getItem(LAST_KEY) || '{}'));
} catch {}

const canvas = document.getElementById('c');
let gl;
try {
  gl = createGL(canvas);
} catch (e) {
  document.getElementById('start').innerHTML = `<p class="err">${e.message}</p>`;
  throw e;
}

const prog = {
  update: makeProgram(gl, S.FS_VERT, S.PARTICLE_UPDATE),
  draw: makeProgram(gl, S.PARTICLE_VERT, S.PARTICLE_FRAG),
  fade: makeProgram(gl, S.FS_VERT, S.FADE),
  line: makeProgram(gl, S.LINE_VERT, S.LINE_FRAG),
  blur: makeProgram(gl, S.FS_VERT, S.BLUR),
  composite: makeProgram(gl, S.FS_VERT, S.COMPOSITE),
};

const audio = new AudioEngine();
const fluid = new Fluid(gl);

// ---------- particle state ----------
const state = createDoubleFBO(gl, STATE_W, STATE_W, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
const randData = new Float32Array(STATE_W * STATE_W * 4);
for (let i = 0; i < randData.length; i++) randData[i] = Math.random();
const randTex = createFBO(gl, STATE_W, STATE_W, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, randData);

let aspect = 1;
function gauss() {
  return Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) * Math.cos(2 * Math.PI * Math.random());
}
// Lines wrap at the visible edge, which grows when zoomed out.
function hlHalfWidth() {
  return (aspect / Math.min(1, P.zoom)) * 1.02;
}
function reseed() {
  const d = new Float32Array(STATE_W * STATE_W * 4);
  const hlCount = Math.max(1, Math.round(P.hlCount));
  for (let i = 0; i < STATE_W * STATE_W; i++) {
    if (P.mode === 'hlines') {
      d[i * 4] = (Math.random() * 2 - 1) * hlHalfWidth();
      d[i * 4 + 1] = -P.hlSpan + (((i % hlCount) + 0.5) / hlCount) * 2 * P.hlSpan;
    } else if (P.mode === 'silk') {
      d[i * 4] = gauss() * P.spawnRadius;
      d[i * 4 + 1] = gauss() * P.spawnRadius;
    } else {
      d[i * 4] = (Math.random() * 2 - 1) * aspect;
      d[i * 4 + 1] = Math.random() * 2 - 1;
    }
  }
  state.read.upload(d);
  state.write.upload(d);
  trail?.clear();
}

// ---------- render targets ----------
let trail, bloomA, bloomB;
// Canvas is letterboxed to the chosen aspect ratio (w / h); null fills the window.
const ASPECTS = { fill: null, '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5 };
let cssH = innerHeight;
function resize() {
  const ratio = ASPECTS[P.aspectRatio] ?? null;
  let cssW = innerWidth;
  cssH = innerHeight;
  if (ratio) {
    if (cssW / cssH > ratio) cssW = cssH * ratio;
    else cssH = cssW / ratio;
  }
  Object.assign(canvas.style, {
    width: `${cssW}px`,
    height: `${cssH}px`,
    left: `${(innerWidth - cssW) / 2}px`,
    top: `${(innerHeight - cssH) / 2}px`,
  });
  const dpr = Math.min(2, window.devicePixelRatio || 1) * P.renderScale;
  const w = Math.max(2, Math.round(cssW * dpr));
  const h = Math.max(2, Math.round(cssH * dpr));
  canvas.width = w;
  canvas.height = h;
  const newAspect = w / h;
  [trail, bloomA, bloomB].forEach((f) => f?.dispose());
  trail = createFBO(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
  const bw = Math.max(2, Math.round(w / 4));
  const bh = Math.max(2, Math.round(h / 4));
  bloomA = createFBO(gl, bw, bh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
  bloomB = createFBO(gl, bw, bh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
  if (Math.abs(newAspect - aspect) > 1e-3 || !fluid.velocity) {
    aspect = newAspect;
    fluid.resize(P.simRes, P.dyeRes, aspect);
  }
}
resize();
reseed();
addEventListener('resize', resize);

// ---------- audio-driven events ----------
let time = 0;
const ripples = [];
function addRipple(strength) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * P.rippleSpread;
  ripples.push([Math.cos(a) * r * aspect, Math.sin(a) * r, time, strength]);
  while (ripples.length > MAX_RIPPLES) ripples.shift();
}
function inkDrop(strength = 1) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * P.inkSpread;
  const u = 0.5 + (Math.cos(a) * r) / 2;
  const v = 0.5 + (Math.sin(a) * r) / 2;
  const s = 0.5 + strength;
  fluid.splatRadial(u, v, P.inkSize * 3, P.inkForce * s);
  fluid.splatDye(u, v, P.inkSize, P.inkAmount * s, 0, 0);
  fluid.splatDye(u, v, P.inkSize * 6, 0, P.milkHalo * 0.35 * s, P.milkHalo * 0.15 * s);
}
audio.onOnset = (strength) => {
  if (P.mode === 'silk') addRipple(strength);
  if (P.mode === 'ink') inkDrop(strength);
};

// ---------- gradient ----------
const COLOR_BY = { random: 0, speed: 1, height: 2, angle: 3, radius: 4 };
function stops() {
  return [P.stop1, P.stop2, P.stop3, P.stop4, P.stop5].flatMap(hexToRgb);
}
// Same mirrored 5-stop ramp as the shader, for colors used outside it (dye, highlights).
function rampJs(st, t) {
  t = 1 - Math.abs(((t * 0.5) % 1) * 2 - 1);
  const x = t * 4;
  const i = Math.min(Math.floor(x), 3);
  let f = x - i;
  f = f * f * (3 - 2 * f);
  return [0, 1, 2].map((k) => st[i * 3 + k] * (1 - f) + st[(i + 1) * 3 + k] * f);
}
let gradDrift = 0;
let pitchShift = 0;

// Chladni pattern state (morphs between patterns chosen by the dominant pitch class).
const chl = { from: [2, 5], to: [2, 5], mix: 1, pc: -1, cand: -1, candT: 0 };
function updateChladni(dt, f) {
  let target = null;
  if (P.pitchFollow) {
    if (f.pitch !== chl.pc && audio.playing) {
      if (f.pitch === chl.cand) chl.candT += dt;
      else {
        chl.cand = f.pitch;
        chl.candT = 0;
      }
      if (chl.candT >= P.holdTime) {
        chl.pc = f.pitch;
        const [n, m] = CHLADNI_PATTERNS[f.pitch];
        target = [n + P.complexity, m + P.complexity];
      }
    }
  } else {
    target = [P.manualN, P.manualM];
  }
  if (target && (target[0] !== chl.to[0] || target[1] !== chl.to[1])) {
    chl.from = chl.mix < 0.5 ? chl.from : chl.to;
    chl.to = target;
    chl.mix = 0;
  }
  chl.mix = Math.min(1, chl.mix + dt / P.morphTime);
}

// Cymatic ring: each emitter is a log-spaced frequency band pushing fluid inward.
let ringPhase = 0;
function driveCymatic(dt, f) {
  ringPhase += dt * P.ringRotate * Math.PI * 2;
  const n = P.emitters;
  const ang = (P.emitterAngle * Math.PI) / 180;
  for (let i = 0; i < n; i++) {
    // map emitter -> band (spread over the 32 analysis bands)
    const b = f.bands[Math.min(N_EMITTER_BANDS - 1, Math.floor((i / n) * N_EMITTER_BANDS))];
    const e = b * b * (1 + f.onset * P.onsetBoost);
    if (e < 0.01) continue;
    const th = (i / n) * Math.PI * 2 + ringPhase;
    const x = Math.cos(th) * P.ringRadius;
    const y = Math.sin(th) * P.ringRadius;
    const u = 0.5 + x / (2 * aspect);
    const v = 0.5 + y / 2;
    // inward direction rotated by emitterAngle
    const dx = -Math.cos(th + ang);
    const dy = -Math.sin(th + ang);
    const force = P.emitterForce * e;
    fluid.splatVelocity(u, v, P.emitterRadius, dx * force, dy * force);
    const pinkish = i % 2 === 0 ? 1 : 0.35;
    const amt = P.emitterDye * e * dt * 10;
    fluid.splatDye(u, v, P.emitterRadius * 1.5, P.emitterInk * e * e * dt * 10, amt * pinkish, amt * (1.2 - pinkish));
  }
}

let stirPhase = 0;
let dripAcc = 0;
function driveInk(dt, f) {
  stirPhase += dt * 0.35;
  const sx = 0.5 + (Math.cos(stirPhase) * 0.35) / aspect;
  const sy = 0.5 + Math.sin(stirPhase * 1.3) * 0.3;
  const tx = -Math.sin(stirPhase);
  const ty = Math.cos(stirPhase * 1.3);
  const force = P.milkStir * f.low * f.low;
  if (force > 1) fluid.splatVelocity(sx, sy, 0.01, tx * force, ty * force);
  dripAcc += dt * P.autoDrip;
  while (dripAcc >= 1) {
    dripAcc -= 1;
    inkDrop(0.5);
  }
}

// ---------- frame ----------
let last = performance.now();
const hlBands = new Float32Array(N_EMITTER_BANDS); // time-smoothed spectrum for horizontal lines
let stopped = false; // stop freezes the simulation; play after stop starts it fresh
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  if (stopped) {
    updateProgress();
    requestAnimationFrame(frame);
    return;
  }
  time += dt;
  const f = audio.update(dt, P);
  gradDrift += dt * P.gradDrift;
  pitchShift += ((f.pitch / 12) * P.gradPitch - pitchShift) * (1 - Math.exp(-dt / 0.8));
  const gradShift = gradDrift + pitchShift + f.level * P.gradLevel;
  const st = stops();
  const kSmooth = 1 - Math.exp(-dt / Math.max(0.001, P.hlSmoothTime));
  for (let i = 0; i < N_EMITTER_BANDS; i++) hlBands[i] += (f.bands[i] - hlBands[i]) * kSmooth;

  const mode = P.mode;
  const usesFluid = mode === 'fluid' || mode === 'ink';
  if (usesFluid) {
    if (mode === 'fluid') driveCymatic(dt, f);
    else driveInk(dt, f);
    fluid.step(dt, P, time, P.turbulence * f.bass);
  }
  if (mode === 'chladni') updateChladni(dt, f);

  gl.disable(gl.BLEND);
  const count = Math.min(STATE_W * STATE_W, Math.max(1, Math.round(P.count)));
  const rows = Math.ceil(count / STATE_W);

  // 1. particle physics
  const rip = new Float32Array(MAX_RIPPLES * 4);
  ripples.forEach((r, i) => rip.set(r, i * 4));
  bindTarget(gl, state.write, rows);
  prog.update.use().set({
    uState: state.read.attach(0),
    uRand: randTex.attach(1),
    uVel: fluid.velocity.read.attach(2),
    uMode: MODE_INDEX[mode],
    uTime: time,
    uDt: dt,
    uAspect: aspect,
    uBass: f.bass,
    uMid: f.mid,
    uHigh: Math.max(f.high, f.air),
    uLevel: f.level,
    uOnset: f.onset,
    uRipples: rip,
    uRippleCount: ripples.length,
    uRespawn: P.respawn,
    uFlowSpeed: P.flowSpeed,
    uCurlScale: P.curlScale,
    uCurlEvolve: P.curlEvolve,
    uFlowFollow: P.flowFollow,
    uBassDrive: P.bassDrive,
    uDamping: P.damping,
    uCenterPull: P.centerPull,
    uBreath: P.breath,
    uSwirl: P.swirl,
    uSwirlAudio: P.swirlAudio,
    uRippleForce: P.rippleForce,
    uRippleSpeed: P.rippleSpeed,
    uRippleWidth: P.rippleWidth,
    uRippleDecay: P.rippleDecay,
    uShimmer: P.shimmer,
    uSpawnRadius: P.spawnRadius,
    uFluidFollow: P.fluidFollow,
    uSimScale: 2 / fluid.simH,
    uWander: P.wander,
    uPat: [chl.from[0], chl.from[1], chl.to[0], chl.to[1]],
    uPatMix: smooth(chl.mix),
    uChForce: P.chForce,
    uVibration: P.vibration,
    uChDamping: P.chDamping,
    uPlateScale: P.plateScale,
    uRest: P.rest,
    uBands: hlBands,
    uHlCount: Math.round(P.hlCount),
    uHlSpan: P.hlSpan,
    uHlAmp: P.hlAmp,
    uHlDrift: P.hlDrift,
    uHlNoise: P.hlNoise,
    uHlNoiseScale: P.hlNoiseScale,
    uHlNoiseSpeed: P.hlNoiseSpeed,
    uHlStiff: P.hlStiff,
    uHlDamp: P.hlDamp,
    uHlFocus: P.hlFocus,
    uHlBassCenter: P.hlBassCenter ? 1 : 0,
    uHlThickness: P.hlThickness,
    uHlOnset: P.hlOnset,
    uHlHalfWidth: hlHalfWidth(),
    uHlSmooth: P.hlSmooth,
  });
  blit(gl);
  state.swap();

  // 2. trails + particles
  bindTarget(gl, trail);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
  prog.fade.use().set({ uKeep: Math.pow(P.trail, dt * 60) });
  blit(gl);

  if (P.blend === 'glow') gl.blendFunc(gl.ONE, gl.ONE);
  else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const dpr = canvas.height / cssH;
  prog.draw.use().set({
    uState: state.read.attach(0),
    uRand: randTex.attach(1),
    uTexW: STATE_W,
    uAspect: aspect,
    uZoom: P.zoom,
    uSize: P.size,
    uSizeVar: P.sizeVar,
    uPxScale: dpr * P.zoom,
    uLevel: f.level,
    uSizeAudio: P.sizeAudio,
    uOnset: f.onset,
    uOnsetPop: P.onsetPop,
    uOpacity: P.opacity,
    uAlphaVar: P.alphaVar,
    uBlackRatio: P.blend === 'glow' ? 0 : P.blackRatio,
    uColorBy: COLOR_BY[P.colorBy] ?? 0,
    uGradScale: P.gradScale,
    uGradShift: gradShift,
    uSpeedColor: P.speedColor,
    uInkAlpha: P.inkAlpha,
    uStops: st,
    uInk: hexToRgb(P.ink),
    uRes: [canvas.width, canvas.height],
    uStreak: P.streak,
    uStreakMax: P.streakMax * dpr,
    uStreakAxis: mode === 'hlines' ? [1, 0.1] : [1, 1],
    uSoftness: P.softness,
    uTailFade: P.tailFade,
  });
  gl.drawArrays(gl.TRIANGLES, 0, count * 6);

  if (P.lines) {
    const n = Math.min(count, Math.round(P.lineNodes));
    prog.line.use().set({
      uState: state.read.attach(0),
      uRand: randTex.attach(1),
      uTexW: STATE_W,
      uAspect: aspect,
      uZoom: P.zoom,
      uMaxDist: P.lineDist * (1 + f.level * P.lineDistAudio),
      uOpacity: P.lineOpacity,
      uStops: st,
      uGradScale: P.gradScale,
      uGradShift: gradShift,
      uSegments: Math.max(1, Math.round(P.lineSegments)),
      uBend: P.lineBend,
      uFlow: P.lineFlow,
    });
    gl.drawArrays(gl.LINES, 0, n * (n - 1) * Math.max(1, Math.round(P.lineSegments)));
  }
  gl.disable(gl.BLEND);

  // 3. bloom (quarter res, two separable gaussian passes)
  prog.blur.use();
  const passes = [
    [trail, bloomA, [1, 0], 1],
    [bloomA, bloomB, [0, 1], 1],
    [bloomB, bloomA, [1, 0], 2],
    [bloomA, bloomB, [0, 1], 2],
  ];
  for (const [src, dst, dir, mul] of passes) {
    bindTarget(gl, dst);
    const r = P.bloomRadius * mul;
    prog.blur.set({ uSrc: src.attach(0), uDir: [dir[0] * r * dst.texel[0], dir[1] * r * dst.texel[1]] });
    blit(gl);
  }

  // 4. composite
  bindTarget(gl, null);
  prog.composite.use().set({
    uTrail: trail.attach(0),
    uBloom: bloomB.attach(1),
    uDye: fluid.dye.read.attach(2),
    uBgTop: hexToRgb(P.bgTop),
    uBgBottom: hexToRgb(P.bgBottom),
    uInk: hexToRgb(P.ink),
    uDyeA: rampJs(st, 0.5 + gradShift),
    uDyeB: rampJs(st, 0.9 + gradShift),
    uHighlight: rampJs(st, 1.0),
    uChroma: P.chroma,
    uExposure: P.exposure,
    uUseDye: usesFluid ? 1 : 0,
    uDyeOpacity: P.dyeOpacity,
    uBloomAmt: P.bloom,
    uHaze: P.haze,
    uGrain: P.grain,
    uVignette: P.vignette,
    uTime: time,
    uAspect: aspect,
    uGlow: P.blend === 'glow' ? 1 : 0,
    uBgBreath: P.bgBreath,
    uLevel: f.level,
    uInvert: P.invert ? 1 : 0,
    uRes: [canvas.width, canvas.height],
  });
  blit(gl);

  updateProgress();
  requestAnimationFrame(frame);
}

function smooth(x) {
  return x * x * (3 - 2 * x);
}

// ---------- progress bar ----------
const progress = document.getElementById('progress');
const progressFill = progress.firstElementChild;
function updateProgress() {
  const d = audio.el.duration;
  progressFill.style.width = d ? `${(audio.el.currentTime / d) * 100}%` : '0%';
}
progress.addEventListener('click', (e) => {
  const d = audio.el.duration;
  if (d) audio.el.currentTime = (e.clientX / innerWidth) * d;
});

// ---------- files & presets ----------
const fileInput = document.getElementById('file');
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) loadFile(file);
  fileInput.value = '';
});
function loadFile(file) {
  if (file.type.startsWith('audio') || /\.(wav|mp3|ogg|flac|m4a|aif+)$/i.test(file.name)) {
    audio.load(URL.createObjectURL(file), file.name);
  } else if (file.name.endsWith('.json')) {
    file.text().then((t) => applyPreset(JSON.parse(t)));
  }
}
addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('drag');
});
addEventListener('dragleave', () => document.body.classList.remove('drag'));
addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function readPresets() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}
function writePresets(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {}
}
function applyPreset(obj) {
  const prevMode = P.mode;
  for (const k in obj) if (k in DEFAULTS) P[k] = obj[k];
  ui.refresh();
  ui.showForMode(P.mode);
  if (P.mode !== prevMode) reseed();
  resize();
}
function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// File name derived from the settings: mode, palette and two words picked by a hash of every
// value, plus a short time code so repeated saves never collide.
const NAME_ADJ = ['velvet', 'amber', 'quiet', 'silver', 'drifting', 'hollow', 'pale', 'molten', 'woven', 'lunar',
  'misty', 'glass', 'tidal', 'ember', 'feather', 'slow', 'opal', 'distant', 'soft', 'electric'];
const NAME_NOUN = ['heron', 'tide', 'veil', 'orbit', 'murmur', 'lantern', 'ripple', 'dune', 'halo', 'thread',
  'cinder', 'bloom', 'echo', 'mirage', 'current', 'petal', 'prism', 'drift', 'shoal', 'aurora'];
function settingsName(ext = 'json') {
  let h = 2166136261;
  for (const ch of JSON.stringify(P)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const words = `${NAME_ADJ[h % NAME_ADJ.length]}-${NAME_NOUN[(h >>> 8) % NAME_NOUN.length]}`;
  return `${P.mode}-${slug(P.palette)}-${words}-${Date.now().toString(36).slice(-6)}.${ext}`;
}

// Render the whole track to video in real time: fresh start, loop off, stop when the audio ends.
let recorder = null;
function renderVideo() {
  if (recorder) {
    recorder.cancelled = true;
    recorder.stop();
    return;
  }
  if (!audio.ctx || audio.source !== 'file') return;
  const stream = canvas.captureStream(60);
  audio.recordDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 40e6 });
  const chunks = [];
  const name = settingsName('webm');
  const prevLoop = P.loop;
  const onEnded = () => rec.stop();
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    P.loop = prevLoop;
    recorder = null;
    audio.el.removeEventListener('ended', onEnded);
    document.body.classList.remove('rec');
    if (!rec.cancelled) download(name, new Blob(chunks, { type: 'video/webm' }));
  };
  audio.el.addEventListener('ended', onEnded);

  P.loop = false;
  audio.el.pause();
  stopped = false;
  ripples.length = 0;
  fluid.clear();
  reseed();
  audio.el.currentTime = 0;
  recorder = rec;
  document.body.classList.add('rec');
  rec.start(1000);
  audio.ctx.resume();
  audio.el.play();
}

function setMode(mode) {
  P.mode = mode;
  if (P.applyModeLook) Object.assign(P, MODE_PRESETS[mode]);
  ripples.length = 0;
  fluid.clear();
  reseed();
  ui.refresh();
  ui.showForMode(mode);
}

const handlers = {
  onMode: setMode,
  togglePlay: () => {
    if (stopped) {
      stopped = false;
      ripples.length = 0;
      fluid.clear();
      reseed();
      audio.el.currentTime = 0;
      if (!audio.el.paused) return;
    }
    audio.togglePlay();
  },
  stop: () => {
    stopped = true;
    audio.el.pause();
    audio.el.currentTime = 0;
  },
  restart: () => {
    stopped = false;
    audio.ctx?.resume();
    audio.el.currentTime = 0;
    audio.el.play().catch(() => {});
  },
  openFile: () => fileInput.click(),
  reseed,
  resize,
  resizeFluid: () => fluid.resize(P.simRes, P.dyeRes, aspect),
  clearFluid: () => fluid.clear(),
  inkDrop: () => inkDrop(1),
  savePreset: (name) => {
    const all = readPresets();
    all[name] = { ...P };
    writePresets(all);
    ui.refreshPicker(Object.keys(all));
  },
  loadPreset: (name) => {
    const p = readPresets()[name];
    if (p) applyPreset(p);
  },
  deletePreset: (name) => {
    const all = readPresets();
    delete all[name];
    writePresets(all);
    ui.refreshPicker(Object.keys(all));
  },
  renderVideo,
  saveSettings: () => download(settingsName(), new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' })),
  loadSettings: () => fileInput.click(),
  randomize: () => {
    for (const ctrl of ui.gui.controllersRecursive()) {
      if (!RANDOM_KEYS.includes(ctrl.property) || ctrl.object !== P) continue;
      if (ctrl._min === undefined || ctrl._max === undefined) continue;
      const span = ctrl._max - ctrl._min;
      let v = P[ctrl.property] + (Math.random() * 2 - 1) * span * 0.25;
      v = Math.min(ctrl._max, Math.max(ctrl._min, v));
      if (ctrl._step) v = Math.round(v / ctrl._step) * ctrl._step;
      P[ctrl.property] = v;
    }
    ui.refresh();
  },
  applyPalette: (name) => {
    Object.assign(P, PALETTES[name]);
    ui.refresh();
  },
  resetAll: () => {
    applyPreset(structuredClone(DEFAULTS));
    reseed();
  },
};

const ui = buildGui(P, handlers);
ui.refreshPicker(Object.keys(readPresets()));
ui.showForMode(P.mode);
ui.gui.onChange(() => {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(P));
  } catch {}
});

// ---------- keys ----------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const modes = ['silk', 'fluid', 'ink', 'chladni', 'hlines'];
  if (e.key >= '1' && e.key <= '5') setMode(modes[+e.key - 1]);
  else if (e.code === 'Space') {
    e.preventDefault();
    handlers.togglePlay();
  } else if (e.key === 'g') ui.gui.show(ui.gui._hidden);
  else if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (e.key === 'x') reseed();
  else if (e.key === 'c') fluid.clear();
  else if (e.key === 'd') inkDrop(1);
});

// ---------- start ----------
const start = document.getElementById('start');
start.addEventListener('click', async () => {
  start.classList.add('gone');
  await audio.load('fluid.wav', 'fluid.wav');
});
// Browsers only unlock audio on a real gesture; any click resumes a suspended context.
addEventListener('pointerdown', () => {
  if (audio.ctx && audio.ctx.state === 'suspended') {
    audio.ctx.resume();
    if (audio.source === 'file') audio.el.play().catch(() => {});
  }
});

window.__fp = { P, audio, fluid, setMode, chl, isStopped: () => stopped, isRecording: () => !!recorder }; // for console tinkering
requestAnimationFrame(frame);
