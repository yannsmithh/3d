import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
const STATUS_COR = { 'Disponível': '#1f7a44', 'Reservado': '#9a6a10', 'Vendido': '#5f6b78' };

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
const mq = matchMedia('(max-width:820px) and (orientation:portrait), (max-width:600px)');
const isMobile = () => mq.matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  document.getElementById('err').style.display = 'flex';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
main.appendChild(renderer.domElement);
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.setAttribute('aria-label', 'Maquete 3D do Life Residence. Use os filtros ou a aba Lista para encontrar unidades.');

var dirty = true; // só redesenha o canvas quando algo mudou
function wake() { dirty = true; }
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe3f1);
scene.fog = new THREE.Fog(0xcfe3f1, 700, 1600);

const camera = new THREE.PerspectiveCamera(38, 1, 2, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 25;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.maxDistance = 900;

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
  wake();
  // girou o aparelho e nada está selecionado: reenquadra
  const portrait = w / h < 0.95;
  if (lastAspectPortrait !== null && portrait !== lastAspectPortrait && !selected) homeView(true);
  lastAspectPortrait = portrait;
}
new ResizeObserver(resize).observe(main);
resize();
homeView(false);
controls.addEventListener('change', wake);
controls.addEventListener('start', () => { camGoal = null; document.getElementById('hint').classList.add('off'); });

scene.add(new THREE.HemisphereLight(0xf4f8ff, 0xc9c4b4, 2.1));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
sun.position.set(-140, 230, 150); // coerente com as sombras pintadas no piso
scene.add(sun);

/* =====================================================================
   PISO — toda a implantação é pintada num único canvas (uma textura só).
   Sem camadas sobrepostas => sem z-fighting / cintilação.
   ===================================================================== */
const GX0 = 195, GY0 = 60, GW = 1690, GH = 580;
const TEXW = Math.min(3072, renderer.capabilities.maxTextureSize);
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
g.fillStyle = '#c6cfb4'; g.fillRect(GX0, GY0, GW, GH);
for (let i = 0; i < 5000; i++) { g.fillStyle = ['#bcc6a8', '#cdd5bd', '#c0caae'][i % 3]; g.fillRect(GX0 + Math.random() * GW, GY0 + Math.random() * GH, 1.6, 1.6); }
// Rua Rubens Francisco Dias (oeste): asfalto, ciclovia e calçada
R(200, GY0, 246, GY0 + GH, '#5a5f66', false);
R(246, GY0, 260, GY0 + GH, '#d08a8f', false);
R(260, GY0, 300, GY0 + GH, '#cfd0d0', false);
g.strokeStyle = '#f2e9b0'; g.lineWidth = 0.9; g.setLineDash([9, 9]);
g.beginPath(); g.moveTo(223, GY0); g.lineTo(223, GY0 + GH); g.stroke(); g.setLineDash([]);
g.strokeStyle = '#fff'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(253, GY0); g.lineTo(253, GY0 + GH); g.stroke();

// gramado do terreno
g.save(); sitePath(); g.clip();
g.fillStyle = '#7fa55b'; g.fillRect(GX0, GY0, GW, GH);
for (let i = 0; i < 26000; i++) {
  g.fillStyle = ['#6f9650', '#8db668', '#789d55', '#9cc076'][i % 4];
  g.fillRect(300 + Math.random() * 1570, 85 + Math.random() * 520, 1.3, 1.3);
}
g.restore();

// vias internas (piso intertravado)
const ROAD = '#a7a49d';
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
  R(x0, y0, x1, y1, '#cbc5ab');
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
for (let t = 0; trees.length < 120 && t < 9000; t++) {
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
const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0xc6cfb4, roughness: 1 }));
far.rotation.x = -Math.PI / 2; far.position.y = -0.6;
scene.add(far);

/* =====================================================================
   OBJETOS 3D
   ===================================================================== */
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const mWall = M(0xdcdcda), mCore = M(0x8a8e94), mRoof = M(0x5a5f66), mWhite = M(0xf4f4f2), mWood = M(0x8a5a36),
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
const mBase = M(0x6f7379);
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

