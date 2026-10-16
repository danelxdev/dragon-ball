// Guardado local: Zeni, Cristales de Ki, tickets, colección de personajes, objetos, mejoras, estadísticas y misiones.

const KEY = 'dbsurvivors-save-v2';
const OLD_KEY = 'dbsurvivors-save-v1';

const DEFAULT = () => ({
  zeni: 0,
  crystals: 0, // Cristales de Ki (invocación)
  tickets: 0, // tickets de invocación x1
  ticket10: 0, // tickets de invocación x10
  pity: 0, // invocaciones seguidas sin Legendario
  lastDaily: '', // fecha de la última recompensa diaria
  musicVol: 0.6,
  sfxVol: 0.8,
  welcomed2: false, // regalo de cristales al llegar la versión con cristales
  upgrades: {}, // mejoras globales (tienda)
  roster: {}, // id -> { stars, shards, shiny, up: { poder, vida, velocidad, recarga } }
  items: [], // objetos conseguidos
  equipped: null,
  selected: 'goku_s',
  stats: {},
  claimed: [], // misiones cobradas
  best: {}, // id personaje -> segundos
  winners: [], // personajes con los que has ganado
  wins: 0,
  muted: false,
  welcomed: false,
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT(), ...JSON.parse(raw) };
    // Migración desde la versión anterior: se conservan Zeni y mejoras
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      return { ...DEFAULT(), zeni: o.zeni || 0, upgrades: o.upgrades || {}, muted: !!o.muted };
    }
  } catch {
    // datos corruptos o almacenamiento no disponible
  }
  return DEFAULT();
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // almacenamiento no disponible (modo privado, etc.)
  }
}
