import { ROSTER, SAGAS, RARITY, GACHA, WEAPONS, PASSIVES, META, ITEMS, EVOLUTIONS } from './data.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { loadAssets, heroCard, heroPortrait } from './assets.js';
import { loadSave, writeSave } from './storage.js';
import { unlockAudio, setMuted, isMuted, sfx } from './audio.js';
import {
  byId, ensureStarters, ownedIds, pull, missions, claim, claimable, applyRun, CHAR_UPGRADES, upgradeCost, MAX_STARS,
} from './meta.js';

const canvas = document.getElementById('game');
const screen = document.getElementById('screen');
const hud = document.getElementById('hud');
const $ = (id) => document.getElementById(id);

const save = loadSave();
setMuted(!!save.muted);
const input = new Input(canvas);
let game = null;
let modalOpts = null; // opciones del modal activo (para atajos 1-3)
let credits = {};

// ---------------------------------------------------------------------------
// Tamaño del lienzo: resolución interna baja escalada para un pixel art nítido.
// ---------------------------------------------------------------------------
let scale = 1;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let s = Math.min(w / 560, h / 315);
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
const starsHtml = (n, max = MAX_STARS) => {
  let s = '';
  for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}">★</i>`;
  return `<span class="stars">${s}</span>`;
};
const sagaName = (id) => (SAGAS.find((s) => s.id === id) || { name: '' }).name;
const persist = () => writeSave(save);

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