/* ---- Janelas, esquadrias, painéis e varandas (instanciados) ---- */
const dummy = new THREE.Object3D();
const winUnit = [];
const NW = N * 3;
const unitPlane = new THREE.PlaneGeometry(1, 1);
const winMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshBasicMaterial({ toneMapped: false }), NW);
const frameMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshBasicMaterial({ color: 0xf7f7f5 }), NW);
const panelMesh = new THREE.InstancedMesh(unitPlane, new THREE.MeshStandardMaterial({ color: 0xa3a7ac, roughness: 0.9 }), BL.length * 8);
const nCom = units.filter(u => u.typ === 'com').length;
const balMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3.6, 0.16, 1.25), M(0xdcdddd), nCom);
const guardMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3.6, 1.0, 0.06), M(0xa9cfe0, { transparent: true, opacity: 0.55, roughness: 0.15 }), nCom);
let wi = 0, bi = 0;
function putPlane(mesh, i, face, off, along, y, w, h) {
  const tx = Math.abs(face.nz), tz = Math.abs(face.nx);
  dummy.position.set(face.x + face.nx * off + tx * along, y, face.z + face.nz * off + tz * along);
  dummy.rotation.set(0, Math.atan2(face.nx, face.nz), 0);
  dummy.scale.set(w, h, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
units.forEach((un, ui) => {
  const f = unitFrame(un), y0 = (un.floor - 1) * BH;
  const com = un.typ === 'com';
  // fachada de topo da ala: sala (janela larga ou porta da varanda)
  const ew = com ? 2.4 : 2.6, eh = com ? 2.1 : 1.45, ey = y0 + (com ? 1.25 : 1.65);
  putPlane(frameMesh, wi, f.end, 0.05, 0, ey, ew + 0.3, eh + 0.3);
  putPlane(winMesh, wi, f.end, 0.09, 0, ey, ew, eh); blockParts[un.block].win.push(wi); winUnit[wi++] = ui;
  // fachada lateral: dois quartos
  for (const a of [-2.1, 2.1]) {
    putPlane(frameMesh, wi, f.side, 0.05, a, y0 + 1.7, 1.6, 1.5);
    putPlane(winMesh, wi, f.side, 0.09, a, y0 + 1.7, 1.3, 1.2); blockParts[un.block].win.push(wi); winUnit[wi++] = ui;
  }
  if (com) {
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, Math.atan2(f.end.nx, f.end.nz), 0);
    dummy.position.set(f.end.x + f.end.nx * 0.62, y0 + 0.08, f.end.z + f.end.nz * 0.62); dummy.updateMatrix();
    balMesh.setMatrixAt(bi, dummy.matrix);
    dummy.position.set(f.end.x + f.end.nx * 1.2, y0 + 0.66, f.end.z + f.end.nz * 1.2); dummy.updateMatrix();
    blockParts[un.block].bal.push([bi, un.floor]); guardMesh.setMatrixAt(bi++, dummy.matrix);
  }
});
let pi = 0;
BL.forEach(b => { // painéis escuros verticais (fachada em dois tons, como no book p.33)
  for (let q = 0; q < 4; q++) {
    const f = unitFrame({ block: b.n, q });
    blockParts[b.n].pan.push([pi, q]);
    putPlane(panelMesh, pi++, f.side, 0.02, 0, HT / 2 + 0.25, 6.6, HT - 0.5);
    putPlane(panelMesh, pi++, f.end, 0.02, 0, HT / 2 + 0.25, 3.4, HT - 0.5);
  }
});
[winMesh, frameMesh, panelMesh, balMesh, guardMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; scene.add(m); });

/* ---- Corte por andar: ao clicar numa unidade, o bloco mostra só até o andar dela ---- */
const ORIG = new Map([winMesh, frameMesh, balMesh, guardMesh].map(m => [m, m.instanceMatrix.array.slice()]));
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function showInst(mesh, i, on) {
  if (on) mesh.instanceMatrix.array.set(ORIG.get(mesh).subarray(i * 16, i * 16 + 16), i * 16);
  else mesh.setMatrixAt(i, ZERO);
}
function applyCut(n, k) {
  wake(); // k = último andar visível (FLOORS = prédio inteiro)
  const p = blockParts[n], h = k * BH;
  p.wings.forEach(w => { w.scale.y = h / HT; w.position.y = h / 2; });
  p.roofs.forEach(r => { r.position.y = h + 0.175; });
  p.core.scale.y = (h + 1.4) / (HT + 1.4); p.core.position.y = (h + 1.4) / 2;
  p.res.position.y = h + 1.4 + 0.8;
  if (p.label) p.label.position.y = h + 5.5;
  p.win.forEach(i => { const on = units[winUnit[i]].floor <= k; showInst(winMesh, i, on); showInst(frameMesh, i, on); });
  p.bal.forEach(([i, f]) => { const on = f <= k; showInst(balMesh, i, on); showInst(guardMesh, i, on); });
  p.pan.forEach(([i, q]) => {
    const f = unitFrame({ block: n, q });
    putPlane(panelMesh, i, f.side, 0.02, 0, h / 2 + 0.25, 6.6, h - 0.5);
    putPlane(panelMesh, i + 1, f.end, 0.02, 0, h / 2 + 0.25, 3.4, h - 0.5);
  });
  [winMesh, frameMesh, panelMesh, balMesh, guardMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; });
}
let cut = null;
function setCut(n, k) {
  if (cut && cut.n !== n) applyCut(cut.n, FLOORS);
  applyCut(n, k);
  cut = k < FLOORS ? { n, k } : null;
}
function clearCut() { if (cut) { applyCut(cut.n, FLOORS); cut = null; } }

