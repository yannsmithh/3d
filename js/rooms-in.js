import * as THREE from 'three';
import { ctx, T, M, TM, COL, GLASS, BASIC, box, cyl, sph, cone, plane, floorPlane, solid, disc, led, spot, wall, plant, meshChair, eamesChair,
  roundTable, table, armchair, stool, shelf, counter, vase, rug, pendant, shelfItems, productShelf, sofa, pouf, fridge, lights, rnd } from './kit.js';

/* =====================================================================
   AMBIENTES INTERNOS — recriados a partir das fotos do book.
   Origem no centro do ambiente; x = leste, z = sul; o fundo é o lado norte (z<0).
   ===================================================================== */
const ceilMat = (c = 0xc2c0bb, e = 0x5a5854) => new THREE.MeshStandardMaterial({ color: c, emissive: e, roughness: 0.9 });
function shell(w, d, h, floorM, ceil) {
  floorPlane(w + 0.6, d + 0.6, floorM);
  box(0, 0, w + 0.8, d + 0.8, 0.1, ceil || ceilMat(), h, { cast: false });
  return { bounds: { x0: -w / 2 + 0.25, x1: w / 2 - 0.25, z0: -d / 2 + 0.25, z1: d / 2 - 0.25 }, h, bg: 0x20242c };
}
const tileM = (w, d, base) => TM(T.tile(w / 1.2, d / 1.2, base), { roughness: 0.45 });
const woodM = (w, d, base) => TM(T.wood(w / 2.4, d / 2.4, base), { roughness: 0.55 });
const plasterM = (w, h, base) => TM(T.plaster(w / 2, h / 2, base), { roughness: 0.95 });
const paint = c => M(c, { roughness: 0.9 });
function view(tex, x, y, z, ry, w = 26, h = 7) { return plane(w, h, new THREE.MeshBasicMaterial({ map: tex }), x, y, z, ry); }
const START = (d, hd) => [0, hd - 1.2];

