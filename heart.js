// heart.js — fondo WebGL2: corazón 3D de cristal líquido, raymarched.
// El scroll (0→1) controla cámara, rotación, deformación, glow y color.

const heartCanvas = document.getElementById('heart-canvas');
const gl = heartCanvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });

if (!gl) {
  const msg = document.createElement('p');
  msg.textContent = 'Este sitio necesita WebGL2 para el corazón.';
  msg.style.cssText = 'color:#fcc;font:16px monospace;padding:2rem';
  document.body.appendChild(msg);
  throw new Error('WebGL2 not supported');
}

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2  u_res;
uniform float u_deform;
uniform float u_freq;
uniform float u_morphSpeed;
uniform float u_rotSpeed;
uniform float u_specular;
uniform float u_shininess;
uniform float u_glowStrength;
uniform vec3  u_colMag;
uniform vec3  u_colBlue;
uniform vec3  u_glowA;
uniform vec3  u_glowB;
uniform float u_liquidSpeed;
uniform float u_liquidScale;
uniform float u_liquidBright;
uniform float u_filament;
uniform float u_core;
uniform vec3  u_bg;
uniform float u_camAngle;
uniform float u_camDist;

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float dot2(vec2 v){ return dot(v,v); }

// corazón 2D (SDF de Inigo Quilez), punta hacia abajo
float sdHeart(vec2 p){
  p.x = abs(p.x);
  if(p.y + p.x > 1.0)
    return sqrt(dot2(p - vec2(0.25,0.75))) - sqrt(2.0)/4.0;
  return sqrt(min(dot2(p - vec2(0.0,1.0)),
                  dot2(p - 0.5*max(p.x+p.y,0.0)))) * sign(p.x - p.y);
}

// campo orgánico: radio modulado por lóbulos sinusoidales lentos
float blobField(vec3 p){
  float t = u_time * u_morphSpeed;
  float f = u_freq;
  float d = 0.0;
  d += sin(p.x * 2.6 * f + t * 1.00);
  d += sin(p.y * 2.9 * f - t * 0.80 + 1.3);
  d += sin(p.z * 3.2 * f + t * 1.20 + 2.7);
  d += sin((p.x + p.z) * 2.2 * f - t * 0.90 + 4.1);
  d += sin((p.y - p.x) * 2.4 * f + t * 0.70 + 0.6);
  return d * 0.2;
}

// corazón 3D: SDF 2D afinado con grosor abultado en z + líquido
float mapHeart(vec3 p){
  float t = u_time * u_rotSpeed;
  p.xy *= rot(t * 0.7 + u_camAngle);
  p.yz *= rot(t * 0.5);

  p.y -= 0.62;
  p.xy *= 1.32;

  float h2 = sdHeart(p.xy);
  // grosor abultado y bien redondeado en z (bordes suaves en todos los lados)
  float zth = 0.40 * smoothstep(0.0, -0.5, h2);
  float d = max(h2, abs(p.z) - zth);
  // deformación líquida suave: borde vivo pero continuo y sin aristas
  d -= u_deform * 0.85 * blobField(p);
  return d;
}

vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    mapHeart(p + e.xyy) - mapHeart(p - e.xyy),
    mapHeart(p + e.yxy) - mapHeart(p - e.yxy),
    mapHeart(p + e.yyx) - mapHeart(p - e.yyx)));
}

float hash13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
                 mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
                 mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a * vnoise3(p); p *= 2.03; a *= 0.5; } return v; }

