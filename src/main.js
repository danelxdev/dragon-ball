import {
  ROSTER, SAGAS, RARITY, GACHA, WEAPONS, PASSIVES, META, ITEMS, EVOLUTIONS, BIOMES, ULTS, DECOR_GRADE, PHASES, TRAIN, recommendedPower,
} from './data.js';
import { Game, BUFF_COLORS, groundDetail } from './game.js';
import { Input } from './input.js';
import { loadAssets, heroCard, heroPortrait, img, meta, drawHero, recolor, graded, hasHero } from './assets.js';
import { loadSave, writeSave } from './storage.js';
import { unlockAudio, setMuted, isMuted, sfx, setVolumes } from './audio.js';
import { playMusic } from './music.js';
import {
  byId, ensureStarters, dailyReward, ownedIds, pull, payOptions, missions, claim, claimable, applyRun,
  CHAR_UPGRADES, upgradeCost, MAX_STARS, power, train,
} from './meta.js';

const canvas = document.getElementById('game');
const screen = document.getElementById('screen');
const hud = document.getElementById('hud');
const $ = (id) => document.getElementById(id);

const save = loadSave();
setMuted(!!save.muted);
setVolumes({ music: save.musicVol, sfx: save.sfxVol });
const input = new Input(canvas);
let game = null;
let modalOpts = null; // opciones del modal activo (para los atajos 1-3)
let credits = {};
let onSplash = false;

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
const icon = (key, cls = '') => `<img class="ic ${cls}" src="${img('ui', key).src}" alt="">`;

// Monedas: Zeni (mejoras y objetos), Cristales de Ki y tickets (invocación)
function currencyBar() {
  return `<div class="curbar">
    <span class="cur" title="Zeni: mejoras y objetos"><b class="zsym">Ƶ</b>${save.zeni}</span>
    <span class="cur" title="Cristales de Ki: invocaciones">${icon('crystal')}${save.crystals}</span>
    <span class="cur" title="Tickets de invocación">${icon('ticket')}${save.tickets}</span>
    <span class="cur" title="Tickets de invocación x10">${icon('ticket10')}${save.ticket10}</span>
  </div>`;
}

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

