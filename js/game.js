import * as THREE from 'three';

/* =====================================================================
   PASSEIO PELO LAZER — protótipo em 3D estilo jogo.
   Os cenários são modelados a partir dos renders e fotos do book
   (img/lazer/*.jpg): piscina, salão de festas, quadras, academia etc.
   Um boneco anda pelo cenário; ao chegar perto de um ponto, aparece a foto.
   Medidas em metros: x = leste, z = sul.
   ===================================================================== */
const $ = id => document.getElementById(id);
const W = 70, D = 42; // meio-tamanho do mundo (x, z)

/* ---------- Renderer, cena, luz ---------- */
const cv = $('cv');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); }
catch (e) { $('err').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe0f5);
scene.fog = new THREE.Fog(0xbfe0f5, 90, 220);
const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 400);
scene.add(new THREE.HemisphereLight(0xf4f8ff, 0xb9b49c, 1.9));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- Materiais e peças ---------- */
const mats = {};
const M = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })); };
const WHITE = 0xf4f4f2, WOOD = 0x8a5a36, DARK = 0x2b323c, GRASS = 0x86b266, PAVE = 0xd8c7a8, TERRA = 0xb5613c, LIME = 0xb5d334;
const rnd = s => { const x = Math.sin(s * 999.13) * 10000; return x - Math.floor(x); };

