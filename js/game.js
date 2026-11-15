import * as THREE from 'three';

/* =====================================================================
   AMBIENTES EM 3D — o mapa do lazer (render do book) é o menu; clicar num
   ponto entra no ambiente, recriado em 3D a partir da foto do book, e o
   boneco anda só lá dentro. Cada ambiente é uma função em ROOMS.
   Medidas em metros: x = leste, z = sul, y = altura.
   ===================================================================== */
const $ = id => document.getElementById(id);

/* ---------- Renderer ---------- */
const cv = $('cv');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); }
catch (e) { $('err').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- Texturas procedurais ---------- */
const rnd = s => { const x = Math.sin(s * 999.13) * 10000; return x - Math.floor(x); };
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
const noise = (g, w, h, n, cols, s = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(rnd(i * 3.1) * w, rnd(i * 7.7 + 1) * h, s, s); } };
const T = {
  plaster: (rx, ry) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8f8d88'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${rnd(i) > .5 ? '255,255,255' : '40,40,40'},${0.03 + rnd(i + 9) * 0.05})`; g.beginPath(); g.arc(rnd(i * 2.3) * w, rnd(i * 5.1) * h, 20 + rnd(i * 1.7) * 60, 0, 7); g.fill(); }
    noise(g, w, h, 1800, ['#7d7b77', '#9b9994', '#858380'], 2); }, rx, ry),
  brick: (rx, ry) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3b2418'; g.fillRect(0, 0, w, h);
    const bh = 20, bw = 62;
    for (let r = 0; r < 13; r++) for (let c = -1; c < 5; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2, k = rnd(r * 9 + c * 3.3);
      g.fillStyle = `rgb(${130 + k * 45 | 0},${68 + k * 22 | 0},${38 + k * 14 | 0})`; g.fillRect(x, y, bw - 4, bh - 4);
    } noise(g, w, h, 900, ['rgba(0,0,0,.18)', 'rgba(255,200,150,.12)'], 2); }, rx, ry),
  tile: (rx, ry) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c4c1bb'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 1500, ['#bab7b1', '#cdcac4', '#c0bdb7'], 2);
    g.strokeStyle = 'rgba(80,78,74,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, rx, ry),
  wood: (rx, ry) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b98a55'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${rnd(i) > .5 ? '255,235,200' : '70,40,15'},.12)`; g.fillRect(0, i * 43, w, 43); g.fillStyle = 'rgba(60,35,15,.5)'; g.fillRect(0, i * 43, w, 2); }
    for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(80,50,20,.12)'; g.fillRect(rnd(i) * w, rnd(i + 4) * h, 30 + rnd(i) * 40, 1); } }, rx, ry),
  jute: (rx, ry) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#c7a26a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = y % 8 ? 'rgba(120,85,40,.35)' : 'rgba(255,230,170,.25)'; g.fillRect(0, y, w, 2); }
    for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(100,70,30,.2)'; g.fillRect(x, 0, 1, h); } }, rx, ry),
  confete: (rx, ry) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d4e1ee'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { g.strokeStyle = ['#3d7bc4', '#8fb8e0', '#e6b84a', '#6fa8d6'][i % 4]; g.lineWidth = 2; g.beginPath(); const x = rnd(i) * w, y = rnd(i + 3) * h, a = rnd(i + 8) * 6; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke(); } }, rx, ry),
  fora: () => canvasTex(1024, 256, (g, w, h) => { // vista pela janela: prédios azuis ao entardecer, árvores, calçada
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6d93c2'); sky.addColorStop(1, '#b7cde2'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (const [x0, x1, y0, c] of [[40, 380, 40, '#2f4d7c'], [420, 640, 20, '#2a4672'], [700, 1000, 50, '#34527f']]) {
      g.fillStyle = c; g.fillRect(x0, y0, x1 - x0, h - y0 - 40);
      for (let y = y0 + 14; y < h - 60; y += 26) for (let x = x0 + 10; x < x1 - 14; x += 22) { g.fillStyle = rnd(x * 3 + y) > .35 ? '#1d3358' : '#e8f0fa'; g.fillRect(x, y, 10, 14); }
    }
    g.fillStyle = '#3f6a3a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(80 + i * 115, h - 56, 34 + rnd(i) * 22, 0, 7); g.fill(); }
    g.fillStyle = '#7a8570'; g.fillRect(0, h - 40, w, 40); g.fillStyle = '#9aa08e'; g.fillRect(0, h - 22, w, 22); })
};

