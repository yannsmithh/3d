import * as THREE from 'three';
import { ctx, T, M, TM, COL, GLASS, BASIC, box, cyl, sph, cone, plane, floorPlane, solid, disc, ring, wall, plant, meshChair, roundTable, table,
  stool, counter, ribbon, lights, rnd, canvasTex } from './kit.js';

/* =====================================================================
   AMBIENTES EXTERNOS — recriados a partir das fotos do book.
   ===================================================================== */
const SKY = 0x9fd0f0;
function yard(groundTex, bg = SKY, size = 160) {
  floorPlane(size, size, groundTex, 0, 0, -0.01);
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(110, 110, 90, 24, 1, true), new THREE.MeshBasicMaterial({ map: T.ceu(), side: THREE.BackSide, fog: false }));
  sky.position.y = 28; sky.userData.keep = true; ctx.room.add(sky);
  return bg;
}
const facade = cached => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7c8190'; g.fillRect(0, 0, w, h); for (let y = 14; y < h - 10; y += 40) for (let x = 12; x < w - 10; x += 36) { g.fillStyle = rnd(x + y * 3) > .4 ? '#2d3340' : '#aeb9c8'; g.fillRect(x, y, 20, 26); } });
function blocks(z, n = 3, w = 14, h = 16, spread = 22) { const f = facade(); for (let i = 0; i < n; i++) { const t = f.clone(); t.needsUpdate = true; t.repeat.set(w / 6, h / 6); const x = (i - (n - 1) / 2) * spread; box(x, z - i % 2 * 4, w, 8, h, TM(t, { roughness: 0.9 }), 0); } }
export function tree(x, z, s = 1, solidTrunk = true) {
  cyl(x, z, 0.25 * s, 3 * s, 0x6b4a2f, 0, { seg: 6 });
  const c = [0x4d8a3a, 0x5a9a44, 0x437a35][Math.floor(rnd(x * 3 + z) * 3)];
  sph(x, 4.2 * s, z, 2.3 * s, c, { seg: 8 }); sph(x + 1.2 * s, 5.4 * s, z - 0.8 * s, 1.5 * s, c, { seg: 8 });
  if (solidTrunk) solid(x, z, 0.5, 0.5);
}
export function palm(x, z, h = 6.5) {
  cyl(x, z, 0.22, h, 0x8a7556, 0, { seg: 6 }); solid(x, z, 0.4, 0.4);
  for (let k = 0; k < 7; k++) { const f = box(x + Math.cos(k * 0.9) * 1.5, z + Math.sin(k * 0.9) * 1.5, 3.2, 0.08, 0.7, 0x4f8f3a, h, { cast: false, ry: -k * 0.9, rz: -0.35 }); f.position.y = h; }
}
function fence(x0, z0, x1, z1, h = 3) {
  const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshBasicMaterial({ color: 0x7d8a96, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); m.position.set(mx, h / 2, mz); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); ctx.room.add(m);
  const n = Math.max(1, Math.round(len / 4)); for (let i = 0; i <= n; i++) cyl(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, 0.06, h, 0x59626c, 0, { seg: 5 });
  const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0); solid(mx, mz, horiz ? len / 2 : 0.15, horiz ? 0.15 : len / 2);
}
function pole(x, z, h = 9) { cyl(x, z, 0.12, h, 0x59626c, 0, { seg: 6 }); box(x, z, 1.2, 0.5, 0.3, 0x59626c, h); box(x, z, 1.0, 0.4, 0.05, BASIC(0xfff4d0), h - 0.05, { cast: false }); }
function cones(list) { for (const [x, z] of list) cone(x, z, 0.2, 0.5, 0xf08a2a, 0, 10); }
function carBox(x, z, ry, c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8), M(c, { roughness: 0.35, metalness: 0.3 })); b.position.y = 0.65; const t = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 1.55), M(0x55616d)); t.position.set(-0.2, 1.25, 0);
  b.castShadow = t.castShadow = true; g.add(b, t);
  for (const sx of [-1.3, 1.3]) for (const sz of [-0.85, 0.85]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 10), M(0x16171a)); w.rotation.x = Math.PI / 2; w.position.set(sx, 0.33, sz); g.add(w); }
  solid(x, z, Math.abs(Math.cos(ry)) * 2.1 + Math.abs(Math.sin(ry)) * 0.9, Math.abs(Math.sin(ry)) * 2.1 + Math.abs(Math.cos(ry)) * 0.9);
}
function bike(x, z, ry, c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.room.add(g);
  for (const dx of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 14), M(0x1a1b1e)); w.rotation.y = Math.PI / 2; w.position.set(0, 0.36, dx); g.add(w); }
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.0), M(c)); f.position.set(0, 0.62, 0); f.rotation.x = 0.1; g.add(f);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), M(c)); f2.position.set(0, 0.5, 0.2); g.add(f2);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), M(0x1a1b1e)); h.position.set(0, 0.95, 0.55); g.add(h);
}
const inBounds = (x0, x1, z0, z1, bg = SKY, extra = {}) => ({ bounds: { x0, x1, z0, z1 }, h: 40, bg, fog: [60, 150], ...extra });
const walk = (...pts) => pts;