/* Destaque da unidade: contorno verde no volume do apartamento */
const hlGroup = new THREE.Group();
const hlBox = new THREE.BoxGeometry(1, 1, 1);
hlGroup.add(
  new THREE.LineSegments(new THREE.EdgesGeometry(hlBox), new THREE.LineBasicMaterial({ color: 0x16a34a })),
  new THREE.Mesh(hlBox, new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.28, depthWrite: false }))
);
hlGroup.visible = false;
scene.add(hlGroup);

/* Faixa do andar inteiro (hover na fachada): dourada, como no vídeo de referência */
const band = new THREE.Group();
band.add(
  new THREE.LineSegments(new THREE.EdgesGeometry(hlBox), new THREE.LineBasicMaterial({ color: 0xffe08a })),
  new THREE.Mesh(hlBox, new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.32, depthWrite: false }))
);
band.visible = false;
scene.add(band);
function placeBand(n, f) {
  const b = blockBy[n], H = b.o === 'H';
  band.position.set(wx(b.px), (f - 1) * BH + BH / 2, wz(b.py));
  band.scale.set(H ? HALF * 2 + 0.6 : WW + 0.6, BH - 0.1, H ? WW + 0.6 : HALF * 2 + 0.6);
  band.visible = true;
}

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
  const used = stalls.filter((s, i) => rnd(i * 13 + 4) < 0.25);
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
for (let i = 0; i < 7; i++) { box(wx(377), wz(228 + i * 8.5), 2.0, 0.75, 0.35, mWhite, 0.05); }
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
function label(text, px, py, y) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d'); x.font = 'bold 44px Arial';
  const w = Math.ceil(x.measureText(text).width) + 56; c.width = w; c.height = 84;
  const g2 = c.getContext('2d');
  g2.fillStyle = 'rgba(20,35,58,.86)'; g2.beginPath(); g2.roundRect(0, 0, w, 84, 42); g2.fill();
  g2.fillStyle = '#fff'; g2.font = 'bold 44px Arial'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(text, w / 2, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, sizeAttenuation: false }));
  s.scale.set(w / 84 * 0.019, 0.019, 1); s.position.set(wx(px), y, wz(py)); s.renderOrder = 5;
  areaLabels.add(s);
}
[['Portaria', 338, 492, 9.5], ['Salão de festas', 350, 372, 8.5], ['Piscina', 356, 268, 5], ['Parque infantil', 362, 186, 7],
 ['Quiosque gourmet', 490, 150, 8], ['Pet play', 432, 100, 5], ['Mini market', 972, 510, 7.5], ['Coworking', 981, 583, 7.5],
 ['Quadras de areia', 1764, 391, 7.5], ['Quadra poliesportiva', 1750, 542, 8], ['Academia', 1636, 509, 9],
 ['Salão de jogos', 1635, 551, 8], ['Pista de cooper', 1800, 600, 4], ['Rua Rubens Francisco Dias', 232, 300, 5]]
  .forEach(l => label(...l));
BL.forEach(b => { // número do bloco, como na implantação
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d'); x.fillStyle = '#111'; x.beginPath(); x.arc(48, 48, 46, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 50px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(b.n).padStart(2, '0'), 48, 51);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, sizeAttenuation: false }));
  s.scale.set(0.021, 0.021, 1); s.position.set(wx(b.px), HT + 5.5, wz(b.py)); s.renderOrder = 5;
  labelGroup.add(s); blockParts[b.n].label = s;
});

/* ---------- Cores das janelas ---------- */
const C_LIT = new THREE.Color(0xffd257), C_RES = new THREE.Color(0xe8892b), C_SOLD = new THREE.Color(0x3b4553), C_OFF = new THREE.Color(0xaab2bb);

/* ---------- Filtros ---------- */
const $ = id => document.getElementById(id);
const fTyp = $('fTyp'), fFloor = $('fFloor'), fEtapa = $('fEtapa'), fBlock = $('fBlock'), fPrice = $('fPrice'),
      fAvail = $('fAvail'), fAdapt = $('fAdapt'), fLabels = $('fLabels'), pVal = $('pVal'), kpis = $('kpis');
BL.forEach(b => fBlock.insertAdjacentHTML('beforeend', `<option value="${b.n}">Bloco ${String(b.n).padStart(2, '0')} · ${b.etapa}ª etapa</option>`));
fPrice.min = Math.floor(minP / 500) * 500; fPrice.max = Math.ceil(maxP / 500) * 500; fPrice.step = 500; fPrice.value = fPrice.max;

