// Parameter defaults, per-mode look presets and the slider panel.
import GUI from '../vendor/lil-gui.esm.min.js';

export const MODES = {
  'Breathing silk': 'silk',
  'Cymatic fluid': 'fluid',
  'Ink in milk': 'ink',
  'Chladni sand': 'chladni',
  'Horizontal lines': 'hlines',
};
export const MODE_INDEX = { silk: 0, fluid: 1, ink: 2, chladni: 3, hlines: 4 };

export const DEFAULTS = {
  mode: 'silk',
  applyModeLook: true,

  // transport
  volume: 0.9,
  loop: true,

  // audio analysis
  reactivity: 1.0,
  inputGain: 1.0,
  attack: 0.04,
  release: 0.35,
  agcRelease: 20,
  agcFloorDb: -75,
  levelFloorDb: -28,
  curve: 1.4,
  subGain: 1.0,
  lowGain: 1.0,
  midGain: 1.0,
  highGain: 1.2,
  airGain: 1.2,
  onsetThreshold: 0.45,
  onsetMinInterval: 0.14,
  onsetGate: 0.12,
  onsetDecay: 0.3,
  chromaSmoothing: 0.5,

  // particles
  count: 180000,
  size: 2.0,
  sizeVar: 0.75,
  softness: 0.7,
  opacity: 0.6,
  alphaVar: 0.6,
  sizeAudio: 0.6,
  onsetPop: 0.8,
  speedColor: 0.4,
  respawn: 0.03,
  inkAlpha: 1.6,

  // lines
  lines: false,
  lineNodes: 1500,
  lineDist: 0.09,
  lineOpacity: 0.35,
  lineDistAudio: 1.0,
  lineBend: 0.35,
  lineFlow: 0.6,
  lineSegments: 6,

  // silk
  flowSpeed: 0.35,
  curlScale: 1.3,
  curlEvolve: 0.07,
  flowFollow: 2.0,
  bassDrive: 2.0,
  damping: 1.0,
  centerPull: 0.7,
  breath: 1.4,
  swirl: 0.12,
  swirlAudio: 1.5,
  rippleForce: 2.2,
  rippleSpeed: 0.75,
  rippleWidth: 0.09,
  rippleDecay: 1.4,
  rippleSpread: 0.15,
  shimmer: 0.5,
  spawnRadius: 0.45,

  // fluid (shared by cymatic + ink)
  simRes: 128,
  dyeRes: 640,
  vorticity: 18,
  velDissipation: 0.35,
  pressureIters: 20,
  turbulence: 120,
  turbScale: 2.5,
  fluidFollow: 6,
  wander: 0.4,
  // cymatic
  emitters: 16,
  ringRadius: 0.72,
  ringRotate: 0.03,
  emitterForce: 900,
  emitterAngle: 30,
  emitterRadius: 0.0018,
  emitterDye: 0.35,
  emitterInk: 0.04,
  onsetBoost: 2.0,
  dyeDissipation: 0.6,
  // ink
  inkAmount: 0.8,
  inkForce: 1400,
  inkSize: 0.0025,
  inkSpread: 0.55,
  milkHalo: 0.5,
  milkStir: 600,
  autoDrip: 0.0,
  inkDyeDissipation: 0.5,

  // chladni
  chForce: 1.2,
  vibration: 1.6,
  rest: 0.15,
  chDamping: 3.0,
  plateScale: 1.0,
  morphTime: 1.2,
  holdTime: 0.35,
  complexity: 0,
  pitchFollow: true,
  manualN: 2,
  manualM: 5,

  // horizontal lines
  hlCount: 48,
  hlSpan: 0.8,
  hlAmp: 0.22,
  hlDrift: 0.04,
  hlNoise: 0.4,
  hlNoiseScale: 1.2,
  hlNoiseSpeed: 0.25,
  hlStiff: 18,
  hlDamp: 7,
  hlFocus: 0.6,
  hlBassCenter: true,
  hlThickness: 0.0015,
  hlOnset: 1.0,
  hlSmooth: 0.6,
  hlSmoothTime: 0.15,

  // look
  palette: 'Bright white',
  stop1: '#ffffff',
  stop2: '#fff1e8',
  stop3: '#ffdce8',
  stop4: '#dde8ff',
  stop5: '#ffffff',
  colorBy: 'random',
  gradScale: 1.0,
  gradDrift: 0.02,
  gradPitch: 0.3,
  gradLevel: 0.2,
  bgTop: '#151a30',
  bgBottom: '#05070f',
  ink: '#000000',
  blackRatio: 0.03,
  streak: 0.35,
  streakMax: 120,
  tailFade: 0.6,
  chroma: 0.01,
  exposure: 0.15,
  blend: 'soft',
  trail: 0.86,
  bloom: 0.9,
  bloomRadius: 1.6,
  haze: 0.0,
  bgBreath: 0.15,
  dyeOpacity: 0.85,
  grain: 0.04,
  vignette: 0.2,
  invert: false,
  zoom: 1.0,
  renderScale: 1.0,
  aspectRatio: '9:16',

};