// Icono de una técnica a partir de su arte
const iconCache = new Map();
function techIcon(id, size = 22) {
  const key = id + ':' + size;
  if (iconCache.has(key)) return copyCanvas(iconCache.get(key));
  const d = WEAPONS[id];
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, d.color + '66');
  g.addColorStop(1, '#1a102000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const art = d.art;
  const m = art && meta('fx', art);
  if (art === 'disc' || art === 'flames') {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, size * 0.4, art === 'disc' ? size * 0.18 : size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(size / 2 - size * 0.3, size / 2, size * 0.6, 1);
  } else if (art === 'genkidama') {
    ctx.drawImage(img('fx', 'genkidama'), 2, 2, size - 4, size - 4);
  } else if (m) {
    const src = d.tint ? recolor('fx', art, d.tint) : img('fx', art);
    let sx = 0;
    let sw = m.fw;
    if (m.cap1) {
      sw = Math.min(m.fw, (m.fw - m.cap1) * 2.2);
      sx = m.fw - sw;
    }
    const k = (size - 2) / Math.max(sw, m.fh);
    const w = sw * k;
    const h = m.fh * k;
    ctx.drawImage(src, sx, 0, sw, m.fh, (size - w) / 2, (size - h) / 2, w, h);
  }
  iconCache.set(key, c);
  return copyCanvas(c);
}
function copyCanvas(c) {
  const n = document.createElement('canvas');
  n.width = c.width;
  n.height = c.height;
  n.getContext('2d').drawImage(c, 0, 0);
  return n;
}
const iconHtml = (id) => `<span class="ticon" data-tech="${id}"></span>`;
function fillIcons(root, size = 22) {
  root.querySelectorAll('[data-tech]').forEach((el) => el.appendChild(techIcon(el.dataset.tech, size)));
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
          : o.type === 'weapon' ? (o.isNew ? `¡Nueva técnica! · Ranura ${o.slot}` : `Técnica · Nivel ${o.level}`)
            : o.type === 'passive' ? (o.isNew ? '¡Nueva habilidad!' : `Habilidad · Nivel ${o.level}`) : 'Objeto';
        const ico = o.type === 'weapon' ? iconHtml(o.id) : o.type === 'evolve' ? iconHtml(o.into)
          : `<span class="ico ${o.type === 'passive' ? 'sq' : ''}" style="background:${o.color};color:${o.color}"></span>`;
        return `<button class="card ${o.type === 'evolve' ? 'evo' : ''}" data-i="${i}">
          <div class="top">${ico}
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
    fillIcons(screen, 26);
    screen.querySelectorAll('.card').forEach((b) =>
      b.addEventListener('click', () => g.chooseOption(opts[+b.dataset.i])),
    );
    $('reroll').addEventListener('click', () => g.reroll());
  },

  showBond(opts, g) {
    modalOpts = { kind: 'bond', opts };
    const cards = opts.map((o, i) => {
      const ws = [...g.slots[o.a].ws, ...g.slots[o.b].ws];
      return `<button class="card bond" data-i="${i}">
        <div class="icons">${ws.map((w) => iconHtml(w.id)).join('<b>+</b>')}</div>
        <div class="nm">${ws.map((w) => w.def.name).join(' + ')}</div>
        <div class="ds">Ranuras ${o.a + 1} y ${o.b + 1} se unen: lanzarás ${ws.length} técnicas a la vez (+${12 * (ws.length - 1)}% de daño).</div>
        <div class="key">Tecla ${i + 1}</div>
      </button>`;
    }).join('');
    show(`<div class="panel">
      <h2>¡Vínculo!</h2>
      <div class="shenlong">Al derrotar al jefe has ganado un vínculo: fusiona dos ranuras de técnicas.${g.bonds > 1 ? ` (Tienes ${g.bonds})` : ''}</div>
      <div class="cards">${cards}</div>
      <div class="row"><button class="btn alt small" id="keep">Guardar para después</button></div>
    </div>`);
    fillIcons(screen, 30);
    screen.querySelectorAll('.card').forEach((b) => b.addEventListener('click', () => g.applyBond(opts[+b.dataset.i])));
    $('keep').addEventListener('click', () => g.applyBond(null));
  },

  showItemChoice(cur, nu, g) {
    const opts = [cur, nu];
    modalOpts = { kind: 'item', opts };
    const card = (id, i, label) => `<button class="card" data-i="${i}">
      <div class="top"><span class="ico sq" style="background:#d07aff;color:#d07aff"></span>
      <div><div class="nm">${id ? ITEMS[id].name : 'Sin objeto'}</div><div class="tag">${label}</div></div></div>
      <div class="ds">${id ? ITEMS[id].desc : 'No llevas ningún objeto.'}</div><div class="key">Tecla ${i + 1}</div></button>`;
    show(`<div class="panel" style="max-width:560px">
      <h2>¡Objeto encontrado!</h2>
      <div class="shenlong">Solo puedes llevar uno. El nuevo queda desbloqueado para siempre aunque no lo cojas.</div>
      <div class="cards">${card(cur, 0, 'Quedarte con el tuyo')}${card(nu, 1, '¡Cambiar por el nuevo!')}</div>
    </div>`);
    screen.querySelectorAll('.card').forEach((b) => b.addEventListener('click', () => g.takeItem(+b.dataset.i ? nu : cur)));
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
    playMusic(r.win ? 'win' : 'lose');
    save.zeni += r.zeni;
    const prevPhase = (save.bestPhase || {})[r.char.id] || 0;
    const record = r.phase > prevPhase && r.phase > 1;
    save.best[r.char.id] = Math.max(save.best[r.char.id] || 0, Math.floor(r.time));
    if (r.win) save.wins = (save.wins || 0) + 1;
    applyRun(save, r);
    persist();
    const items = r.itemsFound.map((id) => ITEMS[id].name).join(', ');
    const pending = claimable(save);
    const tk = [r.tickets ? `${icon('ticket')} ${r.tickets}` : '', r.ticket10 ? `${icon('ticket10')} ${r.ticket10}` : ''].filter(Boolean).join(' ');
    show(`<div class="panel">
      <h2>${r.win ? '¡Has salvado el multiverso!' : 'Has caído en combate...'}</h2>
      <div class="zeni">Fase ${r.phase}: ${r.phaseName}</div>
      ${record ? '<div class="zeni">¡Nuevo récord de fase con este guerrero!</div>' : ''}
      <div class="stats">
        <span>Guerrero</span><b>${r.char.name}</b>
        <span>Fases superadas</span><b>${r.phasesCleared}</b>
        <span>Tiempo</span><b>${fmt(r.time)}</b>
        <span>Nivel</span><b>${r.level}</b>
        <span>Enemigos</span><b>${r.kills}</b>
        <span>Jefes</span><b>${r.bosses}</b>
        <span>Zeni</span><b>Ƶ ${r.zeni}</b>
        <span>Cristales de Ki</span><b>${icon('crystal')} ${r.crystals}</b>
        ${tk ? `<span>Tickets</span><b>${tk}</b>` : ''}
        ${items ? `<span>Objetos nuevos</span><b>${items}</b>` : ''}
      </div>
      ${pending ? `<div class="shenlong">Tienes ${pending} ${pending === 1 ? 'misión' : 'misiones'} por cobrar.</div>` : ''}
      <div class="banner-info" style="text-align:center">Para llegar más lejos: invoca guerreros más fuertes, entrénalos con Zeni y compra mejoras.
        Siguiente fase: PC recomendado ${recommendedPower(r.phase + (r.win ? 1 : 0)).toLocaleString('es-ES')} · el tuyo: ${power(r.char, save.roster[r.char.id], save).toLocaleString('es-ES')}</div>
      <div class="row">
        <button class="btn" id="again">Otra vez</button>
        <button class="btn alt" id="tomenu">Menú</button>
      </div>
    </div>`);
    $('again').addEventListener('click', () => startGame(r.char.id));
    $('tomenu').addEventListener('click', () => mainMenu());
  },
};

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
let hudT = 0;
let hudSprite = '';
let slotSig = '';
function updateHud(g, force) {
  const p = g.player;
  $('hpfill').style.width = (100 * p.hp) / p.maxHp + '%';
  $('xpfill').style.width = (100 * g.xp) / g.nextXp + '%';
  $('kifill').style.width = g.ki + '%';
  const ready = g.ki >= 100;
  $('ultbtn').classList.toggle('ready', ready);
  $('kibar').classList.toggle('ready', ready);
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
  $('crys').innerHTML = icon('crystal') + ' ' + g.crystals;
  $('form').textContent = g.form.name;
  let db = '';
  for (let i = 0; i < 7; i++) db += `<i class="${i < g.dballs ? 'on' : ''}"></i>`;
  $('dballs').innerHTML = db;
  let pas = '';
  for (const [id, lv] of Object.entries(g.passives)) {
    const d = PASSIVES[id];
    pas += `<div class="slot passive" title="${d.name}"><span class="dot" style="background:${d.color};color:${d.color}"></span><span class="lv">${lv}</span></div>`;
  }
  if (g.itemId) pas += `<div class="slot item" title="${ITEMS[g.itemId].name}">◆</div>`;
  $('slots').innerHTML = pas;
  let bf = '';
  for (const [k, t] of Object.entries(g.buffs)) {
    if (t > 0) bf += `<span class="buff" style="--c:${BUFF_COLORS[k]}">${{ fury: 'Furia', speed: 'Kinton', haste: 'Concentración' }[k]} ${Math.ceil(t)}</span>`;
  }
  $('buffs').innerHTML = bf;
  // Barra de ranuras de técnicas (solo dispara la activa)
  const sig = g.active + '|' + g.bonds + '|' + g.slots.map((s) => s.ws.map((w) => w.id + w.level).join(',')).join(';');
  if (sig !== slotSig || force) {
    slotSig = sig;
    const bar = $('slotbar');
    bar.innerHTML = g.slots.map((s, i) => `<button class="tslot ${i === g.active ? 'on' : ''} ${s.ws.length > 1 ? 'bonded' : ''}" data-i="${i}">
      <span class="k">${i + 1}</span>
      <span class="ics">${s.ws.map((w) => `<span class="ti ${w.def.evolved ? 'evo' : ''}" data-tech="${w.id}"><i>${w.def.evolved ? '★' : w.level}</i></span>`).join('')}</span>
    </button>`).join('') + (g.bonds > 0 ? `<span class="bondchip" title="Vínculos guardados">🔗${g.bonds}</span>` : '');
    bar.querySelectorAll('[data-tech]').forEach((el) => el.prepend(techIcon(el.dataset.tech, 20)));
    bar.querySelectorAll('.tslot').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      g.setActive(+b.dataset.i);
    }));
  }
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
    if (game.state !== 'over') {
      updateHud(game);
      const boss = game.boss && !game.boss.dead;
      playMusic(boss ? 'boss' : BIOMES[game.biome].music);
    }
  } else {
    drawAttract(dt);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Fondo animado de la pantalla de inicio y los menús
// ---------------------------------------------------------------------------
let attractT = 0;
let runners = [];
let nextRunner = 0;
const allSprites = [...new Set(ROSTER.flatMap((r) => r.forms.map((f) => f.sprite)))];
function drawAttract(dt) {
  attractT += dt;
  const t = attractT;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.imageSmoothingEnabled = false;
  // Cielo de atardecer
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a0f3a');
  sky.addColorStop(0.45, '#6a2a6a');
  sky.addColorStop(0.75, '#ff7a3a');
  sky.addColorStop(1, '#ffd27a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Estrellas
  for (let i = 0; i < 70; i++) {
    const x = (i * 97.3) % W;
    const y = (i * 53.7) % (H * 0.45);
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
    ctx.fillStyle = i % 4 ? '#ffffff' : '#ffd23a';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
  // Sol
  const sg = ctx.createRadialGradient(W * 0.72, H * 0.62, 4, W * 0.72, H * 0.62, H * 0.32);
  sg.addColorStop(0, '#fff6c8');
  sg.addColorStop(0.25, '#ffd27a');
  sg.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  // Montañas en capas (parallax)
  const layer = (base, amp, freq, speed, color, seed) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 3) {
      const u = x + t * speed;
      const y = base - amp * (0.55 * Math.sin(u * freq + seed) + 0.3 * Math.sin(u * freq * 2.7 + seed * 2) + 0.15 * Math.sin(u * freq * 6.1));
      ctx.lineTo(x, Math.round(y));
    }
    ctx.lineTo(W, H);
    ctx.fill();
  };
  layer(H * 0.7, H * 0.16, 0.012, 6, '#7a3a6a', 1);
  layer(H * 0.78, H * 0.12, 0.02, 14, '#4a2050', 3);
  // Pináculos rocosos del Monte Paoz
  const spire = graded('decor', 'spire', DECOR_GRADE);
  const spire2 = graded('decor', 'spire2', DECOR_GRADE);
  for (let i = 0; i < 6; i++) {
    const im = i % 2 ? spire : spire2;
    const x = ((i * 157 - t * 24) % (W + 160) + W + 160) % (W + 160) - 80;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(im, Math.round(x), Math.round(H * 0.86 - im.height));
  }
  ctx.globalAlpha = 1;
  // Suelo
  ctx.save();
  ctx.translate(-Math.round((t * 40) % 64), 0);
  ctx.fillStyle = ctx.createPattern(graded('tiles', 'earth', BIOMES.paoz.grade), 'repeat');
  ctx.fillRect(0, Math.round(H * 0.86), W + 64, H);
  ctx.fillStyle = ctx.createPattern(groundDetail(BIOMES.paoz), 'repeat');
  ctx.fillRect(0, Math.round(H * 0.86), W + 64, H);
  ctx.restore();
  ctx.fillStyle = 'rgba(40,10,40,0.35)';
  ctx.fillRect(0, Math.round(H * 0.86), W, H);
  // Guerreros corriendo por el suelo
  nextRunner -= dt;
  if (nextRunner <= 0) {
    nextRunner = 1.4 + Math.random() * 1.6;
    runners.push({ id: allSprites[(Math.random() * allSprites.length) | 0], x: -40, sp: 50 + Math.random() * 40 });
  }
  runners = runners.filter((r) => r.x < W + 50);
  for (const r of runners) {
    r.x += r.sp * dt;
    const gy = Math.round(H * 0.93);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img('fx', 'shadow'), Math.round(r.x - 5), gy - 2);
    ctx.globalAlpha = 1;
    // vuelan con su pose de vuelo si la tienen
    drawHero(ctx, hasHero(r.id + '@move') ? r.id + '@move' : r.id, Math.floor(t * 8), r.x, gy - (hasHero(r.id + '@move') ? 6 + Math.sin(t * 5 + r.sp) * 2 : 0), false);
  }
  // Goku en la Nube Kinton cruzando el cielo
  const nm = meta('fx', 'nimbus');
  const per = 14;
  const k = (t % per) / per;
  const nx = -80 + k * (W + 160);
  const ny = H * 0.3 + Math.sin(t * 2) * 6;
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.25 - i * 0.04;
    ctx.fillStyle = '#ffe07a';
    ctx.beginPath();
    ctx.arc(nx - 20 - i * 12, ny + 18 + Math.sin(t * 6 + i) * 2, 6 - i * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(img('fx', 'nimbus'), (Math.floor(t * 8) % nm.frames) * nm.fw, 0, nm.fw, nm.fh, Math.round(nx - nm.fw / 2), Math.round(ny - nm.fh / 2), nm.fw, nm.fh);
  // Destellos
  for (let i = 0; i < 12; i++) {
    const x = (i * 211 + t * 30) % W;
    const y = (i * 83 + Math.sin(t + i) * 10) % (H * 0.8);
    ctx.globalAlpha = 0.5 * Math.abs(Math.sin(t * 2 + i));
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function pauseMenu() {
  if (!game || game.state !== 'play') return;
  game.state = 'paused';
  show(`<div class="panel" style="max-width:420px">
    <h2>Pausa</h2>
    <div class="slothelp">Ranuras: <b>1-4</b> o <b>Q/E</b> · Ataque definitivo: <b>Espacio</b></div>
    <div class="menu">
      <button class="btn" id="resume">Continuar</button>
      <button class="btn alt" id="opts">Ajustes de sonido</button>
      <button class="btn alt" id="quit">Abandonar partida</button>
    </div></div>`);
  $('resume').addEventListener('click', resume);
  $('opts').addEventListener('click', () => settingsScreen(pauseMenuBack));
  $('quit').addEventListener('click', () => game.end(false));
}
function pauseMenuBack() {
  game.state = 'play';
  pauseMenu();
}

function resume() {
  if (!game || game.state !== 'paused') return;
  clearScreen();
  game.state = 'play';
}

$('pausebtn').addEventListener('click', pauseMenu);
$('ultbtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (game) game.ultimate();
});

input.onKey = (k) => {
  unlockAudio();
  if (onSplash) {
    mainMenu();
    return;
  }
  if (!game) return;
  if (k === 'escape' || k === 'p') {
    if (game.state === 'play') pauseMenu();
    else if (game.state === 'paused') resume();
    return;
  }
  if (game.state === 'play') {
    if (['1', '2', '3', '4'].includes(k)) game.setActive(+k - 1);
    else if (k === 'q') game.cycleSlot(-1);
    else if (k === 'e') game.cycleSlot(1);
    else if (k === ' ' || k === 'k') game.ultimate();
    return;
  }
  if (modalOpts && ['1', '2', '3'].includes(k)) {
    const o = modalOpts.opts[+k - 1];
    if (o === undefined) return;
    if (modalOpts.kind === 'level' && game.state === 'levelup') game.chooseOption(o);
    else if (modalOpts.kind === 'wish' && game.state === 'wish') game.grantWish(o);
    else if (modalOpts.kind === 'bond' && game.state === 'bond') game.applyBond(o);
    else if (modalOpts.kind === 'item' && game.state === 'item') game.takeItem(o);
  }
  if (k === 'r' && game.state === 'levelup') game.reroll();
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseMenu();
});

// ---------------------------------------------------------------------------
// Pantalla de inicio y menú principal
// ---------------------------------------------------------------------------
function titleScreen() {
  game = null;
  onSplash = true;
  hud.classList.add('hidden');
  show(`<div class="splash">
    <div class="logo big">
      <div class="l0">DRAGON BALL Z</div>
      <div class="l1">DRAGON<span class="ball"><i></i></span>BALL</div>
      <div class="l2">SURVIVORS</div>
    </div>
    <div class="press">Pulsa para empezar</div>
    <div class="foot">Fan game no oficial y sin ánimo de lucro · Dragon Ball © Akira Toriyama, Bird Studio, Shueisha y Toei Animation</div>
  </div>`, 'clear');
  screen.querySelector('.splash').addEventListener('pointerdown', () => {
    unlockAudio();
    mainMenu();
  });
}

function mainMenu() {
  game = null;
  onSplash = false;
  hud.classList.add('hidden');
  playMusic('title');
  const pending = claimable(save);
  const sel = byId[save.selected] && save.roster[save.selected] ? byId[save.selected] : byId[ownedIds(save)[0]];
  show(`<div class="title-wrap">
    ${currencyBar()}
    <div class="title-main">
      <div class="title-left">
        <div class="logo">
          <div class="l1">DRAGON<span class="ball"><i></i></span>BALL</div>
          <div class="l2">SURVIVORS</div>
        </div>
        <div class="menu">
          <button class="btn" id="play">Jugar</button>
          <button class="btn gold" id="gacha">Invocar</button>
          <div class="menu-grid">
            <button class="btn alt" id="collection">Colección</button>
            <button class="btn alt" id="items">Objetos</button>
            <button class="btn alt" id="missions">Misiones${pending ? ` <span class="badge">${pending}</span>` : ''}</button>
            <button class="btn alt" id="shop">Mejoras</button>
            <button class="btn alt small" id="settings">Ajustes</button>
            <button class="btn alt small" id="help">Cómo jugar</button>
          </div>
        </div>
      </div>
      <div class="hero-show" id="heroShow"></div>
    </div>
    <div class="foot">${save.stats.maxPhase ? `Récord: fase ${save.stats.maxPhase} · ` : ''}${ownedIds(save).length}/${ROSTER.length} guerreros · Sprites de fans (LukasAhl1, qsab101, MV95, thekrillmaster y otros) y de Legacy of Goku / Buu's Fury · <a href="#" id="creditsLink">Créditos</a></div>
  </div>`, 'menu-bg');
  if (sel) {
    const c = unitCanvas(sel, 96, 120, save.roster[sel.id].shiny, 0);
    $('heroShow').appendChild(c);
    $('heroShow').insertAdjacentHTML('beforeend', `<div class="hs-name">${sel.name}</div><div class="hs-sub">${WEAPONS[sel.weapon].name} · Definitivo: ${ULTS[sel.weapon] || 'Explosión de ki'}</div>`);
  }
  $('play').addEventListener('click', () => charSelect());
  $('gacha').addEventListener('click', () => gachaScreen());
  $('collection').addEventListener('click', () => collectionScreen());
  $('items').addEventListener('click', itemsScreen);
  $('missions').addEventListener('click', missionsScreen);
  $('shop').addEventListener('click', shopScreen);
  $('settings').addEventListener('click', () => settingsScreen(mainMenu));
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
    ${entry ? starsHtml(entry.stars) : '<div class="u-lock">No conseguido</div>'}
    <div class="u-pc">PC ${power(unit, entry, save).toLocaleString('es-ES')}${entry && entry.lvl ? ` · Nv ${entry.lvl}` : ''}</div>`);
  return b;
}

