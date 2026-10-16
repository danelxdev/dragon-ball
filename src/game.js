import {
  WEAPONS, PASSIVES, ENEMIES, BOSSES, MAX_PASSIVES, BIOMES, PHASES, SCALING, TRAIN,
  RARITY, ITEMS, EVOLUTIONS, COMMON_WEAPONS, MAX_SLOTS, BOND_MAX, ULTS, DECOR_GRADE,
} from './data.js';
import {
  img, meta, recolor, drawHero, drawShinyOutline, heroSize, drawStrip, drawNumber, heroCard, graded, gradeColor, hasHero,
} from './assets.js';
import { sfx } from './audio.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fila de la hoja según la dirección del movimiento: 0 abajo, 1 izq, 2 der, 3 arriba.
function dirFrom(x, y, prev) {
  if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return prev;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 1 : 2;
  return y < 0 ? 3 : 0;
}

const TAU = Math.PI * 2;
export const BUFF_COLORS = { fury: '#ff5a4a', speed: '#7affd0', haste: '#7ab8ff', magnet: '#ffd23a' };
const MAX_ENEMIES = 480;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Rejilla espacial para colisiones rápidas.
class Grid {
  constructor(cell) {
    this.cell = cell;
    this.map = new Map();
  }
  clear() {
    this.map.clear();
  }
  key(cx, cy) {
    return (cx + 32768) * 65536 + (cy + 32768);
  }
  insert(e) {
    const cx = Math.floor(e.x / this.cell);
    const cy = Math.floor(e.y / this.cell);
    const k = this.key(cx, cy);
    let b = this.map.get(k);
    if (!b) this.map.set(k, (b = []));
    b.push(e);
  }
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c);
    const x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c);
    const y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const b = this.map.get(this.key(cx, cy));
        if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
      }
    }
    return out;
  }
}

// Capa de detalle del suelo (640x640, se repite desfasada con las baldosas de 256): manchas de luz y
// sombra suaves, matas de hierba, flores, piedrecitas, grietas y brasas según la zona.
const detailCache = {};
export function groundDetail(b) {
  const key = b.id || b.tile;
  if (detailCache[key]) return detailCache[key];
  const S = 640;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  const r = rng([...key].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) >>> 0);
  const [br, bg, bb] = gradeColor(b.base[0], b.base[1], b.base[2], b.grade);
  const shade = (k, a = 1) => `rgba(${Math.round(br * k)},${Math.round(bg * k)},${Math.round(bb * k)},${a})`;
  const d = b.detail;
  // manchas grandes (se dibujan 9 veces desplazadas para que encajen al repetirse)
  const wrap = (fn) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy);
  };
  for (let i = 0; i < 26; i++) {
    const x = r() * S;
    const y = r() * S;
    const R = 50 + r() * 110;
    const dark = r() < 0.55;
    wrap((ox, oy) => {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, R);
      g.addColorStop(0, dark ? 'rgba(10,20,10,0.13)' : 'rgba(255,250,220,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - R, y + oy - R, R * 2, R * 2);
    });
  }
  const px = (x, y, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(((Math.round(x) % S) + S) % S, ((Math.round(y) % S) + S) % S, 1, 1);
  };
  // matas de hierba: 3-5 hojas, oscuras abajo y claras en la punta
  for (let i = 0; i < (d.tufts || 0); i++) {
    const x = r() * S;
    const y = r() * S;
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const bx = x + (k - n / 2) * 1.5 + (r() - 0.5);
      const h = 2 + Math.floor(r() * 3);
      const lean = r() < 0.5 ? -1 : 1;
      for (let j = 0; j < h; j++) px(bx + (j === h - 1 && k !== Math.floor(n / 2) ? lean : 0), y - j, j === h - 1 ? shade(1.3) : shade(0.68));
    }
  }
  // flores
  const fcols = ['#f4efd6', '#f2d06a', '#e8879e', '#b9a6f0'];
  for (let i = 0; i < (d.flowers || 0); i++) {
    const x = r() * S;
    const y = r() * S;
    const col = fcols[Math.floor(r() * fcols.length)];
    px(x - 1, y, col);
    px(x + 1, y, col);
    px(x, y - 1, col);
    px(x, y + 1, col);
    px(x, y, '#ffe36a');
    px(x, y + 2, shade(0.6));
  }
  // piedrecitas
  for (let i = 0; i < (d.stones || 0); i++) {
    const x = r() * S;
    const y = r() * S;
    const big = r() < 0.4;
    px(x, y, shade(1.25));
    px(x + 1, y, shade(1.1));
    if (big) {
      px(x, y + 1, shade(0.9));
      px(x + 1, y + 1, shade(0.75));
      px(x + 2, y + 1, shade(0.7));
    } else px(x + 1, y + 1, shade(0.7));
  }
  // grietas (Namek en destrucción)
  for (let i = 0; i < (d.cracks || 0); i++) {
    let x = r() * S;
    let y = r() * S;
    let a = r() * Math.PI * 2;
    const len = 10 + r() * 30;
    for (let j = 0; j < len; j++) {
      px(x, y, shade(0.5));
      if (r() < 0.3) px(x + 1, y, shade(0.62));
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a);
      y += Math.sin(a);
    }
  }
  // brasas
  for (let i = 0; i < (d.embers || 0); i++) {
    const x = r() * S;
    const y = r() * S;
    px(x, y, r() < 0.5 ? '#ff7a3a' : '#ffb84a');
    if (r() < 0.4) px(x + 1, y, '#c0401a');
  }
  detailCache[key] = c;
  return c;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

export class Game {
  // char: entrada de ROSTER; prog: progreso guardado del personaje; item: id de objeto equipado.
  constructor(canvas, input, char, save, ui, prog = {}, item = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.char = char;
    this.save = save;
    this.ui = ui;
    this.prog = prog;
    this.item = item ? ITEMS[item] : null;
    this.itemId = item;
    this.W = canvas.width;
    this.H = canvas.height;
    this.scale = 1;

    this.grounds = {};
    this.details = {};
    for (const b of Object.values(BIOMES)) {
      this.grounds[b.id] = this.ctx.createPattern(graded('tiles', b.tile, b.grade), 'repeat');
      this.details[b.id] = this.ctx.createPattern(groundDetail(b), 'repeat');
    }
    // Fases: cada una con su zona, enemigos, élites y jefe; tras la última empieza otra ronda más difícil
    this.phase = 0; // índice dentro de PHASES
    this.loop = 0; // rondas completadas
    this.phaseT = 0;
    this.phasesCleared = 0;
    this.bossSpawned = false;
    this.phaseHorde = false;
    this.phaseBreak = 0; // pausa entre fases
    this.slowmo = 0;
    this.biome = PHASES[0].biome;
    this.grid = new Grid(32);
    this.tmp = [];

    this.t = 0;
    this.state = 'play';
    this.kills = 0;
    this.coins = 0;
    this.bossKills = 0;
    this.bossesBeaten = [];
    this.wishes = 0;
    this.evolutions = 0;
    this.itemsFound = [];
    this.level = 1;
    this.xp = 0;
    this.nextXp = this.xpFor(1);
    this.pendingLevels = 0;
    this.dballs = 0;
    this.nextDballT = 40;
    this.nextEliteT = 40;
    this.spawnAcc = 0;
    this.bonusMight = 1;
    this.revives = this.mod('revive');
    this.shake = 0;
    this.flashScreen = 0;
    this.nextId = 1;

    const up = save.upgrades;
    this.rerolls = 1 + (up.reroll || 0);

    this.player = {
      x: 0, y: 0, r: 6, hp: 1, maxHp: 1, face: 1, dirX: 1, dirY: 0, dir: 0,
      inv: 0, walkT: 0, moving: false, form: 0,
      atkT: 0, atkDur: 0.25, atkAng: 0, hurtT: 0, trail: [], trailT: 0,
    };
    this.weapons = [];
    this.passives = {};
    this.enemies = [];
    this.projs = [];
    this.beams = [];
    this.eprojs = [];
    this.minionShots = 0;
    this.effects = [];
    this.particles = [];
    this.pickups = [];
    this.texts = [];
    this.orbs = [];
    this.boss = null;
    this.ebeams = []; // rayos de jefe con aviso en el suelo
    this.rains = []; // lluvia de ki de los jefes (aviso en el suelo)
    this.prains = []; // lluvia de meteoros del jugador
    this.corpses = []; // enemigos derrotados saliendo despedidos

    // Formato PokeSurvivor: hasta 4 ranuras de técnicas y solo dispara la activa.
    // Los vínculos (al derrotar jefes) juntan ranuras para lanzar varias técnicas a la vez.
    this.slots = [];
    this.active = 0;
    this.bonds = 0;
    this.bondsUsed = 0;
    this.pendingBond = false;
    // Barra de ki: al llenarse se puede lanzar el ataque definitivo del guerrero.
    this.ki = 0;
    this.kiRate = 1 + 0.15 * (save.upgrades.ki || 0);
    this.ults = 0;
    this.cutin = null;
    this.ult = null;
    // Botín de la partida
    this.crystals = 0;
    this.tickets = 0;
    this.ticket10 = 0;
    this.podsBroken = 0;
    this.buffs = {};
    this.nextPodT = 10;

    this.recalc();
    this.player.hp = this.player.maxHp;
    this.addWeapon(char.weapon);
    if (this.mod('extraWeapon') || save.upgrades.repertorio) {
      const pool = COMMON_WEAPONS.filter((id) => id !== char.weapon);
      this.addWeapon(pick(pool));
    }
  }

  // -------------------------------------------------------------------------
  // Ranuras, vínculos y ki
  // -------------------------------------------------------------------------
  get activeSlot() {
    return this.slots[this.active] || this.slots[0];
  }

  setActive(i) {
    if (i === this.active || i < 0 || i >= this.slots.length || this.state !== 'play') return;
    this.active = i;
    for (const w of this.activeSlot.ws) {
      const s = this.weaponStats(w);
      if (s.cd) w.timer = Math.min(w.timer, s.cd * this.stats.haste * 0.35);
    }
    this.rebuildOrbs();
    sfx('switch');
  }

  cycleSlot(d) {
    if (this.slots.length < 2) return;
    this.setActive((this.active + d + this.slots.length) % this.slots.length);
  }

  // Opciones de vínculo: juntar dos ranuras si caben (máximo BOND_MAX técnicas por ranura).
  bondOptions() {
    const out = [];
    for (let a = 0; a < this.slots.length; a++) {
      for (let b = 0; b < this.slots.length; b++) {
        if (a === b) continue;
        const A = this.slots[a].ws;
        const B = this.slots[b].ws;
        if (A.length + B.length > BOND_MAX) continue;
        // se fusiona la pequeña en la grande (en caso de empate, en la de índice menor)
        if (B.length > A.length || (B.length === A.length && b < a)) continue;
        out.push({ a, b, size: A.length + B.length, names: [...A, ...B].map((w) => w.def.name) });
      }
    }
    out.sort((x, y) => y.size - x.size || (x.a === this.active ? -1 : 0));
    return out.slice(0, 3);
  }

  applyBond(o) {
    if (o) {
      const A = this.slots[o.a];
      const B = this.slots[o.b];
      A.ws.push(...B.ws);
      this.slots.splice(o.b, 1);
      if (this.active === o.b) this.active = o.a > o.b ? o.a - 1 : o.a;
      else if (this.active > o.b) this.active--;
      this.bonds--;
      this.bondsUsed++;
      this.rebuildOrbs();
      sfx('bond');
      this.flashScreen = 0.4;
      this.ui.banner('¡VÍNCULO! ' + A.ws.map((w) => w.def.name).join(' + ').toUpperCase(), '#ffd23a');
    } else {
      this.ui.toast('Guardas el vínculo para más tarde');
    }
    this.state = 'play';
    this.ui.hideModal();
  }

  gainKi(v) {
    if (this.ult || this.cutin) return;
    const before = this.ki;
    this.ki = Math.min(100, this.ki + v * this.kiRate);
    if (before < 100 && this.ki >= 100) {
      sfx('dragonball');
      this.ui.toast('¡Ki al máximo! Pulsa ESPACIO (o el botón KI) para tu ataque definitivo');
    }
  }

  ultName() {
    const id = this.char.weapon;
    return ULTS[id] || 'Explosión de ki';
  }

  ultimate() {
    if (this.ki < 100 || this.state !== 'play' || this.cutin || this.ult) return;
    this.ki = 0;
    this.ults++;
    this.cutin = { t: 0, dur: 1.05, name: this.ultName(), card: heroCard(this.sprite, 96, 120, null, 0, this.prog.shiny) };
    sfx('ult');
  }

  startUlt() {
    const p = this.player;
    const def = WEAPONS[this.char.weapon];
    const kind = def.kind === 'beam' ? 'beam' : def.kind === 'bomb' ? 'bomb' : 'nova';
    const pow = 1 + 0.05 * this.level;
    this.shake = 0.6;
    this.flashScreen = 0.5;
    if (kind === 'beam') {
      this.ult = { kind, t: 0, dur: 2.6, ang: this.aimAngle(true), len: 640, width: 64, tick: 0, dmg: 22 * pow, art: def.art || 'beam_cyan', tint: def.tint };
    } else if (kind === 'bomb') {
      this.ult = { kind, t: 0, dur: 2.2, x: p.x, y: p.y - 60, tx: 0, ty: 0, dmg: 650 * pow, r: 240, art: def.art, tint: def.tint, boomed: false };
    } else {
      this.ult = { kind, t: 0, dur: 0.9, r: 0, maxR: 300, dmg: 240 * pow, hit: new Set(), color: def.color };
      this.eprojs = [];
      sfx('boom', 0);
    }
  }

  updateUlt(dt) {
    const u = this.ult;
    const p = this.player;
    u.t += dt;
    if (u.kind === 'beam') {
      const tg = this.nearestEnemies(1, 500)[0];
      if (tg) {
        const want = Math.atan2(tg.y - p.y, tg.x - p.x);
        let d = want - u.ang;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        u.ang += clamp(d, -1.3 * dt, 1.3 * dt);
      }
      u.tick -= dt;
      if (u.tick <= 0) {
        u.tick = 0.1;
        const x1 = p.x;
        const y1 = p.y - 4;
        const x2 = x1 + Math.cos(u.ang) * u.len;
        const y2 = y1 + Math.sin(u.ang) * u.len;
        for (const e of this.enemies) {
          if (!e.dead && distToSegment(e.x, e.y, x1, y1, x2, y2) < u.width / 2 + e.r) this.hit(e, u.dmg, x1, y1, 60, true);
        }
        this.shake = Math.max(this.shake, 0.12);
      }
    } else if (u.kind === 'bomb') {
      if (u.t < 1.1) {
        u.x = p.x;
        u.y = p.y - 60;
        const tg = this.boss && !this.boss.dead ? this.boss : this.nearestEnemies(1, 400)[0];
        u.tx = tg ? tg.x : p.x + p.face * 120;
        u.ty = tg ? tg.y : p.y;
      } else if (!u.boomed) {
        const k = Math.min(1, (u.t - 1.1) / 0.45);
        u.x = p.x + (u.tx - p.x) * k;
        u.y = p.y - 60 + (u.ty - p.y + 60) * k;
        if (k >= 1) {
          u.boomed = true;
          this.shake = 1;
          this.flashScreen = 0.7;
          sfx('boom', 0);
          this.effects.push({ kind: 'boom', x: u.tx, y: u.ty, t: 0, dur: 0.8, r: u.r * 0.8, big: true });
          for (const e of this.enemies) {
            if (!e.dead && Math.hypot(e.x - u.tx, e.y - u.ty) < u.r + e.r) this.hit(e, u.dmg, u.tx, u.ty, 300, true);
          }
        }
      }
    } else {
      u.r = (u.t / 0.6) * u.maxR;
      for (const e of this.enemies) {
        if (e.dead || u.hit.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < u.r + e.r) {
          u.hit.add(e.id);
          e.stun = Math.max(e.stun, e.boss ? 0.4 : 1.4);
          this.hit(e, u.dmg, p.x, p.y, 260, true);
        }
      }
    }
    if (u.t >= u.dur) this.ult = null;
  }

