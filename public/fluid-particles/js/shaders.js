// All GLSL lives here.

const HEADER = `#version 300 es
precision highp float;
precision highp int;
`;

// Simplex noise 3D (Ashima Arts / Stefan Gustavson, MIT) + curl + hashes.
const NOISE = `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float potential(vec2 q, float t){
  return snoise(vec3(q, t)) + 0.5 * snoise(vec3(q * 2.03 + 17.1, t * 1.37));
}
// Divergence-free 2D flow from a scalar potential.
vec2 curl2(vec2 q, float t){
  const float e = 0.015;
  float a = potential(q + vec2(0.0, e), t);
  float b = potential(q - vec2(0.0, e), t);
  float c = potential(q + vec2(e, 0.0), t);
  float d = potential(q - vec2(e, 0.0), t);
  return vec2(a - b, -(c - d)) / (2.0 * e);
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
`;


// 5-stop gradient with mirrored repeat, so drifting the offset never jumps.
const RAMP = `
uniform vec3 uStops[5];
vec3 ramp(float t){
  t = 1.0 - abs(fract(t * 0.5) * 2.0 - 1.0);
  float x = t * 4.0;
  int i = int(min(floor(x), 3.0));
  return mix(uStops[i], uStops[i + 1], smoothstep(0.0, 1.0, x - float(i)));
}
`;

export const FS_VERT = HEADER + `
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FLUID_VERT = HEADER + `
uniform vec2 texelSize;
out vec2 vUv, vL, vR, vT, vB;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FLUID_IN = `in vec2 vUv, vL, vR, vT, vB; out vec4 o;`;

// ---------- fluid solver (stable fluids, after Stam / Dobryakov) ----------