/* ---------- PORTARIA ---------- */
export function portaria() {
  const bg = yard(TM(T.grama(60, 60)), 0x8fb4e0);
  floorPlane(60, 14, TM(T.asfalto(12, 3)), 0, 15); floorPlane(60, 7, TM(T.paver(30, 3.5)), 0, 4.5, 0.02);
  const blue = M(0x4f6d9c, { roughness: 0.85 }), wood = M(0xc27a42, { roughness: 0.7 });
  for (const x of [-14, -6, 2.4, 14]) cyl(x, -2, 0.3, 4.6, COL.WHITE, 0, { seg: 8, solid: true });
  box(0, -2, 30, 6, 0.6, blue, 4.6, {}); box(0, -2, 30, 5.2, 0.35, M(0xf0c36a), 4.45, { cast: false });
  box(-3.5, -2.6, 3.6, 3.4, 4.6, M(0x3b4d6b), 0, { solid: true }); plane(3.2, 2.6, new THREE.MeshStandardMaterial({ color: 0x9fd0ea, emissive: 0x3a6a8a, emissiveIntensity: 0.4, roughness: 0.1 }), -3.5, 2.4, -0.88);
  box(-1.2, -2, 2.2, 1.0, 4.6, wood, 0, { solid: true }); plane(1.6, 0.8, new THREE.MeshBasicMaterial({ map: T.sign('LIFE', '#c27a42', '#f4f0e6', 256, 128) }), -1.2, 1.8, -1.49);
  for (let i = 0; i < 34; i++) box(3.4 + i * 0.32, -2, 0.05, 0.05, 2.3, 0x1a1b1e, 0); box(8.4, -2, 10.8, 0.06, 0.06, 0x1a1b1e, 2.3); box(8.4, -2, 10.8, 0.06, 0.06, 0x1a1b1e, 0.1); solid(8.4, -2, 5.4, 0.2);
  for (let i = 0; i < 24; i++) box(-13.6 + i * 0.32, -2, 0.05, 0.05, 2.3, 0x1a1b1e, 0); box(-10, -2, 7.7, 0.06, 0.06, 0x1a1b1e, 2.3); solid(-10, -2, 3.9, 0.2);
  for (const [x, z] of [[-12, 1.2], [14, 1.2]]) { sph(x, 0.5, z, 0.9, 0x3f7a3a, { sy: 0.7 }); }
  palm(-17, 2); palm(18, 3); palm(-18, 9); palm(19, 10);
  blocks(-24, 3, 14, 18, 20); for (const z of [-12]) fence(-30, z, 30, z, 2.4);
  carBox(-9, 8.5, 0.12, 0xeceef0); carBox(6, 10.5, -0.2, 0x2f5f8f);
  lights({ sky: 0xdfe8f5, ground: 0x8a8070, hemi: 1.6, extent: 28, sx: -10, sy: 18, sz: 12 });
  return { ...inBounds(-17, 17, -0.4, 17, bg), nome: 'Portaria', start: [0, 12], yaw: 0, photo: { x: 0, z: 16.5, y: 1.6, yaw: 0, pitch: 0.02, fov: 62 }, tour: walk([0, 12], [-8, 4], [0, 3], [10, 4], [0, 12]) };
}