  mod(k) {
    return (this.item && this.item.mod[k]) || 0;
  }

  // -------------------------------------------------------------------------
  // Estadísticas
  // -------------------------------------------------------------------------
  get form() {
    return this.char.forms[this.player.form] || this.char.forms[0];
  }

  get sprite() {
    return this.form.sprite;
  }

  recalc() {
    const bf = this.buffs || {};
    const b = this.char.stats;
    const m = this.save.upgrades;
    const p = this.passives;
    const f = this.form || {};
    const cu = this.prog.up || {};
    const lv = (o, k) => o[k] || 0;
    const rar = RARITY[this.char.rarity] || RARITY.C;
    const stars = 1 + 0.06 * ((this.prog.stars || 1) - 1);
    const shiny = (this.prog.shiny ? 1.1 : 1) * (1 + TRAIN.bonus * (this.prog.lvl || 0));
    const prevMax = this.player.maxHp;
    this.stats = {
      might: b.might * rar.mult * stars * shiny * (1 + 0.05 * lv(m, 'poder')) * (1 + 0.06 * lv(cu, 'poder')) *
        (1 + 0.1 * lv(p, 'poder')) * (1 + (f.might || 0)) * (1 + this.mod('might')) * this.bonusMight * (bf.fury > 0 ? 1.5 : 1),
      speed: 80 * b.speed * (1 + 0.04 * lv(m, 'velocidad')) * (1 + 0.04 * lv(cu, 'velocidad')) *
        (1 + 0.07 * lv(p, 'velocidad')) * (1 + (f.speed || 0)) * (1 + this.mod('speed')) * (bf.speed > 0 ? 1.35 : 1),
      armor: lv(m, 'armadura') + lv(p, 'armadura') + (b.armor || 0),
      haste: Math.max(0.3, (1 - 0.07 * lv(p, 'concentracion')) * (1 - 0.04 * lv(cu, 'recarga')) * (1 - this.mod('haste')) * (bf.haste > 0 ? 0.6 : 1)),
      area: (1 + 0.1 * lv(p, 'control')) * (1 + this.mod('area')),
      regen: (b.regen || 0) + 0.15 * lv(m, 'regen') + 0.3 * lv(p, 'meditacion') + (f.regen || 0) + this.mod('regen'),
      magnet: 55 * (1 + 0.1 * lv(m, 'iman')) * (1 + 0.25 * lv(p, 'radar')) * (1 + (b.magnet || 0)) * (1 + this.mod('magnet')),
      amount: lv(p, 'multiplicacion') + this.mod('amount'),
      growth: (1 + (b.growth || 0)) * (1 + 0.05 * lv(m, 'crecimiento')) * (1 + 0.08 * lv(p, 'crecimiento')) * (1 + this.mod('growth')),
      greed: 1 + 0.1 * lv(m, 'avaricia'),
      crit: 0.06 + this.mod('crit'),
    };
    const maxHp = (b.hp * rar.mult * stars + 10 * lv(m, 'vida') + 12 * lv(cu, 'vida') + 20 * lv(p, 'vida') + (this.extraHp || 0)) *
      (1 + this.mod('hp')) * (1 + TRAIN.bonus * (this.prog.lvl || 0));
    this.player.maxHp = Math.round(maxHp);
    if (prevMax > 1 && maxHp > prevMax) this.player.hp += maxHp - prevMax;
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
  }

  xpFor(level) {
    return Math.floor(5 + level * 7 + Math.max(0, level - 10) * 10 + Math.max(0, level - 25) * 20 + Math.max(0, level - 40) * 30);
  }

  // -------------------------------------------------------------------------
  // Armas y pasivas
  // -------------------------------------------------------------------------
  // Cada técnica nueva ocupa una ranura nueva (los vínculos las juntan después).
  addWeapon(id) {
    const w = { id, def: WEAPONS[id], level: 1, timer: 0.3, angle: 0 };
    this.weapons.push(w);
    this.slots.push({ ws: [w] });
    this.rebuildOrbs();
    return w;
  }

  weaponStats(w) {
    return w.def.levels[w.level - 1];
  }

  rebuildOrbs() {
    const w = this.activeSlot && this.activeSlot.ws.find((x) => x.def.kind === 'orbit');
    this.orbs = [];
    if (!w) return;
    const s = this.weaponStats(w);
    const n = s.count + this.stats.amount;
    for (let i = 0; i < n; i++) this.orbs.push({ a: (i / n) * TAU, x: 0, y: 0 });
  }

  levelUpOptions() {
    const opts = [];
    for (const w of this.weapons) {
      const evo = EVOLUTIONS[w.id];
      if (w.level >= w.def.levels.length && evo && this.passives[evo.need]) {
        const into = WEAPONS[evo.into];
        opts.push({
          type: 'evolve', id: w.id, into: evo.into, name: into.name, color: into.color, w: 99,
          desc: `${w.def.name} + ${PASSIVES[evo.need].name}: ${into.desc}`,
        });
      } else if (w.level < w.def.levels.length) {
        opts.push({
          type: 'weapon', id: w.id, level: w.level + 1, name: w.def.name, color: w.def.color,
          desc: diffDesc(w.def.levels[w.level - 1], w.def.levels[w.level]),
        });
      }
    }
    if (this.slots.length < MAX_SLOTS) {
      for (const id of COMMON_WEAPONS) {
        if (this.weapons.some((w) => w.id === id || (EVOLUTIONS[id] && EVOLUTIONS[id].into === w.id))) continue;
        const d = WEAPONS[id];
        opts.push({ type: 'weapon', id, level: 1, name: d.name, color: d.color, desc: d.desc, isNew: true, slot: this.slots.length + 1 });
      }
    }
    const owned = Object.keys(this.passives);
    for (const id of Object.keys(PASSIVES)) {
      const d = PASSIVES[id];
      const cur = this.passives[id] || 0;
      if (cur >= d.max) continue;
      if (!cur && owned.length >= MAX_PASSIVES) continue;
      // las pasivas que permiten evolucionar una técnica tuya salen más a menudo
      const helps = this.weapons.some((w) => EVOLUTIONS[w.id] && EVOLUTIONS[w.id].need === id);
      opts.push({ type: 'passive', id, level: cur + 1, name: d.name, color: d.color, desc: d.desc, isNew: !cur, helps });
    }
    for (const o of opts) if (o.w === undefined) o.w = Math.random() * (o.isNew ? 1 : 1.4) * (o.helps ? 1.6 : 1);
    opts.sort((a, b) => b.w - a.w);
    const out = opts.slice(0, 3);
    if (!out.length) {
      out.push({ type: 'heal', name: 'Semilla del Ermitaño', color: '#5cc93a', desc: 'Recupera el 50% de la vida.' });
      out.push({ type: 'zeni', name: 'Bolsa de Zeni', color: '#f0c419', desc: '+25 Zeni.' });
    }
    return out;
  }

  applyOption(o) {
    if (o.type === 'evolve') {
      const w = this.weapons.find((x) => x.id === o.id);
      if (w) {
        w.id = o.into;
        w.def = WEAPONS[o.into];
        w.level = 1;
        w.timer = 0.1;
        this.evolutions++;
        if (w.def.kind === 'orbit') this.rebuildOrbs();
        this.ui.banner('¡' + w.def.name.toUpperCase() + '!', w.def.color);
        sfx('transform');
      }
    } else if (o.type === 'weapon') {
      const w = this.weapons.find((x) => x.id === o.id);
      if (w) w.level = o.level;
      else {
        this.addWeapon(o.id);
        this.ui.toast(`${WEAPONS[o.id].name} en la ranura ${this.slots.length}: pulsa ${this.slots.length} (o tócala) para usarla`);
        if (this.bonds > 0) this.pendingBond = true;
      }
      this.rebuildOrbs();
    } else if (o.type === 'passive') {
      this.passives[o.id] = o.level;
      this.recalc();
      if (o.id === 'vida') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
      if (o.id === 'multiplicacion') this.rebuildOrbs();
    } else if (o.type === 'heal') {
      this.heal(this.player.maxHp * 0.5);
    } else if (o.type === 'zeni') {
      this.coins += 25;
    }
  }

  chooseOption(o) {
    this.applyOption(o);
    this.pendingLevels--;
    if (this.pendingLevels > 0) {
      this.ui.showLevelUp(this.levelUpOptions(), this);
    } else {
      this.state = 'play';
      this.ui.hideModal();
      this.checkTransform();
    }
  }

  reroll() {
    if (this.rerolls <= 0 || this.state !== 'levelup') return;
    this.rerolls--;
    this.ui.showLevelUp(this.levelUpOptions(), this);
  }

  checkTransform() {
    const forms = this.char.forms;
    const shift = this.mod('formLvl');
    let idx = 0;
    for (let i = 0; i < forms.length; i++) if (this.level >= forms[i].lvl + shift) idx = i;
    if (idx > this.player.form) {
      this.player.form = idx;
      this.recalc();
      this.heal(this.player.maxHp * 0.3);
      const f = forms[idx];
      sfx('transform');
      this.shake = 0.6;
      this.flashScreen = 0.6;
      this.effects.push({ kind: 'burst', x: this.player.x, y: this.player.y, t: 0, dur: 0.9, color: f.aura || '#ffe14a' });
      this.knockAll(this.player.x, this.player.y, 140, 260);
      this.ui.banner(f.name.toUpperCase() + '!', f.aura);
      if (idx === forms.length - 1 && forms.length > 1) this.maxForm = true;
    }
  }

  // -------------------------------------------------------------------------
  // Bucle
  // -------------------------------------------------------------------------
  resize(W, H, scale) {
    this.W = W;
    this.H = H;
    this.scale = scale;
  }

  update(dt) {
    if (this.state !== 'play') return;
    // Corte de anime antes del ataque definitivo: el tiempo se detiene.
    if (this.cutin) {
      this.cutin.t += dt;
      if (this.cutin.t >= this.cutin.dur) {
        const wasBoss = this.cutin.boss;
        this.cutin = null;
        if (!wasBoss) this.startUlt();
      }
      return;
    }
    // Cámara lenta al derrotar a un jefe
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      dt *= 0.3;
    }
    this.t += dt;
    this.phaseT += dt;
    const p = this.player;
    this.gainKi(0.4 * dt);
    let buffEnded = false;
    for (const k of Object.keys(this.buffs)) {
      if (this.buffs[k] > 0) {
        this.buffs[k] -= dt;
        if (this.buffs[k] <= 0) buffEnded = true;
      }
    }
    if (buffEnded) this.recalc();

    // Movimiento
    const ax = this.input.axis();
    p.moving = ax.x !== 0 || ax.y !== 0;
    if (p.moving) {
      p.x += ax.x * this.stats.speed * dt;
      p.y += ax.y * this.stats.speed * dt;
      p.walkT += dt;
      const d = Math.hypot(ax.x, ax.y);
      p.dirX = ax.x / d;
      p.dirY = ax.y / d;
      if (Math.abs(ax.x) > 0.1) p.face = ax.x > 0 ? 1 : -1;
      p.dir = dirFrom(ax.x, ax.y, p.dir);
    }