export const CURL = HEADER + FLUID_IN + `
uniform sampler2D uVelocity;
void main(){
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

export const VORTICITY = HEADER + FLUID_IN + `
uniform sampler2D uVelocity, uCurl;
uniform float curl, dt;
void main(){
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy + force * dt;
  o = vec4(clamp(vel, -1500.0, 1500.0), 0.0, 1.0);
}`;

export const TURBULENCE = HEADER + NOISE + FLUID_IN + `
uniform sampler2D uVelocity;
uniform float uTime, uScale, uAmount, dt, aspect;
void main(){
  vec2 q = vec2(vUv.x * aspect, vUv.y) * uScale;
  vec2 vel = texture(uVelocity, vUv).xy + curl2(q, uTime * 0.12) * uAmount * dt;
  o = vec4(vel, 0.0, 1.0);
}`;

export const DIVERGENCE = HEADER + FLUID_IN + `
uniform sampler2D uVelocity;
void main(){
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

export const SCALE = HEADER + FLUID_IN + `
uniform sampler2D uTexture;
uniform float value;
void main(){ o = value * texture(uTexture, vUv); }`;

export const PRESSURE = HEADER + FLUID_IN + `
uniform sampler2D uPressure, uDivergence;
void main(){
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float div = texture(uDivergence, vUv).x;
  o = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`;

export const GRADIENT_SUBTRACT = HEADER + FLUID_IN + `
uniform sampler2D uPressure, uVelocity;
void main(){
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 vel = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  o = vec4(vel, 0.0, 1.0);
}`;

export const ADVECTION = HEADER + FLUID_IN + `
uniform sampler2D uVelocity, uSource;
uniform vec2 simTexel;
uniform float dt, dissipation;
void main(){
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * simTexel;
  o = texture(uSource, coord) / (1.0 + dissipation * dt);
}`;

// Up to 32 gaussian splats per pass. pts: xy = uv, z = radius, w = 1 for radial (push outward).
export const SPLAT = HEADER + FLUID_IN + `
uniform sampler2D uTarget;
uniform float aspect;
uniform int uCount;
uniform vec4 uPts[32];
uniform vec4 uVals[32];
void main(){
  vec4 acc = texture(uTarget, vUv);
  for (int i = 0; i < 32; i++){
    if (i >= uCount) break;
    vec2 d = vUv - uPts[i].xy;
    d.x *= aspect;
    float g = exp(-dot(d, d) / uPts[i].z);
    vec4 v = uPts[i].w > 0.5 ? vec4(normalize(d + 1e-6) * uVals[i].x, 0.0, 0.0) : uVals[i];
    acc += g * v;
  }
  o = acc;
}`;

// ---------- particles ----------

export const PARTICLE_UPDATE = HEADER + NOISE + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uState, uRand, uVel;
uniform int uMode;
uniform float uTime, uDt, uAspect;
uniform float uBass, uMid, uHigh, uLevel, uOnset;
uniform vec4 uRipples[8];
uniform int uRippleCount;
uniform float uRespawn;
// silk
uniform float uFlowSpeed, uCurlScale, uCurlEvolve, uFlowFollow, uBassDrive, uDamping,
              uCenterPull, uBreath, uSwirl, uSwirlAudio, uRippleForce, uRippleSpeed,
              uRippleWidth, uRippleDecay, uShimmer, uSpawnRadius;
// fluid / ink
uniform float uFluidFollow, uSimScale, uWander;
// chladni
uniform vec4 uPat;
uniform float uPatMix, uChForce, uVibration, uChDamping, uPlateScale, uRest;
// horizontal lines
uniform float uBands[32];
uniform float uHlCount, uHlSpan, uHlAmp, uHlDrift, uHlNoise, uHlNoiseScale, uHlNoiseSpeed,
              uHlStiff, uHlDamp, uHlFocus, uHlBassCenter, uHlThickness, uHlOnset, uHlHalfWidth, uHlSmooth;

const float PI = 3.14159265;
float chl(vec2 q, float n, float m){
  return cos(n * PI * q.x) * cos(m * PI * q.y) - cos(m * PI * q.x) * cos(n * PI * q.y);
}
float chladni(vec2 q){ return mix(chl(q, uPat.x, uPat.y), chl(q, uPat.z, uPat.w), uPatMix); }

// Which horizontal line a particle belongs to, and that line's resting height.
float hlLine(vec2 c){
  int id = int(c.y) * textureSize(uState, 0).x + int(c.x);
  return float(id % max(1, int(uHlCount)));
}
float hlRestY(float line){
  return mix(-uHlSpan, uHlSpan, (line + 0.5) / max(1.0, uHlCount));
}
float bandAt(float u){
  float x = clamp(u, 0.0, 1.0) * 31.0;
  int i = int(floor(x));
  return mix(uBands[i], uBands[min(i + 1, 31)], smoothstep(0.0, 1.0, fract(x)));
}
// Gaussian blur across neighbouring bands so line shapes stay smooth.
float bandSmooth(float u){
  float w = uHlSmooth * 0.12;
  float acc = 0.0, norm = 0.0;
  for (int k = -4; k <= 4; k++){
    float g = exp(-float(k * k) / 8.0);
    acc += bandAt(u + float(k) * w / 4.0) * g;
    norm += g;
  }
  return acc / norm;
}

vec2 spawn(vec2 c){
  vec2 h1 = hash22(c * 0.731 + fract(uTime * 0.1234) * 731.0);
  if (uMode == 4) return vec2((h1.x * 2.0 - 1.0) * uHlHalfWidth, hlRestY(hlLine(c)));
  if (uMode == 0){
    vec2 h2 = hash22(c * 1.913 + fract(uTime * 0.4321) * 419.0);
    float r = uSpawnRadius * sqrt(-2.0 * log(max(h1.x, 1e-4)));
    float a = 6.2831853 * h1.y;
    return vec2(cos(a), sin(a)) * r * (0.6 + 0.4 * h2.x);
  }
  return vec2((h1.x * 2.0 - 1.0) * uAspect, h1.y * 2.0 - 1.0);
}

void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uState, c, 0);
  vec2 p = s.xy;
  vec2 v = s.zw;
  float dt = uDt;
  vec2 fc = vec2(c);
  vec2 rnd = hash22(fc + fract(uTime * 0.6180339) * 917.0) * 2.0 - 1.0;
  vec2 acc = vec2(0.0);

  if (uMode == 0){
    // Breathing silk: curl-noise flow, loudness breathes the cloud, onsets ripple outward.
    vec2 flow = curl2(p * uCurlScale, uTime * uCurlEvolve) * 0.3 * uFlowSpeed * (0.35 + uBass * uBassDrive);
    v = mix(v, flow, 1.0 - exp(-uFlowFollow * dt));
    float pull = uCenterPull * (1.0 - uBreath * uLevel);
    acc += -p * pull;
    acc += vec2(-p.y, p.x) * uSwirl * (1.0 + uMid * uSwirlAudio);
    acc += rnd * uHigh * uShimmer;
    for (int i = 0; i < 8; i++){
      if (i >= uRippleCount) break;
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      vec2 d = p - r.xy;
      float dist = length(d);
      float front = age * uRippleSpeed;
      float x = (dist - front) / uRippleWidth;
      float w = exp(-x * x) * exp(-age * uRippleDecay);
      acc += d / (dist + 1e-4) * w * r.w * uRippleForce;
    }
    v *= exp(-uDamping * dt * 0.25);
  } else if (uMode == 1 || uMode == 2){
    // Fluid + ink: particles ride the solver's velocity field.
    vec2 uv = vec2(p.x / (2.0 * uAspect) + 0.5, p.y * 0.5 + 0.5);
    vec2 fv = texture(uVel, uv).xy * uSimScale;
    v = mix(v, fv, 1.0 - exp(-uFluidFollow * dt));
    acc += curl2(p * 3.0, uTime * 0.2) * uWander * 0.05;
    acc += rnd * uHigh * uShimmer * 0.25;
  } else if (uMode == 4){
    // Horizontal lines: each line is lifted by the spectrum (bass in the middle), plus slow noise.
    float line = hlLine(fc);
    float rest = hlRestY(line);
    float u = p.x / (2.0 * uHlHalfWidth) + 0.5;
    float fu = uHlBassCenter > 0.5 ? abs(u - 0.5) * 2.0 : u;
    float taper = mix(1.0, smoothstep(0.0, 0.45, 0.5 - abs(u - 0.5)), uHlFocus);
    float n = snoise(vec3(p.x * uHlNoiseScale, line * 0.37, uTime * uHlNoiseSpeed));
    float lift = bandSmooth(fu) * (1.0 + uOnset * uHlOnset) * (0.7 + 0.3 * n);
    float target = rest + uHlAmp * taper * lift + uHlNoise * 0.05 * n * (0.3 + uLevel)
                 + (hash12(fc * 3.17) - 0.5) * uHlThickness;
    v.y += (target - p.y) * uHlStiff * dt;
    v.y *= exp(-uHlDamp * dt);
    v.x = mix(v.x, uHlDrift, 1.0 - exp(-4.0 * dt));
  } else {
    // Chladni: vibration kicks particles off antinodes; they settle on nodal lines.
    vec2 q = p / uPlateScale;
    float f = chladni(q);
    const float e = 0.004;
    vec2 g = vec2(chladni(q + vec2(e, 0.0)) - chladni(q - vec2(e, 0.0)),
                  chladni(q + vec2(0.0, e)) - chladni(q - vec2(0.0, e))) / (2.0 * e);
    acc += -f * g / (1.0 + 0.02 * dot(g, g)) * uChForce;
    float amp = abs(f) * uVibration * (uRest + uLevel * 1.5 + uOnset * 1.5);
    acc += rnd * amp;
    v *= exp(-uChDamping * dt);
  }

  v += acc * dt;
  p += v * dt;
  if (uMode == 4){ // lines wrap horizontally instead of respawning
    if (p.x > uHlHalfWidth) p.x -= uHlHalfWidth * 2.0;
    if (p.x < -uHlHalfWidth) p.x += uHlHalfWidth * 2.0;
  }

  bool out_ = (uMode == 4 ? false : abs(p.x) > uAspect * 1.15) || abs(p.y) > 1.15 || any(isnan(p));
  bool reborn = hash12(fc * 1.37 + fract(uTime * 0.37) * 311.0) < uRespawn * dt;
  if (out_ || reborn){
    p = spawn(fc);
    v = vec2(0.0);
  }
  o = vec4(p, v);
}`;

// Each particle is a quad (6 vertices) stretched along its velocity for long-exposure streaks.
export const PARTICLE_VERT = HEADER + RAMP + `
uniform sampler2D uState, uRand;
uniform int uTexW, uColorBy;
uniform vec2 uRes;
uniform float uAspect, uZoom, uSize, uSizeVar, uPxScale, uLevel, uSizeAudio, uOnset, uOnsetPop,
              uOpacity, uAlphaVar, uBlackRatio, uGradScale, uGradShift, uSpeedColor, uInkAlpha,
              uStreak, uStreakMax;
