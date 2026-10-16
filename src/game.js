import {
  WEAPONS, PASSIVES, ENEMIES, BOSSES, WAVES, BOSS_SCHEDULE, HORDES, WIN_TIME, MAX_WEAPONS, MAX_PASSIVES, BIOMES,
} from './data.js';
import { img, meta, recolor, drawChar, drawStrip, drawNumber } from './assets.js';
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
  constructor(canvas, input, char, save, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.char = char;
    this.save = save;
    this.ui = ui;
    this.W = canvas.width;
    this.H = canvas.height;
    this.scale = 1;

    this.grounds = {};
    for (const b of BIOMES) this.grounds[b.tile] = this.ctx.createPattern(img('tiles', b.tile), 'repeat');
    this.biome = 0;
    this.grid = new Grid(32);
    this.tmp = [];

    this.t = 0;
    this.state = 'play';
    this.kills = 0;
    this.coins = 0;
    this.bossKills = 0;
    this.level = 1;
    this.xp = 0;
    this.nextXp = this.xpFor(1);
    this.pendingLevels = 0;
    this.dballs = 0;
    this.nextDballT = 40;
    this.nextEliteT = 50;
    this.bossIdx = 0;
    this.hordeIdx = 0;
    this.spawnAcc = 0;
    this.bonusMight = 1;
    this.revives = 0;
    this.shake = 0;
    this.flashScreen = 0;
    this.nextId = 1;

    const up = save.upgrades;
    this.rerolls = 1 + (up.reroll || 0);

    this.player = {
      x: 0, y: 0, r: 6, hp: 1, maxHp: 1, face: 1, dirX: 1, dirY: 0, dir: 0,
      inv: 0, walkT: 0, moving: false, form: -1,
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

    this.recalc();
    this.player.hp = this.player.maxHp;
    this.addWeapon(char.weapon);
  }

  // -------------------------------------------------------------------------
  // Estadísticas
  // -------------------------------------------------------------------------
  get form() {
    return this.player.form >= 0 ? this.char.forms[this.player.form] : null;
  }

  recalc() {
    const b = this.char.stats;
    const m = this.save.upgrades;
    const p = this.passives;
    const f = this.form || {};
    const lv = (o, k) => o[k] || 0;
    const prevMax = this.player.maxHp;
    this.stats = {
      might: b.might * (1 + 0.05 * lv(m, 'poder')) * (1 + 0.1 * lv(p, 'poder')) * (1 + (f.might || 0)) * this.bonusMight,
      speed: 82 * b.speed * (1 + 0.04 * lv(m, 'velocidad')) * (1 + 0.07 * lv(p, 'velocidad')) * (1 + (f.speed || 0)),
      armor: lv(m, 'armadura') + lv(p, 'armadura'),
      haste: Math.max(0.4, 1 - 0.07 * lv(p, 'concentracion')),
      area: 1 + 0.1 * lv(p, 'control'),
      regen: (b.regen || 0) + 0.15 * lv(m, 'regen') + 0.3 * lv(p, 'meditacion') + (f.regen || 0),
      magnet: 50 * (1 + 0.1 * lv(m, 'iman')) * (1 + 0.25 * lv(p, 'radar')) * (1 + (b.magnet || 0)),
      amount: lv(p, 'multiplicacion'),
      growth: (1 + (b.growth || 0)) * (1 + 0.05 * lv(m, 'crecimiento')) * (1 + 0.08 * lv(p, 'crecimiento')),
      greed: 1 + 0.1 * lv(m, 'avaricia'),
    };
    const maxHp = b.hp + 10 * lv(m, 'vida') + 20 * lv(p, 'vida') + (this.extraHp || 0);
    this.player.maxHp = maxHp;
    if (prevMax > 1 && maxHp > prevMax) this.player.hp += maxHp - prevMax;
    this.player.hp = Math.min(this.player.hp, maxHp);
  }

  xpFor(level) {
    return Math.floor(5 + level * 7 + Math.max(0, level - 10) * 8 + Math.max(0, level - 25) * 15);
  }

  // -------------------------------------------------------------------------
  // Armas y pasivas
  // -------------------------------------------------------------------------
  addWeapon(id) {
    const w = { id, def: WEAPONS[id], level: 1, timer: 0.3, angle: 0 };
    this.weapons.push(w);
    if (w.def.kind === 'orbit') this.rebuildOrbs();
    return w;
  }

  weaponStats(w) {
    return w.def.levels[w.level - 1];
  }

  rebuildOrbs() {
    const w = this.weapons.find((x) => x.def.kind === 'orbit');
    this.orbs = [];
    if (!w) return;
    const s = this.weaponStats(w);
    const n = s.count + this.stats.amount;
    for (let i = 0; i < n; i++) this.orbs.push({ a: (i / n) * TAU, x: 0, y: 0 });
  }

  levelUpOptions() {
    const opts = [];
    for (const w of this.weapons) {
      if (w.level < w.def.levels.length) {
        opts.push({
          type: 'weapon', id: w.id, level: w.level + 1, name: w.def.name, color: w.def.color,
          desc: diffDesc(w.def.levels[w.level - 1], w.def.levels[w.level]),
        });
      }
    }
    if (this.weapons.length < MAX_WEAPONS) {
      for (const id of Object.keys(WEAPONS)) {
        if (this.weapons.some((w) => w.id === id)) continue;
        const d = WEAPONS[id];
        opts.push({ type: 'weapon', id, level: 1, name: d.name, color: d.color, desc: d.desc, isNew: true });
      }
    }
    const owned = Object.keys(this.passives);
    for (const id of Object.keys(PASSIVES)) {
      const d = PASSIVES[id];
      const cur = this.passives[id] || 0;
      if (cur >= d.max) continue;
      if (!cur && owned.length >= MAX_PASSIVES) continue;
      opts.push({ type: 'passive', id, level: cur + 1, name: d.name, color: d.color, desc: d.desc, isNew: !cur });
    }
    // Barajar priorizando mejoras de lo que ya tienes.
    for (const o of opts) o.w = Math.random() * (o.isNew ? 1 : 1.4);
    opts.sort((a, b) => b.w - a.w);
    const out = opts.slice(0, 3);
    if (!out.length) {
      out.push({ type: 'heal', name: 'Semilla del Ermitaño', color: '#5cc93a', desc: 'Recupera el 50% de la vida.' });
      out.push({ type: 'zeni', name: 'Bolsa de Zeni', color: '#f0c419', desc: '+25 Zeni.' });
    }
    return out;
  }

  applyOption(o) {
    if (o.type === 'weapon') {
      const w = this.weapons.find((x) => x.id === o.id);
      if (w) w.level = o.level;
      else this.addWeapon(o.id);
      if (WEAPONS[o.id].kind === 'orbit') this.rebuildOrbs();
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
    let idx = -1;
    for (let i = 0; i < forms.length; i++) if (this.level >= forms[i].lvl) idx = i;
    if (idx !== this.player.form) {
      this.player.form = idx;
      this.recalc();
      this.heal(this.player.maxHp * 0.3);
      const f = forms[idx];
      sfx('transform');
      this.shake = 0.6;
      this.flashScreen = 0.6;
      this.effects.push({ kind: 'burst', x: this.player.x, y: this.player.y, t: 0, dur: 0.9, color: f.aura || '#ffe14a' });
      this.knockAll(this.player.x, this.player.y, 140, 260);
      this.ui.banner(f.name.toUpperCase() + '!');
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
    this.t += dt;
    const p = this.player;

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

    // Cambio de zona
    let bi = 0;
    for (let i = 0; i < BIOMES.length; i++) if (this.t >= BIOMES[i].t) bi = i;
    if (bi !== this.biome) {
      this.biome = bi;
      this.ui.banner('ZONA: ' + BIOMES[bi].name.toUpperCase(), '#9fe0ff');
    }
    if (p.inv > 0) p.inv -= dt;
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

    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);

    if (this.shake > 0) this.shake -= dt;
    if (this.flashScreen > 0) this.flashScreen -= dt;

    if (this.pendingLevels > 0 && this.state === 'play') {
      this.state = 'levelup';
      sfx('level');
      this.ui.showLevelUp(this.levelUpOptions(), this);
    }

    if (this.t >= WIN_TIME && this.state === 'play') this.end(true);
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

  spawnEnemy(type, x, y, elite = false) {
    const def = ENEMIES[type];
    const hpScale = 1 + this.t / 120 + (this.t / 300) ** 2;
    const e = {
      id: this.nextId++, type, def, x, y, r: def.r * (elite ? 2 : 1),
      hp: def.hp * hpScale * (elite ? 14 : 1), speed: def.speed * (elite ? 0.85 : 1) * rand(0.9, 1.1),
      dmg: def.dmg * (1 + this.t / 600) * (elite ? 1.5 : 1), xp: def.xp * (elite ? 10 : 1),
      vx: 0, vy: 0, flash: 0, stun: 0, face: 1, dir: 0, walkT: Math.random(), elite, boss: false,
      scale: 1, dead: false, orbCd: 0, sprite: def.sprite,
      shot: def.ranged ? rand(0.5, def.ranged.cd) : 0,
    };
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  spawnBoss(id) {
    const def = BOSSES[id];
    const pt = this.spawnPoint(20);
    const e = {
      id: this.nextId++, type: id, def, x: pt.x, y: pt.y, r: def.r,
      hp: def.hp, maxHp: def.hp, speed: def.speed, dmg: def.dmg, xp: def.xp,
      vx: 0, vy: 0, flash: 0, stun: 0, face: 1, dir: 0, walkT: 0, elite: false, boss: true,
      scale: def.scale, dead: false, orbCd: 0, sprite: def.sprite,
      ai: { t: 2 + Math.random(), mode: 'walk', dash: 0, wx: 0, wy: 0, shots: 0 },
    };
    this.enemies.push(e);
    this.boss = e;
    sfx('boss');
    this.shake = 0.5;
    this.ui.banner('¡' + def.name.toUpperCase() + ' HA APARECIDO!', def.color);
  }

  updateSpawns(dt) {
    const wave = this.currentWave();
    const rate = wave.rate * (1 + (this.t - wave.t) / 400);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= MAX_ENEMIES) break;
      const pt = this.spawnPoint();
      this.spawnEnemy(pick(wave.types), pt.x, pt.y);
    }

    if (this.t >= this.nextEliteT) {
      this.nextEliteT += 55;
      const pt = this.spawnPoint();
      this.spawnEnemy(pick(wave.types), pt.x, pt.y, true);
    }

    const bs = BOSS_SCHEDULE[this.bossIdx];
    if (bs && this.t >= bs.t) {
      this.bossIdx++;
      this.spawnBoss(bs.id);
    }

    const h = HORDES[this.hordeIdx];
    if (h && this.t >= h) {
      this.hordeIdx++;
      const n = 46;
      const R = Math.hypot(this.W, this.H) / 2 + 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        this.spawnEnemy(pick(wave.types), this.player.x + Math.cos(a) * R, this.player.y + Math.sin(a) * R);
      }
      this.ui.banner('¡UNA HORDA TE RODEA!', '#ff6a6a');
    }

    if (this.t >= this.nextDballT) {
      this.nextDballT += 95;
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
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < maxDist * maxDist) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((x) => x[1]);
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
    for (const w of this.weapons) {
      const s = this.weaponStats(w);
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
            r: s.size * st.area, dmg: s.dmg, pierce: s.pierce, life: 1.4, color, hit: new Set(),
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
            r: s.size * st.area, dmg: s.dmg, pierce: s.pierce, life: 1.6, color, hit: new Set(), ang: a,
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
            color, once: !!s.once, spiral: w.id === 'makanko', hue: w.id === 'galick' ? 90 : 0, hit: new Set(), tick: 0,
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
        this.effects.push({ kind: 'flash', x: p.x, y: p.y, t: 0, dur: 0.5, r: R });
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
        this.effects.push({ kind: 'ring', x: p.x, y: p.y, t: 0, dur: 0.45, r: 0, maxR: s.maxR * st.area, dmg: s.dmg, color, hit: new Set() });
        sfx('boom', 0.2);
        break;
      }
      case 'bomb': {
        const a = this.aimAngle(true);
        this.projs.push({
          kind: 'bomb', x: p.x, y: p.y - 30, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
          r: s.size * st.area, dmg: s.dmg, blast: s.blast * st.area, life: 3.5, color, grow: 0,
        });
        sfx('beam', 0.2);
        break;
      }
      case 'slash': {
        const base = this.player.face > 0 ? 0 : Math.PI;
        const dirs = [Math.atan2(p.dirY, p.dirX) || base];
        if (s.back) dirs.push(dirs[0] + Math.PI);
        const R = s.range * st.area;
        for (const a of dirs) {
          this.effects.push({ kind: 'slash', x: p.x, y: p.y, t: 0, dur: 0.18, r: R, ang: a, arc: s.arc, color });
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
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.life <= 0) {
        if (pr.kind === 'bomb') this.explode(pr);
        continue;
      }
      this.grid.query(pr.x, pr.y, pr.r + 24, this.tmp);
      for (const e of this.tmp) {
        if (e.dead) continue;
        if (Math.hypot(e.x - pr.x, e.y - pr.y) > e.r + pr.r) continue;
        if (pr.kind === 'bomb') {
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
    this.effects.push({ kind: 'boom', x: pr.x, y: pr.y, t: 0, dur: 0.5, r: pr.blast, color: pr.color });
    this.shake = Math.max(this.shake, 0.3);
    sfx('boom', 0.1);
    this.grid.query(pr.x, pr.y, pr.blast + 20, this.tmp);
    for (const e of this.tmp) {
      if (Math.hypot(e.x - pr.x, e.y - pr.y) < pr.blast + e.r) this.hit(e, pr.dmg, pr.x, pr.y, 200);
    }
  }

  hit(e, base, fx, fy, knock, quiet = false) {
    if (e.dead) return;
    const crit = Math.random() < 0.06;
    const dmg = base * this.stats.might * (crit ? 2 : 1) * rand(0.9, 1.1);
    e.hp -= dmg;
    e.flash = 0.08;
    if (knock && !e.boss) {
      const a = Math.atan2(e.y - fy, e.x - fx);
      const k = knock / (e.elite ? 4 : 1);
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
      if (this.effects.length < 120) this.effects.push({ kind: 'hitfx', x: e.x + rand(-3, 3), y: e.y - 10 * e.scale, t: 0, dur: 0.15 });
    }
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.dead = true;
    this.kills++;
    this.spark(e.x, e.y, e.boss ? e.def.color : '#ffffff', e.boss ? 30 : 5);
    this.dropXp(e.x, e.y, e.xp);
    if (Math.random() < 0.03) this.pickups.push({ type: 'zeni', x: e.x + rand(-4, 4), y: e.y, value: 1 + ((Math.random() * 3) | 0) });
    if (Math.random() < 0.0012) this.pickups.push({ type: 'senzu', x: e.x, y: e.y });
    if (e.elite) {
      this.pickups.push({ type: 'capsule', x: e.x, y: e.y });
      sfx('boom', 0.1);
    }
    if (e.boss) {
      this.bossKills++;
      this.coins += 40;
      this.shake = 0.8;
      sfx('boom', 0);
      this.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, dur: 0.9, r: 90, color: e.def.color, fx: 'ki' });
      this.pickups.push({ type: 'capsule', x: e.x + 10, y: e.y });
      this.pickups.push({ type: 'senzu', x: e.x - 10, y: e.y });
      const onMap = this.pickups.filter((k) => k.type === 'dragonball').length;
      if (this.dballs + onMap < 7) this.pickups.push({ type: 'dragonball', x: e.x, y: e.y + 12, stars: this.dballs + onMap + 1 });
      if (this.boss === e) this.boss = null;
      this.ui.banner('¡' + e.def.name.toUpperCase() + ' DERROTADO!', e.def.color);
    }
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
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      if (!e.boss && d > farR) {
        // Reaparece al otro lado (como en Vampire Survivors).
        e.x = p.x + dx * 0.9;
        e.y = p.y + dy * 0.9;
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
      } else if (e.def.ranged && d < e.def.ranged.range) {
        // Enemigo a distancia: se queda quieto y dispara.
        const rg = e.def.ranged;
        e.dir = dirFrom(dx, dy, e.dir);
        e.shot -= dt;
        if (e.shot <= 0 && this.minionShots < 8) {
          this.minionShots++;
          e.shot = rg.cd * rand(0.8, 1.2);
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
      if (d < e.r + p.r && p.inv <= 0) this.hurt(e.dmg);
    }
  }

  bossAI(e, dt, dx, dy, d) {
    const ai = e.ai;
    ai.t -= dt;
    if (ai.mode === 'walk') {
      if (ai.t <= 0) {
        const r = Math.random();
        if (r < 0.4) {
          ai.mode = 'windup';
          ai.t = 0.6;
          ai.wx = dx / d;
          ai.wy = dy / d;
        } else if (r < 0.7) {
          this.bossRing(e);
          ai.t = rand(2, 3);
        } else {
          ai.mode = 'aim';
          ai.shots = 3 + (this.bossIdx > 2 ? 2 : 0);
          ai.t = 0.2;
        }
      }
      return { x: (dx / d) * e.speed, y: (dy / d) * e.speed };
    }
    if (ai.mode === 'windup') {
      e.flash = 0.05;
      if (ai.t <= 0) {
        ai.mode = 'dash';
        ai.t = 0.55;
      }
      return { x: 0, y: 0 };
    }
    if (ai.mode === 'dash') {
      if (ai.t <= 0) {
        ai.mode = 'walk';
        ai.t = rand(2, 3.2);
      }
      if (Math.random() < 0.5) this.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: 0, dur: 0.3, color: e.def.color, s: 3 });
      return { x: ai.wx * e.speed * 5, y: ai.wy * e.speed * 5 };
    }
    if (ai.mode === 'aim') {
      if (ai.t <= 0) {
        ai.shots--;
        ai.t = 0.18;
        const a = Math.atan2(dy, dx);
        this.eprojs.push({ x: e.x, y: e.y - 12 * e.scale, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 5, dmg: e.dmg * 0.7, life: 4, color: e.def.color, fx: 'ki' });
        sfx('shot');
        if (ai.shots <= 0) {
          ai.mode = 'walk';
          ai.t = rand(2, 3);
        }
      }
      return { x: (dx / d) * e.speed * 0.3, y: (dy / d) * e.speed * 0.3 };
    }
    return { x: 0, y: 0 };
  }

  bossRing(e) {
    const n = 14;
    const off = Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      this.eprojs.push({ x: e.x, y: e.y - 12 * e.scale, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, r: 5, dmg: e.dmg * 0.6, life: 4, color: e.def.color, fx: 'ki' });
    }
    sfx('boom', 0.2);
  }

  updateEnemyProjectiles(dt) {
    const p = this.player;
    for (const b of this.eprojs) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) {
        if (p.inv <= 0) this.hurt(b.dmg);
        b.life = 0;
      }
    }
    this.eprojs = this.eprojs.filter((b) => b.life > 0);
    this.minionShots = 0;
    for (const b of this.eprojs) if (b.minion) this.minionShots++;
  }

  hurt(amount) {
    const p = this.player;
    const dmg = Math.max(1, amount - this.stats.armor);
    p.hp -= dmg;
    p.inv = 0.45;
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
    for (const k of this.pickups) {
      const dx = p.x - k.x;
      const dy = p.y - k.y;
      const d = Math.hypot(dx, dy);
      const radius = k.type === 'dragonball' ? mag * 0.6 : mag;
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
    ];
    for (const o of all) o.w = Math.random();
    return all.sort((a, b) => a.w - b.w).slice(0, 3);
  }

  grantWish(o) {
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
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    for (const tx of this.texts) tx.t += dt;
    this.texts = this.texts.filter((tx) => tx.t < 0.7);
  }

  end(win) {
    if (this.state === 'over') return;
    this.state = 'over';
    const zeni = Math.floor((this.coins + this.kills / 20 + this.t / 10) * this.stats.greed);
    this.ui.showEnd({
      win, time: this.t, kills: this.kills, level: this.level, zeni, char: this.char,
      bosses: this.bossKills,
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
    ctx.fillStyle = this.grounds[BIOMES[this.biome].tile];
    ctx.fillRect(camX, camY, W, H);

    // Aura de ki (técnica)
    const auraW = this.weapons.find((w) => w.def.kind === 'aura');
    if (auraW) {
      const R = this.weaponStats(auraW).radius * this.stats.area;
      ctx.globalAlpha = 0.18 + Math.sin(this.t * 8) * 0.04;
      ctx.fillStyle = auraW.def.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, R, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = auraW.def.color;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Decorado plano (parches de tierra, arena...) y objetos del suelo
    const decor = this.visibleDecor(camX, camY);
    for (const o of decor.flat) {
      const im = img('decor', o.key);
      ctx.drawImage(im, Math.round(o.x - im.width / 2), Math.round(o.y - im.height / 2));
    }
    for (const k of this.pickups) this.drawPickup(ctx, k);

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

    // Proyectiles
    for (const pr of this.projs) this.drawProj(ctx, pr);
    for (const b of this.beams) this.drawBeam(ctx, b);
    for (const o of this.orbs) {
      const s = 10;
      drawStrip(ctx, 'fx', 'masenko', 2, Math.round(o.x - s / 2), Math.round(o.y - 8 - s / 2), s, s, 16, 16, 0, 'hue110');
    }
    for (const b of this.eprojs) this.drawEnemyProj(ctx, b);

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
    const tt = Math.min(this.t, WIN_TIME);
    const mm = String(Math.floor(tt / 60)).padStart(2, '0');
    const ss = String(Math.floor(tt % 60)).padStart(2, '0');
    drawNumber(ctx, 'timer', mm + ':' + ss, W / 2, 18);

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
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) fn(cx, cy, rng((cx * 92837111) ^ (cy * 689287499) ^ (this.biome * 1000003) ^ C));
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
    const im = img('decor', o.key);
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
    const sprite = (f && f.sprite) || this.char.sprite;
    const frame = p.moving ? Math.floor(p.walkT * 8) : 0;

    this.drawShadow(ctx, p.x, p.y);

    if (f) {
      // Aura de transformación
      ctx.fillStyle = f.aura || '#ffe14a';
      const big = f.big ? 1.4 : 1;
      for (let i = 0; i < 6; i++) {
        const fx = p.x + rand(-8, 8) * big;
        const h = rand(14, 26) * big;
        ctx.globalAlpha = rand(0.15, 0.35);
        ctx.beginPath();
        ctx.moveTo(fx - 5, p.y + 1);
        ctx.lineTo(fx, p.y + 1 - h - 8);
        ctx.lineTo(fx + 5, p.y + 1);
        ctx.fill();
      }
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 13, 13 * big, 18 * big, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const blink = p.inv > 0 && Math.floor(this.t * 20) % 2;
    if (!blink) drawChar(ctx, sprite, p.dir, frame, p.x, p.y + 2);

    if (f && f.sparks && Math.random() < 0.35) {
      ctx.strokeStyle = '#bfe8ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let lx = p.x + rand(-10, 10);
      let ly = p.y + rand(-28, -2);
      ctx.moveTo(lx, ly);
      for (let i = 0; i < 3; i++) {
        lx += rand(-4, 4);
        ly += rand(2, 5);
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
  }

  drawEnemy(ctx, e) {
    const s = e.scale;
    const m = meta('chars', e.sprite);
    const h = m.fh * s;
    const frame = e.stun > 0 ? 0 : Math.floor(e.walkT * 7);
    this.drawShadow(ctx, e.x, e.y, s > 1 || m.fw > 32);
    if (e.boss) {
      ctx.globalAlpha = 0.22 + Math.sin(this.t * 6) * 0.08;
      ctx.fillStyle = e.boss ? e.def.color : '#ffcf3a';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - h * 0.45, m.fw * s * 0.45, h * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.elite && e.flash <= 0) {
      // Contorno dorado para las élites
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        drawChar(ctx, e.sprite, e.dir, frame, e.x + ox, e.y + 2 * s + oy, s, 'silffd040');
      }
    }
    drawChar(ctx, e.sprite, e.dir, frame, e.x, e.y + 2 * s, s, e.flash > 0 ? 'white' : null);
    const top = Math.round(e.y - h * 0.85);
    if (e.stun > 0) {
      ctx.fillStyle = '#ffff9a';
      const a = this.t * 6;
      for (let i = 0; i < 3; i++) {
        const sa = a + (i * TAU) / 3;
        ctx.fillRect(Math.round(e.x + Math.cos(sa) * 6), Math.round(top + Math.sin(sa) * 2), 2, 2);
      }
    }
    if (e.elite) {
      const bw = 24;
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(Math.round(e.x - bw / 2) - 1, top - 6, bw + 2, 4);
      ctx.fillStyle = '#ffcf3a';
      ctx.fillRect(Math.round(e.x - bw / 2), top - 5, Math.max(0, (e.hp / e.maxHp) * bw), 2);
    }
  }

  drawPickup(ctx, k) {
    const bob = Math.round(Math.sin(this.t * 4 + k.x) * 1.5);
    if (k.type === 'xp') {
      // Esferas de ki: azul, verde o roja según su valor
      const v = k.value;
      const [f, mode, s] = v >= 20 ? [2, 'hue-60', 12] : v >= 5 ? [1, 'hue100', 10] : [0, 'hue170', 10];
      drawStrip(ctx, 'fx', 'masenko', f, Math.round(k.x - s / 2), Math.round(k.y - s / 2 + bob), s, s, 16, 16, 0, mode);
      return;
    }
    if (k.type === 'zeni') {
      drawStrip(ctx, 'items', 'zeni', Math.floor(this.t * 8 + k.x), Math.round(k.x - 4), Math.round(k.y - 4 + bob), 8, 8);
      return;
    }
    const key = k.type === 'dragonball' ? 'db' + Math.min(7, Math.max(1, k.stars || 1)) : k.type;
    const im = img('items', key);
    if (k.type === 'dragonball' || k.type === 'capsule') {
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 5) * 0.12;
      ctx.fillStyle = k.type === 'dragonball' ? '#ffa31a' : '#9fd8ff';
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 10, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    this.drawShadow(ctx, k.x, k.y + 7);
    ctx.drawImage(im, Math.round(k.x - im.width / 2), Math.round(k.y - im.height / 2 + bob));
  }

  drawProj(ctx, pr) {
    ctx.save();
    ctx.translate(0, -8);
    this.drawProjInner(ctx, pr);
    ctx.restore();
  }

  drawProjInner(ctx, pr) {
    if (pr.kind === 'ki') {
      const s = Math.round(10 + pr.r * 2);
      ctx.save();
      ctx.translate(Math.round(pr.x), Math.round(pr.y));
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      drawStrip(ctx, 'fx', 'kiblast', 1, -s / 2, -s / 2, s, s, 16, 16, 2);
      ctx.restore();
    } else if (pr.kind === 'wave') {
      const s = Math.round(pr.r * 2.6);
      drawStrip(ctx, 'fx', 'masenko', 2, Math.round(pr.x - s / 2), Math.round(pr.y - s / 2), s, s, 16, 16);
    } else if (pr.kind === 'disc') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.fillStyle = pr.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, pr.r + 2, (pr.r + 2) * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, pr.r, pr.r * 0.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      const w = Math.abs(Math.cos(pr.spin)) * pr.r;
      ctx.fillRect(Math.round(-w), -1, Math.round(w * 2), 1);
      ctx.restore();
    } else if (pr.kind === 'bomb') {
      const r = pr.r * (0.4 + pr.grow * 0.6);
      const s = Math.round(r * 2.4);
      ctx.drawImage(img('fx', 'genkidama'), Math.round(pr.x - s / 2), Math.round(pr.y - s / 2), s, s);
    }
  }

  drawEnemyProj(ctx, b) {
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y) - 8);
    if (b.fx === 'bullet') {
      ctx.rotate(b.ang);
      drawStrip(ctx, 'fx', 'bullet', 0, -8, -4, 16, 8, 16, 8);
    } else if (b.fx === 'rocket') {
      ctx.rotate(b.ang);
      const im = img('fx', 'rocket');
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
    } else {
      drawStrip(ctx, 'fx', 'masenko', 1, -7, -7, 14, 14, 16, 16, 0, 'hue-50');
    }
    ctx.restore();
  }

  drawBeam(ctx, b) {
    const p = this.player;
    const k = Math.min(1, b.t / 0.08) * (b.t > b.dur - 0.1 ? (b.dur - b.t) / 0.1 : 1);
    const w = Math.max(2, b.width * k);
    const mode = b.hue ? 'hue' + b.hue : null;
    ctx.save();
    ctx.translate(p.x + Math.cos(b.ang) * 6, p.y - 12 + Math.sin(b.ang) * 6);
    ctx.rotate(b.ang);
    if (b.spiral) {
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, -w / 2 - 1, b.len, w + 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(0, -w * 0.25, b.len, w * 0.5);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= b.len; x += 3) {
        const yy = Math.sin(x * 0.25 - b.t * 40) * (w + 3);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    } else {
      // Cuerpo: franja horizontal del sprite del Kamehameha estirada
      const mid = mode ? recolor('fx', 'kame_mid', mode) : img('fx', 'kame_mid');
      ctx.drawImage(mid, 0, 4, 24, 8, 4, -w / 2, b.len - 4, w);
      const cap = w * 1.6;
      drawStrip(ctx, 'fx', 'kame_end', Math.floor(b.t * 12), b.len - cap * 0.4, -cap / 2, cap, cap, 16, 16, 2, mode);
      drawStrip(ctx, 'fx', 'kame_begin', Math.floor(b.t * 12), -cap * 0.3, -cap / 2, cap, cap, 16, 16, 2, mode);
    }
    ctx.restore();
  }

  drawEffect(ctx, f) {
    const k = f.t / f.dur;
    if (f.kind === 'ring') {
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    } else if (f.kind === 'flash') {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.4), 0, TAU);
      ctx.fill();
    } else if (f.kind === 'slash') {
      ctx.save();
      ctx.translate(f.x, f.y - 10);
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, f.r * (0.7 + k * 0.3), f.ang - f.arc / 2, f.ang + f.arc / 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      // la espada de energía recorre el arco
      const a = f.ang - f.arc / 2 + f.arc * k;
      ctx.rotate(a + Math.PI / 2);
      ctx.globalAlpha = 1;
      const sw = img('fx', 'sword');
      ctx.drawImage(sw, 0, 0, 12, 32, -6, -f.r, 12, f.r * 0.9);
      ctx.restore();
    } else if (f.kind === 'boom') {
      const s = Math.round(f.r * 2.2);
      drawStrip(ctx, 'fx', 'boom', Math.floor(k * 18), Math.round(f.x - s / 2), Math.round(f.y - s / 2), s, s, 32, 32);
    } else if (f.kind === 'hitfx') {
      const im = img('fx', 'kihit');
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(im, Math.round(f.x - 7), Math.round(f.y - 7));
    } else if (f.kind === 'burst') {
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + f.t;
        const r0 = 10 + k * 60;
        const r1 = r0 + 20;
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(a) * r0, f.y - 10 + Math.sin(a) * r0);
        ctx.lineTo(f.x + Math.cos(a) * r1, f.y - 10 + Math.sin(a) * r1);
        ctx.stroke();
      }
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