// Lienzo con el personaje (forma inicial) para cartas.
function unitCanvas(unit, w, h, shiny = false, formIdx = 0) {
  const c = heroCard(unit.forms[formIdx].sprite, w, h, null, 0, shiny);
  c.className = 'unit-cv';
  return c;
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
        const tag = o.type === 'evolve' ? '¡EVOLUCIÓN DE TÉCNICA!'
          : o.type === 'weapon' ? (o.isNew ? '¡Nueva técnica!' : `Técnica · Nivel ${o.level}`)
            : o.type === 'passive' ? (o.isNew ? '¡Nueva habilidad!' : `Habilidad · Nivel ${o.level}`) : 'Objeto';
        return `<button class="card ${o.type === 'evolve' ? 'evo' : ''}" data-i="${i}">
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
    applyRun(save, r);
    persist();
    const items = r.itemsFound.map((id) => ITEMS[id].name).join(', ');
    const pending = claimable(save);
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
        ${items ? `<span>Objetos nuevos</span><b>${items}</b>` : ''}
      </div>
      ${pending ? `<div class="shenlong">Tienes ${pending} ${pending === 1 ? 'misión' : 'misiones'} por cobrar.</div>` : ''}
      <div class="row">
        <button class="btn" id="again">Otra vez</button>
        <button class="btn alt" id="tomenu">Menú</button>
      </div>
    </div>`);
    $('again').addEventListener('click', () => startGame(r.char.id));
    $('tomenu').addEventListener('click', () => titleScreen());
  },
};

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
let hudT = 0;
let hudSprite = '';
function updateHud(g, force) {
  const p = g.player;
  $('hpfill').style.width = (100 * p.hp) / p.maxHp + '%';
  $('xpfill').style.width = (100 * g.xp) / g.nextXp + '%';
  hudT -= 1;
  if (hudT > 0 && !force) return;
  hudT = 6;
  $('hptext').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp);
  $('lvl').textContent = 'Nv ' + g.level;
  if (hudSprite !== g.sprite || force) {
    hudSprite = g.sprite;
    const pc = $('portrait');
    const ctx = pc.getContext('2d');
    ctx.clearRect(0, 0, pc.width, pc.height);
    ctx.drawImage(heroPortrait(g.sprite, pc.width), 0, 0);
  }
  $('kills').textContent = '☠ ' + g.kills;
  $('coins').textContent = 'Ƶ ' + g.coins;
  $('form').textContent = g.form.name;
  let db = '';
  for (let i = 0; i < 7; i++) db += `<i class="${i < g.dballs ? 'on' : ''}"></i>`;
  $('dballs').innerHTML = db;
  let slots = '';
  for (const w of g.weapons) {
    slots += `<div class="slot ${w.def.evolved ? 'evolved' : ''}" title="${w.def.name}"><span class="dot" style="background:${w.def.color};color:${w.def.color}"></span><span class="lv">${w.def.evolved ? '★' : w.level}</span></div>`;
  }
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
  for (let i = 0; i < 80; i++) {
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
    persist();
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
// Menú principal
// ---------------------------------------------------------------------------
function titleScreen() {
  game = null;
  hud.classList.add('hidden');
  const pending = claimable(save);
  const sel = byId[save.selected] && save.roster[save.selected] ? byId[save.selected] : byId[ownedIds(save)[0]];
  show(`<div class="title-wrap">
    <div class="logo">
      <div class="l1">DRAGON<span class="ball"></span>BALL</div>
      <div class="l2">SURVIVORS</div>
    </div>
    <div class="zeni">Ƶ ${save.zeni} · ${ownedIds(save).length}/${ROSTER.length} guerreros</div>
    <div class="title-main">
      <div class="hero-show" id="heroShow"></div>
      <div class="menu">
        <button class="btn" id="play">Jugar</button>
        <button class="btn gold" id="gacha">Invocar</button>
        <button class="btn alt" id="collection">Colección</button>
        <button class="btn alt" id="items">Objetos</button>
        <button class="btn alt" id="missions">Misiones${pending ? ` <span class="badge">${pending}</span>` : ''}</button>
        <button class="btn alt" id="shop">Mejoras</button>
        <button class="btn alt small" id="help">Cómo jugar</button>
      </div>
    </div>
    <div class="foot">Fan game no oficial y sin ánimo de lucro. Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation.
      Sprites de personajes hechos por fans (LukasAhl1, qsab101, MV95, thekrillmaster y otros); escenarios e interfaz de Legacy of Goku / Buu's Fury.
      <a href="#" id="creditsLink">Créditos</a></div>
  </div>`, 'title-bg');
  if (sel) {
    const c = unitCanvas(sel, 96, 120, save.roster[sel.id].shiny);
    $('heroShow').appendChild(c);
    $('heroShow').insertAdjacentHTML('beforeend', `<div class="hs-name">${sel.name}</div>`);
  }
  $('play').addEventListener('click', () => { unlockAudio(); charSelect(); });
  $('gacha').addEventListener('click', () => { unlockAudio(); gachaScreen(); });
  $('collection').addEventListener('click', () => collectionScreen());
  $('items').addEventListener('click', itemsScreen);
  $('missions').addEventListener('click', missionsScreen);
  $('shop').addEventListener('click', shopScreen);
  $('help').addEventListener('click', helpScreen);
  $('creditsLink').addEventListener('click', (e) => { e.preventDefault(); creditsScreen(); });
}

// Pestañas de sagas reutilizables
function sagaTabs(active, withAll = true) {
  const tabs = (withAll ? [{ id: 'all', name: 'Todas', color: '#ffd23a' }] : []).concat(SAGAS);
  return `<div class="tabs">${tabs.map((s) => `<button class="tab ${s.id === active ? 'on' : ''}" data-saga="${s.id}" style="--c:${s.color}">${s.name}</button>`).join('')}</div>`;
}
function bindTabs(fn) {
  screen.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => fn(b.dataset.saga)));
}

// Carta de personaje para rejillas
function unitCard(unit, opts = {}) {
  const entry = save.roster[unit.id];
  const rar = RARITY[unit.rarity];
  const b = document.createElement('button');
  b.className = 'unit' + (entry ? '' : ' locked') + (opts.selected ? ' selected' : '') + (entry && entry.shiny ? ' shiny' : '');
  b.style.setProperty('--rc', rar.color);
  b.appendChild(unitCanvas(unit, 64, 76, entry && entry.shiny));
  b.insertAdjacentHTML('beforeend', `
    <div class="u-name">${unit.name}</div>
    <div class="u-rar">${rar.name}</div>
    ${entry ? starsHtml(entry.stars) : '<div class="u-lock">No conseguido</div>'}`);
  return b;
}