function matches(un) {
  if (fTyp.value !== 'all' && un.typ !== fTyp.value) return false;
  if (fFloor.value !== 'all' && un.floor !== +fFloor.value) return false;
  if (fEtapa.value !== 'all' && un.etapa !== +fEtapa.value) return false;
  if (fBlock.value !== 'all' && un.block !== +fBlock.value) return false;
  if (un.price > +fPrice.value) return false;
  if (fAvail.checked && un.status !== 'Disponível') return false;
  if (fAdapt.checked && !un.adapt) return false;
  return true;
}
function refresh() {
  wake();
  pVal.textContent = brl(+fPrice.value);
  const ativos = [fTyp, fFloor, fEtapa, fBlock].filter(x => x.value !== 'all').length
    + (+fPrice.value < +fPrice.max) + fAvail.checked + fAdapt.checked;
  $('filtroResumo').textContent = ativos ? `${ativos} ativo${ativos > 1 ? 's' : ''}` : 'nenhum ativo';
  let vis = 0, disp = 0;
  const ok = units.map(un => { const m = matches(un); if (m) { vis++; if (un.status === 'Disponível') disp++; } return m; });
  for (let i = 0; i < NW; i++) {
    const un = units[winUnit[i]];
    winMesh.setColorAt(i, !ok[winUnit[i]] ? C_OFF : un.status === 'Disponível' ? C_LIT : un.status === 'Reservado' ? C_RES : C_SOLD);
  }
  winMesh.instanceColor.needsUpdate = true;
  kpis.innerHTML =
    `<div class="kpi"><b>${vis}</b><span>no filtro</span></div>` +
    `<div class="kpi"><b style="color:#1f7a44">${disp}</b><span>disponíveis no filtro</span></div>` +
    `<div class="kpi"><b>${N}</b><span>unidades no total</span></div>` +
    `<div class="kpi"><b>${BL.length}</b><span>blocos · 2 etapas</span></div>`;
  hoverFloor = null; band.visible = false; fcard.style.display = 'none';
  if ($('pane-list').classList.contains('on')) renderList();
}
[fTyp, fFloor, fEtapa, fPrice, fAvail, fAdapt].forEach(el => el.addEventListener('input', refresh));
fBlock.addEventListener('input', () => { refresh(); if (fBlock.value !== 'all') { focusBlock(+fBlock.value); showBlock(+fBlock.value); } });
labelGroup.visible = fLabels.checked;
fLabels.addEventListener('input', () => { labelGroup.visible = fLabels.checked; wake(); });
$('resetView').addEventListener('click', () => { lazerOff(); clearCut(); homeView(true); });
$('mapHome').addEventListener('click', () => { lazerOff(); clearCut(); homeView(true); });
if (isMobile()) $('filtros').open = false;

/* ---------- Painel direito ---------- */
let selected = null;
function setTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => { const on = b.dataset.tab === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $('pane-unit').classList.toggle('on', name === 'unit');
  $('pane-list').classList.toggle('on', name === 'list');
  if (name === 'list') renderList();
}

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
function openPanel(open) {
  $('layout').classList.toggle('show', open);
}
function closeAll() { selected = null; highlight(null); clearCut(); openPanel(false); }
$('closePanel').addEventListener('click', closeAll);

function highlight(un) {
  wake();
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
  $('tipCode').textContent = `${un.code} · Bl. ${String(un.block).padStart(2, '0')}`;
  const st = $('tipStatus');
  st.textContent = un.status; st.style.color = STATUS_COR[un.status];
}

