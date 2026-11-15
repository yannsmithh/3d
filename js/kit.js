import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =====================================================================
   KIT: texturas procedurais, peças, móveis e paredes usados pelos ambientes.
   Tudo é adicionado ao grupo `ctx.room`; `finalize()` junta a geometria
   estática por material (poucas chamadas de desenho = mais leve).
   ===================================================================== */
export const ctx = { room: null, obst: [] };
export function begin() { ctx.room = new THREE.Group(); ctx.obst = []; return ctx.room; }
export const rnd = s => { const x = Math.sin(s * 999.13) * 10000; return x - Math.floor(x); };

/* ---------- Texturas ---------- */
export function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
const noise = (g, w, h, n, cols, s = 2, seed = 0) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(rnd(i * 3.1 + seed) * w, rnd(i * 7.7 + 1 + seed) * h, s, s); } };
const texCache = {};
const cached = (k, f) => texCache[k] || (texCache[k] = f());
const cl = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; };
export const T = {
  plaster: (rx, ry, base = '#8f8d88', a = '#7d7b77', b = '#9b9994') => cl(cached('pl' + base, () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${rnd(i) > .5 ? '255,255,255' : '40,40,40'},${0.03 + rnd(i + 9) * 0.05})`; g.beginPath(); g.arc(rnd(i * 2.3) * w, rnd(i * 5.1) * h, 20 + rnd(i * 1.7) * 60, 0, 7); g.fill(); }
    noise(g, w, h, 1500, [a, b, base], 2); })), rx, ry),
  brick: (rx, ry, tone = 0) => cl(cached('br' + tone, () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3b2418'; g.fillRect(0, 0, w, h);
    const bh = 20, bw = 62;
    for (let r = 0; r < 13; r++) for (let c = -1; c < 5; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2, k = rnd(r * 9 + c * 3.3);
      g.fillStyle = tone ? `rgb(${150 + k * 40 | 0},${96 + k * 24 | 0},${70 + k * 16 | 0})` : `rgb(${130 + k * 45 | 0},${68 + k * 22 | 0},${38 + k * 14 | 0})`; g.fillRect(x, y, bw - 4, bh - 4);
    } noise(g, w, h, 900, ['rgba(0,0,0,.18)', 'rgba(255,200,150,.12)'], 2); })), rx, ry),
  block: (rx, ry) => cl(cached('bl', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2 ? 32 : 0); g.fillStyle = `rgb(${205 + rnd(r * 4 + c) * 25 | 0},${203 + rnd(r + c) * 22 | 0},${198 + rnd(c) * 20 | 0})`; g.fillRect(x + 2, r * 64 + 2, 60, 60); }
    noise(g, w, h, 500, ['rgba(0,0,0,.08)'], 2); })), rx, ry),
  tile: (rx, ry, base = '#c4c1bb') => cl(cached('ti' + base, () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    noise(g, w, h, 1200, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.07)'], 2);
    g.strokeStyle = 'rgba(80,78,74,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); })), rx, ry),
  wood: (rx, ry, base = '#c79a63') => cl(cached('wo' + base, () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${rnd(i) > .5 ? '255,235,200' : '70,40,15'},.12)`; g.fillRect(0, i * 43, w, 43); g.fillStyle = 'rgba(60,35,15,.45)'; g.fillRect(0, i * 43, w, 2); }
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(80,50,20,.10)'; g.fillRect(rnd(i) * w, rnd(i + 4) * h, 30 + rnd(i) * 40, 1); } })), rx, ry),
  slats: (rx, ry) => cl(cached('sl', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a2412'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = `rgb(${176 + rnd(x) * 20 | 0},${118 + rnd(x) * 14 | 0},${70 + rnd(x) * 10 | 0})`; g.fillRect(x + 1, 0, 14, h); } })), rx, ry),
  stripes: (rx, ry) => cl(cached('st', () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1b1d'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 16, h); })), rx, ry),
  jute: (rx, ry) => cl(cached('ju', () => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#c7a26a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = y % 8 ? 'rgba(120,85,40,.35)' : 'rgba(255,230,170,.25)'; g.fillRect(0, y, w, 2); }
    for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(100,70,30,.2)'; g.fillRect(x, 0, 1, h); } })), rx, ry),
  confete: (rx, ry, bg = '#d4e1ee') => cl(cached('cf' + bg, () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) { g.strokeStyle = ['#3d7bc4', '#8fb8e0', '#e6b84a', '#e58a8a'][i % 4]; g.lineWidth = 2; g.beginPath(); const x = rnd(i) * w, y = rnd(i + 3) * h, a = rnd(i + 8) * 6; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke(); } })), rx, ry),
  cards: (rx, ry) => cl(cached('ca', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2d4d5a'; g.fillRect(0, 0, w, h);
    const cols = ['#e8e4da', '#3c9a52', '#d6453a', '#f0c23a', '#222', '#4a7fb5'];
    for (let i = 0; i < 24; i++) { g.save(); g.translate(rnd(i) * w, rnd(i + 5) * h); g.rotate(rnd(i + 9) * 6); g.fillStyle = cols[i % 6]; if (i % 3 === 0) { g.beginPath(); g.arc(0, 0, 16 + rnd(i) * 10, 0, 7); g.fill(); } else g.fillRect(-14, -20, 28, 40); g.restore(); } })), rx, ry),
  alphabet: (rx, ry) => cl(cached('al', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 40px Arial'; g.textAlign = 'center';
    const L = 'PVJLZABCDEFMXQOY'; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.fillText(L[r * 4 + c], c * 64 + 32, r * 64 + 46); })), rx, ry),
  sign: (text, bg, fg, w = 512, h = 128) => canvasTex(w, h, (g, W, H) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } g.fillStyle = fg; g.font = `bold ${H * 0.62}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 4); }),
  // vistas: pela janela / ao fundo
  predios: () => cached('pr', () => canvasTex(1024, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6d93c2'); sky.addColorStop(1, '#b7cde2'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (const [x0, x1, y0, c] of [[40, 380, 40, '#2f4d7c'], [420, 640, 20, '#2a4672'], [700, 1000, 50, '#34527f']]) {
      g.fillStyle = c; g.fillRect(x0, y0, x1 - x0, h - y0 - 40);
      for (let y = y0 + 14; y < h - 60; y += 26) for (let x = x0 + 10; x < x1 - 14; x += 22) { g.fillStyle = rnd(x * 3 + y) > .35 ? '#1d3358' : '#e8f0fa'; g.fillRect(x, y, 10, 14); }
    }
    g.fillStyle = '#3f6a3a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(80 + i * 115, h - 56, 34 + rnd(i) * 22, 0, 7); g.fill(); }
    g.fillStyle = '#7a8570'; g.fillRect(0, h - 40, w, 40); g.fillStyle = '#9aa08e'; g.fillRect(0, h - 22, w, 22); })),
  jardim: () => cached('ja', () => canvasTex(1024, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f0a46a'); sky.addColorStop(0.5, '#e7b9a0'); sky.addColorStop(1, '#8fb5d6'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c23a3f'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rnd(i) * w, h - 40 - rnd(i + 3) * 60, 30, 14, rnd(i) * 3, 0, 7); g.fill(); }
    g.fillStyle = '#2f6d34'; for (let i = 0; i < 24; i++) { g.beginPath(); g.ellipse(rnd(i + 20) * w, h - 20 - rnd(i + 8) * 50, 34, 12, rnd(i) * 3, 0, 7); g.fill(); }
    g.fillStyle = '#3b7a3a'; for (const x of [120, 560, 900]) { g.fillRect(x - 5, 60, 10, 160); for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x + Math.cos(k) * 40, 70 + Math.sin(k) * 14, 44, 8, k, 0, 7); g.fill(); } } })),
  ceu: () => cached('ce', () => canvasTex(512, 256, (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#5aa4e6'); s.addColorStop(1, '#d9ecfa'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rnd(i) * w, 40 + rnd(i + 4) * 120, 50 + rnd(i) * 40, 14, 0, 0, 7); g.fill(); } })),
  grama: (rx, ry) => cl(cached('gr', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7fa55b'; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, ['#6f9650', '#8db668', '#789d55', '#9cc076'], 2, 3); })), rx, ry),
  areia: (rx, ry) => cl(cached('ar', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#eadfc3'; g.fillRect(0, 0, w, h); noise(g, w, h, 3000, ['#dccfae', '#f4ecd6', '#e2d6b6'], 2, 5); })), rx, ry),
  paver: (rx, ry, base = '#c98b5c') => cl(cached('pv' + base, () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 32) { const o = (y / 16) % 2 ? 16 : 0; g.fillStyle = `rgba(${rnd(x + y) > .5 ? '255,220,180' : '60,30,10'},.12)`; g.fillRect(x + o, y, 31, 15); g.strokeStyle = 'rgba(70,40,20,.35)'; g.strokeRect(x + o, y, 32, 16); } })), rx, ry),
  asfalto: (rx, ry) => cl(cached('as', () => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a5f66'; g.fillRect(0, 0, w, h); noise(g, w, h, 1800, ['#4d5258', '#676c73'], 2, 8); })), rx, ry)
};

/* ---------- Materiais e peças básicas ---------- */
const mats = {};
export const M = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })); };
export const TM = (tex, o = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, ...o });
export const mat = m => (typeof m === 'number' ? M(m) : m);
export const COL = { NAVY: 0x23407f, WOODT: 0xa85a2a, WOODD: 0x6d4026, BLACK: 0x1a1c20, LEATHER: 0xb3693a, WHITE: 0xf2f1ed, LIGHTBLUE: 0x8fb4de, TEAL: 0x3b9aa8 };
export const GLASS = () => cached('glass', () => new THREE.MeshStandardMaterial({ color: 0xcfe3f0, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false }));
export const BASIC = c => cached('b' + c, () => new THREE.MeshBasicMaterial({ color: c }));
export function box(x, z, w, d, h, m, y = 0, o = {}) {
  const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(m));
  k.position.set(x, y + h / 2, z); k.castShadow = o.cast !== false; k.receiveShadow = true;
  if (o.ry) k.rotation.y = o.ry; if (o.rz) k.rotation.z = o.rz; if (o.rx) k.rotation.x = o.rx;
  (o.parent || ctx.room).add(k);
  if (o.solid) ctx.obst.push({ x, z, hx: w / 2, hz: d / 2 });
  return k;
}
export function cyl(x, z, r, h, m, y = 0, o = {}) {
  const k = new THREE.Mesh(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg || 14), mat(m));
  k.position.set(x, y + h / 2, z); k.castShadow = o.cast !== false; k.receiveShadow = true;
  (o.parent || ctx.room).add(k);
  if (o.solid) ctx.obst.push({ x, z, r: o.solid === true ? r : o.solid });
  return k;
}
export function sph(x, y, z, r, m, o = {}) {
  const k = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 12, o.seg ? o.seg - 2 : 10), mat(m)); k.position.set(x, y, z); k.castShadow = true; (o.parent || ctx.room).add(k); if (o.sy) k.scale.y = o.sy; return k;
}
export function cone(x, z, r, h, m, y = 0, seg = 12) { const k = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(m)); k.position.set(x, y + h / 2, z); k.castShadow = true; ctx.room.add(k); return k; }
export function plane(w, h, m, x, y, z, ry = 0, rx = 0) {
  const k = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(m)); k.position.set(x, y, z); k.rotation.set(rx, ry, 0, 'YXZ'); k.receiveShadow = true; ctx.room.add(k); return k;
}
export const floorPlane = (w, d, m, x = 0, z = 0, y = 0) => plane(w, d, m, x, y, z, 0, -Math.PI / 2);
export function solid(x, z, hx, hz) { ctx.obst.push({ x, z, hx, hz }); }
export function ring(x, z, r0, r1, m, y = 0.03, seg = 40) { const k = new THREE.Mesh(new THREE.RingGeometry(r0, r1, seg), mat(m)); k.rotation.x = -Math.PI / 2; k.position.set(x, y, z); k.receiveShadow = true; ctx.room.add(k); return k; }
export function disc(x, z, r, m, y = 0.03, seg = 32) { const k = new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat(m)); k.rotation.x = -Math.PI / 2; k.position.set(x, y, z); k.receiveShadow = true; ctx.room.add(k); return k; }
export function led(x, z, w, d, y) { return box(x, z, w, d, 0.03, BASIC(0xffffff), y, { cast: false }); }
export function spot(x, z, y, r = 0.06) { const s = new THREE.Mesh(new THREE.CircleGeometry(r, 10), BASIC(0xffffff)); s.rotation.x = Math.PI / 2; s.position.set(x, y - 0.005, z); ctx.room.add(s); }

/* ---------- Paredes com vãos ---------- */
// axis 'x': corre ao longo de x em z=fixed; 'z': corre ao longo de z em x=fixed. openings: {a,b,y0,y1,glass,door,panes}
export function wall(axis, fixed, a, b, h, m, openings = [], o = {}) {
  const t = o.t || 0.2, ops = [...openings].sort((p, q) => p.a - q.a);
  const seg = (s, e, y0, y1, sol) => {
    if (e - s < 0.01 || y1 - y0 < 0.01) return; const c = (s + e) / 2, len = e - s;
    if (axis === 'x') box(c, fixed, len, t, y1 - y0, m, y0, { solid: sol }); else box(fixed, c, t, len, y1 - y0, m, y0, { solid: sol });
  };
  let cur = a;
  for (const p of ops) {
    seg(cur, p.a, 0, h, o.solid !== false);
    seg(p.a, p.b, 0, p.y0 || 0, o.solid !== false);                      // peitoril
    seg(p.a, p.b, p.y1, h, false);                                       // verga
    if (!p.door) {
      const w = p.b - p.a, n = p.panes || Math.max(1, Math.round(w / 1.6)), y0 = p.y0 || 0, hh = p.y1 - y0, c = (p.a + p.b) / 2;
      for (let i = 0; i <= n; i++) { const q = p.a + w * i / n; if (axis === 'x') box(q, fixed, 0.07, 0.1, hh, COL.BLACK, y0, { cast: false }); else box(fixed, q, 0.1, 0.07, hh, COL.BLACK, y0, { cast: false }); }
      for (const yy of [y0, p.y1 - 0.07]) { if (axis === 'x') box(c, fixed, w, 0.1, 0.07, COL.BLACK, yy, { cast: false }); else box(fixed, c, 0.1, w, 0.07, COL.BLACK, yy, { cast: false }); }
      if (axis === 'x') plane(w, hh, GLASS(), c, y0 + hh / 2, fixed); else plane(w, hh, GLASS(), fixed, y0 + hh / 2, c, Math.PI / 2);
      if (o.solid !== false) { if (axis === 'x') solid(c, fixed, w / 2, 0.12); else solid(fixed, c, 0.12, w / 2); }
    }
    cur = p.b;
  }
  seg(cur, b, 0, h, o.solid !== false);
}

/* ---------- Plantas e móveis ---------- */
export function plant(x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.14, 10), M(0x23262b)); pot.position.y = 0.07; g.add(pot);
  const greens = [M(0x2f6a30, { side: THREE.DoubleSide }), M(0x3d7a3a, { side: THREE.DoubleSide }), M(0x4f8f40, { side: THREE.DoubleSide })];
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.17, 7), greens[i % 3]);
    l.scale.set(0.8, 1.4, 1); l.position.set(Math.cos(i * 0.9) * 0.1, 0.3 + rnd(i + 5) * 0.12, Math.sin(i * 0.9) * 0.1);
    l.rotation.set(-0.5 + rnd(i) * 0.4, i * 0.9, 0.3 - rnd(i + 1) * 0.6, 'YXZ'); l.castShadow = true; g.add(l);
  }
  ctx.room.add(g); return g;
}
function addTo(g) { return (geo, m, px, py, pz, rx = 0, rz = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(px, py, pz); k.rotation.set(rx, 0, rz); k.castShadow = true; k.receiveShadow = true; g.add(k); return k; }; }
export function meshChair(x, z, ry, c = COL.NAVY) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g); const add = addTo(g), m = M(c, { roughness: 0.65 });
  add(new THREE.BoxGeometry(0.46, 0.05, 0.44), m, 0, 0.46, 0);
  add(new THREE.BoxGeometry(0.46, 0.4, 0.05), m, 0, 0.72, -0.21, -0.14);
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.05, 0.05, 0.34), m, s * 0.25, 0.62, -0.02); add(new THREE.BoxGeometry(0.04, 0.16, 0.04), m, s * 0.25, 0.54, 0.12); }
  for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) add(new THREE.CylinderGeometry(0.016, 0.012, 0.46, 5), M(0x14213d), lx, 0.23, lz);
  return g;
}
export function eamesChair(x, z, ry, c = 0x8fb4de, h = 0.46) { // cadeira de casca com pés de madeira
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g); const add = addTo(g), m = M(c, { roughness: 0.5 });
  add(new THREE.CylinderGeometry(0.23, 0.2, 0.05, 14), m, 0, h, 0);
  add(new THREE.BoxGeometry(0.42, 0.34, 0.05), m, 0, h + 0.2, -0.2, -0.2);
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(new THREE.CylinderGeometry(0.013, 0.013, h, 5), M(0xc79a63), lx * 1.25, h / 2, lz * 1.25, lz * 0.5, -lx * 0.5);
  return g;
}
export function roundTable(x, z, o = {}) {
  const r = o.r ?? 0.65, topM = o.top ?? M(COL.WOODT, { roughness: 0.5 }), h = o.h ?? 0.75;
  cyl(x, z, r, 0.05, topM, h - 0.05, { seg: 26 }); cyl(x, z, 0.05, h - 0.05, o.leg ?? COL.WOODD, 0, { seg: 8 });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; box(x + Math.cos(a) * 0.26, z + Math.sin(a) * 0.26, 0.04, 0.04, h - 0.03, o.leg ?? COL.WOODD, 0, { rx: Math.sin(a) * 0.33, rz: -Math.cos(a) * 0.33 }); }
  ctx.obst.push({ x, z, r: r + 0.3 });
  if (o.plant !== false) plant(x, h, z, 1.2);
  const n = o.chairs ?? 4;
  for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n + 0.4 + rnd(x + z + k) * 0.25, cx = x + Math.cos(a) * (r + 0.17), cz = z + Math.sin(a) * (r + 0.17), ry = Math.atan2(-Math.cos(a), -Math.sin(a)); if (o.eames) eamesChair(cx, cz, ry, o.chairColor ?? 0x8fb4de); else meshChair(cx, cz, ry, o.chairColor ?? COL.NAVY); }
}
export function table(x, z, w, d, h, topM, legM = COL.BLACK, o = {}) {
  box(x, z, w, d, 0.05, topM, h - 0.05, { solid: o.solid !== false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(x + sx * (w / 2 - 0.06), z + sz * (d / 2 - 0.06), 0.05, 0.05, h - 0.05, legM);
}
export function armchair(x, z, ry, w = 0.82, leather = COL.LEATHER) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g); const add = addTo(g);
  const lm = M(leather, { roughness: 0.55 }), wood = M(COL.WOODD, { roughness: 0.6 });
  add(new THREE.BoxGeometry(w - 0.16, 0.16, 0.78), lm, 0, 0.4, 0);
  add(new THREE.BoxGeometry(w - 0.16, 0.5, 0.14), lm, 0, 0.72, -0.36, -0.25);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.07, 0.06, 0.78), wood, s * (w / 2 - 0.04), 0.62, 0.02);
    for (const [py, pz, hh] of [[0.46, 0.36, 0.32], [0.25, -0.36, 0.5]]) add(new THREE.BoxGeometry(0.07, hh, 0.07), wood, s * (w / 2 - 0.04), py, pz);
  }
  ctx.obst.push({ x, z, r: w * 0.62 }); return g;
}
export function stool(x, z, c = COL.NAVY, h = 0.72) { cyl(x, z, 0.2, 0.06, c, h, { seg: 14 }); cyl(x, z, 0.025, h, 0x15171a, 0, { seg: 6 }); cyl(x, z, 0.17, 0.02, 0x15171a, 0.25, { seg: 12 }); }
export function shelf(x, y, z, w, d = 0.3, c = COL.WOODD, ry = 0) { return box(x, z, w, d, 0.05, c, y, { ry }); }
export function counter(x, z, w, d, h, body, top, o = {}) {
  box(x, z, w, d, h - 0.06, body, 0, { solid: o.solid !== false }); box(x, z, w + 0.08, d + 0.08, 0.06, top, h - 0.06);
}
export function vase(x, y, z, h = 0.3, c = 0xf0ede6) { return cyl(x, z, 0.1 * h / 0.3, h, c, y, { r2: 0.06 * h / 0.3, seg: 12 }); }
export function rug(x, z, w, d, m) { return box(x, z, w, d, 0.02, m, 0, { cast: false }); }
export function pendant(x, z, y, cord = 0.9, c = COL.BLACK) {
  cyl(x, z, 0.004, cord, c, y + 0.3, { seg: 4, cast: false }); cyl(x, z, 0.22, 0.3, c, y, { r2: 0.02, seg: 14 });
  const gl = new THREE.Mesh(new THREE.CircleGeometry(0.19, 14), BASIC(0xffd9a0)); gl.rotation.x = Math.PI / 2; gl.position.set(x, y + 0.01, z); ctx.room.add(gl);
}
export function shelfItems(x0, x1, y, z, n = 6, seed = 0) {
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / n; if (rnd(i + seed) > 0.5) plant(x, y, z, 0.5 + rnd(i + 3) * 0.3); else vase(x, y, z, 0.2 + rnd(i) * 0.15, [0xd8cfc0, 0xe9e4d8, 0x8a6a4a][i % 3]); }
}
export function productShelf(x, z, w, h, d = 0.4, ry = 0, rows = 5, seed = 0) { // gôndola/estante com produtos coloridos
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * 0.3), M(0x1c1d21)); frame.position.set(0, h / 2, -d * 0.35); g.add(frame);
  const cols = [0x7bb04a, 0xd6453a, 0xf0c23a, 0x4a7fb5, 0xe9e4d8, 0x3c9a52, 0xe58a2e];
  for (let r = 0; r < rows; r++) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), M(0x2a2b30)); sh.position.set(0, 0.2 + r * (h - 0.3) / rows, 0); g.add(sh);
    for (let i = 0; i < Math.floor(w / 0.22); i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14 + rnd(i + r) * 0.06, d * 0.7), M(cols[Math.floor(rnd(i * 3 + r + seed) * cols.length)])); b.position.set(-w / 2 + 0.14 + i * 0.22, 0.28 + r * (h - 0.3) / rows + 0.04, 0.02); g.add(b); }
  }
  ctx.obst.push({ x, z, hx: (Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d) / 2, hz: (Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d) / 2 });
}
export function sofa(x, z, ry, w = 2.0, c = 0x7f95b4) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g); const add = addTo(g), m = M(c, { roughness: 0.9 });
  add(new THREE.BoxGeometry(w, 0.3, 0.85), m, 0, 0.3, 0); add(new THREE.BoxGeometry(w, 0.5, 0.2), m, 0, 0.6, -0.34, -0.12);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.2, 0.45, 0.85), m, s * (w / 2 - 0.1), 0.42, 0);
  ctx.obst.push({ x, z, hx: Math.abs(Math.cos(ry)) * 0.45 + Math.abs(Math.sin(ry)) * w / 2, hz: Math.abs(Math.sin(ry)) * 0.45 + Math.abs(Math.cos(ry)) * w / 2 });
}
export function pouf(x, z, c = 0xf0c23a, r = 0.28) { cyl(x, z, r, 0.36, c, 0, { seg: 14, r2: r * 0.9 }); }
export function fridge(x, z, w = 0.8, d = 0.7, h = 1.85) { box(x, z, w, d, h, new THREE.MeshStandardMaterial({ color: 0xb6bbc0, metalness: 0.65, roughness: 0.35 }), 0, { solid: true }); box(x - w / 2 + 0.08, z + d / 2, 0.03, 0.03, 0.9, COL.BLACK, 0.5); }

/* ---------- Luz ---------- */
export function lights(o = {}) {
  const r = ctx.room;
  r.add(new THREE.HemisphereLight(o.sky ?? 0xfff3e4, o.ground ?? 0x857a6c, o.hemi ?? 1.7));
  const sun = new THREE.DirectionalLight(o.sunColor ?? 0xffffff, o.sun ?? 1.0);
  const e = o.extent ?? 14; sun.position.set(o.sx ?? 3, o.sy ?? 9, o.sz ?? 4); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 60 }); sun.shadow.bias = -0.0006;
  r.add(sun, sun.target);
  for (const p of (o.points || [])) { const l = new THREE.PointLight(p.c, p.i, p.d, 2); l.position.set(...p.pos); r.add(l); }
}

/* ---------- Junta a geometria estática por material (menos draw calls) ---------- */
export function finalize() {
  const r = ctx.room; r.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  r.traverse(o => {
    if (!o.isMesh || o.userData.keep) return;
    const g = o.geometry; if (!g || !g.index || !g.attributes.uv || !g.attributes.normal) return;
    const key = o.material.uuid + (o.castShadow ? 'c' : 'n') + (o.receiveShadow ? 'r' : 'n');
    let e = groups.get(key); if (!e) groups.set(key, e = { material: o.material, cast: o.castShadow, recv: o.receiveShadow, geos: [] });
    const c = new THREE.BufferGeometry(); c.setIndex(g.index.clone());
    for (const n of ['position', 'normal', 'uv']) c.setAttribute(n, g.attributes[n].clone());
    c.applyMatrix4(o.matrixWorld); e.geos.push(c); drop.push(o);
  });
  for (const o of drop) { o.parent.remove(o); o.geometry.dispose(); }
  for (const e of groups.values()) {
    const m = new THREE.Mesh(mergeGeometries(e.geos, false), e.material); m.castShadow = e.cast; m.receiveShadow = e.recv; m.matrixAutoUpdate = false; m.userData.merged = true; r.add(m);
    e.geos.forEach(g => g.dispose());
  }
}

/* ---------- Faixa curva (pista de cooper etc.) ---------- */
export function ribbon(points, w, m, y = 0.04, closed = true, N = 160) {
  const cu = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])), closed), pos = [], uv = [], nor = [], idx = [];
  const total = cu.getLength();
  for (let i = 0; i <= N; i++) {
    const u = closed ? (i % N) / N : i / N, p = cu.getPointAt(u), t = cu.getTangentAt(u), nx = -t.z, nz = t.x;
    pos.push(p.x + nx * w / 2, y, p.z + nz * w / 2, p.x - nx * w / 2, y, p.z - nz * w / 2); nor.push(0, 1, 0, 0, 1, 0); uv.push(0, i / N * total / w, 1, i / N * total / w);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, mat(m)); mesh.receiveShadow = true; ctx.room.add(mesh); return cu;
}