/* ---------- PISCINA ---------- */
export function piscina() {
  const bg = yard(TM(T.grama(80, 80)));
  floorPlane(56, 26, TM(T.tile(30, 14, '#d8cfc9'), { roughness: 0.6 }), 0, 1, 0.02);
  const w = 26, d = 9, px = 0, pz = -3;
  for (const [x, z, a, b] of [[px, pz - d / 2 - 0.2, w + 0.8, 0.4], [px, pz + d / 2 + 0.2, w + 0.8, 0.4], [px - w / 2 - 0.2, pz, 0.4, d], [px + w / 2 + 0.2, pz, 0.4, d]]) box(x, z, a, b, 0.3, 0xefeee9, 0);
  const wt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), new THREE.MeshStandardMaterial({ color: 0x35c0d8, roughness: 0.1, metalness: 0.15, emissive: 0x1a8aa0, emissiveIntensity: 0.35 })); wt.position.set(px, 0.12, pz); ctx.room.add(wt); solid(px, pz, w / 2 + 0.4, d / 2 + 0.4);
  for (let i = 0; i < 6; i++) { box(-9 + i * 3.4, 3.2, 0.9, 2, 0.4, COL.WHITE, 0.05, { solid: true }); }
  for (const x of [-8, 0, 8]) { cyl(x, 2.2, 0.06, 2.6, 0x59626c, 0, { seg: 6 }); cone(x, 2.2, 1.8, 0.6, x ? COL.WHITE : 0x2a7fb8, 2.5, 14); }
  for (const x of [-10, -2, 7]) roundTable(x, 7.5, { r: 0.45, chairs: 3, plant: false, top: M(COL.WHITE), leg: COL.WHITE, chairColor: COL.WHITE });
  for (const [x, z] of [[-20, 0], [-20, -8], [20, 2], [20, -8], [-14, -12], [14, -12]]) palm(x, z, 7);
  blocks(-22, 4, 12, 22, 17); fence(-28, -13, 28, -13, 2);
  for (const [x, z] of [[-22, 8], [22, 8]]) tree(x, z, 1);
  lights({ extent: 30, sx: -8, sy: 20, sz: 12, hemi: 1.7 });
  return { ...inBounds(-24, 24, -12, 13), nome: 'Piscina', start: [-12, 8], yaw: 0, photo: { x: -14, z: 5.5, y: 1.5, yaw: -0.7, pitch: -0.1, fov: 66 }, tour: walk([-12, 8], [-14, 4], [0, 5], [14, 4], [0, 9], [-12, 8]) };
}

/* ---------- ESPAÇO KIDS ---------- */
export function espacoKids() {
  const bg = yard(TM(T.grama(60, 60)));
  const wallTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c28be0'; g.fillRect(0, 0, w, h); g.fillStyle = '#f09ac8'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(i * 110 - 30, h); g.lineTo(i * 110 + 25, 30); g.lineTo(i * 110 + 90, h); g.fill(); } g.fillStyle = '#8fb4de'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(rnd(i) * w, 50 + rnd(i + 3) * 190, 5, 0, 7); g.fill(); } });
  box(-6, -9, 14, 0.5, 4.6, TM(wallTex, { roughness: 0.9 }), 0, { solid: true }); box(-6, -9, 14.4, 0.7, 0.18, 0x8ea3bd, 4.6); box(-6, -8.6, 0.1, 0.1, 4.6, 0x8ea3bd, 0); box(-6, -7.3, 14, 0.1, 0.1, 0xdddddd, 3.4);
  box(-6, -12, 16, 6, 5.4, 0x7a8aa0, 0, { solid: true });
  const cols = [0xe9a3bd, 0xf2c14e, 0x6fb7e0, 0x9d74d0, 0xe58a2e, 0x6bc08a];
  for (let i = 0; i < 14; i++) disc(-12 + rnd(i) * 26, -4 + rnd(i + 7) * 12, 0.8 + rnd(i + 2) * 0.9, cols[i % 6], 0.03);
  const sl = box(5, -3, 1.0, 3.6, 0.12, 0xe8453a, 0.9, { rx: 0.5 }); cyl(5, -5, 0.08, 1.8, 0xe8453a, 0, { seg: 6 }); box(5, -5.2, 1.2, 1.2, 0.1, 0xf2c14e, 1.7); solid(5, -4.3, 0.8, 1.4);
  box(9, -1, 3.4, 0.2, 0.1, 0xe8453a, 0.65, { rz: 0.0 }); cyl(9, -1, 0.15, 0.6, 0x4a4d54, 0, { seg: 8 });
  cyl(12, 3, 1.0, 0.1, 0x4aa3df, 0.3, { seg: 14 }); cyl(12, 3, 0.1, 0.5, 0x4a4d54, 0, { seg: 6 }); solid(12, 3, 1.1, 1.1);
  fence(-14, -15, 18, -15, 3.5); fence(18, -15, 18, 8, 3.5);
  for (const [x, z] of [[-16, 6], [-10, 11], [16, 12], [21, -4], [2, 12]]) tree(x, z, 1.1); palm(-17, -2, 7); palm(20, 6, 7);
  lights({ extent: 28, sx: -6, sy: 20, sz: 12, hemi: 1.8 });
  return { ...inBounds(-15, 17, -7, 13), nome: 'Espaço kids', start: [0, 8], yaw: 0, photo: { x: 4, z: 9, y: 1.6, yaw: 0.25, pitch: -0.02, fov: 64 }, tour: walk([0, 8], [-8, 0], [0, -2], [8, 5], [0, 8]) };
}

