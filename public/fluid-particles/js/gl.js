// Minimal WebGL2 helpers: programs with typed uniform setters, FBOs, ping-pong FBOs.

export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
  });
  if (!gl) throw new Error('WebGL2 is not supported in this browser.');
  if (!gl.getExtension('EXT_color_buffer_float')) {
    throw new Error('EXT_color_buffer_float is not supported (float render targets needed).');
  }
  gl.getExtension('OES_texture_float_linear');
  // Fullscreen passes and particles are generated from gl_VertexID; an empty VAO is enough.
  gl.bindVertexArray(gl.createVertexArray());
  return gl;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const numbered = src.split('\n').map((l, i) => `${String(i + 1).padStart(4)}: ${l}`).join('\n');
    console.error(numbered);
    throw new Error('Shader compile error: ' + log);
  }
  return s;
}

export function makeProgram(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(p));
  }
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name.replace(/\[0\]$/, '')] = {
      loc: gl.getUniformLocation(p, info.name),
      type: info.type,
      size: info.size,
    };
  }
  return {
    program: p,
    uniforms,
    use() {
      gl.useProgram(p);
      return this;
    },
    set(values) {
      for (const k in values) {
        const u = uniforms[k];
        if (u) setUniform(gl, u, values[k]);
      }
      return this;
    },
  };
}

function setUniform(gl, u, v) {
  switch (u.type) {
    case gl.FLOAT:
      u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v);
      break;
    case gl.FLOAT_VEC2:
      gl.uniform2fv(u.loc, v);
      break;
    case gl.FLOAT_VEC3:
      gl.uniform3fv(u.loc, v);
      break;
    case gl.FLOAT_VEC4:
      gl.uniform4fv(u.loc, v);
      break;
    case gl.INT:
    case gl.BOOL:
    case gl.SAMPLER_2D:
      u.size > 1 ? gl.uniform1iv(u.loc, v) : gl.uniform1i(u.loc, v);
      break;
  }
}

export function createFBO(gl, w, h, internalFormat, format, type, filter, data = null) {
  gl.activeTexture(gl.TEXTURE0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, data);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  if (!data) {
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  return {
    tex,
    fbo,
    w,
    h,
    texel: [1 / w, 1 / h],
    attach(unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      return unit;
    },
    upload(arr) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, arr);
    },
    clear() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() {
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
    },
  };
}

export function createDoubleFBO(gl, w, h, internalFormat, format, type, filter) {
  let a = createFBO(gl, w, h, internalFormat, format, type, filter);
  let b = createFBO(gl, w, h, internalFormat, format, type, filter);
  return {
    w,
    h,
    texel: [1 / w, 1 / h],
    get read() {
      return a;
    },
    get write() {
      return b;
    },
    swap() {
      [a, b] = [b, a];
    },
    clear() {
      a.clear();
      b.clear();
    },
    dispose() {
      a.dispose();
      b.dispose();
    },
  };
}

export function bindTarget(gl, target, rows) {
  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.w, rows ?? target.h);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }
}

// One oversized triangle covering the viewport.
export function blit(gl) {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
