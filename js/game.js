import * as THREE from 'three';
import { ctx, begin, finalize } from './kit.js';
import * as IN from './rooms-in.js';
import * as OUT from './rooms-out.js';

/* =====================================================================
   AMBIENTES EM 3D — motor. O mapa do lazer (render do book) é o menu;
   clicar num ponto entra no ambiente (recriado a partir da foto) e o
   boneco anda só lá dentro. Os ambientes ficam em rooms-in.js / rooms-out.js.
   ===================================================================== */
const $ = id => document.getElementById(id);
const CINE = new URLSearchParams(location.search).has('cine');

/* ---------- Renderer ---------- */
const cv = $('cv');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: CINE }); }
catch (e) { $('err').hidden = false; throw e; }
const pr = Math.min(devicePixelRatio, 1.25);
renderer.setPixelRatio(CINE ? 1 : pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 260);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- Boneco ---------- */
const MB = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function makeBoneco() {
  const g = new THREE.Group();
  const skin = MB(0xf0c09a), shirt = MB(0x3f6fb5), pants = MB(0xe8e4da), shoe = MB(0x2b323c), hair = MB(0x3b2a20);
  const part = (geo, m, x, y, z, parent = g) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; parent.add(k); return k; };
  part(new THREE.BoxGeometry(0.46, 0.54, 0.26), shirt, 0, 0.9, 0);
  part(new THREE.SphereGeometry(0.18, 14, 10), skin, 0, 1.34, 0);
  const cap = part(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.37, 0); cap.rotation.x = -0.15;
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

/* ---------- Ambientes ---------- */
const ROOMS = {
  'salao-festas': IN.salaoFestas, 'salao-infantil': IN.salaoInfantil, 'varanda-gourmet': IN.varandaGourmet, academia: IN.academia,
  coworking: IN.coworking, minimarket: IN.miniMarket, 'salao-jogos': IN.salaoJogos, lavanderia: IN.lavanderia, brinquedoteca: IN.brinquedoteca,
  portaria: OUT.portaria, piscina: OUT.piscina, 'espaco-kids': OUT.espacoKids, futmesa: OUT.futmesa, quiosque: OUT.quiosque,
  'quadras-areia': OUT.quadrasAreia, 'parque-aventura': OUT.parqueAventura, 'quadra-poliesportiva': OUT.quadraPoli,
  'pista-cooper': OUT.pistaCooper, bicicletario: OUT.bicicletario, 'academia-ar-livre': OUT.academiaArLivre
};

/* ---------- Mapa do lazer (menu) ---------- */
const PLANOS = { '01': 'img/plano/lazer01.jpg', '02': 'img/plano/lazer02.jpg' };
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
  { a: '*', nome: 'Mini market', img: 'minimarket' },
  { a: '*', nome: 'Coworking', img: 'coworking' }
].map(l => ({ ...l, room: ROOMS[l.img] ? l.img : null }));
function showHub(a) {
  $('hubImg').src = PLANOS[a]; $('hubImg').alt = `Render aéreo do Lazer ${a}`;
  $('hubPins').innerHTML = LAZER.map((l, i) => l.a !== a ? '' :
    `<button type="button" class="pin${l.room ? '' : ' soon'}" data-i="${i}" style="left:${l.plan[0] * 100}%;top:${l.plan[1] * 100}%" aria-label="${l.nome}${l.room ? '' : ' (3D em preparação)'}">${l.room ? '▶' : '·'}<span>${l.nome}${l.room ? ' · entrar em 3D' : ' · ver foto'}</span></button>`).join('');
  $('hubExtra').innerHTML = '<span>Também no condomínio:</span>' + LAZER.map((l, i) => l.a === '*' ? `<button type="button" data-i="${i}">▶ ${l.nome}</button>` : '').join('');
  document.querySelectorAll('.areas button').forEach(b => b.classList.toggle('on', b.dataset.a === a));
}
$('hubExtra').addEventListener('click', e => { const b = e.target.closest('button'); if (b) enter(LAZER[+b.dataset.i]); });
$('hubPins').addEventListener('click', e => {
  const b = e.target.closest('.pin'); if (!b) return;
  const l = LAZER[+b.dataset.i];
  if (l.room) enter(l); else showPhoto(l, 'Ambiente 3D em preparação');
});
document.querySelector('.areas').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showHub(b.dataset.a); });