function showUnit(un) {
  lazerOff();
  selected = { kind: 'unit', un };
  openPanel(true); setTab('unit');
  $('blockView').style.display = 'none';
  $('unitView').style.display = 'block';
  $('uTitle').textContent = `Apto ${un.code} · Bloco ${String(un.block).padStart(2, '0')}`;
  const badge = $('uBadge');
  badge.textContent = un.status; badge.style.background = STATUS_COR[un.status];
  $('uGrid').innerHTML =
    `<div><span>Tipologia</span><b>${TIPO[un.typ]}</b></div>` +
    `<div><span>Andar</span><b>${un.floor}º${un.floor === 1 ? ' (térreo)' : ''}</b></div>` +
    `<div><span>Área construída</span><b>${AREA[un.typ].toString().replace('.', ',')} m²</b></div>` +
    `<div><span>Etapa</span><b>${un.etapa}ª etapa</b></div>` +
    `<div><span>Final</span><b>${String(un.u).padStart(2, '0')}${un.adapt ? ' · adaptável' : ''}</b></div>` +
    `<div><span>Valor (fictício)</span><b>${brl(un.price)}</b></div>`;
  $('uPlan').innerHTML = `<img src="${PLANTAS[un.typ === 'com' ? 'com' : 'sem']}" alt="Planta baixa da unidade ${TIPO[un.typ].toLowerCase()}: sala, cozinha, dois quartos e banheiro">`;
  $('uGal').innerHTML = galHTML();
  $('uNote').textContent =
    (un.adapt ? 'Este final aparece na implantação como unidade com possibilidade de adaptação; o book não informa em quais andares. ' : '') +
    (un.typ === 'garden'
      ? 'Planta do book (p.36) da unidade sem varanda. A área do garden não tem planta no material.'
      : 'Planta do book (p.36). A unidade real pode ser espelhada.');
  setCut(un.block, un.floor);
  highlight(un);
  if (isMobile() && !camGoal) { // o mapa encolhe: traz a unidade para o centro
    const f = unitFrame(un);
    flyTo(f.cx, (un.floor - 1) * BH, f.cz, Math.min(camera.position.distanceTo(controls.target), 110));
  }
}
function showBlock(n, floor) {
  lazerOff();
  selected = { kind: 'block', b: n };
  openPanel(true); setTab('unit');
  $('unitView').style.display = 'none';
  $('blockView').style.display = 'block';
  const b = blockBy[n], list = units.filter(x => x.block === n);
  const c = s => list.filter(x => x.status === s).length;
  const tipo = b.tipo === 'garden' ? 'Sem varanda, com garden no térreo' : b.tipo === 'com' ? 'Torre com varanda' : 'Torre sem varanda';
  $('bTitle').textContent = `Bloco ${String(n).padStart(2, '0')}` + (floor ? ` · ${floor}º andar` : '');
  $('bList').innerHTML =
    `Tipologia: <b>${tipo}</b><br>Etapa: <b>${b.etapa}ª</b><br>` +
    `Unidades: <b>${list.length}</b> (5 andares × 4 finais)<br>` +
    (b.adapt.length ? `Finais adaptáveis: <b>${b.adapt.map(a => String(a).padStart(2, '0')).sort().join(' e ')}</b><br>` : '') +
    `<span style="color:#1f7a44">●</span> Disponíveis: <b>${c('Disponível')}</b><br>` +
    `<span style="color:#9a6a10">●</span> Reservadas: <b>${c('Reservado')}</b><br>` +
    `<span style="color:#5f6b78">●</span> Vendidas: <b>${c('Vendido')}</b>`;
  const pk = b.tipo === 'com' ? 'com' : 'sem';
  $('bPlan').innerHTML = `<img src="${PLANTAS[pk]}" alt="Planta baixa da unidade ${TIPO[pk].toLowerCase()}: sala, cozinha, dois quartos e banheiro">`;
  if (floor) {
    setCut(n, floor);
    const fl = units.filter(x => x.block === n && x.floor === floor);
    $('bUnits').innerHTML = `<h3>Unidades do ${floor}º andar</h3>` + fl.map(rowHTML).join('');
  } else { clearCut(); $('bUnits').innerHTML = ''; }
  $('bGal').innerHTML = galHTML();
  highlight(null);
  if (isMobile() && !camGoal) focusBlock(n);
}

/* ---------- Câmera ---------- */
function flyTo(x, y, z, dist) {
  const target = new THREE.Vector3(x, y, z);
  const off = camera.position.clone().sub(controls.target);
  off.y = Math.max(off.y, off.length() * 0.45);
  camGoal = { target, pos: target.clone().add(off.normalize().multiplyScalar(dist)) };
}
function focusUnit(un) { const f = unitFrame(un); flyTo(f.cx, (un.floor - 1) * BH, f.cz, 75); showUnit(un); }
function focusBlock(n) { const b = blockBy[n]; flyTo(wx(b.px), 6, wz(b.py), 95); }

/* ---------- Lista ---------- */
function renderList() {
  const rows = units.filter(matches);
  $('listCount').textContent = `${rows.length} unidades com o filtro atual` + (rows.length > 300 ? ' (mostrando as 300 primeiras; refine o filtro)' : '');
  $('listBody').innerHTML = rows.slice(0, 300).map(rowHTML).join('');
}
function rowHTML(un) {
  return (
    `<button type="button" class="lrow" data-i="${units.indexOf(un)}" aria-label="Apto ${un.code}, bloco ${un.block}, ${TIPO[un.typ]}, ${un.floor}º andar, ${un.status}, ${brl(un.price)}">` +
      `<span style="display:block"><b>Apto ${un.code}</b> <small>· Bloco ${String(un.block).padStart(2, '0')}</small><br><small>${TIPO[un.typ]} · ${un.floor}º andar${un.adapt ? ' · adaptável' : ''}</small></span>` +
      `<span style="display:block;text-align:right"><em style="color:${STATUS_COR[un.status]}">${un.status}</em><br><small>${brl(un.price)}</small></span>` +
    `</button>`
  );
}
[$('listBody'), $('bUnits')].forEach(el => el.addEventListener('click', e => {
  const row = e.target.closest('.lrow');
  if (row) focusUnit(units[+row.dataset.i]);
}));