/* ---------- Peças ---------- */
let room = null, obst = [];
const mats = {};
const M = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })); };
const NAVY = 0x23407f, WOODT = 0xa85a2a, WOODD = 0x6d4026, BLACK = 0x1a1c20, LEATHER = 0xb3693a, WHITE = 0xf2f1ed;
const mat = m => (typeof m === 'number' ? M(m) : m);
function box(x, z, w, d, h, m, y = 0, o = {}) {
  const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(m));
  k.position.set(x, y + h / 2, z); k.castShadow = o.cast !== false; k.receiveShadow = true;
  (o.parent || room).add(k);
  if (o.solid) obst.push({ x, z, hx: w / 2, hz: d / 2 });
  return k;
}
function cyl(x, z, r, h, m, y = 0, o = {}) {
  const k = new THREE.Mesh(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg || 16), mat(m));
  k.position.set(x, y + h / 2, z); k.castShadow = o.cast !== false; k.receiveShadow = true;
  (o.parent || room).add(k);
  if (o.solid) obst.push({ x, z, r: o.solid === true ? r : o.solid });
  return k;
}
function plane(w, h, m, x, y, z, ry = 0, rx = 0) {
  const k = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(m));
  k.position.set(x, y, z); k.rotation.set(rx, ry, 0, 'YXZ'); k.receiveShadow = true; room.add(k); return k;
}
const GLASS = () => new THREE.MeshStandardMaterial({ color: 0xcfe3f0, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false });
const BASIC = c => new THREE.MeshBasicMaterial({ color: c });
function plant(x, y, z, s = 1, parent = room) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.14, 14), M(0x23262b)); pot.position.y = 0.07; g.add(pot);
  for (let i = 0; i < 8; i++) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.17, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.31 + rnd(i) * 0.04, 0.5, 0.27 + rnd(i + 2) * 0.1), side: THREE.DoubleSide, roughness: 0.8 }));
    l.scale.set(0.8, 1.4, 1); l.position.set(Math.cos(i * 0.8) * 0.1, 0.3 + rnd(i + 5) * 0.12, Math.sin(i * 0.8) * 0.1);
    l.rotation.set(-0.5 + rnd(i) * 0.4, i * 0.8, 0.3 - rnd(i + 1) * 0.6, 'YXZ'); l.castShadow = true; g.add(l);
  }
  parent.add(g); return g;
}
function meshChair(x, z, ry, c = NAVY) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; room.add(g);
  const add = (geo, m, px, py, pz, rx = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(px, py, pz); k.rotation.x = rx; k.castShadow = true; k.receiveShadow = true; g.add(k); return k; };
  const m = M(c, { roughness: 0.65 });
  add(new THREE.BoxGeometry(0.46, 0.05, 0.44), m, 0, 0.46, 0);
  add(new THREE.BoxGeometry(0.46, 0.4, 0.05), m, 0, 0.72, -0.21, -0.14);
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.05, 0.05, 0.34), m, s * 0.25, 0.62, -0.02); add(new THREE.BoxGeometry(0.04, 0.16, 0.04), m, s * 0.25, 0.54, 0.12); }
  for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) add(new THREE.CylinderGeometry(0.016, 0.012, 0.46, 6), M(0x14213d), lx, 0.23, lz);
  return g;
}
function roundTable(x, z, withChairs = true) {
  cyl(x, z, 0.65, 0.05, M(WOODT, { roughness: 0.5 }), 0.72, { seg: 28 });
  cyl(x, z, 0.05, 0.72, M(WOODD));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, l = box(x + Math.cos(a) * 0.28, z + Math.sin(a) * 0.28, 0.04, 0.04, 0.72, WOODD); l.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); }
  obst.push({ x, z, r: 0.95 });
  plant(x, 0.77, z, 1.25);
  if (withChairs) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4 + rnd(x + z + k) * 0.25; meshChair(x + Math.cos(a) * 0.82, z + Math.sin(a) * 0.82, Math.atan2(-Math.cos(a), -Math.sin(a))); }
}
function armchair(x, z, ry, w = 0.82) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; room.add(g);
  const add = (geo, m, px, py, pz, rx = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(px, py, pz); k.rotation.x = rx; k.castShadow = true; k.receiveShadow = true; g.add(k); return k; };
  const leather = M(LEATHER, { roughness: 0.55 }), wood = M(WOODD, { roughness: 0.6 });
  add(new THREE.BoxGeometry(w - 0.16, 0.16, 0.78), leather, 0, 0.4, 0);
  add(new THREE.BoxGeometry(w - 0.16, 0.5, 0.14), leather, 0, 0.72, -0.36, -0.25);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.07, 0.06, 0.78), wood, s * (w / 2 - 0.04), 0.62, 0.02);
    add(new THREE.BoxGeometry(0.07, 0.32, 0.07), wood, s * (w / 2 - 0.04), 0.46, 0.36);
    add(new THREE.BoxGeometry(0.07, 0.5, 0.07), wood, s * (w / 2 - 0.04), 0.25, -0.36);
    add(new THREE.BoxGeometry(0.07, 0.3, 0.07), wood, s * (w / 2 - 0.04), 0.15, 0.36);
  }
  obst.push({ x, z, r: w * 0.62 });
  return g;
}

