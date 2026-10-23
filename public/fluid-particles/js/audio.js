// Web Audio analysis: auto-gained bands, loudness, spectral-flux onsets, chroma, centroid.

const BAND_DEFS = {
  sub: [20, 120],
  low: [120, 500],
  mid: [500, 2000],
  high: [2000, 6000],
  air: [6000, 16000],
};
export const N_EMITTER_BANDS = 32;
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Auto-gain follower: normalizes against a slowly decaying peak, then attack/release smoothing.
class Follower {
  constructor() {
    this.peak = 0;
    this.v = 0;
  }
  step(raw, dt, P, floor) {
    this.peak = Math.max(raw, this.peak * Math.exp(-dt / P.agcRelease), floor);
    const n = Math.pow(raw / this.peak, P.curve);
    const tc = n > this.v ? P.attack : P.release;
    this.v += (n - this.v) * (1 - Math.exp(-dt / Math.max(tc, 1e-3)));
    return this.v;
  }
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.el = new Audio();
    this.el.loop = true;
    this.el.crossOrigin = 'anonymous';
    this.source = 'none';
    this.trackName = '';
    this.followers = {};
    for (const k of [...Object.keys(BAND_DEFS), 'level']) this.followers[k] = new Follower();
    this.emitterFollowers = Array.from({ length: N_EMITTER_BANDS }, () => new Follower());
    this.f = {
      sub: 0, low: 0, mid: 0, high: 0, air: 0, level: 0, bass: 0,
      onset: 0, centroid: 0, pitch: 0, pitchName: '-', pitchStrength: 0,
      chroma: new Float32Array(12),
      bands: new Float32Array(N_EMITTER_BANDS),
      rawDb: {},
    };
    this.fluxHist = new Float32Array(43);
    this.fluxIdx = 0;
    this.lastOnset = 0;
    this.time = 0;
    this.onOnset = null;
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0;
    this.gain = this.ctx.createGain();
    this.recordDest = this.ctx.createMediaStreamDestination(); // audio track for video renders
    this.elSource = this.ctx.createMediaElementSource(this.el);
    this.elSource.connect(this.analyser);
    this.elSource.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.gain.connect(this.recordDest);

    const bins = this.analyser.frequencyBinCount;
    this.freqDb = new Float32Array(bins);
    this.mags = new Float32Array(bins);
    this.prevComp = new Float32Array(bins);
    this.timeData = new Float32Array(this.analyser.fftSize);
    this.binHz = this.ctx.sampleRate / this.analyser.fftSize;