/* ---------- Mouse e toque ---------- */
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null, down = null;
function castAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const w = ray.intersectObject(winMesh)[0];
  const b = ray.intersectObjects(blockMeshes)[0];
  if (w && (!b || w.distance < b.distance + 0.5)) return { un: units[winUnit[w.instanceId]] };
  if (b) return { block: b.object.userData.block, floor: Math.min(FLOORS, Math.max(1, Math.floor(b.point.y / BH) + 1)) };
  return {};
}
const cv = renderer.domElement;
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || e.buttons || lazer) return;
  const hit = castAt(e), un = hit.un || null;
  cv.style.cursor = un || hit.block ? 'pointer' : 'grab';
  if (un !== hovered) {
    hovered = un;
    if (un) highlight(un);
    else highlight(selected && selected.kind === 'unit' ? selected.un : null);
  }
  setHoverFloor(!lazer && !un && hit.block ? { n: hit.block, f: hit.floor } : null);
});
cv.addEventListener('pointerleave', () => { hovered = null; setHoverFloor(null); highlight(selected && selected.kind === 'unit' ? selected.un : null); });

/* Card do andar: bloco, andar, disponíveis e preço a partir de */
const fcard = $('fcard');
let hoverFloor = null;
function floorStats(n, f) {
  const list = units.filter(u => u.block === n && u.floor === f);
  const disp = list.filter(u => u.status === 'Disponível' && matches(u));
  return { list, disp, min: disp.length ? Math.min(...disp.map(u => u.price)) : null };
}
function setHoverFloor(h) {
  wake();
  if (!h) { if (hoverFloor) { hoverFloor = null; band.visible = false; fcard.style.display = 'none'; } return; }
  if (hoverFloor && hoverFloor.n === h.n && hoverFloor.f === h.f) return;
  hoverFloor = h;
  placeBand(h.n, h.f);
  const s = floorStats(h.n, h.f);
  const tipos = [...new Set(s.list.map(u => TIPO[u.typ]))].join(' · ');
  fcard.innerHTML =
    `<div class="fh"><span class="fn">${h.f}<small>º</small></span><span class="fs${s.disp.length ? '' : ' no'}">${s.disp.length ? s.disp.length + (s.disp.length > 1 ? ' disponíveis' : ' disponível') : 'sem disponíveis'}</span></div>` +
    `<div class="fl">Bloco ${String(h.n).padStart(2, '0')} · ${tipos}</div>` +
    `<div class="fp">${s.min ? 'a partir de ' + brl(s.min) : '—'}</div>` +
    `<div class="fc">Clique para ver o andar</div>`;
}
const fV = new THREE.Vector3();
function placeFloorCard() {
  const b = blockBy[hoverFloor.n];
  fV.set(wx(b.px), (hoverFloor.f - 1) * BH + BH / 2, wz(b.py)).project(camera);
  if (fV.z > 1) { fcard.style.display = 'none'; return; }
  const w = main.clientWidth, h = main.clientHeight, cw = fcard.offsetWidth || 220, ch = fcard.offsetHeight || 120;
  let x = (fV.x * 0.5 + 0.5) * w + 28, y = (-fV.y * 0.5 + 0.5) * h - ch / 2;
  if (x + cw > w - 8) x = (fV.x * 0.5 + 0.5) * w - cw - 28;
  fcard.style.left = Math.max(8, x) + 'px';
  fcard.style.top = Math.min(Math.max(8, y), h - ch - 8) + 'px';
  fcard.style.display = 'block';
}
cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
cv.addEventListener('pointerup', e => { // só conta como clique/toque se não foi arrasto
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 600) { down = null; return; }
  down = null;
  if (lazer) return;
  setHoverFloor(null);
  const hit = castAt(e);
  if (hit.un) showUnit(hit.un);
  else if (hit.block) showBlock(hit.block, hit.floor);
  else closeAll();
});

/* =====================================================================
   VIEWER (tela cheia) e GALERIA do apartamento decorado
   Fotos recortadas do book (perspectivas ilustradas).
   ===================================================================== */
