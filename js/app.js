import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =====================================================================
   DADOS — tirados do Book Life Residence
   p.37 (implantação): posição, orientação, numeração das unidades, tipo
   de torre, etapa e finais "com possibilidade de adaptação" de cada bloco.
   p.38 (memorial): terreno 38.166,78 m², 44 blocos × 20 unidades.
   Coordenadas abaixo estão em pixels da implantação; a escala S (m/px)
   foi calibrada pela área do terreno.
   FICTÍCIO: preço e status. SUPOSIÇÃO: código = andar×100 + final.
   ===================================================================== */
const S = 0.22687, OX = 1040, OY = 350;
const wx = p => (p - OX) * S, wz = p => (p - OY) * S;

// ordem dos finais nos quadrantes [sup-esq, sup-dir, inf-esq, inf-dir]
const PA = [1,2,4,3], PB = [3,4,2,1], PC = [4,1,3,2], PD = [2,3,1,4];
const BL = []; // {n, px, py, o:'H'|'V', pat, tipo, etapa, adapt}
const add = (n, px, py, o, pat, tipo, etapa, adapt = []) => BL.push({ n, px, py, o, pat, tipo, etapa, adapt });
add(1, 515, 550, 'V', PA, 'com', 1, [1, 3]);
[586,656,726,796,864,934,1032,1102,1170,1240,1308,1378].forEach((x, i) => add(i + 2, x, 550, 'V', i % 2 ? PA : PB, 'sem', 1));
add(14, 1446, 281, 'H', PC, 'com', 2, [2]);
add(15, 1431, 364, 'V', PB, 'com', 2, [4]);
add(16, 1346, 381, 'H', PD, 'com', 1, [4]);
add(17, 1366, 297, 'V', PA, 'sem', 2);
add(18, 1280, 281, 'H', PC, 'com', 2, [4, 2]);
add(19, 1263, 364, 'V', PB, 'sem', 1);
add(20, 1177, 381, 'H', PD, 'com', 1, [2, 4]);
add(21, 1198, 297, 'V', PA, 'sem', 2);
add(22, 1113, 281, 'H', PC, 'com', 2, [1, 3]);
add(23, 1096, 364, 'V', PA, 'com', 1, [1, 4]);
add(24, 951, 298, 'V', PB, 'com', 2, [3, 1]);
add(25, 933, 381, 'H', PD, 'com', 1, [3, 1]);
add(26, 867, 281, 'H', PC, 'com', 2, [4, 2]);
add(27, 851, 364, 'V', PB, 'sem', 1);
add(28, 764, 381, 'H', PD, 'com', 1, [3, 1]);
add(29, 784, 297, 'V', PA, 'sem', 2);
add(30, 699, 280, 'H', PC, 'com', 2, [4, 2]);
add(31, 682, 364, 'V', PB, 'sem', 1);
add(32, 596, 381, 'H', PD, 'com', 1, [2, 4]);
add(33, 617, 296, 'V', PA, 'sem', 1);
add(34, 531, 280, 'H', PC, 'sem', 1);
add(35, 514, 364, 'V', PA, 'com', 1, [2, 4]);
for (let i = 0; i < 9; i++) add(36 + i, 635 + i * 100.9, 127, 'H', PD, 'garden', 2);
BL.sort((a, b) => a.n - b.n);
const blockBy = {}; BL.forEach(b => blockBy[b.n] = b);

const FLOORS = 5, BH = 3, HT = FLOORS * BH;
const WL = 8.4, WW = 12.5, CORE = 3, HALF = WL + CORE / 2; // ala 8,4 × 12,5 m; bloco 19,8 × 12,5 m
const PRECO_BASE = 169990;
const PLANTAS = { com: 'img/planta-com.jpg', sem: 'img/planta-sem.jpg' };
const TIPO = { com: 'Com varanda', sem: 'Sem varanda', garden: 'Garden (térreo)' };
const AREA = { com: 40.31, sem: 37.93, garden: 37.93 };
const STATUS_COR = { 'Disponível': '#2f7a55', 'Reservado': '#b5562f', 'Vendido': '#5f6b78' };

function rnd(seed){ const x = Math.sin(seed * 999.13) * 10000; return x - Math.floor(x); }

const units = [];
for (const b of BL)
  for (let f = 1; f <= FLOORS; f++)
    for (let q = 0; q < 4; q++) {
      const u = b.pat[q];
      const typ = b.tipo === 'garden' ? (f === 1 ? 'garden' : 'sem') : b.tipo;
      const code = f * 100 + u;
      const r = rnd(b.n * 1000 + code);
      const status = r < 0.55 ? 'Disponível' : r < 0.8 ? 'Reservado' : 'Vendido';
      const price = PRECO_BASE + (f - 1) * 4000 + (typ === 'com' ? 12000 : 0)
                  + (typ === 'garden' ? 25000 : 0) + Math.round(rnd(b.n + code) * 3000);
      units.push({ block: b.n, floor: f, q, u, code, typ, status, price, etapa: b.etapa, adapt: b.adapt.includes(u) });
    }
units.sort((a, b) => a.block - b.block || a.code - b.code);
const N = units.length;
const minP = Math.min(...units.map(x => x.price));
const maxP = Math.max(...units.map(x => x.price));
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/* Geometria de uma unidade dentro do bloco */
function unitFrame(un) {
  const b = blockBy[un.block], bx = wx(b.px), bz = wz(b.py);
  const c = un.q % 2 === 0 ? -1 : 1, r = un.q < 2 ? -1 : 1;
  const m = CORE / 2 + WL / 2;
  if (b.o === 'H') return {
    cx: bx + c * m, cz: bz + r * WW / 4, sx: WL, sz: WW / 2,
    end: { x: bx + c * HALF, z: bz + r * WW / 4, nx: c, nz: 0 },
    side: { x: bx + c * m, z: bz + r * WW / 2, nx: 0, nz: r }
  };
  return {
    cx: bx + c * WW / 4, cz: bz + r * m, sx: WW / 2, sz: WL,
    end: { x: bx + c * WW / 4, z: bz + r * HALF, nx: 0, nz: r },
    side: { x: bx + c * WW / 2, z: bz + r * m, nx: c, nz: 0 }
  };
}

/* ---------- Renderer e cena ---------- */
const main = document.getElementById('main');
const mq = matchMedia('(max-width:700px)');
const isMobile = () => mq.matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  document.getElementById('err').style.display = 'flex';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
main.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.setAttribute('aria-label', 'Maquete 3D do Life Residence. Use os filtros ou a aba Lista para encontrar unidades.');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e7df);
scene.fog = new THREE.Fog(0xe9e7df, 1100, 2600);

