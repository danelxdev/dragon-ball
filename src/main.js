import { CHARACTERS, WEAPONS, PASSIVES, META, WIN_TIME } from './data.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { humanoid } from './sprites.js';
import { loadSave, writeSave } from './storage.js';
import { unlockAudio, setMuted, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const screen = document.getElementById('screen');
const hud = document.getElementById('hud');
const $ = (id) => document.getElementById(id);

const save = loadSave();
setMuted(!!save.muted);
const input = new Input(canvas);
let game = null;
let modalOpts = null; // opciones del modal activo (para atajos 1-3)

// ---------------------------------------------------------------------------
// Tamaño del lienzo: resolución interna baja escalada para un pixel art nítido.
// ---------------------------------------------------------------------------
let scale = 1;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let s = Math.min(w / 360, h / 230);
  s = s >= 2 ? Math.floor(s) : Math.max(1, s);
  scale = s;
  canvas.width = Math.ceil(w / s);
  canvas.height = Math.ceil(h / s);
  canvas.style.width = canvas.width * s + 'px';
  canvas.style.height = canvas.height * s + 'px';
  if (game) game.resize(canvas.width, canvas.height, s);
}
window.addEventListener('resize', resize);
resize();

const fmt = (t) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

function show(html, cls = 'dim') {
  screen.className = 'screen ' + cls;
  screen.innerHTML = html;
  const first = screen.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}

function clearScreen() {
  screen.innerHTML = '';
  screen.className = 'screen';
  modalOpts = null;
}