// ---------------------------------------------------------------------------
// Selección de personaje y objeto
// ---------------------------------------------------------------------------
let selSaga = 'all';
function charSelect(saga = selSaga) {
  selSaga = saga;
  const list = ROSTER.filter((r) => save.roster[r.id] && (saga === 'all' || r.saga === saga));
  const itemOpts = ['<option value="">Sin objeto</option>']
    .concat(save.items.map((id) => `<option value="${id}" ${save.equipped === id ? 'selected' : ''}>${ITEMS[id].name}</option>`))
    .join('');
  show(`<div class="panel wide">
    <h2>Elige tu guerrero</h2>
    ${sagaTabs(saga)}
    <div class="units" id="units"></div>
    <div class="equip">
      <label>Objeto equipado: <select id="equip">${itemOpts}</select></label>
      <span class="equip-desc" id="equipDesc">${save.equipped ? ITEMS[save.equipped].desc : ''}</span>
    </div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  bindTabs(charSelect);
  const box = $('units');
  if (!list.length) box.innerHTML = '<div class="empty">No tienes guerreros de esta saga. ¡Invócalos!</div>';
  for (const u of list) {
    const b = unitCard(u, { selected: save.selected === u.id });
    const best = save.best[u.id];
    if (best) b.insertAdjacentHTML('beforeend', `<div class="u-best">Récord ${fmt(best)}</div>`);
    b.addEventListener('click', () => {
      save.selected = u.id;
      persist();
      startGame(u.id);
    });
    box.appendChild(b);
  }
  $('equip').addEventListener('change', (e) => {
    save.equipped = e.target.value || null;
    persist();
    $('equipDesc').textContent = save.equipped ? ITEMS[save.equipped].desc : '';
  });
  $('back').addEventListener('click', titleScreen);
}

// ---------------------------------------------------------------------------
// Gacha
// ---------------------------------------------------------------------------
let gachaSaga = 'all';
function gachaScreen(saga = gachaSaga) {
  gachaSaga = saga;
  const pool = ROSTER.filter((r) => saga === 'all' || r.saga === saga);
  const featured = pool.filter((r) => r.rarity === 'L').concat(pool.filter((r) => r.rarity === 'E')).slice(0, 5);
  const ownedIn = pool.filter((r) => save.roster[r.id]).length;
  const rates = Object.entries(RARITY).map(([, r]) => `<span style="color:${r.color}">${r.name} ${r.rate}%</span>`).join(' · ');
  show(`<div class="panel wide">
    <h2>Invocación</h2>
    ${sagaTabs(saga)}
    <div class="banner-box" style="--c:${(SAGAS.find((s) => s.id === saga) || { color: '#ffd23a' }).color}">
      <div class="banner-title">${saga === 'all' ? 'Todas las sagas' : sagaName(saga)}</div>
      <div class="featured" id="featured"></div>
      <div class="banner-info">Tienes ${ownedIn}/${pool.length} · ${rates} · Brillante ${GACHA.shinyRate}%</div>
      <div class="banner-info">La invocación x10 garantiza al menos un personaje Épico. Los duplicados despiertan al personaje (★) y dan fragmentos.</div>
    </div>
    <div class="zeni">Ƶ ${save.zeni}</div>
    <div class="row">
      <button class="btn" id="p1" ${save.zeni < GACHA.cost1 ? 'disabled' : ''}>Invocar x1 · Ƶ ${GACHA.cost1}</button>
      <button class="btn gold" id="p10" ${save.zeni < GACHA.cost10 ? 'disabled' : ''}>Invocar x10 · Ƶ ${GACHA.cost10}</button>
    </div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  bindTabs(gachaScreen);
  for (const u of featured) {
    const d = document.createElement('div');
    d.className = 'feat';
    d.style.setProperty('--rc', RARITY[u.rarity].color);
    d.appendChild(unitCanvas(u, 72, 88, false, u.forms.length - 1));
    d.insertAdjacentHTML('beforeend', `<div>${u.name}</div>`);
    $('featured').appendChild(d);
  }
  $('p1').addEventListener('click', () => doPull(1));
  $('p10').addEventListener('click', () => doPull(10));
  $('back').addEventListener('click', titleScreen);
}

function doPull(n) {
  const res = pull(save, gachaSaga, n);
  if (!res) return ui.toast('No tienes suficiente Zeni');
  persist();
  sfx('dragonball');
  const best = res.some((r) => r.unit.rarity === 'L') ? 'L' : res.some((r) => r.unit.rarity === 'E') ? 'E' : 'R';
  show(`<div class="panel wide reveal r-${best}">
    <h2>¡Invocación!</h2>
    <div class="results" id="results"></div>
    <div class="row">
      <button class="btn" id="again" ${save.zeni < (n === 10 ? GACHA.cost10 : GACHA.cost1) ? 'disabled' : ''}>Otra vez x${n}</button>
      <button class="btn alt" id="back">Volver</button>
    </div>
  </div>`, 'title-bg');
  const box = $('results');
  res.forEach((r, i) => {
    const rar = RARITY[r.unit.rarity];
    const d = document.createElement('div');
    d.className = 'res' + (r.shiny ? ' shiny' : '') + ' rar-' + r.unit.rarity;
    d.style.setProperty('--rc', rar.color);
    d.style.animationDelay = i * 0.12 + 's';
    d.appendChild(unitCanvas(r.unit, 64, 76, r.shiny || (save.roster[r.id] && save.roster[r.id].shiny && !r.isNew)));
    const tag = r.isNew ? '<span class="new">¡NUEVO!</span>' : r.starUp ? '<span class="up">¡Despertar!</span>' : `<span class="sh">+${r.shards} fragmentos</span>`;
    d.insertAdjacentHTML('beforeend', `<div class="u-name">${r.unit.name}</div><div class="u-rar">${rar.name}${r.shiny ? ' · ✦ Brillante' : ''}</div>${starsHtml(r.stars)}${tag}`);
    box.appendChild(d);
  });
  if (res.some((r) => r.unit.rarity === 'L')) setTimeout(() => sfx('transform'), 400);
  $('again').addEventListener('click', () => doPull(n));
  $('back').addEventListener('click', () => gachaScreen());
}

// ---------------------------------------------------------------------------
// Colección
// ---------------------------------------------------------------------------
let colSaga = 'all';
function collectionScreen(saga = colSaga) {
  colSaga = saga;
  const list = ROSTER.filter((r) => saga === 'all' || r.saga === saga);
  show(`<div class="panel wide">
    <h2>Colección · ${ownedIds(save).length}/${ROSTER.length}</h2>
    ${sagaTabs(saga)}
    <div class="units" id="units"></div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  bindTabs(collectionScreen);
  for (const u of list) {
    const b = unitCard(u);
    b.addEventListener('click', () => unitDetail(u.id));
    $('units').appendChild(b);
  }
  $('back').addEventListener('click', titleScreen);
}

function unitDetail(id) {
  const u = byId[id];
  const entry = save.roster[id];
  const rar = RARITY[u.rarity];
  const w = WEAPONS[u.weapon];
  const evo = EVOLUTIONS[u.weapon];
  const ups = Object.entries(CHAR_UPGRADES).map(([k, d]) => {
    const lv = (entry && entry.up[k]) || 0;
    const cost = upgradeCost(lv);
    let pips = '';
    for (let i = 0; i < d.max; i++) pips += `<i class="${i < lv ? 'on' : ''}"></i>`;
    return `<div class="item"><div class="nm">${d.name}</div><div class="ds">${d.desc}</div><div class="pips">${pips}</div>
      ${!entry ? '' : lv >= d.max ? '<button class="btn small alt" disabled>Máximo</button>'
        : `<button class="btn small" data-up="${k}" ${entry.shards < cost ? 'disabled' : ''}>Mejorar · ${cost} fragmentos</button>`}</div>`;
  }).join('');
  const s = u.stats;
  show(`<div class="panel wide detail" style="--rc:${rar.color}">
    <h2>${u.name}</h2>
    <div class="d-sub"><span style="color:${rar.color}">${rar.name}</span> · ${sagaName(u.saga)} ${entry ? '· ' + starsHtml(entry.stars) : ''} ${entry && entry.shiny ? '· <span class="shiny-tag">✦ Brillante</span>' : ''}</div>
    <p class="d-desc">${u.desc}</p>
    <div class="forms" id="forms"></div>
    <div class="d-grid">
      <div><b>Técnica:</b> <span style="color:${w.color}">${w.name}</span> — ${w.desc}
        ${evo ? `<br><b>Evoluciona</b> con ${PASSIVES[evo.need].name} en <span style="color:${WEAPONS[evo.into].color}">${WEAPONS[evo.into].name}</span>.` : ''}</div>
      <div><b>Vida</b> ${s.hp} · <b>Velocidad</b> ${Math.round(s.speed * 100)}% · <b>Daño</b> ${Math.round(s.might * rar.mult * 100)}%
        ${s.regen ? ` · <b>Regeneración</b> ${s.regen}/s` : ''}${s.armor ? ` · <b>Armadura</b> ${s.armor}` : ''}</div>
      ${entry ? `<div><b>Fragmentos:</b> ${entry.shards} · <b>Récord:</b> ${save.best[id] ? fmt(save.best[id]) : '—'}</div>` : '<div class="u-lock">Consíguelo en la invocación de ' + sagaName(u.saga) + '.</div>'}
      <div class="credit">Sprites: ${[...new Set(u.forms.map((f) => credits[f.sprite]).filter(Boolean))].join(', ') || 'autor desconocido'}</div>
    </div>
    ${entry ? `<h3>Mejoras del personaje</h3><div class="shop">${ups}</div>` : ''}
    <div class="row">
      ${entry ? '<button class="btn" id="playThis">Jugar con él</button>' : ''}
      <button class="btn alt small" id="back">Volver</button>
    </div>
  </div>`, 'title-bg');
  u.forms.forEach((f, i) => {
    const d = document.createElement('div');
    d.className = 'form-step' + (entry ? '' : ' locked');
    d.appendChild(heroCard(f.sprite, 64, 80, null, 0, entry && entry.shiny));
    d.insertAdjacentHTML('beforeend', `<div class="fs-name">${f.name}</div><div class="fs-lvl">${i === 0 ? 'Inicial' : 'Nivel ' + f.lvl}</div>`);
    $('forms').appendChild(d);
    if (i < u.forms.length - 1) $('forms').insertAdjacentHTML('beforeend', '<div class="arrow">➜</div>');
  });
  screen.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.up;
    const lv = entry.up[k] || 0;
    const cost = upgradeCost(lv);
    if (entry.shards < cost) return;
    entry.shards -= cost;
    entry.up[k] = lv + 1;
    persist();
    unitDetail(id);
  }));
  if (entry) $('playThis').addEventListener('click', () => { save.selected = id; persist(); startGame(id); });
  $('back').addEventListener('click', () => collectionScreen());
}

// ---------------------------------------------------------------------------
// Objetos, misiones, mejoras y créditos
// ---------------------------------------------------------------------------
function itemsScreen() {
  const cards = Object.entries(ITEMS).map(([id, it]) => {
    const own = save.items.includes(id);
    const eq = save.equipped === id;
    return `<div class="item ${eq ? 'eq' : ''}">
      <div class="nm">${it.name}</div><div class="ds">${it.desc}</div>
      ${own ? `<button class="btn small ${eq ? 'alt' : ''}" data-eq="${id}">${eq ? 'Equipado' : 'Equipar'}</button>`
        : `<button class="btn small" data-buy="${id}" ${save.zeni < it.price ? 'disabled' : ''}>Comprar · Ƶ ${it.price}</button>`}
    </div>`;
  }).join('');
  show(`<div class="panel wide">
    <h2>Objetos</h2>
    <div class="zeni">Ƶ ${save.zeni}</div>
    <p class="d-desc">Equipa un objeto antes de la partida. También puedes conseguirlos derrotando jefes.</p>
    <div class="shop">${cards}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  screen.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.buy;
    if (save.zeni < ITEMS[id].price) return;
    save.zeni -= ITEMS[id].price;
    save.items.push(id);
    save.equipped = id;
    persist();
    itemsScreen();
  }));
  screen.querySelectorAll('[data-eq]').forEach((b) => b.addEventListener('click', () => {
    save.equipped = save.equipped === b.dataset.eq ? null : b.dataset.eq;
    persist();
    itemsScreen();
  }));
  $('back').addEventListener('click', titleScreen);
}