/* ---------- Ambiente: SALÃO DE FESTAS (foto: img/lazer/salao-festas.jpg) ---------- */
function buildSalaoFestas() {
  const X0 = -7, Z0 = -5, Z1 = 8.5, H = 3.3;
  const plaster = (w, h) => new THREE.MeshStandardMaterial({ map: T.plaster(w / 2, h / 2), roughness: 0.95 });
  // piso e teto
  plane(14.4, 13.9, new THREE.MeshStandardMaterial({ map: T.tile(14.4 / 1.2, 13.9 / 1.2), roughness: 0.45 }), 0, 0, 1.75, 0, -Math.PI / 2);
  box(0, 1.75, 14.6, 14.1, 0.1, new THREE.MeshStandardMaterial({ color: 0xc2c0bb, emissive: 0x5a5854, roughness: 0.9 }), H, { cast: false });
  // paredes externas
  box(-7.1, 1.75, 0.2, 13.9, H, plaster(13.9, H), 0, { solid: true });                      // oeste
  box(0, 8.6, 14.4, 0.2, H, plaster(14.4, H), 0, { solid: true });                          // sul
  box(7.1, 5.85, 0.2, 5.7, H, plaster(5.7, H), 0, { solid: true });                              // leste (parte cega)
  box(-6.75, -4.9, 0.5, 0.2, H, plaster(0.5, H), 0, { solid: true });                       // norte: canto
  box(-3.25, -4.9, 6.5, 0.2, 0.8, plaster(6.5, 0.8), 2.5);                                  // verga da janela
  // janela grande (4 folhas, caixilho preto) + vista
  for (let i = 0; i <= 4; i++) box(-6.5 + i * 1.625, -4.95, 0.07, 0.1, 2.5, BLACK);
  box(-3.25, -4.95, 6.5, 0.1, 0.07, BLACK, 2.45); box(-3.25, -4.95, 6.5, 0.1, 0.07, BLACK, 0);
  plane(6.4, 2.4, GLASS(), -3.25, 1.25, -4.95);
  obst.push({ x: -3.25, z: -4.9, hx: 3.25, hz: 0.12 });
  plane(26, 7, new THREE.MeshBasicMaterial({ map: T.fora() }), -3.25, 3.2, -9.5);
  plane(30, 14, M(0x6d7d62), -3.25, -0.02, -12, 0, -Math.PI / 2);
  // bar: parede de tijolinho, prateleira, pendentes, bancada, geladeira
  box(3.2, -4.85, 6.4, 0.3, H, new THREE.MeshStandardMaterial({ map: T.brick(6.4, 3.3), roughness: 0.9 }), 0, { solid: true });
  box(6.7, -4.9, 0.6, 0.2, H, plaster(0.6, H), 0, { solid: true });
  box(2.9, -4.7, 5.6, 0.05, 0.3, WOODD, 2.05);
  box(2.9, -4.6, 5.6, 0.03, 0.03, BASIC(0xffc27a), 2.0);                                      // fita de luz sob a prateleira
  for (const x of [0.7, 1.4, 2.6, 3.4, 4.1, 5.2]) plant(x, 2.1, -4.7, 0.5 + rnd(x) * 0.3);
  for (const x of [1.0, 2.0, 3.0, 5.6]) cyl(x, -4.7, 0.05, 0.22 + rnd(x) * 0.1, 0xd8cfc0, 2.1, { seg: 12 });
  for (const x of [0.9, 2.3, 3.6]) {
    cyl(x, -3.9, 0.004, 0.95, BLACK, 2.35, { seg: 4, cast: false });
    cyl(x, -3.9, 0.22, 0.3, BLACK, 2.05, { r2: 0.02, seg: 18 });
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.19, 18), BASIC(0xffd9a0)); gl.rotation.x = Math.PI / 2; gl.position.set(x, 2.06, -3.9); room.add(gl);
  }
  box(2.4, -4.55, 4.2, 0.55, 0.9, 0x4a3022, 0, { solid: true }); box(2.4, -4.55, 4.3, 0.6, 0.05, 0x25211f, 0.9);
  cyl(1.6, -4.7, 0.015, 0.3, 0x15171a, 0.95, { seg: 6 });
  box(2.4, -3.7, 4.3, 0.7, 1.02, 0x8a4a28, 0, { solid: true }); box(2.4, -3.7, 4.4, 0.85, 0.07, 0x25211f, 1.02);  // bancada do bar
  for (const x of [0.9, 2.0, 3.1, 4.1]) { cyl(x, -2.85, 0.2, 0.06, NAVY, 0.72, { seg: 16 }); cyl(x, -2.85, 0.025, 0.7, 0x15171a, 0, { seg: 6 }); cyl(x, -2.85, 0.17, 0.02, 0x15171a, 0.25, { seg: 14 }); }
  box(5.1, -4.5, 0.8, 0.7, 1.85, new THREE.MeshStandardMaterial({ color: 0xb6bbc0, metalness: 0.65, roughness: 0.35 }), 0, { solid: true });
  box(4.78, -4.12, 0.03, 0.03, 0.9, BLACK, 0.5);
  box(5.95, -4.8, 0.8, 0.4, 2.15, WOODD, 0, { solid: true });
  // parede oeste: aparador de madeira, vasos, espelho orgânico
  box(-6.62, 0.9, 0.45, 2.8, 0.05, M(0x7b4a2b, { roughness: 0.5 }), 0.76, { solid: true });
  for (const [dx, dz] of [[-0.18, -1.2], [0.18, -1.2], [-0.18, 1.2], [0.18, 1.2]]) { const l = box(-6.62 + dx, 0.9 + dz, 0.04, 0.04, 0.76, 0x7b4a2b); l.rotation.z = -dx * 0.9; }
  for (const [dz, s] of [[-0.9, 1], [-0.5, 0.85]]) cyl(-6.62, 0.9 + dz, 0.12 * s, 0.34 * s, 0xf0ede6, 0.81, { r2: 0.07 * s, seg: 18 });
  plant(-6.62, 0.81, 0.3, 1.1); plant(-6.62, 0.81, 1.3, 0.7);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0x5b4a44, roughness: 0.1, metalness: 0.6 }));
  mirror.scale.set(0.95, 0.42, 1); mirror.position.set(-6.97, 1.9, 0.9); mirror.rotation.y = Math.PI / 2; room.add(mirror);
  const frame = new THREE.Mesh(new THREE.RingGeometry(1, 1.07, 28), M(WOODD)); frame.scale.set(0.95, 0.42, 1); frame.position.set(-6.96, 1.9, 0.9); frame.rotation.y = Math.PI / 2; room.add(frame);
  // parede leste: divisória de vidro com caixilho preto e o salão infantil ao lado
  box(7.1, -2.9, 0.2, 4.2, 0.8, plaster(4.2, 0.8), 2.5); box(7.1, 1.7, 0.2, 2.6, 0.8, plaster(2.6, 0.8), 2.5);
  for (const z of [-5, -3.6, -2.2, -0.8, 0.4, 1.9, 3.0]) box(7.1, z, 0.08, 0.08, 2.5, BLACK);
  box(7.1, -2.9, 0.1, 4.2, 0.07, BLACK, 2.45); box(7.1, -2.9, 0.1, 4.2, 0.07, BLACK, 0);
  box(7.1, 1.7, 0.1, 2.6, 0.07, BLACK, 2.45); box(7.1, 1.7, 0.1, 2.6, 0.07, BLACK, 0);
  plane(4.2, 2.4, GLASS(), 7.1, 1.25, -2.9, Math.PI / 2); plane(2.6, 2.4, GLASS(), 7.1, 1.25, 1.7, Math.PI / 2);
  obst.push({ x: 7.1, z: -2.9, hx: 0.1, hz: 2.1 }, { x: 7.1, z: 1.7, hx: 0.1, hz: 1.3 });
  // salão infantil (x 7.2..11)
  plane(3.9, 8, new THREE.MeshStandardMaterial({ map: T.wood(1.5, 3), roughness: 0.6 }), 9.1, 0, -1, 0, -Math.PI / 2);
  box(9.1, -5.05, 3.9, 0.2, H, new THREE.MeshStandardMaterial({ map: T.confete(2, 2) }), 0, { solid: true });
  box(11.05, -1.0, 0.2, 8.2, H, new THREE.MeshStandardMaterial({ map: T.confete(4, 2) }), 0, { solid: true });
  box(9.1, 3.05, 3.9, 0.2, H, plaster(3.9, H), 0, { solid: true });
  box(9.1, -1, 3.9, 8.2, 0.1, 0x9d9b96, H, { cast: false });
  cyl(9.3, -0.8, 0.5, 0.04, WHITE, 0.55, { seg: 24 }); cyl(9.3, -0.8, 0.04, 0.55, WHITE, 0); obst.push({ x: 9.3, z: -0.8, r: 0.9 });
  for (const a of [0.6, 2.4, 4.4]) meshChair(9.3 + Math.cos(a) * 0.72, -0.8 + Math.sin(a) * 0.72, Math.atan2(-Math.cos(a), -Math.sin(a)), 0x3b9aa8);
  // fita de LED em L e spots (como na foto)
  const led = BASIC(0xffffff);
  box(-2.2, 1.85, 0.09, 11.3, 0.03, led, H - 0.03, { cast: false });
  box(1.2, -3.8, 6.8, 0.09, 0.03, led, H - 0.03, { cast: false });
  for (const [x, z] of [[3.2, -1.8], [0.6, -0.2], [4.8, 1.0], [-4.6, -2.8], [-1.0, 2.6], [5.6, 3.6], [-3.4, 5.4], [2.6, 5.8], [5.4, 7.2]]) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), led); s.rotation.x = Math.PI / 2; s.position.set(x, H - 0.005, z); room.add(s); }
  // mesas com cadeiras azuis e vasos
  [[-4.6, -1.4], [0.4, -1.2], [4.7, -1.3], [-5.0, 1.5], [0.3, 1.6], [4.9, 1.5]].forEach(([x, z]) => roundTable(x, z));
  // lounge: tapete de juta, poltronas de couro, mesas de centro aninhadas, sofá
  box(0.3, 6.1, 4.4, 3.0, 0.02, new THREE.MeshStandardMaterial({ map: T.jute(4, 3), roughness: 1 }), 0, { cast: false });
  armchair(-2.7, 6.3, Math.PI / 2 - 0.12); armchair(3.3, 6.3, -Math.PI / 2 + 0.12);
  cyl(0.55, 6.5, 0.55, 0.36, 0xa4512c, 0, { seg: 28 }); cyl(0.55, 6.5, 0.5, 0.04, 0x3b3c40, 0.36, { seg: 28 }); obst.push({ x: 0.55, z: 6.5, r: 0.7 });
  cyl(0.0, 5.8, 0.4, 0.5, 0xa4512c, 0, { seg: 24 }); cyl(0.0, 5.8, 0.36, 0.04, 0x3b3c40, 0.5, { seg: 24 }); obst.push({ x: 0, z: 5.8, r: 0.5 });
  armchair(-6.1, 5.4, Math.PI / 2, 2.0);
  box(-6.1, 4.85, 0.5, 0.18, 0.4, 0x9fb3cf, 0.55);
  // luzes: ambiente + sombra suave de cima + luz quente do bar
  room.add(new THREE.HemisphereLight(0xfff3e4, 0x857a6c, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0); sun.position.set(3, 9, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 30 }); sun.shadow.bias = -0.0005;
  room.add(sun, sun.target);
  const bar = new THREE.PointLight(0xffb872, 14, 8, 2); bar.position.set(2.4, 2.5, -3.6); room.add(bar);
  const win = new THREE.PointLight(0x9db8e0, 6, 9, 2); win.position.set(-3.2, 2.2, -3.8); room.add(win);
  return {
    nome: 'Salão de festas', bounds: { x0: X0 + 0.2, x1: 10.8, z0: Z0 + 0.25, z1: Z1 - 0.25 }, h: H,
    start: [0.4, 4.8], yaw: 0,
    // mesmo ponto de vista da foto: do fundo do salão, olhando para o bar
    photo: { x: 0.3, z: 8.1, y: 1.55, yaw: 0, pitch: -0.05, fov: 62 }
  };
}