const phaseName = (n) => PHASES[(n - 1) % PHASES.length].name + (n > PHASES.length ? ` (ronda ${Math.floor((n - 1) / PHASES.length) + 1})` : '');

// ---------------------------------------------------------------------------
// Selección de personaje y objeto
// ---------------------------------------------------------------------------
let selSaga = 'all';
function charSelect(saga = selSaga) {
  playMusic('menu');
  selSaga = saga;
  const list = ROSTER.filter((r) => save.roster[r.id] && (saga === 'all' || r.saga === saga));
  const itemOpts = ['<option value="">Sin objeto</option>']
    .concat(save.items.map((id) => `<option value="${id}" ${save.equipped === id ? 'selected' : ''}>${ITEMS[id].name}</option>`))
    .join('');
  show(`<div class="panel wide">
    <h2>Elige tu guerrero</h2>
    <div class="phase-info">${phaseInfo()}</div>
    ${sagaTabs(saga)}
    <div class="units" id="units"></div>
    <div class="equip">
      <label>Objeto equipado: <select id="equip">${itemOpts}</select></label>
      <span class="equip-desc" id="equipDesc">${save.equipped ? ITEMS[save.equipped].desc : ''}</span>
    </div>
    ${ownedIds(save).length < 3 ? '<div class="shenlong">Solo tienes a Goku: ¡consigue más guerreros en Invocar con tus Cristales de Ki y tickets!</div>' : ''}
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  bindTabs(charSelect);
  const box = $('units');
  if (!list.length) box.innerHTML = '<div class="empty">No tienes guerreros de esta saga. ¡Invócalos!</div>';
  for (const u of list) {
    const b = unitCard(u, { selected: save.selected === u.id });
    const best = save.best[u.id];
    const bp = (save.bestPhase || {})[u.id];
    if (bp) b.insertAdjacentHTML('beforeend', `<div class="u-best">Récord: fase ${bp}</div>`);
    else if (best) b.insertAdjacentHTML('beforeend', `<div class="u-best">Récord ${fmt(best)}</div>`);
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
  $('back').addEventListener('click', mainMenu);
}

// ---------------------------------------------------------------------------
// Gacha: Cristales de Ki o tickets, pity y animación de cápsula
// ---------------------------------------------------------------------------
let gachaSaga = 'all';
const payLabel = (n) => {
  const p = payOptions(save, n)[0];
  if (p === 'ticket10') return `${icon('ticket10')} 1`;
  if (p === 'tickets') return `${icon('ticket')} ${n}`;
  return `${icon('crystal')} ${n === 10 ? GACHA.cost10 : GACHA.cost1}`;
};
function gachaScreen(saga = gachaSaga) {
  playMusic('gacha');
  gachaSaga = saga;
  const pool = ROSTER.filter((r) => saga === 'all' || r.saga === saga);
  const featured = pool.filter((r) => r.rarity === 'L').concat(pool.filter((r) => r.rarity === 'E')).slice(0, 5);
  const ownedIn = pool.filter((r) => save.roster[r.id]).length;
  const rates = Object.entries(RARITY).map(([, r]) => `<span style="color:${r.color}">${r.name} ${r.rate}%</span>`).join(' · ');
  const left = GACHA.pity - save.pity;
  show(`<div class="panel wide">
    <h2>Invocación</h2>
    ${currencyBar()}
    ${sagaTabs(saga)}
    <div class="banner-box" style="--c:${(SAGAS.find((s) => s.id === saga) || { color: '#ffd23a' }).color}">
      <div class="banner-title">${saga === 'all' ? 'Todas las sagas' : sagaName(saga)}</div>
      <div class="featured" id="featured"></div>
      <div class="pity"><div style="width:${(100 * save.pity) / GACHA.pity}%"></div><span>Legendario garantizado en ${left} ${left === 1 ? 'invocación' : 'invocaciones'}</span></div>
      <div class="banner-info">Tienes ${ownedIn}/${pool.length} · ${rates} · Brillante ${GACHA.shinyRate}%</div>
      <div class="banner-info">La x10 garantiza al menos un Épico. Los duplicados despiertan al personaje (★) y dan fragmentos. Se usan primero los tickets.</div>
    </div>
    <div class="row">
      <button class="btn" id="p1" ${payOptions(save, 1).length ? '' : 'disabled'}>Invocar x1 · ${payLabel(1)}</button>
      <button class="btn gold" id="p10" ${payOptions(save, 10).length ? '' : 'disabled'}>Invocar x10 · ${payLabel(10)}</button>
    </div>
    <div class="banner-info" style="text-align:center">Consigue Cristales de Ki y tickets en las partidas (jefes, élites, cápsulas), en las misiones y con el regalo diario.</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
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
  $('back').addEventListener('click', mainMenu);
}

function doPull(n) {
  const res = pull(save, gachaSaga, n);
  if (!res) return ui.toast('No tienes suficientes Cristales de Ki ni tickets');
  persist();
  const best = res.some((r) => r.unit.rarity === 'L') ? 'L' : res.some((r) => r.unit.rarity === 'E') ? 'E' : res.some((r) => r.unit.rarity === 'R') ? 'R' : 'C';
  capsuleAnim(best, res.some((r) => r.shiny), () => showPullResults(res, n, best));
}

// Cápsula Corp que tiembla, brilla con el color de la mejor rareza y se abre
function capsuleAnim(best, shiny, done) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    sfx('reveal');
    done();
  };
  show(`<div class="capsule-stage r-${best} ${shiny ? 'shiny-pull' : ''}">
    <div class="rays"></div>
    <div class="capsule"><div class="cap-top"></div><div class="cap-band"><span>CC</span></div><div class="cap-bot"></div></div>
    <div class="cap-hint">Toca para abrir</div>
  </div>`, 'menu-bg');
  sfx('capsule');
  setTimeout(() => !finished && sfx('capsule'), 700);
  if (best === 'L') setTimeout(() => !finished && sfx('transform'), 900);
  const stage = screen.querySelector('.capsule-stage');
  stage.addEventListener('pointerdown', finish);
  setTimeout(() => stage.classList.add('open'), 1500);
  setTimeout(finish, 1900);
}