float liquid(vec3 p){
  float t = u_time * u_liquidSpeed;
  p *= u_liquidScale;
  p.xy *= rot(t * 0.15);
  p.yz *= rot(t * 0.10);
  vec3 w = vec3(fbm3(p + t * 0.2), fbm3(p + vec3(4.3, 1.2, -t * 0.15)), fbm3(p.zxy + vec3(7.7, 2.3, t * 0.10)));
  return fbm3(p + 1.8 * w);
}

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main(){
  vec2 p = v_uv * 2.0 - 1.0;
  p.x *= u_res.x / u_res.y;

  vec3 ro = vec3(0.0, 0.0, u_camDist);
  vec3 rd = normalize(vec3(p, -1.8));

  float t = 0.0;
  bool hit = false;
  vec3 pos = ro;
  float minD = 1e3;
  for (int i = 0; i < 180; i++) {
    pos = ro + rd * t;
    float d = mapHeart(pos);
    minD = min(minD, d);
    if (d < 0.001) { hit = true; break; }
    t += d * 0.38;
    if (t > 7.0) break;
  }

  vec3 E = vec3(0.0);

  if (hit) {
    vec3 n = calcNormal(pos);
    vec3 v = -rd;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);

    vec3 rp = pos + rd * 0.04;
    float trans = 1.0;
    vec3 inner = vec3(0.0);
    for (int k = 0; k < 10; k++) {
      float raw = liquid(rp);
      float dens = smoothstep(0.30, 0.70, raw);
      float fil = pow(1.0 - abs(2.0 * raw - 1.0), 5.0);
      vec3 c = mix(u_colMag, u_colBlue, 0.5 + 0.5 * sin(raw * 6.0 + u_time * 0.3 + rp.y * 2.5));
      vec3 emit = c * dens * 0.55 + c * fil * u_filament + vec3(1.0) * pow(fil, 3.0) * u_filament * 0.4;
      emit += u_colBlue * smoothstep(0.5, 0.0, length(rp)) * u_core;
      inner += trans * emit * 0.17;
      trans *= 0.84;
      rp += rd * 0.11;
      if (length(rp) > 1.0) break;
    }
    E += inner * (1.0 - fres * 0.6) * u_liquidBright;

    vec3 rim = mix(u_colMag, u_colBlue, 0.5 + 0.5 * (n.x * 0.7 + n.y * 0.45));
    E += rim * fres * 1.3;
    vec3 l1 = normalize(vec3(0.6, 0.85, 0.6));
    vec3 l2 = normalize(vec3(-0.7, 0.25, 0.55));
    vec3 h1 = normalize(l1 + v);
    vec3 h2 = normalize(l2 + v);
    E += vec3(1.0) * pow(max(dot(n, h1), 0.0), u_shininess) * 1.3 * u_specular;
    E += vec3(0.9, 0.75, 0.8) * pow(max(dot(n, h2), 0.0), u_shininess * 0.45) * 0.6 * u_specular;
  } else {
    float g = exp(-minD * 5.5);
    float ang = atan(rd.y, rd.x);
    vec3 gc = mix(u_glowA, u_glowB, 0.5 + 0.5 * sin(ang * 3.0 + u_time * 0.5));
    E += (gc * g * 1.4 + vec3(0.9, 0.7, 0.8) * pow(g, 3.0) * 0.7) * u_glowStrength;

    // niebla suave que reacciona al resplandor
    float fog = exp(-length(p) * 1.1);
    E += u_glowB * fog * 0.06 * u_glowStrength;

    // partículas tenues a la deriva
    vec2 sp = v_uv * 2.0 - 1.0;
    vec2 gp = floor(sp * vec2(u_res.x / u_res.y, 1.0) * 26.0);
    float rnd = hash21(gp);
    if (rnd > 0.94) {
      vec2 cell = gp / 26.0 + 0.5 / 26.0;
      cell.x *= u_res.y / u_res.x;
      vec2 dd = sp - (cell * 2.0 - 1.0);
      float tw = 0.5 + 0.5 * sin(u_time * 2.0 + rnd * 40.0);
      float pt = smoothstep(0.04, 0.0, length(dd)) * tw * (rnd - 0.94) / 0.06;
      E += vec3(0.95, 0.8, 0.85) * pt * 0.6;
    }
  }

  vec3 col = u_bg + E;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(type, src){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
  }
  return sh;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program) || 'link failed');
}
gl.useProgram(program);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

const U = {
  time: gl.getUniformLocation(program, 'u_time'),
  res: gl.getUniformLocation(program, 'u_res'),
  deform: gl.getUniformLocation(program, 'u_deform'),
  freq: gl.getUniformLocation(program, 'u_freq'),
  morphSpeed: gl.getUniformLocation(program, 'u_morphSpeed'),
  rotSpeed: gl.getUniformLocation(program, 'u_rotSpeed'),
  specular: gl.getUniformLocation(program, 'u_specular'),
  shininess: gl.getUniformLocation(program, 'u_shininess'),
  glowStrength: gl.getUniformLocation(program, 'u_glowStrength'),
  colMag: gl.getUniformLocation(program, 'u_colMag'),
  colBlue: gl.getUniformLocation(program, 'u_colBlue'),
  glowA: gl.getUniformLocation(program, 'u_glowA'),
  glowB: gl.getUniformLocation(program, 'u_glowB'),
  liquidSpeed: gl.getUniformLocation(program, 'u_liquidSpeed'),
  liquidScale: gl.getUniformLocation(program, 'u_liquidScale'),
  liquidBright: gl.getUniformLocation(program, 'u_liquidBright'),
  filament: gl.getUniformLocation(program, 'u_filament'),
  core: gl.getUniformLocation(program, 'u_core'),
  bg: gl.getUniformLocation(program, 'u_bg'),
  camAngle: gl.getUniformLocation(program, 'u_camAngle'),
  camDist: gl.getUniformLocation(program, 'u_camDist'),
};

