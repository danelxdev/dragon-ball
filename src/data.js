// Datos del juego: personajes, técnicas, pasivas, enemigos y oleadas.

const GOKU_PAL = {
  H: '#1b1b2b', h: '#3a3a55',
  G: '#f07a1a', g: '#c45a0c', U: '#2547a8', B: '#2547a8', W: '#2547a8', K: '#2547a8',
  L: '#f07a1a', l: '#c45a0c',
};
const GOLD = { H: '#ffe14a', h: '#f0b020' };

export const CHARACTERS = [
  {
    id: 'goku', name: 'Goku', cost: 0, weapon: 'kamehameha',
    desc: 'Saiyajin criado en la Tierra. Equilibrado en todo.',
    stats: { hp: 100, speed: 1, might: 1 },
    look: { hair: 'goku', pal: GOKU_PAL },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', hair: 'ssj', pal: GOLD, aura: '#ffe14a', might: 0.25, speed: 0.08 },
      { lvl: 20, name: 'Super Saiyajin 2', hair: 'ssj', pal: GOLD, aura: '#fff07a', sparks: true, might: 0.5, speed: 0.12 },
      { lvl: 30, name: 'Super Saiyajin 3', hair: 'ssj3', pal: GOLD, aura: '#ffd000', sparks: true, might: 0.9, speed: 0.15 },
    ],
  },
  {
    id: 'vegeta', name: 'Vegeta', cost: 0, weapon: 'galick',
    desc: 'El príncipe de los Saiyajin. Más daño, menos vida.',
    stats: { hp: 85, speed: 1, might: 1.15 },
    look: {
      hair: 'vegeta',
      pal: {
        H: '#1b1b2b', h: '#3a3a55', G: '#2e4fb8', g: '#1f3a8a', U: '#f2f2f2', B: '#f2f2f2',
        W: '#f2f2f2', K: '#f2f2f2', L: '#2e4fb8', l: '#1f3a8a',
      },
    },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', pal: GOLD, aura: '#ffe14a', might: 0.25, speed: 0.08 },
      { lvl: 20, name: 'Super Vegeta', pal: GOLD, aura: '#ffd84a', might: 0.5, speed: 0.1 },
      { lvl: 30, name: 'Majin Vegeta', pal: { ...GOLD, E: '#5a0a0a' }, aura: '#ffe14a', sparks: true, might: 0.95, speed: 0.15 },
    ],
  },
  {
    id: 'gohan', name: 'Gohan', cost: 0, weapon: 'masenko',
    desc: 'Poder oculto inmenso. Recibe más experiencia.',
    stats: { hp: 95, speed: 1.03, might: 1, growth: 0.1 },
    look: {
      hair: 'gohan',
      pal: {
        H: '#1b1b2b', h: '#3a3a55', G: '#5b3aa0', g: '#432a7a', U: '#5b3aa0', B: '#c0302a',
        W: '#c0302a', K: '#6b3a1a', L: '#5b3aa0', l: '#432a7a',
      },
    },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', hair: 'ssj', pal: GOLD, aura: '#ffe14a', might: 0.25, speed: 0.08 },
      { lvl: 20, name: 'Super Saiyajin 2', hair: 'ssj', pal: GOLD, aura: '#fff07a', sparks: true, might: 0.55, speed: 0.12 },
      { lvl: 30, name: 'Gohan Definitivo', aura: '#ffffff', might: 1.0, speed: 0.15 },
    ],
  },
  {
    id: 'piccolo', name: 'Piccolo', cost: 0, weapon: 'makanko',
    desc: 'Guerrero namekiano. Se regenera con el tiempo.',
    stats: { hp: 110, speed: 0.97, might: 1, regen: 0.4 },
    look: {
      hair: 'piccolo',
      pal: {
        S: '#5fae3a', s: '#3f7f25', G: '#4b2a7a', g: '#351d58', U: '#4b2a7a', B: '#3a6fd8',
        W: '#6b3a1a', K: '#6b3a1a', L: '#4b2a7a', l: '#351d58', T: '#f2f2f2', P: '#6a3aa0',
      },
    },
    forms: [
      { lvl: 10, name: 'Fusión con Nail', aura: '#b8ff9a', might: 0.2, speed: 0.06, regen: 0.4 },
      { lvl: 20, name: 'Fusión con Kami', aura: '#e6ffe0', might: 0.45, speed: 0.1, regen: 0.8 },
      { lvl: 30, name: 'Piccolo Despertado', pal: { G: '#2a1450', U: '#2a1450', L: '#2a1450' }, aura: '#ffffff', sparks: true, might: 0.8, speed: 0.12, regen: 1.2 },
    ],
  },
  {
    id: 'krillin', name: 'Krilin', cost: 400, weapon: 'kienzan',
    desc: 'El humano más fuerte. Rápido y con más imán.',
    stats: { hp: 90, speed: 1.1, might: 1, magnet: 0.3 },
    look: { hair: 'krillin', pal: { ...GOKU_PAL, s: '#c98b5c' } },
    forms: [
      { lvl: 10, name: 'Potencial liberado', aura: '#ffffff', might: 0.3, speed: 0.1 },
      { lvl: 20, name: 'Maestro del Kienzan', aura: '#ffe9a8', might: 0.6, speed: 0.15 },
    ],
  },
  {
    id: 'trunks', name: 'Trunks', cost: 800, weapon: 'sword',
    desc: 'Viene del futuro con su espada. Mucho daño cuerpo a cuerpo.',
    stats: { hp: 100, speed: 1.05, might: 1.1 },
    look: {
      hair: 'trunks',
      pal: {
        H: '#b79be0', h: '#8f73c0', G: '#3b4a8a', g: '#2a3566', U: '#1b1b2b', B: '#e8c23a',
        W: '#e8c23a', K: '#e8c23a', L: '#555566', l: '#3a3a48',
      },
    },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', pal: GOLD, aura: '#ffe14a', might: 0.3, speed: 0.08 },
      { lvl: 20, name: 'Super Trunks', pal: GOLD, aura: '#ffd84a', sparks: true, might: 0.65, speed: 0.12 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Técnicas (armas). Cada nivel tiene sus estadísticas completas.
// ---------------------------------------------------------------------------
export const WEAPONS = {
  kiblast: {
    name: 'Ráfaga de Ki', color: '#ffe36a', kind: 'projectile',
    desc: 'Lanza esferas de ki al enemigo más cercano.',
    levels: [
      { dmg: 8, cd: 0.85, count: 1, speed: 260, size: 3, pierce: 1 },
      { dmg: 8, cd: 0.85, count: 2, speed: 260, size: 3, pierce: 1 },
      { dmg: 11, cd: 0.8, count: 2, speed: 280, size: 3, pierce: 2 },
      { dmg: 11, cd: 0.7, count: 3, speed: 280, size: 4, pierce: 2 },
      { dmg: 15, cd: 0.6, count: 4, speed: 300, size: 4, pierce: 3 },
    ],
  },
  kamehameha: {
    name: 'Kamehameha', color: '#8fe3ff', kind: 'beam',
    desc: 'Rayo devastador hacia el enemigo más cercano.',
    levels: [
      { dmg: 7, cd: 2.2, len: 150, width: 12, dur: 0.6, aim: true },
      { dmg: 9, cd: 2.1, len: 170, width: 13, dur: 0.6, aim: true },
      { dmg: 11, cd: 1.9, len: 200, width: 15, dur: 0.7, aim: true },
      { dmg: 13, cd: 1.7, len: 220, width: 16, dur: 0.7, aim: true },
      { dmg: 16, cd: 1.5, len: 260, width: 20, dur: 0.8, aim: true, dual: true },
    ],
  },
  galick: {
    name: 'Galick Ho', color: '#c77bff', kind: 'beam',
    desc: 'Rayo púrpura apuntado al enemigo más cercano.',
    levels: [
      { dmg: 8, cd: 2.1, len: 140, width: 11, dur: 0.5, aim: true },
      { dmg: 10, cd: 2.0, len: 160, width: 12, dur: 0.5, aim: true },
      { dmg: 12, cd: 1.8, len: 190, width: 14, dur: 0.6, aim: true },
      { dmg: 15, cd: 1.6, len: 210, width: 15, dur: 0.6, aim: true },
      { dmg: 19, cd: 1.4, len: 250, width: 18, dur: 0.7, aim: true, dual: true },
    ],
  },
  masenko: {
    name: 'Masenko', color: '#fff27a', kind: 'wave',
    desc: 'Onda de energía que atraviesa enemigos.',
    levels: [
      { dmg: 13, cd: 1.3, speed: 200, size: 7, pierce: 4, count: 1 },
      { dmg: 13, cd: 1.2, speed: 210, size: 7, pierce: 6, count: 1 },
      { dmg: 15, cd: 1.2, speed: 210, size: 8, pierce: 6, count: 2 },
      { dmg: 20, cd: 1.05, speed: 220, size: 8, pierce: 8, count: 2 },
      { dmg: 24, cd: 0.95, speed: 230, size: 11, pierce: 12, count: 3 },
    ],
  },
  makanko: {
    name: 'Makankosappo', color: '#ffb84a', kind: 'beam',
    desc: 'Rayo en espiral fino y perforante. Mucho daño por golpe.',
    levels: [
      { dmg: 32, cd: 1.8, len: 220, width: 6, dur: 0.25, aim: true, once: true },
      { dmg: 40, cd: 1.7, len: 240, width: 6, dur: 0.25, aim: true, once: true },
      { dmg: 50, cd: 1.6, len: 260, width: 7, dur: 0.25, aim: true, once: true },
      { dmg: 60, cd: 1.4, len: 280, width: 8, dur: 0.25, aim: true, once: true },
      { dmg: 80, cd: 1.2, len: 320, width: 9, dur: 0.3, aim: true, once: true, dual: true },
    ],
  },
  kienzan: {
    name: 'Kienzan', color: '#ffe9a8', kind: 'disc',
    desc: 'Disco cortante que va y vuelve atravesándolo todo.',
    levels: [
      { dmg: 20, cd: 1.9, speed: 230, count: 1, range: 190 },
      { dmg: 26, cd: 1.8, speed: 240, count: 1, range: 210 },
      { dmg: 26, cd: 1.7, speed: 240, count: 2, range: 220 },
      { dmg: 34, cd: 1.5, speed: 260, count: 2, range: 240 },
      { dmg: 42, cd: 1.3, speed: 270, count: 3, range: 260 },
    ],
  },
  taiyoken: {
    name: 'Taiyoken', color: '#ffffff', kind: 'flash',
    desc: 'Destello solar que paraliza a los enemigos cercanos.',
    levels: [
      { dmg: 5, cd: 7, radius: 110, stun: 2 },
      { dmg: 8, cd: 6.5, radius: 120, stun: 2.2 },
      { dmg: 10, cd: 6, radius: 135, stun: 2.5 },
      { dmg: 14, cd: 5.5, radius: 150, stun: 2.8 },
      { dmg: 20, cd: 5, radius: 170, stun: 3.2 },
    ],
  },
  aura: {
    name: 'Aura de Ki', color: '#9fd8ff', kind: 'aura',
    desc: 'Tu aura daña a los enemigos que se acercan.',
    levels: [
      { dmg: 3, cd: 0.35, radius: 34 },
      { dmg: 4, cd: 0.35, radius: 40 },
      { dmg: 5, cd: 0.32, radius: 46 },
      { dmg: 7, cd: 0.3, radius: 52 },
      { dmg: 9, cd: 0.28, radius: 60 },
    ],
  },
  bakuhatsuha: {
    name: 'Bakuhatsuha', color: '#ff9a4a', kind: 'ring',
    desc: 'Explosión de ki en anillo alrededor de ti.',
    levels: [
      { dmg: 16, cd: 4, maxR: 110 },
      { dmg: 20, cd: 3.8, maxR: 120 },
      { dmg: 26, cd: 3.5, maxR: 135 },
      { dmg: 32, cd: 3.2, maxR: 150 },
      { dmg: 42, cd: 2.8, maxR: 175 },
    ],
  },
  orbit: {
    name: 'Esferas de Energía', color: '#7affc2', kind: 'orbit',
    desc: 'Esferas que giran a tu alrededor golpeando enemigos.',
    levels: [
      { dmg: 9, count: 2, radius: 42, spin: 3.2 },
      { dmg: 9, count: 3, radius: 44, spin: 3.4 },
      { dmg: 13, count: 3, radius: 46, spin: 3.6 },
      { dmg: 13, count: 4, radius: 50, spin: 3.8 },
      { dmg: 18, count: 5, radius: 56, spin: 4.2 },
    ],
  },
  genkidama: {
    name: 'Genkidama', color: '#9ad8ff', kind: 'bomb',
    desc: 'La energía de todos en una esfera gigante.',
    levels: [
      { dmg: 120, cd: 9, speed: 70, size: 12, blast: 70 },
      { dmg: 160, cd: 8.5, speed: 75, size: 13, blast: 80 },
      { dmg: 200, cd: 8, speed: 80, size: 15, blast: 90 },
      { dmg: 250, cd: 7.5, speed: 85, size: 17, blast: 100 },
      { dmg: 320, cd: 6.5, speed: 90, size: 20, blast: 120 },
    ],
  },
  sword: {
    name: 'Espada del Futuro', color: '#e0f0ff', kind: 'slash',
    desc: 'Tajo en arco frente a ti.',
    levels: [
      { dmg: 22, cd: 1.1, range: 44, arc: 2.0 },
      { dmg: 28, cd: 1.05, range: 48, arc: 2.1 },
      { dmg: 28, cd: 1.0, range: 50, arc: 2.2, back: true },
      { dmg: 36, cd: 0.85, range: 54, arc: 2.3, back: true },
      { dmg: 48, cd: 0.75, range: 62, arc: 2.6, back: true },
    ],
  },
};

// ---------------------------------------------------------------------------
// Pasivas
// ---------------------------------------------------------------------------
export const PASSIVES = {
  poder: { name: 'Entrenamiento a 100G', color: '#ff6a4a', desc: '+10% de daño.', max: 5 },
  vida: { name: 'Cuerpo de guerrero', color: '#ff4a7a', desc: '+20 de vida máxima.', max: 5 },
  velocidad: { name: 'Entrenamiento con Kaio', color: '#4affd0', desc: '+7% de velocidad.', max: 5 },
  armadura: { name: 'Armadura Saiyajin', color: '#c0c0d0', desc: '-1 daño recibido por golpe.', max: 5 },
  concentracion: { name: 'Concentración de Ki', color: '#6aa8ff', desc: '-7% de recarga de técnicas.', max: 5 },
  control: { name: 'Control de Ki', color: '#c08aff', desc: '+10% de área y alcance.', max: 5 },
  meditacion: { name: 'Meditación', color: '#7aff6a', desc: '+0,3 de vida por segundo.', max: 5 },
  radar: { name: 'Radar del Dragón', color: '#ffb02a', desc: '+25% de radio de recogida.', max: 5 },
  multiplicacion: { name: 'Técnica de Multiplicación', color: '#ffe14a', desc: '+1 proyectil en técnicas.', max: 2 },
  crecimiento: { name: 'Sala del Tiempo', color: '#ffffff', desc: '+8% de experiencia.', max: 5 },
};

export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

// ---------------------------------------------------------------------------
// Mejoras permanentes (tienda con Zeni)
// ---------------------------------------------------------------------------
export const META = {
  poder: { name: 'Poder', desc: '+5% de daño', max: 5, cost: 60 },
  vida: { name: 'Vitalidad', desc: '+10 de vida máxima', max: 5, cost: 50 },
  velocidad: { name: 'Agilidad', desc: '+4% de velocidad', max: 5, cost: 60 },
  armadura: { name: 'Resistencia', desc: '+1 de armadura', max: 3, cost: 120 },
  iman: { name: 'Atracción', desc: '+10% de radio de recogida', max: 5, cost: 40 },
  regen: { name: 'Recuperación', desc: '+0,15 de vida por segundo', max: 5, cost: 70 },
  reroll: { name: 'Elección', desc: '+1 cambio de opciones por partida', max: 3, cost: 100 },
  crecimiento: { name: 'Crecimiento', desc: '+5% de experiencia', max: 5, cost: 70 },
  avaricia: { name: 'Avaricia', desc: '+10% de Zeni', max: 5, cost: 80 },
};

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------
export const ENEMIES = {
  saibaman: {
    name: 'Saibaman', sprite: 'critter', pal: { G: '#4fb83a', g: '#2f7d1f', R: '#d42020' },
    hp: 7, speed: 54, dmg: 5, xp: 1, r: 5,
  },
  soldier: {
    name: 'Soldado de Freezer', sprite: 'humanoid', hair: 'soldier',
    pal: {
      H: '#2a2a3a', S: '#9ad0ff', s: '#6aa0d0', G: '#f2f2f2', g: '#c8c8d8', U: '#2a2a50', B: '#e0c050',
      W: '#f2f2f2', K: '#f2f2f2', L: '#2a2a50', l: '#1a1a35',
    },
    hp: 18, speed: 46, dmg: 8, xp: 2, r: 6,
  },
  celljr: {
    name: 'Cell Jr.', sprite: 'humanoid', hair: 'celljr',
    pal: {
      H: '#4aa0ff', h: '#2a6ad0', S: '#9ad8ff', s: '#6ab0e0', G: '#4aa0ff', g: '#2a6ad0', U: '#2a2a50',
      B: '#2a2a50', W: '#2a2a50', K: '#2a2a50', L: '#4aa0ff', l: '#2a6ad0',
    },
    hp: 38, speed: 74, dmg: 10, xp: 4, r: 6,
  },
  majin: {
    name: 'Esbirro Majin', sprite: 'critter', pal: { G: '#ff8ac8', g: '#d0609a', R: '#1a1020' },
    hp: 75, speed: 58, dmg: 14, xp: 6, r: 6,
  },
};

const SAIYAN_ARMOR = {
  G: '#f2f2f2', g: '#c8c8d8', U: '#1f2a66', B: '#c09040', W: '#f2f2f2', K: '#f2f2f2',
  L: '#1f2a66', l: '#151d4a',
};

export const BOSSES = {
  raditz: {
    name: 'Raditz', hair: 'raditz', pal: { ...SAIYAN_ARMOR, H: '#1b1b2b', h: '#3a3a55' },
    hp: 650, speed: 52, dmg: 15, xp: 60, color: '#ff6a6a',
  },
  nappa: {
    name: 'Nappa', hair: 'nappa', pal: { ...SAIYAN_ARMOR, h: '#1b1b2b' },
    hp: 1600, speed: 46, dmg: 20, xp: 120, color: '#ffb04a',
  },
  freezer: {
    name: 'Freezer', hair: 'freezer',
    pal: {
      S: '#f4f0f8', s: '#cfc4dc', E: '#c01030', P: '#9a4ad8', G: '#f4f0f8', g: '#cfc4dc', U: '#9a4ad8',
      B: '#f4f0f8', W: '#f4f0f8', K: '#f4f0f8', L: '#f4f0f8', l: '#cfc4dc',
    },
    hp: 4200, speed: 62, dmg: 25, xp: 220, color: '#c77bff',
  },
  cell: {
    name: 'Cell', hair: 'cell',
    pal: {
      H: '#3fae5a', h: '#1b1b2b', S: '#e8d8ee', s: '#c4b0cc', G: '#3fae5a', g: '#1b1b2b', U: '#1b1b2b',
      B: '#1b1b2b', W: '#3fae5a', K: '#e8d8ee', L: '#3fae5a', l: '#1b1b2b',
    },
    hp: 8500, speed: 66, dmg: 30, xp: 350, color: '#5fe07a',
  },
  buu: {
    name: 'Majin Buu', hair: 'buu',
    pal: {
      S: '#ff9ccc', s: '#e070a8', E: '#1a1020', G: '#ff9ccc', g: '#e070a8', U: '#ff9ccc', B: '#1b1b2b',
      W: '#f0d040', K: '#1b1b2b', L: '#f4f4f4', l: '#c8c8d8',
    },
    hp: 15000, speed: 72, dmg: 35, xp: 500, color: '#ff8ac8',
  },
};

// Composición de oleadas según el tiempo (segundos).
export const WAVES = [
  { t: 0, types: ['saibaman'], rate: 3.5 },
  { t: 60, types: ['saibaman', 'saibaman', 'soldier'], rate: 6 },
  { t: 150, types: ['soldier', 'saibaman'], rate: 8 },
  { t: 240, types: ['soldier', 'celljr'], rate: 10 },
  { t: 360, types: ['celljr', 'soldier'], rate: 12 },
  { t: 480, types: ['celljr', 'majin'], rate: 14 },
  { t: 600, types: ['majin', 'celljr'], rate: 16 },
  { t: 720, types: ['majin', 'celljr', 'soldier'], rate: 19 },
];

export const BOSS_SCHEDULE = [
  { t: 120, id: 'raditz' },
  { t: 270, id: 'nappa' },
  { t: 450, id: 'freezer' },
  { t: 630, id: 'cell' },
  { t: 810, id: 'buu' },
];

export const HORDES = [180, 360, 540, 720];

export const WIN_TIME = 900; // 15 minutos