const camera = new THREE.PerspectiveCamera(38, 1, 2, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 25;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.maxDistance = 1500;

let camGoal = null;
function homeView(animate) {
  const w = main.clientWidth || 1, h = main.clientHeight || 1, aspect = w / h;
  const vf = THREE.MathUtils.degToRad(19), hf = Math.atan(Math.tan(vf) * aspect);
  let dir, dist;
  if (aspect < 0.95) {
    // tela em pé: gira a vista para o lado comprido do terreno ficar na vertical
    dir = new THREE.Vector3(-0.5, 0.85, 0.06).normalize();
    dist = Math.max(150 / Math.tan(vf), 68 / Math.tan(hf));
  } else {
    dir = new THREE.Vector3(-0.12, 0.8, 0.62).normalize();
    dist = Math.max(200 / Math.tan(hf), 95 / Math.tan(vf));
  }
  dist = THREE.MathUtils.clamp(dist, 260, 880);
  const target = new THREE.Vector3(aspect < 0.95 ? 8 : 0, 0, 6);
  const pos = target.clone().add(dir.multiplyScalar(dist));
  if (animate) camGoal = { pos, target };
  else { camera.position.copy(pos); controls.target.copy(target); }
}
let lastAspectPortrait = null;
function resize() {
  const w = main.clientWidth, h = main.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // girou o aparelho e nada está selecionado: reenquadra
  const portrait = w / h < 0.95;
  if (lastAspectPortrait !== null && portrait !== lastAspectPortrait && !selected) homeView(true);
  lastAspectPortrait = portrait;
}
new ResizeObserver(resize).observe(main);
resize();
homeView(false);
controls.addEventListener('start', () => { camGoal = null; document.getElementById('hint').classList.add('off'); });

scene.add(new THREE.HemisphereLight(0xfffaf0, 0xc9c2b0, 1.45));
const sun = new THREE.DirectionalLight(0xfff1dc, 1.9);
sun.position.set(-140, 230, 150); // coerente com as sombras pintadas no piso
scene.add(sun);

/* =====================================================================
   PISO — toda a implantação é pintada num único canvas (uma textura só).
   Sem camadas sobrepostas => sem z-fighting / cintilação.
   ===================================================================== */
const GX0 = 195, GY0 = 60, GW = 1690, GH = 580;
const TEXW = Math.min(isMobile() ? 3072 : 4096, renderer.capabilities.maxTextureSize);
const K = TEXW / GW;
const gc = document.createElement('canvas');
gc.width = TEXW; gc.height = Math.round(GH * K);
const g = gc.getContext('2d');
g.setTransform(K, 0, 0, K, -GX0 * K, -GY0 * K);

const occ = [];      // retângulos ocupados (px) — árvores não nascem aqui
const stalls = [];   // vagas de estacionamento {x, y, rot}
const R = (x0, y0, x1, y1, color, mark = true) => {
  g.fillStyle = color; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (mark) occ.push([x0, y0, x1, y1]);
};
const circle = (x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
function smooth(pts, closed) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath();
  if (closed) {
    const s = mid(pts[n - 1], pts[0]); g.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    g.closePath();
  } else {
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    g.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
function track(pts, closed, w) { // pista emborrachada vermelha com eixo tracejado
  smooth(pts, closed);
  g.lineJoin = g.lineCap = 'round';
  g.strokeStyle = '#b8382c'; g.lineWidth = w; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = w * 0.09; g.setLineDash([3, 3]); g.stroke(); g.setLineDash([]);
}
const SITE = [[342,88],[1618,88],[1618,341],[1865,341],[1865,603],[300,603],[300,180]];
const sitePath = () => { g.beginPath(); SITE.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };

// entorno
g.fillStyle = '#e2e0d6'; g.fillRect(GX0, GY0, GW, GH);
for (let i = 0; i < 5000; i++) { g.fillStyle = ['#dad8cd', '#e7e5db', '#dddbd0'][i % 3]; g.fillRect(GX0 + Math.random() * GW, GY0 + Math.random() * GH, 1.6, 1.6); }
// Rua Rubens Francisco Dias (oeste): asfalto, ciclovia e calçada
R(200, GY0, 246, GY0 + GH, '#bdbcb5', false);
R(246, GY0, 260, GY0 + GH, '#d08a8f', false);
R(260, GY0, 300, GY0 + GH, '#cfd0d0', false);
g.strokeStyle = '#f2e9b0'; g.lineWidth = 0.9; g.setLineDash([9, 9]);
g.beginPath(); g.moveTo(223, GY0); g.lineTo(223, GY0 + GH); g.stroke(); g.setLineDash([]);
g.strokeStyle = '#fff'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(253, GY0); g.lineTo(253, GY0 + GH); g.stroke();

// gramado do terreno
g.save(); sitePath(); g.clip();
g.fillStyle = '#a3bd80'; g.fillRect(GX0, GY0, GW, GH);
for (let i = 0; i < 26000; i++) {
  g.fillStyle = ['#97b375', '#abc78a', '#9db97a', '#b2cb91'][i % 4];
  g.fillRect(300 + Math.random() * 1570, 85 + Math.random() * 520, 1.3, 1.3);
}
g.restore();

// vias internas (piso intertravado)
const ROAD = '#cfccc3';
const ROADS = [[422,188,1607,220],[422,441,1607,474],[422,188,455,603],[300,470,455,512],[530,96,556,190],
 [1012,220,1040,441],[1440,474,1466,601],[1511,94,1537,603],[1580,94,1606,603],[1511,92,1606,108]];
ROADS.forEach(r => R(r[0], r[1], r[2], r[3], ROAD));
// juntas do intertravado (só dentro das vias)
g.save(); g.beginPath(); ROADS.forEach(r => g.rect(r[0], r[1], r[2] - r[0], r[3] - r[1])); g.clip();
g.globalAlpha = 0.10; g.strokeStyle = '#000'; g.lineWidth = 0.25;
for (let y = 90; y < 605; y += 2.2) { g.beginPath(); g.moveTo(300, y); g.lineTo(1610, y); g.stroke(); }
g.restore();
// estacionamentos
function parking(x0, y0, x1, y1) {
  R(x0, y0, x1, y1, '#dcd7c6');
  const horiz = (x1 - x0) > (y1 - y0);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.45;
  const L = horiz ? x1 - x0 : y1 - y0, n = Math.floor(L / 11), st = L / n;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    if (horiz) { g.moveTo(x0 + i * st, y0); g.lineTo(x0 + i * st, y1); }
    else { g.moveTo(x0, y0 + i * st); g.lineTo(x1, y0 + i * st); }
    g.stroke();
    if (i < n) stalls.push(horiz
      ? { x: x0 + (i + 0.5) * st, y: (y0 + y1) / 2, rot: Math.PI / 2 }
      : { x: (x0 + x1) / 2, y: y0 + (i + 0.5) * st, rot: 0 });
  }
}
[[590,168,1500,188],[472,220,1000,241],[1052,220,1500,241],[472,420,1000,441],[1052,420,1436,441],
 [472,474,950,494],[1015,474,1400,494],[400,205,422,430],[455,225,476,436],[455,490,476,598],
 [991,246,1012,432],[1040,246,1061,432],[1540,112,1578,430],[1540,486,1578,600],[1490,246,1511,414],
 [1420,480,1440,596],[1466,480,1487,596]].forEach(p => parking(...p));

// caminhos de pedestre até a caixa de escada de cada bloco
g.strokeStyle = '#d9d6cc'; g.lineWidth = 3.2; g.lineCap = 'butt';
const link = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
link(480, 507, 1410, 507); link(480, 407, 1500, 407); link(480, 253, 1500, 253); link(590, 160, 1490, 160);
BL.forEach(b => {
  if (b.py > 500) link(b.px, 507, b.px, b.py);
  else if (b.py < 200) link(b.px, b.py, b.px, 160);
  else if (b.py < 320) link(b.px, 253, b.px, b.py);
  else link(b.px, b.py, b.px, 407);
});

// gardens (térreo dos blocos 36–44)
BL.filter(b => b.tipo === 'garden').forEach(b => {
  for (const c of [-1, 1]) for (const r of [-1, 1]) {
    const x = b.px + c * 25, y = b.py + r * 36;
    g.fillStyle = '#9ccf7a'; g.fillRect(x - 17, y - 8, 34, 16);
    g.strokeStyle = '#5c8a47'; g.lineWidth = 0.8; g.strokeRect(x - 17, y - 8, 34, 16);
  }
});

// praças dos encontros (35)
[[563,330],[731,330],[898,330],[1145,330],[1311,330]].forEach(([x, y]) => {
  R(x - 14, y - 14, x + 14, y + 14, '#d9b592'); circle(x, y, 7, '#c79a72'); circle(x, y, 3.5, '#7fa55b');
});
// praça do refúgio + pergolado (37, 34)
R(1460, 318, 1487, 410, '#d9b592'); smooth([[1473,322],[1466,345],[1480,368],[1468,392],[1474,408]], false);
g.strokeStyle = '#86b266'; g.lineWidth = 7; g.stroke();
// mini market / bicicletário / coworking (19, 33, 18)
R(958, 494, 1008, 601, '#d9b592'); circle(985, 540, 9, '#86b266');

/* ---- Lazer 01 (faixa oeste) ---- */
occ.push([300, 88, 402, 460], [402, 88, 530, 170], [300, 540, 402, 603]);
R(300, 452, 402, 542, '#c9a58c', false);                    // acesso em piso colorido
R(300, 470, 422, 512, ROAD, false);
g.fillStyle = '#fff'; for (let y = 472; y < 511; y += 4) g.fillRect(362, y, 14, 2); // faixa de pedestres
circle(411, 491, 10, '#c9a58c'); circle(411, 491, 7.5, '#86b266');                 // rotatória
R(322, 545, 400, 600, '#bdbcb8', false);                    // pátio técnico (gás / caixa d'água)
// piscina (05, 06, 07, 08)
R(318, 213, 399, 332, '#e6dfd0', false);
g.strokeStyle = '#d2cab8'; g.lineWidth = 0.3;
for (let x = 318; x < 399; x += 4) { g.beginPath(); g.moveTo(x, 213); g.lineTo(x, 332); g.stroke(); }
R(330, 262, 345, 298, '#bfe8ee', false);                    // deck molhado
R(343, 225, 366, 316, '#2fb4d8', false);                    // piscina adulto
R(368, 292, 386, 313, '#6fd3e6', false);                    // piscina infantil
g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.3;
for (let y = 225; y < 316; y += 3) { g.beginPath(); g.moveTo(343, y); g.lineTo(366, y); g.stroke(); }
g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(343, 225, 23, 91); g.strokeRect(368, 292, 18, 21);
// parque infantil (12) e pista infantil (42)
smooth([[336,170],[372,160],[398,178],[392,206],[360,212],[334,200]], true); g.fillStyle = '#8fc46a'; g.fill();
['#f2a33a', '#e05a5a', '#4aa3df', '#f6d24a', '#b56acf', '#ffffff'].forEach((c, i) => {
  for (let k = 0; k < 7; k++) circle(342 + rnd(i * 9 + k) * 50, 168 + rnd(i * 5 + k + 40) * 38, 2 + rnd(k + i) * 1.6, c);
});
track([[322,205],[318,180],[338,158],[372,152],[402,160],[430,150],[452,138],[470,120],[460,104],[443,110],[440,128],[420,142],[396,150]], false, 5);
R(408, 90, 458, 112, '#c9a06f', false);                     // pet play
R(418, 120, 448, 147, '#9ccf7a', false);                    // futmesa

/* ---- Lazer 02 (anexo leste) ---- */
occ.push([1610, 341, 1867, 605]);
g.save(); g.beginPath(); g.rect(1618, 341, 247, 262); g.clip();
g.fillStyle = '#dcb48f'; g.fillRect(1618, 341, 247, 262);
// canteiros
[[1640,372,16],[1668,420,13],[1650,462,11],[1846,470,13],[1850,530,12],[1760,470,18],[1700,480,10],[1838,585,12]].forEach(([x, y, r]) => circle(x, y, r, '#86b266'));
// praça do esporte: círculos rosa
[[1631,398,15],[1662,444,12]].forEach(([x, y, r]) => { circle(x, y, r, '#e9a3bd'); circle(x, y, r * 0.62, '#dcb48f'); circle(x, y, r * 0.38, '#86b266'); });
for (let i = 0; i < 26; i++) circle(1622 + rnd(i + 7) * 48, 410 + rnd(i + 70) * 62, 1.6 + rnd(i) * 1.8, i % 2 ? '#e9a3bd' : '#f2c14e');
// parque aventura (28)
smooth([[1700,430],[1740,428],[1750,452],[1722,464],[1698,452]], true); g.fillStyle = '#8fc46a'; g.fill();
for (let i = 0; i < 16; i++) circle(1702 + rnd(i + 3) * 44, 432 + rnd(i + 33) * 28, 1.8, ['#f2a33a', '#4aa3df', '#e05a5a', '#f6d24a'][i % 4]);
// quadras de areia (27)
g.fillStyle = '#eadfc3'; g.fillRect(1678, 358, 171, 66);
for (let i = 0; i < 3500; i++) { g.fillStyle = ['#dccfae', '#f4ecd6', '#e2d6b6'][i % 3]; g.fillRect(1678 + Math.random() * 171, 358 + Math.random() * 66, 0.9, 0.9); }
g.strokeStyle = '#fff'; g.lineWidth = 0.7;
[1722, 1806].forEach(cx => { g.strokeRect(cx - 35, 391 - 17.5, 70, 35); g.beginPath(); g.moveTo(cx, 373.5); g.lineTo(cx, 408.5); g.stroke(); });
// quadra poliesportiva (26)
g.fillStyle = '#2c6c70'; g.fillRect(1688, 505, 124, 74);
g.fillStyle = '#d8437f'; g.fillRect(1696, 512, 108, 60);
g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.strokeRect(1696, 512, 108, 60);
g.beginPath(); g.moveTo(1750, 512); g.lineTo(1750, 572); g.stroke();
g.beginPath(); g.arc(1750, 542, 8, 0, 7); g.stroke();
[[1696, -1], [1804, 1]].forEach(([x, d]) => {
  g.fillStyle = '#2c6c70'; g.beginPath(); g.arc(x, 542, 22, d < 0 ? -Math.PI / 2 : Math.PI / 2, d < 0 ? Math.PI / 2 : 3 * Math.PI / 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(x - d * 0, 542, 8, d < 0 ? -Math.PI / 2 : Math.PI / 2, d < 0 ? Math.PI / 2 : 3 * Math.PI / 2); g.stroke();
});
// pista de cooper (30)
track([[1690,350],[1770,346],[1852,351],[1858,430],[1850,500],[1858,592],[1775,597],[1692,596],[1682,548],[1690,500],[1672,470],[1686,430],[1676,385]], true, 9);
g.restore();

/* ---- Sombras pintadas (substituem o shadow map) ---- */
const footprint = b => b.o === 'H' ? [HALF / S, WW / 2 / S] : [WW / 2 / S, HALF / S];
BL.forEach(b => { const [hx, hy] = footprint(b); occ.push([b.px - hx - 4, b.py - hy - 4, b.px + hx + 4, b.py + hy + 4]); });
g.save();
g.shadowColor = 'rgba(25,35,30,.30)'; g.shadowBlur = 4 * K; g.shadowOffsetX = 9 * K; g.shadowOffsetY = -11 * K;
g.fillStyle = 'rgba(25,35,30,.30)';
BL.forEach(b => { const [hx, hy] = footprint(b); g.fillRect(b.px - hx, b.py - hy, hx * 2, hy * 2); });
g.restore();
// faixa de sombra ligando o prédio à sombra projetada
g.fillStyle = 'rgba(25,35,30,.16)';
BL.forEach(b => {
  const [hx, hy] = footprint(b);
  g.beginPath(); g.moveTo(b.px - hx, b.py - hy); g.lineTo(b.px - hx + 9, b.py - hy - 11); g.lineTo(b.px + hx + 9, b.py - hy - 11);
  g.lineTo(b.px + hx + 9, b.py + hy - 11); g.lineTo(b.px + hx, b.py + hy); g.closePath(); g.fill();
});

/* ---- Árvores: sorteio fora das áreas ocupadas ---- */
const insideSite = (x, y) => (x > 306 && x < 1612 && y > 94 && y < 598) && !(x < 350 && y < 190);
const isOcc = (x, y, m) => occ.some(o => x > o[0] - m && x < o[2] + m && y > o[1] - m && y < o[3] + m);
const trees = [];
for (let t = 0; trees.length < 190 && t < 9000; t++) {
  const x = 306 + rnd(t * 3 + 1) * 1306, y = 94 + rnd(t * 7 + 2) * 504;
  if (!insideSite(x, y) || isOcc(x, y, 5)) continue;
  if (trees.some(o => (o.x - x) ** 2 + (o.y - y) ** 2 < 15 * 15)) continue;
  trees.push({ x, y, s: 2.3 + rnd(t + 5) * 1.5 });
}
[[1640,372],[1668,420],[1846,470],[1850,530],[1838,585],[1760,472],[1622,585],[1700,480],[985,540],[1473,340],[1472,398],
 [312,446],[312,548],[505,120],[515,160]].forEach(([x, y], i) => trees.push({ x, y, s: 2.4 + rnd(i) * 1.2 }));
const palms = [[325,232],[325,270],[325,310],[392,222],[392,326],[352,334],[411,491],[308,462],[308,522],
               [1650,462],[1631,398],[1662,444],[1722,470],[1846,440],[1690,340]].map(([x, y]) => ({ x, y }));
g.save(); g.shadowColor = 'rgba(25,35,30,.5)'; g.shadowBlur = 3 * K; g.fillStyle = 'rgba(25,35,30,.32)';
trees.forEach(t => { g.beginPath(); g.ellipse(t.x + 5, t.y - 6, t.s / S * 0.95, t.s / S * 0.8, -0.8, 0, 7); g.fill(); });
palms.forEach(t => { g.beginPath(); g.ellipse(t.x + 9, t.y - 11, 9, 7, -0.8, 0, 7); g.fill(); });
g.restore();

const groundTex = new THREE.CanvasTexture(gc);
groundTex.colorSpace = THREE.SRGBColorSpace;
groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW * S, GH * S), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0xe2e0d6, roughness: 1 }));
far.rotation.x = -Math.PI / 2; far.position.y = -0.6;
scene.add(far);

/* =====================================================================
   OBJETOS 3D
   ===================================================================== */
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const mWall = M(0xf3efe6), mCore = M(0xcfc8ba), mRoof = M(0xe4e0d7), mWhite = M(0xf4f4f2), mWood = M(0x8a5a36),
      mDark = M(0x2b323c), mLime = new THREE.MeshBasicMaterial({ color: 0xb5d334 }), mMetal = M(0x59626c, { metalness: 0.4, roughness: 0.5 }),
      mTerra = M(0xb5613c), mConc = M(0xbdbcb8), mOrange = M(0xe58a2e), mBlueWall = M(0x8794a3),
      mGlass = M(0x9fcde3, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6 }),
      mNet = new THREE.MeshBasicMaterial({ color: 0x7d8a96, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });

function box(x, z, w, d, h, mat, y = 0) { // x,z em metros (centro)
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  scene.add(m);
  return m;
}
const boxPx = (x0, y0, x1, y1, h, mat, y = 0) => box(wx((x0 + x1) / 2), wz((y0 + y1) / 2), (x1 - x0) * S, (y1 - y0) * S, h, mat, y);
function post(px, py, h, mat = mMetal, r = 0.09, y = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
  m.position.set(wx(px), y + h / 2, wz(py));
  scene.add(m);
  return m;
}
function pavilion(x0, y0, x1, y1, h, roofMat = mWhite, postMat = mWood) { // cobertura sobre pilares
  boxPx(x0 - 2, y0 - 2, x1 + 2, y1 + 2, 0.35, roofMat, h);
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) post(x, y, h, postMat, 0.16);
}
function building(x0, y0, x1, y1, h, wall, glassSide) { // volume + laje branca + faixa de vidro
  boxPx(x0, y0, x1, y1, h, wall);
  boxPx(x0 - 2, y0 - 2, x1 + 2, y1 + 2, 0.4, mWhite, h);
  if (!glassSide) return;
  const horiz = glassSide === 'N' || glassSide === 'S';
  const len = (horiz ? x1 - x0 : y1 - y0) * S * 0.8;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(len, h * 0.6), mGlass);
  const lit = new THREE.Mesh(new THREE.PlaneGeometry(len, h * 0.6), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
  const cx = wx((x0 + x1) / 2), cz = wz((y0 + y1) / 2);
  const p = { N: [cx, wz(y0), Math.PI, 0, -1], S: [cx, wz(y1), 0, 0, 1], W: [wx(x0), cz, -Math.PI / 2, -1, 0], E: [wx(x1), cz, Math.PI / 2, 1, 0] }[glassSide];
  lit.position.set(p[0] + p[3] * 0.06, h * 0.45, p[1] + p[4] * 0.06); lit.rotation.y = p[2];
  gl.position.set(p[0] + p[3] * 0.14, h * 0.45, p[1] + p[4] * 0.14); gl.rotation.y = p[2];
  scene.add(lit, gl);
  // caixilhos: montantes a cada ~1,5 m, travessa superior e inferior
  const along = horiz ? [1, 0] : [0, 1], n = Math.max(2, Math.round(len / 1.5));
  const bar = (w, hh, dx, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.09), mDark);
    m.position.set(p[0] + p[3] * 0.18 + along[0] * dx, y, p[1] + p[4] * 0.18 + along[1] * dx); m.rotation.y = p[2]; scene.add(m);
  };
  for (let i = 0; i <= n; i++) bar(0.08, h * 0.6, -len / 2 + i * len / n, h * 0.45);
  bar(len + 0.08, 0.09, 0, h * 0.75); bar(len + 0.08, 0.09, 0, h * 0.15);
}
function fence(x0, y0, x1, y1, h) { // alambrado: tela translúcida + postes
  const w = (x1 - x0) * S, d = (y1 - y0) * S, cx = wx((x0 + x1) / 2), cz = wz((y0 + y1) / 2);
  for (const [px, pz, len, ry] of [[cx, wz(y0), w, 0], [cx, wz(y1), w, 0], [wx(x0), cz, d, Math.PI / 2], [wx(x1), cz, d, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mNet);
    m.position.set(px, h / 2, pz); m.rotation.y = ry; scene.add(m);
  }
  const n = Math.round(w / 6), k = Math.round(d / 6);
  for (let i = 0; i <= n; i++) { post(x0 + (x1 - x0) * i / n, y0, h); post(x0 + (x1 - x0) * i / n, y1, h); }
  for (let i = 1; i < k; i++) { post(x0, y0 + (y1 - y0) * i / k, h); post(x1, y0 + (y1 - y0) * i / k, h); }
}

/* ---- Blocos ---- */
const blockMeshes = [];
const blockParts = {}; // peças de cada bloco, para "cortar" o prédio num andar
const mBase = M(0x8a5a36);
for (const b of BL) {
  const bx = wx(b.px), bz = wz(b.py), m = CORE / 2 + WL / 2, H = b.o === 'H';
  const parts = blockParts[b.n] = { wings: [], roofs: [], win: [], bal: [], pan: [] };
  for (const s of [-1, 1]) {
    const wing = box(H ? bx + s * m : bx, H ? bz : bz + s * m, H ? WL : WW, H ? WW : WL, HT, mWall);
    wing.userData.block = b.n; blockMeshes.push(wing); parts.wings.push(wing);
    parts.roofs.push(box(wing.position.x, wing.position.z, (H ? WL : WW) + 0.5, (H ? WW : WL) + 0.5, 0.35, mRoof, HT));
    box(wing.position.x, wing.position.z, (H ? WL : WW) + 0.12, (H ? WW : WL) + 0.12, 0.5, mBase, 0);
  }
  const core = box(bx, bz, H ? CORE + 0.2 : 6.2, H ? 6.2 : CORE + 0.2, HT + 1.4, mCore);
  core.userData.block = b.n; blockMeshes.push(core); parts.core = core;
  parts.res = box(bx, bz, 2.4, 2.4, 1.6, mWhite, HT + 1.4); // reservatório
}

/* ---- Janelas, esquadrias, painéis e varandas (instanciados) ----
   Segue a planta do book (p.36) e a fachada (p.33). Cada apartamento ocupa meia ala:
   - ponta da ala (f.end): só a janela do quarto 1, puxada para o lado da parede com o vizinho;
   - lado comprido (f.side), da ponta para a circulação: quarto 2, banheiro, sala com varanda
     (ou janela larga, na torre sem varanda) e cozinha, junto da escada.
   É a mesma orientação usada para pôr a planta em cima do andar cortado (planQuad). */
const dummy = new THREE.Object3D();
const winUnit = [];
const NW = N * 5;
const unitPlane = new THREE.PlaneGeometry(1, 1);
const winMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshBasicMaterial({ toneMapped: false }), NW);
const frameMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshBasicMaterial({ color: 0xf7f7f5 }), NW);
const panelMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshStandardMaterial({ color: 0xd4b582, roughness: 0.9 }), BL.length * 8);
const nCom = units.filter(u => u.typ === 'com').length;
const recessMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshStandardMaterial({ color: 0x6e6a63, roughness: 0.9 }), nCom); // fundo da varanda
const balMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 0.16, 0.35), M(0xdcdddd), nCom);
const guardMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 1.0, 0.06), M(0xa9cfe0, { transparent: true, opacity: 0.55, roughness: 0.15 }), nCom);
let wi = 0, bi = 0;
function putPlane(mesh, i, face, off, along, y, w, h) {
  const tx = Math.abs(face.nz), tz = Math.abs(face.nx);
  dummy.position.set(face.x + face.nx * off + tx * along, y, face.z + face.nz * off + tz * along);
  dummy.rotation.set(0, Math.atan2(face.nx, face.nz), 0);
  dummy.scale.set(w, h, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
// deslocamento ao longo da fachada lateral: u = 0 na ponta da ala, 1 na circulação
const alongSide = (f, u) => (f.end.nx * Math.abs(f.side.nz) + f.end.nz * Math.abs(f.side.nx)) * (0.5 - u) * WL;
// deslocamento ao longo da ponta: d > 0 vai para a fachada lateral, d < 0 para a parede com o vizinho
const alongEnd = (f, d) => (f.side.nx * Math.abs(f.end.nz) + f.side.nz * Math.abs(f.end.nx)) * d;
const SIDE_WIN = { // [u, largura, altura, centro acima do piso]
  com: [[0.195, 1.2, 1.2, 1.7], [0.39, 0.6, 0.6, 2.1], [0.63, 2.0, 2.1, 1.15], [0.865, 1.0, 1.0, 1.85]],
  sem: [[0.195, 1.2, 1.2, 1.7], [0.39, 0.6, 0.6, 2.1], [0.63, 2.0, 1.4, 1.65], [0.865, 1.0, 1.0, 1.85]]
};
units.forEach((un, ui) => {
  const f = unitFrame(un), y0 = (un.floor - 1) * BH;
  const com = un.typ === 'com';
  const addWin = (face, along, y, w, h) => {
    putPlane(frameMesh, wi, face, 0.05, along, y, w + 0.3, h + 0.3);
    putPlane(winMesh, wi, face, 0.09, along, y, w, h); blockParts[un.block].win.push(wi); winUnit[wi++] = ui;
  };
  addWin(f.end, alongEnd(f, -1.56), y0 + 1.7, 1.2, 1.2);               // quarto 1
  for (const [u, w, h, cy] of SIDE_WIN[com ? 'com' : 'sem']) addWin(f.side, alongSide(f, u), y0 + cy, w, h);
  if (com) { // varanda: fundo escuro, laje e guarda-corpo de vidro
    const a = alongSide(f, 0.63), tx = Math.abs(f.side.nz), tz = Math.abs(f.side.nx);
    putPlane(recessMesh, bi, f.side, 0.03, a, y0 + BH / 2, 2.7, BH - 0.1);
    dummy.scale.set(1, 1, 1); dummy.rotation.set(0, Math.atan2(f.side.nx, f.side.nz), 0);
    dummy.position.set(f.side.x + f.side.nx * 0.17 + tx * a, y0 + 0.08, f.side.z + f.side.nz * 0.17 + tz * a); dummy.updateMatrix();
    balMesh.setMatrixAt(bi, dummy.matrix);
    dummy.position.set(f.side.x + f.side.nx * 0.32 + tx * a, y0 + 0.66, f.side.z + f.side.nz * 0.32 + tz * a); dummy.updateMatrix();
    blockParts[un.block].bal.push([bi, un.floor]); guardMesh.setMatrixAt(bi++, dummy.matrix);
  }
});
let pi = 0;
function putPanels(n, q, i, h) { // faixas em dois tons: coluna da varanda e coluna do quarto 1 (book p.33)
  const f = unitFrame({ block: n, q });
  putPlane(panelMesh, i, f.side, 0.02, alongSide(f, 0.63), h / 2 + 0.25, 3.2, h - 0.5);
  putPlane(panelMesh, i + 1, f.end, 0.02, alongEnd(f, -1.56), h / 2 + 0.25, 2.2, h - 0.5);
}
BL.forEach(b => {
  for (let q = 0; q < 4; q++) { blockParts[b.n].pan.push([pi, q]); putPanels(b.n, q, pi, HT); pi += 2; }
});
[winMesh, frameMesh, panelMesh, recessMesh, balMesh, guardMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; scene.add(m); });

/* ---- Corte por andar: ao clicar numa unidade, o bloco mostra só até o andar dela ---- */
const ORIG = new Map([winMesh, frameMesh, recessMesh, balMesh, guardMesh].map(m => [m, m.instanceMatrix.array.slice()]));
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function showInst(mesh, i, on) {
  if (on) mesh.instanceMatrix.array.set(ORIG.get(mesh).subarray(i * 16, i * 16 + 16), i * 16);
  else mesh.setMatrixAt(i, ZERO);
}
function applyCut(n, k, plan = k < FLOORS) { // k = último andar visível (FLOORS = prédio inteiro)
  const p = blockParts[n], h = k * BH;
  p.wings.forEach(w => { w.scale.y = h / HT; w.position.y = h / 2; });
  p.roofs.forEach(r => { r.position.y = h + 0.175; });
  p.core.scale.y = (h + 1.4) / (HT + 1.4); p.core.position.y = (h + 1.4) / 2;
  p.res.position.y = h + 1.4 + 0.8;
  if (p.label) p.label.position.y = h + 5.5;
  p.win.forEach(i => { const on = units[winUnit[i]].floor <= k; showInst(winMesh, i, on); showInst(frameMesh, i, on); });
  p.bal.forEach(([i, f]) => { const on = f <= k; showInst(recessMesh, i, on); showInst(balMesh, i, on); showInst(guardMesh, i, on); });
  p.pan.forEach(([i, q]) => putPanels(n, q, i, h));
  [winMesh, frameMesh, panelMesh, recessMesh, balMesh, guardMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; });
  showPlans(n, k, plan);
}

/* ---- Planta vista de cima: com o bloco cortado, as 4 unidades do andar mostram a planta do book ----
   Na imagem, a borda de baixo é a fachada lateral (quartos) e a esquerda é a ponta da ala;
   o lado direito encosta na circulação. Por isso cada quadrante sai espelhado, como na obra. */
const unitIdx = new Map(units.map((u, i) => [`${u.block}-${u.floor}-${u.q}`, i]));
const unitAt = (b, f, q) => units[unitIdx.get(`${b}-${f}-${q}`)];
const texLoader = new THREE.TextureLoader();
const planMat = {};
for (const k of ['com', 'sem']) {
  const t = texLoader.load(PLANTAS[k]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  planMat[k] = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide });
}
const planMeshes = {}; // bloco -> [4 meshes]
function planQuad(un) {
  const f = unitFrame(un);
  const L = new THREE.Vector3(f.end.nx, 0, f.end.nz), Sd = new THREE.Vector3(f.side.nx, 0, f.side.nz);
  const U = L.clone().negate(), V = Sd;            // u: da ponta da ala para a circulação; v: de dentro para a fachada
  const w = WL - 0.1, d = WW / 2 - 0.1, c = new THREE.Vector3(f.cx, 0, f.cz);
  const P = (su, sv) => c.clone().addScaledVector(U, su * w / 2).addScaledVector(V, sv * d / 2);
  const pts = [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)]; // topo-esq, topo-dir, base-dir, base-esq da imagem
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(p => [p.x, 0, p.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  // garante a face virada para cima
  const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[3], pts[0]));
  g.setIndex(n.y > 0 ? [0, 1, 3, 1, 2, 3] : [0, 3, 1, 1, 3, 2]);
  return g;
}
function showPlans(n, k, plan) {
  if (!planMeshes[n]) {
    planMeshes[n] = [0, 1, 2, 3].map(q => {
      const m = new THREE.Mesh(planQuad(unitAt(n, 1, q)), planMat.sem);
      m.visible = false; m.userData.planBlock = n; m.userData.q = q; m.renderOrder = 2; scene.add(m); return m;
    });
  }
  planMeshes[n].forEach(m => {
    m.visible = plan;
    if (!m.visible) return;
    const un = unitAt(n, k, m.userData.q);
    m.material = planMat[un.typ === 'com' ? 'com' : 'sem'];
    m.position.y = k * BH + 0.37;
    m.userData.unit = units.indexOf(un);
  });
}
/* Destaque da unidade: contorno verde no volume do apartamento */
const hlGroup = new THREE.Group();
const hlBox = new THREE.BoxGeometry(1, 1, 1);
hlGroup.add(
  new THREE.LineSegments(new THREE.EdgesGeometry(hlBox), new THREE.LineBasicMaterial({ color: 0x1f9d6b })),
  new THREE.Mesh(hlBox, new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.28, depthWrite: false }))
);
hlGroup.visible = false;
scene.add(hlGroup);