uniform vec2 uStreakAxis;
uniform vec3 uInk;
out vec4 vColor;
out vec2 vLocal;

const vec2 CORNERS[6] = vec2[6](vec2(-1,-1), vec2(1,-1), vec2(1,1), vec2(-1,-1), vec2(1,1), vec2(-1,1));

void main(){
  int pid = gl_VertexID / 6;
  vec2 cq = CORNERS[gl_VertexID % 6];
  ivec2 c = ivec2(pid % uTexW, pid / uTexW);
  vec4 s = texelFetch(uState, c, 0);
  vec4 r = texelFetch(uRand, c, 0);

  float sz = uSize * mix(1.0, 0.3 + 1.6 * r.x * r.x, uSizeVar)
           * (1.0 + uLevel * uSizeAudio + uOnset * uOnsetPop);
  float px = sz * uPxScale;
  float fade = clamp(px, 0.0, 1.0); // sub-pixel particles fade instead of popping
  px = max(px, 1.0);

  vec2 vel = s.zw * uStreakAxis;
  float sp = length(vel);
  vec2 dir = sp > 1e-5 ? vel / sp : vec2(1.0, 0.0);
  float lenPx = min(px + sp * uStreak * uRes.y * 0.5 * uZoom, uStreakMax);
  lenPx = max(lenPx, px);
  vec2 off = dir * cq.x * lenPx * 0.5 + vec2(-dir.y, dir.x) * cq.y * px * 0.5;
  vec2 center = vec2(s.x / uAspect, s.y) * uZoom;
  gl_Position = vec4(center + off * 2.0 / uRes, 0.0, 1.0);
  vLocal = cq;

  // Where on the gradient this particle sits.
  float t;
  if (uColorBy == 0) t = r.z;
  else if (uColorBy == 1) t = sp * 2.0;
  else if (uColorBy == 2) t = s.y * 0.5 + 0.5;
  else if (uColorBy == 3) t = atan(s.y, s.x) / 3.14159265 + 1.0;
  else t = length(s.xy);
  t = t * uGradScale + uGradShift + sp * uSpeedColor + (r.z - 0.5) * 0.08;

  bool ink = r.y < uBlackRatio;
  vec3 col = ink ? uInk : ramp(t);
  float a = uOpacity * mix(1.0, 0.15 + 0.85 * r.w, uAlphaVar) * fade;
  if (ink) a = min(1.0, a * uInkAlpha);
  a /= sqrt(lenPx / px); // streaks spread the same light over a longer shape
  vColor = vec4(col * a, a);
}`;

export const PARTICLE_FRAG = HEADER + `
in vec4 vColor;
in vec2 vLocal;
out vec4 o;
uniform float uSoftness, uTailFade;
void main(){
  float r2 = dot(vLocal, vLocal);
  if (r2 > 1.0) discard;
  float hard = 1.0 - smoothstep(0.75, 1.0, r2);
  float soft = exp(-r2 * 4.0);
  float tail = mix(1.0, vLocal.x * 0.5 + 0.5, uTailFade); // fade toward the trailing end
  o = vColor * mix(hard, soft, uSoftness) * tail;
}`;

// Plexus curves: each unordered node pair (i > j) is a cubic bezier drawn as uSegments line
// segments, all decoded from gl_VertexID. Pairs farther apart than uMaxDist collapse off-screen.
export const LINE_VERT = HEADER + RAMP + `
uniform sampler2D uState, uRand;
uniform int uTexW, uSegments;
uniform float uAspect, uZoom, uMaxDist, uOpacity, uGradScale, uGradShift, uBend, uFlow;
out vec4 vColor;