/* ---------- SALÃO DE FESTAS ---------- */
export function salaoFestas() {
  const W = 14, D = 13.5, H = 3.3, z0 = -5.2, cz = 1.75; // x -7..7, z -5.2..8.3
  floorPlane(14.4, D + 0.4, tileM(14.4, D, '#c4c1bb'), 0, cz);
  box(0, cz, 14.6, D + 0.6, 0.1, ceilMat(0xc2c0bb), H, { cast: false });
  const pl = (w, h) => plasterM(w, h);
  wall('z', -7.1, z0, 8.4, H, pl(13.6, H));                                              // oeste
  wall('x', 8.4, -7, 7, H, pl(14, H));                                                    // sul
  wall('z', 7.1, 3, 8.4, H, pl(5.4, H));                                                  // leste cego
  // norte: janela de 4 folhas à esquerda, bar de tijolo à direita
  wall('x', -5, -7, 0, H, pl(7, H), [{ a: -6.5, b: 0, y0: 0, y1: 2.5, panes: 4 }]);
  box(3.2, -4.85, 6.4, 0.3, H, TM(T.brick(6.4, 3.3), { roughness: 0.9 }), 0, { solid: true });
  box(6.7, -4.9, 0.6, 0.2, H, pl(0.6, H), 0, { solid: true });
  view(T.predios(), -3.25, 3.2, -9.5, 0); plane(30, 14, M(0x6d7d62), -3.25, -0.02, -12, 0, -Math.PI / 2);
  shelf(2.9, 2.05, -4.7, 5.6); box(2.9, -4.6, 5.6, 0.03, 0.03, BASIC(0xffc27a), 2.0); shelfItems(0.5, 5.4, 2.1, -4.7, 6, 1);
  for (const x of [0.9, 2.3, 3.6]) pendant(x, -3.9, 2.05);
  counter(2.4, -4.55, 4.2, 0.55, 0.95, 0x4a3022, 0x25211f); counter(2.4, -3.7, 4.3, 0.7, 1.08, 0x8a4a28, 0x25211f);
  for (const x of [0.9, 2.0, 3.1, 4.1]) stool(x, -2.85);
  fridge(5.1, -4.5); box(5.95, -4.8, 0.8, 0.4, 2.15, COL.WOODD, 0, { solid: true });
  // oeste: aparador, vasos, espelho
  table(-6.62, 0.9, 0.45, 2.8, 0.8, M(0x7b4a2b, { roughness: 0.5 }), 0x7b4a2b);
  vase(-6.62, 0.8, 0.0, 0.34); vase(-6.62, 0.8, 0.4, 0.28); plant(-6.62, 0.8, 1.3, 1.0); plant(-6.62, 0.8, 1.9, 0.7);
  const mir = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshStandardMaterial({ color: 0x5b4a44, roughness: 0.1, metalness: 0.6 })); mir.scale.set(0.95, 0.42, 1); mir.position.set(-6.97, 1.9, 0.9); mir.rotation.y = Math.PI / 2; ctx.room.add(mir);
  // leste: divisória de vidro e salão infantil ao lado
  wall('z', 7.1, -5, 3, H, pl(8, H), [{ a: -4.8, b: -0.8, y0: 0, y1: 2.5, panes: 3 }, { a: -0.8, b: 0.4, y0: 0, y1: 2.5, door: true }, { a: 0.4, b: 2.8, y0: 0, y1: 2.5, panes: 2 }]);
  floorPlane(3.9, 8, woodM(3.9, 8, '#b98a55'), 9.1, -1); box(9.1, -5.05, 3.9, 0.2, H, TM(T.confete(2, 2), {}), 0, { solid: true });
  box(11.05, -1.0, 0.2, 8.2, H, TM(T.confete(4, 2)), 0, { solid: true }); box(9.1, 3.05, 3.9, 0.2, H, pl(3.9, H), 0, { solid: true }); box(9.1, -1, 3.9, 8.2, 0.1, 0x9d9b96, H, { cast: false });
  roundTable(9.3, -0.8, { r: 0.5, top: M(COL.WHITE), leg: COL.WHITE, plant: false, chairs: 3, eames: true, chairColor: COL.TEAL });
  // LED em L e spots
  led(-2.2, 1.85, 0.09, 11.3, H - 0.03); led(1.2, -3.8, 6.8, 0.09, H - 0.03);
  for (const [x, z] of [[3.2, -1.8], [0.6, -0.2], [4.8, 1.0], [-4.6, -2.8], [-1.0, 2.6], [5.6, 3.6], [-3.4, 5.4], [2.6, 5.8], [5.4, 7.2]]) spot(x, z, H);
  // mesas azuis e lounge
  [[-4.6, -1.4], [0.4, -1.2], [4.7, -1.3], [-5.0, 1.5], [0.3, 1.6], [4.9, 1.5]].forEach(([x, z]) => roundTable(x, z));
  rug(0.3, 6.1, 4.4, 3.0, TM(T.jute(4, 3), { roughness: 1 }));
  armchair(-2.7, 6.3, Math.PI / 2 - 0.12); armchair(3.3, 6.3, -Math.PI / 2 + 0.12); sofa(-6.1, 5.4, Math.PI / 2, 2.0, 0x8a6a4a);
  for (const [x, z, r, h] of [[0.55, 6.5, 0.55, 0.36], [0.0, 5.8, 0.4, 0.5]]) { cyl(x, z, r, h, 0xa4512c, 0, { seg: 24 }); cyl(x, z, r - 0.04, 0.04, 0x3b3c40, h, { seg: 24 }); solid(x, z, r, r); }
  lights({ hemi: 1.7, extent: 14, points: [{ c: 0xffb872, i: 14, d: 8, pos: [2.4, 2.5, -3.6] }, { c: 0x9db8e0, i: 6, d: 9, pos: [-3.2, 2.2, -3.8] }] });
  return { nome: 'Salão de festas', bounds: { x0: -6.8, x1: 10.8, z0: -4.95, z1: 8.15 }, h: H, bg: 0x20242c, start: [0.4, 4.8], yaw: 0, photo: { x: 0.3, z: 8.1, y: 1.55, yaw: 0, pitch: -0.05, fov: 62 }, tour: [[0.4, 4.8], [0.4, 0.2], [-3, -0.6], [2.4, -1.9], [5.5, 1.5], [0.4, 6]] };
}