/* ---- Árvores e palmeiras ---- */
{
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M(0xffffff, { roughness: 0.95 }), trees.length * 2);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), M(0x6b4a2f), trees.length);
  const col = new THREE.Color();
  trees.forEach((t, i) => {
    const x = wx(t.x), z = wz(t.y);
    dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.position.set(x, 1.5, z); dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 2.6 + t.s * 0.75, z); dummy.scale.set(t.s, t.s * 0.85, t.s); dummy.updateMatrix();
    canopy.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.set(x + t.s * 0.45, 2.4 + t.s * 1.25, z - t.s * 0.3); dummy.scale.setScalar(t.s * 0.62); dummy.updateMatrix();
    canopy.setMatrixAt(i * 2 + 1, dummy.matrix);
    col.setHSL(0.27 + rnd(i + 3) * 0.06, 0.42, 0.30 + rnd(i + 11) * 0.10);
    canopy.setColorAt(i * 2, col); canopy.setColorAt(i * 2 + 1, col.clone().offsetHSL(0, 0, 0.05));
  });
  canopy.instanceColor.needsUpdate = true;
  scene.add(canopy, trunk);

  const frond = new THREE.BoxGeometry(3.2, 0.08, 0.7); frond.translate(1.6, 0, 0);
  const fronds = new THREE.InstancedMesh(frond, M(0x4f8f3a, { roughness: 0.9 }), palms.length * 8);
  const ptrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 6.5, 6), M(0x8a7556), palms.length);
  palms.forEach((p, i) => {
    const x = wx(p.x), z = wz(p.y);
    dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.position.set(x, 3.25, z); dummy.updateMatrix();
    ptrunk.setMatrixAt(i, dummy.matrix);
    for (let k = 0; k < 8; k++) {
      dummy.position.set(x, 6.5, z);
      dummy.rotation.set(0, k * Math.PI / 4 + i, -0.35 - (k % 2) * 0.25, 'YXZ');
      dummy.updateMatrix();
      fronds.setMatrixAt(i * 8 + k, dummy.matrix);
    }
  });
  scene.add(fronds, ptrunk);
}

/* ---- Carros nas vagas ---- */
{
  const used = stalls.filter((s, i) => rnd(i * 13 + 4) < 0.42);
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(4.1, 0.75, 1.75), M(0xffffff, { roughness: 0.35, metalness: 0.3 }), used.length);
  const cab = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.55, 1.5), M(0x55616d, { roughness: 0.2 }), used.length);
  const cores = [0xe9eaec, 0x1d2b3f, 0xa3231c, 0x3c4149, 0xc9ced4, 0x8c9198, 0xf4f4f4, 0x2f5f8f];
  const col = new THREE.Color();
  used.forEach((s, i) => {
    dummy.scale.set(1, 1, 1); dummy.rotation.set(0, s.rot, 0);
    dummy.position.set(wx(s.x), 0.62, wz(s.y)); dummy.updateMatrix(); body.setMatrixAt(i, dummy.matrix);
    dummy.position.set(wx(s.x), 1.25, wz(s.y)); dummy.updateMatrix(); cab.setMatrixAt(i, dummy.matrix);
    body.setColorAt(i, col.setHex(cores[Math.floor(rnd(i + 77) * cores.length)]));
  });
  body.instanceColor.needsUpdate = true;
  scene.add(body, cab);
}

/* ---- Muro do condomínio ---- */
{
  const seg = (ax, ay, bx2, by2) => {
    const len = Math.hypot(bx2 - ax, by2 - ay) * S;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 2.2, 0.2), mWhite);
    m.position.set(wx((ax + bx2) / 2), 1.1, wz((ay + by2) / 2));
    m.rotation.y = -Math.atan2(by2 - ay, bx2 - ax);
    scene.add(m);
  };
  seg(342, 88, 1618, 88); seg(1618, 88, 1618, 341); seg(1618, 341, 1865, 341); seg(1865, 341, 1865, 603);
  seg(1865, 603, 300, 603); seg(300, 603, 300, 540); seg(300, 452, 300, 180); seg(300, 180, 342, 88);
}

/* ---- Lazer 01 ---- */
// 01 guarita com grab and go: marquises brancas, pilar em madeira com a marca, cabine e gradis
boxPx(323, 455, 354, 487, 0.45, mWhite, 4.3);
boxPx(323, 496, 354, 538, 0.45, mWhite, 3.7);
boxPx(331, 486, 347, 497, 5.6, mWood);
{
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#8a5a36'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#b5d334'; x.font = 'bold 86px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('LIFE', 128, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: t }));
  sign.position.set(wx(331) - 0.05, 4.2, wz(491.5)); sign.rotation.y = -Math.PI / 2; scene.add(sign);
}
building(328, 517, 350, 536, 3.0, mBlueWall, 'W');
for (const [y0, y1] of [[458, 486], [497, 516]]) { // gradis
  const gr = new THREE.Mesh(new THREE.PlaneGeometry((y1 - y0) * S, 2.2), new THREE.MeshBasicMaterial({ color: 0x2b323c, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  gr.position.set(wx(338), 1.1, wz((y0 + y1) / 2)); gr.rotation.y = Math.PI / 2; scene.add(gr);
}
post(325, 457, 4.3, mWhite, 0.2); post(352, 457, 4.3, mWhite, 0.2);
// 02 salão de festas, 03 salão infantil, 04 varanda gourmet
building(324, 348, 374, 392, 4.2, mBlueWall, 'E');
building(332, 394, 392, 430, 3.6, mWall, 'E');
pavilion(352, 334, 394, 346, 3.4);
boxPx(356, 337, 390, 343, 0.95, mWood);                       // bancada gourmet
{ // placas solares na cobertura do salão
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#1d3557'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#8fb3d9'; x.lineWidth = 2; for (let i = 0; i <= 128; i += 16) { x.strokeRect(i, 0, 0.1, 128); x.strokeRect(0, i, 128, 0.1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.3, metalness: 0.4 }));
  sp.position.set(wx(352), 4.72, wz(370)); scene.add(sp);
}
// piscina: espreguiçadeiras e guarda-sóis
for (let i = 0; i < 7; i++) lounger(wx(378), wz(229 + i * 8.5));
for (let i = 0; i < 3; i++) lounger(wx(322), wz(232 + i * 9), Math.PI);
for (let i = 0; i < 4; i++) {
  post(390, 232 + i * 17, 2.5, mMetal, 0.06);
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.6, 12), M(i % 2 ? 0xffffff : 0x2a7fb8));
  c.position.set(wx(390), 2.75, wz(232 + i * 17)); scene.add(c);
}
post(321, 323, 2.4, mMetal, 0.08);                             // 10 chuveirão
// 12 parque infantil: torre, escorregador e balanço
box(wx(362), wz(186), 2.2, 2.2, 2.4, M(0xf6d24a));
{ const r = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.4, 4), M(0xe05a5a)); r.position.set(wx(362), 3.1, wz(186)); r.rotation.y = Math.PI / 4; scene.add(r);
  const sl = box(wx(362) + 2.6, wz(186), 3.4, 0.8, 0.15, M(0x4aa3df), 0.9); sl.rotation.z = -0.45; }
post(378, 196, 2.3, mOrange); post(388, 196, 2.3, mOrange); box(wx(383), wz(196), 2.6, 0.12, 0.12, mOrange, 2.3);
// 31 casa de lixo, 32 casa de gás, 38 casa de gás 02, caixa d'água
building(356, 108, 416, 144, 3.0, mWall);
building(318, 143, 342, 171, 2.6, mConc);
building(320, 562, 345, 586, 2.6, mConc);
{ const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 13, 16), mConc); t.position.set(wx(375), 6.5, wz(567)); scene.add(t);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 2.6, 3.4, 20), mWhite); r.position.set(wx(375), 14.7, wz(567)); scene.add(r); }
// 11 quiosque gourmet (telhado cerâmico), 13 pet wash, 17 car wash, 16 futmesa
for (const [x, y] of [[480, 138], [501, 138], [480, 161], [501, 161]]) post(x, y, 2.8, mWood, 0.16);
{ const r = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.8, 4), mTerra); r.position.set(wx(490.5), 3.7, wz(149.5)); r.rotation.y = Math.PI / 4; scene.add(r);
  box(wx(490.5), wz(140), 3.6, 0.8, 1.0, mWall); }
building(436, 92, 456, 104, 2.4, M(0xf2c14e));
pavilion(551, 96, 578, 118, 3.0, mWhite, mMetal);
box(wx(432), wz(134), 2.0, 1.1, 0.75, M(0x2f6f73));

/* ---- Centro: 19 mini market, 33 bicicletário, 18 coworking, 34 pergolado, praças ---- */
building(960, 499, 984, 521, 3.2, mDark, 'N');
boxPx(959, 497, 985, 499, 0.5, mLime, 2.5);
building(964, 571, 998, 595, 3.2, mWood, 'N');
pavilion(990, 548, 1005, 562, 2.3, mMetal, mMetal);
for (let i = 0; i < 6; i++) post(1466 + (i % 2) * 18, 364 + Math.floor(i / 2) * 16, 2.7, mWood, 0.14);
for (let i = 0; i < 9; i++) boxPx(1463, 362 + i * 4.4, 1487, 363 + i * 4.4, 0.16, mWood, 2.7);
[[563,330],[731,330],[898,330],[1145,330],[1311,330]].forEach(([x, y]) => {
  boxPx(x - 12, y - 11, x - 3, y - 9, 0.45, mWood); boxPx(x + 3, y + 9, x + 12, y + 11, 0.45, mWood);
});

/* ---- Lazer 02 ---- */
// 20 academia (volume escuro com faixa verde), 23 lavanderia, 22 brinquedoteca, 21 salão de jogos, 24 espaço kids
building(1620, 492, 1652, 527, 4.4, mDark, 'E');
boxPx(1619.5, 491.5, 1652.5, 527.5, 0.3, mLime, 3.3);
building(1652, 492, 1666, 510, 3.4, mWall);
building(1652, 512, 1666, 545, 3.4, mWall, 'E');
building(1620, 529, 1650, 572, 3.8, mBlueWall, 'E');
box(wx(1658), wz(580), 2.2, 2.2, 1.6, M(0xe05a5a)); box(wx(1664), wz(590), 1.6, 1.6, 1.0, M(0x4aa3df));
// 27 quadras de areia: redes e alambrado
[1722, 1806].forEach(cx => {
  post(cx, 372, 2.5); post(cx, 410, 2.5);
  const n = new THREE.Mesh(new THREE.PlaneGeometry(38 * S, 1.0), new THREE.MeshBasicMaterial({ color: 0x1f2933, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  n.position.set(wx(cx), 1.9, wz(391)); n.rotation.y = Math.PI / 2; scene.add(n);
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 38 * S), mWhite); t.position.set(wx(cx), 2.42, wz(391)); scene.add(t);
});
fence(1678, 358, 1849, 424, 4);
// 26 quadra poliesportiva: tabelas, traves e alambrado
[[1697, 1], [1803, -1]].forEach(([x, d]) => {
  post(x - d * 3, 542, 3.1, mMetal, 0.1);
  box(wx(x) + d * 0.1, wz(542), 0.08, 1.8, 1.1, mWhite, 2.7);
  post(x, 535, 2.0, mWhite, 0.06); post(x, 549, 2.0, mWhite, 0.06); box(wx(x), wz(542), 0.1, 14 * S, 0.1, mWhite, 2.0);
});
fence(1688, 505, 1812, 579, 4.5);
// 25 quiosques de apoio, 09 arquibancadas, 28 parque aventura, 29 academia ao ar livre, bancos
[[1772, 457], [1809, 457]].forEach(([x, y]) => { boxPx(x - 8, y - 7, x + 8, y + 7, 2.6, mWood); boxPx(x - 12, y - 11, x + 12, y + 11, 0.3, mWhite, 2.6); });
[[1721, 496], [1782, 496]].forEach(([x, y]) => { for (let s = 0; s < 3; s++) boxPx(x - 18, y - 4 + s * 2.6, x + 18, y - 1.4 + s * 2.6, 0.4 + (2 - s) * 0.4, mOrange); });
box(wx(1716), wz(444), 2.4, 2.4, 2.6, mWood);
{ const r = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.4, 4), M(0xf6d24a)); r.position.set(wx(1716), 3.3, wz(444)); r.rotation.y = Math.PI / 4; scene.add(r);
  const w = box(wx(1736), wz(440), 4, 0.25, 2.4, M(0xb56acf)); w.rotation.y = 0.3; }
for (let i = 0; i < 4; i++) { post(1826 + i * 7, 584, 2.1, M(0x2f7fc1), 0.1); box(wx(1826 + i * 7), wz(584), 1.3, 0.12, 0.12, M(0xf2c14e), 1.5); }
[[1631,398],[1662,444],[1760,472]].forEach(([x, y]) => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.28, 6, 14, Math.PI * 1.2), mOrange);
  t.rotation.x = Math.PI / 2; t.position.set(wx(x), 0.45, wz(y)); scene.add(t);
});
pavilion(1616, 350, 1630, 362, 2.3, mMetal, mMetal); // bicicletário

/* ---- Rótulos ---- */
const labelGroup = new THREE.Group(); scene.add(labelGroup);
const areaLabels = new THREE.Group(); labelGroup.add(areaLabels);
function label(text, px, py, y, style = 'area') {
  // style: 'area' (pílula branca), 'major' (avenida: pílula verde-escura), 'minor' (rua: menor, fundo bege)
  const bg = { area: 'rgba(255,255,255,.95)', major: 'rgba(30,58,47,.92)', minor: 'rgba(250,248,242,.9)' }[style];
  const fg = { area: '#1d2621', major: '#ffffff', minor: '#4b524d' }[style];
  const fs = style === 'minor' ? 'bold 40px Arial' : 'bold 44px Arial', size = style === 'minor' ? 0.017 : style === 'major' ? 0.02 : 0.019;
  const c = document.createElement('canvas');
  const x = c.getContext('2d'); x.font = fs;
  const w = Math.ceil(x.measureText(text).width) + 56; c.width = w; c.height = 84;
  const g2 = c.getContext('2d');
  g2.fillStyle = bg; g2.beginPath(); g2.roundRect(0, 0, w, 84, 42); g2.fill();
  g2.fillStyle = fg; g2.font = fs; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(text, w / 2, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, sizeAttenuation: false }));
  s.scale.set(w / 84 * size, size, 1); s.position.set(wx(px), y, wz(py)); s.renderOrder = 5;
  areaLabels.add(s);
  return s;
}
[['Portaria', 338, 492, 9.5], ['Salão de festas', 350, 372, 8.5], ['Piscina', 356, 268, 5], ['Parque infantil', 362, 186, 7],
 ['Quiosque gourmet', 490, 150, 8], ['Pet play', 432, 100, 5], ['Mini market', 972, 510, 7.5], ['Coworking', 981, 583, 7.5],
 ['Quadras de areia', 1764, 391, 7.5], ['Quadra poliesportiva', 1750, 542, 8], ['Academia', 1636, 509, 9],
 ['Salão de jogos', 1635, 551, 8], ['Pista de cooper', 1800, 600, 4]]
  .forEach(l => label(...l));