    if (p.inv > 0) p.inv -= dt;
    if (p.atkT > 0) p.atkT -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    // estela de imágenes residuales al volar
    p.trailT -= dt;
    if (p.moving && p.trailT <= 0) {
      p.trailT = 0.045;
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 4) p.trail.pop();
    } else if (!p.moving && p.trail.length && p.trailT <= 0) {
      p.trailT = 0.045;
      p.trail.pop();
    }
    if (this.stats.regen > 0) this.heal(this.stats.regen * dt, true);

    // Rejilla de enemigos
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);

    this.updateSpawns(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateEnemyProjectiles(dt);
    this.updatePickups(dt);
    this.updateEffects(dt);
    if (this.ult) this.updateUlt(dt);

    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);

    if (this.shake > 0) this.shake -= dt;
    if (this.flashScreen > 0) this.flashScreen -= dt;

    if (this.pendingLevels > 0 && this.state === 'play') {
      this.state = 'levelup';
      sfx('level');
      this.ui.showLevelUp(this.levelUpOptions(), this);
    }

    if (this.pendingBond && this.state === 'play') {
      this.pendingBond = false;
      const opts = this.bondOptions();
      if (this.bonds > 0 && opts.length) {
        this.state = 'bond';
        sfx('bond');
        this.ui.showBond(opts, this);
      } else if (this.bonds > 0) {
        this.ui.toast('Guardas el vínculo: úsalo cuando tengas otra técnica');
      }
    }

    if (this.phaseBreak > 0 && this.state === 'play') {
      this.phaseBreak -= dt;
      if (this.phaseBreak <= 0) this.nextPhase();
    }
  }

  // -------------------------------------------------------------------------
  // Fases
  // -------------------------------------------------------------------------
  get phaseDef() {
    return PHASES[this.phase];
  }

  // Número de fase total (1, 2, 3...) contando las rondas
  get phaseNum() {
    return this.loop * PHASES.length + this.phase + 1;
  }

  // Multiplicadores de dificultad de la fase actual
  get hpMul() {
    return Math.pow(SCALING.hp, this.phase) * Math.pow(SCALING.loop, this.loop) * (1 + Math.min(this.phaseT, 200) / 160);
  }

  get dmgMul() {
    return Math.pow(SCALING.dmg, this.phase) * Math.pow(1.5, this.loop) * (1 + Math.min(this.phaseT, 200) / 400);
  }

  get xpMul() {
    return (1 + SCALING.xp * this.phase) * (1 + this.loop);
  }

  // Jefe derrotado: premios, cámara lenta y paso a la siguiente fase
  clearPhase() {
    this.phasesCleared++;
    const n = this.phaseNum;
    const crystals = 8 + 4 * n;
    this.crystals += crystals;
    this.coins += 20 * n;
    if (n % 5 === 0) this.tickets++;
    if (this.phase === PHASES.length - 1) {
      this.ticket10++;
      this.won = true;
    }
    this.slowmo = 1.2;
    this.phaseBreak = 3;
    this.heal(this.player.maxHp * 0.3);
    this.ui.banner(`¡FASE ${n} COMPLETADA! +${crystals} cristales`, '#7aff6a');
    sfx('dragonball');
  }

  nextPhase() {
    this.phase++;
    if (this.phase >= PHASES.length) {
      this.phase = 0;
      this.loop++;
    }
    this.phaseT = 0;
    this.bossSpawned = false;
    this.phaseHorde = false;
    this.nextEliteT = this.t + 30;
    const ph = this.phaseDef;
    if (ph.biome !== this.biome) this.biome = ph.biome;
    const ronda = this.loop ? ` · RONDA ${this.loop + 1}` : '';
    this.ui.banner(`FASE ${this.phaseNum}: ${ph.name.toUpperCase()}${ronda}`, '#9fe0ff');
    this.ui.toast(BIOMES[ph.biome].name + (this.loop ? ' · ¡los enemigos son mucho más fuertes!' : ''));
  }

  // -------------------------------------------------------------------------
  // Aparición de enemigos
  // -------------------------------------------------------------------------
  currentWave() {
    let w = WAVES[0];
    for (const x of WAVES) if (this.t >= x.t) w = x;
    return w;
  }

  spawnPoint(extra = 0) {
    const a = Math.random() * TAU;
    const d = Math.hypot(this.W, this.H) / 2 + 24 + extra;
    return { x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d };
  }

  spawnEnemy(type, x, y) {
    const def = ENEMIES[type];
    const e = {
      id: this.nextId++, type, def, x, y, r: def.r,
      hp: def.hp * this.hpMul, speed: def.speed * rand(0.9, 1.1) * (1 + Math.min(0.25, this.phase * 0.02)),
      dmg: def.dmg * this.dmgMul, xp: def.xp * this.xpMul,
      vx: 0, vy: 0, flash: 0, stun: 0, face: 1, dir: 0, walkT: Math.random(), elite: false, boss: false,
      scale: 1, dead: false, orbCd: 0, sprite: def.sprite, mode: def.hue ? 'hue' + def.hue : null,
      shot: def.ranged ? rand(0.5, def.ranged.cd) : 0, arm: 0, chargeT: 0, chargeCd: rand(1, 3),
    };
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  // Élite: un villano de la serie con contorno dorado. Suelta una Cápsula Corp.
  spawnElite(x, y) {
    const list = this.phaseDef.elites;
    if (!list.length) return null;
    const sprite = pick(list);
    const e = {
      id: this.nextId++, type: 'elite', def: { name: 'Élite', dmg: 12 }, x, y, r: 11,
      hp: 220 * this.hpMul, speed: 48 * rand(0.9, 1.1), dmg: 11 * this.dmgMul, xp: 30 * this.xpMul,
      vx: 0, vy: 0, flash: 0, stun: 0, face: 1, dir: 0, walkT: Math.random(), elite: true, boss: false,
      scale: 1, dead: false, orbCd: 0, sprite, mode: null, shot: rand(2, 4), atkT: 0,
    };
    if (sprite === 'burter') e.speed *= 1.45; // el más rápido del universo
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  // Cápsula Corp rompible con premio (senzu, potenciador, Zeni o cristales).
  spawnPod() {
    if (this.enemies.filter((e) => e.pod).length >= 4) return;
    const a = Math.random() * TAU;
    const d = rand(140, 260);
    const e = {
      id: this.nextId++, type: 'pod', def: { name: 'Cápsula' }, x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d,
      r: 8, hp: 20 * Math.pow(SCALING.hp, this.phase + this.loop * 4), speed: 0, dmg: 0, xp: 0, vx: 0, vy: 0, flash: 0, stun: 0, face: 1, dir: 0, walkT: 0,
      elite: false, boss: false, pod: true, scale: 1, dead: false, orbCd: 0, sprite: null, mode: null,
    };
    e.maxHp = e.hp;
    this.enemies.push(e);
  }

  spawnBoss(id) {
    const def = BOSSES[id];
    const pt = this.spawnPoint(20);
    const hp = def.hp * Math.pow(SCALING.loop, this.loop) * 1.6;
    const e = {
      id: this.nextId++, type: id, def, x: pt.x, y: pt.y, r: def.r,
      hp, maxHp: hp, speed: def.speed, dmg: def.dmg * Math.pow(1.5, this.loop), xp: def.xp * this.xpMul,
      vx: 0, vy: 0, flash: 0, stun: 0, face: 1, dir: 0, walkT: 0, elite: false, boss: true,
      scale: 1, dead: false, orbCd: 0, sprite: def.sprite, mode: null, atkT: 0,
      ai: { t: 2 + Math.random(), mode: 'walk', dash: 0, wx: 0, wy: 0, shots: 0, last: null },
    };
    this.enemies.push(e);
    this.boss = e;
    sfx('boss');
    this.shake = 0.5;
    // Presentación del jefe con un corte de anime
    this.cutin = { t: 0, dur: 1.6, name: def.name, sub: def.quote, card: heroCard(def.sprite, 96, 120), boss: true, color: def.color };
  }

  updateSpawns(dt) {
    const ph = this.phaseDef;
    // ritmo de aparición: sube con la fase y con el tiempo dentro de ella (y aún más si el jefe sigue vivo)
    const enrage = this.boss && !this.boss.dead && this.phaseT > ph.bossAt + 80 ? 1.6 : 1;
    const rate = Math.min(22, 3.2 + this.phase * 1.25 + this.loop * 4) * (1 + Math.min(this.phaseT, 150) / 150) * enrage *
      (this.phaseBreak > 0 ? 0.3 : 1);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= MAX_ENEMIES) break;
      const pt = this.spawnPoint();
      this.spawnEnemy(pick(ph.types), pt.x, pt.y);
    }

    if (!this.bossSpawned && this.phaseT >= ph.bossAt && this.phaseBreak <= 0) {
      this.bossSpawned = true;
      this.spawnBoss(ph.boss);
    }

    if (this.t >= this.nextPodT) {
      this.nextPodT += rand(16, 26);
      this.spawnPod();
    }

    if (this.t >= this.nextEliteT) {
      this.nextEliteT = this.t + Math.max(28, 48 - this.phase * 1.5);
      const pt = this.spawnPoint();
      this.spawnElite(pt.x, pt.y);
    }

    // Horda que te rodea a mitad de cada fase (desde la segunda)
    if (!this.phaseHorde && this.phaseNum > 1 && this.phaseT >= ph.bossAt * 0.55) {
      this.phaseHorde = true;
      const n = Math.min(70, 30 + this.phase * 3);
      const R = Math.hypot(this.W, this.H) / 2 + 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        this.spawnEnemy(pick(ph.types), this.player.x + Math.cos(a) * R, this.player.y + Math.sin(a) * R);
      }
      this.ui.banner('¡UNA HORDA TE RODEA!', '#ff6a6a');
    }

    if (this.t >= this.nextDballT) {
      this.nextDballT += 95 * (1 - this.mod('dball'));
      const onMap = this.pickups.filter((k) => k.type === 'dragonball').length;
      if (this.dballs + onMap < 7) {
        const a = Math.random() * TAU;
        const d = rand(320, 480);
        this.pickups.push({ type: 'dragonball', x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d, stars: this.dballs + onMap + 1 });
        this.ui.toast('El Radar del Dragón detecta una Bola de Dragón');
      }
    }
  }

  // -------------------------------------------------------------------------
  // Técnicas
  // -------------------------------------------------------------------------
  nearestEnemies(n, maxDist = 400) {
    const p = this.player;
    const list = [];
    for (const e of this.enemies) {
      if (e.pod) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < maxDist * maxDist) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((x) => x[1]);
  }

  nearestEnemiesFrom(x, y, n, maxDist) {
    const list = [];
    for (const e of this.enemies) {
      if (e.dead || e.pod) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < maxDist * maxDist) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((v) => v[1]);
  }

  aimAngle(useNearest) {
    const p = this.player;
    if (useNearest) {
      const t = this.nearestEnemies(1, 320)[0];
      if (t) return Math.atan2(t.y - p.y, t.x - p.x);
    }
    return Math.atan2(p.dirY, p.dirX);
  }

  updateWeapons(dt) {
    const p = this.player;
    const st = this.stats;
    const slot = this.activeSlot;
    if (!slot) return;
    // Bonus de vínculo: +12% de daño por cada técnica extra en la ranura
    const bondMul = 1 + 0.12 * (slot.ws.length - 1);
    for (const w of slot.ws) {
      const base = this.weaponStats(w);
      const s = bondMul === 1 ? base : { ...base, dmg: base.dmg * bondMul };
      const kind = w.def.kind;
      if (kind === 'orbit') {
        w.angle += s.spin * dt;
        const R = s.radius * st.area;
        this.orbs.forEach((o, i) => {
          const a = w.angle + (i / this.orbs.length) * TAU;
          o.x = p.x + Math.cos(a) * R;
          o.y = p.y + Math.sin(a) * R;
          this.grid.query(o.x, o.y, 20, this.tmp);
          for (const e of this.tmp) {
            if (e.dead || e.orbCd > this.t) continue;
            if (Math.hypot(e.x - o.x, e.y - o.y) < e.r + 5) {
              e.orbCd = this.t + 0.45;
              this.hit(e, s.dmg, o.x, o.y, 90);
            }
          }
        });
        continue;
      }
      // Ráfaga continua (Renzoku): dispara una bola cada pocas centésimas
      if (w.burst > 0) {
        w.burstT -= dt;
        while (w.burstT <= 0 && w.burst > 0) {
          w.burstT += 0.045;
          w.burst--;
          const bs = w.burstS;
          const tg = this.nearestEnemies(1, 300)[0];
          const a = (tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : Math.atan2(p.dirY, p.dirX)) + rand(-bs.spread, bs.spread);
          this.projs.push({
            kind: 'ki', x: p.x, y: p.y - 4, vx: Math.cos(a) * bs.speed, vy: Math.sin(a) * bs.speed,
            r: bs.size * st.area, dmg: bs.dmg, pierce: 1, life: 1.2, color: w.def.color, hit: new Set(), art: w.def.art, tint: w.def.tint,
          });
          p.atkT = Math.max(p.atkT, 0.1);
          sfx('shot', 0.05);
        }
      }
      w.timer -= dt;
      if (w.timer > 0) continue;
      w.timer = s.cd * st.haste;
      this.fire(w, s);
    }
  }

  fire(w, s) {
    const p = this.player;
    const st = this.stats;
    const color = w.def.color;
    if (w.def.kind !== 'aura') {
      // pose de lanzar ki mirando hacia el objetivo
      p.atkDur = w.def.kind === 'beam' ? Math.max(0.25, Math.min(s.dur || 0.3, 0.6)) : 0.25;
      p.atkT = p.atkDur;
      p.atkAng = this.aimAngle(true);
    }
    const art = w.def.art;
    const tint = w.def.tint;
    switch (w.def.kind) {
      case 'projectile': {
        const n = s.count + st.amount;
        const targets = this.nearestEnemies(n, 300);
        for (let i = 0; i < n; i++) {
          const t = targets[i % Math.max(1, targets.length)];
          let a = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.dirY, p.dirX) + (i - (n - 1) / 2) * 0.3;
          if (t && i >= targets.length) a += rand(-0.3, 0.3);
          this.projs.push({
            kind: 'ki', x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size * st.area, dmg: s.dmg, pierce: s.pierce, life: 1.4, color, hit: new Set(), art, tint,
          });
        }
        sfx('shot');
        break;
      }
      case 'wave': {
        const n = s.count + st.amount;
        const base = this.aimAngle(true);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.28;
          this.projs.push({
            kind: 'wave', x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size * st.area, dmg: s.dmg, pierce: s.pierce, life: 1.6, color, hit: new Set(), ang: a, art, tint,
          });
        }
        sfx('shot');
        break;
      }
      case 'beam': {
        const base = this.aimAngle(!!s.aim);
        const angles = [base];
        if (s.dual) angles.push(base + Math.PI);
        for (let i = 0; i < st.amount; i++) angles.push(base + (i % 2 ? -1 : 1) * 0.35 * (1 + (i >> 1)));
        for (const a of angles) {
          this.beams.push({
            ang: a, len: s.len * st.area, width: s.width * st.area, dur: s.dur, t: 0, dmg: s.dmg,
            color, once: !!s.once, art, tint, hit: new Set(), tick: 0,
          });
        }
        sfx('beam', 0.2);
        break;
      }
      case 'disc': {
        const n = s.count + st.amount;
        const base = this.aimAngle(true);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.5;
          this.projs.push({
            kind: 'disc', x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: 7 * st.area, dmg: s.dmg, speed: s.speed, dist: 0, range: s.range * st.area, back: false,
            life: 5, color, hits: new Map(), spin: 0,
          });
        }
        sfx('slash');
        break;
      }
      case 'flash': {
        const R = s.radius * st.area;
        this.effects.push({ kind: 'flash', x: p.x, y: p.y, t: 0, dur: 0.5, r: R, color, art, tint });
        this.flashScreen = Math.max(this.flashScreen, 0.25);
        this.grid.query(p.x, p.y, R, this.tmp);
        for (const e of this.tmp) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < R) {
            e.stun = Math.max(e.stun, e.boss ? s.stun * 0.3 : s.stun);
            this.hit(e, s.dmg, p.x, p.y, 0);
          }
        }
        sfx('pickup');
        break;
      }
      case 'aura': {
        const R = s.radius * st.area;
        this.grid.query(p.x, p.y, R + 20, this.tmp);
        for (const e of this.tmp) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < R + e.r) this.hit(e, s.dmg, p.x, p.y, 30, true);
        }
        break;
      }
      case 'ring': {
        this.effects.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.45, r: 0, maxR: s.maxR * st.area, dmg: s.dmg, color, hit: new Set(), art, tint });
        sfx('boom', 0.2);
        break;
      }
      case 'bomb': {
        const n = (s.count || 1) + (s.count ? st.amount : 0);
        const targets = this.nearestEnemies(n, 320);
        for (let i = 0; i < n; i++) {
          const t = targets[i % Math.max(1, targets.length)];
          const a = t ? Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? rand(-0.4, 0.4) : 0) : this.aimAngle(false) + (i - (n - 1) / 2) * 0.4;
          this.projs.push({
            kind: 'bomb', x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
            r: s.size * st.area, dmg: s.dmg, blast: s.blast * st.area, life: 3.5, color, grow: 0, art, tint,
          });
        }
        sfx('beam', 0.2);
        break;
      }
      case 'barrage': {
        w.burst = s.shots + st.amount * 3;
        w.burstT = 0;
        w.burstS = s;
        break;
      }
      case 'hellzone': {
        // bolas de ki rodean al enemigo y se cierran sobre él a la vez
        const targets = this.nearestEnemies(s.targets || 1, 260);
        const n = s.count + st.amount * 2;
        for (const tg of targets) {
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            const R = s.radius * st.area;
            this.projs.push({
              kind: 'hz', x: tg.x + Math.cos(a) * R, y: tg.y + Math.sin(a) * R, ox: Math.cos(a) * R, oy: Math.sin(a) * R, tg,
              cx: tg.x, cy: tg.y, t: 0, delay: 0.55 + i * 0.015, vx: 0, vy: 0, r: 4, dmg: s.dmg, blast: s.blast * st.area,
              life: 3, color, art, tint,
            });
          }
        }
        if (targets.length) sfx('capsule', 0.2);
        break;
      }
      case 'rain': {
        // bolas de fuego caen del cielo sobre enemigos al azar
        const n = s.count + st.amount * 2;
        const near = this.enemies.filter((e) => !e.dead && !e.pod && Math.abs(e.x - p.x) < 240 && Math.abs(e.y - p.y) < 160);
        for (let i = 0; i < n; i++) {
          const tg = near.length ? near[(Math.random() * near.length) | 0] : null;
          const x = tg ? tg.x + rand(-8, 8) : p.x + rand(-160, 160);
          const y = tg ? tg.y + rand(-8, 8) : p.y + rand(-110, 110);
          this.prains.push({ x, y, t: 0, warn: 0.42 + i * 0.07, blast: s.blast * st.area, dmg: s.dmg, color, art, tint });
        }
        break;
      }
      case 'blink': {
        // teletransportación: golpes instantáneos a varios enemigos
        const n = s.count + st.amount;
        const cand = this.enemies.filter((e) => !e.dead && !e.pod && Math.hypot(e.x - p.x, e.y - p.y) < s.range * st.area);
        for (let i = 0; i < n && cand.length; i++) {
          const e = cand.splice((Math.random() * cand.length) | 0, 1)[0];
          this.effects.push({ kind: 'impact', x: e.x, y: e.y - 12, t: 0, dur: 0.28, art, tint, rot: Math.random() * TAU });
          this.hit(e, s.dmg, p.x, p.y, 120);
        }
        this.effects.push({ kind: 'flash', x: p.x, y: p.y, t: 0, dur: 0.2, r: 18, color: '#ffffff' });
        sfx('slash');
        break;
      }
      case 'homing': {
        // Fantasmas kamikaze: salen en abanico y persiguen al enemigo más cercano
        const n = s.count + st.amount;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rand(-0.3, 0.3);
          this.projs.push({
            kind: 'ghost', x: p.x, y: p.y - 4, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, speed: s.speed * rand(0.9, 1.1),
            r: 6, dmg: s.dmg, blast: s.blast * st.area, life: 5, color, art, tint, target: null, retarget: 0, wob: Math.random() * TAU,
          });
        }
        sfx('capsule', 0.2);
        break;
      }
      case 'slash': {
        const base = this.player.face > 0 ? 0 : Math.PI;
        const dirs = [Math.atan2(p.dirY, p.dirX) || base];
        if (s.back) dirs.push(dirs[0] + Math.PI);
        const R = s.range * st.area;
        for (const a of dirs) {
          this.effects.push({ kind: 'slash', x: p.x, y: p.y, t: 0, dur: 0.2, r: R, ang: a, arc: s.arc, color, art, tint });
          this.grid.query(p.x, p.y, R + 20, this.tmp);
          for (const e of this.tmp) {
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < R + e.r && angleDiff(Math.atan2(e.y - p.y, e.x - p.x), a) < s.arc / 2) {
              this.hit(e, s.dmg, p.x, p.y, 120);
            }
          }
        }
        sfx('slash');
        break;
      }
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (const pr of this.projs) {
      pr.life -= dt;
      if (pr.kind === 'disc') {
        pr.spin += dt * 20;
        if (!pr.back) {
          pr.dist += pr.speed * dt;
          if (pr.dist >= pr.range) pr.back = true;
        } else {
          const a = Math.atan2(p.y - pr.y, p.x - pr.x);
          pr.vx = Math.cos(a) * pr.speed * 1.2;
          pr.vy = Math.sin(a) * pr.speed * 1.2;
          if (Math.hypot(p.x - pr.x, p.y - pr.y) < 10) pr.life = 0;
        }
      }
      if (pr.kind === 'bomb') pr.grow = Math.min(1, pr.grow + dt * 2);
      if (pr.kind === 'hz') {
        pr.t += dt;
        if (pr.tg && !pr.tg.dead) {
          pr.cx = pr.tg.x;
          pr.cy = pr.tg.y;
        }
        if (pr.t < pr.delay) {
          pr.x = pr.cx + pr.ox;
          pr.y = pr.cy + pr.oy + Math.sin(pr.t * 12) * 1.5;
          continue;
        }
        const dx = pr.cx - pr.x;
        const dy = pr.cy - pr.y;
        const d = Math.hypot(dx, dy);
        if (d < 7) {
          this.explode(pr);
          pr.life = 0;
          continue;
        }
        pr.x += (dx / d) * Math.min(d, 320 * dt);
        pr.y += (dy / d) * Math.min(d, 320 * dt);
        continue;
      }
      if (pr.kind === 'ghost') {
        pr.retarget -= dt;
        if (!pr.target || pr.target.dead || pr.retarget <= 0) {
          pr.target = this.nearestEnemiesFrom(pr.x, pr.y, 1, 260)[0] || null;
          pr.retarget = 0.4;
        }
        pr.wob += dt * 6;
        const tx = pr.target ? pr.target.x : pr.x + pr.vx;
        const ty = pr.target ? pr.target.y : pr.y + pr.vy;
        const a = Math.atan2(ty - pr.y, tx - pr.x) + Math.sin(pr.wob) * 0.35;
        const k = Math.min(1, dt * 4);
        pr.vx += (Math.cos(a) * pr.speed - pr.vx) * k;
        pr.vy += (Math.sin(a) * pr.speed - pr.vy) * k;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.life <= 0) {
        if (pr.kind === 'bomb' || pr.kind === 'ghost') this.explode(pr);
        continue;
      }
      this.grid.query(pr.x, pr.y, pr.r + 24, this.tmp);
      for (const e of this.tmp) {
        if (e.dead) continue;
        if (Math.hypot(e.x - pr.x, e.y - pr.y) > e.r + pr.r) continue;
        if (pr.kind === 'bomb' || pr.kind === 'ghost') {
          this.explode(pr);
          pr.life = 0;
          break;
        }
        if (pr.kind === 'disc') {
          const last = pr.hits.get(e.id) || 0;
          if (this.t - last < 0.35) continue;
          pr.hits.set(e.id, this.t);
          this.hit(e, pr.dmg, pr.x, pr.y, 60);
          continue;
        }
        if (pr.hit.has(e.id)) continue;
        pr.hit.add(e.id);
        this.hit(e, pr.dmg, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, 80);
        pr.pierce--;
        if (pr.pierce <= 0) {
          pr.life = 0;
          this.spark(pr.x, pr.y, pr.color, 4);
          break;
        }
      }
    }
    this.projs = this.projs.filter((x) => x.life > 0);
    for (const r of this.prains) {
      r.t += dt;
      if (r.t >= r.warn && !r.done) {
        r.done = true;
        this.explode({ x: r.x, y: r.y, blast: r.blast, dmg: r.dmg, color: r.color, kind: 'meteor' });
      }
    }
    this.prains = this.prains.filter((r) => !r.done);

    for (const b of this.beams) {
      b.t += dt;
      b.tick -= dt;
      if (b.tick > 0) continue;
      b.tick = 0.1;
      const x1 = p.x + Math.cos(b.ang) * 6;
      const y1 = p.y - 4 + Math.sin(b.ang) * 6;
      const x2 = x1 + Math.cos(b.ang) * b.len;
      const y2 = y1 + Math.sin(b.ang) * b.len;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      this.grid.query(mx, my, b.len / 2 + 30, this.tmp);
      for (const e of this.tmp) {
        if (e.dead) continue;
        if (b.once && b.hit.has(e.id)) continue;
        if (distToSegment(e.x, e.y, x1, y1, x2, y2) < b.width / 2 + e.r) {
          if (b.once) b.hit.add(e.id);
          this.hit(e, b.dmg, p.x, p.y, 40, !b.once);
        }
      }
    }
    this.beams = this.beams.filter((b) => b.t < b.dur);
  }

  explode(pr) {
    this.effects.push({ kind: 'boom', x: pr.x, y: pr.y, t: 0, dur: 0.5, r: pr.blast, color: pr.color, big: pr.kind === 'bomb' && pr.blast > 60 });
    if (pr.blast > 34) this.shake = Math.max(this.shake, 0.3);
    sfx('boom', 0.1);
    this.grid.query(pr.x, pr.y, pr.blast + 20, this.tmp);
    for (const e of this.tmp) {
      if (Math.hypot(e.x - pr.x, e.y - pr.y) < pr.blast + e.r) this.hit(e, pr.dmg, pr.x, pr.y, 200);
    }
  }

  hit(e, base, fx, fy, knock, quiet = false) {
    if (e.dead || e.vanish) return;
    const crit = Math.random() < this.stats.crit;
    const dmg = base * this.stats.might * (crit ? 2 : 1) * rand(0.9, 1.1);
    e.hp -= dmg;
    e.flash = 0.08;
    if (knock && !e.boss && !e.pod) {
      const a = Math.atan2(e.y - fy, e.x - fx);
      const k = knock / (e.elite || e.def.tank ? 4 : 1);
      e.vx += Math.cos(a) * k;
      e.vy += Math.sin(a) * k;
    }
    if (!quiet || crit || Math.random() < 0.25) {
      if (this.texts.length < 70) {
        this.texts.push({ x: e.x + rand(-4, 4), y: e.y - e.r * 2, v: Math.round(dmg), t: 0, crit });
      }
    }
    if (!quiet) {
      sfx('hit', 0.05);
      if (this.effects.length < 120) this.effects.push({ kind: 'hitfx', x: e.x + rand(-3, 3), y: e.y - 20, t: 0, dur: 0.15 });
    }
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.dead = true;
    if (e.pod) return this.podLoot(e);
    this.kills++;
    if (!e.boss && this.corpses.length < 60) {
      const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
      this.corpses.push({ sprite: e.sprite, mode: e.mode, x: e.x, y: e.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 90, t: 0, dur: 0.38, flip: e.face < 0, spin: (Math.random() < 0.5 ? -1 : 1) * rand(6, 12) });
    }
    this.gainKi(e.boss ? 25 : e.elite ? 5 : 0.12);
    // Cristales de Ki para invocar: a veces los suelta cualquier enemigo
    if (Math.random() < 1 / 300) this.pickups.push({ type: 'crystal', x: e.x, y: e.y, value: 1 + ((Math.random() * 3) | 0) });
    this.spark(e.x, e.y, e.boss ? e.def.color : '#ffffff', e.boss ? 30 : 5);
    this.dropXp(e.x, e.y, e.xp);
    if (Math.random() < 0.03) this.pickups.push({ type: 'zeni', x: e.x + rand(-4, 4), y: e.y, value: 1 + ((Math.random() * 3) | 0) });
    if (Math.random() < 0.0012) this.pickups.push({ type: 'senzu', x: e.x, y: e.y });
    if (e.elite) {
      this.pickups.push({ type: 'capsule', x: e.x, y: e.y });
      this.pickups.push({ type: 'crystal', x: e.x + 8, y: e.y + 4, value: 3 });
      sfx('boom', 0.1);
    }
    if (e.boss) {
      this.bossKills++;
      this.bossesBeaten.push(e.type);
      this.coins += 40;
      // Vínculo para fusionar técnicas, objeto para la partida, cristales y ticket de invocación
      this.bonds++;
      this.pendingBond = true;
      this.pickups.push({ type: 'itembox', x: e.x, y: e.y - 14 });
      this.pickups.push({ type: 'crystal', x: e.x - 14, y: e.y + 6, value: 10 });
      this.pickups.push({ type: this.bossKills >= 5 ? 'ticket10' : 'ticket', x: e.x + 14, y: e.y + 6 });
      this.shake = 0.8;
      sfx('boom', 0);
      this.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, dur: 0.9, r: 90, color: e.def.color, fx: 'ki' });
      this.pickups.push({ type: 'capsule', x: e.x + 10, y: e.y });
      this.pickups.push({ type: 'senzu', x: e.x - 10, y: e.y });
      const onMap = this.pickups.filter((k) => k.type === 'dragonball').length;
      if (this.dballs + onMap < 7) this.pickups.push({ type: 'dragonball', x: e.x, y: e.y + 12, stars: this.dballs + onMap + 1 });
      if (this.boss === e) {
        this.boss = null;
        // explosiones encadenadas y paso de fase
        for (let i = 0; i < 6; i++) {
          this.effects.push({ kind: 'boom', x: e.x + rand(-30, 30), y: e.y + rand(-30, 20), t: -i * 0.12, dur: 0.6, r: 40 + i * 6, big: true });
        }
        this.clearPhase();
      }
    }
  }

  podLoot(e) {
    this.podsBroken++;
    sfx('capsule', 0.1);
    this.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, dur: 0.4, r: 14 });
    const r = Math.random();
    if (r < 0.4) this.pickups.push({ type: 'buff', x: e.x, y: e.y, buff: pick(['fury', 'speed', 'haste', 'magnet']) });
    else if (r < 0.58) this.pickups.push({ type: 'senzu', x: e.x, y: e.y });
    else if (r < 0.72) this.pickups.push({ type: 'crystal', x: e.x, y: e.y, value: 3 + ((Math.random() * 4) | 0) });
    else {
      for (let i = 0; i < 4; i++) this.pickups.push({ type: 'zeni', x: e.x + rand(-8, 8), y: e.y + rand(-6, 6), value: 2 + ((Math.random() * 3) | 0) });
    }
    this.dropXp(e.x, e.y, 6);
  }

  dropXp(x, y, value) {
    const gems = this.pickups.length;
    if (gems > 420) {
      // Fusionar con una gema cercana para no saturar.
      const g = this.pickups.find((k) => k.type === 'xp' && Math.abs(k.x - x) < 120 && Math.abs(k.y - y) < 120);
      if (g) {
        g.value += value;
        return;
      }
    }
    this.pickups.push({ type: 'xp', x: x + rand(-3, 3), y: y + rand(-3, 3), value });
  }

  // -------------------------------------------------------------------------
  // Enemigos
  // -------------------------------------------------------------------------
  updateEnemies(dt) {
    const p = this.player;
    const farR = Math.hypot(this.W, this.H) / 2 + 160;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.atkT > 0) e.atkT -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      if (e.pod) {
        if (d > farR * 1.6) e.dead = true;
        continue;
      }
      if (e.boss && d > farR * 1.15 && e.ai.mode === 'walk') {
        // el jefe no se queda atrás: reaparece cerca de ti
        e.x = p.x - (dx / d) * (farR * 0.6);
        e.y = p.y - (dy / d) * (farR * 0.6);
        this.effects.push({ kind: 'flash', x: e.x, y: e.y, t: 0, dur: 0.3, r: 22, color: e.def.color });
        continue;
      }
      if (!e.boss && d > farR) {
        // Reaparece al otro lado (como en Vampire Survivors).
        e.x = p.x + dx * 0.9;
        e.y = p.y + dy * 0.9;
        continue;
      }
      // Embestida: se para, parpadea y se lanza en línea recta
      const ch = e.def.charge;
      if (ch && e.stun <= 0) {
        e.chargeCd -= dt;
        if (e.windT > 0) {
          e.windT -= dt;
          e.flash = Math.floor(e.windT * 14) % 2 ? 0.05 : 0;
          e.atkT = 0.1;
          if (e.windT <= 0) e.chargeT = ch.dur;
          continue;
        }
        if (e.chargeT > 0) {
          e.chargeT -= dt;
          e.x += e.cdx * ch.speed * dt;
          e.y += e.cdy * ch.speed * dt;
          e.walkT += dt;
          if (Math.random() < 0.4) this.particles.push({ x: e.x, y: e.y - 8, vx: 0, vy: 0, t: 0, dur: 0.25, color: '#ffffff', s: 2 });
          if (d < e.r + p.r && p.inv <= 0) this.hurt(e.dmg * 1.3);
          if (e.chargeT <= 0) e.chargeCd = rand(2.5, 4);
          continue;
        }
        if (e.chargeCd <= 0 && d < ch.range) {
          e.windT = ch.wind;
          e.cdx = dx / d;
          e.cdy = dy / d;
          e.face = dx > 0 ? 1 : -1;
          continue;
        }
      }
      // Saibaman kamikaze: se para, avisa con un círculo y explota
      const bomb = e.def.bomb;
      if (bomb && (e.arm > 0 || (d < bomb.range && e.stun <= 0))) {
        if (e.arm <= 0) e.arm = bomb.fuse;
        e.arm -= dt;
        e.flash = Math.floor(e.arm * 12) % 2 ? 0.05 : 0;
        if (e.arm <= 0) {
          e.dead = true;
          this.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, dur: 0.5, r: bomb.radius });
          sfx('boom', 0.1);
          if (Math.hypot(p.x - e.x, p.y - e.y) < bomb.radius + p.r && p.inv <= 0) this.hurt(bomb.dmg * (1 + this.t / 600));
          this.dropXp(e.x, e.y, e.xp);
        }
        continue;
      }

      let mvx = 0;
      let mvy = 0;
      if (e.stun > 0) {
        e.stun -= dt;
      } else if (e.boss) {
        const v = this.bossAI(e, dt, dx, dy, d);
        mvx = v.x;
        mvy = v.y;
      } else if (e.elite && d < 200 && (e.shot -= dt) <= 0) {
        // Las élites lanzan una ráfaga de tres bolas de ki
        e.shot = rand(4, 6);
        e.atkT = 0.45;
        const a0 = Math.atan2(dy, dx);
        for (const da of [-0.25, 0, 0.25]) {
          this.eprojs.push({ x: e.x, y: e.y - 12, vx: Math.cos(a0 + da) * 125, vy: Math.sin(a0 + da) * 125, r: 4, dmg: e.dmg * 0.45, life: 3, fx: 'ki', ang: a0 + da });
        }
        sfx('shot', 0.1);
      } else if (e.def.ranged && d < e.def.ranged.range) {
        // Enemigo a distancia: se queda quieto y dispara.
        const rg = e.def.ranged;
        e.dir = dirFrom(dx, dy, e.dir);
        e.shot -= dt;
        if (e.shot <= 0 && this.minionShots < 8) {
          this.minionShots++;
          e.shot = rg.cd * rand(0.8, 1.2);
          e.atkT = 0.35;
          const a = Math.atan2(dy, dx);
          this.eprojs.push({
            x: e.x, y: e.y - 10, vx: Math.cos(a) * rg.speed, vy: Math.sin(a) * rg.speed, r: 3,
            dmg: rg.dmg * (1 + this.t / 900), life: 3, fx: rg.fx, ang: a, minion: true,
          });
        }
        mvx = (dx / d) * e.speed * 0.15;
        mvy = (dy / d) * e.speed * 0.15;
      } else {
        mvx = (dx / d) * e.speed;
        mvy = (dy / d) * e.speed;
      }

      // Separación suave
      if (!e.boss) {
        this.grid.query(e.x, e.y, 12, this.tmp);
        let n = 0;
        for (const o of this.tmp) {
          if (o === e || n > 4) continue;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const od = Math.hypot(ox, oy);
          const min = e.r + o.r;
          if (od > 0 && od < min) {
            const push = ((min - od) / min) * 60;
            mvx += (ox / od) * push;
            mvy += (oy / od) * push;
            n++;
          }
        }
      }

      e.x += (mvx + e.vx) * dt;
      e.y += (mvy + e.vy) * dt;
      e.vx *= Math.pow(0.0005, dt);
      e.vy *= Math.pow(0.0005, dt);
      if (Math.abs(mvx) > 1) e.face = mvx > 0 ? 1 : -1;
      if (!e.def.ranged || d >= e.def.ranged.range) e.dir = dirFrom(mvx, mvy, e.dir);
      e.walkT += dt;

      // Contacto con el jugador
      if (!e.vanish && d < e.r + p.r && p.inv <= 0) this.hurt(e.dmg);
    }
  }

  // IA de los jefes: caminan hacia ti y cada pocos segundos usan uno de sus ataques (def.moves).
  // Con menos de la mitad de vida atacan más a menudo.
  bossAI(e, dt, dx, dy, d) {
    const ai = e.ai;
    const rage = e.hp < e.maxHp * 0.5;
    ai.t -= dt * (rage && ai.mode === 'walk' ? 1.4 : 1);
    const toward = (k) => ({ x: (dx / d) * e.speed * k, y: (dy / d) * e.speed * k });
    switch (ai.mode) {
      case 'walk':
        if (ai.t <= 0) this.bossChoose(e, dx, dy, d);
        return toward(1);
      case 'windup':
        e.flash = 0.05;
        if (ai.t <= 0) {
          ai.mode = 'dash';
          ai.t = 0.55;
        }
        return { x: 0, y: 0 };
      case 'dash':
        if (ai.t <= 0) this.bossRest(e);
        if (Math.random() < 0.5) this.particles.push({ x: e.x, y: e.y - 10, vx: 0, vy: 0, t: 0, dur: 0.3, color: e.def.color, s: 3 });
        return { x: ai.wx * e.speed * 5, y: ai.wy * e.speed * 5 };
      case 'aim':
        if (ai.t <= 0) {
          ai.shots--;
          ai.t = ai.iv;
          e.atkT = 0.25;
          const a = Math.atan2(dy, dx) + rand(-ai.spread, ai.spread);
          this.eprojs.push({ x: e.x, y: e.y - 12, vx: Math.cos(a) * ai.sp, vy: Math.sin(a) * ai.sp, r: 5, dmg: e.dmg * 0.6, life: 4, color: e.def.color, fx: 'ki', ang: a });
          sfx('shot', 0.05);
          if (ai.shots <= 0) this.bossRest(e);
        }
        return toward(0.25);
      case 'spiral':
        ai.dur -= dt;
        e.atkT = 0.2;
        if (ai.t <= 0) {
          ai.t = 0.075;
          ai.ang += 0.42;
          for (let k = 0; k < ai.arms; k++) {
            const a = ai.ang + (k / ai.arms) * TAU;
            this.eprojs.push({ x: e.x, y: e.y - 12, vx: Math.cos(a) * 105, vy: Math.sin(a) * 105, r: 4, dmg: e.dmg * 0.5, life: 4, color: e.def.color, fx: 'ki', ang: a });
          }
        }
        if (ai.dur <= 0) this.bossRest(e);
        return { x: 0, y: 0 };
      case 'teleport':
        // desaparece y reaparece a tu espalda para embestir
        if (ai.t <= 0) {
          const p = this.player;
          const a = Math.atan2(p.dirY, p.dirX) + Math.PI + rand(-0.5, 0.5);
          e.x = p.x + Math.cos(a) * 52;
          e.y = p.y + Math.sin(a) * 52;
          e.vanish = false;
          this.effects.push({ kind: 'flash', x: e.x, y: e.y, t: 0, dur: 0.3, r: 24, color: '#ffffff' });
          sfx('slash');
          ai.mode = 'windup';
          ai.t = 0.4;
          const dd = Math.hypot(p.x - e.x, p.y - e.y) || 1;
          ai.wx = (p.x - e.x) / dd;
          ai.wy = (p.y - e.y) / dd;
        }
        return { x: 0, y: 0 };
      default: // 'cast': quieto mientras lanza (rayo, lluvia, refuerzos...)
        if (ai.t <= 0) this.bossRest(e);
        return { x: 0, y: 0 };
    }
  }

  bossChoose(e, dx, dy, d) {
    const ai = e.ai;
    const moves = e.def.moves;
    let m = pick(moves);
    if (m === ai.last && moves.length > 1) m = pick(moves.filter((x) => x !== ai.last));
    ai.last = m;
    const lp = this.phase + this.loop * 4; // más balas en las fases avanzadas
    e.atkT = 0.45;
    switch (m) {
      case 'dash':
        ai.mode = 'windup';
        ai.t = 0.6;
        ai.wx = dx / d;
        ai.wy = dy / d;
        e.atkT = 0;
        break;
      case 'ring':
        this.bossRing(e, 12 + Math.min(14, lp));
        this.bossRest(e, 0.4);
        break;
      case 'aim':
        Object.assign(ai, { mode: 'aim', shots: 3 + Math.min(4, lp >> 1), t: 0.25, iv: 0.2, spread: 0.06, sp: 150 });
        break;
      case 'barrage':
        Object.assign(ai, { mode: 'aim', shots: 10 + Math.min(12, lp), t: 0.3, iv: 0.08, spread: 0.22, sp: 170 });
        break;
      case 'beam':
        ai.mode = 'cast';
        ai.t = 1.4;
        this.ebeams.push({ x: e.x, y: e.y, ang: Math.atan2(dy, dx), len: 420, w: 26, t: 0, warn: 0.85, dur: 1.3, dmg: e.dmg * 1.1, hit: false, color: e.def.color, src: e });
        break;
      case 'spiral':
        Object.assign(ai, { mode: 'spiral', t: 0.3, dur: 2.2, ang: Math.random() * TAU, arms: lp > 6 ? 3 : 2 });
        break;
      case 'rain':
        ai.mode = 'cast';
        ai.t = 1.3;
        this.bossRain(e, 5 + Math.min(8, lp >> 1));
        break;
      case 'minions':
        ai.mode = 'cast';
        ai.t = 0.8;
        this.bossSummon(e, lp);
        break;
      case 'disc': {
        ai.mode = 'cast';
        ai.t = 0.8;
        const n = 2 + (lp > 8 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const a = Math.atan2(dy, dx) + (i - (n - 1) / 2) * 0.9;
          this.eprojs.push({ x: e.x, y: e.y - 12, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 6, dmg: e.dmg * 0.8, life: 4.5, color: e.def.color, fx: 'disc', homing: 2.2, sp: 125, spin: 0 });
        }
        sfx('slash');
        break;
      }
      case 'bigball': {
        ai.mode = 'cast';
        ai.t = 1.1;
        const a = Math.atan2(dy, dx);
        this.eprojs.push({ x: e.x, y: e.y - 30, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, r: 14, dmg: e.dmg * 1.5, life: 7, color: e.def.color, fx: 'big', homing: 0.7, sp: 58, blast: 46 });
        sfx('beam', 0.1);
        break;
      }
      case 'teleport':
        ai.mode = 'teleport';
        ai.t = 0.35;
        e.vanish = true;
        e.atkT = 0;
        this.effects.push({ kind: 'flash', x: e.x, y: e.y, t: 0, dur: 0.3, r: 20, color: '#ffffff' });
        break;
    }
  }

  bossRest(e, extra = 0) {
    e.ai.mode = 'walk';
    e.ai.t = rand(1.5, 2.4) + extra;
    e.vanish = false;
  }

  bossRing(e, n = 14) {
    const off = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      this.eprojs.push({ x: e.x, y: e.y - 12 * e.scale, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, r: 5, dmg: e.dmg * 0.6, life: 4, color: e.def.color, fx: 'ki' });
    }
    sfx('boom', 0.2);
  }

  // Lluvia de ki: círculos de aviso en el suelo (uno justo debajo de ti) y, al segundo, caen las bolas
  bossRain(e, n) {
    const p = this.player;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const r = i === 0 ? 0 : rand(30, 120);
      this.rains.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, t: 0, warn: 1 + i * 0.07, r: 30, dmg: e.dmg * 0.9 });
    }
    sfx('beam', 0.1);
  }

  bossSummon(e, lp) {
    const type = e.def.summon || pick(this.phaseDef.types);
    const n = 6 + Math.min(6, lp >> 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const m = this.spawnEnemy(type, e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 46);
      this.effects.push({ kind: 'flash', x: m.x, y: m.y, t: 0, dur: 0.35, r: 14, color: e.def.color });
    }
    this.ui.toast(`¡${e.def.name} llama refuerzos!`);
  }

  updateEnemyProjectiles(dt) {
    const p = this.player;
    for (const b of this.eprojs) {
      b.life -= dt;
      if (b.homing) {
        // discos y esferas que te persiguen
        const a = Math.atan2(p.y - b.y, p.x - b.x);
        const k = Math.min(1, dt * b.homing);
        b.vx += (Math.cos(a) * b.sp - b.vx) * k;
        b.vy += (Math.sin(a) * b.sp - b.vy) * k;
        if (b.spin !== undefined) b.spin += dt * 18;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) {
        if (b.fx === 'big') this.bigBallBoom(b);
        else if (p.inv <= 0) this.hurt(b.dmg);
        b.life = 0;
      } else if (b.fx === 'big' && b.life <= 0) this.bigBallBoom(b);
    }
    this.eprojs = this.eprojs.filter((b) => b.life > 0);
    for (const r of this.rains) {
      r.t += dt;
      if (r.t >= r.warn && !r.done) {
        r.done = true;
        this.effects.push({ kind: 'boom', x: r.x, y: r.y, t: 0, dur: 0.45, r: r.r });
        if (Math.hypot(p.x - r.x, p.y - r.y) < r.r + p.r && p.inv <= 0) this.hurt(r.dmg);
        sfx('boom', 0.08);
      }
    }
    this.rains = this.rains.filter((r) => !r.done);
    for (const b of this.ebeams) {
      b.t += dt;
      if (b.src && !b.src.dead && b.t < b.warn) {
        b.x = b.src.x;
        b.y = b.src.y;
      }
      if (b.t >= b.warn && !b.hit && p.inv <= 0) {
        const x2 = b.x + Math.cos(b.ang) * b.len;
        const y2 = b.y + Math.sin(b.ang) * b.len;
        if (distToSegment(p.x, p.y, b.x, b.y, x2, y2) < b.w / 2 + p.r) {
          b.hit = true;
          this.hurt(b.dmg);
        }
      }
      if (b.t >= b.warn && !b.fired) {
        b.fired = true;
        sfx('beam', 0.1);
        this.shake = Math.max(this.shake, 0.25);
      }
    }
    this.ebeams = this.ebeams.filter((b) => b.t < b.dur && !(b.src && b.src.dead && b.t < b.warn));
    this.minionShots = 0;
    for (const b of this.eprojs) if (b.minion) this.minionShots++;
  }

  bigBallBoom(b) {
    const p = this.player;
    this.effects.push({ kind: 'boom', x: b.x, y: b.y, t: 0, dur: 0.6, r: b.blast, big: true });
    this.shake = Math.max(this.shake, 0.4);
    sfx('boom', 0);
    if (Math.hypot(p.x - b.x, p.y - b.y) < b.blast + p.r && p.inv <= 0) this.hurt(b.dmg);
  }

  hurt(amount) {
    const p = this.player;
    const dmg = Math.max(1, amount - this.stats.armor);
    p.hp -= dmg;
    p.inv = 0.45;
    p.hurtT = 0.3;
    this.gainKi(3);
    this.shake = Math.max(this.shake, 0.15);
    sfx('hurt', 0.1);
    if (p.hp <= 0) {
      if (this.revives > 0) {
        this.revives--;
        p.hp = p.maxHp * 0.6;
        p.inv = 2;
        this.flashScreen = 0.8;
        this.knockAll(p.x, p.y, 200, 400);
        this.ui.banner('¡REVIVES GRACIAS A SHENLONG!', '#7aff6a');
      } else {
        p.hp = 0;
        this.end(false);
      }
    }
  }

  heal(v, quiet) {
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + v);
    if (!quiet && p.hp - before >= 1) this.texts.push({ x: p.x, y: p.y - 24, v: '+' + Math.round(p.hp - before), t: 0, heal: true });
  }

  knockAll(x, y, R, force) {
    this.grid.query(x, y, R, this.tmp);
    for (const e of this.tmp) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < R && !e.boss) {
        e.vx += ((e.x - x) / (d || 1)) * force;
        e.vy += ((e.y - y) / (d || 1)) * force;
      }
    }
    this.eprojs = this.eprojs.filter((b) => Math.hypot(b.x - x, b.y - y) > R);
  }

  // -------------------------------------------------------------------------
  // Objetos
  // -------------------------------------------------------------------------
  updatePickups(dt) {
    const p = this.player;
    const mag = this.stats.magnet;
    // Las gemas que se quedan muy lejos se juntan en una gema roja cerca de ti (como en Vampire Survivors)
    this.gemSweep = (this.gemSweep || 0) - dt;
    if (this.gemSweep <= 0) {
      this.gemSweep = 1;
      const far = Math.hypot(this.W, this.H) / 2 + 120;
      let sum = 0;
      for (const k of this.pickups) {
        if (k.type === 'xp' && !k.pull && Math.hypot(k.x - p.x, k.y - p.y) > far) {
          sum += k.value;
          k.taken = true;
        }
      }
      if (sum) {
        this.pickups = this.pickups.filter((k) => !k.taken);
        let big = this.pickups.find((k) => k.big && Math.hypot(k.x - p.x, k.y - p.y) < far);
        if (!big) {
          const a = Math.random() * TAU;
          big = { type: 'xp', big: true, x: p.x + Math.cos(a) * 110, y: p.y + Math.sin(a) * 80, value: 0 };
          this.pickups.push(big);
        }
        big.value += sum;
      }
    }
    for (const k of this.pickups) {
      const dx = p.x - k.x;
      const dy = p.y - k.y;
      const d = Math.hypot(dx, dy);
      const radius = k.type === 'dragonball' || k.type === 'itembox' || k.type === 'buff' ? mag * 0.6 : mag;
      if (k.pull || d < radius) {
        k.pull = true;
        k.sp = Math.min(500, (k.sp || 60) + 900 * dt);
        k.x += (dx / (d || 1)) * k.sp * dt;
        k.y += (dy / (d || 1)) * k.sp * dt;
      }
      if (d < p.r + 5) {
        k.taken = true;
        this.collect(k);
      }
    }
    this.pickups = this.pickups.filter((k) => !k.taken);
  }

  collect(k) {
    switch (k.type) {
      case 'xp':
        this.gainXp(k.value);
        sfx('pickup', 0.03);
        break;
      case 'zeni':
        this.coins += k.value;
        sfx('pickup', 0.03);
        break;
      case 'senzu':
        this.heal(this.player.maxHp * 0.5);
        this.ui.toast('¡Semilla del Ermitaño! Recuperas vida');
        sfx('level');
        break;
      case 'capsule': {
        const ups = this.weapons.filter((w) => w.level < w.def.levels.length);
        if (ups.length) {
          const w = pick(ups);
          w.level++;
          if (w.def.kind === 'orbit') this.rebuildOrbs();
          this.ui.toast(`Cápsula Corp: ${w.def.name} sube a nivel ${w.level}`);
        } else {
          this.coins += 30;
          this.ui.toast('Cápsula Corp: +30 Zeni');
        }
        sfx('level');
        break;
      }
      case 'itembox': {
        // Objeto para esta partida: te quedas el que llevas o lo cambias (y queda desbloqueado para siempre)
        const owned = new Set([...(this.save.items || []), ...this.itemsFound]);
        const ids = Object.keys(ITEMS).filter((id) => id !== this.itemId);
        const fresh = ids.filter((id) => !owned.has(id));
        const id = pick(fresh.length && Math.random() < 0.7 ? fresh : ids);
        if (!owned.has(id)) this.itemsFound.push(id);
        sfx('dragonball');
        this.state = 'item';
        this.ui.showItemChoice(this.itemId, id, this);
        break;
      }
      case 'crystal':
        this.crystals += k.value;
        sfx('coin', 0.05);
        if (k.value >= 3) this.ui.toast(`+${k.value} Cristales de Ki`);
        break;
      case 'ticket':
      case 'ticket10':
        if (k.type === 'ticket') this.tickets++;
        else this.ticket10++;
        sfx('dragonball');
        this.ui.toast(k.type === 'ticket' ? '¡Ticket de invocación!' : '¡Ticket de invocación x10!');
        break;
      case 'buff': {
        const names = { fury: '¡Furia Saiyajin! +50% de daño', speed: '¡Nube Kinton! +35% de velocidad', haste: '¡Concentración! Recarga mucho más rápida', magnet: '¡Radar! Atraes todas las esferas de ki' };
        if (k.buff === 'magnet') {
          for (const q of this.pickups) if (q.type === 'xp' || q.type === 'zeni') q.pull = true;
        } else {
          this.buffs[k.buff] = 20;
          this.recalc();
        }
        this.ui.banner(names[k.buff], BUFF_COLORS[k.buff]);
        sfx('level');
        break;
      }
      case 'dragonball':
        this.dballs++;
        sfx('dragonball');
        this.ui.toast(`¡Bola de Dragón de ${this.dballs} ${this.dballs === 1 ? 'estrella' : 'estrellas'}! (${this.dballs}/7)`);
        if (this.dballs >= 7) {
          this.dballs = 0;
          this.state = 'wish';
          this.ui.showWish(this.wishOptions(), this);
        }
        break;
    }
  }

  takeItem(id) {
    if (id && id !== this.itemId) {
      const before = this.mod('revive');
      this.item = ITEMS[id];
      this.itemId = id;
      this.revives = Math.max(0, this.revives + this.mod('revive') - before);
      this.recalc();
      this.rebuildOrbs();
      this.ui.banner('¡' + ITEMS[id].name.toUpperCase() + '!', '#d07aff');
    }
    this.state = 'play';
    this.ui.hideModal();
  }

  gainXp(v) {
    this.xp += v * this.stats.growth;
    while (this.xp >= this.nextXp) {
      this.xp -= this.nextXp;
      this.level++;
      this.nextXp = this.xpFor(this.level);
      this.pendingLevels++;
    }
  }

  wishOptions() {
    const all = [
      { id: 'power', name: 'Ser el guerrero más fuerte', desc: '+30% de daño durante el resto de la partida.' },
      { id: 'life', name: 'Un cuerpo invencible', desc: 'Recuperas toda la vida y +50 de vida máxima.' },
      { id: 'revive', name: 'Una segunda oportunidad', desc: 'Si caes, revives con el 60% de vida.' },
      { id: 'levels', name: 'Poder ilimitado', desc: 'Subes 3 niveles al instante.' },
      { id: 'zeni', name: 'Riquezas sin fin', desc: '+300 Zeni.' },
      { id: 'bond', name: 'Técnicas unidas', desc: 'Consigues un vínculo para fusionar dos ranuras de técnicas.' },
      { id: 'crystals', name: 'Un tesoro de ki', desc: '+60 Cristales de Ki para invocar.' },
    ];
    for (const o of all) o.w = Math.random();
    return all.sort((a, b) => a.w - b.w).slice(0, 3);
  }

  grantWish(o) {
    this.wishes++;
    switch (o.id) {
      case 'power':
        this.bonusMight *= 1.3;
        break;
      case 'life':
        this.extraHp = (this.extraHp || 0) + 50;
        break;
      case 'revive':
        this.revives++;
        break;
      case 'levels':
        for (let i = 0; i < 3; i++) this.gainXp((this.nextXp - this.xp) / this.stats.growth + 0.01);
        break;
      case 'zeni':
        this.coins += 300;
        break;
      case 'bond':
        this.bonds++;
        this.pendingBond = true;
        break;
      case 'crystals':
        this.crystals += 60;
        break;
    }
    this.recalc();
    if (o.id === 'life') this.player.hp = this.player.maxHp;
    this.state = 'play';
    this.ui.hideModal();
    this.ui.banner('¡TU DESEO HA SIDO CONCEDIDO!', '#7aff6a');
    this.checkTransform();
  }

  // -------------------------------------------------------------------------
  // Efectos
  // -------------------------------------------------------------------------
  spark(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(30, 110);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, dur: rand(0.2, 0.5), color, s: 2 });
    }
  }

  updateEffects(dt) {
    for (const f of this.effects) {
      f.t += dt;
      if (f.kind === 'ring') {
        f.r = (f.t / f.dur) * f.maxR;
        this.grid.query(f.x, f.y, f.r + 20, this.tmp);
        for (const e of this.tmp) {
          if (f.hit.has(e.id)) continue;
          if (Math.hypot(e.x - f.x, e.y - f.y) < f.r + e.r) {
            f.hit.add(e.id);
            this.hit(e, f.dmg, f.x, f.y, 140);
          }
        }
      }
    }
    this.effects = this.effects.filter((f) => f.t < f.dur);
    for (const q of this.particles) {
      q.t += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.92;
      q.vy *= 0.92;
    }
    this.particles = this.particles.filter((q) => q.t < q.dur);
    for (const c of this.corpses) {
      c.t += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= 0.9;
      c.vy *= 0.9;
    }
    this.corpses = this.corpses.filter((c) => c.t < c.dur);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    for (const tx of this.texts) tx.t += dt;
    this.texts = this.texts.filter((tx) => tx.t < 0.7);
  }

  end(win) {
    if (this.state === 'over') return;
    win = !!this.won;
    this.state = 'over';
    const zeni = Math.floor((this.coins + this.kills / 15 + this.t / 8 + this.bossKills * 30) * this.stats.greed);
    this.ui.showEnd({
      win, time: this.t, kills: this.kills, level: this.level, zeni, char: this.char,
      bosses: this.bossKills, bossesBeaten: this.bossesBeaten, wishes: this.wishes,
      evolutions: this.evolutions, maxForm: !!this.maxForm, itemsFound: this.itemsFound,
      crystals: this.crystals + Math.floor(this.t / 60) * 3 + this.bossKills * 5 + (win ? 40 : 0),
      tickets: this.tickets, ticket10: this.ticket10, bonds: this.bondsUsed, ults: this.ults, pods: this.podsBroken,
      phase: this.phaseNum, phasesCleared: this.phasesCleared, phaseName: this.phaseDef.name,
    });
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const { W, H } = this;
    const p = this.player;
    ctx.imageSmoothingEnabled = false;

    let sx = 0;
    let sy = 0;
    if (this.shake > 0) {
      sx = rand(-2, 2);
      sy = rand(-2, 2);
    }
    const camX = Math.round(p.x - W / 2 + sx);
    const camY = Math.round(p.y - H / 2 + sy);

    ctx.save();
    ctx.translate(-camX, -camY);

    // Suelo de la zona actual
    ctx.fillStyle = this.grounds[this.biome];
    ctx.fillRect(camX, camY, W, H);
    ctx.fillStyle = this.details[this.biome];
    ctx.fillRect(camX, camY, W, H);

    // Aura de ki (técnica): llamas de energía en círculo
    const auraW = this.activeSlot && this.activeSlot.ws.find((w) => w.def.kind === 'aura');
    if (auraW) this.drawFlameAura(ctx, p.x, p.y - 8, this.weaponStats(auraW).radius * this.stats.area, auraW.def.color);

    // Decorado plano (parches de tierra, arena...) y objetos del suelo
    const decor = this.visibleDecor(camX, camY);
    for (const o of decor.flat) {
      const im = graded('decor', o.key, DECOR_GRADE);
      ctx.drawImage(im, Math.round(o.x - im.width / 2), Math.round(o.y - im.height / 2));
    }
    for (const k of this.pickups) this.drawPickup(ctx, k);
    this.drawGroundWarnings(ctx);

    // Decorado + entidades ordenados por Y
    const list = decor.items;
    for (const e of this.enemies) list.push({ y: e.y, e });
    list.push({ y: p.y, player: true });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.player) this.drawPlayer(ctx);
      else if (o.e) this.drawEnemy(ctx, o.e);
      else this.drawDecorItem(ctx, o);
    }
    // Enemigos derrotados: salen despedidos girando y se desvanecen
    for (const c of this.corpses) {
      const k = c.t / c.dur;
      const { h } = heroSize(c.sprite);
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(Math.round(c.x), Math.round(c.y - h / 2 - k * 10));
      ctx.rotate(c.spin * c.t);
      drawHero(ctx, c.sprite, 0, 0, h / 2, c.flip, k < 0.35 ? 'white' : c.mode);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Lluvia de meteoros del jugador: caen en diagonal
    for (const r of this.prains) {
      const k = Math.min(1, r.t / r.warn);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 6 * k + 2, 3 * k + 1, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.drawArt(ctx, r.art || 'comet', 0, r.x - (1 - k) * 70, r.y - 10 - (1 - k) * 150, 22, 1, Math.atan2(150, 70), r.tint);
    }
    // Lluvia de ki de los jefes: la bola cae sobre el círculo de aviso
    for (const r of this.rains) {
      const k = Math.min(1, r.t / r.warn);
      this.drawArt(ctx, 'ki_yellow', Math.floor(this.t * 12), r.x, r.y - 8 - (1 - k) * 140, 16, 1, 0, 'hue-40');
    }

    // Proyectiles
    for (const pr of this.projs) this.drawProj(ctx, pr);
    for (const b of this.beams) this.drawBeam(ctx, b);
    const orbW = this.activeSlot && this.activeSlot.ws.find((w) => w.def.kind === 'orbit');
    this.orbs.forEach((o, i) => {
      const a = (orbW ? orbW.angle : 0) + (i / this.orbs.length) * TAU + Math.PI / 2;
      this.drawArt(ctx, 'comet', 0, o.x, o.y - 8, 20, 0, a + Math.PI);
    });
    for (const b of this.eprojs) this.drawEnemyProj(ctx, b);
    this.drawBossBeams(ctx);
    if (this.ult) this.drawUlt(ctx);

    for (const f of this.effects) this.drawEffect(ctx, f);
    for (const q of this.particles) {
      ctx.globalAlpha = 1 - q.t / q.dur;
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
    }
    ctx.globalAlpha = 1;

    // Números de daño (fuente de Legacy of Goku)
    for (const tx of this.texts) {
      const y = tx.y - tx.t * 22;
      ctx.globalAlpha = Math.min(1, 2 - tx.t / 0.35);
      const mode = tx.heal ? 'hue110' : tx.crit ? 'hue-25' : null;
      drawNumber(ctx, 'dmg', String(tx.v).replace('+', ''), tx.x, y - 4, 'center', mode);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawIndicators(ctx, camX, camY);

    // Cronómetro con los dígitos de Legacy of Goku
    const tt = this.t;
    const mm = String(Math.floor(tt / 60)).padStart(2, '0');
    const ss = String(Math.floor(tt % 60)).padStart(2, '0');
    const ty = W < 520 ? 66 : 18;
    drawNumber(ctx, 'timer', mm + ':' + ss, W / 2, ty);
    // Fase actual y cuánto falta para el jefe
    const ph = this.phaseDef;
    ctx.font = '8px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = `FASE ${this.phaseNum} · ${ph.name.toUpperCase()}`;
    ctx.fillStyle = '#000';
    ctx.fillText(label, W / 2 + 1, ty + 21);
    ctx.fillStyle = this.loop ? '#ff9a9a' : '#ffe8c8';
    ctx.fillText(label, W / 2, ty + 20);
    if (!this.bossSpawned) {
      const bw = 70;
      const k = Math.min(1, this.phaseT / ph.bossAt);
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(Math.round(W / 2 - bw / 2) - 1, ty + 31, bw + 2, 4);
      ctx.fillStyle = '#ff6a6a';
      ctx.fillRect(Math.round(W / 2 - bw / 2), ty + 32, Math.round(bw * k), 2);
    }

    if (this.cutin) this.drawCutin(ctx);

    if (this.flashScreen > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = Math.min(0.8, this.flashScreen);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (p.hp < p.maxHp * 0.25 && this.state === 'play') {
      ctx.fillStyle = '#c01030';
      ctx.globalAlpha = 0.12 + Math.sin(this.t * 6) * 0.06;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Joystick táctil
    const j = this.input.joy;
    if (j) {
      const s = this.scale;
      const ox = j.ox / s;
      const oy = j.oy / s;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 50 / s, 0, TAU);
      ctx.stroke();
      const dx = (j.x - j.ox) / s;
      const dy = (j.y - j.oy) / s;
      const d = Math.hypot(dx, dy);
      const m = Math.min(d, 50 / s);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ox + (d ? (dx / d) * m : 0), oy + (d ? (dy / d) * m : 0), 18 / s, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Decorado determinista por trozos de mapa (árboles, rocas, volcanes...).
  visibleDecor(camX, camY) {
    const biome = BIOMES[this.biome];
    const bseed = Object.keys(BIOMES).indexOf(this.biome);
    const out = { flat: [], items: [] };
    const pickW = (list, r) => {
      let total = 0;
      for (const [, w] of list) total += w;
      let v = r() * total;
      for (const [k, w] of list) if ((v -= w) <= 0) return k;
      return list[0][0];
    };
    const scan = (C, margin, fn) => {
      const x0 = Math.floor((camX - margin) / C);
      const x1 = Math.floor((camX + this.W + margin) / C);
      const y0 = Math.floor((camY - margin) / C);
      const y1 = Math.floor((camY + this.H + margin) / C);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) fn(cx, cy, rng((cx * 92837111) ^ (cy * 689287499) ^ (bseed * 1000003) ^ C));
    };
    const clearStart = (x, y, R) => Math.hypot(x, y) < R;
    scan(120, 120, (cx, cy, r) => {
      const n = r() < 0.45 ? 1 : r() < 0.25 ? 2 : 0;
      for (let i = 0; i < n; i++) {
        const key = pickW(biome.decor, r);
        const x = cx * 120 + r() * 120;
        const y = cy * 120 + r() * 120;
        if (!clearStart(x, y, 60)) out.items.push({ y, x, key });
      }
    });
    if (biome.flat.length) {
      scan(200, 120, (cx, cy, r) => {
        if (r() < 0.5) {
          const x = cx * 200 + r() * 200;
          const y = cy * 200 + r() * 200;
          out.flat.push({ x, y, key: pickW(biome.flat, r) });
        }
      });
    }
    if (biome.big.length) {
      scan(700, 400, (cx, cy, r) => {
        if (r() < 0.45) {
          const x = cx * 700 + 150 + r() * 400;
          const y = cy * 700 + 150 + r() * 400;
          if (!clearStart(x, y, 300)) out.items.push({ x, y, key: pickW(biome.big, r) });
        }
      });
    }
    return out;
  }

  drawDecorItem(ctx, o) {
    const im = graded('decor', o.key, DECOR_GRADE);
    ctx.drawImage(im, Math.round(o.x - im.width / 2), Math.round(o.y - im.height));
  }

  drawShadow(ctx, x, y, big) {
    const key = big ? 'shadowbig' : 'shadow';
    const im = img('fx', key);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2));
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx) {
    const p = this.player;
    const f = this.form;
    const sprite = this.sprite;
    const { h } = heroSize(sprite);
    const frame = Math.floor(this.t * (p.moving ? 9 : 5));

    this.drawShadow(ctx, p.x, p.y, true);

    if (f.aura && this.player.form > 0 || (f.aura && this.char.forms.length === 1)) {
      // Aura de ki de la forma actual
      ctx.fillStyle = f.aura;
      const big = f.big ? 1.35 : 1;
      for (let i = 0; i < 7; i++) {
        const fx = p.x + rand(-10, 10) * big;
        const fh = rand(h * 0.55, h * 0.95) * big;
        ctx.globalAlpha = rand(0.12, 0.3);
        ctx.beginPath();
        ctx.moveTo(fx - 6, p.y + 1);
        ctx.lineTo(fx + rand(-3, 3), p.y + 1 - fh - 8);
        ctx.lineTo(fx + 6, p.y + 1);
        ctx.fill();
      }
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - h * 0.48, 16 * big, h * 0.6 * big, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Pose: lanzar ki, volar hacia delante o reposo
    let spr = sprite;
    let fr = frame;
    let flip = p.face < 0;
    let bob = 0;
    if (p.atkT > 0 && hasHero(sprite + '@atk')) {
      spr = sprite + '@atk';
      fr = Math.floor((1 - p.atkT / p.atkDur) * 2);
      flip = Math.cos(p.atkAng) < 0;
    } else if (p.moving) {
      if (hasHero(sprite + '@move')) {
        spr = sprite + '@move';
        fr = Math.floor(this.t * 7);
      }
      bob = Math.round(Math.sin(this.t * 12) * 1.2);
    }
    // imágenes residuales (como al volar a toda velocidad en la serie)
    const trailCol = 'sil' + (f.aura || '#9fd8ff').slice(1);
    for (let i = p.trail.length - 1; i >= 1; i--) {
      const q = p.trail[i];
      ctx.globalAlpha = 0.28 - i * 0.06;
      drawHero(ctx, spr, fr, q.x, q.y + 2 + bob, flip, trailCol);
    }
    ctx.globalAlpha = 1;
    const blink = p.inv > 0 && Math.floor(this.t * 20) % 2;
    if (!blink) {
      const hit = p.hurtT > 0;
      const jx = hit ? Math.round(Math.sin(this.t * 90) * 1.5) : 0;
      if (this.prog.shiny && Math.floor(this.t * 4) % 2) drawShinyOutline(ctx, spr, fr, p.x + jx, p.y + 2 + bob, flip);
      drawHero(ctx, spr, fr, p.x + jx, p.y + 2 + bob, flip, hit && Math.floor(this.t * 24) % 2 ? 'silff4a4a' : null);
    }

    if (this.prog.shiny && Math.random() < 0.25) {
      this.particles.push({ x: p.x + rand(-10, 10), y: p.y - rand(0, h), vx: 0, vy: -20, t: 0, dur: 0.5, color: '#fff6a0', s: 1 });
    }
    if (f.sparks && Math.random() < 0.35) {
      ctx.strokeStyle = '#bfe8ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let lx = p.x + rand(-12, 12);
      let ly = p.y - rand(h * 0.3, h);
      ctx.moveTo(lx, ly);
      for (let i = 0; i < 3; i++) {
        lx += rand(-4, 4);
        ly += rand(2, 6);
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
  }

  drawEnemy(ctx, e) {
    if (e.pod) {
      const im = e.flash > 0 ? recolor('items', 'pod', 'white') : img('items', 'pod');
      ctx.drawImage(im, Math.round(e.x - im.width / 2), Math.round(e.y - im.height + 2));
      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#1a1020';
        ctx.fillRect(Math.round(e.x - 9), Math.round(e.y - 17), 18, 3);
        ctx.fillStyle = '#9fe0ff';
        ctx.fillRect(Math.round(e.x - 8), Math.round(e.y - 16), Math.max(0, (e.hp / e.maxHp) * 16), 1);
      }
      return;
    }
    if (e.vanish) return;
    const { w, h } = heroSize(e.sprite);
    let frame = e.stun > 0 ? 0 : Math.floor(e.walkT * 6);
    let flip = e.face < 0;
    // Pose del enemigo: atacando, volando hacia ti o en reposo
    let spr = e.sprite;
    const atking = e.atkT > 0 || (e.boss && (e.ai.mode === 'windup' || e.ai.mode === 'aim' || e.ai.mode === 'beam'));
    const flying = e.stun <= 0 && ((e.boss && e.ai.mode === 'dash') || (e.def.fly && !atking));
    if (atking && hasHero(spr + '@atk')) {
      spr += '@atk';
      frame = 0;
      flip = this.player.x < e.x;
    } else if (flying && hasHero(spr + '@move')) {
      spr += '@move';
      frame = Math.floor(e.walkT * 8);
    }
    const jx = e.flash > 0 ? (e.id % 2 ? 1 : -1) : 0;
    this.drawShadow(ctx, e.x, e.y, e.boss || e.elite);
    if (e.boss) {
      ctx.globalAlpha = 0.2 + Math.sin(this.t * 6) * 0.08;
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - h * 0.45, w * 0.55, h * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.elite && e.flash <= 0) {
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        drawHero(ctx, spr, frame, e.x + ox + jx, e.y + 2 + oy, flip, 'silffd040');
      }
    }
    drawHero(ctx, spr, frame, e.x + jx, e.y + 2, flip, e.flash > 0 ? 'white' : e.mode);
    const top = Math.round(e.y - h - 2);
    if (e.stun > 0) {
      ctx.fillStyle = '#ffff9a';
      const a = this.t * 6;
      for (let i = 0; i < 3; i++) {
        const sa = a + (i * TAU) / 3;
        ctx.fillRect(Math.round(e.x + Math.cos(sa) * 7), Math.round(top + 4 + Math.sin(sa) * 2), 2, 2);
      }
    }
    if (e.elite || e.boss) {
      const bw = e.boss ? 40 : 26;
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(Math.round(e.x - bw / 2) - 1, top - 4, bw + 2, 4);
      ctx.fillStyle = e.boss ? '#ff5a7a' : '#ffcf3a';
      ctx.fillRect(Math.round(e.x - bw / 2), top - 3, Math.max(0, (e.hp / e.maxHp) * bw), 2);
    }
  }

  // Sprite de efecto centrado en (x, y): `size` es el lado mayor en píxeles; rot en radianes.
  drawArt(ctx, key, frame, x, y, size, alpha = 1, rot = 0, tint = null, flip = false) {
    const m = meta('fx', key);
    if (!m) return;
    const src = tint ? recolor('fx', key, tint) : img('fx', key);
    const fw = m.fw || m.w;
    const fh = m.fh || m.h;
    const n = m.frames || Math.max(1, Math.floor(src.width / fw));
    const k = size / Math.max(fw, fh);
    const w = fw * k;
    const h = fh * k;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(src, (((frame % n) + n) % n) * fw, 0, fw, fh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Rayo con arte: destello en el origen, cuerpo estirado y cabeza al final. El contexto ya está
  // trasladado a las manos del guerrero y girado hacia el objetivo.
  drawBeamArt(ctx, key, tint, len, width, t) {
    const m = meta('fx', key);
    const src = tint ? recolor('fx', key, tint) : img('fx', key);
    const fw = m.fw;
    const fh = m.fh;
    const wob = 1 + Math.sin(t * 45) * 0.06;
    const k = ((width * 2.3) / fh) * wob;
    const H = fh * k;
    if (key === 'kikoho') {
      // Rayo en espiral: se repite el sprite a lo largo del rayo
      const seg = fw * k * 0.5;
      const off = (t * 220) % seg;
      for (let x = -off; x < len; x += seg) ctx.drawImage(src, fw * 0.25, 0, fw * 0.5, fh, Math.round(x), -H / 2, seg + 1, H);
      return;
    }
    const c0 = m.cap0;
    const c1 = m.cap1;
    const headW = (fw - c1) * k;
    const flareW = c0 * k;
    const bodyLen = Math.max(4, len - headW * 0.6);
    ctx.drawImage(src, c0, 0, Math.max(1, c1 - c0), fh, 0, -H / 2, bodyLen, H);
    ctx.drawImage(src, c1, 0, fw - c1, fh, bodyLen - 1, -H / 2, headW, H);
    ctx.drawImage(src, 0, 0, c0, fh, -flareW * 0.55, -H / 2, flareW, H);
  }

  drawFlameAura(ctx, x, y, R, color) {
    ctx.save();
    ctx.globalAlpha = 0.14 + Math.sin(this.t * 8) * 0.04;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fill();
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.t * 0.8;
      const fl = 6 + Math.abs(Math.sin(this.t * 9 + i * 1.7)) * 9;
      const bx = x + Math.cos(a) * R;
      const by = y + Math.sin(a) * R * 0.9;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a + 1.6) * 4, by + Math.sin(a + 1.6) * 4);
      ctx.lineTo(bx + Math.cos(a) * fl, by + Math.sin(a) * fl - fl * 0.4);
      ctx.lineTo(bx + Math.cos(a - 1.6) * 4, by + Math.sin(a - 1.6) * 4);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
    }
    ctx.restore();
  }

  // Avisos en el suelo: saibaman a punto de explotar, lluvia de ki, embestidas y rayos de jefe
  drawGroundWarnings(ctx) {
    for (const r of this.rains) {
      const k = Math.min(1, r.t / r.warn);
      ctx.globalAlpha = 0.2 + k * 0.3;
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r * k, r.r * k * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff7a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.6, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const e of this.enemies) {
      if (!(e.windT > 0) || e.dead) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.atan2(e.cdy, e.cdx));
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(0, -3, e.def.charge.speed * e.def.charge.dur, 6);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    for (const e of this.enemies) {
      if (!(e.arm > 0) || e.dead) continue;
      const R = e.def.bomb.radius;
      const k = 1 - e.arm / e.def.bomb.fuse;
      ctx.globalAlpha = 0.25 + k * 0.3;
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, R * k, R * k * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff6a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, R, R * 0.6, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const b of this.ebeams) {
      if (b.t >= b.warn) continue;
      const k = b.t / b.warn;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);
      ctx.globalAlpha = 0.18 + 0.25 * k + (Math.floor(b.t * 12) % 2) * 0.08;
      ctx.fillStyle = '#ff2a2a';
      ctx.fillRect(0, -b.w / 2, b.len, b.w);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ff7a5a';
      ctx.fillRect(0, -b.w / 2, b.len * k, 1);
      ctx.fillRect(0, b.w / 2 - 1, b.len * k, 1);
      ctx.restore();
    }
  }

  drawBossBeams(ctx) {
    for (const b of this.ebeams) {
      if (b.t < b.warn) continue;
      const k = Math.min(1, (b.t - b.warn) / 0.08) * Math.min(1, (b.dur - b.t) / 0.15);
      ctx.save();
      ctx.translate(b.x, b.y - 14);
      ctx.rotate(b.ang);
      this.drawBeamArt(ctx, 'beam_magenta', null, b.len, b.w * k, b.t);
      ctx.restore();
    }
  }

  drawUlt(ctx) {
    const u = this.ult;
    const p = this.player;
    if (u.kind === 'beam') {
      const k = Math.min(1, u.t / 0.15) * Math.min(1, (u.dur - u.t) / 0.25);
      ctx.save();
      ctx.translate(p.x + Math.cos(u.ang) * 8, p.y - 22 + Math.sin(u.ang) * 6);
      ctx.rotate(u.ang);
      this.drawBeamArt(ctx, u.art === 'kikoho' ? 'kikoho' : (meta('fx', u.art) && meta('fx', u.art).cap1 ? u.art : 'beam_cyan'), u.tint, u.len, u.width * k, u.t);
      ctx.restore();
      if (Math.random() < 0.5) this.spark(p.x + Math.cos(u.ang) * rand(20, 300), p.y - 20 + Math.sin(u.ang) * rand(20, 300), '#ffffff', 2);
    } else if (u.kind === 'bomb') {
      if (!u.boomed) {
        const grow = Math.min(1, u.t / 1.1);
        const size = 30 + grow * 90;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#bfe8ff';
        ctx.beginPath();
        ctx.arc(u.x, u.y, size * 0.62, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        const art = u.art === 'sun' || u.art === 'genkidama' ? u.art : 'sphere';
        if (art === 'genkidama') {
          const gi = img('fx', 'genkidama');
          ctx.drawImage(gi, Math.round(u.x - size / 2), Math.round(u.y - size / 2), size, size);
        } else this.drawArt(ctx, art, 0, u.x, u.y, size, 1, this.t * 2, u.tint);
        // partículas que se concentran en la esfera
        if (u.t < 1.1 && Math.random() < 0.8) {
          const a = Math.random() * TAU;
          this.particles.push({ x: u.x + Math.cos(a) * 120, y: u.y + Math.sin(a) * 120, vx: -Math.cos(a) * 240, vy: -Math.sin(a) * 240, t: 0, dur: 0.45, color: '#dff4ff', s: 2 });
        }
      }
    } else {
      const k = u.t / u.dur;
      this.drawArt(ctx, 'burst', 0, p.x, p.y - 10, u.r * 1.6, 1 - k, this.t);
      ctx.strokeStyle = u.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, u.r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Corte de anime: franja con el guerrero y el nombre del ataque definitivo
  drawCutin(ctx) {
    const c = this.cutin;
    const { W, H } = this;
    const k = c.t / c.dur;
    const inK = Math.min(1, c.t / 0.18);
    const outK = Math.min(1, (c.dur - c.t) / 0.15);
    const bh = Math.round(80 * inK * outK);
    const cy = Math.round(H / 2);
    const accent = c.boss ? c.color || '#ff4a4a' : '#ffd23a';
    ctx.fillStyle = c.boss ? 'rgba(30,4,10,0.6)' : 'rgba(8,6,20,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.boss ? '#2a0812' : '#1a0f30';
    ctx.fillRect(0, cy - bh / 2, W, bh);
    // líneas de velocidad (de derecha a izquierda para el héroe, al revés para el jefe)
    ctx.fillStyle = accent;
    for (let i = 0; i < 14; i++) {
      const y = cy - bh / 2 + ((i * 37) % Math.max(1, bh));
      const x = ((i * 113 + c.t * 900) % (W + 80)) - 80;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(Math.round(c.boss ? x : W - x), Math.round(y), 40 + (i % 3) * 20, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillRect(0, cy - bh / 2, W, 2);
    ctx.fillRect(0, cy + bh / 2 - 2, W, 2);
    if (bh > 20) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, cy - bh / 2 + 2, W, bh - 4);
      ctx.clip();
      const slide = Math.min(1, k * 4);
      ctx.font = 'bold 16px "Pixelify Sans", monospace';
      ctx.textBaseline = 'middle';
      if (c.boss) {
        // el jefe entra por la derecha, con su nombre y su frase
        const x = Math.round(W + 20 - slide * (W * 0.22 + 132));
        ctx.save();
        ctx.translate(x + 112, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(c.card, 0, cy - 70, 112, 140);
        ctx.restore();
        const tx = Math.round(W * 0.72 - 140 + (1 - Math.min(1, k * 3)) * 60);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#000';
        ctx.fillText(c.name.toUpperCase(), tx + 1, cy - 5);
        ctx.fillStyle = accent;
        ctx.fillText(c.name.toUpperCase(), tx, cy - 6);
        ctx.font = '9px "Pixelify Sans", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('«' + c.sub + '»', tx, cy + 12);
        ctx.fillStyle = '#ff9a9a';
        ctx.fillText(`FASE ${this.phaseNum} · ¡JEFE!`, tx, cy - 24);
      } else {
        const x = Math.round(-100 + slide * (W * 0.22 + 100));
        ctx.drawImage(c.card, x, cy - 70, 112, 140);
        ctx.textAlign = 'left';
        const tx = Math.round(W * 0.22 + 120 - (1 - Math.min(1, k * 3)) * 60);
        ctx.fillStyle = '#000';
        ctx.fillText(c.name.toUpperCase(), tx + 1, cy + 1);
        ctx.fillStyle = '#ffe14a';
        ctx.fillText(c.name.toUpperCase(), tx, cy);
        ctx.font = '9px "Pixelify Sans", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.char.name, tx, cy - 16);
      }
      ctx.restore();
    }
  }

  drawPickup(ctx, k) {
    const bob = Math.round(Math.sin(this.t * 4 + k.x) * 1.5);
    if (k.type === 'xp') {
      // Gemas de ki: azul, verde o roja según su valor
      const v = k.value;
      const key = v >= 20 ? 'gem_l' : v >= 5 ? 'gem_m' : 'gem_s';
      const m = meta('items', key);
      drawStrip(ctx, 'items', key, Math.floor(this.t * 6 + k.x * 0.1), Math.round(k.x - m.fw / 2), Math.round(k.y - m.fh / 2 + bob), m.fw, m.fh, m.fw, m.fh);
      return;
    }
    if (k.type === 'zeni') {
      drawStrip(ctx, 'items', 'zeni', Math.floor(this.t * 8 + k.x), Math.round(k.x - 4), Math.round(k.y - 4 + bob), 8, 8);
      return;
    }
    if (k.type === 'dragonball') {
      // Columna de luz para verla de lejos
      const pulse = 0.18 + Math.sin(this.t * 4) * 0.06;
      const g = ctx.createLinearGradient(0, k.y - 90, 0, k.y);
      g.addColorStop(0, 'rgba(255,170,40,0)');
      g.addColorStop(1, `rgba(255,190,60,${pulse * 2})`);
      ctx.fillStyle = g;
      ctx.fillRect(Math.round(k.x - 5), Math.round(k.y - 90), 10, 90);
      ctx.globalAlpha = 0.3 + Math.sin(this.t * 5) * 0.12;
      ctx.fillStyle = '#ffa31a';
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 15, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.drawShadow(ctx, k.x, k.y + 11);
      const im = img('items', 'dball' + Math.min(7, Math.max(1, k.stars || 1)));
      ctx.drawImage(im, Math.round(k.x - 10), Math.round(k.y - 10 + bob));
      this.drawArt(ctx, 'star', 0, k.x - 5, k.y - 6 + bob, 9 + Math.sin(this.t * 6) * 3, 0.9, this.t);
      return;
    }
    if (k.type === 'crystal' || k.type === 'ticket' || k.type === 'ticket10') {
      const key = k.type;
      ctx.globalAlpha = 0.3 + Math.sin(this.t * 6) * 0.1;
      ctx.fillStyle = k.type === 'crystal' ? '#5ad8ff' : '#ffb03a';
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      const im = img('ui', key);
      ctx.drawImage(im, Math.round(k.x - im.width / 2), Math.round(k.y - im.height / 2 + bob));
      return;
    }
    if (k.type === 'buff') {
      const c = BUFF_COLORS[k.buff];
      ctx.globalAlpha = 0.35 + Math.sin(this.t * 6) * 0.12;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 10, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      const tint = { fury: 'hue-50', speed: 'hue110', haste: 'hue180', magnet: null }[k.buff];
      this.drawArt(ctx, 'star', 0, k.x, k.y + bob, 22, 1, this.t * 1.5, tint);
      return;
    }
    const key = k.type === 'itembox' ? 'capsule' : k.type;
    const im = img('items', key);
    if (k.type === 'capsule' || k.type === 'itembox') {
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 5) * 0.12;
      ctx.fillStyle = k.type === 'itembox' ? '#d07aff' : '#9fd8ff';
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 11, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    this.drawShadow(ctx, k.x, k.y + 7);
    ctx.drawImage(im, Math.round(k.x - im.width / 2), Math.round(k.y - im.height / 2 + bob));
  }

  drawProj(ctx, pr) {
    ctx.save();
    ctx.translate(0, -18);
    this.drawProjInner(ctx, pr);
    ctx.restore();
  }

  drawProjInner(ctx, pr) {
    const ang = Math.atan2(pr.vy, pr.vx);
    const fr = Math.floor(this.t * 14);
    if (pr.kind === 'ki') {
      const s = Math.round(10 + pr.r * 2.6);
      this.drawArt(ctx, pr.art || 'ki_yellow', fr, pr.x, pr.y, s, 1, ang, pr.tint);
    } else if (pr.kind === 'wave') {
      this.drawArt(ctx, pr.art || 'flame', fr, pr.x, pr.y, pr.r * 4.4, 1, ang, pr.tint);
    } else if (pr.kind === 'disc') {
      // Disco cortante con dientes que giran
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.scale(1, 0.45);
      const R = pr.r + 2;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(0, 0, R + 3, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6c8';
      for (let i = 0; i < 10; i++) {
        const a = pr.spin + (i / 10) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2));
        ctx.lineTo(Math.cos(a + 0.22) * (R + 3), Math.sin(a + 0.22) * (R + 3));
        ctx.lineTo(Math.cos(a + 0.45) * (R - 2), Math.sin(a + 0.45) * (R - 2));
        ctx.fill();
      }
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(0, 0, R - 1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.45, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (pr.kind === 'bomb') {
      const r = pr.r * (0.5 + pr.grow * 0.5);
      const art = pr.art || 'genkidama';
      if (art === 'genkidama') {
        const s = Math.round(r * 2.6);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#bfe8ff';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, s * 0.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(pr.tint ? recolor('fx', 'genkidama', pr.tint) : img('fx', 'genkidama'), Math.round(pr.x - s / 2), Math.round(pr.y - s / 2), s, s);
      } else if (art === 'comet' || art === 'comet_cyan') {
        this.drawArt(ctx, art, 0, pr.x, pr.y, r * (art === 'comet' ? 4.2 : 6), 1, ang, pr.tint);
      } else {
        this.drawArt(ctx, art, fr, pr.x, pr.y, r * 2.8, 1, art === 'sun' ? this.t * 3 : 0, pr.tint);
      }
    } else if (pr.kind === 'ghost') {
      this.drawArt(ctx, pr.art || 'ghost', Math.floor(this.t * 10 + pr.wob), pr.x, pr.y, 18, 0.9, 0, pr.tint, pr.vx < 0);
    } else if (pr.kind === 'hz') {
      this.drawArt(ctx, pr.art || 'ki_yellow', fr, pr.x, pr.y, 11, 1, 0, pr.tint);
    }
  }

  drawEnemyProj(ctx, b) {
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y) - 16);
    if (b.fx === 'bullet') {
      ctx.rotate(b.ang);
      drawStrip(ctx, 'fx', 'bullet', 0, -8, -4, 16, 8, 16, 8);
    } else if (b.fx === 'rocket') {
      ctx.rotate(b.ang);
      const im = img('fx', 'rocket');
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
    } else if (b.fx === 'disc') {
      ctx.scale(1, 0.45);
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, b.r + 4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) {
        const a = b.spin + (i / 8) * TAU;
        ctx.fillRect(Math.round(Math.cos(a) * (b.r + 1)) - 1, Math.round(Math.sin(a) * (b.r + 1)) - 1, 2, 2);
      }
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, TAU);
      ctx.fill();
    } else if (b.fx === 'big') {
      ctx.restore();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y - 16, b.r * 1.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.drawArt(ctx, 'sun', 0, b.x, b.y - 16, b.r * 3, 1, this.t * 2, b.color === '#7aff6a' ? 'hue60' : b.color === '#b07aff' || b.color === '#c77bff' ? 'hue230' : null);
      return;
    } else {
      ctx.restore();
      this.drawArt(ctx, b.minion ? 'ki_pink' : 'ki_purple', Math.floor(this.t * 12), b.x, b.y - 16, b.minion ? 14 : 18, 1, Math.atan2(b.vy, b.vx));
      return;
    }
    ctx.restore();
  }

  drawBeam(ctx, b) {
    const p = this.player;
    const k = Math.min(1, b.t / 0.08) * (b.t > b.dur - 0.1 ? (b.dur - b.t) / 0.1 : 1);
    const w = Math.max(2, b.width * k);
    ctx.save();
    ctx.translate(p.x + Math.cos(b.ang) * 8, p.y - 22 + Math.sin(b.ang) * 6);
    ctx.rotate(b.ang);
    this.drawBeamArt(ctx, b.art || 'beam_cyan', b.tint, b.len, w, b.t);
    ctx.restore();
  }

  drawEffect(ctx, f) {
    if (f.t < 0) return;
    const k = f.t / f.dur;
    if (f.kind === 'ring') {
      // Onda expansiva: conos de energía hacia fuera
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        this.drawArt(ctx, f.art || 'cone', Math.floor(k * 3), f.x + Math.cos(a) * f.r * 0.8, f.y - 8 + Math.sin(a) * f.r * 0.8, 26 + f.r * 0.25, 1 - k * 0.8, a, f.tint);
      }
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 8, f.r, 0, TAU);
      ctx.stroke();
    } else if (f.kind === 'flash') {
      if (f.art === 'timeburst') {
        const n = 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + f.t * 2;
          this.drawArt(ctx, 'timeburst', i + Math.floor(k * 6), f.x + Math.cos(a) * f.r * (0.2 + 0.6 * k), f.y - 10 + Math.sin(a) * f.r * (0.2 + 0.6 * k), 30 + f.r * 0.3, 1 - k, a, f.tint);
        }
      } else {
        ctx.fillStyle = f.color || '#ffffff';
        ctx.globalAlpha = (1 - k) * 0.5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.4), 0, TAU);
        ctx.fill();
        this.drawArt(ctx, 'star', 0, f.x, f.y - 14, f.r * (0.8 + k), 1 - k, f.t * 3, f.tint);
      }
    } else if (f.kind === 'slash') {
      ctx.save();
      ctx.translate(f.x, f.y - 10);
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, f.r * (0.7 + k * 0.3), f.ang - f.arc / 2, f.ang + f.arc / 2);
      ctx.stroke();
      ctx.restore();
      // la hoja de energía recorre el arco
      const a = f.ang - f.arc / 2 + f.arc * Math.min(1, k * 1.4);
      const R = f.r * 0.75;
      this.drawArt(ctx, f.art || 'slash_green', 0, f.x + Math.cos(a) * R, f.y - 10 + Math.sin(a) * R, f.r * 1.1, 1 - k * 0.6, a, f.tint);
    } else if (f.kind === 'boom') {
      const s = Math.round(f.r * 2.2);
      if (f.big || f.r > 26) this.drawArt(ctx, 'bigboom', Math.floor(k * 5), f.x, f.y - 6, s * (f.big ? 1.15 : 0.95), k > 0.8 ? (1 - k) * 5 : 1);
      else if (f.r > 16) this.drawArt(ctx, 'boom_orange', 0, f.x, f.y - 6, s * (0.7 + k * 0.5), 1 - k);
      else drawStrip(ctx, 'fx', 'boom', Math.floor(k * 18), Math.round(f.x - s / 2), Math.round(f.y - s / 2), s, s, 32, 32);
    } else if (f.kind === 'impact') {
      this.drawArt(ctx, f.art || 'impact', 0, f.x, f.y, 18 + k * 18, 1 - k, f.rot, f.tint);
    } else if (f.kind === 'hitfx') {
      const im = img('fx', 'kihit');
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(im, Math.round(f.x - 7), Math.round(f.y - 7));
    } else if (f.kind === 'burst') {
      this.drawArt(ctx, 'burst', 0, f.x, f.y - 20, 60 + k * 120, 1 - k, f.t * 2);
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 10, k * 140, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawIndicators(ctx, camX, camY) {
    const targets = [];
    if (this.boss && !this.boss.dead) targets.push({ x: this.boss.x, y: this.boss.y, color: this.boss.def.color, label: 'JEFE' });
    for (const k of this.pickups) {
      if (k.type === 'dragonball') targets.push({ x: k.x, y: k.y, color: '#ffa31a', label: '★' });
    }
    for (const tg of targets) {
      const sx = tg.x - camX;
      const sy = tg.y - camY;
      if (sx > 0 && sx < this.W && sy > 0 && sy < this.H) continue;
      const cx = this.W / 2;
      const cy = this.H / 2;
      const a = Math.atan2(sy - cy, sx - cx);
      const m = 14;
      const tx = clamp(cx + Math.cos(a) * 9999, m, this.W - m);
      const ty = clamp(cy + Math.sin(a) * 9999, m, this.H - m);
      // proyectar al borde
      const kx = Math.abs(Math.cos(a)) > 1e-3 ? (Math.sign(Math.cos(a)) * (cx - m)) / Math.cos(a) : Infinity;
      const ky = Math.abs(Math.sin(a)) > 1e-3 ? (Math.sign(Math.sin(a)) * (cy - m)) / Math.sin(a) : Infinity;
      const kk = Math.min(kx, ky);
      const ex = isFinite(kk) ? cx + Math.cos(a) * kk : tx;
      const ey = isFinite(kk) ? cy + Math.sin(a) * kk : ty;
      ctx.save();
      ctx.translate(Math.round(ex), Math.round(ey));
      ctx.rotate(a);
      ctx.fillStyle = tg.color;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a1020';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function diffDesc(a, b) {
  const parts = [];
  if (b.dmg > a.dmg) parts.push(`Daño ${a.dmg} → ${b.dmg}`);
  if ((b.count || 0) > (a.count || 0)) parts.push(`+${b.count - a.count} proyectil`);
  if (b.cd < a.cd) parts.push('Recarga más rápida');
  const reach = (s) => s.len || s.radius || s.range || s.maxR || s.blast || s.size || 0;
  if (reach(b) > reach(a)) parts.push('Más alcance');
  if ((b.width || 0) > (a.width || 0) && !parts.includes('Más alcance')) parts.push('Rayo más ancho');
  if ((b.pierce || 0) > (a.pierce || 0)) parts.push('Atraviesa más enemigos');
  if ((b.stun || 0) > (a.stun || 0)) parts.push('Parálisis más larga');
  if (b.dual && !a.dual) parts.push('¡También dispara hacia atrás!');
  if (b.back && !a.back) parts.push('¡Tajo doble!');
  if ((b.spin || 0) > (a.spin || 0) && !parts.length) parts.push('Gira más rápido');
  return parts.join(' · ') || 'Más poder';
}