/* ---------- SALÃO INFANTIL ---------- */
export function salaoInfantil() {
  const W = 9, D = 7, H = 3, s = shell(W, D, H, woodM(W, D, '#d2a56b'), ceilMat(0xefeae2, 0x6a6762));
  const wallM = (w, h) => TM(T.confete(w / 2, h / 2, '#e9dfd2'));
  wall('x', -D / 2, -W / 2, W / 2, H, wallM(W, H)); wall('z', -W / 2, -D / 2, D / 2, H, wallM(D, H)); wall('x', D / 2, -W / 2, W / 2, H, wallM(W, H));
  wall('z', W / 2, -D / 2, D / 2, H, M(0xe9dfd2), [{ a: -3.2, b: 3.2, y0: 0, y1: 2.5, panes: 3 }]);
  view(T.predios(), 8, 2.5, 0, -Math.PI / 2, 14, 4);
  for (const [x, y, r] of [[-3.6, 1.6, 0.9], [-2.4, 1.9, 0.7], [-1.0, 1.65, 0.85]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 20), M(0xe0b878)); c.scale.y = 0.75; c.position.set(x, y, -D / 2 + 0.11); ctx.room.add(c); }
  shelf(-2.4, 1.3, -D / 2 + 0.2, 3.6, 0.3, 0xf2ece2); shelfItems(-4.0, -0.8, 1.35, -D / 2 + 0.2, 6, 4);
  box(2.4, -D / 2 + 0.3, 2.0, 0.5, 1.0, 0xe9e6df, 0, { solid: true });                       // cubbies
  for (let i = 0; i < 4; i++) box(1.7 + i * 0.5, -D / 2 + 0.56, 0.4, 0.04, 0.4, [0xf2f2f0, 0xc8dcef, 0xf6e6c8, 0xf2f2f0][i], 1.0);
  roundTable(-1.7, 0.2, { r: 0.65, top: M(COL.WHITE), leg: 0xc79a63, plant: false, eames: true, chairColor: 0x8fb4de, chairs: 4 });
  roundTable(1.9, 0.7, { r: 0.65, top: M(COL.WHITE), leg: 0xc79a63, plant: false, eames: true, chairColor: 0x8fb4de, chairs: 4 });
  for (const [x, z, c] of [[-1.5, 0.0, 0xd9b36a], [-1.9, 0.3, 0xd04a3a], [2.1, 0.55, 0xf0c23a], [1.7, 0.9, 0x4a9ad0]]) box(x, z, 0.12, 0.12, 0.12, c, 0.75);
  pouf(-3.6, 1.8, 0xf0c23a); pouf(-3.1, 2.3, 0xf0c23a, 0.25);
  led(0, -0.5, 0.09, 5.5, H - 0.03); led(-2.7, 0, 0.09, 3.5, H - 0.03); led(0, 2.4, 6, 0.09, H - 0.03);
  lights({ hemi: 2.0, extent: 8, points: [{ c: 0xffe2b8, i: 8, d: 9, pos: [0, 2.6, 0] }] });
  return { ...s, nome: 'Salão infantil', start: [0, 2.2], yaw: 0, photo: { x: -3.6, z: 3.0, y: 1.5, yaw: -0.62, pitch: -0.05, fov: 66 }, tour: [[0, 2.2], [-0.2, 0.2], [-3, 1.5], [3, -1.5], [0, 2.2]] };
}

/* ---------- VARANDA GOURMET ---------- */
export function varandaGourmet() {
  const W = 10, D = 6.4, H = 3.1, s = shell(W, D, H, tileM(W, D, '#b9b8b6'), ceilMat(0xbdbab6, 0x55534f));
  const blue = TM(T.plaster(W / 2, H / 2, '#56708f', '#4c6684', '#607b9b'));
  wall('x', -D / 2, -W / 2, W / 2, H, blue); wall('z', -W / 2, -D / 2, D / 2, H, blue);
  wall('x', D / 2, -W / 2, 0, H, blue);                                                    // sul parcial; leste aberto para o jardim
  view(T.jardim(), 8, 2.3, 0, -Math.PI / 2, 16, 5); view(T.jardim(), 0, 2.3, -7, 0, 22, 5); plane(40, 30, M(0x4f7a46), 6, -0.02, 0, 0, -Math.PI / 2);
  for (const x of [-2.9, -1.2]) { box(x, -D / 2 + 0.12, 1.3, 0.05, 1.75, 0x20222a, 0.9); box(x, -D / 2 + 0.15, 1.15, 0.03, 1.6, COL.WHITE, 0.97); }
  const brick = TM(T.brick(3.4, 1.3, 1), { roughness: 0.9 }); box(1.7, -D / 2 + 0.2, 3.4, 0.12, 1.3, brick, 1.15);
  shelf(1.7, 2.05, -D / 2 + 0.28, 3.4, 0.3); shelf(1.7, 1.6, -D / 2 + 0.28, 3.4, 0.3); shelfItems(0.2, 3.2, 2.1, -D / 2 + 0.28, 6, 7); shelfItems(0.2, 3.2, 1.65, -D / 2 + 0.28, 5, 9);
  counter(1.3, -D / 2 + 0.4, 3.6, 0.7, 0.92, 0x56708f, 0x1f2125); fridge(-0.9, -D / 2 + 0.45);
  counter(3.7, -1.4, 2.6, 1.1, 1.0, 0x56708f, 0x1f2125); box(3.9, -D / 2 + 0.4, 1.2, 0.5, 1.1, 0x2b2b2f, 0, { solid: true });           // ilha + churrasqueira
  box(3.9, -D / 2 + 0.6, 0.7, 0.1, 0.4, BASIC(0xff7a2a), 0.4, { cast: false });
  for (const x of [2.8, 3.5, 4.2, 4.9]) stool(x, -0.4, COL.NAVY, 0.7);
  for (const [x, z] of [[4.4, 2.0], [3.2, 2.2]]) { roundTable(x, z, { r: 0.45, chairs: 2, plant: false, leg: 0x15171a }); }
  led(0, 0, 6.5, 0.09, H - 0.03); led(0, -2.5, 0.09, 4, H - 0.03); led(3.2, 0, 0.09, 5, H - 0.03); led(0, 2.5, 6.5, 0.09, H - 0.03);
  for (const [x, z] of [[4.6, -2.4], [4.9, 0.6], [4.4, 2.6]]) { const b = sph(x + 1.2, 0.5, z, 0.7, 0xb73a45); b.scale.y = 0.8; }
  lights({ hemi: 2.0, extent: 10, sx: -2, points: [{ c: 0xffd2a0, i: 10, d: 8, pos: [1.5, 2.6, -2] }] });
  return { ...s, bounds: { x0: -4.75, x1: 6.0, z0: -2.95, z1: 2.95 }, h: 30, nome: 'Varanda gourmet', start: [-1.5, 1.8], yaw: 0, photo: { x: -3.2, z: 2.6, y: 1.55, yaw: -0.5, pitch: -0.02, fov: 64 }, tour: [[-1.5, 1.8], [1.5, 0.2], [4.8, 1.4], [1, 1.8], [-1.5, 1.8]] };
}