const ROOMS = { 'salao-festas': buildSalaoFestas };

/* ---------- Boneco ---------- */
function makeBoneco() {
  const g = new THREE.Group();
  const skin = M(0xf0c09a), shirt = M(0x3f6fb5), pants = M(0xe8e4da), shoe = M(0x2b323c), hair = M(0x3b2a20);
  const part = (geo, m, x, y, z, parent = g) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; parent.add(k); return k; };
  part(new THREE.BoxGeometry(0.46, 0.54, 0.26), shirt, 0, 0.9, 0);
  part(new THREE.SphereGeometry(0.18, 16, 12), skin, 0, 1.34, 0);
  const cap = part(new THREE.SphereGeometry(0.19, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.37, 0); cap.rotation.x = -0.15;
  const limb = (w, h, d, m, x, y, tip) => {
    const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p);
    part(new THREE.BoxGeometry(w, h, d), m, 0, -h / 2, 0, p);
    if (tip) part(new THREE.BoxGeometry(w * 1.05, 0.1, d * 1.3), tip, 0, -h + 0.04, d * 0.15, p);
    return p;
  };
  return { g, legL: limb(0.18, 0.6, 0.2, pants, -0.12, 0.62, shoe), legR: limb(0.18, 0.6, 0.2, pants, 0.12, 0.62, shoe),
    armL: limb(0.13, 0.5, 0.15, shirt, -0.3, 1.14, null), armR: limb(0.13, 0.5, 0.15, shirt, 0.3, 1.14, null) };
}
const boneco = makeBoneco();

