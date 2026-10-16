// Lógica de progreso fuera de la partida: gacha, colección, mejoras por personaje y misiones.
import { ROSTER, RARITY, GACHA, MISSIONS, TRAIN } from './data.js';

export const byId = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

export const CHAR_UPGRADES = {
  poder: { name: 'Poder', desc: '+6% de daño', max: 5 },
  vida: { name: 'Vitalidad', desc: '+12 de vida', max: 5 },
  velocidad: { name: 'Velocidad', desc: '+4% de velocidad', max: 5 },
  recarga: { name: 'Concentración', desc: '-4% de recarga', max: 5 },
};
export const upgradeCost = (lvl) => (lvl + 1) * 4;
export const MAX_STARS = 5;

// Solo se empieza con Goku. El regalo de bienvenida da cristales y tickets para las primeras invocaciones
// (las partidas guardadas de antes de los cristales también lo reciben una vez).
export function ensureStarters(save) {
  for (const id of GACHA.starters) {
    if (!save.roster[id]) save.roster[id] = { stars: 1, shards: 0, shiny: false, up: {} };
  }
  if (!save.welcomed2) {
    const w = GACHA.welcome;
    save.crystals += w.crystals;
    save.tickets += w.tickets;
    save.ticket10 += w.ticket10;
    if (!save.welcomed) save.zeni += w.zeni;
    save.welcomed = true;
    save.welcomed2 = true;
    return true;
  }
  return false;
}

// Recompensa diaria (una vez al día)
export function dailyReward(save) {
  const today = new Date().toISOString().slice(0, 10);
  if (save.lastDaily === today) return null;
  save.lastDaily = today;
  save.crystals += GACHA.daily.crystals;
  save.tickets += GACHA.daily.tickets;
  return GACHA.daily;
}

// Poder de combate de un guerrero con sus mejoras (para compararlo con la fase recomendada)
export function power(unit, entry, save) {
  const e = entry || { stars: 1, up: {}, lvl: 0 };
  const rar = RARITY[unit.rarity];
  const up = e.up || {};
  const m = save.upgrades || {};
  const stars = 1 + 0.06 * ((e.stars || 1) - 1);
  const train = 1 + TRAIN.bonus * (e.lvl || 0);
  const might = unit.stats.might * rar.mult * stars * (e.shiny ? 1.1 : 1) * train * (1 + 0.06 * (up.poder || 0)) * (1 + 0.05 * (m.poder || 0));
  const hp = (unit.stats.hp * rar.mult * stars + 12 * (up.vida || 0) + 10 * (m.vida || 0)) * train;
  return Math.round((1000 * might * Math.sqrt(hp / 100)) / 10) * 10;
}

// Entrenar a un guerrero con Zeni: +5% de daño y de vida por nivel
export function train(save, id) {
  const e = save.roster[id];
  if (!e) return false;
  const lvl = e.lvl || 0;
  const cost = TRAIN.cost(lvl);
  if (lvl >= TRAIN.max || save.zeni < cost) return false;
  save.zeni -= cost;
  e.lvl = lvl + 1;
  maxStat(save, 'maxTrain', e.lvl);
  return true;
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

// Formas de pago de una invocación de n (1 o 10): devuelve la que se puede usar (primero tickets).
export function payOptions(save, n) {
  const out = [];
  if (n === 10 && save.ticket10 > 0) out.push('ticket10');
  if (save.tickets >= n) out.push('tickets');
  if (save.crystals >= (n === 10 ? GACHA.cost10 : GACHA.cost1)) out.push('crystals');
  return out;
}

export function pull(save, saga, n, pay = payOptions(save, n)[0]) {
  if (!payOptions(save, n).includes(pay)) return null;
  if (pay === 'ticket10') save.ticket10--;
  else if (pay === 'tickets') save.tickets -= n;
  else save.crystals -= n === 10 ? GACHA.cost10 : GACHA.cost1;
  const units = [];
  for (let i = 0; i < n; i++) {
    // Pity: tras GACHA.pity invocaciones sin Legendario, el siguiente lo es seguro
    const u = save.pity + 1 >= GACHA.pity ? rollUnit(saga, 'L') : rollUnit(saga);
    save.pity = u.rarity === 'L' ? 0 : save.pity + 1;
    units.push(u);
  }
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
  save.crystals += m.crystals;
  return m;
}

// Aplica el resultado de una partida a las estadísticas.
export function applyRun(save, r) {
  addStat(save, 'runs');
  addStat(save, 'kills', r.kills);
  addStat(save, 'wishes', r.wishes);
  addStat(save, 'evolutions', r.evolutions);
  addStat(save, 'bonds', r.bonds || 0);
  addStat(save, 'ults', r.ults || 0);
  addStat(save, 'pods', r.pods || 0);
  save.crystals += r.crystals || 0;
  save.tickets += r.tickets || 0;
  save.ticket10 += r.ticket10 || 0;
  if (r.maxForm) addStat(save, 'maxForms');
  maxStat(save, 'maxLevel', r.level);
  maxStat(save, 'maxPhase', r.phase || 1);
  save.bestPhase = save.bestPhase || {};
  save.bestPhase[r.char.id] = Math.max(save.bestPhase[r.char.id] || 0, r.phase || 1);
  for (const b of r.bossesBeaten) addStat(save, 'boss_' + b);
  for (const id of r.itemsFound) if (!save.items.includes(id)) save.items.push(id);
  if (r.win && !save.winners.includes(r.char.id)) save.winners.push(r.char.id);
}