let area = null, obst = [], pois = [], markers = [];
const col = c => (typeof c === 'number' ? M(c) : c);
function put(m, cast = true) { m.castShadow = cast; m.receiveShadow = true; area.add(m); return m; }
function box(x, z, w, d, h, c, y = 0, solid = false) {
  const m = put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), col(c)));
  m.position.set(x, y + h / 2, z);
  if (solid) obst.push({ x, z, hx: w / 2, hz: d / 2 });
  return m;
}
function flat(x, z, w, d, c, y = 0.02) { // piso: não projeta sombra
  const m = put(new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), col(c)), false);
  m.position.set(x, y - 0.02, z); return m; // y = altura da superfície
}
function disc(x, z, r, c, y = 0.03) {
  const m = put(new THREE.Mesh(new THREE.CircleGeometry(r, 36), col(c)), false);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m;
}
function ring(x, z, r0, r1, c, y = 0.04) {
  const m = put(new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48), col(c)), false);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m;
}
function cyl(x, z, r, h, c, y = 0, seg = 10, solid = false) {
  const m = put(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), col(c)));
  m.position.set(x, y + h / 2, z);
  if (solid) obst.push({ x, z, hx: r, hz: r });
  return m;
}
function cone(x, z, r, h, c, y, seg = 12) {
  const m = put(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), col(c)));
  m.position.set(x, y + h / 2, z); return m;
}
function tree(x, z, s = 1) {
  cyl(x, z, 0.25 * s, 3 * s, 0x6b4a2f, 0, 6);
  const c = new THREE.Color().setHSL(0.27 + rnd(x * 3 + z) * 0.06, 0.42, 0.32 + rnd(z + x) * 0.1);
  const a = put(new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 * s, 1), new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })));
  a.position.set(x, 4.2 * s, z);
  const b = a.clone(); b.scale.setScalar(0.62); b.position.set(x + 1.2 * s, 5.4 * s, z - 0.8 * s); area.add(b);
  obst.push({ x, z, hx: 0.5, hz: 0.5 });
}
function palm(x, z) {
  cyl(x, z, 0.22, 6.5, 0x8a7556, 0, 6, true);
  const fr = new THREE.BoxGeometry(3.4, 0.08, 0.8); fr.translate(1.7, 0, 0);
  for (let k = 0; k < 8; k++) {
    const f = put(new THREE.Mesh(fr, M(0x4f8f3a)), false);
    f.position.set(x, 6.5, z); f.rotation.set(0, k * Math.PI / 4 + x, -0.35 - (k % 2) * 0.25, 'YXZ');
  }
}
function car(x, z, rot, c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
  const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8), M(c, { roughness: 0.35, metalness: 0.3 })); b.position.y = 0.65;
  const t = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 1.55), M(0x55616d, { roughness: 0.2 })); t.position.set(-0.2, 1.25, 0);
  b.castShadow = t.castShadow = true; g.add(b, t); area.add(g);
  obst.push({ x, z, hx: Math.abs(Math.cos(rot)) * 2.1 + Math.abs(Math.sin(rot)) * 0.9, hz: Math.abs(Math.sin(rot)) * 2.1 + Math.abs(Math.cos(rot)) * 0.9 });
}
function glass(x, z, w, h, ry, y = 0.5) {
  const m = put(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffd98a, emissiveIntensity: 0.55, roughness: 0.2 })), false);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry; return m;
}
function pavilion(x, z, w, d, h, roof = WHITE, post = WOOD) {
  box(x, z, w + 1.6, d + 1.6, 0.35, roof, h);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(x + dx * w / 2, z + dz * d / 2, 0.18, h, post, 0, 8, true);
}
function pool(x, z, w, d, c = 0x2fb4d8) {
  const e = 0.35;
  for (const [px, pz, pw, pd] of [[x, z - d / 2 - e / 2, w + e * 2, e], [x, z + d / 2 + e / 2, w + e * 2, e], [x - w / 2 - e / 2, z, e, d], [x + w / 2 + e / 2, z, e, d]]) box(px, pz, pw, pd, 0.3, 0xefeee9, 0);
  const wtr = put(new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.12, metalness: 0.15, emissive: c, emissiveIntensity: 0.18 })), false);
  wtr.position.set(x, 0.12, z);
  obst.push({ x, z, hx: w / 2 + e, hz: d / 2 + e });
}
function lounger(x, z) { box(x, z, 0.9, 2, 0.4, WHITE, 0.05, true); }
function umbrella(x, z, c) { cyl(x, z, 0.06, 2.6, 0x59626c, 0, 6); cone(x, z, 1.8, 0.6, c, 2.5, 14); }
function net(x, z, w, ry) { // rede + postes
  const m = put(new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), new THREE.MeshBasicMaterial({ color: 0x1b2430, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })), false);
  m.position.set(x, 1.85, z); m.rotation.y = ry;
  const dx = Math.cos(ry) * w / 2, dz = -Math.sin(ry) * w / 2;
  cyl(x - dx, z - dz, 0.07, 2.4, 0x59626c, 0, 6); cyl(x + dx, z + dz, 0.07, 2.4, 0x59626c, 0, 6);
}
function fenceLine(x0, z0, x1, z1, h = 3) { // alambrado: tela translúcida + obstáculo
  const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const m = put(new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshBasicMaterial({ color: 0x7d8a96, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })), false);
  m.position.set(mx, h / 2, mz); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  const n = Math.max(1, Math.round(len / 5));
  for (let i = 0; i <= n; i++) cyl(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, 0.07, h, 0x59626c, 0, 6);
  const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  obst.push({ x: mx, z: mz, hx: horiz ? len / 2 : 0.15, hz: horiz ? 0.15 : len / 2 });
}
function ribbon(points, w, c, y = 0.05) { // pista de cooper
  const cu = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])), true), N = 240, pos = [], idx = [];
  for (let i = 0; i < N; i++) {
    const p = cu.getPointAt(i / N), t = cu.getTangentAt(i / N), nx = -t.z, nz = t.x;
    pos.push(p.x + nx * w / 2, y, p.z + nz * w / 2, p.x - nx * w / 2, y, p.z - nz * w / 2);
    const a = i * 2, b = ((i + 1) % N) * 2; idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = put(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })), false);
  return cu;
}