// keyframes del timeline de scroll (5 secciones) — rojo / púrpura / naranja
const K = {
  cam:   [0.0, 0.6, 1.2, 1.9, 2.6],
  dist:  [2.7, 3.0, 2.4, 3.2, 2.8],
  deform:[0.10, 0.12, 0.14, 0.22, 0.10],
  liq:   [0.35, 0.60, 0.90, 1.10, 0.40],
  glow:  [0.55, 0.90, 1.05, 1.15, 0.70],
  mag:   [[0.85,0.06,0.18],[0.55,0.08,0.55],[0.95,0.35,0.10],[0.55,0.08,0.55],[0.85,0.06,0.18]],
  blue:  [[0.45,0.08,0.55],[0.85,0.06,0.18],[0.55,0.08,0.55],[0.85,0.06,0.18],[0.45,0.08,0.55]],
  gA:    [[0.45,0.08,0.55],[0.55,0.10,0.60],[0.55,0.10,0.60],[0.45,0.10,0.60],[0.45,0.08,0.55]],
  gB:    [[0.85,0.06,0.18],[0.95,0.30,0.10],[1.0,0.45,0.10],[1.0,0.45,0.10],[0.85,0.06,0.18]],
};

function smoothstep(x){ x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }
function lerp(a, b, f){ return a + (b - a) * f; }
function lerp3(a, b, f){ return [lerp(a[0],b[0],f), lerp(a[1],b[1],f), lerp(a[2],b[2],f)]; }

function sample(arr, prog){
  const seg = prog * 4;
  const i = Math.min(3, Math.floor(seg));
  const f = smoothstep(seg - i);
  if (Array.isArray(arr[0])) return lerp3(arr[i], arr[i + 1], f);
  return lerp(arr[i], arr[i + 1], f);
}

let target = 0, progress = 0;

function onScroll(){
  const max = document.documentElement.scrollHeight - window.innerHeight;
  target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

// En celulares el raymarcher es muy costoso: bajamos la resolución interna
// (se ve casi igual pero rinde mucho mejor y evita que se trabe).
const esMovil = window.matchMedia('(max-width: 820px)').matches ||
                window.matchMedia('(pointer: coarse)').matches;

let dpr = 1;
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, esMovil ? 0.7 : 1.5);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (heartCanvas.width !== w || heartCanvas.height !== h){
    heartCanvas.width = w;
    heartCanvas.height = h;
  }
}
resize();

function frame(now){
  resize();
  onScroll();
  progress += (target - progress) * 0.08;
  const time = now * 0.001;

  const cam    = sample(K.cam, progress);
  const dist   = sample(K.dist, progress);
  const deform = sample(K.deform, progress) + 0.02 * Math.sin(time * 1.3);
  const liq    = sample(K.liq, progress);
  const glow   = sample(K.glow, progress);
  const mag    = sample(K.mag, progress);
  const blue   = sample(K.blue, progress);
  const gA     = sample(K.gA, progress);
  const gB     = sample(K.gB, progress);

  gl.viewport(0, 0, heartCanvas.width, heartCanvas.height);
  gl.uniform1f(U.time, time);
  gl.uniform2f(U.res, heartCanvas.width, heartCanvas.height);
  gl.uniform1f(U.deform, deform);
  gl.uniform1f(U.freq, 1.0);
  gl.uniform1f(U.morphSpeed, 0.30);
  gl.uniform1f(U.rotSpeed, 0.12);
  gl.uniform1f(U.specular, 1.1);
  gl.uniform1f(U.shininess, 140.0);
  gl.uniform1f(U.glowStrength, glow);
  gl.uniform3fv(U.colMag, mag);
  gl.uniform3fv(U.colBlue, blue);
  gl.uniform3fv(U.glowA, gA);
  gl.uniform3fv(U.glowB, gB);
  gl.uniform1f(U.liquidSpeed, liq);
  gl.uniform1f(U.liquidScale, 2.20);
  gl.uniform1f(U.liquidBright, 1.0);
  gl.uniform1f(U.filament, 1.6);
  gl.uniform1f(U.core, 0.35);
  gl.uniform3fv(U.bg, [0.02, 0.02, 0.04]);
  gl.uniform1f(U.camAngle, cam);
  gl.uniform1f(U.camDist, dist);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