/* ---------- Mapa do lazer (menu) ---------- */
const PLANOS = { '01': 'img/plano/lazer01.jpg', '02': 'img/plano/lazer02.jpg' };
const LAZER = [
  { a: '01', nome: 'Portaria', img: 'portaria', plan: [0.06, 0.51] },
  { a: '01', nome: 'Salão infantil', img: 'salao-infantil', plan: [0.177, 0.30] },
  { a: '01', nome: 'Salão de festas', img: 'salao-festas', plan: [0.333, 0.292], room: 'salao-festas' },
  { a: '01', nome: 'Varanda gourmet', img: 'varanda-gourmet', plan: [0.418, 0.30] },
  { a: '01', nome: 'Piscina', img: 'piscina', plan: [0.565, 0.146] },
  { a: '01', nome: 'Espaço kids', img: 'espaco-kids', plan: [0.671, 0.089] },
  { a: '01', nome: 'Futmesa', img: 'futmesa', plan: [0.817, 0.049] },
  { a: '01', nome: 'Quiosque gourmet', img: 'quiosque', plan: [0.917, 0.146] },
  { a: '02', nome: 'Pista de cooper', img: 'pista-cooper', plan: [0.202, 0.603] },
  { a: '02', nome: 'Bicicletário', img: 'bicicletario', plan: [0.235, 0.838] },
  { a: '02', nome: 'Quadras de areia', img: 'quadras-areia', plan: [0.277, 0.354] },
  { a: '02', nome: 'Academia ao ar livre', img: 'academia-ar-livre', plan: [0.514, 0.049] },
  { a: '02', nome: 'Parque aventura', img: 'parque-aventura', plan: [0.507, 0.335] },
  { a: '02', nome: 'Quadra poliesportiva', img: 'quadra-poliesportiva', plan: [0.608, 0.174] },
  { a: '02', nome: 'Lavanderia', img: 'lavanderia', plan: [0.653, 0.335] },
  { a: '02', nome: 'Brinquedoteca', img: 'brinquedoteca', plan: [0.743, 0.262] },
  { a: '02', nome: 'Academia', img: 'academia', plan: [0.766, 0.403] },
  { a: '02', nome: 'Salão de jogos', img: 'salao-jogos', plan: [0.882, 0.331] }
];
function showHub(a) {
  $('hubImg').src = PLANOS[a]; $('hubImg').alt = `Render aéreo do Lazer ${a}`;
  $('hubPins').innerHTML = LAZER.map((l, i) => l.a !== a ? '' :
    `<button type="button" class="pin${l.room ? '' : ' soon'}" data-i="${i}" style="left:${l.plan[0] * 100}%;top:${l.plan[1] * 100}%" aria-label="${l.nome}${l.room ? '' : ' (3D em preparação)'}">${l.room ? '▶' : LAZER.filter((x, j) => j <= i && x.a === a).length}<span>${l.nome}${l.room ? ' · entrar em 3D' : ' · ver foto'}</span></button>`).join('');
  document.querySelectorAll('.areas button').forEach(b => b.classList.toggle('on', b.dataset.a === a));
}
$('hubPins').addEventListener('click', e => {
  const b = e.target.closest('.pin'); if (!b) return;
  const l = LAZER[+b.dataset.i];
  if (l.room && ROOMS[l.room]) enter(l); else showPhoto(l, 'Ambiente 3D em preparação');
});
document.querySelector('.areas').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showHub(b.dataset.a); });