/* ---------- Cenário Lazer 01 (render aéreo: portaria, salão de festas, piscina, parque) ---------- */
function build01() {
  flat(0, 22, 140, 40, PAVE, 0.02);                                   // plaza / estacionamento
  disc(-52, 24, 8, 0xc9a58c, 0.04); disc(-52, 24, 5.6, GRASS, 0.06);  // rotatória
    flat(-30, 10, 32, 5, 0xcfc0a2, 0.04);                                // calçada do salão
  for (let i = 0; i <= 14; i++) flat(-8 + i * 4, 21, 0.16, 5.6, WHITE, 0.05); // vagas
  [[-4, 0x1d2b3f], [4, 0xe9eaec], [12, 0xa3231c], [20, 0x3c4149], [28, 0xc9ced4], [36, 0x2f5f8f]].forEach(([x, c], i) => car(x, 20.8, Math.PI / 2 + (i % 2) * 0.02, c));
  // portaria
  box(-56, 8, 16, 0.5, 0.45, WHITE, 4.3);                              // marquise
  cyl(-63, 8, 0.25, 4.3, WHITE, 0, 8, true); cyl(-49, 8, 0.25, 4.3, WHITE, 0, 8, true);
  box(-56, 4, 5, 5, 3.4, 0x8794a3, 0, true); glass(-56, 6.52, 4, 2, 0, 0.6); // guarita
  box(-56, 8, 3, 0.3, 5, WOOD, 0, true);                               // pilar com a marca
  for (const x of [-61.5, -50.5]) box(x, 8, 4, 0.12, 2.2, 0x2b323c, 0, false);
  // salão infantil e salão de festas
  box(-48, -6, 9, 10, 3.6, 0xdcdcda, 0, true); box(-48, -6, 10, 11, 0.4, WHITE, 3.6); glass(-48, -0.95, 7, 2, 0, 0.5);
  box(-28, -8, 30, 14, 4.2, 0x8794a3, 0, true); box(-28, -8, 31.4, 15.4, 0.45, WHITE, 4.2); glass(-28, -0.95, 24, 2.4, 0, 0.5);
  box(-28, -10, 9, 7, 0.12, 0x1d3557, 4.65);                           // placas solares
  // varanda gourmet
  pavilion(-4, -6, 12, 5, 3.4); box(-4, -7.6, 10, 1, 1, WOOD, 0, true);
  // deck da piscina
  flat(14, -22, 46, 28, 0xe6dfd0, 0.03);
  pool(14, -26, 24, 9); pool(32, -17, 8, 6, 0x6fd3e6);
  for (let i = 0; i < 6; i++) lounger(5 + i * 3.8, -19.5);
  umbrella(8, -33, 0x2a7fb8); umbrella(20, -33, WHITE); umbrella(32, -29, 0x2a7fb8); umbrella(6, -17, WHITE);
  palm(-6, -26); palm(-6, -16); palm(36, -26); palm(36, -34); palm(0, -36);
  // parque infantil + pista infantil
  disc(50, -26, 9, 0x8fc46a, 0.03); ring(50, -26, 10.2, 12, 0xb8382c, 0.05);
  box(50, -26, 2.4, 2.4, 2.4, 0xf6d24a, 0, true); cone(50, -26, 2.2, 1.5, 0xe05a5a, 2.4, 4).rotation.y = Math.PI / 4;
  const sl = box(53, -26, 3.6, 0.8, 0.15, 0x4aa3df, 1.0); sl.rotation.z = -0.5;
  cyl(46, -22, 0.08, 2.4, 0xe58a2e); cyl(49, -22, 0.08, 2.4, 0xe58a2e); box(47.5, -22, 3, 0.1, 0.1, 0xe58a2e, 2.4);
  // pergolado + futmesa + quiosque
  for (let i = 0; i < 6; i++) cyl(38 + (i % 2) * 6, -8 + Math.floor(i / 2) * 5, 0.14, 2.7, WOOD, 0, 8, true);
  for (let i = 0; i < 9; i++) box(41, -8 + i * 1.3, 8, 0.2, 0.18, WOOD, 2.7);
  box(60, -16, 3.2, 1.6, 0.9, 0xbdbcb8, 0, true);
  box(60, -14.6, 0.1, 0.1, 1.2, 0x2f6f73, 0); box(56, -16, 0.1, 5, 1, WOOD, 0);
  for (const [x, z] of [[58, -36], [62, -36], [58, -32], [62, -32]]) cyl(x, z, 0.16, 2.8, WOOD, 0, 8, true);
  cone(60, -34, 4.6, 1.8, TERRA, 2.8, 4).rotation.y = Math.PI / 4;
  box(60, -35.5, 3.4, 0.8, 1, 0xdcdcda, 0, true);
  // casas técnicas, árvores
  box(30, -37, 14, 6, 3, 0xdcdcda, 0, true); box(-62, -30, 8, 8, 2.6, 0xbdbcb8, 0, true);
  [[-64, -10], [-66, 4], [-62, -22], [-40, -24], [-20, -28], [-12, -36], [66, -4], [66, 8], [66, -20], [68, -36], [44, -38], [24, -12], [-30, 14], [-12, 12], [46, 14], [64, 18], [64, 32], [-66, 36], [-30, 38], [10, 38]].forEach(([x, z], i) => tree(x, z, 0.9 + rnd(i) * 0.5));
  boundary();
}