/* ---------- FUTMESA / PET WASH ---------- */
export function futmesa() {
  const bg = yard(TM(T.grama(60, 60)));
  const wall = M(0xdcc7a4, { roughness: 0.95 });
  box(-3, -9, 28, 0.5, 3.2, wall, 0, { solid: true }); box(-3.5, -8.7, 6.2, 0.15, 2.4, 0xf29a2e, 0.2); box(-3.5, -8.6, 5.4, 0.1, 1.6, 0xdcc7a4, 0.6);
  plane(3.4, 0.7, new THREE.MeshBasicMaterial({ map: T.sign('PET WASH', '#dcc7a4', '#3a3a3a', 512, 128) }), -3.5, 1.95, -8.4);
  for (const x of [-9, 4]) { disc(x, -8.3, 0.5, 0xb89a70, 0.04); }
  for (let i = 0; i < 40; i++) box(-12 + i * 0.5, -6.5, 0.12, 0.12, 0.9, 0x9a6a3c, 0, { cast: false }); solid(-2, -6.5, 10, 0.1);
  const top = M(0xb9bfc4, { roughness: 0.4, metalness: 0.3 });
  box(0, 0, 2.9, 1.6, 0.08, top, 0.8, { solid: true }); box(-1.35, 0, 0.5, 1.6, 0.08, top, 0.88, { rz: 0.5 }); box(1.35, 0, 0.5, 1.6, 0.08, top, 0.88, { rz: -0.5 });
  for (const x of [-1.1, 1.1]) box(x, 0, 0.08, 1.2, 0.8, 0x4a4d54, 0);
  tree(-12, -4, 1.3); tree(10, -7, 1.2); palm(8, -5, 6); tree(-16, 6, 1.1); tree(16, 7, 1.1);
  box(-14, -8, 3, 3, 4, 0xcad0d8, 0, { solid: true });
  for (const [x, z] of [[-6, -5.5], [7, -5.5]]) { sph(x, 0.5, z, 0.8, 0xb23a5a, { sy: 0.6 }); sph(x + 1, 0.4, z, 0.7, 0xf0c23a, { sy: 0.6 }); }
  lights({ extent: 26, sx: -6, sy: 20, sz: 10, hemi: 1.8, sunColor: 0xfff0d0 });
  return { ...inBounds(-14, 14, -5.4, 12), nome: 'Futmesa', start: [0, 7], yaw: 0, photo: { x: -3, z: 6, y: 1.5, yaw: 0.2, pitch: -0.02, fov: 64 }, tour: walk([0, 7], [-5, 3], [0, 3], [5, 2], [0, 7]) };
}

