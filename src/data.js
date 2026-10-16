// Datos del juego: personajes, técnicas, pasivas, enemigos y oleadas.
// `sprite` es el id de la hoja en assets/chars (ver tools/build_assets.py).

export const CHARACTERS = [
  {
    id: 'goku', name: 'Goku', cost: 0, weapon: 'kamehameha', sprite: 'goku', portrait: 'goku',
    desc: 'Saiyajin criado en la Tierra. Equilibrado en todo.',
    stats: { hp: 100, speed: 1, might: 1 },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', sprite: 'goku_ssj', portrait: 'goku_ssj', aura: '#ffe14a', might: 0.25, speed: 0.08 },
      { lvl: 20, name: 'Super Saiyajin 2', sprite: 'goku_ssj', portrait: 'goku_ssj', aura: '#fff07a', sparks: true, might: 0.5, speed: 0.12 },
      { lvl: 30, name: 'Super Saiyajin 3', sprite: 'goku_ssj3', portrait: 'goku_ssj3', aura: '#ffd000', sparks: true, big: true, might: 0.9, speed: 0.15 },
    ],
  },
  {
    id: 'vegeta', name: 'Vegeta', cost: 0, weapon: 'galick', sprite: 'vegeta', portrait: 'vegeta',
    desc: 'El príncipe de los Saiyajin. Más daño, menos vida.',
    stats: { hp: 85, speed: 1, might: 1.15 },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', sprite: 'vegeta_ssj', portrait: 'vegeta_ssj', aura: '#ffe14a', might: 0.25, speed: 0.08 },
      { lvl: 20, name: 'Super Vegeta', sprite: 'vegeta_ssj', portrait: 'vegeta_ssj', aura: '#ffd84a', might: 0.5, speed: 0.1 },
      { lvl: 30, name: 'Majin Vegeta', sprite: 'vegeta_ssj', portrait: 'vegeta_ssj', aura: '#ffe14a', sparks: true, big: true, might: 0.95, speed: 0.15 },
    ],
  },
  {
    id: 'gohan', name: 'Gohan', cost: 0, weapon: 'masenko', sprite: 'gohan', portrait: 'gohan',
    desc: 'Poder oculto inmenso. Recibe más experiencia.',
    stats: { hp: 95, speed: 1.03, might: 1, growth: 0.1 },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', sprite: 'gohan_ssj', portrait: 'gohan_ssj', aura: '#ffe14a', might: 0.25, speed: 0.08 },
      { lvl: 20, name: 'Super Saiyajin 2', sprite: 'gohan_ssj', portrait: 'gohan_ssj', aura: '#fff07a', sparks: true, might: 0.55, speed: 0.12 },
      { lvl: 30, name: 'Gohan Definitivo', sprite: 'gohan_ult', portrait: 'gohan_ult', aura: '#ffffff', big: true, might: 1.0, speed: 0.15 },
    ],
  },
  {
    id: 'goten', name: 'Goten', cost: 400, weapon: 'kiblast', sprite: 'goten', portrait: 'goten',
    desc: 'El hijo pequeño de Goku. Rápido y con más imán.',
    stats: { hp: 90, speed: 1.1, might: 1, magnet: 0.3 },
    forms: [
      { lvl: 10, name: 'Super Saiyajin', sprite: 'goten_ssj', portrait: 'goten_ssj', aura: '#ffe14a', might: 0.3, speed: 0.1 },
      { lvl: 20, name: 'Super Saiyajin al máximo', sprite: 'goten_ssj', portrait: 'goten_ssj', aura: '#fff07a', sparks: true, might: 0.65, speed: 0.15 },
    ],
  },
  {
    id: 'saiyaman', name: 'Gran Saiyaman', cost: 800, weapon: 'bakuhatsuha', sprite: 'saiyaman', portrait: 'saiyaman',
    desc: '¡El héroe de la justicia! Mucha vida y daño desde el principio.',
    stats: { hp: 120, speed: 1.05, might: 1.2, regen: 0.3 },
    forms: [
      { lvl: 15, name: '¡Justicia implacable!', sprite: 'saiyaman', portrait: 'saiyaman', aura: '#ff6a6a', might: 0.4, speed: 0.1 },
      { lvl: 30, name: 'Poder definitivo', sprite: 'gohan_ult', portrait: 'gohan_ult', aura: '#ffffff', big: true, might: 1.0, speed: 0.15 },
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
    name: 'Espada de Energía', color: '#e0f0ff', kind: 'slash',
    desc: 'Tajo de energía en arco frente a ti.',
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
  tiger: { name: 'Bandido Tigre', sprite: 'tiger', hp: 7, speed: 54, dmg: 5, xp: 1, r: 6 },
  soldier: { name: 'Soldado', sprite: 'soldier', hp: 18, speed: 46, dmg: 8, xp: 2, r: 6 },
  wolf: {
    name: 'Bandido Lobo', sprite: 'wolf', hp: 30, speed: 60, dmg: 10, xp: 3, r: 6,
    ranged: { range: 130, cd: 4, speed: 130, dmg: 4, fx: 'bullet' },
  },
  mohawk: {
    name: 'Lanzacohetes', sprite: 'mohawk', hp: 70, speed: 50, dmg: 14, xp: 6, r: 7,
    ranged: { range: 170, cd: 5, speed: 105, dmg: 6, fx: 'rocket' },
  },
};

export const BOSSES = {
  puipui: { name: 'Pui Pui', sprite: 'puipui', scale: 2, r: 16, hp: 650, speed: 52, dmg: 15, xp: 60, color: '#ff6a6a' },
  a17: { name: 'Androide 17', sprite: 'a17', scale: 2, r: 12, hp: 1100, speed: 60, dmg: 20, xp: 80, color: '#7ad8ff' },
  a18: { name: 'Androide 18', sprite: 'a18', scale: 2, r: 12, hp: 1100, speed: 60, dmg: 20, xp: 80, color: '#ffe07a' },
  freezer: { name: 'Freezer', sprite: 'freezer', scale: 2, r: 12, hp: 4200, speed: 62, dmg: 25, xp: 220, color: '#c77bff' },
  cell: { name: 'Cell', sprite: 'cell', scale: 2, r: 12, hp: 8500, speed: 66, dmg: 30, xp: 350, color: '#5fe07a' },
  buu: { name: 'Majin Buu', sprite: 'buu', scale: 2, r: 12, hp: 15000, speed: 72, dmg: 35, xp: 500, color: '#ff8ac8' },
};

// Composición de oleadas según el tiempo (segundos).
export const WAVES = [
  { t: 0, types: ['tiger'], rate: 3.5 },
  { t: 60, types: ['tiger', 'tiger', 'soldier'], rate: 6 },
  { t: 150, types: ['soldier', 'tiger', 'wolf'], rate: 8 },
  { t: 240, types: ['soldier', 'wolf'], rate: 10 },
  { t: 360, types: ['wolf', 'soldier', 'mohawk'], rate: 12 },
  { t: 480, types: ['wolf', 'mohawk', 'soldier'], rate: 14 },
  { t: 600, types: ['mohawk', 'wolf'], rate: 16 },
  { t: 720, types: ['mohawk', 'wolf', 'soldier'], rate: 19 },
];

export const BOSS_SCHEDULE = [
  { t: 120, id: 'puipui' },
  { t: 270, id: 'a17' },
  { t: 270, id: 'a18' },
  { t: 450, id: 'freezer' },
  { t: 630, id: 'cell' },
  { t: 810, id: 'buu' },
];

// Zonas: el suelo cambia con el tiempo. `decor` son pares [id, peso];
// `flat` se dibuja pegado al suelo y `big` son piezas enormes poco frecuentes.
export const BIOMES = [
  {
    t: 0, name: 'Monte Paoz', tile: 'earth',
    decor: [['pine', 5], ['pine2', 5], ['spire', 1], ['spire2', 1], ['stump', 1], ['stump2', 1], ['stumps', 1],
      ['pillar', 2], ['boulder', 1], ['rock', 3], ['rock2', 3]],
    flat: [['dirt', 3], ['dirt2', 3], ['dirt3', 1]],
    big: [],
  },
  {
    t: 300, name: 'Planeta Namek', tile: 'namek',
    decor: [['ntree', 5], ['ntree2', 5], ['nrock', 3], ['nrock2', 3], ['nplant', 3]],
    flat: [['sand', 2]],
    big: [['volcano', 1]],
  },
  {
    t: 600, name: 'Namek en destrucción', tile: 'namekd',
    decor: [['dtree', 5], ['drock', 4], ['drock2', 4]],
    flat: [],
    big: [['lavavolcano', 1]],
  },
];

export const HORDES = [180, 360, 540, 720];

export const WIN_TIME = 900; // 15 minutos