function showPullResults(res, n, best) {
  show(`<div class="panel wide reveal r-${best}">
    <h2>¡Invocación!</h2>
    <div class="results" id="results"></div>
    ${currencyBar()}
    <div class="row">
      <button class="btn" id="again" ${payOptions(save, n).length ? '' : 'disabled'}>Otra vez x${n} · ${payLabel(n)}</button>
      <button class="btn alt" id="back">Volver</button>
    </div>
  </div>`, 'menu-bg');
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
  if (best === 'L') setTimeout(() => sfx('transform'), 300);
  $('again').addEventListener('click', () => doPull(n));
  $('back').addEventListener('click', () => gachaScreen());
}

// ---------------------------------------------------------------------------
// Colección
// ---------------------------------------------------------------------------
let colSaga = 'all';
function collectionScreen(saga = colSaga) {
  playMusic('menu');
  colSaga = saga;
  const list = ROSTER.filter((r) => saga === 'all' || r.saga === saga);
  show(`<div class="panel wide">
    <h2>Colección · ${ownedIds(save).length}/${ROSTER.length}</h2>
    ${sagaTabs(saga)}
    <div class="units" id="units"></div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  bindTabs(collectionScreen);
  for (const u of list) {
    const b = unitCard(u);
    b.addEventListener('click', () => unitDetail(u.id));
    $('units').appendChild(b);
  }
  $('back').addEventListener('click', mainMenu);
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
      <div class="tech-row">${iconHtml(u.weapon)}<div><b>Técnica:</b> <span style="color:${w.color}">${w.name}</span> — ${w.desc}
        ${evo ? `<br><b>Evoluciona</b> con ${PASSIVES[evo.need].name} en <span style="color:${WEAPONS[evo.into].color}">${WEAPONS[evo.into].name}</span>.` : ''}
        <br><b>Ataque definitivo (ki):</b> <span style="color:var(--gold)">${ULTS[u.weapon] || 'Explosión de ki'}</span></div></div>
      <div><b>Vida</b> ${s.hp} · <b>Velocidad</b> ${Math.round(s.speed * 100)}% · <b>Daño</b> ${Math.round(s.might * rar.mult * 100)}%
        ${s.regen ? ` · <b>Regeneración</b> ${s.regen}/s` : ''}${s.armor ? ` · <b>Armadura</b> ${s.armor}` : ''}</div>
      ${entry ? `<div><b>Fragmentos:</b> ${entry.shards} · <b>Récord:</b> ${save.best[id] ? fmt(save.best[id]) : '—'}</div>` : '<div class="u-lock">Consíguelo en la invocación de ' + sagaName(u.saga) + '.</div>'}
      <div class="credit">Sprites: ${[...new Set(u.forms.map((f) => credits[f.sprite]).filter(Boolean))].join(', ') || 'autor desconocido'}</div>
    </div>
    ${entry ? `<h3>Entrenamiento</h3>
    <div class="train"><div><b>Nivel ${entry.lvl || 0}/${TRAIN.max}</b> · +${Math.round(TRAIN.bonus * 100 * (entry.lvl || 0))}% de daño y de vida ·
      Poder de combate <b>PC ${power(u, entry, save).toLocaleString('es-ES')}</b></div>
      ${(entry.lvl || 0) >= TRAIN.max ? '<button class="btn small alt" disabled>Máximo</button>'
        : `<button class="btn small" id="trainBtn" ${save.zeni < TRAIN.cost(entry.lvl || 0) ? 'disabled' : ''}>Entrenar · Ƶ ${TRAIN.cost(entry.lvl || 0)}</button>`}
      <span class="muted">Tienes Ƶ ${save.zeni}</span></div>
    <h3>Mejoras del personaje</h3><div class="shop">${ups}</div>` : ''}
    <div class="row">
      ${entry ? '<button class="btn" id="playThis">Jugar con él</button>' : ''}
      <button class="btn alt small" id="back">Volver</button>
    </div>
  </div>`, 'menu-bg');
  fillIcons(screen, 30);
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
  if ($('trainBtn')) $('trainBtn').addEventListener('click', () => {
    if (train(save, id)) {
      persist();
      sfx('level');
      unitDetail(id);
    }
  });
  $('back').addEventListener('click', () => collectionScreen());
}