/* ---------- Cenário Lazer 02 (quadras, pista, parque, academia) ---------- */
function build02() {
  flat(0, 0, 140, 84, 0xdcb48f, 0.02);                                // praça colorida
  // quadras de areia (beach tennis)
  flat(-41, -14, 38, 36, 0xeadfc3, 0.04);
  for (const z of [-22, -6]) { flat(-41, z, 32, 12, 0xeadfc3, 0.05); net(-41, z, 12, Math.PI / 2 + 0.0); }
  for (const z of [-22, -6]) { const l = [[-57, z - 6, -25, z - 6], [-57, z + 6, -25, z + 6]]; l.forEach(([a, b, c, d]) => flat((a + c) / 2, (b + d) / 2, 32, 0.15, WHITE, 0.06)); }
  fenceLine(-60.5, -32, -60.5, 4); fenceLine(-60.5, -32, -22, -32); fenceLine(-22, -32, -22, -26); fenceLine(-22, -2, -22, 4);
  box(-41, -14, 0.2, 0.2, 0.2, 0xeadfc3, 0, false);
  // quadra poliesportiva
  flat(30, -30, 34, 20, 0x2c6c70, 0.04); flat(30, -30, 28, 14, 0xd8437f, 0.06);
  flat(30, -30, 0.2, 14, WHITE, 0.07); ring(30, -30, 2.2, 2.4, WHITE, 0.08);
  box(15.2, -30, 0.2, 5, 0.3, WHITE, 0, false); box(44.8, -30, 0.2, 5, 0.3, WHITE, 0, false);
  fenceLine(13, -40, 47, -40); fenceLine(13, -40, 13, -22); fenceLine(47, -40, 47, -22); fenceLine(13, -22, 21, -22); fenceLine(39, -22, 47, -22);
  // academia (prédio escuro com detalhes verde-limão): lavanderia, brinquedoteca, academia e salão de jogos
  box(48, 3, 30, 14, 4.4, 0x3a3f45, 0, true); box(48, 3, 31.6, 15.6, 0.5, WHITE, 4.4);
  box(48, 10.08, 28, 0.12, 0.4, LIME, 3.2);
  for (let i = 0; i < 4; i++) { glass(38 + i * 7, 10.15, 5, 2.6, 0, 0.5); box(38 + i * 7, 10.2, 5.4, 0.1, 0.14, LIME, 3.1); }
  box(48, 14.2, 31, 3.2, 0.18, 0xc9a06f, 0, false);                   // deck fitness
  // parque aventura
  disc(-2, -14, 9, 0x8fc46a, 0.03);
  box(-2, -14, 3, 3, 0.25, 0xe9b04a, 2.4); for (const [x, z] of [[-3.3, -15.3], [-0.7, -15.3], [-3.3, -12.7], [-0.7, -12.7]]) cyl(x, z, 0.12, 2.5, WOOD, 0, 6, true);
  box(-6, -14, 2.4, 2.4, 2, 0xe9d34a, 0, true); cone(-6, -14, 1.9, 1.2, 0xb56acf, 2, 4).rotation.y = Math.PI / 4;
  const sl = box(2.6, -14, 3.6, 0.8, 0.15, 0x4aa3df, 0.9); sl.rotation.z = -0.5;
  // academia ao ar livre
  for (let i = 0; i < 3; i++) { cyl(11 + i * 4, -12, 0.1, 2.4, 0x59626c, 0, 6, true); box(11 + i * 4, -12, 0.12, 2.4, 0.12, 0x59626c, 0).position.y = 2.4; }
  // praça do esporte (círculos coloridos)
  disc(-14, 22, 9, 0xe9a3bd, 0.04); disc(-14, 22, 5.8, 0xdcb48f, 0.05); disc(-14, 22, 2.8, GRASS, 0.06);
  disc(2, 28, 6, 0xf2c14e, 0.04); disc(2, 28, 3.6, 0xe9a3bd, 0.05); disc(-28, 30, 5, 0xe9a3bd, 0.04);
  for (let i = 0; i < 6; i++) box(-14 + Math.cos(i * 1.05) * 4.4, 22 + Math.sin(i * 1.05) * 4.4, 1.8, 0.6, 0.45, 0xe58a2e, 0, true);
  palm(-14, 22);
  // bicicletário
  for (let i = 0; i < 4; i++) box(-48 + i * 2.8, 18, 2.2, 1.1, 0.7, 0xdd9a3c, 0, true);
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 16), M(0x2b323c)); w.position.set(-47 + i * 2.8, 0.45, 20); put(w, false); const w2 = w.clone(); w2.position.x += 1.1; area.add(w2); }
  // quiosques
  box(0, -33, 7, 5, 3.4, 0xdcdcda, 0, true); box(0, -33, 8, 6, 0.4, WHITE, 3.4);
  box(9, -33, 5, 4, 3, 0xdcdcda, 0, true); box(9, -33, 6, 5, 0.4, WHITE, 3);
  // pista de cooper
  ribbon([[-66, -34], [-18, -36], [-10, -8], [8, 6], [30, 18], [-4, 36], [-52, 36], [-66, 10]], 4, 0xb8382c);
  [[-66, 20], [-30, 40], [10, 40], [66, 30], [66, 14], [64, -36], [-4, -38], [-68, -38], [22, -2], [-30, 38]].forEach(([x, z], i) => tree(x, z, 0.9 + rnd(i + 7) * 0.5));
  palm(-57, 12); palm(-24, 6); palm(12, 0); palm(70, -10);
  boundary();
}
function boundary() { // muro baixo
  const t = 0.4, h = 1.6;
  box(0, -D, W * 2, t, h, WHITE, 0); box(0, D, W * 2, t, h, WHITE, 0);
  box(-W, 0, t, D * 2, h, WHITE, 0); box(W, 0, t, D * 2, h, WHITE, 0);
}