ivec2 cell(int id){ return ivec2(id % uTexW, id / uTexW); }
float hash11(float n){ return fract(sin(n) * 43758.5453); }

void main(){
  int segVerts = 2 * uSegments;
  int k = gl_VertexID / segVerts;
  int local = gl_VertexID % segVerts;
  float t = float(local / 2 + local % 2) / float(uSegments);
  int i = int(floor((sqrt(8.0 * float(k) + 1.0) - 1.0) * 0.5)) + 1;
  int j = k - i * (i - 1) / 2;
  if (j >= i){ i += 1; j = k - i * (i - 1) / 2; }   // float precision guards
  if (j < 0){ i -= 1; j = k - i * (i - 1) / 2; }

  vec4 si = texelFetch(uState, cell(i), 0);
  vec4 sj = texelFetch(uState, cell(j), 0);
  float len = distance(si.xy, sj.xy);
  float w = 1.0 - len / uMaxDist;
  if (w <= 0.0){
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vColor = vec4(0.0);
    return;
  }
  // Control points: a sideways bow (random side per pair) plus tangents along each particle's motion.
  vec2 d = sj.xy - si.xy;
  vec2 perp = vec2(-d.y, d.x);
  float side = hash11(float(i) * 12.9898 + float(j) * 78.233) * 2.0 - 1.0;
  vec2 bow = perp * side * uBend;
  vec2 c1 = si.xy + d / 3.0 + bow + si.zw * uFlow * len;
  vec2 c2 = sj.xy - d / 3.0 + bow - sj.zw * uFlow * len;
  float u = 1.0 - t;
  vec2 p = u * u * u * si.xy + 3.0 * u * u * t * c1 + 3.0 * u * t * t * c2 + t * t * t * sj.xy;
  gl_Position = vec4(p.x / uAspect * uZoom, p.y * uZoom, 0.0, 1.0);
  vec3 col = mix(ramp(texelFetch(uRand, cell(i), 0).z * uGradScale + uGradShift),
                 ramp(texelFetch(uRand, cell(j), 0).z * uGradScale + uGradShift), t);
  float a = uOpacity * w * w;
  vColor = vec4(col * a, a);
}`;

export const LINE_FRAG = HEADER + `
in vec4 vColor;
out vec4 o;
void main(){ o = vColor; }`;

// Multiply the trail buffer down: drawn with blendFunc(ZERO, SRC_ALPHA).
export const FADE = HEADER + `
out vec4 o;
uniform float uKeep;
void main(){ o = vec4(0.0, 0.0, 0.0, uKeep); }`;

export const BLUR = HEADER + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uSrc;
uniform vec2 uDir;
void main(){
  vec4 acc = texture(uSrc, vUv) * 0.2270270270;
  acc += texture(uSrc, vUv + uDir * 1.3846153846) * 0.3162162162;
  acc += texture(uSrc, vUv - uDir * 1.3846153846) * 0.3162162162;
  acc += texture(uSrc, vUv + uDir * 3.2307692308) * 0.0702702703;
  acc += texture(uSrc, vUv - uDir * 3.2307692308) * 0.0702702703;
  o = acc;
}`;

