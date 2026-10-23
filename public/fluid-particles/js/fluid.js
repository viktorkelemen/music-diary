// Grid-based stable-fluids solver. Velocity is stored in sim texels per second.
import { makeProgram, createFBO, createDoubleFBO, bindTarget, blit } from './gl.js';
import * as S from './shaders.js';

const MAX_SPLATS = 32;

export class Fluid {
  constructor(gl) {
    this.gl = gl;
    const p = (fs) => makeProgram(gl, S.FLUID_VERT, fs);
    this.prog = {
      curl: p(S.CURL),
      vorticity: p(S.VORTICITY),
      turbulence: p(S.TURBULENCE),
      divergence: p(S.DIVERGENCE),
      scale: p(S.SCALE),
      pressure: p(S.PRESSURE),
      gradSub: p(S.GRADIENT_SUBTRACT),
      advection: p(S.ADVECTION),
      splat: p(S.SPLAT),
    };
    this.velSplats = [];
    this.dyeSplats = [];
    this.aspect = 1;
  }

  resize(simRes, dyeRes, aspect) {
    const gl = this.gl;
    this.dispose();
    this.aspect = aspect;
    const sh = Math.round(simRes);
    const sw = Math.round(simRes * aspect);
    const dh = Math.round(dyeRes);
    const dw = Math.round(dyeRes * aspect);
    const L = gl.LINEAR;
    const HF = gl.HALF_FLOAT;
    this.velocity = createDoubleFBO(gl, sw, sh, gl.RG16F, gl.RG, HF, L);
    this.dye = createDoubleFBO(gl, dw, dh, gl.RGBA16F, gl.RGBA, HF, L);
    this.pressure = createDoubleFBO(gl, sw, sh, gl.R16F, gl.RED, HF, gl.NEAREST);
    this.divergence = createFBO(gl, sw, sh, gl.R16F, gl.RED, HF, gl.NEAREST);
    this.curl = createFBO(gl, sw, sh, gl.R16F, gl.RED, HF, gl.NEAREST);
    this.simH = sh;
  }

  clear() {
    this.velocity?.clear();
    this.dye?.clear();
    this.pressure?.clear();
  }

  dispose() {
    for (const k of ['velocity', 'dye', 'pressure', 'divergence', 'curl']) this[k]?.dispose();
  }

  // uv in [0,1]^2. radius is in (uv-height)^2 units. vals: vec4 (velocity xy or dye rgba).
  splatVelocity(u, v, radius, fx, fy) {
    this.velSplats.push([u, v, radius, 0], [fx, fy, 0, 0]);
  }
  splatRadial(u, v, radius, strength) {
    this.velSplats.push([u, v, radius, 1], [strength, 0, 0, 0]);
  }
  splatDye(u, v, radius, ink, pink, white) {
    this.dyeSplats.push([u, v, radius, 0], [ink, pink, white, 0]);
  }

  flushSplats(target, list) {
    const gl = this.gl;
    const prog = this.prog.splat;
    for (let i = 0; i < list.length; i += MAX_SPLATS * 2) {
      const chunk = list.slice(i, i + MAX_SPLATS * 2);
      const n = chunk.length / 2;
      const pts = new Float32Array(MAX_SPLATS * 4);
      const vals = new Float32Array(MAX_SPLATS * 4);
      for (let j = 0; j < n; j++) {
        pts.set(chunk[j * 2], j * 4);
        vals.set(chunk[j * 2 + 1], j * 4);
      }
      bindTarget(gl, target.write);
      prog.use().set({
        texelSize: target.texel,
        uTarget: target.read.attach(0),
        aspect: this.aspect,
        uCount: n,
        uPts: pts,
        uVals: vals,
      });
      blit(gl);
      target.swap();
    }
    list.length = 0;
  }

  step(dt, P, time, turbulence) {
    const gl = this.gl;
    const { prog, velocity, pressure } = this;
    const texel = velocity.texel;
    gl.disable(gl.BLEND);

    this.flushSplats(velocity, this.velSplats);
    this.flushSplats(this.dye, this.dyeSplats);

    if (turbulence > 0) {
      bindTarget(gl, velocity.write);
      prog.turbulence.use().set({
        texelSize: texel,
        uVelocity: velocity.read.attach(0),
        uTime: time,
        uScale: P.turbScale,
        uAmount: turbulence,
        dt,
        aspect: this.aspect,
      });
      blit(gl);
      velocity.swap();
    }

    bindTarget(gl, this.curl);
    prog.curl.use().set({ texelSize: texel, uVelocity: velocity.read.attach(0) });
    blit(gl);

    bindTarget(gl, velocity.write);
    prog.vorticity.use().set({
      texelSize: texel,
      uVelocity: velocity.read.attach(0),
      uCurl: this.curl.attach(1),
      curl: P.vorticity,
      dt,
    });
    blit(gl);
    velocity.swap();

    bindTarget(gl, this.divergence);
    prog.divergence.use().set({ texelSize: texel, uVelocity: velocity.read.attach(0) });
    blit(gl);

    bindTarget(gl, pressure.write);
    prog.scale.use().set({ texelSize: texel, uTexture: pressure.read.attach(0), value: 0.8 });
    blit(gl);
    pressure.swap();

    prog.pressure.use().set({ texelSize: texel, uDivergence: this.divergence.attach(0) });
    for (let i = 0; i < P.pressureIters; i++) {
      bindTarget(gl, pressure.write);
      prog.pressure.set({ uPressure: pressure.read.attach(1) });
      blit(gl);
      pressure.swap();
    }

    bindTarget(gl, velocity.write);
    prog.gradSub.use().set({
      texelSize: texel,
      uPressure: pressure.read.attach(0),
      uVelocity: velocity.read.attach(1),
    });
    blit(gl);
    velocity.swap();

    bindTarget(gl, velocity.write);
    prog.advection.use().set({
      texelSize: texel,
      simTexel: texel,
      uVelocity: velocity.read.attach(0),
      uSource: velocity.read.attach(0),
      dt,
      dissipation: P.velDissipation,
    });
    blit(gl);
    velocity.swap();

    const dyeDiss = P.mode === 'ink' ? P.inkDyeDissipation : P.dyeDissipation;
    bindTarget(gl, this.dye.write);
    prog.advection.set({
      texelSize: this.dye.texel,
      simTexel: texel,
      uVelocity: velocity.read.attach(0),
      uSource: this.dye.read.attach(1),
      dissipation: dyeDiss,
    });
    blit(gl);
    this.dye.swap();
  }
}