const APTO = [
  { src: 'img/apto/sala.jpg', cap: 'Sala de estar e jantar' },
  { src: 'img/apto/cozinha.jpg', cap: 'Cozinha e área de serviço' },
  { src: 'img/apto/quarto1.jpg', cap: 'Quarto' },
  { src: 'img/apto/quarto2.jpg', cap: 'Quarto' }
];
const viewer = $('viewer');
let vList = [], vi = 0, vFrom = null;
function showV() {
  const it = vList[vi];
  $('vImg').src = it.src; $('vImg').alt = it.cap;
  $('vCap').textContent = it.cap;
  $('vCount').textContent = vList.length > 1 ? `${vi + 1} / ${vList.length}` : '';
  $('vPrev').style.visibility = $('vNext').style.visibility = vList.length > 1 ? 'visible' : 'hidden';
  const fig = viewer.querySelector('figure'); fig.style.animation = 'none'; void fig.offsetWidth; fig.style.animation = '';
}
function openViewer(list, i, inline) {
  vList = list; vi = i; vFrom = document.activeElement;
  (inline ? main : document.body).appendChild(viewer);
  viewer.classList.toggle('inline', !!inline);
  showV(); viewer.hidden = false; $('vClose').focus();
}
function closeViewer() { viewer.hidden = true; if (vFrom && vFrom.focus) vFrom.focus(); }
const stepV = d => { vi = (vi + d + vList.length) % vList.length; showV(); };
$('vClose').addEventListener('click', closeViewer);
$('vPrev').addEventListener('click', () => stepV(-1));
$('vNext').addEventListener('click', () => stepV(1));
viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });
function galHTML() {
  return '<h3>Apartamento decorado</h3>' +
    APTO.map((a, i) => `<button type="button" data-g="${i}" aria-label="Ampliar: ${a.cap}"><img src="${a.src}" alt="${a.cap}" loading="lazy"><span>${a.cap}</span></button>`).join('') +
    '<div class="gnote">Perspectivas ilustradas do book.</div>';
}
document.addEventListener('click', e => { const b = e.target.closest('.gal button'); if (b) openViewer(APTO, +b.dataset.g); });

/* =====================================================================
   TOUR DO LAZER
   - Lazer 01 e 02: render aéreo do book, parado, com os pontos por cima
     (`plan` = posição do ponto na imagem, fração x, y). A foto abre dentro da própria área do lazer.
   - Centro: a própria maquete, com a câmera voando até lá.
   Cada pino/chip abre a foto do ambiente em tela cheia.
   ===================================================================== */
const AREAS = {
  '01': { nome: 'Lazer 01', plano: 'img/plano/lazer01.jpg' },
  '02': { nome: 'Lazer 02', plano: 'img/plano/lazer02.jpg' },
  '03': { nome: 'Centro', px: 977, py: 545, dist: 150 }
};
const LAZER = [
  { a: '01', nome: 'Portaria', img: 'portaria', plan: [0.06, 0.51] },
  { a: '01', nome: 'Salão infantil', img: 'salao-infantil', plan: [0.177, 0.30] },
  { a: '01', nome: 'Salão de festas', img: 'salao-festas', plan: [0.333, 0.292] },
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
  { a: '02', nome: 'Salão de jogos', img: 'salao-jogos', plan: [0.882, 0.331] },
  { a: '03', nome: 'Mini market', img: 'minimarket', px: 972, py: 510, y: 6 },
  { a: '03', nome: 'Coworking', img: 'coworking', px: 981, py: 583, y: 6 }
];
let lazer = null;
const pinsEl = $('pins'), pV = new THREE.Vector3();
const planPins = $('planPins');
const itemsOf = a => LAZER.filter(l => l.a === a);
LAZER.forEach(l => { // pinos da maquete (só o Centro)
  if (l.px === undefined) return;
  l.k = itemsOf(l.a).indexOf(l);
  l.v = new THREE.Vector3(wx(l.px), l.y, wz(l.py));
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'pin'; b.setAttribute('aria-label', l.nome);
  b.innerHTML = `${l.k + 1}<span>${l.nome}</span>`;
  b.addEventListener('click', () => openLazer(l.k));
  pinsEl.appendChild(b); l.el = b;
});
function placePins() {
  if (!lazer || AREAS[lazer].plano) return;
  const w = main.clientWidth, h = main.clientHeight;
  for (const l of itemsOf(lazer)) {
    pV.copy(l.v).project(camera);
    const show = pV.z < 1;
    if (show) { l.el.style.left = ((pV.x * 0.5 + 0.5) * w) + 'px'; l.el.style.top = ((-pV.y * 0.5 + 0.5) * h) + 'px'; }
    if (show !== l.shown) { l.el.style.display = show ? 'block' : 'none'; l.shown = show; }
  }
}
function hideMapPins() { for (const l of LAZER) if (l.el && l.shown) { l.el.style.display = 'none'; l.shown = false; } }
function openLazer(k) {
  openViewer(itemsOf(lazer).map(l => ({ src: `img/lazer/${l.img}.jpg`, cap: l.nome })), k, true);
}
function renderLazerBar() {
  $('lazerBar').innerHTML =
    `<div class="lzrow">${itemsOf(lazer).map((l, i) => `<button type="button" class="chip" data-k="${i}"><i>${i + 1}</i>${l.nome}</button>`).join('')}</div>` +
    `<div class="lzrow">${Object.keys(AREAS).map(k => `<button type="button" class="chip area${k === lazer ? ' on' : ''}" data-a="${k}">${AREAS[k].nome}</button>`).join('')}<button type="button" class="chip out" data-out="1">Visão geral</button></div>`;
}

