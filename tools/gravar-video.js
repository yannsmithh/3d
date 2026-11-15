// Grava o vídeo de apresentação dos ambientes em 3D.
// Uso (com o site servido em http://localhost:4173):  node tools/gravar-video.js [saida.mp4] [--sw] [--teste]
// Requer Chrome instalado, Node 22+ e ffmpeg no PATH. --sw força renderização por software (mais lento).
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const OUT = path.resolve(process.argv.find((a, i) => i > 1 && a.endsWith('.mp4')) || 'video/apresentacao.mp4');
const SW = process.argv.includes('--sw'), TEST = process.argv.includes('--teste');
const URL = process.env.URL || 'http://localhost:4173/jogo?cine';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = 1280, H = 720, FPS = 30, PORT = 9700 + Math.floor(Math.random() * 200);
const FR = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// roteiro: [chave do ambiente, segundos na vista da foto, segundos de passeio]
const ROTEIRO = [
  ['salao-festas', 1.4, 3.2], ['salao-infantil', 1.2, 2.6], ['varanda-gourmet', 1.2, 2.6], ['academia', 1.2, 2.8],
  ['coworking', 1.2, 2.4], ['piscina', 1.2, 2.8], ['quiosque', 1.2, 2.6], ['quadra-poliesportiva', 1.2, 2.8],
  ['parque-aventura', 1.2, 2.6], ['academia-ar-livre', 1.2, 2.6]
];

const OVERLAY = `(() => {
  const css = document.createElement('style'); css.textContent = \`
    #ov{position:fixed;inset:0;pointer-events:none;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#fff;z-index:99}
    #ov .fade{position:absolute;inset:0;background:#0b1626;opacity:0}
    #ov .title{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,#22446f 0%,#0b1626 78%);text-align:center}
    #ov .title h1{font-size:64px;margin:0 0 10px;letter-spacing:1px} #ov .title p{font-size:24px;margin:0;opacity:.8} #ov .title i{width:18px;height:18px;border-radius:5px;background:#b5d334;display:block;margin-bottom:22px}
    #ov .cap{position:absolute;left:36px;bottom:34px;background:rgba(11,22,38,.82);padding:14px 22px;border-radius:14px;display:none}
    #ov .cap b{font-size:30px;display:block} #ov .cap span{font-size:15px;opacity:.75}
    #ov .pip{position:absolute;right:30px;top:78px;width:300px;display:none;background:#0b1626;padding:6px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
    #ov .pip img{width:100%;display:block;border-radius:6px} #ov .pip span{display:block;text-align:center;font-size:12px;padding-top:5px;opacity:.8}
    body.in #hud,#help{display:none!important}\`;
  document.head.appendChild(css);
  const ov = document.createElement('div'); ov.id = 'ov';
  ov.innerHTML = '<div class="title"><i></i><h1></h1><p></p></div><div class="cap"><b></b><span></span></div><div class="pip"><img><span>Foto do book</span></div><div class="fade"></div>';
  document.body.appendChild(ov);
  window.__ov = o => {
    const q = s => ov.querySelector(s);
    if ('title' in o) { q('.title').style.display = o.title ? 'flex' : 'none'; if (o.title) { q('.title h1').textContent = o.title; q('.title p').textContent = o.sub || ''; } }
    if ('cap' in o) { q('.cap').style.display = o.cap ? 'block' : 'none'; if (o.cap) { q('.cap b').textContent = o.cap; q('.cap span').textContent = o.capSub || ''; } }
    if ('pip' in o) { q('.pip').style.display = o.pip ? 'block' : 'none'; if (o.pip) q('.pip img').src = o.pip; }
    if ('fade' in o) q('.fade').style.opacity = o.fade;
  };
})()`;

(async () => {
  const flags = ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--ignore-gpu-blocklist', '--hide-scrollbars',
    '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'prof-')), 'about:blank'];
  flags.push(...(SW ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-gpu', '--use-angle=d3d11']));
  const chrome = spawn(CHROME, flags, { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.length) break; } catch (e) {} await sleep(500); }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => { const r = (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result; if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL + '&t=' + Date.now() });
  await sleep(5000);
  console.log('renderizador:', await ev(`(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(e.UNMASKED_RENDERER_WEBGL); })()`));
  await ev(OVERLAY);

  let n = 0;
  const grab = async () => {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
    fs.writeFileSync(path.join(FR, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(r.data ?? r.result.data, 'base64'));
  };
  const hold = async (sec, fn) => { const k = Math.max(1, Math.round(sec * FPS)); for (let i = 0; i < k; i++) { if (fn) await fn(i, k); await grab(); } };
  const fade = (i, k, fi = 10, fo = 10) => Math.max(0, 1 - i / fi, 1 - (k - 1 - i) / fo).toFixed(2);

  const t0 = Date.now();
  await ev(`__ov({ title: 'Life Residence', sub: 'Ambientes em 3D · passeio pelo lazer', fade: 0 })`);
  await hold(TEST ? 0.5 : 3);
  await ev(`__ov({ title: '', cap: 'Escolha o ambiente', capSub: 'O mapa do lazer vira o menu: cada ponto entra em 3D' }); __g.hub('01')`); await sleep(400);
  await hold(TEST ? 0.5 : 3, (i, k) => ev(`__ov({ fade: ${fade(i, k, 8, 8)} })`));
  await ev(`__g.hub('02')`); await sleep(300); await hold(TEST ? 0.3 : 1.5);
  for (const [key, tFoto, tTour] of (TEST ? ROTEIRO.slice(0, 2) : ROTEIRO)) {
    const nome = await ev(`(() => { const l = __g.LAZER.find(l => l.img === '${key}'); __g.enter('${key}'); __ov({ cap: l.nome, capSub: 'Recriado em 3D a partir da foto do book', pip: 'img/lazer/${key}.jpg', fade: 1 }); return l.nome; })()`);
    await ev(`(() => { document.getElementById('vPhoto').click(); __g.frame(1 / 30); })()`);
    await sleep(250);
    await hold(tFoto, (i, k) => ev(`(() => { __g.cam.yaw += 0.0035; __g.frame(1 / 30); __ov({ fade: ${fade(i, k, 9, 1)} }); })()`));
    await ev(`(() => { __g.setFp(false); const b = __g.info.bounds; __g.player.x = (b.x0 + b.x1) / 2; __g.player.z = (b.z0 + b.z1) / 2; __g.cam.yaw = __g.info.yaw; __g.cam.dist = __g.info.h > 20 ? 5.4 : 3.4; __g.setAuto(true); })()`);
    await hold(tTour, (i, k) => ev(`(() => { __g.frame(1 / 30); __ov({ fade: ${fade(i, k, 1, 9)} }); })()`));
    console.log(nome, 'ok', n, 'quadros', Math.round((Date.now() - t0) / 1000) + 's');
  }
  await ev(`__g.leave(); __ov({ cap: '', pip: '', title: 'Life Residence', sub: 'L Marquezzo · Parque Ipê · Feira de Santana/BA', fade: 0 })`);
  await hold(TEST ? 0.5 : 3, (i, k) => ev(`__ov({ fade: ${fade(i, k, 1, 12)} })`));
  ws.close(); chrome.kill();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(FR, 'f%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  fs.rmSync(FR, { recursive: true, force: true });
  console.log(r.status === 0 ? `Vídeo gerado: ${OUT} (${n} quadros, ${(n / FPS).toFixed(1)}s)` : 'ffmpeg falhou');
})().catch(e => { console.error(e); process.exit(1); });