// ---------------------------------------------------------------------------
// UI que usa el juego
// ---------------------------------------------------------------------------
let bannerTimer = 0;
const ui = {
  showLevelUp(opts, g) {
    modalOpts = { kind: 'level', opts };
    const cards = opts
      .map((o, i) => {
        const tag = o.type === 'weapon' ? (o.isNew ? '¡Nueva técnica!' : `Técnica · Nivel ${o.level}`)
          : o.type === 'passive' ? (o.isNew ? '¡Nueva habilidad!' : `Habilidad · Nivel ${o.level}`) : 'Objeto';
        return `<button class="card" data-i="${i}">
          <div class="top"><span class="ico ${o.type === 'passive' ? 'sq' : ''}" style="background:${o.color};color:${o.color}"></span>
          <div><div class="nm">${o.name}</div><div class="tag">${tag}</div></div></div>
          <div class="ds">${o.desc}</div>
          <div class="key">Tecla ${i + 1}</div>
        </button>`;
      })
      .join('');
    show(`<div class="panel">
      <h2>¡Subes a nivel ${g.level - g.pendingLevels + 1}!</h2>
      <div class="cards">${cards}</div>
      <div class="row"><button class="btn alt small" id="reroll" ${g.rerolls ? '' : 'disabled'}>Cambiar opciones (R) · ${g.rerolls}</button></div>
    </div>`);
    screen.querySelectorAll('.card').forEach((b) =>
      b.addEventListener('click', () => g.chooseOption(opts[+b.dataset.i])),
    );
    $('reroll').addEventListener('click', () => g.reroll());
  },

  showWish(opts, g) {
    modalOpts = { kind: 'wish', opts };
    const cards = opts
      .map((o, i) => `<button class="card" data-i="${i}">
        <div class="top"><span class="ico" style="background:#ffa31a;color:#ffa31a"></span><div class="nm">${o.name}</div></div>
        <div class="ds">${o.desc}</div><div class="key">Tecla ${i + 1}</div></button>`)
      .join('');
    show(`<div class="panel">
      <h2>¡Sal, Shenlong!</h2>
      <div class="shenlong">Has reunido las 7 Bolas de Dragón. Pide tu deseo.</div>
      <div class="cards">${cards}</div>
    </div>`);
    screen.querySelectorAll('.card').forEach((b) =>
      b.addEventListener('click', () => g.grantWish(opts[+b.dataset.i])),
    );
  },

  hideModal() {
    clearScreen();
  },

  banner(text, color) {
    const b = $('banner');
    b.textContent = text;
    b.style.color = color || '';
    b.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.remove('show'), 1800);
  },

  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    const box = $('toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.remove(), 3000);
  },

  showEnd(r) {
    hud.classList.add('hidden');
    save.zeni += r.zeni;
    const prev = save.best[r.char.id] || 0;
    const record = r.time > prev;
    if (record) save.best[r.char.id] = Math.floor(r.time);
    if (r.win) save.wins = (save.wins || 0) + 1;
    writeSave(save);
    show(`<div class="panel">
      <h2>${r.win ? '¡Has salvado la Tierra!' : 'Has caído en combate...'}</h2>
      ${record ? '<div class="zeni">¡Nuevo récord!</div>' : ''}
      <div class="stats">
        <span>Guerrero</span><b>${r.char.name}</b>
        <span>Tiempo</span><b>${fmt(r.time)}</b>
        <span>Nivel</span><b>${r.level}</b>
        <span>Enemigos</span><b>${r.kills}</b>
        <span>Jefes</span><b>${r.bosses}</b>
        <span>Zeni ganado</span><b>Ƶ ${r.zeni}</b>
      </div>
      <div class="row">
        <button class="btn" id="again">Otra vez</button>
        <button class="btn alt" id="tomenu">Menú</button>
      </div>
    </div>`);
    $('again').addEventListener('click', () => startGame(r.char));
    $('tomenu').addEventListener('click', () => titleScreen());
  },
};

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
let hudT = 0;
function updateHud(g, force) {
  const p = g.player;
  $('hpfill').style.width = (100 * p.hp) / p.maxHp + '%';
  $('xpfill').style.width = (100 * g.xp) / g.nextXp + '%';
  hudT -= 1;
  if (hudT > 0 && !force) return;
  hudT = 6;
  $('hptext').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp);
  $('lvl').textContent = 'Nv ' + g.level;
  $('timer').textContent = fmt(Math.min(g.t, WIN_TIME));
  $('kills').textContent = '☠ ' + g.kills;
  $('coins').textContent = 'Ƶ ' + g.coins;
  $('form').textContent = g.form ? g.form.name : '';
  let db = '';
  for (let i = 0; i < 7; i++) db += `<i class="${i < g.dballs ? 'on' : ''}"></i>`;
  $('dballs').innerHTML = db;
  let slots = '';
  for (const w of g.weapons) slots += `<div class="slot" title="${w.def.name}"><span class="dot" style="background:${w.def.color};color:${w.def.color}"></span><span class="lv">${w.level}</span></div>`;
  for (const [id, lv] of Object.entries(g.passives)) {
    const d = PASSIVES[id];
    slots += `<div class="slot passive" title="${d.name}"><span class="dot" style="background:${d.color};color:${d.color}"></span><span class="lv">${lv}</span></div>`;
  }
  $('slots').innerHTML = slots;
  const bb = $('bossbar');
  if (g.boss && !g.boss.dead) {
    bb.classList.remove('hidden');
    $('bossname').textContent = g.boss.def.name;
    $('bossfill').style.width = (100 * Math.max(0, g.boss.hp)) / g.boss.maxHp + '%';
  } else bb.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------------
let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  if (game) {
    game.update(dt);
    game.render();
    if (game.state !== 'over') updateHud(game);
  } else {
    drawAttract(dt);
  }
  requestAnimationFrame(frame);
}

// Fondo animado del menú
let attractT = 0;
function drawAttract(dt) {
  attractT += dt;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#120a1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 60; i++) {
    const x = (i * 97.3 + attractT * (10 + (i % 5) * 6)) % canvas.width;
    const y = (i * 53.7) % canvas.height;
    ctx.fillStyle = i % 3 ? '#4a3470' : '#ffd23a';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}