/* ---- render do lazer (parado) com os pontos por cima ---- */
function showPlan(a) {
  $('planImg').src = AREAS[a].plano;
  $('planImg').alt = `Render aéreo do ${AREAS[a].nome}`;
  planPins.innerHTML = itemsOf(a).map((l, i) =>
    `<button type="button" class="pin pp" data-k="${i}" style="left:${l.plan[0] * 100}%;top:${l.plan[1] * 100}%" aria-label="${l.nome}">${i + 1}<span>${l.nome}</span></button>`).join('');
}
planPins.addEventListener('click', e => {
  const b = e.target.closest('.pin'); if (b) openLazer(+b.dataset.k);
});

function lazerOn(a) {
  if (!viewer.hidden) closeViewer();
  closeAll();
  lazer = a;
  const plano = !!AREAS[a].plano;
  main.classList.add('lz'); main.classList.toggle('plan', plano);
  $('lazerBtn').setAttribute('aria-pressed', 'true');
  $('hint').classList.add('off');
  hideMapPins();
  if (plano) showPlan(a);
  else {
    const ar = AREAS[a], aspect = main.clientWidth / main.clientHeight;
    const target = new THREE.Vector3(wx(ar.px), 0, wz(ar.py));
    const dir = new THREE.Vector3(-0.15, 0.93, 0.36).normalize();
    camGoal = { target, pos: target.clone().add(dir.multiplyScalar(ar.dist * (aspect < 0.95 ? 1.5 : 1))) };
  }
  renderLazerBar();
  wake();
}
function lazerOff() {
  if (!lazer) return;
  if (!viewer.hidden) closeViewer();
  lazer = null;
  main.classList.remove('lz', 'plan');
  $('lazerBtn').setAttribute('aria-pressed', 'false');
  hideMapPins();
  wake();
}
$('lazerBtn').addEventListener('click', () => { if (lazer) { lazerOff(); homeView(true); } else lazerOn('01'); });
$('lazerBar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k !== undefined) openLazer(+b.dataset.k);
  else if (b.dataset.a) lazerOn(b.dataset.a);
  else if (b.dataset.out) { lazerOff(); homeView(true); }
});
addEventListener('keydown', e => {
  if (!viewer.hidden) {
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') stepV(-1);
    else if (e.key === 'ArrowRight') stepV(1);
    return;
  }
  if (e.key === 'Escape') { if (lazer) { lazerOff(); homeView(true); } else closeAll(); }
});

refresh();

/* ---------- Loop ---------- */
const north = $('north');
const NORTE = { x: -0.743, z: -0.669 }; // rosa dos ventos da implantação
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (camGoal) { // animação por tempo: mesma duração em celular lento ou rápido
    const k = 1 - Math.pow(0.004, dt);
    camera.position.lerp(camGoal.pos, k);
    controls.target.lerp(camGoal.target, k);
    if (camera.position.distanceTo(camGoal.pos) < 0.4) camGoal = null;
    wake();
  }
  controls.update();
  const fx = controls.target.x - camera.position.x, fz = controls.target.z - camera.position.z, l = Math.hypot(fx, fz) || 1;
  const ang = Math.atan2(NORTE.x * (-fz / l) + NORTE.z * (fx / l), NORTE.x * (fx / l) + NORTE.z * (fz / l));
  north.style.transform = `rotate(${ang}rad)`;
  areaLabels.visible = !lazer && (main.clientWidth >= 700 || camera.position.distanceTo(controls.target) < 230);
  if (hoverFloor) placeFloorCard();
  placePins();
  const cur = hovered || (selected && selected.kind === 'unit' ? selected.un : null);
  if (cur) placeTip(cur); else tip.style.display = 'none';
  if (dirty && !(lazer && AREAS[lazer].plano)) { dirty = false; renderer.render(scene, camera); }
})();
