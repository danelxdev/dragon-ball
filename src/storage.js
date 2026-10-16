// Guardado local: Zeni, mejoras permanentes, personajes desbloqueados y récords.

const KEY = 'dbsurvivors-save-v1';

const DEFAULT = () => ({
  zeni: 0,
  upgrades: {},
  unlocked: ['goku', 'vegeta', 'gohan', 'piccolo'],
  best: {}, // id personaje -> segundos
  wins: 0,
  muted: false,
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    return { ...DEFAULT(), ...JSON.parse(raw) };
  } catch {
    return DEFAULT();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // almacenamiento no disponible (modo privado, etc.)
  }
}