/* ---------- ACADEMIA ---------- */
export function academia() {
  const W = 12, D = 8, H = 3.2, s = shell(W, D, H, woodM(W, D, '#d9b98a'), ceilMat(0x1c1d21, 0x0a0a0c));
  wall('x', -D / 2, -W / 2, W / 2, H, TM(T.block(W / 2.4, H / 2.4))); wall('x', D / 2, -W / 2, W / 2, H, TM(T.block(W / 2.4, H / 2.4)));
  wall('z', -W / 2, -D / 2, D / 2, H, TM(T.cards(3, 1.2))); wall('z', W / 2, -D / 2, D / 2, H, TM(T.block(D / 2.4, H / 2.4)), [{ a: -2, b: 1.5, y0: 0.9, y1: 2.4, panes: 2 }]);
  box(0, -D / 2 + 0.12, 5, 0.05, 1.6, 0x14161a, 1.1, { cast: false });
  for (let i = 0; i < 3; i++) {                                                           // esteiras
    const x = -1.5 + i * 1.7, z = -D / 2 + 1.2;
    box(x, z, 0.8, 1.7, 0.18, 0x2a2b30, 0, { solid: true }); box(x, z, 0.62, 1.55, 0.03, 0x15161a, 0.18); box(x, z - 0.75, 0.09, 0.09, 1.1, 0x2a2b30, 0.18); box(x, z - 0.74, 0.7, 0.15, 0.3, 0x1a1b20, 1.15, { rx: -0.3 }); box(x, z - 0.72, 0.5, 0.02, 0.2, BASIC(0x66ccff), 1.2, { cast: false });
  }
  const yellow = M(0xe8c21e, { roughness: 0.5 });                                         // smith machine
  for (const x of [-3.5, -1.7]) for (const z of [-1.4, -0.9]) box(x, z, 0.08, 0.08, 2.5, yellow);
  box(-2.6, -1.4, 1.9, 0.08, 0.08, yellow, 2.5); box(-2.6, -1.15, 1.9, 0.04, 0.04, 0x9aa0a8, 1.3); box(-2.6, -0.2, 0.5, 1.2, 0.35, 0x1a1b20, 0, { solid: true }); solid(-2.6, -1.2, 1, 0.4);
  for (const [x, z] of [[-4.6, -2.6], [-4.6, -1.4]]) { box(x, z, 0.9, 0.9, 1.7, 0x4a4d54, 0, { solid: true }); box(x, z, 0.12, 1.0, 0.1, yellow, 1.9); }
  for (const [x, z] of [[3.8, 0.5], [3.8, -0.8]]) { box(x, z, 0.5, 1.0, 0.9, 0x2a2b30, 0, { solid: true }); cyl(x, z, 0.22, 0.4, 0x15161a, 0.9); }   // bicicletas
  box(4.3, 2.2, 0.15, 1.0, 1.0, 0x131316, 0, { rz: 0.18 }); cyl(4.3, 2.2, 0.5, 0.12, 0x131316, 0.4, { seg: 20 }).rotation.z = Math.PI / 2;              // anilha
  for (const [x, z, a] of [[-1.5, 1.8, 0.2], [0.0, 2.6, -0.3], [-3.2, 2.9, 0.5]]) box(x, z, 1.2, 0.9, 0.05, 0x23252b, 0, { ry: a, cast: false });                 // tapetes
  for (const [x, z] of [[-0.6, 1.0], [-0.2, 1.3]]) { sph(x, 0.15, z, 0.15, 0xe8c21e); }
  cyl(-4.6, 2.4, 0.6, 0.1, 0x2a2b30, 0.3, { seg: 20 });                                    // cama elástica
  for (const [x, z, w, d] of [[-1.5, -3.2, 5, 0.09], [1.8, -1.8, 4.5, 0.09], [-3, 0.3, 0.09, 4], [3.2, 1.2, 0.09, 3.6], [0, 1.6, 4, 0.09], [-4.8, 2.9, 2.5, 0.09], [4.6, -2.4, 0.09, 1.8]]) led(x, z, w, d, H - 0.03);
  for (const [x, z] of [[-3.6, -2.4], [3.8, -0.6], [-2.4, 0.4]]) spot(x, z, H, 0.07);
  lights({ hemi: 1.5, extent: 9, points: [{ c: 0xffb24a, i: 5, d: 8, pos: [-1, 1.2, 0.8] }, { c: 0xfff0dc, i: 12, d: 10, pos: [0, 2.8, -1] }] });
  return { ...s, nome: 'Academia', start: [0, 2.6], yaw: 0, photo: { x: -4.6, z: 3.3, y: 1.55, yaw: -0.62, pitch: -0.05, fov: 70 }, tour: [[0, 2.6], [0, -0.6], [-3.4, 0.6], [2.8, 2.4], [0, 2.6]] };
}