function pauseMenu() {
  if (!game || game.state !== 'play') return;
  game.state = 'paused';
  show(`<div class="panel" style="max-width:360px">
    <h2>Pausa</h2>
    <div class="menu">
      <button class="btn" id="resume">Continuar</button>
      <button class="btn alt" id="mute">${isMuted() ? 'Activar sonido' : 'Silenciar'}</button>
      <button class="btn alt" id="quit">Abandonar partida</button>
    </div></div>`);
  $('resume').addEventListener('click', resume);
  $('mute').addEventListener('click', () => {
    setMuted(!isMuted());
    save.muted = isMuted();
    writeSave(save);
    $('mute').textContent = isMuted() ? 'Activar sonido' : 'Silenciar';
  });
  $('quit').addEventListener('click', () => game.end(false));
}

function resume() {
  if (!game || game.state !== 'paused') return;
  clearScreen();
  game.state = 'play';
}

$('pausebtn').addEventListener('click', pauseMenu);

input.onKey = (k) => {
  unlockAudio();
  if (!game) return;
  if (k === 'escape' || k === 'p') {
    if (game.state === 'play') pauseMenu();
    else if (game.state === 'paused') resume();
    return;
  }
  if (modalOpts && ['1', '2', '3'].includes(k)) {
    const o = modalOpts.opts[+k - 1];
    if (!o) return;
    if (modalOpts.kind === 'level' && game.state === 'levelup') game.chooseOption(o);
    else if (modalOpts.kind === 'wish' && game.state === 'wish') game.grantWish(o);
  }
  if (k === 'r' && game.state === 'levelup') game.reroll();
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseMenu();
});

// ---------------------------------------------------------------------------
// Pantallas de menú
// ---------------------------------------------------------------------------
function charPreview(c) {
  const spr = humanoid('p-' + c.id + '--1', c.look.hair, c.look.pal);
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 24;
  cv.getContext('2d').drawImage(spr.frames[0][0], 0, 0);
  return cv;
}

function titleScreen() {
  game = null;
  hud.classList.add('hidden');
  show(`<div>
    <div class="logo">
      <div class="l1">DRAGON<span class="ball"></span>BALL</div>
      <div class="l2">SURVIVORS</div>
    </div>
    <div class="zeni">Ƶ ${save.zeni}</div>
    <div class="menu">
      <button class="btn" id="play">Jugar</button>
      <button class="btn alt" id="shop">Mejoras</button>
      <button class="btn alt" id="records">Récords</button>
      <button class="btn alt" id="help">Cómo jugar</button>
    </div>
    <div class="foot">Fan game no oficial y sin ánimo de lucro. Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation. Todo el pixel art es original.</div>
  </div>`, 'title-bg');
  $('play').addEventListener('click', () => { unlockAudio(); charSelect(); });
  $('shop').addEventListener('click', shopScreen);
  $('records').addEventListener('click', recordsScreen);
  $('help').addEventListener('click', helpScreen);
}