/* ---------- Pontos de interesse (fotos do book) ---------- */
const AREAS = {
  '01': {
    nome: 'Lazer 01', start: [-56, 17], build: build01,
    pois: [
      { nome: 'Portaria', img: 'portaria', pos: [-56, 8], go: [-56, 14] },
      { nome: 'Salão infantil', img: 'salao-infantil', pos: [-48, -1], go: [-48, 6] },
      { nome: 'Salão de festas', img: 'salao-festas', pos: [-28, -1], go: [-28, 6] },
      { nome: 'Varanda gourmet', img: 'varanda-gourmet', pos: [-4, -4], go: [-4, 2] },
      { nome: 'Piscina', img: 'piscina', pos: [14, -22], go: [14, -15] },
      { nome: 'Espaço kids', img: 'espaco-kids', pos: [50, -26], go: [50, -19] },
      { nome: 'Futmesa', img: 'futmesa', pos: [60, -16], go: [60, -10] },
      { nome: 'Quiosque gourmet', img: 'quiosque', pos: [60, -34], go: [54, -30] }
    ]
  },
  '02': {
    nome: 'Lazer 02', start: [-30, 14], build: build02,
    pois: [
      { nome: 'Pista de cooper', img: 'pista-cooper', pos: [-52, 36], go: [-52, 31] },
      { nome: 'Bicicletário', img: 'bicicletario', pos: [-44, 18], go: [-44, 12] },
      { nome: 'Quadras de areia', img: 'quadras-areia', pos: [-41, 0], go: [-41, 8] },
      { nome: 'Academia ao ar livre', img: 'academia-ar-livre', pos: [15, -12], go: [15, -6] },
      { nome: 'Parque aventura', img: 'parque-aventura', pos: [-2, -12], go: [-2, -5] },
      { nome: 'Quadra poliesportiva', img: 'quadra-poliesportiva', pos: [30, -24], go: [30, -18] },
      { nome: 'Lavanderia', img: 'lavanderia', pos: [38, 10], go: [38, 17] },
      { nome: 'Brinquedoteca', img: 'brinquedoteca', pos: [45, 10], go: [45, 17] },
      { nome: 'Academia', img: 'academia', pos: [52, 10], go: [52, 17] },
      { nome: 'Salão de jogos', img: 'salao-jogos', pos: [59, 10], go: [59, 17] }
    ]
  }
};