export const COMPOSITE = HEADER + NOISE + `
in vec2 vUv;
out vec4 o;
uniform sampler2D uTrail, uBloom, uDye;
uniform vec3 uBgTop, uBgBottom, uInk, uDyeA, uDyeB, uHighlight;
uniform float uUseDye, uDyeOpacity, uBloomAmt, uHaze, uGrain, uVignette, uTime, uAspect, uGlow,
              uBgBreath, uLevel, uInvert, uChroma, uExposure;
uniform vec2 uRes;

vec3 screen(vec3 a, vec3 b){ return 1.0 - (1.0 - a) * (1.0 - b); }

void main(){
  vec2 uv = vUv;
  vec2 cuv = (uv - 0.5) * vec2(uAspect, 1.0);

  // Soft two-tone background with a slowly drifting glow.
  vec3 col = mix(uBgBottom, uBgTop, smoothstep(0.0, 1.0, uv.y + 0.08 * snoise(vec3(cuv * 0.8, uTime * 0.03))));
  col = screen(col, uHighlight * uBgBreath * uLevel * exp(-dot(cuv, cuv) * 2.5));

  if (uUseDye > 0.5){
    vec3 d = max(texture(uDye, uv).rgb, 0.0);
    vec3 cover = 1.0 - exp(-d * 1.6);
    col = mix(col, uDyeA, cover.g * uDyeOpacity);
    col = mix(col, uDyeB, cover.b * uDyeOpacity);
    col = mix(col, uInk, cover.r * uDyeOpacity);
  }

  // Slight chromatic fringing on the particle layer, radial from the center.
  vec2 ca = (uv - 0.5) * uChroma;
  vec4 t = texture(uTrail, uv);
  t.r = texture(uTrail, uv + ca).r;
  t.b = texture(uTrail, uv - ca).b;
  vec4 b = texture(uBloom, uv);
  // Glow accumulates additively, so tone-map it (soft roll-off instead of clipping to white).
  if (uGlow > 0.5){
    col = screen(col, 1.0 - exp(-t.rgb * uExposure));
  } else {
    col = col * (1.0 - clamp(t.a, 0.0, 1.0)) + t.rgb;
  }
  col = screen(col, 1.0 - exp(-b.rgb * uBloomAmt * uExposure));
  col = mix(col, uHighlight, clamp(b.a * uHaze, 0.0, 0.6));

  float vig = smoothstep(1.25, 0.25, length(cuv));
  col *= mix(1.0, vig, uVignette);
  col += (hash12(uv * uRes + fract(uTime) * 113.0) - 0.5) * uGrain;
  if (uInvert > 0.5) col = 1.0 - col;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