/* ---------- Entrar / sair ---------- */
const player = { x: 0, z: 0, rot: 0, t: 0 };
const cam = { yaw: 0, pitch: 0.3, dist: 3.2, fp: false, fpPitch: 0, fov: 62 };
const keys = new Set();
const clock = new THREE.Clock();
const auto = { on: false, i: 0 };
let room = null, current = null, info = null, running = false, outdoor = false;
function enter(item) {
  leaveRoom();
  room = begin(); scene.add(room);
  info = ROOMS[item.room](); current = item; outdoor = info.h > 20;
  finalize();
  scene.background = new THREE.Color(info.bg); scene.fog = info.fog ? new THREE.Fog(info.bg, info.fog[0], info.fog[1]) : null;
  scene.add(boneco.g);
  player.x = info.start[0]; player.z = info.start[1]; player.rot = Math.PI; cam.yaw = info.yaw; cam.pitch = outdoor ? 0.22 : 0.3; cam.fp = false; cam.dist = outdoor ? 5.2 : 3.2; cam.fov = 62;
  setAuto(false);
  $('roomName').textContent = info.nome; $('vCam').textContent = '1ª pessoa';
  document.body.classList.add('in'); $('hud').hidden = false; $('help').hidden = false; resize();
  const p = camTarget(); camera.position.copy(p.pos); camera.lookAt(p.look);
  applyQuality(); running = true; clock.getDelta();
}
function leaveRoom() {
  if (!room) return;
  room.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  scene.remove(room, boneco.g); room = null; info = null; scene.fog = null;
}
function leave() { leaveRoom(); running = false; document.body.classList.remove('in'); $('hud').hidden = true; $('help').hidden = true; }
$('exit').addEventListener('click', leave);
function setFp(on) { cam.fp = on; cam.fov = on ? 72 : 62; $('vCam').textContent = on ? '3ª pessoa' : '1ª pessoa'; if (on) cam.fpPitch = 0; }
function setAuto(on) { auto.on = on; auto.i = 1; $('vTour').textContent = on ? '■ Parar tour' : '▶ Tour'; }
$('vCam').addEventListener('click', () => setFp(!cam.fp));
$('vTour').addEventListener('click', () => { setAuto(!auto.on); if (auto.on) setFp(false); });
$('vPhoto').addEventListener('click', () => {
  setAuto(false); const p = info.photo; player.x = p.x; player.z = p.z; player.rot = Math.PI; cam.yaw = p.yaw;
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
  if (e.code === 'KeyT') { setAuto(!auto.on); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) setAuto(false);
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
cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.min(12, Math.max(1.4, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
const joy = { x: 0, y: 0 }, stick = $('stick'), knob = stick.firstElementChild;
let joyId = null;
function joyMove(e) {
  const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width / 2;
  if (m > max) { dx *= max / m; dy *= max / m; }
  joy.x = dx / max; joy.y = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
  if (m > 8) setAuto(false);
}
stick.addEventListener('pointerdown', e => { joyId = e.pointerId; stick.setPointerCapture(e.pointerId); joyMove(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
stick.addEventListener('pointerup', joyEnd); stick.addEventListener('pointercancel', joyEnd);

/* ---------- Colisão ---------- */
const R = 0.32;
function collide(p) {
  const obst = ctx.obst;
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
  const cp = Math.cos(cam.pitch), b = info.bounds, m = outdoor ? 9 : 0;
  let d = cam.dist;
  for (let i = 0; i < 14; i++) { // dentro de casa, encurta até a câmera caber no ambiente
    pos.set(look.x + Math.sin(cam.yaw) * cp * d, look.y + Math.sin(cam.pitch) * d, look.z + Math.cos(cam.yaw) * cp * d);
    if (pos.x > b.x0 - m && pos.x < b.x1 + m && pos.z > b.z0 - m && pos.z < b.z1 + m && pos.y < (outdoor ? 30 : info.h - 0.15) && pos.y > 0.2) break;
    d *= 0.85;
  }
  return { pos, look };
}

/* ---------- Qualidade adaptativa: se o aparelho engasga, alivia ---------- */
const q = { level: 0, acc: 0, n: 0 };
function applyQuality() {
  renderer.setPixelRatio(CINE ? 1 : (q.level >= 1 ? 1 : pr));
  const sh = q.level < 2;
  renderer.shadowMap.enabled = sh;
  if (room) room.traverse(o => { if (o.isLight && o.shadow) o.castShadow = sh; });
  resize();
}
function watchFps(dt) {
  if (CINE) return;
  q.acc += dt; q.n++;
  if (q.n >= 90) {
    const avg = q.acc / q.n; q.acc = 0; q.n = 0;
    if (avg > 0.034 && q.level < 2) { q.level++; applyQuality(); if (room) room.traverse(o => { if (o.isMesh && o.material) o.material.needsUpdate = true; }); }
  }
}

/* ---------- Loop ---------- */
function update(dt) {
  let moving = false, sp = 0;
  if (auto.on && info.tour) {
    const tgt = info.tour[auto.i % info.tour.length], dx = tgt[0] - player.x, dz = tgt[1] - player.z, d = Math.hypot(dx, dz);
    if (d < 0.35) auto.i++;
    else {
      const vx = dx / d, vz = dz / d; sp = outdoor ? 2.4 : 1.7;
      player.x += vx * sp * dt; player.z += vz * sp * dt; collide(player);
      const a = Math.atan2(vx, vz); let df = a - player.rot; df = Math.atan2(Math.sin(df), Math.cos(df)); player.rot += df * Math.min(1, dt * 6);
      const wantYaw = Math.atan2(-vx, -vz); let dy = wantYaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.yaw += dy * Math.min(1, dt * 1.6);
      player.t += dt * sp * 3.2; moving = true;
    }
  } else {
    const ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joy.x;
    const iz = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + joy.y;
    const m = Math.min(1, Math.hypot(ix, iz));
    if (m > 0.05) {
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
      let vx = rx * ix - fx * iz, vz = rz * ix - fz * iz; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
      sp = ((keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2.2) * (outdoor ? 1.5 : 1)) * m;
      player.x += vx * sp * dt; player.z += vz * sp * dt; collide(player);
      const a = Math.atan2(vx, vz); let d = a - player.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rot += d * Math.min(1, dt * 12);
      player.t += dt * sp * 3.2; moving = true;
    }
  }
  const sw = moving ? Math.sin(player.t) * 0.8 : 0;
  boneco.legL.rotation.x = sw; boneco.legR.rotation.x = -sw; boneco.armL.rotation.x = -sw * 0.9; boneco.armR.rotation.x = sw * 0.9;
  boneco.g.position.set(player.x, moving ? Math.abs(Math.sin(player.t)) * 0.03 : 0, player.z); boneco.g.rotation.y = player.rot;
  boneco.g.visible = !cam.fp;
  const c = camTarget();
  if (camera.fov !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  if (cam.fp || CINE) camera.position.copy(c.pos); else camera.position.lerp(c.pos, Math.min(1, dt * 12));
  camera.lookAt(c.look);
}
function frame(dt) { update(dt); renderer.render(scene, camera); }
if (!CINE) (function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  watchFps(dt); frame(dt);
})();
showHub('01');

/* ---------- API para gravar o vídeo de apresentação (?cine) ---------- */
if (CINE) window.__g = {
  LAZER, enter: key => enter(LAZER.find(l => l.img === key)), leave, frame, setAuto, setFp, cam, player,
  get info() { return info; }, stats: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }), hub: showHub, setYaw: v => { cam.yaw = v; }
};