/* ---------- Entrar / sair ---------- */
const player = { x: 0, z: 0, rot: 0, t: 0 };
const cam = { yaw: 0, pitch: 0.3, dist: 3.2, fp: false, fpPitch: 0, fov: 62 };
const keys = new Set();
const clock = new THREE.Clock();
let current = null, info = null, running = false;
function enter(item) {
  leaveRoom();
  room = new THREE.Group(); scene.add(room); obst = [];
  info = ROOMS[item.room](); current = item;
  scene.add(boneco.g);
  player.x = info.start[0]; player.z = info.start[1]; player.rot = Math.PI; cam.yaw = info.yaw; cam.pitch = 0.3; cam.fp = false; cam.dist = 3.2; cam.fov = 62;
  $('roomName').textContent = info.nome; $('vCam').textContent = '1ª pessoa';
  document.body.classList.add('in'); $('hud').hidden = false; $('help').hidden = false; resize();
  const p = camTarget(); camera.position.copy(p.pos); camera.lookAt(p.look);
  running = true; clock.getDelta();
}
function leaveRoom() {
  if (!room) return;
  room.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
  scene.remove(room, boneco.g); room = null; info = null;
}
function leave() { leaveRoom(); running = false; document.body.classList.remove('in'); $('hud').hidden = true; $('help').hidden = true; }
$('exit').addEventListener('click', leave);