/* ---------- QUIOSQUE GOURMET ---------- */
export function quiosque() {
  const bg = yard(TM(T.grama(60, 60)), 0x7f9fd0);
  ribbon([[-20, 8], [-6, 10], [8, 8], [20, 11]], 3.4, TM(T.asfalto(1, 1)), 0.03, false); ribbon([[-20, 8], [-6, 10], [8, 8], [20, 11]], 3.4, M(0xb8382c), 0.035, false);
  const dark = M(0x3a2d26), tile = M(0xc2582c, { roughness: 0.8 });
  for (const [x, z] of [[-5, -1], [5, -1], [-5, -9], [5, -9]]) cyl(x, z, 0.35, 3.6, dark, 0, { seg: 6, solid: true });
  box(0, -5, 11.4, 9.4, 0.3, 0xb3703c, 3.6, {}); const roof = new THREE.Mesh(new THREE.ConeGeometry(9.2, 3.2, 4), tile); roof.rotation.y = Math.PI / 4; roof.position.set(0, 5.5, -5); roof.castShadow = true; ctx.room.add(roof);
  box(0, -8.6, 10, 0.5, 3.4, M(0xcbb99a), 0, { solid: true }); box(-1.5, -8.3, 4.4, 0.1, 1.8, TM(T.tile(4, 2, '#9fb09a')), 0.9); box(3.2, -8.3, 1.2, 0.12, 2.6, 0x1a1b1e, 0); box(-3.6, -8.2, 1.4, 0.8, 1.0, 0x2a2b2f, 0.1, { solid: true });
  counter(-1.0, -7.4, 5.0, 0.8, 1.0, 0x8a9a8a, 0x2b2b2f);
  roundTable(0.5, -4, { r: 0.55, chairs: 4, plant: false, top: M(0x2a2b2f), leg: 0x2a2b2f, chairColor: 0x2a2b2f }); roundTable(-3, -3.5, { r: 0.5, chairs: 3, plant: false, top: M(0x2a2b2f), leg: 0x2a2b2f, chairColor: 0x2a2b2f });
  for (const x of [-5.5, 5.5]) box(x, -8.4, 0.2, 0.2, 0.4, BASIC(0xffd68a), 2.4);
  for (const [x, z] of [[-8, -1], [-9, 3], [8.5, 0], [9, -4]]) { sph(x, 0.6, z, 1.0, 0x3a7a3a, { sy: 0.7 }); sph(x + 0.4, 0.9, z, 0.5, 0xe05a8a, { sy: 0.7 }); }
  tree(-14, -6, 1.3); tree(14, -8, 1.2); blocks(-24, 3, 12, 18, 20);
  lights({ extent: 26, sx: -10, sy: 16, sz: 10, hemi: 1.7, sunColor: 0xffe8c8 });
  return { ...inBounds(-13, 13, -2.5, 14), nome: 'Quiosque gourmet', start: [0, 7], yaw: 0, photo: { x: -3, z: 6, y: 1.6, yaw: 0.2, pitch: 0.0, fov: 64 }, tour: walk([0, 7], [-3, 0], [3, 0], [0, -2], [0, 7]) };
}

/* ---------- QUADRAS DE AREIA ---------- */
export function quadrasAreia() {
  const bg = yard(TM(T.grama(60, 60)), 0x9cc4e8);
  floorPlane(30, 18, TM(T.areia(15, 9)), 0, 0, 0.02);
  for (const [x, z, w, d] of [[0, -7.5, 24, 0.12], [0, 7.5, 24, 0.12], [-12, 0, 0.12, 15], [12, 0, 0.12, 15]]) box(x, z, w, d, 0.02, 0x4a4d54, 0.03, { cast: false });
  box(0, 0, 0.1, 0.1, 2.4, 0x59626c, 0, {}); const nt = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), new THREE.MeshBasicMaterial({ color: 0x1b2430, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); nt.position.set(0, 1.85, 0); nt.rotation.y = Math.PI / 2; ctx.room.add(nt);
  box(0, -4.5, 0.12, 0.12, 2.4, 0x59626c, 0); box(0, 4.5, 0.12, 0.12, 2.4, 0x59626c, 0);
  fence(-16, -10, 16, -10, 3.4); fence(-16, 10, -4, 10, 3.4); fence(4, 10, 16, 10, 3.4); fence(-16, -10, -16, 10, 3.4); fence(16, -10, 16, 10, 3.4);
  cones([[10, 6], [10.6, 6.4], [-9, -6]]); pole(-15.5, -9.5); pole(15.5, -9.5); pole(15.5, 9.5);
  box(-8, -18, 14, 7, 3.6, 0xd9b99a, 0, { solid: true }); box(-8, -18, 15, 8, 0.4, 0xb8704a, 3.6); blocks(-32, 3, 12, 14, 24);
  tree(-20, 6, 1.3); tree(20, 6, 1.2); tree(-22, -4, 1.2); palm(22, -6, 7);
  lights({ extent: 30, sx: 8, sy: 14, sz: 14, hemi: 1.8, sunColor: 0xffe2b8 });
  return { ...inBounds(-19, 19, -9.2, 14), nome: 'Quadras de areia', start: [0, 12], yaw: 0, photo: { x: -9, z: 8.5, y: 1.6, yaw: -0.4, pitch: -0.04, fov: 66 }, tour: walk([0, 12], [-6, 6], [-6, -5], [6, -5], [6, 6], [0, 12]) };
}