/* ---------- COWORKING ---------- */
export function coworking() {
  const W = 8, D = 6.5, H = 2.9, s = shell(W, D, H, tileM(W, D, '#bdbbb6'), ceilMat(0x7f8449, 0x3c3f22));
  const olive = TM(T.plaster(W / 2, H / 2, '#8b9246', '#7d8440', '#9aa150'));
  wall('x', -D / 2, -W / 2, W / 2, H, olive, [{ a: -0.6, b: 0.9, y0: 0.95, y1: 2.2, panes: 2 }]); wall('x', D / 2, -W / 2, W / 2, H, M(0xe6e3dd));
  wall('z', -W / 2, -D / 2, D / 2, H, TM(T.slats(3, 1))); wall('z', W / 2, -D / 2, D / 2, H, TM(T.confete(2, 1, '#e8eef3')));
  plane(3.2, 0.7, new THREE.MeshBasicMaterial({ map: T.sign('COWORKING', null, '#16161a', 512, 112), transparent: true }), -W / 2 + 0.13, 1.9, -1.3, Math.PI / 2);
  plane(5.4, 0.1, BASIC(0xd4e34a), 0, 2.15, -D / 2 + 0.11);
  view(T.jardim(), 0, 1.7, -4.6, 0, 6, 2.6);
  // bancadas cinza + cadeiras azuis
  table(-3.3, -0.2, 0.7, 4.6, 0.76, M(0x8f9296), 0x8f9296); table(3.4, 0.4, 0.7, 4.8, 0.76, M(0x8f9296), 0x8f9296); box(3.5, 0.4, 0.4, 4.0, 0.05, 0x8f9296, 1.5);
  box(0.2, -D / 2 + 0.3, 2.0, 0.5, 0.3, 0x3b9aa8, 0, { solid: true });
  for (const z of [-1.8, -0.2, 1.6]) eamesChair(-2.55, z, -Math.PI / 2, 0x3a78c4, 0.46); for (const z of [-1.4, 0.8, 2.4]) eamesChair(2.65, z, Math.PI / 2, 0x3a78c4, 0.46);
  roundTable(0.3, -1.6, { r: 0.5, plant: false, top: M(0x2a2b30), leg: 0x15171a, chairs: 2, eames: true, chairColor: 0x3a78c4 });
  led(0, 0.4, 0.09, 4.5, H - 0.03);
  lights({ hemi: 2.0, extent: 8, points: [{ c: 0xfff0d0, i: 8, d: 9, pos: [0, 2.5, 0] }] });
  return { ...s, nome: 'Coworking', start: [0, 2.2], yaw: 0, photo: { x: -3.0, z: 2.8, y: 1.5, yaw: -0.5, pitch: -0.03, fov: 66 }, tour: [[0, 2.2], [0, 0], [-1.7, -1], [1.8, 1.5], [0, 2.2]] };
}