function setFp(on) { cam.fp = on; cam.fov = on ? 72 : 62; $('vCam').textContent = on ? '3ª pessoa' : '1ª pessoa'; if (on) cam.fpPitch = 0; }
$('vCam').addEventListener('click', () => setFp(!cam.fp));
$('vPhoto').addEventListener('click', () => {
  const p = info.photo; player.x = p.x; player.z = p.z; player.rot = Math.PI; cam.yaw = p.yaw;
  setFp(true); cam.fpPitch = p.pitch; cam.fov = p.fov; camera.position.set(p.x, p.y, p.z);
});
$('vOrig').addEventListener('click', () => showPhoto(current, 'Foto do book · compare com o 3D'));

/* ---------- Foto original ---------- */
function showPhoto(item, note) {
  $('pImg').src = `img/lazer/${item.img}.jpg`; $('pImg').alt = item.nome;
  $('pCap').textContent = item.nome; $('pNote').textContent = note || '';
  $('photo').hidden = false; $('pClose').focus(); keys.clear();
}
const closePhoto = () => { $('photo').hidden = true; };
$('pClose').addEventListener('click', closePhoto);
$('photo').addEventListener('click', e => { if (e.target === $('photo')) closePhoto(); });

/* ---------- Entrada ---------- */
addEventListener('keydown', e => {
  if (!$('photo').hidden) { if (e.key === 'Escape') closePhoto(); return; }
  if (!running) return;
  if (e.code === 'Escape') { leave(); return; }
  if (e.code === 'KeyV') { setFp(!cam.fp); return; }
  keys.add(e.code);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
let drag = null;
cv.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  cam.yaw -= dx * (cam.fp ? 0.004 : 0.006);
  if (cam.fp) cam.fpPitch = Math.min(1.1, Math.max(-1.1, cam.fpPitch - dy * 0.004));
  else cam.pitch = Math.min(1.1, Math.max(-0.1, cam.pitch + dy * 0.005));
});
const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.min(6, Math.max(1.4, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
const joy = { x: 0, y: 0 }, stick = $('stick'), knob = stick.firstElementChild;
let joyId = null;
function joyMove(e) {
  const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width / 2;
  if (m > max) { dx *= max / m; dy *= max / m; }
  joy.x = dx / max; joy.y = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
}
stick.addEventListener('pointerdown', e => { joyId = e.pointerId; stick.setPointerCapture(e.pointerId); joyMove(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
stick.addEventListener('pointerup', joyEnd); stick.addEventListener('pointercancel', joyEnd);

/* ---------- Colisão: círculo contra caixas/círculos ---------- */
const R = 0.32;
function collide(p) {
  for (let pass = 0; pass < 3; pass++) {
    for (const o of obst) {
      if (o.r !== undefined) {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + R;
        if (d < min) { if (d > 1e-6) { p.x = o.x + dx / d * min; p.z = o.z + dz / d * min; } else p.x = o.x + min; }
        continue;
      }
      const cx = Math.max(o.x - o.hx, Math.min(p.x, o.x + o.hx)), cz = Math.max(o.z - o.hz, Math.min(p.z, o.z + o.hz));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
      else { const px = o.hx - Math.abs(p.x - o.x), pz = o.hz - Math.abs(p.z - o.z); if (px < pz) p.x += (p.x > o.x ? 1 : -1) * (px + R); else p.z += (p.z > o.z ? 1 : -1) * (pz + R); }
    }
  }
  const b = info.bounds;
  p.x = Math.min(b.x1, Math.max(b.x0, p.x)); p.z = Math.min(b.z1, Math.max(b.z0, p.z));
}

/* ---------- Câmera ---------- */
const look = new THREE.Vector3(), pos = new THREE.Vector3();
function camTarget() {
  if (cam.fp) {
    const cp = Math.cos(cam.fpPitch);
    pos.set(player.x, 1.55, player.z);
    look.set(pos.x - Math.sin(cam.yaw) * cp, pos.y + Math.sin(cam.fpPitch), pos.z - Math.cos(cam.yaw) * cp);
    return { pos, look };
  }
  look.set(player.x, 1.25, player.z);
  const cp = Math.cos(cam.pitch), b = info.bounds;
  let d = cam.dist;
  for (let i = 0; i < 14; i++) { // encurta até a câmera caber dentro do ambiente
    pos.set(look.x + Math.sin(cam.yaw) * cp * d, look.y + Math.sin(cam.pitch) * d, look.z + Math.cos(cam.yaw) * cp * d);
    if (pos.x > b.x0 && pos.x < b.x1 && pos.z > b.z0 && pos.z < b.z1 && pos.y < info.h - 0.15) break;
    d *= 0.85;
  }
  return { pos, look };
}

/* ---------- Loop ---------- */
function update(dt) {
  const ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joy.x;
  const iz = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + joy.y;
  const m = Math.min(1, Math.hypot(ix, iz));
  let moving = false;
  if (m > 0.05) {
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    let vx = rx * ix - fx * iz, vz = rz * ix - fz * iz; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2.2) * m;
    player.x += vx * sp * dt; player.z += vz * sp * dt; collide(player);
    const a = Math.atan2(vx, vz); let d = a - player.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rot += d * Math.min(1, dt * 12);
    player.t += dt * sp * 3.2; moving = true;
  }
  const sw = moving ? Math.sin(player.t) * 0.8 : 0;
  boneco.legL.rotation.x = sw; boneco.legR.rotation.x = -sw; boneco.armL.rotation.x = -sw * 0.9; boneco.armR.rotation.x = sw * 0.9;
  boneco.g.position.set(player.x, moving ? Math.abs(Math.sin(player.t)) * 0.03 : 0, player.z); boneco.g.rotation.y = player.rot;
  boneco.g.visible = !cam.fp;
  const c = camTarget();
  if (camera.fov !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  if (cam.fp) camera.position.copy(c.pos); else camera.position.lerp(c.pos, Math.min(1, dt * 12));
  camera.lookAt(c.look);
}
(function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
})();
showHub('01');