/* ---------- PARQUE AVENTURA ---------- */
export function parqueAventura() {
  const bg = yard(TM(T.grama(60, 60)));
  const wood = M(0x9a6a3c, { roughness: 0.8 });
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) cyl(x, z, 0.16, 3.2, wood, 0, { seg: 6 });
  box(0, 0, 3.2, 3.2, 0.18, wood, 2.0); const r = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.6, 4), M(0xf0c23a)); r.rotation.y = Math.PI / 4; r.position.set(0, 4.0, 0); r.castShadow = true; ctx.room.add(r); solid(0, 0, 1.7, 1.7);
  for (const [x, z] of [[5.5, 0.5]]) { for (const dx of [-1, 1]) for (const dz of [-1, 1]) cyl(x + dx * 1.1, z + dz * 1.1, 0.12, 2.0, wood, 0, { seg: 6 }); box(x, z, 2.6, 2.6, 0.15, wood, 1.9); box(x, z, 2.4, 2.4, 1.2, 0x8a6a4a, 2.0, { solid: true }); const r2 = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.0, 4), M(0x9a5ab5)); r2.rotation.y = Math.PI / 4; r2.position.set(x, 3.7, z); ctx.room.add(r2); }
  box(0, 4.6, 1.0, 5.2, 0.14, wood, 0.9, { rx: -0.62 }); solid(0, 3.4, 0.8, 2);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), new THREE.MeshBasicMaterial({ color: 0x3a2f28, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); net.position.set(3.0, 1.1, 0); net.rotation.set(0, Math.PI / 2, 0.15); ctx.room.add(net);
  for (const x of [-6, -9]) cyl(x, 0, 0.1, 2.6, wood, 0, { seg: 6 }); box(-7.5, 0, 3.1, 0.1, 0.1, wood, 2.6); for (const z of [-0.3, 0.3]) cyl(-7.5, z, 0.01, 1.8, 0x59626c, 0.8, { seg: 3 });
  const cols = [0x9d74d0, 0xe58a2e, 0x6fb7e0, 0xe9a3bd, 0xf2c14e, 0x6bc08a];
  for (let i = 0; i < 16; i++) disc(-13 + rnd(i) * 26, -8 + rnd(i + 5) * 17, 0.8 + rnd(i + 2), cols[i % 6], 0.03);
  ribbon([[-14, 11], [-4, 9], [6, 11], [16, 9]], 2.4, TM(T.paver(2, 6, '#c98b5c')), 0.035, false);
  fence(-18, -10, 18, -10, 3.4); fence(18, -10, 18, 6, 3.4); pole(16, -9, 10);
  for (const [x, z] of [[-14, -5], [14, -6], [-16, 6], [12, 10], [-3, 12]]) tree(x, z, 1.3);
  lights({ extent: 26, sx: -8, sy: 18, sz: 12, hemi: 1.8 });
  return { ...inBounds(-16, 16, -8.8, 13), nome: 'Parque aventura', start: [0, 9], yaw: 0, photo: { x: 3, z: 9.5, y: 1.5, yaw: 0.2, pitch: 0.02, fov: 62 }, tour: walk([0, 9], [-5, 5], [-4, -5], [6, -6], [8, 6], [0, 9]) };
}