// ---------------------------------------------------------------------------
// Objetos, misiones, mejoras, ajustes y créditos
// ---------------------------------------------------------------------------
function itemsScreen() {
  playMusic('menu');
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
    ${currencyBar()}
    <p class="d-desc">Equipa un objeto antes de la partida. Los jefes sueltan objetos durante la partida: puedes cambiar el tuyo por el nuevo, y queda desbloqueado.</p>
    <div class="shop">${cards}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  screen.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.buy;
    if (save.zeni < ITEMS[id].price) return;
    save.zeni -= ITEMS[id].price;
    save.items.push(id);
    save.equipped = id;
    persist();
    sfx('coin');
    itemsScreen();
  }));
  screen.querySelectorAll('[data-eq]').forEach((b) => b.addEventListener('click', () => {
    save.equipped = save.equipped === b.dataset.eq ? null : b.dataset.eq;
    persist();
    itemsScreen();
  }));
  $('back').addEventListener('click', mainMenu);
}

function missionsScreen() {
  playMusic('menu');
  const list = missions(save)
    .sort((a, b) => (a.claimed - b.claimed) || (b.done - a.done))
    .map((m) => `<div class="mission ${m.claimed ? 'claimed' : m.done ? 'done' : ''}">
      <div class="m-txt"><div class="nm">${m.name}</div><div class="ds">${m.desc}</div>
        <div class="bar"><div style="width:${Math.min(100, (100 * m.value) / m.target)}%"></div></div>
        <div class="m-prog">${Math.min(m.value, m.target)} / ${m.target}</div></div>
      ${m.claimed ? '<span class="m-ok">✓</span>' : `<button class="btn small" data-claim="${m.id}" ${m.done ? '' : 'disabled'}>Ƶ ${m.reward} · ${icon('crystal')} ${m.crystals}</button>`}
    </div>`).join('');
  show(`<div class="panel wide">
    <h2>Misiones</h2>
    ${currencyBar()}
    <div class="missions">${list}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  screen.querySelectorAll('[data-claim]').forEach((b) => b.addEventListener('click', () => {
    const m = claim(save, b.dataset.claim);
    if (m) {
      persist();
      sfx('coin');
      ui.toast(`+${m.reward} Zeni y +${m.crystals} Cristales de Ki`);
      missionsScreen();
    }
  }));
  $('back').addEventListener('click', mainMenu);
}

function shopScreen() {
  playMusic('menu');
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
    ${currencyBar()}
    <div class="shop">${items}</div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  screen.querySelectorAll('[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.id;
      const lv = save.upgrades[id] || 0;
      const cost = META[id].cost * (lv + 1);
      if (save.zeni < cost) return;
      save.zeni -= cost;
      save.upgrades[id] = lv + 1;
      persist();
      sfx('coin');
      shopScreen();
    }),
  );
  $('back').addEventListener('click', mainMenu);
}

function settingsScreen(back) {
  const inGame = !!game;
  if (inGame) game.state = 'paused';
  show(`<div class="panel" style="max-width:460px">
    <h2>Ajustes</h2>
    <div class="settings">
      <label>Música <input type="range" id="vmusic" min="0" max="100" value="${Math.round(save.musicVol * 100)}"><span id="lmusic">${Math.round(save.musicVol * 100)}%</span></label>
      <label>Efectos <input type="range" id="vsfx" min="0" max="100" value="${Math.round(save.sfxVol * 100)}"><span id="lsfx">${Math.round(save.sfxVol * 100)}%</span></label>
      <label>Silenciar todo <input type="checkbox" id="vmute" ${isMuted() ? 'checked' : ''}></label>
    </div>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, inGame ? 'dim' : 'menu-bg');
  const upd = () => {
    save.musicVol = $('vmusic').value / 100;
    save.sfxVol = $('vsfx').value / 100;
    $('lmusic').textContent = $('vmusic').value + '%';
    $('lsfx').textContent = $('vsfx').value + '%';
    setVolumes({ music: save.musicVol, sfx: save.sfxVol });
    persist();
  };
  $('vmusic').addEventListener('input', upd);
  $('vsfx').addEventListener('input', upd);
  $('vsfx').addEventListener('change', () => sfx('coin'));
  $('vmute').addEventListener('change', (e) => {
    setMuted(e.target.checked);
    save.muted = e.target.checked;
    persist();
  });
  $('back').addEventListener('click', back);
}