BL.forEach(b => { // número do bloco, como na implantação
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d'); x.fillStyle = '#1e3a2f'; x.beginPath(); x.arc(48, 48, 46, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 50px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(b.n).padStart(2, '0'), 48, 51);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, sizeAttenuation: false }));
  s.scale.set(0.021, 0.021, 1); s.position.set(wx(b.px), HT + 5.5, wz(b.py)); s.renderOrder = 5;
  labelGroup.add(s); blockParts[b.n].label = s;
});

/* =====================================================================
   PISCINA — água com reflexo e ondulação, borda de pedra e espreguiçadeiras
   ===================================================================== */
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const waterNormal = (() => { // mapa de normais de ondinhas, gerado num canvas
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N);
  const h = (i, j) => Math.sin(i * 0.19 + Math.sin(j * 0.07) * 2) + Math.sin(j * 0.23 + Math.sin(i * 0.05) * 3) * 0.8 + Math.sin((i + j) * 0.11) * 0.6;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = h(i + 1, j) - h(i - 1, j), dy = h(i, j + 1) - h(i, j - 1), k = (j * N + i) * 4;
    img.data[k] = 128 + dx * 40; img.data[k + 1] = 128 + dy * 40; img.data[k + 2] = 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
})();
const mWater = new THREE.MeshStandardMaterial({ color: 0x38b6d8, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.78,
  envMap: envTex, envMapIntensity: 1.3, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35) });
const mStone = M(0xf1ede4, { roughness: 0.7 });
function pool(x0, y0, x1, y1) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) * S, (y1 - y0) * S), mWater);
  w.rotation.x = -Math.PI / 2; w.position.set(wx((x0 + x1) / 2), 0.1, wz((y0 + y1) / 2)); scene.add(w);
  const b = 0.45, hgt = 0.16; // borda de pedra
  boxPx(x0 - b / S, y0 - b / S, x1 + b / S, y0, hgt, mStone); boxPx(x0 - b / S, y1, x1 + b / S, y1 + b / S, hgt, mStone);
  boxPx(x0 - b / S, y0, x0, y1, hgt, mStone); boxPx(x1, y0, x1 + b / S, y1, hgt, mStone);
}
pool(343, 225, 366, 316); pool(368, 292, 386, 313);
function lounger(x, z, rot = 0) { // espreguiçadeira branca: assento + encosto inclinado
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.7), mWhite); seat.position.set(-0.25, 0.32, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.7), mWhite); back.position.set(0.68, 0.55, 0); back.rotation.z = 0.6;
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.26, 0.55), M(0xdedad0)); base.position.set(0, 0.13, 0);
  g.add(seat, back, base); g.position.set(x, 0.02, z); g.rotation.y = rot + Math.PI / 2; scene.add(g);
}

/* =====================================================================
   ENTORNO REAL — ruas (OpenStreetMap) e edificações vizinhas (Overture Maps:
   Google Open Buildings + Microsoft + OSM), já alinhados ao terreno. Ver data/entorno.json.
   ===================================================================== */
const entorno = new THREE.Group(); scene.add(entorno);
const poiGroup = new THREE.Group(); poiGroup.visible = false; scene.add(poiGroup);
let POIS = [];
const GATE = { x: wx(338), z: wz(492) }; // portaria
const POI_COR = { Escola: '#3d7bd9', Faculdade: '#3d7bd9', Mercado: '#2f7a55', Supermercado: '#2f7a55', Padaria: '#2f7a55', Farmácia: '#d94a4a', Saúde: '#d94a4a', Clínica: '#d94a4a', Hospital: '#d94a4a', Igreja: '#8a6ad1', Parque: '#4c9a3c', Esporte: '#4c9a3c', Academia: '#e9772e', Posto: '#6b716c' };
function buildEntorno(d) {
  const rnd2 = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  // ruas: fitas com juntas redondas
  const roads = [], greens = [], col = new THREE.Color();
  for (const r of d.r) {
    const p = r.p, pts = []; for (let i = 0; i < p.length; i += 2) pts.push([p[i], p[i + 1]]);
    if (r.w) {
      const hw = r.w / 2, pos = [];
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * hw, nz = (bx - ax) / L * hw;
        pos.push(ax + nx, 0, az + nz, bx + nx, 0, bz + nz, ax - nx, 0, az - nz, ax - nx, 0, az - nz, bx + nx, 0, bz + nz, bx - nx, 0, bz - nz);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); roads.push(g);
      for (const [x, z] of pts) { const c = new THREE.CircleGeometry(hw, 10); c.rotateX(-Math.PI / 2); c.translate(x, 0, z); roads.push(c.toNonIndexed()); }
    } else if (['park', 'pitch', 'recreation_ground', 'grass', 'garden', 'meadow', 'forest', 'swimming_pool'].includes(r.k)) {
      const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); greens.push(g.toNonIndexed());
    }
  }
  const strip = g => { g.deleteAttribute('normal'); g.deleteAttribute('uv'); return g; };
  if (roads.length) {
    const m = new THREE.Mesh(mergeGeometries(roads.map(strip)), new THREE.MeshBasicMaterial({ color: 0xcfcbc1 }));
    m.position.y = -0.25; entorno.add(m);
  }
  if (greens.length) {
    const m = new THREE.Mesh(mergeGeometries(greens.map(strip)), new THREE.MeshBasicMaterial({ color: 0xc3cfa6 }));
    m.position.y = -0.4; entorno.add(m);
  }
  // edificações: extrusão da planta; altura pelo nº de andares ou estimada pela área (casas de 1–2 pavimentos)
  const PAL = [0xe6e1d7, 0xddd7cb, 0xd3cdc1, 0xe9e4db, 0xcfc9bc];
  const geos = d.b.map((b, i) => {
    const p = b.p, v = []; for (let k = 0; k < p.length; k += 2) v.push(new THREE.Vector2(p[k], -p[k + 1]));
    const h = b.f ? b.f * 3 : b.a < 90 ? 3.2 : b.a < 260 ? (rnd2(i) < 0.35 ? 6.2 : 3.6) : b.a < 900 ? 6.5 : 8;
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(v), { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    col.setHex(PAL[Math.floor(rnd2(i + 7) * PAL.length)]);
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { c[k * 3] = col.r; c[k * 3 + 1] = col.g; c[k * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
  const bm = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  entorno.add(bm);
  // nomes das ruas: geometria do OpenStreetMap, grafia conferida no Google Maps
  const NOME = { // OSM -> como aparece no Google Maps (null = não rotular)
    'Rua Rubens Francisco Dias': null, // trilha de terra que o OSM batizou com o nome da avenida
    'Avenida Rubens Francisco Dias': 'Av. Rubens Francisco Dias', 'Avenida Francisco Fraga Maia': 'Av. Francisco Fraga Maia',
    'Rua da Administração': 'R. da Contabilidade', 'Rua Vicente dos Reis': 'R. Vicente Reis', 'Rua Parque Antarctica': 'R. Parque Antártica',
    'Rua Barão de Macaubas': 'R. Barão de Macaúbas', 'Rua Gremio': 'R. Grêmio', 'Rua Rua Nossa Sra. de Lourde': 'R. Nossa Sra. de Lourdes'
  };
  const nome = n => n in NOME ? NOME[n] : n.replace(/^Avenida /, 'Av. ').replace(/^Rua /, 'R. ').replace(/^Travessa /, 'Tv. ').replace(/^Tv /, 'Tv. ');
  const MAJOR = new Set(['Av. Francisco Fraga Maia', 'Av. Rubens Francisco Dias', 'Av. dos Universitários']);
  const byName = new Map(); // junta os trechos de cada rua
  for (const r of d.r) {
    if (!r.n || !r.w) continue;
    const n = nome(r.n); if (!n) continue;
    const p = r.p, segs = byName.get(n) || [];
    for (let i = 2; i < p.length; i += 2) segs.push([p[i - 2], p[i - 1], p[i], p[i + 1]]);
    byName.set(n, segs);
  }
  for (const [n, segs] of byName) {
    const major = MAJOR.has(n);
    // candidatos: meio de cada trecho comprido o bastante para caber o nome, fora do terreno
    const cand = segs.map(([ax, az, bx, bz]) => ({ x: (ax + bx) / 2, z: (az + bz) / 2, L: Math.hypot(bx - ax, bz - az) }))
      .filter(c => c.L > (major ? 30 : 22) && !(Math.abs(c.x) < 215 && Math.abs(c.z) < 70)).map(c => ({ ...c, d: Math.hypot(c.x, c.z) }))
      .filter(c => c.d < (major ? 900 : 600)).sort((a, b) => a.d - b.d);
    const placed = [];
    for (const c of cand) { // avenidas: repete a cada ~300 m; ruas: um rótulo só
      if (placed.some(q => Math.hypot(q.x - c.x, q.z - c.z) < 300)) continue;
      placed.push(c);
      label(n, c.x / S + OX, c.z / S + OY, major ? 6 : 3, major ? 'major' : 'minor').userData.street = major ? 'major' : 'minor';
      if (!major || placed.length >= 4) break;
    }
  }
  // pontos de interesse
  lastFar = null; // reaplica a visibilidade com os rótulos novos
  POIS = d.poi.map(p => ({ ...p, dist: Math.round(Math.hypot(p.x - GATE.x, p.z - GATE.z) / 10) * 10 })).sort((a, b) => a.dist - b.dist);
  POIS.forEach((p, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = POI_COR[p.c] || '#555'; x.beginPath(); x.arc(32, 26, 22, 0, 7); x.fill();
    x.beginPath(); x.moveTo(18, 40); x.lineTo(46, 40); x.lineTo(32, 62); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 26, 9, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, sizeAttenuation: false }));
    s.scale.set(0.028, 0.028, 1); s.center.set(0.5, 0); s.position.set(p.x, 1, p.z); s.renderOrder = 7; s.userData.poi = i;
    poiGroup.add(s); p.sprite = s;
  });
  document.getElementById("attrib").textContent = '© OpenStreetMap · Overture Maps';
}
fetch('data/entorno.json').then(r => r.json()).then(buildEntorno).catch(e => console.warn('Entorno não carregou', e));

function renderViz() {
  if (!POIS.length) { $('vizBody').innerHTML = '<p class="lcount">Carregando o entorno…</p>'; return; }
  const cats = [...new Set(POIS.map(p => p.c))];
  $('vizBody').innerHTML =
    `<p class="lcount">Distância em linha reta a partir da portaria. ${POIS.length} lugares num raio de ~1 km.</p>` +
    POIS.map((p, i) => `<button type="button" class="lrow poi" data-p="${i}"><i class="pin" style="background:${POI_COR[p.c] || '#555'}"></i>` +
      `<span class="info">${p.n.replace(/</g, '&lt;')}<small>${p.c}</small></span><span class="val">${p.dist < 1000 ? p.dist + ' m' : (p.dist / 1000).toFixed(1).replace('.', ',') + ' km'}<small>${Math.max(1, Math.round(p.dist * 1.3 / 80))} min a pé</small></span></button>`).join('');
}
let poiSel = null;
const poiLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xe9772e, dashSize: 8, gapSize: 6, depthTest: false }));
poiLine.renderOrder = 7; poiLine.visible = false; poiGroup.add(poiLine);
document.addEventListener('click', e => {
  const b = e.target.closest('.poi'); if (!b) return;
  const p = POIS[+b.dataset.p];
  if (poiSel) poiSel.sprite.scale.set(0.028, 0.028, 1);
  poiSel = p; p.sprite.scale.set(0.045, 0.045, 1);
  document.querySelectorAll('.poi').forEach(x => x.classList.toggle('on', x === b));
  poiLine.geometry.setFromPoints([new THREE.Vector3(GATE.x, 1.5, GATE.z), new THREE.Vector3(p.x, 1.5, p.z)]); poiLine.computeLineDistances(); poiLine.visible = true;
  flyTo((p.x + GATE.x) / 2, 0, (p.z + GATE.z) / 2, THREE.MathUtils.clamp(p.dist * 2.5, 260, 1500), 0.85);
});

/* ---------- Cores das janelas ---------- */
const C_LIT = new THREE.Color(0xf2b65a), C_RES = new THREE.Color(0xc8694a), C_SOLD = new THREE.Color(0x3a4654), C_OFF = new THREE.Color(0xd3d5d1);

/* ---------- Estado dos filtros ---------- */
const $ = id => document.getElementById(id);
const F0 = { price: 'all', typ: 'all', floor: 'all', etapa: 'all', block: 'all', avail: false, adapt: false };
const F = { ...F0 };
const PRICE = {
  p1: { t: 'Até R$ 180 mil', ok: p => p < 180000 },
  p2: { t: 'R$ 180 a 190 mil', ok: p => p >= 180000 && p < 190000 },
  p3: { t: 'Acima de R$ 190 mil', ok: p => p >= 190000 }
};
const GROUPS = [
  { key: 'price', title: 'Valor', opts: Object.entries(PRICE).map(([v, o]) => [v, o.t]) },
  { key: 'typ', title: 'Tipologia', opts: [['com', 'Com varanda · 40,31 m²'], ['sem', 'Sem varanda · 37,93 m²'], ['garden', 'Garden (térreo)']] },
  { key: 'floor', title: 'Andar', opts: [1, 2, 3, 4, 5].map(f => [String(f), f === 1 ? '1º (térreo)' : f + 'º']) },
  { key: 'etapa', title: 'Etapa', opts: [['1', '1ª etapa · 25 blocos'], ['2', '2ª etapa · 19 blocos']] }
];
const pad = n => String(n).padStart(2, '0');