// Applied on top of the current settings when switching mode (if applyModeLook is on).
export const MODE_PRESETS = {
  silk: { count: 180000, size: 2.0, opacity: 0.6, blackRatio: 0.03, trail: 0.86, respawn: 0.03, softness: 0.7 },
  fluid: { count: 160000, size: 1.6, opacity: 0.55, blackRatio: 0.04, trail: 0.8, respawn: 0.01, softness: 0.6 },
  ink: { count: 90000, size: 1.5, opacity: 0.6, blackRatio: 0.12, trail: 0.7, respawn: 0.01, softness: 0.6 },
  hlines: { count: 120000, size: 1.3, opacity: 0.6, blackRatio: 0.0, trail: 0.6, respawn: 0.0, softness: 0.5 },
  chladni: { count: 200000, size: 1.4, opacity: 0.6, blackRatio: 0.08, trail: 0.55, respawn: 0.004, softness: 0.4 },
};

// Gradient palettes. Echoes variants are after Rik Oostenbroek's Echoes (navy, cobalt, coral, tangerine, peach).
export const PALETTES = {
  'Bright white': {
    stop1: '#ffffff', stop2: '#fff1e8', stop3: '#ffdce8', stop4: '#dde8ff', stop5: '#ffffff',
    bgTop: '#151a30', bgBottom: '#05070f', ink: '#000000',
    blend: 'soft', blackRatio: 0.03, bloom: 0.9, haze: 0.0, streak: 0.35, chroma: 0.01, grain: 0.04, exposure: 0.15,
    invert: false, colorBy: 'random', gradScale: 1.0, opacity: 0.6, bgBreath: 0.15,
  },
  'Dreamy light': {
    stop1: '#ffffff', stop2: '#fbd3e0', stop3: '#f38bb3', stop4: '#d9668f', stop5: '#fff4f8',
    bgTop: '#f6e4ec', bgBottom: '#e6c3d2', ink: '#161116',
    blend: 'soft', blackRatio: 0.05, bloom: 0.55, haze: 0.25, streak: 0.0, chroma: 0.0, grain: 0.035, exposure: 1.0, invert: false, colorBy: 'random', gradScale: 1.0,
  },
  'Echoes night': {
    stop1: '#1d3fa8', stop2: '#4a7be6', stop3: '#f29a8a', stop4: '#f0782a', stop5: '#ffe3cf',
    bgTop: '#16204a', bgBottom: '#070b1e', ink: '#1a0608',
    blend: 'glow', blackRatio: 0.0, bloom: 0.9, haze: 0.0, streak: 0.35, chroma: 0.006, grain: 0.05, exposure: 0.12, invert: false, colorBy: 'angle', gradScale: 1.0,
  },
  'Echoes ember': {
    stop1: '#2a0a0c', stop2: '#c4501c', stop3: '#f0782a', stop4: '#ffd2b0', stop5: '#5ad1e6',
    bgTop: '#1b0d1a', bgBottom: '#0b1230', ink: '#120304',
    blend: 'glow', blackRatio: 0.0, bloom: 0.8, haze: 0.0, streak: 0.45, chroma: 0.008, grain: 0.05, exposure: 0.12, invert: false, colorBy: 'height', gradScale: 1.2,
  },
  'Echoes daylight': {
    stop1: '#2f5fd0', stop2: '#8fb3ff', stop3: '#ffd9c7', stop4: '#f29a8a', stop5: '#f0782a',
    bgTop: '#f6ebe4', bgBottom: '#e9dcd6', ink: '#14101a',
    blend: 'soft', blackRatio: 0.08, bloom: 0.4, haze: 0.1, streak: 0.25, chroma: 0.004, grain: 0.04, exposure: 1.0, invert: false, colorBy: 'height', gradScale: 1.2,
  },
  // Layer.com series colors (Tides, Voyeurs, Horizon, Moss).
  'Layer · Tides': {
    stop1: '#12030a', stop2: '#1d3f7a', stop3: '#3f6e6c', stop4: '#c4572a', stop5: '#e89a4a',
    bgTop: '#3f6e6c', bgBottom: '#35605e', ink: '#12030a',
    blend: 'soft', blackRatio: 0.06, bloom: 0.35, haze: 0.05, streak: 0.1, chroma: 0.002, grain: 0.045, exposure: 1.0,
    invert: false, colorBy: 'radius', gradScale: 1.4,
  },
  'Layer · Voyeurs': {
    stop1: '#3a0606', stop2: '#b8321c', stop3: '#e8b04a', stop4: '#c9d3d6', stop5: '#2f6f9a',
    bgTop: '#a8957c', bgBottom: '#9a8770', ink: '#2a0404',
    blend: 'soft', blackRatio: 0.05, bloom: 0.3, haze: 0.05, streak: 0.2, chroma: 0.003, grain: 0.04, exposure: 1.0,
    invert: false, colorBy: 'height', gradScale: 1.1,
  },
  'Layer · Horizon': {
    stop1: '#060a22', stop2: '#2c3550', stop3: '#b2482c', stop4: '#d7774e', stop5: '#9a8590',
    bgTop: '#8a7d86', bgBottom: '#060a22', ink: '#05060f',
    blend: 'glow', blackRatio: 0.0, bloom: 0.6, haze: 0.0, streak: 0.5, chroma: 0.003, grain: 0.04, exposure: 0.15,
    invert: false, colorBy: 'height', gradScale: 0.9,
  },
  'Layer · Moss': {
    stop1: '#1f3a1a', stop2: '#b5531f', stop3: '#d59ab8', stop4: '#8fb6d8', stop5: '#4b5a78',
    bgTop: '#4b5a78', bgBottom: '#1f3a1a', ink: '#0d1a0b',
    blend: 'soft', blackRatio: 0.05, bloom: 0.35, haze: 0.05, streak: 0.1, chroma: 0.003, grain: 0.045, exposure: 1.0,
    invert: false, colorBy: 'angle', gradScale: 1.2,
  },
};