    // Precompute bin ranges.
    const hzToBin = (hz) => Math.min(bins - 1, Math.max(1, Math.round(hz / this.binHz)));
    this.bandBins = {};
    for (const [k, [lo, hi]] of Object.entries(BAND_DEFS)) this.bandBins[k] = [hzToBin(lo), hzToBin(hi)];
    this.emitterBins = [];
    for (let i = 0; i < N_EMITTER_BANDS; i++) {
      const lo = 40 * Math.pow(8000 / 40, i / N_EMITTER_BANDS);
      const hi = 40 * Math.pow(8000 / 40, (i + 1) / N_EMITTER_BANDS);
      const a = hzToBin(lo);
      this.emitterBins.push([a, Math.max(a + 1, hzToBin(hi))]);
    }
    this.pcOfBin = new Int8Array(bins).fill(-1);
    for (let i = 1; i < bins; i++) {
      const hz = i * this.binHz;
      if (hz < 65 || hz > 2100) continue;
      this.pcOfBin[i] = (((Math.round(12 * Math.log2(hz / 440)) + 9) % 12) + 12) % 12;
    }
    this.fluxMaxBin = hzToBin(4000);
  }

  async load(src, name) {
    await this.init();
    this.el.src = src;
    this.trackName = name || src;
    this.source = 'file';
    await this.ctx.resume();
    try {
      await this.el.play();
    } catch (e) {
      console.warn('play() blocked until user gesture', e);
    }
  }

  togglePlay() {
    if (!this.ctx) return;
    this.ctx.resume();
    if (this.el.paused) this.el.play();
    else this.el.pause();
  }

  get playing() {
    return this.source === 'file' && !this.el.paused;
  }

  update(dt, P) {
    const f = this.f;
    this.time += dt;
    if (!this.ctx) return f;
    this.el.volume = P.volume;
    this.el.loop = P.loop;

    const an = this.analyser;
    an.getFloatFrequencyData(this.freqDb);
    an.getFloatTimeDomainData(this.timeData);
    const mags = this.mags;
    const g = P.inputGain;
    for (let i = 0; i < mags.length; i++) {
      const db = this.freqDb[i];
      mags[i] = db > -160 ? Math.pow(10, db / 20) * g : 0;
    }

    const floorBand = Math.pow(10, P.agcFloorDb / 20);
    const bandMean = (a, b) => {
      let s = 0;
      for (let i = a; i < b; i++) s += mags[i];
      return s / Math.max(1, b - a);
    };
    const R = P.reactivity;
    for (const k of Object.keys(BAND_DEFS)) {
      const [a, b] = this.bandBins[k];
      const raw = bandMean(a, b);
      f.rawDb[k] = 20 * Math.log10(raw + 1e-12);
      f[k] = Math.min(1.5, this.followers[k].step(raw, dt, P, floorBand) * P[k + 'Gain'] * R);
    }
    f.bass = Math.min(1.5, Math.max(f.sub, f.low * 0.8));

    let ss = 0;
    for (let i = 0; i < this.timeData.length; i++) ss += this.timeData[i] * this.timeData[i];
    const rms = Math.sqrt(ss / this.timeData.length) * g;
    f.rawDb.level = 20 * Math.log10(rms + 1e-12);
    f.level = Math.min(1.5, this.followers.level.step(rms, dt, P, Math.pow(10, P.levelFloorDb / 20)) * R);

    for (let i = 0; i < N_EMITTER_BANDS; i++) {
      const [a, b] = this.emitterBins[i];
      f.bands[i] = Math.min(1.5, this.emitterFollowers[i].step(bandMean(a, b), dt, P, floorBand) * R);
    }

    // Spectral centroid, log-mapped to 0..1 over 100 Hz - 8 kHz.
    let num = 0;
    let den = 0;
    for (let i = 1; i < mags.length; i++) {
      num += i * this.binHz * mags[i];
      den += mags[i];
    }
    const c = den > 1e-9 ? num / den : 100;
    f.centroid = Math.min(1, Math.max(0, Math.log2(c / 100) / Math.log2(80)));

    // Chroma.
    const chromaNow = new Float32Array(12);
    for (let i = 1; i < mags.length; i++) {
      const pc = this.pcOfBin[i];
      if (pc >= 0) chromaNow[pc] += mags[i] * mags[i];
    }
    let mx = 1e-12;
    for (let i = 0; i < 12; i++) mx = Math.max(mx, chromaNow[i]);
    const k = 1 - Math.exp(-dt / Math.max(0.01, P.chromaSmoothing));
    let best = 0;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      f.chroma[i] += (chromaNow[i] / mx - f.chroma[i]) * k;
      sum += f.chroma[i];
      if (f.chroma[i] > f.chroma[best]) best = i;
    }
    f.pitch = best;
    f.pitchName = PITCH_NAMES[best];
    f.pitchStrength = sum > 0 ? f.chroma[best] / sum : 0;

    // Onsets: spectral flux of log-compressed magnitudes vs. an adaptive mean.
    let flux = 0;
    for (let i = 1; i < this.fluxMaxBin; i++) {
      const comp = Math.log1p(mags[i] * 1000);
      const d = comp - this.prevComp[i];
      if (d > 0) flux += d;
      this.prevComp[i] = comp;
    }
    let mean = 0;
    for (let i = 0; i < this.fluxHist.length; i++) mean += this.fluxHist[i];
    mean /= this.fluxHist.length;
    this.fluxHist[this.fluxIdx] = flux;
    this.fluxIdx = (this.fluxIdx + 1) % this.fluxHist.length;
    f.flux = flux;
    f.fluxMean = mean;

    f.onset *= Math.exp(-dt / Math.max(0.02, P.onsetDecay));
    const playing = this.playing;
    if (
      playing &&
      flux > mean * (1 + P.onsetThreshold) + 0.5 &&
      f.level > P.onsetGate &&
      this.time - this.lastOnset > P.onsetMinInterval
    ) {
      this.lastOnset = this.time;
      const strength = Math.min(1, Math.max(0.25, (flux / (mean + 1e-6) - 1) / 3));
      f.onset = Math.max(f.onset, strength);
      this.onOnset?.(strength);
    }
    if (!playing) {
      // Let everything relax when paused.
      for (const key of ['sub', 'low', 'mid', 'high', 'air', 'level', 'bass']) f[key] *= 0.95;
    }
    return f;
  }
}