/* ---------- QUADRA POLIESPORTIVA ---------- */
export function quadraPoli() {
  const bg = yard(TM(T.grama(60, 60)), 0xa9c8e8);
  floorPlane(34, 22, M(0x2c6c70, { roughness: 0.9 }), 0, 0, 0.02); floorPlane(28, 15, M(0xd8437f, { roughness: 0.9 }), 0, 0, 0.04);
  const wl = COL.WHITE;
  for (const [x, z, w, d] of [[0, -7.5, 28, 0.15], [0, 7.5, 28, 0.15], [-14, 0, 0.15, 15], [14, 0, 0.15, 15], [0, 0, 0.15, 15]]) box(x, z, w, d, 0.02, wl, 0.05, { cast: false });
  ring(0, 0, 2.2, 2.4, wl, 0.06); for (const sx of [-1, 1]) { ring(sx * 14, 0, 4.2, 4.4, wl, 0.06, 24); box(sx * 14, 0, 0.1, 6, 0.02, wl, 0.05, { cast: false }); }
  for (const sx of [-1, 1]) { box(sx * 14.6, -1.5, 0.1, 0.1, 2.0, wl, 0); box(sx * 14.6, 1.5, 0.1, 0.1, 2.0, wl, 0); box(sx * 14.6, 0, 0.1, 3.1, 0.1, wl, 2.0, { solid: true }); }
  cyl(-16.5, 0, 0.1, 3.4, 0x59626c, 0, { seg: 6 }); box(-15.9, 0, 0.1, 1.8, 1.1, COL.WHITE, 3.0); box(-15.8, 0, 0.3, 0.6, 0.05, 0xe8453a, 3.2);
  fence(-17, -11, 17, -11, 3.5); fence(-17, -11, -17, 11, 3.5); fence(17, -11, 17, 11, 3.5); fence(-17, 11, -5, 11, 3.5); fence(5, 11, 17, 11, 3.5);
  cones([[-3, -2], [-1, -1], [2, 0.6], [0, 2.4]]); pole(-17, -10.5, 10); pole(17, -10.5, 10); pole(17, 10.5, 10);
  box(-10, -20, 20, 8, 4.2, 0xdcc7a4, 0, { solid: true }); blocks(-34, 3, 12, 16, 24);
  for (const [x, z] of [[-22, -6], [22, -4], [22, 8], [-22, 8]]) palm(x, z, 7);
  lights({ extent: 30, sx: 8, sy: 14, sz: 14, hemi: 1.8, sunColor: 0xffe2b8 });
  return { ...inBounds(-20, 20, -10.4, 15), nome: 'Quadra poliesportiva', start: [0, 13], yaw: 0, photo: { x: 10, z: 9, y: 1.6, yaw: 0.6, pitch: -0.06, fov: 68 }, tour: walk([0, 13], [0, 8], [-8, 0], [0, -6], [10, 0], [0, 13]) };
}

/* ---------- PISTA DE COOPER ---------- */
export function pistaCooper() {
  const bg = yard(TM(T.grama(60, 60)));
  const pts = [[-16, 10], [-8, 6], [-2, 0], [4, -4], [10, -2], [14, 4], [18, 10]];
  ribbon(pts, 3.6, M(0xb8382c, { roughness: 0.9 }), 0.035, false); ribbon(pts, 0.18, M(0xf0c23a), 0.045, false);
  box(0, -12, 50, 0.4, 3.4, 0xe0cba8, 0, { solid: true });
  for (const [x, z] of [[-14, -6], [-10, -8], [-6, -7], [-2, 0], [-12, 2], [-4, -9]]) { for (let i = 0; i < 4; i++) sph(x + (i % 2) * 0.6, 0.7 + i * 0.25, z + (i > 1 ? 0.5 : 0), 0.55, 0xb02a3a, { sy: 1.3 }); }
  for (const [x, z] of [[2, 4], [6, 6], [-6, 12], [10, 9]]) { sph(x, 0.5, z, 0.9, 0x6a4a9a, { sy: 0.6 }); sph(x + 0.7, 0.5, z, 0.8, 0xe0c23a, { sy: 0.6 }); }
  floorPlane(16, 10, TM(T.areia(8, 5)), 16, -6, 0.02); fence(8, -11, 8, -1, 3.2); fence(8, -1, 24, -1, 3.2); fence(8, -11, 24, -11, 3.2);
  tree(-8, 2, 1.6); tree(-1, -7, 1.2); tree(20, 6, 1.3); tree(-18, -4, 1.4); palm(14, 12, 6);
  lights({ extent: 28, sx: -6, sy: 18, sz: 10, hemi: 1.8, sunColor: 0xffe8c8 });
  return { ...inBounds(-20, 20, -9, 15), nome: 'Pista de cooper', start: [-14, 10], yaw: -0.5, photo: { x: -16, z: 11, y: 1.6, yaw: -0.9, pitch: -0.02, fov: 66 }, tour: walk([-15, 10], [-8, 6], [-2, 0.5], [4, -3.5], [10, -1.5], [14, 4], [-15, 10]) };
}