function charSelect() {
  show(`<div class="panel">
    <h2>Elige tu guerrero</h2>
    <div class="zeni">Ƶ ${save.zeni}</div>
    <div class="chars" id="chars"></div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  const box = $('chars');
  for (const c of CHARACTERS) {
    const unlocked = save.unlocked.includes(c.id);
    const b = document.createElement('button');
    b.className = 'char' + (unlocked ? '' : ' locked');
    b.appendChild(charPreview(c));
    const best = save.best[c.id];
    b.insertAdjacentHTML('beforeend', `
      <div class="name">${c.name}</div>
      <div class="tech">${WEAPONS[c.weapon].name}</div>
      <div class="desc">${c.desc}</div>
      ${unlocked ? (best ? `<div class="best">Récord ${fmt(best)}</div>` : '') : `<div class="cost">Desbloquear · Ƶ ${c.cost}</div>`}`);
    b.addEventListener('click', () => {
      if (unlocked) return startGame(c);
      if (save.zeni >= c.cost) {
        save.zeni -= c.cost;
        save.unlocked.push(c.id);
        writeSave(save);
        charSelect();
      } else {
        ui.toast('No tienes suficiente Zeni');
      }
    });
    box.appendChild(b);
  }
  $('back').addEventListener('click', titleScreen);
}

function shopScreen() {
  const items = Object.entries(META)
    .map(([id, m]) => {
      const lv = save.upgrades[id] || 0;
      const cost = m.cost * (lv + 1);
      let pips = '';
      for (let i = 0; i < m.max; i++) pips += `<i class="${i < lv ? 'on' : ''}"></i>`;
      return `<div class="item">
        <div class="nm">${m.name}</div><div class="ds">${m.desc}</div><div class="pips">${pips}</div>
        ${lv >= m.max ? '<button class="btn small alt" disabled>Máximo</button>'
          : `<button class="btn small" data-id="${id}" ${save.zeni < cost ? 'disabled' : ''}>Comprar · Ƶ ${cost}</button>`}
      </div>`;
    })
    .join('');
  show(`<div class="panel">
    <h2>Mejoras permanentes</h2>
    <div class="zeni">Ƶ ${save.zeni}</div>
    <div class="shop">${items}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  screen.querySelectorAll('[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.id;
      const lv = save.upgrades[id] || 0;
      const cost = META[id].cost * (lv + 1);
      if (save.zeni < cost) return;
      save.zeni -= cost;
      save.upgrades[id] = lv + 1;
      writeSave(save);
      shopScreen();
    }),
  );
  $('back').addEventListener('click', titleScreen);
}

function recordsScreen() {
  const rows = CHARACTERS.map((c) => `<tr><td>${c.name}</td><td style="color:var(--gold)">${save.best[c.id] ? fmt(save.best[c.id]) : '—'}</td></tr>`).join('');
  show(`<div class="panel" style="max-width:420px">
    <h2>Récords</h2>
    <table class="records">${rows}</table>
    <div class="zeni" style="margin-top:12px">Victorias: ${save.wins || 0}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  $('back').addEventListener('click', titleScreen);
}

function helpScreen() {
  show(`<div class="panel" style="max-width:560px;line-height:1.45">
    <h2>Cómo jugar</h2>
    <p><b>Muévete</b> con WASD o las flechas (en el móvil, arrastra el dedo). Tus técnicas se lanzan solas.</p>
    <p><b>Recoge las esferas de ki</b> que sueltan los enemigos para subir de nivel y elige una técnica o habilidad nueva (teclas 1-3, R para cambiar opciones).</p>
    <p><b>Transfórmate:</b> a los niveles 10, 20 y 30 tu guerrero alcanza nuevas formas, como el Super Saiyajin.</p>
    <p><b>Bolas de Dragón:</b> el radar marca dónde están. Los jefes también las sueltan. Reúne las 7 para pedirle un deseo a Shenlong.</p>
    <p><b>Jefes:</b> Raditz, Nappa, Freezer, Cell y Majin Buu. Aguanta 15 minutos para salvar la Tierra.</p>
    <p>Los enemigos de élite sueltan <b>Cápsulas Corp</b> que mejoran una técnica, y a veces caen <b>Semillas del Ermitaño</b>. Con el <b>Zeni</b> compras mejoras permanentes y desbloqueas a Krilin y Trunks.</p>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  $('back').addEventListener('click', titleScreen);
}

function startGame(c) {
  clearScreen();
  game = new Game(canvas, input, c, save, ui);
  game.resize(canvas.width, canvas.height, scale);
  hud.classList.remove('hidden');
  updateHud(game, true);
  ui.banner('¡' + c.name.toUpperCase() + ', A LUCHAR!');
}

// Acceso para pruebas automáticas.
window.__dbs = { get game() { return game; }, startGame, CHARACTERS };

titleScreen();
requestAnimationFrame(frame);