/* ---------- MINI MARKET ---------- */
export function miniMarket() {
  const W = 8, D = 6, H = 3, s = shell(W, D, H, tileM(W, D, '#e4e2de'), ceilMat(0x2a2b2f, 0x131316));
  wall('x', -D / 2, -W / 2, W / 2, H, M(0x2c2c30)); wall('z', -W / 2, -D / 2, D / 2, H, TM(T.brick(D / 2, H / 2))); wall('z', W / 2, -D / 2, D / 2, H, M(0x2c2c30)); wall('x', D / 2, -W / 2, W / 2, H, M(0x2c2c30));
  for (const [t, x, w] of [['BEBIDAS', -1.6, 1.8], ['VEGETAIS', 1.9, 2.8]]) plane(w, 0.55, new THREE.MeshBasicMaterial({ map: T.sign(t, null, '#e9e6df', 512, 128), transparent: true }), x, 2.35, -D / 2 + 0.12);
  for (let i = 0; i < 3; i++) { box(-3.2 + i * 0.75, -D / 2 + 0.25, 0.65, 0.4, 2.0, 0x16171a, 0, { solid: true }); box(-3.2 + i * 0.75, -D / 2 + 0.47, 0.5, 0.02, 1.7, BASIC(0xbfe0e8), 0.12, { cast: false }); }
  productShelf(0.6, -D / 2 + 0.3, 2.0, 2.1, 0.4, 0, 5, 1); productShelf(2.9, -D / 2 + 0.3, 2.0, 2.1, 0.4, 0, 5, 7);
  box(0.3, 0.8, 1.6, 0.9, 0.98, 0xd6232a, 0, { solid: true }); box(0.3, 0.8, 1.7, 1.0, 0.07, COL.WHITE, 0.98);
  roundTable(-2.7, 0.6, { r: 0.4, plant: false, top: M(0xefece5), leg: 0xefece5, chairs: 2, chairColor: 0xe9e6df, eames: true });
  box(0, -0.4, 5.8, 0.05, 0.05, 0x0d0d0f, H - 0.12, { cast: false }); box(0, 1.4, 5.8, 0.05, 0.05, 0x0d0d0f, H - 0.12, { cast: false });
  for (let i = 0; i < 6; i++) { const x = -2.6 + i * 1.05; box(x, i % 2 ? 1.4 : -0.4, 0.12, 0.2, 0.12, 0x0d0d0f, H - 0.3); spot(x, i % 2 ? 1.4 : -0.4, H, 0.06); }
  cyl(1.9, 1.7, 0.2, 0.35, 0xd6232a, 0, { seg: 10 });
  lights({ hemi: 1.9, extent: 8, points: [{ c: 0xfff0d8, i: 10, d: 9, pos: [0, 2.6, 0.4] }] });
  return { ...s, nome: 'Mini market', start: [0, 2.2], yaw: 0, photo: { x: 3.0, z: 2.6, y: 1.5, yaw: 0.55, pitch: -0.03, fov: 66 }, tour: [[0, 2.2], [0, 1.9], [-2.5, 0.8], [2, 0.8], [0, 2.2]] };
}