/* ---------- BICICLETÁRIO ---------- */
export function bicicletario() {
  const bg = yard(TM(T.grama(60, 60)));
  floorPlane(60, 20, TM(T.paver(30, 10)), 0, 2, 0.02); floorPlane(60, 5, M(0xbfc0bd), 0, 15, 0.02);
  for (let i = 0; i < 5; i++) { box(-9 + i * 4.6, -2, 3.6, 1.2, 0.8, 0xdd9a3c, 0, { solid: true }); }
  [[-9, 0xe8742a], [-4.4, 0x6fd02a], [-0.2, 0x1a1b1e], [4.4, 0x2fb4c8], [9, 0xe8452a]].forEach(([x, c], i) => bike(x, -0.4, Math.PI / 2 * (i % 2 ? 1 : -1) + 0.1, c));
  ribbon([[-26, 8], [0, 9], [26, 8]], 3, M(0xb8382c), 0.035, false);
  fence(-26, -9, 26, -9, 3.2); box(14, -14, 8, 6, 3.4, 0xe0cba8, 0, { solid: true });
  for (const [x, z] of [[-16, -5], [-6, -6], [6, -6], [16, -5], [-22, 6], [22, 6]]) tree(x, z, 1.3);
  lights({ extent: 28, sx: -8, sy: 18, sz: 10, hemi: 1.8, sunColor: 0xffe8c8 });
  return { ...inBounds(-22, 22, -4.5, 12), nome: 'Bicicletário', start: [0, 6], yaw: 0, photo: { x: -3, z: 5.5, y: 1.5, yaw: 0.35, pitch: -0.02, fov: 64 }, tour: walk([0, 6], [-8, 3], [0, 2.4], [9, 3], [0, 6]) };
}

/* ---------- ACADEMIA AO AR LIVRE ---------- */
export function academiaArLivre() {
  const bg = yard(TM(T.grama(60, 60)), 0xf0d7b0);
  const pts = [[-22, 10], [-12, 8], [-4, 6], [6, 9], [18, 6]];
  ribbon(pts, 4.2, M(0xb8382c, { roughness: 0.9 }), 0.035, false); ribbon(pts, 0.16, M(0xf0c23a), 0.045, false); for (let i = 0; i < 14; i++) box(-21 + i * 3, 8 - Math.sin(i * 0.5) * 2, 1.4, 0.16, 0.02, 0xffffff, 0.05, { cast: false });
  floorPlane(24, 9, TM(T.paver(12, 4.5, '#e0b98a')), 4, -1, 0.02);
  box(0, -9, 52, 0.5, 4, 0xe9d3a8, 0, { solid: true });
  const blue = M(0x2f9ae0, { roughness: 0.4 });
  for (const [x, z] of [[-3, -2], [3, -2.5], [9, -1]]) { cyl(x, z, 0.12, 2.8, 0x1a1b1e, 0, { seg: 8, solid: 0.5 }); box(x, z + 0.4, 1.4, 0.12, 1.2, blue, 0.5); box(x, z + 0.55, 0.12, 0.6, 1.0, blue, 0.2); box(x + 0.5, z + 0.7, 0.5, 0.5, 0.12, 0x1a1b1e, 0.6); }
  for (const [x, z] of [[-9, 1], [-6.5, 2.4]]) { cyl(x, z, 0.1, 2.0, 0x1a1b1e, 0, { seg: 8, solid: 0.4 }); box(x, z, 1.0, 0.1, 0.6, blue, 1.2); }
  for (const [x, z] of [[-12, -5], [-10, -6], [14, -6], [12, -5], [-16, -4], [18, -4]]) for (let i = 0; i < 4; i++) sph(x + (i % 2) * 0.6, 0.7 + i * 0.25, z + (i > 1 ? 0.5 : 0), 0.55, 0xb02a3a, { sy: 1.3 });
  palm(-14, -2, 7.5); palm(16, 0, 7); palm(14, -7, 6.5); tree(-20, 0, 1.4); tree(22, 8, 1.2);
  lights({ extent: 28, sx: 10, sy: 14, sz: 10, hemi: 1.7, sunColor: 0xffd9a0, sky: 0xfff0d8, ground: 0x9a7a60 });
  return { ...inBounds(-20, 20, -7.5, 13), nome: 'Academia ao ar livre', start: [-14, 10], yaw: -0.3, photo: { x: -15, z: 11, y: 1.6, yaw: -0.8, pitch: -0.03, fov: 66 }, tour: walk([-14, 10], [-6, 6], [0, 1], [8, 1], [14, 8], [-14, 10]) };
}