function missionsScreen() {
  const list = missions(save)
    .sort((a, b) => (a.claimed - b.claimed) || (b.done - a.done))
    .map((m) => `<div class="mission ${m.claimed ? 'claimed' : m.done ? 'done' : ''}">
      <div class="m-txt"><div class="nm">${m.name}</div><div class="ds">${m.desc}</div>
        <div class="bar"><div style="width:${Math.min(100, (100 * m.value) / m.target)}%"></div></div>
        <div class="m-prog">${Math.min(m.value, m.target)} / ${m.target}</div></div>
      ${m.claimed ? '<span class="m-ok">✓</span>' : `<button class="btn small" data-claim="${m.id}" ${m.done ? '' : 'disabled'}>Ƶ ${m.reward}</button>`}
    </div>`).join('');
  show(`<div class="panel wide">
    <h2>Misiones</h2>
    <div class="zeni">Ƶ ${save.zeni}</div>
    <div class="missions">${list}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  screen.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
    const z = claim(save, b.dataset.claim);
    if (z) {
      persist();
      sfx('level');
      ui.toast(`+${z} Zeni`);
      missionsScreen();
    }
  }));
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
  show(`<div class="panel wide">
    <h2>Mejoras para todos</h2>
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
      persist();
      shopScreen();
    }),
  );
  $('back').addEventListener('click', titleScreen);
}