/* ---------- SALÃO DE JOGOS ---------- */
export function salaoJogos() {
  const W = 9, D = 6.5, H = 3, s = shell(W, D, H, woodM(W, D, '#d2a56b'), ceilMat(0xd8d5cf, 0x66645f));
  wall('x', -D / 2, -W / 2, W / 2, H, TM(T.cards(3, 1)), [{ a: -3.6, b: -0.8, y0: 0, y1: 2.4, panes: 2 }, { a: 0.4, b: 1.9, y0: 0, y1: 2.4, panes: 1 }]);
  wall('z', -W / 2, -D / 2, D / 2, H, TM(T.cards(2, 1))); wall('x', D / 2, -W / 2, W / 2, H, M(0xe6e3dd)); wall('z', W / 2, -D / 2, D / 2, H, TM(T.stripes(2.5, 1)));
  view(T.predios(), 0, 2, -5.6, 0, 20, 4);
  box(-0.6, 0.6, 2.3, 1.2, 0.18, 0x1a1b1f, 0.62, { solid: true }); box(-0.6, 0.6, 2.1, 1.0, 0.04, 0x2f8a3c, 0.78);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(-0.6 + sx * 1.0, 0.6 + sz * 0.45, 0.14, 0.14, 0.62, 0x1a1b1f);
  for (let i = 0; i < 6; i++) sph(0.15 + (i % 3) * 0.07, 0.82, 0.55 + Math.floor(i / 3) * 0.07, 0.03, [0xf0c23a, 0xd6453a, 0x4a7fb5, 0x3c9a52, 0xe58a2e, 0x7a4ab5][i]);
  box(2.9, -1.0, 1.4, 0.75, 0.2, 0x1a1b1f, 0.75, { solid: true }); box(2.9, -1.0, 1.55, 0.08, 0.2, 0x8a8f96, 1.0); for (let i = 0; i < 4; i++) box(2.9, -1.2 + i * 0.13, 1.6, 0.03, 0.03, 0x9aa0a8, 1.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(2.9 + sx * 0.6, -1.0 + sz * 0.3, 0.1, 0.1, 0.75, 0x1a1b1f);
  box(3.2, 1.9, 2.6, 1.4, 0.05, 0x2c4d8a, 0.74, { solid: true }); box(3.2, 1.9, 0.03, 1.4, 0.15, COL.WHITE, 0.79); box(3.2, 1.9, 2.5, 0.03, 0.03, COL.WHITE, 0.8);
  for (const sx of [-1, 1]) box(3.2 + sx * 1.1, 1.9, 0.08, 1.2, 0.72, 0xdfe3e8);
  led(2.6, -1.6, 0.09, 5, H - 0.03); spot(-1.5, 1.5, H); spot(1.5, 1.2, H);
  lights({ hemi: 1.9, extent: 9, points: [{ c: 0xfff0d8, i: 10, d: 9, pos: [0, 2.6, 0.5] }] });
  return { ...s, nome: 'Salão de jogos', start: [-0.5, 2.5], yaw: 0, photo: { x: -3.6, z: 2.8, y: 1.55, yaw: -0.5, pitch: -0.05, fov: 66 }, tour: [[-0.5, 2.5], [-0.6, -1.0], [2.2, -0.2], [1.6, 2.4], [-0.5, 2.5]] };
}

/* ---------- LAVANDERIA ---------- */
export function lavanderia() {
  const W = 8, D = 5.6, H = 3, s = shell(W, D, H, tileM(W, D, '#bfbdb8'), ceilMat(0x2b3240, 0x151a22));
  const navy = TM(T.plaster(W / 2, H / 2, '#33465c', '#2c3d52', '#3a4f68'));
  wall('x', -D / 2, -W / 2, W / 2, H, navy); wall('x', D / 2, -W / 2, W / 2, H, navy); wall('z', -W / 2, -D / 2, D / 2, H, TM(T.brick(D / 2.2, H / 2.2))); wall('z', W / 2, -D / 2, D / 2, H, TM(T.brick(D / 2.2, H / 2.2)));
  box(-1.6, -D / 2 + 0.14, 0.9, 0.12, H, TM(T.slats(0.6, 1.2)), 0);
  plane(2.6, 0.6, new THREE.MeshBasicMaterial({ map: T.sign('LAVANDERIA', null, '#2b2320', 512, 128), transparent: true }), W / 2 - 0.12, 1.9, 0.6, -Math.PI / 2);
  for (const [i, c] of [[0, 0x6fb7c9], [1, 0xe9e4d8], [2, 0xd7ccb8]]) box(-W / 2 + 0.13, -1.3 + i * 0.75, 0.04, 0.6, 0.8, c, 1.1);
  shelf(-W / 2 + 0.2, 2.15, 0.2, 0.3, 4.2, 0x2a2b30); shelf(W / 2 - 0.2, 2.1, 0.8, 0.3, 4.2, 0x2a2b30); shelfItems(-1.4, 1.6, 2.2, 0.2, 5, 12); // (ao longo de z)
  box(-2.6, -D / 2 + 0.4, 0.7, 0.7, 0.85, COL.WHITE, 0, { solid: true }); box(-2.6, -D / 2 + 0.4, 0.7, 0.7, 0.85, COL.WHITE, 0.85, { solid: true });
  cyl(-2.6, -D / 2 + 0.77, 0.22, 0.04, 0x9aa0a8, 0.35, { seg: 16 }).rotation.x = Math.PI / 2; cyl(-2.6, -D / 2 + 0.77, 0.22, 0.04, 0x9aa0a8, 1.2, { seg: 16 }).rotation.x = Math.PI / 2;
  counter(-W / 2 + 0.55, 0.7, 0.8, 4.4, 0.9, 0x2a2b30, 0x1a1b1f); counter(W / 2 - 0.5, 0.8, 0.8, 4.6, 0.9, 0x2a2b30, 0x1a1b1f);
  for (let i = 0; i < 3; i++) { cyl(W / 2 - 0.7, -0.6 + i * 1.3, 0.025, 0.4, 0xaeb4ba, 0.9, { seg: 6 }); box(W / 2 - 0.62, -0.6 + i * 1.3, 0.3, 0.03, 0.03, 0xaeb4ba, 1.28); box(W / 2 - 0.6, -0.6 + i * 1.3, 0.5, 0.4, 0.04, 0xc7ccd1, 0.92); }
  for (const [x, z] of [[-2.8, 1.8], [-2.2, 2.2]]) cyl(x, z, 0.3, 0.45, 0x9a7a52, 0, { seg: 12, r2: 0.34 });
  for (const [x, z] of [[2.4, 2.2], [3.0, 1.8], [2.7, 2.5]]) cyl(x, z, 0.22, 0.7, 0x24374f, 0, { seg: 10, r2: 0.28 });
 led(0, 0.2, 0.09, 4.5, H - 0.03); led(-1.2, 0.2, 2.5, 0.09, H - 0.03);
  lights({ hemi: 1.9, extent: 8, points: [{ c: 0xffe0b8, i: 9, d: 9, pos: [0, 2.6, 0.5] }] });
  return { ...s, nome: 'Lavanderia', start: [0, 1.8], yaw: 0, photo: { x: 3.0, z: 2.3, y: 1.5, yaw: 0.45, pitch: -0.03, fov: 68 }, tour: [[0, 1.8], [0, -0.6], [-2, 0.6], [2, 0.4], [0, 1.8]] };
}

/* ---------- BRINQUEDOTECA ---------- */
export function brinquedoteca() {
  const W = 7, D = 6, H = 3, s = shell(W, D, H, woodM(W, D, '#d2a56b'), ceilMat(0x4fb39c, 0x1e5446));
  wall('x', -D / 2, -W / 2, W / 2, H, M(0xf0eee8)); wall('z', -W / 2, -D / 2, D / 2, H, TM(T.alphabet(D / 2, H / 2)), [{ a: -2.2, b: 1.2, y0: 0.2, y1: 2.5, panes: 2 }]);
  wall('z', W / 2, -D / 2, D / 2, H, TM(T.stripes(D, 1.5)), [{ a: 1.0, b: 2.7, y0: 0.9, y1: 2.4, panes: 1 }]); wall('x', D / 2, -W / 2, W / 2, H, M(0xf0eee8));
  view(T.jardim(), -6, 1.7, 0, Math.PI / 2, 14, 3.4);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { box(-1.7 + c * 0.55, -D / 2 + 0.3, 0.5, 0.42, 0.45, [0xf0c23a, 0xe58aa8, 0x8a5ab5, 0x4fb39c, 0xf0c23a, 0xe58aa8][(c + r) % 6], 0.55 + r * 0.5); }
  box(0.3, -D / 2 + 0.3, 3.4, 0.45, 0.5, 0xeceae4, 0, { solid: true });
  for (const x of [-1.2, -0.3, 0.6]) box(x, -D / 2 + 0.55, 0.3, 0.3, 0.12, [0xcf3a3a, 0x4a7fb5, 0xf0c23a][Math.floor(rnd(x) * 3)], 0.55 + 0.5 * 2 + 0.45);
  for (const x of [0.5, 1.5, 2.5]) pouf(x, -D / 2 + 0.9, 0xf0e33a, 0.28);
  const tw = M(0xf6f6f4, { roughness: 0.4 });                                            // mesa branca em curva
  for (const [x, z, r] of [[-0.6, 0.9, 0.7], [0.3, 0.7, 0.62], [1.2, 0.9, 0.7]]) { cyl(x, z, r, 0.05, tw, 0.5, { seg: 22 }); }
  for (const [x, z] of [[-1.1, 1.1], [1.7, 1.0], [0.3, 0.2]]) cyl(x, z, 0.03, 0.5, 0xe6d3b0, 0, { seg: 6 }); solid(0.3, 0.8, 1.5, 0.7);
  for (let i = 0; i < 9; i++) box(-0.4 + i * 0.18, 0.6 + Math.sin(i) * 0.15, 0.03, 0.18, 0.03, [0xe8453a, 0x4a9ad0, 0xf0c23a, 0x3c9a52][i % 4], 0.55, { ry: i });
  for (const [x, z, c] of [[-1.9, 1.8, 0xe8c9e8], [2.1, 1.9, 0x8fd3d0], [0.4, 2.1, 0xf0c3d8]]) { cyl(x, z, 0.3, 0.45, c, 0, { seg: 14, r2: 0.28 }); }
  for (let i = 0; i < 6; i++) box(-0.9 + (i % 2) * 0.55, 1.9 + Math.floor(i / 2) * 0.5, 0.5, 0.5, 0.01, [0x4a9ad0, 0xf0c23a, 0xe58aa8][i % 3], 0.01, { cast: false });
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), M([0x4fb39c, 0x9fe0cf][i % 2])); t.rotation.set(Math.PI, 0, 0); t.position.set(-2.6 + i * 1.05, H - 0.5, -D / 2 + 0.2); ctx.room.add(t); }
  led(0, -2.2, 3, 0.09, H - 0.03); led(2.2, 0, 0.09, 4, H - 0.03);
  lights({ hemi: 2.0, extent: 8, points: [{ c: 0xfff0d0, i: 9, d: 9, pos: [0, 2.6, 0.5] }] });
  return { ...s, nome: 'Brinquedoteca', start: [0, 2.3], yaw: 0, photo: { x: -2.9, z: 2.6, y: 1.3, yaw: -0.55, pitch: -0.12, fov: 70 }, tour: [[0, 2.3], [-1.8, 0.2], [2, 0.4], [0, 2.3]] };
}