function numSprite(n) {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#f2c94c'; x.beginPath(); x.arc(48, 48, 44, 0, 7); x.fill();
  x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#14233a'; x.font = 'bold 52px system-ui,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 48, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
}

/* ---------- Boneco ---------- */
function makeBoneco() {
  const g = new THREE.Group();
  const skin = M(0xf0c09a), shirt = M(0x3f6fb5), pants = M(0xe8e4da), shoe = M(0x2b323c), hair = M(0x3b2a20);
  const part = (geo, m, x, y, z, parent = g) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; parent.add(k); return k; };
  part(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt, 0, 1.18, 0);
  part(new THREE.SphereGeometry(0.24, 16, 12), skin, 0, 1.78, 0);
  const cap = part(new THREE.SphereGeometry(0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.82, 0);
  cap.rotation.x = -0.15;
  const limb = (w, h, d, m, x, y, tip) => {
    const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p);
    part(new THREE.BoxGeometry(w, h, d), m, 0, -h / 2, 0, p);
    if (tip) part(new THREE.BoxGeometry(w * 1.05, 0.14, d * 1.3), tip, 0, -h + 0.05, d * 0.15, p);
    return p;
  };
  return {
    g,
    legL: limb(0.24, 0.8, 0.26, pants, -0.16, 0.82, shoe), legR: limb(0.24, 0.8, 0.26, pants, 0.16, 0.82, shoe),
    armL: limb(0.18, 0.66, 0.2, shirt, -0.4, 1.5, null), armR: limb(0.18, 0.66, 0.2, shirt, 0.4, 1.5, null)
  };
}
const boneco = makeBoneco(); scene.add(boneco.g);
const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M(0x9bc46f)); far.rotation.x = -Math.PI / 2; far.position.y = -0.02; far.receiveShadow = true; scene.add(far);

/* ---------- Troca de cenário ---------- */
const player = { x: 0, z: 0, rot: 0, t: 0 };
let current = null;
function loadArea(id) {
  if (area) { area.traverse(o => { if (o.geometry) o.geometry.dispose(); }); scene.remove(area); }
  area = new THREE.Group(); scene.add(area);
  obst = []; markers = [];
  const A = AREAS[id]; current = id;
  A.build();
  A.pois.forEach((p, i) => {
    const s = numSprite(i + 1); s.scale.set(1.9, 1.9, 1); s.position.set(p.pos[0], 4.2, p.pos[1]); s.renderOrder = 10; area.add(s);
    const r = put(new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 32), new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.75 })), false);
    r.rotation.x = -Math.PI / 2; r.position.set(p.pos[0], 0.09, p.pos[1]);
    markers.push({ s, r, i });
  });
  pois = A.pois;
  player.x = A.start[0]; player.z = A.start[1]; player.rot = Math.PI; cam.yaw = 0; cam.pitch = 0.42;
  renderList();
  document.querySelectorAll('.areas button').forEach(b => b.classList.toggle('on', b.dataset.a === id));
}