function creditsScreen() {
  const by = {};
  for (const [sprite, who] of Object.entries(credits)) if (who) (by[who] = by[who] || []).push(sprite);
  const rows = Object.entries(by).sort((a, b) => b[1].length - a[1].length)
    .map(([who, list]) => `<li><b>${who}</b> (${list.length})</li>`).join('');
  show(`<div class="panel" style="max-width:640px;line-height:1.45">
    <h2>Créditos</h2>
    <p>Sprites de personajes del pack «Dragon Ball Sagas» (Internet Archive), hechos por la comunidad:</p>
    <ul class="credits">${rows}</ul>
    <p>Escenarios, efectos, objetos e interfaz: Dragon Ball Z: The Legacy of Goku y Buu's Fury (Webfoot Technologies / Atari),
      vía VGMaps, The Spriters Resource (rips de Mister Man, Omega y ApplePie) y proyectos fan de GitHub.</p>
    <p>Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation. Proyecto sin ánimo de lucro.</p>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  $('back').addEventListener('click', titleScreen);
}

function helpScreen() {
  show(`<div class="panel" style="max-width:600px;line-height:1.45">
    <h2>Cómo jugar</h2>
    <p><b>Muévete</b> con WASD o las flechas (en el móvil, arrastra el dedo). Tus técnicas se lanzan solas.</p>
    <p><b>Sube de nivel</b> recogiendo esferas de ki y elige técnicas o habilidades (teclas 1-3, R para cambiar opciones).
      Con una técnica al máximo y la habilidad adecuada, ¡la técnica <b>evoluciona</b>! (por ejemplo, Kamehameha + Concentración de Ki = Kamehameha x10).</p>
    <p><b>Evoluciones del personaje:</b> cada guerrero alcanza sus formas al subir de nivel (Super Saiyajin, Golden Freezer, Ultra Instinto...).</p>
    <p><b>Invoca</b> guerreros de cada saga con Zeni. Los duplicados lo despiertan (★, más fuerte) y dan fragmentos para sus mejoras.
      Los brillantes (✦) son más poderosos.</p>
    <p><b>Objetos:</b> equipa uno por partida (Pesas de Piccolo, Nube Kinton, Pendientes Potara...). Cómpralos o consíguelos de los jefes.</p>
    <p><b>Bolas de Dragón:</b> reúne las 7 para pedirle un deseo a Shenlong. Completa <b>misiones</b> para ganar más Zeni.</p>
    <p><b>Jefes:</b> Raditz, Freezer, Cell, Kid Buu y Broly. Aguanta 15 minutos para salvar la Tierra.</p>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'title-bg');
  $('back').addEventListener('click', titleScreen);
}

function startGame(id) {
  const unit = byId[id];
  if (!unit || !save.roster[id]) return charSelect();
  clearScreen();
  const item = save.equipped && save.items.includes(save.equipped) ? save.equipped : null;
  game = new Game(canvas, input, unit, save, ui, save.roster[id], item);
  game.resize(canvas.width, canvas.height, scale);
  hud.classList.remove('hidden');
  hudSprite = '';
  updateHud(game, true);
  ui.banner('¡' + unit.name.toUpperCase() + ', A LUCHAR!');
}

// Acceso para pruebas automáticas.
window.__dbs = { get game() { return game; }, startGame, save, ROSTER, pull: (s, n) => pull(save, s, n) };

show('<div class="zeni">Cargando...</div>', 'title-bg');
loadAssets()
  .then(async () => {
    try {
      credits = await (await fetch('assets/credits.json')).json();
    } catch {
      credits = {};
    }
    const welcome = ensureStarters(save);
    persist();
    titleScreen();
    if (welcome) ui.toast(`¡Bienvenido! Tienes Ƶ ${GACHA.welcome} para tus primeras invocaciones.`);
    requestAnimationFrame(frame);
  })
  .catch((err) => show(`<div class="panel"><h2>Error</h2><p>${err.message}</p></div>`));