/* ---------- Posição solar ----------
   Posição conferida no Google Maps, no OpenStreetMap e na foto aérea do book (p.2): o lado curto do
   terreno (portaria e piscina) dá para a Av. Rubens Francisco Dias, que corre a ~73° (OSO→ENE), e o
   condomínio se estende para SSE, paralelo à Av. Fraga Maia. O "topo" da implantação aponta para ENE,
   então o norte fica ~73° à esquerda dele (a rosa dos ventos do book erra por ~25°). */
const NORTH = { x: -0.956, z: -0.292 }, EAST = { x: -NORTH.z, z: NORTH.x };
const bearing = (nx, nz) => (Math.atan2(nx * EAST.x + nz * EAST.z, nx * NORTH.x + nz * NORTH.z) * 180 / Math.PI + 360) % 360;
const DIR8 = ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'];
const SUN8 = [
  'sol a maior parte do dia, mais forte no inverno', 'sol da manhã até o começo da tarde', 'nascente: sol da manhã',
  'sol só no começo da manhã', 'pouco sol direto, face mais fresca', 'sol só no fim da tarde',
  'poente: sol da tarde, face mais quente', 'sol da tarde até o pôr do sol'];
const SUN4 = { norte: 'Norte · sol o dia todo', nascente: 'Nascente · sol da manhã', poente: 'Poente · sol da tarde', sul: 'Sul · pouco sol' };
const sun4 = b => b >= 315 || b < 45 ? 'norte' : b < 135 ? 'nascente' : b < 225 ? 'sul' : 'poente';
for (const un of units) {
  const f = unitFrame(un);
  un.faces = [f.end, f.side].map(s => { const b = bearing(s.nx, s.nz), i = Math.round(b / 45) % 8; return { b, dir: DIR8[i], sun: SUN8[i], s4: sun4(b) }; });
  un.sun = [...new Set(un.faces.map(x => x.s4))];
}
F0.sol = 'all'; F.sol = 'all';
GROUPS.push({ key: 'sol', title: 'Posição solar (janelas)', opts: Object.entries(SUN4) });

function matches(un, f = F) {
  if (f.sol !== 'all' && !un.sun.includes(f.sol)) return false;
  if (f.price !== 'all' && !PRICE[f.price].ok(un.price)) return false;
  if (f.typ !== 'all' && un.typ !== f.typ) return false;
  if (f.floor !== 'all' && un.floor !== +f.floor) return false;
  if (f.etapa !== 'all' && un.etapa !== +f.etapa) return false;
  if (f.block !== 'all' && un.block !== +f.block) return false;
  if (f.avail && un.status !== 'Disponível') return false;
  if (f.adapt && !un.adapt) return false;
  return true;
}
const activeCount = () => Object.keys(F0).filter(k => F[k] !== F0[k]).length;

/* ---------- Corte por andar ----------
   Andar escolhido na barra lateral: todos os blocos mostram só até ele.
   Unidade selecionada: o bloco dela é cortado no andar da unidade. */
const curK = {};
function syncCuts() {
  for (const b of BL) {
    let k = F.floor === 'all' ? FLOORS : +F.floor, plan = F.floor !== 'all';
    if (selected && selected.kind === 'unit' && selected.un.block === b.n) { k = selected.un.floor; plan = true; }
    // a planta aparece também no último andar (k = FLOORS): aí não há corte, só a planta sobre a laje
    const key = k + (plan ? 'p' : '');
    if ((curK[b.n] ?? FLOORS + '') !== key) { applyCut(b.n, k, plan); curK[b.n] = key; }
  }
}

/* ---------- Atualiza tudo ---------- */
function refresh() {
  let vis = 0, disp = 0;
  const ok = units.map(un => { const m = matches(un); if (m) { vis++; if (un.status === 'Disponível') disp++; } return m; });
  for (let i = 0; i < NW; i++) {
    const un = units[winUnit[i]];
    winMesh.setColorAt(i, !ok[winUnit[i]] ? C_OFF : un.status === 'Disponível' ? C_LIT : un.status === 'Reservado' ? C_RES : C_SOLD);
  }
  winMesh.instanceColor.needsUpdate = true;
  $('dispCount').textContent = disp;
  const n = activeCount(), badge = $('filterBadge');
  badge.hidden = !n; badge.textContent = n;
  $('seeUnits').textContent = `Ver ${vis} unidade${vis === 1 ? '' : 's'}`;
  document.querySelectorAll('#floors button').forEach(b => b.classList.toggle('on', b.dataset.floor === String(F.floor)));
  syncCuts();
  if (!$('sheetFilter').hidden) renderFilters();
  if (!$('sheetList').hidden) renderList();
  if (selected && selected.kind === 'block') showBlock(selected.b, true);
}

/* ---------- Painel de filtros ---------- */
function renderFilters() {
  const count = (key, val) => units.reduce((s, u) => s + matches(u, { ...F, [key]: val }), 0);
  let h = '';
  for (const g of GROUPS) {
    h += `<div class="fgroup"><h3>${g.title}</h3><div class="chips">`;
    for (const [v, t] of g.opts) {
      const c = count(g.key, v), on = String(F[g.key]) === v;
      h += `<button type="button" class="chip${on ? ' on' : ''}" data-k="${g.key}" data-v="${v}" aria-pressed="${on}"${!c && !on ? ' disabled' : ''}>${t}<small>${c}</small></button>`;
    }
    h += `</div></div>`;
  }
  h += `<div class="fgroup"><h3>Disponibilidade</h3>
    <label class="toggle"><span>Só disponíveis<small>Esconde reservadas e vendidas</small></span><input type="checkbox" data-t="avail"${F.avail ? ' checked' : ''}></label>
    <label class="toggle"><span>Finais adaptáveis<small>Com possibilidade de adaptação (PcD)</small></span><input type="checkbox" data-t="adapt"${F.adapt ? ' checked' : ''}></label></div>`;
  h += `<div class="fgroup"><h3>Bloco</h3><select class="select" id="fBlock"><option value="all">Todos os blocos</option>` +
    BL.map(b => `<option value="${b.n}"${String(F.block) === String(b.n) ? ' selected' : ''}>Bloco ${pad(b.n)} · ${b.etapa}ª etapa · ${TIPO[b.tipo === 'garden' ? 'garden' : b.tipo].toLowerCase()}</option>`).join('') +
    `</select></div>`;
  const body = $('filterBody'), st = body.scrollTop;
  body.innerHTML = h; body.scrollTop = st;
}
$('filterBody').addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  F[c.dataset.k] = F[c.dataset.k] === c.dataset.v ? 'all' : c.dataset.v;
  refresh();
});
$('filterBody').addEventListener('change', e => {
  if (e.target.dataset.t) { F[e.target.dataset.t] = e.target.checked; refresh(); }
  if (e.target.id === 'fBlock') {
    F.block = e.target.value; refresh();
    if (F.block !== 'all') { focusBlock(+F.block); }
  }
});
$('clearFilters').addEventListener('click', () => { Object.assign(F, F0); refresh(); });
$('seeUnits').addEventListener('click', () => openSheet('list'));
document.querySelectorAll('#floors button').forEach(b => b.addEventListener('click', () => {
  F.floor = b.dataset.floor; refresh();
}));

/* ---------- Painéis ---------- */
let selected = null;
function openSheet(name) {
  $('sheetFilter').hidden = name !== 'filter';
  $('sheetList').hidden = name !== 'list';
  $('sheetViz').hidden = name !== 'viz';
  poiGroup.visible = name === 'viz';
  if (name) { closeDrawer(); hideHint(); }
  shiftGoal = name && !isMobile() ? Math.min(404, innerWidth / 2) : 0; // tira o centro da vista de baixo do painel
  if (name === 'filter') renderFilters();
  if (name === 'list') renderList();
  if (name === 'viz') renderViz();
}
$('vizBtn').addEventListener('click', () => openSheet($('sheetViz').hidden ? 'viz' : null));
$('entornoBtn').addEventListener('click', e => {
  entorno.visible = !entorno.visible;
  e.currentTarget.classList.toggle('on', entorno.visible);
  e.currentTarget.setAttribute('aria-pressed', entorno.visible);
});
$('openFilter').addEventListener('click', () => openSheet($('sheetFilter').hidden ? 'filter' : null));
$('openList').addEventListener('click', () => openSheet($('sheetList').hidden ? 'list' : null));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => openSheet(null)));

let shiftGoal = 0, shift = 0; // desloca o centro da câmera para fora da área coberta pela gaveta
function openDrawer() {
  $('drawer').hidden = false; document.body.classList.add('drawer-open');
  openSheetSilently();
  const d = $('drawer').getBoundingClientRect();
  shiftGoal = isMobile() ? d.height : d.width;
}
function openSheetSilently() { $('sheetFilter').hidden = true; $('sheetList').hidden = true; $('sheetViz').hidden = true; poiGroup.visible = false; }
function closeDrawer() { $('drawer').hidden = true; document.body.classList.remove('drawer-open'); shiftGoal = 0; }
function closeAll() {
  selected = null; highlight(null); areaHL(null); closeDrawer(); syncCuts();
  history.replaceState(null, '', location.pathname + location.search);
}
$('closeDrawer').addEventListener('click', closeAll);
$('backBtn').addEventListener('click', () => {
  if (selected && selected.kind === 'unit') { showBlock(selected.un.block); }
  else { closeAll(); homeView(true); }
});
$('homeBtn').addEventListener('click', () => { closeAll(); openSheet(null); homeView(true); });
$('labelsBtn').addEventListener('click', e => {
  labelGroup.visible = !labelGroup.visible;
  e.currentTarget.classList.toggle('on', labelGroup.visible);
  e.currentTarget.setAttribute('aria-pressed', labelGroup.visible);
});
const hideHint = () => $('hint').classList.add('off');
setTimeout(hideHint, 7000);

function highlight(un) {
  if (!un) { hlGroup.visible = false; return; }
  const f = unitFrame(un);
  hlGroup.position.set(f.cx, (un.floor - 1) * BH + BH / 2, f.cz);
  hlGroup.scale.set(f.sx + 0.5, BH - 0.1, f.sz + 0.5);
  hlGroup.visible = true;
}
const tip = $('tip');
const tipV = new THREE.Vector3();
function placeTip(un) {
  const f = unitFrame(un);
  tipV.set(f.cx, (un.floor - 1) * BH + BH, f.cz).project(camera);
  if (tipV.z > 1) { tip.style.display = 'none'; return; }
  tip.style.left = ((tipV.x * 0.5 + 0.5) * main.clientWidth) + 'px';
  tip.style.top = (((-tipV.y * 0.5 + 0.5) * main.clientHeight) - 10) + 'px';
  tip.style.display = 'block';
  $('tipCode').textContent = `${un.code} · Bl. ${pad(un.block)}`;
  const st = $('tipStatus');
  st.textContent = un.status; st.style.color = STATUS_COR[un.status];
}

const planImg = typ => {
  const k = typ === 'com' ? 'com' : 'sem';
  return `<div class="d-plan"><img src="${PLANTAS[k]}" alt="Planta baixa da unidade ${TIPO[k].toLowerCase()}: sala, cozinha, dois quartos e banheiro"></div>`;
};