/* ---------- Entrada ---------- */
const keys = new Set();
const cam = { yaw: 0, pitch: 0.42, dist: 10 };
addEventListener('keydown', e => {
  if (!$('photo').hidden) {
    if (e.key === 'Escape') closePhoto(); else if (e.key === 'ArrowLeft') stepPhoto(-1); else if (e.key === 'ArrowRight') stepPhoto(1);
    return;
  }
  keys.add(e.code);
  if (e.code === 'KeyE' || e.code === 'Enter') interact();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
let drag = null;
cv.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  cam.yaw -= (e.clientX - drag.x) * 0.006;
  cam.pitch = Math.min(1.2, Math.max(0.12, cam.pitch + (e.clientY - drag.y) * 0.005));
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.min(22, Math.max(4, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });

const joy = { x: 0, y: 0 }, stick = $('stick'), knob = stick.firstElementChild;
let joyId = null;
function joyMove(e) {
  const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width / 2;
  if (m > max) { dx *= max / m; dy *= max / m; }
  joy.x = dx / max; joy.y = dy / max;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
}
stick.addEventListener('pointerdown', e => { joyId = e.pointerId; stick.setPointerCapture(e.pointerId); joyMove(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
stick.addEventListener('pointerup', joyEnd); stick.addEventListener('pointercancel', joyEnd);

/* ---------- Fotos ---------- */
let pi = 0;
function showPhoto() {
  const p = pois[pi];
  $('pImg').src = `img/lazer/${p.img}.jpg`; $('pImg').alt = p.nome;
  $('pCap').textContent = `${pi + 1}. ${p.nome}`; $('pCount').textContent = `${pi + 1} / ${pois.length}`;
}
function openPhoto(i) { pi = i; showPhoto(); $('photo').hidden = false; $('pClose').focus(); keys.clear(); }
function closePhoto() { $('photo').hidden = true; cv.focus(); }
function stepPhoto(d) { pi = (pi + d + pois.length) % pois.length; showPhoto(); }
$('pClose').addEventListener('click', closePhoto);
$('pPrev').addEventListener('click', () => stepPhoto(-1));
$('pNext').addEventListener('click', () => stepPhoto(1));
$('photo').addEventListener('click', e => { if (e.target === $('photo')) closePhoto(); });

/* ---------- Lista de pontos e troca de área ---------- */
function renderList() {
  $('list').innerHTML = pois.map((p, i) => `<button type="button" data-i="${i}"><i>${i + 1}</i>${p.nome}</button>`).join('');
}
$('list').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const p = pois[+b.dataset.i];
  player.x = p.go[0]; player.z = p.go[1];
  const dx = p.pos[0] - p.go[0], dz = p.pos[1] - p.go[1];
  player.rot = Math.atan2(dx, dz); cam.yaw = Math.atan2(-dx, -dz);
  collide(player);
});
document.querySelector('.areas').addEventListener('click', e => { const b = e.target.closest('button'); if (b) loadArea(b.dataset.a); });
let near = -1;
function interact() { if (near >= 0) openPhoto(near); }
$('prompt').addEventListener('click', interact);

/* ---------- Física simples (círculo contra caixas) ---------- */
const R = 0.5;
function collide(p) {
  for (let pass = 0; pass < 2; pass++) {
    for (const o of obst) {
      const cx = Math.max(o.x - o.hx, Math.min(p.x, o.x + o.hx)), cz = Math.max(o.z - o.hz, Math.min(p.z, o.z + o.hz));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
      else {
        const px = o.hx - Math.abs(p.x - o.x), pz = o.hz - Math.abs(p.z - o.z);
        if (px < pz) p.x += (p.x > o.x ? 1 : -1) * (px + R); else p.z += (p.z > o.z ? 1 : -1) * (pz + R);
      }
    }
  }
  p.x = Math.min(W - 1, Math.max(-W + 1, p.x)); p.z = Math.min(D - 1, Math.max(-D + 1, p.z));
}

/* ---------- Minimapa ---------- */
const mini = $('mini'), mx = mini.getContext('2d');
function drawMini() {
  const w = mini.width, h = mini.height, k = Math.min((w - 8) / (W * 2), (h - 8) / (D * 2)), ox = w / 2, oy = h / 2;
  mx.clearRect(0, 0, w, h);
  mx.fillStyle = 'rgba(255,255,255,.22)';
  for (const o of obst) if (o.hx > 1.5 || o.hz > 1.5) mx.fillRect(ox + (o.x - o.hx) * k, oy + (o.z - o.hz) * k, o.hx * 2 * k, o.hz * 2 * k);
  pois.forEach((p, i) => {
    mx.fillStyle = i === near ? '#fff' : '#f2c94c'; mx.beginPath(); mx.arc(ox + p.pos[0] * k, oy + p.pos[1] * k, 5, 0, 7); mx.fill();
    mx.fillStyle = '#14233a'; mx.font = 'bold 8px system-ui'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText(i + 1, ox + p.pos[0] * k, oy + p.pos[1] * k + 0.5);
  });
  mx.save(); mx.translate(ox + player.x * k, oy + player.z * k); mx.rotate(-player.rot + Math.PI);
  mx.fillStyle = '#3ec878'; mx.beginPath(); mx.moveTo(0, -6); mx.lineTo(4.5, 5); mx.lineTo(-4.5, 5); mx.closePath(); mx.fill(); mx.strokeStyle = '#fff'; mx.lineWidth = 1.2; mx.stroke(); mx.restore();
}

/* ---------- Loop ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), tgt = new THREE.Vector3(), want = new THREE.Vector3();
function update(dt, t) {
  const frozen = !$('photo').hidden;
  let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joy.x;
  let iz = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + joy.y;
  if (frozen) ix = iz = 0;
  const m = Math.min(1, Math.hypot(ix, iz));
  let moving = false;
  if (m > 0.05) {
    // frente = para onde a câmera olha
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    let vx = rx * ix + fx * -iz, vz = rz * ix + fz * -iz; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 10 : 5.5) * m;
    player.x += vx * sp * dt; player.z += vz * sp * dt; collide(player);
    const a = Math.atan2(vx, vz); let d = a - player.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rot += d * Math.min(1, dt * 12);
    player.t += dt * sp * 1.6; moving = true;
  }
  const sw = moving ? Math.sin(player.t) * 0.85 : 0;
  boneco.legL.rotation.x = sw; boneco.legR.rotation.x = -sw; boneco.armL.rotation.x = -sw * 0.9; boneco.armR.rotation.x = sw * 0.9;
  boneco.g.position.set(player.x, moving ? Math.abs(Math.sin(player.t)) * 0.06 : 0, player.z); boneco.g.rotation.y = player.rot;

  // câmera em terceira pessoa
  tgt.set(player.x, 1.5, player.z);
  const cp = Math.cos(cam.pitch);
  want.set(tgt.x + Math.sin(cam.yaw) * cp * cam.dist, tgt.y + Math.sin(cam.pitch) * cam.dist, tgt.z + Math.cos(cam.yaw) * cp * cam.dist);
  camera.position.lerp(want, Math.min(1, dt * 10)); camera.lookAt(tgt);
  sun.position.set(player.x - 30, 55, player.z + 24); sun.target.position.set(player.x, 0, player.z);

  // marcadores e proximidade
  near = -1; let best = 64; // 8 m
  markers.forEach(mk => {
    mk.s.position.y = 4.2 + Math.sin(t * 2 + mk.i) * 0.25;
    const sc = 1 + 0.08 * Math.sin(t * 3 + mk.i); mk.r.scale.set(sc, sc, sc);
    const p = pois[mk.i], d2 = (p.pos[0] - player.x) ** 2 + (p.pos[1] - player.z) ** 2;
    if (d2 < best) { best = d2; near = mk.i; }
  });
  const pr = $('prompt');
  if (near >= 0 && !frozen) { pr.hidden = false; pr.innerHTML = `<kbd>E</kbd>Ver foto · ${pois[near].nome}`; } else pr.hidden = true;
  document.querySelectorAll('#list button').forEach((b, i) => b.classList.toggle('near', i === near));
}
loadArea('01');
camera.position.set(player.x, 6, player.z + 10);
(function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt, clock.elapsedTime);
  drawMini();
  renderer.render(scene, camera);
})();