// Keys the randomizer may touch (never audio/transport/performance).
export const RANDOM_KEYS = [
  'size', 'sizeVar', 'softness', 'opacity', 'alphaVar', 'sizeAudio', 'onsetPop', 'speedColor',
  'flowSpeed', 'curlScale', 'curlEvolve', 'flowFollow', 'bassDrive', 'centerPull', 'breath', 'swirl',
  'swirlAudio', 'rippleForce', 'rippleSpeed', 'rippleWidth', 'shimmer', 'spawnRadius',
  'vorticity', 'velDissipation', 'turbulence', 'turbScale', 'emitters', 'ringRadius', 'ringRotate',
  'emitterForce', 'emitterAngle', 'emitterDye', 'inkAmount', 'inkForce', 'inkSpread', 'milkStir',
  'chForce', 'vibration', 'rest', 'plateScale', 'complexity',
  'blackRatio', 'gradScale', 'gradDrift', 'streak', 'trail', 'bloom', 'bloomRadius', 'haze', 'bgBreath',
];

export function buildGui(P, h) {
  const gui = new GUI({ title: 'fluid · particles' });
  const folders = {};

  const top = gui.addFolder('Mode & transport');
  top.add(P, 'mode', MODES).name('mode  [1-5]').onChange(h.onMode);
  top.add(P, 'applyModeLook').name('apply mode look');
  top.add({ play: h.togglePlay }, 'play').name('play / pause  [space]');
  top.add({ stop: h.stop }, 'stop').name('■ stop');
  top.add({ restart: h.restart }, 'restart').name('restart');
  top.add({ render: h.renderVideo }, 'render').name('🎬 render video (full track)');
  top.add({ save: h.saveSettings }, 'save').name('💾 save settings…');
  top.add({ load: h.loadSettings }, 'load').name('📂 load settings…');
  top.add({ open: h.openFile }, 'open').name('open audio file…');
  top.add(P, 'volume', 0, 1, 0.01);
  top.add(P, 'loop');
  top.add({ reseed: h.reseed }, 'reseed').name('reseed particles  [X]');

  const au = (folders.audio = gui.addFolder('Audio analysis'));
  au.add(P, 'reactivity', 0, 3, 0.01).name('reactivity (master)');
  au.add(P, 'inputGain', 0.1, 8, 0.01).name('input gain');
  au.add(P, 'attack', 0.005, 0.5, 0.005).name('attack s');
  au.add(P, 'release', 0.02, 2, 0.01).name('release s');
  au.add(P, 'curve', 0.3, 4, 0.05).name('response curve');
  au.add(P, 'agcRelease', 1, 60, 0.5).name('auto-gain memory s');
  au.add(P, 'agcFloorDb', -120, -30, 1).name('band floor dB');
  au.add(P, 'levelFloorDb', -60, -6, 1).name('level floor dB');
  const bands = au.addFolder('Band gains');
  bands.add(P, 'subGain', 0, 3, 0.01).name('sub 20–120');
  bands.add(P, 'lowGain', 0, 3, 0.01).name('low 120–500');
  bands.add(P, 'midGain', 0, 3, 0.01).name('mid 0.5–2k');
  bands.add(P, 'highGain', 0, 3, 0.01).name('high 2–6k');
  bands.add(P, 'airGain', 0, 3, 0.01).name('air 6k+');
  const on = au.addFolder('Onsets & pitch');
  on.add(P, 'onsetThreshold', 0.05, 3, 0.01).name('onset threshold');
  on.add(P, 'onsetMinInterval', 0.03, 1, 0.01).name('min interval s');
  on.add(P, 'onsetGate', 0, 0.8, 0.01).name('level gate');
  on.add(P, 'onsetDecay', 0.03, 2, 0.01).name('onset decay s');
  on.add(P, 'chromaSmoothing', 0.02, 3, 0.01).name('pitch smoothing s');
  bands.close();
  on.close();

  const pa = (folders.particles = gui.addFolder('Particles'));
  pa.add(P, 'count', 1000, 1048576, 1000).name('count');
  pa.add(P, 'size', 0.3, 12, 0.05);
  pa.add(P, 'sizeVar', 0, 1, 0.01).name('size variance');
  pa.add(P, 'softness', 0, 1, 0.01);
  pa.add(P, 'opacity', 0.01, 1, 0.01);
  pa.add(P, 'alphaVar', 0, 1, 0.01).name('opacity variance');
  pa.add(P, 'sizeAudio', 0, 4, 0.01).name('size ← level');
  pa.add(P, 'onsetPop', 0, 4, 0.01).name('size ← onset');
  pa.add(P, 'speedColor', 0, 3, 0.01).name('gradient ← speed');
  pa.add(P, 'streak', 0, 1.5, 0.005).name('streak length');
  pa.add(P, 'streakMax', 4, 400, 1).name('streak max px');
  pa.add(P, 'tailFade', 0, 1, 0.01).name('streak tail fade');
  pa.add(P, 'respawn', 0, 0.5, 0.001).name('respawn rate /s');
  pa.add(P, 'inkAlpha', 0.5, 4, 0.01).name('ink opacity ×');

  const ln = gui.addFolder('Lines');
  ln.add(P, 'lines').name('connect particles');
  ln.add(P, 'lineNodes', 100, 4000, 50).name('nodes');
  ln.add(P, 'lineDist', 0.01, 0.4, 0.001).name('max distance');
  ln.add(P, 'lineOpacity', 0, 1, 0.01).name('opacity');
  ln.add(P, 'lineDistAudio', 0, 4, 0.01).name('distance ← level');
  ln.add(P, 'lineBend', 0, 1.5, 0.01).name('curve bend');
  ln.add(P, 'lineFlow', 0, 3, 0.01).name('curve ← flow');
  ln.add(P, 'lineSegments', 1, 16, 1).name('curve segments');

  const si = (folders.silk = gui.addFolder('Breathing silk'));
  si.add(P, 'flowSpeed', 0, 2, 0.01).name('flow speed');
  si.add(P, 'curlScale', 0.1, 6, 0.01).name('curl scale');
  si.add(P, 'curlEvolve', 0, 0.6, 0.001).name('curl evolve');
  si.add(P, 'flowFollow', 0.1, 10, 0.01).name('flow follow');
  si.add(P, 'bassDrive', 0, 6, 0.01).name('flow ← bass');
  si.add(P, 'damping', 0, 6, 0.01);
  si.add(P, 'centerPull', 0, 4, 0.01).name('center pull');
  si.add(P, 'breath', 0, 4, 0.01).name('breath ← level');
  si.add(P, 'swirl', -1, 1, 0.01);
  si.add(P, 'swirlAudio', 0, 5, 0.01).name('swirl ← mid');
  si.add(P, 'rippleForce', 0, 10, 0.01).name('ripple force');
  si.add(P, 'rippleSpeed', 0.05, 3, 0.01).name('ripple speed');
  si.add(P, 'rippleWidth', 0.01, 0.5, 0.005).name('ripple width');
  si.add(P, 'rippleDecay', 0.1, 6, 0.01).name('ripple decay');
  si.add(P, 'rippleSpread', 0, 1, 0.01).name('ripple spread');
  si.add(P, 'shimmer', 0, 3, 0.01).name('shimmer ← high');
  si.add(P, 'spawnRadius', 0.05, 1.5, 0.01).name('spawn radius');

  const fl = (folders.fluid = gui.addFolder('Fluid solver'));
  fl.add(P, 'simRes', 32, 256, 8).name('sim resolution').onFinishChange(h.resizeFluid);
  fl.add(P, 'dyeRes', 128, 1024, 32).name('dye resolution').onFinishChange(h.resizeFluid);
  fl.add(P, 'vorticity', 0, 60, 0.1);
  fl.add(P, 'velDissipation', 0, 3, 0.01).name('velocity dissipation');
  fl.add(P, 'pressureIters', 4, 50, 1).name('pressure iterations');
  fl.add(P, 'turbulence', 0, 1200, 1).name('turbulence ← bass');
  fl.add(P, 'turbScale', 0.2, 10, 0.05).name('turbulence scale');
  fl.add(P, 'fluidFollow', 0.2, 30, 0.1).name('particle follow');
  fl.add(P, 'wander', 0, 3, 0.01).name('particle wander');
  fl.add(P, 'dyeOpacity', 0, 1, 0.01).name('dye opacity');
  fl.add({ clear: h.clearFluid }, 'clear').name('clear fluid  [C]');

  const cy = (folders.cymatic = gui.addFolder('Cymatic ring'));
  cy.add(P, 'emitters', 2, 32, 1).name('emitters (bands)');
  cy.add(P, 'ringRadius', 0.05, 1.2, 0.01).name('ring radius');
  cy.add(P, 'ringRotate', -0.5, 0.5, 0.001).name('ring rotation');
  cy.add(P, 'emitterForce', 0, 5000, 1).name('emitter force');
  cy.add(P, 'emitterAngle', -90, 90, 1).name('emitter angle °');
  cy.add(P, 'emitterRadius', 0.0002, 0.01, 0.0001).name('emitter radius');
  cy.add(P, 'emitterDye', 0, 2, 0.01).name('emitter dye');
  cy.add(P, 'emitterInk', 0, 1, 0.005).name('emitter ink');
  cy.add(P, 'onsetBoost', 0, 8, 0.01).name('onset boost');
  cy.add(P, 'dyeDissipation', 0, 4, 0.01).name('dye dissipation');

  const ik = (folders.ink = gui.addFolder('Ink in milk'));
  ik.add(P, 'inkAmount', 0, 5, 0.01).name('ink per drop');
  ik.add(P, 'inkForce', 0, 6000, 1).name('drop burst');
  ik.add(P, 'inkSize', 0.0003, 0.02, 0.0001).name('drop size');
  ik.add(P, 'inkSpread', 0, 1, 0.01).name('drop spread');
  ik.add(P, 'milkHalo', 0, 3, 0.01).name('pink halo');
  ik.add(P, 'milkStir', 0, 4000, 1).name('stir ← low');
  ik.add(P, 'autoDrip', 0, 6, 0.01).name('auto drips /s');
  ik.add(P, 'inkDyeDissipation', 0, 3, 0.01).name('ink fade');
  ik.add({ drop: h.inkDrop }, 'drop').name('drop ink now  [D]');

  const ch = (folders.chladni = gui.addFolder('Chladni sand'));
  ch.add(P, 'chForce', 0, 6, 0.01).name('node attraction');
  ch.add(P, 'vibration', 0, 6, 0.01).name('vibration ← level');
  ch.add(P, 'rest', 0, 1, 0.01).name('idle vibration');
  ch.add(P, 'chDamping', 0, 12, 0.01).name('damping');
  ch.add(P, 'plateScale', 0.3, 3, 0.01).name('plate scale');
  ch.add(P, 'morphTime', 0.05, 6, 0.01).name('morph time s');
  ch.add(P, 'holdTime', 0, 3, 0.01).name('pitch hold s');
  ch.add(P, 'complexity', 0, 6, 1).name('complexity +');
  ch.add(P, 'pitchFollow').name('pattern ← pitch');
  ch.add(P, 'manualN', 1, 12, 1).name('manual n');
  ch.add(P, 'manualM', 1, 12, 1).name('manual m');

  const hl = (folders.hlines = gui.addFolder('Horizontal lines'));
  hl.add(P, 'hlCount', 2, 200, 1).name('line count');
  hl.add(P, 'hlSpan', 0.1, 1.2, 0.01).name('vertical spread');
  hl.add(P, 'hlAmp', 0, 1, 0.005).name('height ← spectrum');
  hl.add(P, 'hlOnset', 0, 4, 0.01).name('height ← onset');
  hl.add(P, 'hlBassCenter').name('bass in center');
  hl.add(P, 'hlFocus', 0, 1, 0.01).name('center taper');
  hl.add(P, 'hlSmooth', 0, 2, 0.01).name('smoothness');
  hl.add(P, 'hlSmoothTime', 0, 1.5, 0.01).name('motion smoothing s');
  hl.add(P, 'hlNoise', 0, 3, 0.01).name('noise wobble');
  hl.add(P, 'hlNoiseScale', 0.2, 12, 0.05).name('noise scale');
  hl.add(P, 'hlNoiseSpeed', 0, 2, 0.01).name('noise speed');
  hl.add(P, 'hlDrift', -1, 1, 0.005).name('drift along line');
  hl.add(P, 'hlStiff', 1, 120, 0.5).name('spring');
  hl.add(P, 'hlDamp', 0, 30, 0.1).name('damping');
  hl.add(P, 'hlThickness', 0, 0.05, 0.0005).name('line thickness');
  hl.add({ reseed: h.reseed }, 'reseed').name('re-lay lines');

  const lk = (folders.look = gui.addFolder('Look'));
  const gr = (folders.gradient = gui.addFolder('Gradient palette'));
  gr.add(P, 'palette', Object.keys(PALETTES)).name('palette').onChange(h.applyPalette);
  for (let i = 1; i <= 5; i++) gr.addColor(P, 'stop' + i).name('stop ' + i);
  gr.addColor(P, 'ink').name('black / ink');
  gr.add(P, 'blackRatio', 0, 1, 0.005).name('black ratio');
  gr.add(P, 'colorBy', ['random', 'speed', 'height', 'angle', 'radius']).name('color by');
  gr.add(P, 'gradScale', 0, 4, 0.01).name('gradient spread');
  gr.add(P, 'gradDrift', -0.5, 0.5, 0.001).name('gradient drift /s');
  gr.add(P, 'gradPitch', 0, 2, 0.01).name('gradient ← pitch');
  gr.add(P, 'gradLevel', 0, 2, 0.01).name('gradient ← level');
  const bg = gr.addFolder('Background');
  bg.addColor(P, 'bgTop').name('top');
  bg.addColor(P, 'bgBottom').name('bottom');
  lk.add(P, 'blend', { 'soft (black visible)': 'soft', 'glow (screen)': 'glow' });
  lk.add(P, 'trail', 0, 0.995, 0.001).name('trails');
  lk.add(P, 'exposure', 0.02, 3, 0.01).name('glow exposure');
  lk.add(P, 'bloom', 0, 3, 0.01);
  lk.add(P, 'bloomRadius', 0.2, 6, 0.01).name('bloom radius');
  lk.add(P, 'haze', 0, 2, 0.01);
  lk.add(P, 'bgBreath', 0, 2, 0.01).name('bg glow ← level');
  lk.add(P, 'chroma', 0, 0.03, 0.0005).name('color fringing');
  lk.add(P, 'grain', 0, 0.2, 0.001);
  lk.add(P, 'vignette', 0, 1, 0.01);
  lk.add(P, 'zoom', 0.3, 3, 0.01);
  lk.add(P, 'aspectRatio', { '9:16 portrait': '9:16', '16:9 landscape': '16:9', '1:1 square': '1:1', '4:5': '4:5', 'fill window': 'fill' })
    .name('aspect ratio')
    .onChange(() => {
      h.resize();
      h.reseed();
    });
  lk.add(P, 'renderScale', 0.25, 2, 0.05).name('render scale').onFinishChange(h.resize);
  lk.add(P, 'invert').name('invert (night)');

  const pr = gui.addFolder('Browser presets');
  const presetState = { name: 'my preset', pick: '' };
  pr.add(presetState, 'name').name('name');
  pr.add({ save: () => h.savePreset(presetState.name) }, 'save').name('save to browser');
  let picker = pr.add(presetState, 'pick', ['']).name('load');
  const refreshPicker = (names) => {
    const ctrl = pr.add(presetState, 'pick', ['', ...names]).name('load').onChange((n) => n && h.loadPreset(n));
    ctrl.domElement.parentElement.insertBefore(ctrl.domElement, picker.domElement);
    picker.destroy();
    picker = ctrl;
  };
  pr.add({ del: () => h.deletePreset(presetState.pick) }, 'del').name('delete selected');
  pr.add({ rnd: h.randomize }, 'rnd').name('randomize motion + look');
  pr.add({ reset: h.resetAll }, 'reset').name('reset all');

  for (const k of ['audio', 'particles', 'fluid', 'cymatic', 'ink', 'chladni', 'hlines', 'look']) folders[k].close();
  folders.silk.open();

  const showForMode = (mode) => {
    folders.silk.show(mode === 'silk');
    folders.fluid.show(mode === 'fluid' || mode === 'ink');
    folders.cymatic.show(mode === 'fluid');
    folders.ink.show(mode === 'ink');
    folders.chladni.show(mode === 'chladni');
    folders.hlines.show(mode === 'hlines');
    const active = { silk: folders.silk, fluid: folders.cymatic, ink: folders.ink, chladni: folders.chladni, hlines: folders.hlines }[mode];
    active.open();
  };

  return {
    gui,
    folders,
    showForMode,
    refreshPicker,
    refresh: () => gui.controllersRecursive().forEach((c) => c.updateDisplay()),
  };
}