function showUnit(un) {
  selected = { kind: 'unit', un };
  $('backTxt').textContent = `Bloco ${pad(un.block)}`;
  const m2 = Math.round(un.price / AREA[un.typ]);
  $('drawerBody').innerHTML =
    `<h2 class="d-title">Apartamento ${un.code}</h2>` +
    `<div class="d-sub"><i class="dot" style="background:${STATUS_COR[un.status]}"></i>${un.status} · ${un.floor}º andar · Bloco ${pad(un.block)}</div>` +
    `<div class="d-price"><span>Valor (fictício)</span><b>${brl(un.price)}</b><small>${brl(m2)} por m² construído</small></div>` +
    `<div class="d-grid">` +
      `<div><span>Tipologia</span><b>${TIPO[un.typ]}</b></div>` +
      `<div><span>Área construída</span><b>${AREA[un.typ].toString().replace('.', ',')} m²</b></div>` +
      `<div><span>Etapa</span><b>${un.etapa}ª etapa</b></div>` +
      `<div><span>Final</span><b>${pad(un.u)}${un.adapt ? ' · adaptável' : ''}</b></div>` +
    `</div>` +
    `<h3 class="d-h">Posição solar</h3><div class="sun">` +
      un.faces.map((x, i) => `<div><i class="arrow" style="transform:rotate(${x.b}deg)" aria-hidden="true">↑</i>` +
        `<span><b>${i ? 'Fachada lateral' : 'Fachada de topo'} · ${x.dir}</b><small>${x.sun[0].toUpperCase() + x.sun.slice(1)}</small></span></div>`).join('') +
    `</div><p class="d-note">Seta = para onde as janelas olham (norte para cima). Baseado na posição real do terreno.</p>` +
    `<h3 class="d-h">Planta</h3>${planImg(un.typ)}` +
    `<p class="d-note">${un.adapt ? 'Este final aparece na implantação como unidade com possibilidade de adaptação; o book não informa em quais andares. ' : ''}` +
    (un.typ === 'garden' ? 'Planta do book (p.36) da unidade sem varanda. A área do garden não tem planta no material.' : 'Planta do book (p.36). A unidade real pode ser espelhada.') + `</p>`;
  openDrawer();
  syncCuts();
  highlight(un);
  const f = unitFrame(un);
  flyTo(f.cx, un.floor * BH, f.cz, isMobile() ? 90 : 52, 0.94); // vista quase de cima para ler a planta
  history.replaceState(null, '', `#${un.block}-${un.code}`);
}
function showBlock(n, keepView) {
  selected = { kind: 'block', b: n };
  $('backTxt').textContent = 'Vista geral';
  const b = blockBy[n], list = units.filter(x => x.block === n);
  const c = s => list.filter(x => x.status === s).length;
  const tipo = b.tipo === 'garden' ? 'Sem varanda, com garden no térreo' : b.tipo === 'com' ? 'Torre com varanda' : 'Torre sem varanda';
  let stack = '';
  for (let f = FLOORS; f >= 1; f--) {
    stack += `<span class="fl">${f}º</span>`;
    list.filter(x => x.floor === f).sort((a, b2) => a.u - b2.u).forEach(un => {
      const cls = un.status === 'Disponível' ? 's-d' : un.status === 'Reservado' ? 's-r' : 's-v';
      stack += `<button type="button" class="${cls}${matches(un) ? '' : ' off'}" data-i="${units.indexOf(un)}" title="Apto ${un.code} · ${un.status}">${un.code}</button>`;
    });
  }
  $('drawerBody').innerHTML =
    `<h2 class="d-title">Bloco ${pad(n)}</h2>` +
    `<div class="d-sub">${tipo} · ${b.etapa}ª etapa · 5 andares × 4 finais</div>` +
    `<div class="stats"><div><b style="color:#b9781f">${c('Disponível')}</b><span>disponíveis</span></div>` +
    `<div><b>${c('Reservado')}</b><span>reservadas</span></div><div><b>${c('Vendido')}</b><span>vendidas</span></div></div>` +
    `<h3 class="d-h">Unidades por andar</h3><div class="stack" id="stack">${stack}</div>` +
    (b.adapt.length ? `<p class="d-note">Finais com possibilidade de adaptação: <b>${b.adapt.map(pad).sort().join(' e ')}</b>.</p>` : '') +
    `<h3 class="d-h">Planta</h3>${planImg(b.tipo)}<p class="d-note">Planta do book (p.36). Clique numa unidade acima ou numa janela da maquete.</p>`;
  if (keepView) return;
  openDrawer();
  highlight(null);
  syncCuts();
  focusBlock(n);
  history.replaceState(null, '', `#bloco-${n}`);
}
$('drawerBody').addEventListener('click', e => {
  const s = e.target.closest('#stack button');
  if (s) showUnit(units[+s.dataset.i]);
});

/* ---------- Áreas comuns ----------
   box/parts em pixels da implantação (p.37). Fotos: renders do book. A planta é esquemática,
   desenhada com as medidas reais tiradas da implantação; o mobiliário é ilustrativo. */
const AREAS = [
  { id: 'portaria', n: '01', nome: 'Portaria com grab and go', box: [323, 455, 354, 538], fotos: ['portaria'], pg: 6, kind: 'room', furn: 'balcao', parts: [[328, 517, 350, 536, 'room', 'Grab and go'], [323, 486, 354, 497, 'deck', 'Acesso']] },
  { id: 'salao-festas', n: '02', nome: 'Salão de festas', box: [324, 348, 374, 392], fotos: ['fachada-clube', 'salao-festas'], pg: 11, kind: 'room', furn: 'mesas' },
  { id: 'salao-infantil', n: '03', nome: 'Salão infantil', box: [332, 394, 392, 430], fotos: ['salao-infantil'], pg: 12, kind: 'room', furn: 'mesas' },
  { id: 'varanda-gourmet', n: '04', nome: 'Varanda gourmet', box: [352, 334, 394, 346], fotos: ['varanda-gourmet'], pg: 13, kind: 'deck', furn: 'bancada' },
  { id: 'piscina', n: '05–08', nome: 'Piscinas adulto e infantil', box: [318, 213, 399, 332], fotos: ['piscina'], pg: 14, kind: 'deck',
    parts: [[370, 225, 395, 285, 'deck', 'Deck seco'], [330, 262, 343, 298, 'wet', 'Deck molhado'], [343, 225, 366, 316, 'water', 'Piscina adulto'], [368, 292, 386, 313, 'water', 'Infantil']] },
  { id: 'parque-infantil', n: '12 · 42', nome: 'Parque infantil e pista infantil', box: [330, 150, 402, 214], fotos: ['parque-infantil'], pg: 28, kind: 'grass', parts: [[348, 170, 380, 204, 'play', 'Brinquedos']] },
  { id: 'quiosque', n: '11', nome: 'Quiosque gourmet', box: [474, 132, 508, 168], fotos: ['quiosque'], pg: 15, kind: 'deck', furn: 'mesas', parts: [[478, 136, 503, 145, 'room', 'Churrasqueira']] },
  { id: 'pet', n: '13 · 14', nome: 'Pet play e pet wash', box: [406, 88, 460, 114], fotos: ['pet'], pg: 28, kind: 'grass', parts: [[436, 92, 456, 104, 'room', 'Pet wash']] },
  { id: 'futmesa', n: '16', nome: 'Futmesa', box: [416, 118, 450, 149], fotos: ['futmesa'], pg: 26, kind: 'grass', parts: [[426, 128, 440, 139, 'court', 'Mesa']] },
  { id: 'carwash', n: '15 · 17', nome: 'Car wash e vaga para carro elétrico', box: [549, 94, 580, 120], fotos: ['carwash', 'vaga-verde'], pg: 31, kind: 'deck' },
  { id: 'minimarket', n: '19', nome: 'Mini market', box: [958, 497, 986, 523], fotos: ['minimarket'], pg: 32, kind: 'room', furn: 'gondolas' },
  { id: 'coworking', n: '18', nome: 'Coworking', box: [962, 569, 1000, 597], fotos: ['coworking'], pg: 30, kind: 'room', furn: 'trabalho' },
  { id: 'bicicletario', n: '33', nome: 'Bicicletário', box: [988, 546, 1007, 564], fotos: ['bicicletario'], pg: 25, kind: 'deck' },
  { id: 'praca-refugio', n: '34 · 37', nome: 'Pergolado e praça do refúgio', box: [1458, 316, 1489, 412], fotos: [], kind: 'deck', parts: [[1463, 362, 1487, 400, 'deck', 'Pergolado']] },
  { id: 'academia', n: '20', nome: 'Academia', box: [1618, 490, 1654, 529], fotos: ['academia-fachada', 'academia'], pg: 18, kind: 'room', furn: 'aparelhos' },
  { id: 'lavanderia', n: '23', nome: 'Lavanderia', box: [1650, 490, 1668, 512], fotos: ['lavanderia'], pg: 32, kind: 'room', furn: 'maquinas' },
  { id: 'brinquedoteca', n: '22', nome: 'Brinquedoteca', box: [1650, 510, 1668, 547], fotos: ['brinquedoteca'], pg: 29, kind: 'room', furn: 'mesas' },
  { id: 'salao-jogos', n: '21', nome: 'Salão de jogos', box: [1618, 527, 1652, 574], fotos: ['salao-jogos'], pg: 26, kind: 'room', furn: 'jogos' },
  { id: 'espaco-kids', n: '24', nome: 'Espaço kids', box: [1650, 570, 1672, 598], fotos: ['espaco-kids'], pg: 27, kind: 'grass', parts: [[1653, 574, 1668, 592, 'play', 'Brinquedos']] },
  { id: 'quadras-areia', n: '27', nome: 'Quadras de areia', box: [1676, 356, 1851, 426], fotos: ['quadras-areia'], pg: 23, kind: 'sand',
    parts: [[1687, 373.5, 1757, 408.5, 'sandcourt', 'Quadra 1'], [1771, 373.5, 1841, 408.5, 'sandcourt', 'Quadra 2']] },
  { id: 'quadra-poliesportiva', n: '26', nome: 'Quadra poliesportiva', box: [1686, 503, 1814, 581], fotos: ['quadra-poliesportiva'], pg: 22, kind: 'courtbase', parts: [[1696, 512, 1804, 572, 'court', 'Quadra']] },
  { id: 'quiosques-apoio', n: '25', nome: 'Quiosques de apoio às quadras', box: [1760, 446, 1822, 468], fotos: ['quiosques-apoio', 'quiosques-apoio-2'], pg: 24, kind: 'grass', parts: [[1764, 450, 1780, 464, 'room', 'Quiosque'], [1801, 450, 1817, 464, 'room', 'Quiosque']] },
  { id: 'parque-aventura', n: '28', nome: 'Parque aventura', box: [1696, 426, 1752, 466], fotos: ['parque-aventura'], pg: 27, kind: 'grass', parts: [[1706, 434, 1744, 460, 'play', 'Circuito']] },
  { id: 'academia-ar-livre', n: '29', nome: 'Academia ao ar livre', box: [1818, 576, 1854, 594], fotos: ['academia-ar-livre'], pg: 19, kind: 'deck' },
  { id: 'lazer-02', n: '20–30', nome: 'Lazer 02 · clube esportivo', box: [1618, 341, 1865, 603], fotos: ['lazer-02', 'pista-cooper'], pg: 8, kind: 'zone', resumo: 'Academia, salão de jogos, brinquedoteca, lavanderia, quadras de areia e poliesportiva, parque aventura, academia ao ar livre e pista de cooper.' },
  { id: 'lazer-01', n: '01–16', nome: 'Lazer 01 · clube social', box: [300, 88, 530, 603], fotos: ['lazer-01'], pg: 7, kind: 'zone', resumo: 'Portaria, salão de festas, salão infantil, varanda gourmet, piscinas, parque infantil, quiosque gourmet e espaço pet.' }
];
const areaBy = Object.fromEntries(AREAS.map(a => [a.id, a]));
function areaAt(px, py) {
  // a menor área que contém o ponto (as zonas gerais ficam por último)
  let best = null, bestA = Infinity;
  for (const a of AREAS) {
    const [x0, y0, x1, y1] = a.box, m = 3;
    if (px < x0 - m || px > x1 + m || py < y0 - m || py > y1 + m) continue;
    const ar = (x1 - x0) * (y1 - y0);
    if (ar < bestA) { best = a; bestA = ar; }
  }
  return best;
}
const fmtM = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
function areaPlanSVG(a) {
  const [x0, y0, x1, y1] = a.box, wm = (x1 - x0) * S, dm = (y1 - y0) * S;
  const VW = 360, pad = 34, k = Math.min((VW - pad * 2) / (x1 - x0), 260 / (y1 - y0));
  const W = (x1 - x0) * k, H = (y1 - y0) * k, VH = H + pad * 2;
  const X = x => pad + (x - x0) * k, Y = y => pad + (y - y0) * k;
  const FILL = { room: '#f7f4ec', deck: '#ece2cf', wet: '#bfe8ee', water: '#4fb9d9', grass: '#b9cf98', sand: '#eadfc3', sandcourt: '#e3d4ad', court: '#d8437f', courtbase: '#2c6c70', play: '#f2c14e', zone: '#e9e6dc' };
  let s = `<svg viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Planta esquemática: ${a.nome}, ${fmtM(wm)} por ${fmtM(dm)} metros" font-family="Manrope,sans-serif">`;
  s += `<rect x="${pad}" y="${pad}" width="${W}" height="${H}" fill="${FILL[a.kind] || '#eee'}" stroke="#2b2b2b" stroke-width="${a.kind === 'room' ? 3 : 1.2}"/>`;
  if (a.kind === 'room') s += `<rect x="${pad + W * 0.42}" y="${pad + H - 2}" width="${Math.min(W * 0.18, 26)}" height="4" fill="#f7f4ec"/>` + `<path d="M${pad + W * 0.42} ${pad + H} a${Math.min(W * 0.18, 26)} ${Math.min(W * 0.18, 26)} 0 0 1 ${Math.min(W * 0.18, 26)} -${Math.min(W * 0.18, 26)}" fill="none" stroke="#999" stroke-dasharray="3 2"/>`;
  // mobiliário ilustrativo
  const inner = (fn, nx, ny) => { for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) s += fn(pad + W * (i + 0.5) / nx, pad + H * (j + 0.5) / ny); };
  const f = a.furn, cell = Math.min(W, H);
  if (f === 'mesas') inner((x, y) => `<circle cx="${x}" cy="${y}" r="${cell * 0.07}" fill="#d9c4a3" stroke="#a88a5c"/>`, Math.max(2, Math.round(W / 60)), Math.max(2, Math.round(H / 60)));
  if (f === 'aparelhos') inner((x, y) => `<rect x="${x - cell * 0.08}" y="${y - cell * 0.04}" width="${cell * 0.16}" height="${cell * 0.08}" rx="2" fill="#555"/>`, 4, 3);
  if (f === 'maquinas') inner((x, y) => `<rect x="${x - cell * 0.15}" y="${y - cell * 0.15}" width="${cell * 0.3}" height="${cell * 0.3}" rx="3" fill="#fff" stroke="#888"/><circle cx="${x}" cy="${y}" r="${cell * 0.09}" fill="none" stroke="#888"/>`, 1, 3);
  if (f === 'gondolas') inner((x, y) => `<rect x="${x - W * 0.08}" y="${y - H * 0.3}" width="${W * 0.16}" height="${H * 0.6}" fill="#cfc6b6"/>`, 3, 1);
  if (f === 'trabalho') inner((x, y) => `<rect x="${x - W * 0.35}" y="${y - H * 0.06}" width="${W * 0.7}" height="${H * 0.12}" fill="#d9c4a3"/>`, 1, 3);
  if (f === 'jogos') inner((x, y) => `<rect x="${x - cell * 0.13}" y="${y - cell * 0.08}" width="${cell * 0.26}" height="${cell * 0.16}" rx="2" fill="#2f7a55"/>`, 2, 2);
  if (f === 'bancada') s += `<rect x="${pad + W * 0.1}" y="${pad + H * 0.3}" width="${W * 0.8}" height="${H * 0.4}" fill="#8a5a36"/>`;
  if (f === 'balcao') s += '';
  for (const [a0, b0, a1, b1, kind, lab] of a.parts || []) {
    s += `<rect x="${X(a0)}" y="${Y(b0)}" width="${(a1 - a0) * k}" height="${(b1 - b0) * k}" fill="${FILL[kind]}" stroke="${kind === 'room' ? '#2b2b2b' : '#fff'}" stroke-width="${kind === 'room' ? 2.5 : 1.5}"/>`;
    if (kind === 'court' || kind === 'sandcourt') { const cx = X((a0 + a1) / 2); s += `<line x1="${cx}" y1="${Y(b0)}" x2="${cx}" y2="${Y(b1)}" stroke="#fff" stroke-width="1.5"/><circle cx="${cx}" cy="${Y((b0 + b1) / 2)}" r="${(b1 - b0) * k * 0.15}" fill="none" stroke="#fff" stroke-width="1.2"/>`; }
    const tw = (a1 - a0) * k;
    if (tw > 40) s += `<text x="${X((a0 + a1) / 2)}" y="${Y((b0 + b1) / 2) - 2}" text-anchor="middle" font-size="10" font-weight="600" fill="${kind === 'water' || kind === 'court' ? '#fff' : '#333'}">${lab}</text>` +
      `<text x="${X((a0 + a1) / 2)}" y="${Y((b0 + b1) / 2) + 10}" text-anchor="middle" font-size="9" fill="${kind === 'water' || kind === 'court' ? '#fff' : '#555'}">${fmtM((a1 - a0) * S)} × ${fmtM((b1 - b0) * S)} m</text>`;
  }
  // cotas
  s += `<g stroke="#666" stroke-width="1"><line x1="${pad}" y1="${pad - 14}" x2="${pad + W}" y2="${pad - 14}"/><line x1="${pad}" y1="${pad - 18}" x2="${pad}" y2="${pad - 10}"/><line x1="${pad + W}" y1="${pad - 18}" x2="${pad + W}" y2="${pad - 10}"/>` +
       `<line x1="${pad - 14}" y1="${pad}" x2="${pad - 14}" y2="${pad + H}"/><line x1="${pad - 18}" y1="${pad}" x2="${pad - 10}" y2="${pad}"/><line x1="${pad - 18}" y1="${pad + H}" x2="${pad - 10}" y2="${pad + H}"/></g>`;
  s += `<text x="${pad + W / 2}" y="${pad - 19}" text-anchor="middle" font-size="11" fill="#333">${fmtM(wm)} m</text>`;
  s += `<text x="${pad - 19}" y="${pad + H / 2}" text-anchor="middle" font-size="11" fill="#333" transform="rotate(-90 ${pad - 19} ${pad + H / 2})">${fmtM(dm)} m</text>`;
  if (!a.parts && a.kind === 'room') s += `<text x="${pad + W / 2}" y="${pad + 14}" text-anchor="middle" font-size="11" font-weight="600" fill="#333">${a.nome}</text>`;
  return s + `</svg>`;
}
function showArea(a, keepView) {
  selected = { kind: 'area', a };
  $('backTxt').textContent = 'Vista geral';
  const [x0, y0, x1, y1] = a.box, wm = (x1 - x0) * S, dm = (y1 - y0) * S;
  const fotos = a.fotos.map(f => `<figure class="d-photo"><img src="img/areas/${f}.jpg" alt="Render do book: ${a.nome}" loading="lazy"></figure>`).join('');
  $('drawerBody').innerHTML =
    `<h2 class="d-title">${a.nome}</h2>` +
    `<div class="d-sub">Área comum · item ${a.n} da implantação · cerca de ${fmtM(wm)} × ${fmtM(dm)} m (${Math.round(wm * dm)} m²)</div>` +
    (a.resumo ? `<p class="d-note">${a.resumo} Clique num item da maquete para ver os detalhes.</p>` : '') +
    (fotos ? `<h3 class="d-h">Como vai ficar</h3>${fotos}<p class="d-note">Render do book${a.pg ? ` (p.${a.pg})` : ''}. Imagem ilustrativa.</p>` : '') +
    (a.kind !== 'zone' ? `<h3 class="d-h">Planta básica</h3><div class="d-plan svgplan">${areaPlanSVG(a)}</div><p class="d-note">Esquema com as medidas tiradas da implantação; o mobiliário é ilustrativo. O book não traz planta desta área.</p>` : '') +
    `<h3 class="d-h">Na implantação</h3><div class="d-plan"><img src="img/areas/impl-${a.id}.jpg" alt="Recorte da implantação do book mostrando ${a.nome} vista de cima" loading="lazy"></div><p class="d-note">Recorte da implantação do book (p.37).</p>`;
  if (keepView) return;
  openDrawer(); highlight(null); syncCuts();
  areaHL(a);
  const r = Math.max(wm, dm);
  flyTo(wx((x0 + x1) / 2), 0, wz((y0 + y1) / 2), THREE.MathUtils.clamp(r * 2.6, 45, 320), 0.6);
  history.replaceState(null, '', `#area-${a.id}`);
}
/* contorno da área selecionada */
const areaLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x1f9d6b, depthTest: false }));
areaLine.renderOrder = 6; areaLine.visible = false; scene.add(areaLine);
function areaHL(a) {
  if (!a) { areaLine.visible = false; return; }
  const [x0, y0, x1, y1] = a.box;
  areaLine.geometry.setFromPoints([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => new THREE.Vector3(wx(x), 0.3, wz(y))));
  areaLine.visible = true;
}

