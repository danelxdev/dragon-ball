// Lógica de progreso fuera de la partida: gacha, colección, mejoras por personaje y misiones.
import { ROSTER, RARITY, GACHA, MISSIONS } from './data.js';

export const byId = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

export const CHAR_UPGRADES = {
  poder: { name: 'Poder', desc: '+6% de daño', max: 5 },
  vida: { name: 'Vitalidad', desc: '+12 de vida', max: 5 },
  velocidad: { name: 'Velocidad', desc: '+4% de velocidad', max: 5 },
  recarga: { name: 'Concentración', desc: '-4% de recarga', max: 5 },
};
export const upgradeCost = (lvl) => (lvl + 1) * 4;
export const MAX_STARS = 5;

export function ensureStarters(save) {
  for (const id of GACHA.starters) {
    if (!save.roster[id]) save.roster[id] = { stars: 1, shards: 0, shiny: false, up: {} };
  }
  if (!save.welcomed) {
    save.zeni += GACHA.welcome;
    save.welcomed = true;
    return true;
  }
  return false;
}

export function ownedIds(save) {
  return ROSTER.filter((r) => save.roster[r.id]).map((r) => r.id);
}

function rollRarity(min) {
  const order = ['C', 'R', 'E', 'L'];
  const allowed = order.slice(order.indexOf(min || 'C'));
  const total = allowed.reduce((a, k) => a + RARITY[k].rate, 0);
  let v = Math.random() * total;
  for (const k of allowed) if ((v -= RARITY[k].rate) <= 0) return k;
  return allowed[allowed.length - 1];
}

function rollUnit(saga, min) {
  const rarity = rollRarity(min);
  const inSaga = (r) => saga === 'all' || r.saga === saga;
  let pool = ROSTER.filter((r) => inSaga(r) && r.rarity === rarity);
  // si la saga no tiene de esa rareza, se busca la más cercana dentro de la saga
  if (!pool.length) {
    const order = ['C', 'R', 'E', 'L'];
    const i = order.indexOf(rarity);
    for (let d = 1; d < 4 && !pool.length; d++) {
      pool = ROSTER.filter((r) => inSaga(r) && (r.rarity === order[i + d] || r.rarity === order[i - d]));
    }
  }
  return pool[(Math.random() * pool.length) | 0];
}

// Añade una copia del personaje a la colección y devuelve qué ha pasado.
export function grant(save, unit, shiny) {
  const rar = RARITY[unit.rarity];
  let entry = save.roster[unit.id];
  const res = { id: unit.id, unit, shiny, isNew: !entry, starUp: false, shards: 0 };
  if (!entry) {
    entry = save.roster[unit.id] = { stars: 1, shards: 0, shiny: !!shiny, up: {} };
  } else {
    if (entry.stars < MAX_STARS) {
      entry.stars++;
      res.starUp = true;
    }
    res.shards = rar.shards;
    entry.shards += rar.shards;
    if (shiny && !entry.shiny) {
      entry.shiny = true;
      res.newShiny = true;
    }
  }
  res.stars = entry.stars;
  return res;
}

export function pull(save, saga, n) {
  const cost = n === 10 ? GACHA.cost10 : GACHA.cost1 * n;
  if (save.zeni < cost) return null;
  save.zeni -= cost;
  const units = [];
  for (let i = 0; i < n; i++) units.push(rollUnit(saga));
  // en la tirada x10 hay al menos un Épico
  if (n === 10 && !units.some((u) => u.rarity === 'E' || u.rarity === 'L')) units[9] = rollUnit(saga, 'E');
  const results = units.map((u) => grant(save, u, Math.random() * 100 < GACHA.shinyRate));
  addStat(save, 'pulls', n);
  return results;
}

export function addStat(save, k, v = 1) {
  save.stats[k] = (save.stats[k] || 0) + v;
}

export function maxStat(save, k, v) {
  save.stats[k] = Math.max(save.stats[k] || 0, v);
}

export function statValue(save, k) {
  if (k === 'owned') return ownedIds(save).length;
  if (k === 'shinies') return Object.values(save.roster).filter((e) => e.shiny).length;
  if (k === 'winners') return save.winners.length;
  if (k === 'best') return Math.max(0, ...Object.values(save.best));
  return save.stats[k] || 0;
}

export function missions(save) {
  return MISSIONS.map((m) => {
    const v = statValue(save, m.stat);
    return { ...m, value: v, done: v >= m.target, claimed: save.claimed.includes(m.id) };
  });
}

export function claimable(save) {
  return missions(save).filter((m) => m.done && !m.claimed).length;
}

export function claim(save, id) {
  const m = missions(save).find((x) => x.id === id);
  if (!m || !m.done || m.claimed) return 0;
  save.claimed.push(id);
  save.zeni += m.reward;
  return m.reward;
}

// Aplica el resultado de una partida a las estadísticas.
export function applyRun(save, r) {
  addStat(save, 'runs');
  addStat(save, 'kills', r.kills);
  addStat(save, 'wishes', r.wishes);
  addStat(save, 'evolutions', r.evolutions);
  if (r.maxForm) addStat(save, 'maxForms');
  maxStat(save, 'maxLevel', r.level);
  for (const b of r.bossesBeaten) addStat(save, 'boss_' + b);
  for (const id of r.itemsFound) if (!save.items.includes(id)) save.items.push(id);
  if (r.win && !save.winners.includes(r.char.id)) save.winners.push(r.char.id);
}