function creditsScreen() {
  const by = {};
  for (const [sprite, who] of Object.entries(credits)) if (who) (by[who] = by[who] || []).push(sprite);
  const rows = Object.entries(by).sort((a, b) => b[1].length - a[1].length)
    .map(([who, list]) => `<li><b>${who}</b> (${list.length})</li>`).join('');
  show(`<div class="panel" style="max-width:640px;line-height:1.45">
    <h2>Créditos</h2>
    <p>Sprites de personajes y de técnicas hechos por la comunidad: pack «Dragon Ball Sagas» (Internet Archive) y hojas de sprites de
      LukasAhl1, qsab101, MV95 y thekrillmaster publicadas en DeviantArt (Dragon Ball Vortex):</p>
    <ul class="credits">${rows}</ul>
    <p>Escenarios, efectos, objetos e interfaz: Dragon Ball Z: The Legacy of Goku y Buu's Fury (Webfoot Technologies / Atari),
      vía VGMaps, The Spriters Resource (rips de Mister Man, Omega y ApplePie) y proyectos fan de GitHub.</p>
    <p>Música original compuesta para este juego. Mecánicas inspiradas en PokeSurvivor.</p>
    <p>Dragon Ball es propiedad de Akira Toriyama, Bird Studio, Shueisha y Toei Animation. Proyecto sin ánimo de lucro.</p>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  $('back').addEventListener('click', mainMenu);
}

function helpScreen() {
  show(`<div class="panel" style="max-width:640px;line-height:1.45">
    <h2>Cómo jugar</h2>
    <p><b>Muévete</b> con WASD o las flechas (en el móvil, arrastra el dedo). Tu técnica se lanza sola.</p>
    <p><b>Ranuras de técnicas:</b> cada técnica nueva ocupa una ranura (hasta 4) y <b>solo dispara la ranura activa</b>.
      Cámbiala con <b>1-4</b>, <b>Q/E</b> o tocándola abajo. Al derrotar a un <b>jefe</b> ganas un <b>vínculo</b>: junta dos ranuras
      para lanzar varias técnicas a la vez (hasta 4 por ranura y +12% de daño por técnica vinculada).</p>
    <p><b>Ki:</b> la barra de ki se llena al derrotar enemigos y al recibir golpes. Llena, pulsa <b>Espacio</b> (o el botón KI)
      para el <b>ataque definitivo</b> de tu guerrero (Super Kamehameha, Final Flash, Genkidama...).</p>
    <p><b>Sube de nivel</b> recogiendo gemas de ki y elige técnicas o habilidades (1-3, R para cambiar). Con una técnica al máximo y la
      habilidad adecuada aparece la <b>carta dorada</b>: ¡la técnica evoluciona! (Kamehameha + Concentración de Ki = Kamehameha x10).</p>
    <p><b>Formas:</b> cada guerrero se transforma al subir de nivel (Super Saiyajin, Golden Freezer, Ultra Instinto...).</p>
    <p><b>Invoca</b> guerreros con <b>Cristales de Ki</b> o <b>tickets</b> (los sueltan jefes, élites y cápsulas; también las misiones y el regalo diario).
      A las ${GACHA.pity} invocaciones sin Legendario, el siguiente es seguro. Con <b>Zeni</b> compras mejoras y objetos.</p>
    <p><b>Durante la partida:</b> rompe las <b>Cápsulas Corp</b> para conseguir potenciadores (furia, velocidad, recarga, radar), semillas y cristales.
      Cuidado con los <b>Saibaman kamikaze</b> (círculo rojo) y con los rayos de los jefes (franja roja en el suelo).</p>
    <p><b>Fases:</b> la partida avanza de saga en saga (Raditz, Nappa, Vegeta, Namek, Ginyu, Freezer, los androides, Cell, Buu,
      Broly, Golden Freezer, Zamasu, Jiren y Bills). Cada fase termina al derrotar a su jefe y la siguiente es más difícil; tras Bills empieza
      otra ronda aún más dura. Para llegar lejos consigue guerreros mejores, <b>entrénalos</b> con Zeni (en la Colección) y compra mejoras:
      compara su <b>Poder de combate (PC)</b> con el recomendado.</p>
    <p><b>Bolas de Dragón:</b> reúne las 7 para pedirle un deseo a Shenlong.</p>
    <div class="row"><button class="btn alt small" id="back">Volver</button></div>
  </div>`, 'menu-bg');
  $('back').addEventListener('click', mainMenu);
}

// Récord de fase y poder recomendado para la siguiente meta
function phaseInfo() {
  const best = (save.stats.maxPhase || 0);
  const goal = Math.max(1, best + 1);
  return `La partida avanza por fases cada vez más difíciles: cada jefe derrotado abre la siguiente.
    Tu récord: <b>${best ? 'fase ' + best : '—'}</b> · Siguiente meta: <b>fase ${goal}</b> (${phaseName(goal)}),
    poder recomendado <b>PC ${recommendedPower(goal).toLocaleString('es-ES')}</b>. Mejora a tus guerreros para llegar más lejos.`;
}

function startGame(id) {
  const unit = byId[id];
  if (!unit || !save.roster[id]) return charSelect();
  clearScreen();
  onSplash = false;
  const item = save.equipped && save.items.includes(save.equipped) ? save.equipped : null;
  game = new Game(canvas, input, unit, save, ui, save.roster[id], item);
  game.resize(canvas.width, canvas.height, scale);
  hud.classList.remove('hidden');
  hudSprite = '';
  slotSig = '';
  updateHud(game, true);
  ui.banner('¡' + unit.name.toUpperCase() + ', A LUCHAR!');
}

// Acceso para pruebas automáticas.
window.__dbs = {
  get game() { return game; }, startGame, save, ROSTER, mainMenu, gachaScreen, playMusic,
  pull: (s, n) => pull(save, s, n),
};

show('<div class="zeni">Cargando...</div>', 'menu-bg');
loadAssets()
  .then(async () => {
    try {
      credits = window.__DBS_ASSETS ? window.__DBS_ASSETS.credits : await (await fetch('assets/credits.json')).json();
    } catch {
      credits = {};
    }
    const welcome = ensureStarters(save);
    const daily = dailyReward(save);
    persist();
    titleScreen();
    if (welcome) ui.toast(`¡Bienvenido! Regalo: ${GACHA.welcome.crystals} Cristales de Ki y ${GACHA.welcome.tickets} tickets + 1 ticket x10 para invocar`);
    else if (daily) ui.toast(`Regalo diario: ${daily.crystals} Cristales de Ki y ${daily.tickets} ticket`);
    requestAnimationFrame(frame);
  })
  .catch((err) => show(`<div class="panel"><h2>Error</h2><p>${err.message}</p></div>`));