/* ---------- Câmera ---------- */
function flyTo(x, y, z, dist, elev = 0.45) { // elev: seno mínimo do ângulo de cima (1 = vista de topo)
  const target = new THREE.Vector3(x, y, z);
  const off = camera.position.clone().sub(controls.target).normalize();
  if (off.y < elev) { const hz = Math.hypot(off.x, off.z) || 1, c = Math.sqrt(1 - elev * elev); off.set(off.x / hz * c, elev, off.z / hz * c); }
  camGoal = { target, pos: target.clone().add(off.normalize().multiplyScalar(dist)) };
}
function focusUnit(un) { showUnit(un); }
function focusBlock(n) { const b = blockBy[n]; flyTo(wx(b.px), 6, wz(b.py), 95); }

/* ---------- Lista ---------- */
let sortBy = 'price';
const SORTS = { price: (a, b) => a.price - b.price, '-price': (a, b) => b.price - a.price, '-floor': (a, b) => b.floor - a.floor || a.price - b.price };
function renderList() {
  const rows = units.filter(u => matches(u)).sort(SORTS[sortBy]);
  const disp = rows.filter(u => u.status === 'Disponível').length;
  $('listCount').textContent = `${rows.length} unidades · ${disp} disponíveis` + (rows.length > 300 ? ' — mostrando 300, use o filtro' : '');
  $('listBody').innerHTML = rows.slice(0, 300).map(un =>
    `<button type="button" class="lrow" data-i="${units.indexOf(un)}">` +
      `<span class="code">${un.code}<em style="color:${STATUS_COR[un.status]}">${un.status}</em></span>` +
      `<span class="info">${TIPO[un.typ]}<small>Bloco ${pad(un.block)} · ${un.floor}º andar · ${AREA[un.typ].toString().replace('.', ',')} m²${un.adapt ? ' · adaptável' : ''}</small><small>Face ${un.faces.map(x => x.dir.toLowerCase()).join(' e ')}</small></span>` +
      `<span class="val">${brl(un.price)}</span>` +
    `</button>`
  ).join('');
}
$('listBody').addEventListener('click', e => {
  const row = e.target.closest('.lrow');
  if (row) focusUnit(units[+row.dataset.i]);
});
$('sorts').addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  sortBy = c.dataset.sort;
  document.querySelectorAll('#sorts .chip').forEach(x => x.classList.toggle('on', x === c));
  renderList(); $('listBody').parentElement.scrollTop = 0;
});

/* ---------- Mouse e toque ---------- */
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null, down = null;
function castAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const plans = Object.values(planMeshes).flat().filter(m => m.visible);
  const p = plans.length ? ray.intersectObjects(plans, false)[0] : null;
  const w = ray.intersectObject(winMesh)[0];
  const b = ray.intersectObjects(blockMeshes)[0];
  const best = Math.min(p ? p.distance : Infinity, w ? w.distance - 0.5 : Infinity, b ? b.distance : Infinity);
  if (p && p.distance === best) return { un: units[p.object.userData.unit] };
  if (w && w.distance - 0.5 === best) return { un: units[winUnit[w.instanceId]] };
  if (b) {
    // clicou na parede ou na laje: descobre o apartamento pelo ponto atingido (andar pela altura, quadrante pela posição)
    const n = b.object.userData.block, bl = blockBy[n], pt = b.point;
    if (b.object === blockParts[n].core) return { block: n };
    const k = parseInt(curK[n] ?? FLOORS, 10);
    const top = b.face && Math.abs(b.face.normal.y) > 0.5;
    if (top && k === FLOORS) return { block: n };
    const floor = top ? k : THREE.MathUtils.clamp(Math.floor(pt.y / BH) + 1, 1, k);
    const q = (pt.z > wz(bl.py) ? 2 : 0) + (pt.x > wx(bl.px) ? 1 : 0);
    return { un: unitAt(n, floor, q) };
  }
  const g = ray.intersectObject(ground)[0];
  if (g) { const a = areaAt(g.point.x / S + OX, g.point.z / S + OY); if (a) return { area: a }; }
  return {};
}
const cv = renderer.domElement;
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const hit = castAt(e), un = hit.un || null;
  cv.style.cursor = un || hit.block || hit.area ? 'pointer' : 'grab';
  if (un !== hovered) {
    hovered = un;
    if (un) highlight(un);
    else highlight(selected && selected.kind === 'unit' ? selected.un : null);
  }
});
cv.addEventListener('pointerleave', () => { hovered = null; highlight(selected && selected.kind === 'unit' ? selected.un : null); });
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
cv.addEventListener('pointerup', e => { // só conta como clique/toque se não foi arrasto
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 600) { down = null; return; }
  down = null;
  const hit = castAt(e);
  if (hit.un) showUnit(hit.un);
  else if (hit.block) showBlock(hit.block);
  else if (hit.area) showArea(hit.area);
  else { closeAll(); openSheet(null); }
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('sheetFilter').hidden || !$('sheetList').hidden || !$('sheetViz').hidden) openSheet(null); else closeAll();
});

refresh();

/* Link direto: #31-302 (unidade) ou #bloco-31 */
{
  const h = location.hash.slice(1), mU = h.match(/^(\d+)-(\d+)$/), mB = h.match(/^bloco-(\d+)$/), mA = h.match(/^area-([\w-]+)$/);
  const un = mU && units.find(u => u.block === +mU[1] && u.code === +mU[2]);
  if (un) showUnit(un); else if (mB && blockBy[+mB[1]]) showBlock(+mB[1]); else if (mA && areaBy[mA[1]]) showArea(areaBy[mA[1]]);
}

/* ---------- Loop ---------- */
const north = $('north');
const NORTE = NORTH; // norte real (ver "Posição solar")
const clock = new THREE.Clock();
let lastFar = null;
(function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (camGoal) { // animação por tempo: mesma duração em celular lento ou rápido
    const k = 1 - Math.pow(0.004, dt);
    camera.position.lerp(camGoal.pos, k);
    controls.target.lerp(camGoal.target, k);
    if (camera.position.distanceTo(camGoal.pos) < 0.4) camGoal = null;
  }
  if (shift !== shiftGoal) {
    shift += (shiftGoal - shift) * (1 - Math.pow(0.002, dt));
    if (Math.abs(shift - shiftGoal) <= 0.5) shift = shiftGoal;
  }
  {
    const w = main.clientWidth, h = main.clientHeight;
    if (shift >= 0.5) {
      if (isMobile()) camera.setViewOffset(w, h + shift, 0, shift, w, h);
      else camera.setViewOffset(w + shift, h, shift, 0, w, h);
    } else if (camera.view && camera.view.enabled) {
      camera.clearViewOffset(); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  waterNormal.offset.x += dt * 0.025; waterNormal.offset.y += dt * 0.012;
  controls.update();
  const fx = controls.target.x - camera.position.x, fz = controls.target.z - camera.position.z, l = Math.hypot(fx, fz) || 1;
  const ang = Math.atan2(NORTE.x * (-fz / l) + NORTE.z * (fx / l), NORTE.x * (fx / l) + NORTE.z * (fz / l));
  north.style.transform = `rotate(${ang}rad)`;
  { // de longe: só os nomes das avenidas; números e áreas somem para não amontoar
    const dist = camera.position.distanceTo(controls.target), far = dist > 620;
    const tier = far ? 2 : dist > 520 ? 1 : 0; // 0 perto: tudo · 1 médio: sem ruas menores · 2 longe: só avenidas
    const areasOk = tier < 2 && (main.clientWidth >= 700 || dist < 230); // no celular, nomes das áreas só bem de perto
    const key = tier + (areasOk ? 'a' : '');
    if (key !== lastFar) {
      lastFar = key;
      areaLabels.children.forEach(s => { const st = s.userData.street; s.visible = st === 'major' || (st === 'minor' ? tier === 0 : areasOk); });
      BL.forEach(b => { blockParts[b.n].label.visible = !far; });
    }
  }
  const cur = hovered || (selected && selected.kind === 'unit' ? selected.un : null);
  if (cur) placeTip(cur); else tip.style.display = 'none';
  renderer.render(scene, camera);
})();
