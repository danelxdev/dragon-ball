// Pixel art propio generado a partir de cuadrículas de texto.
// Cada carácter de una fila es un píxel; '.' es transparente.

const OUTLINE = '#1a1020';

// ---------------------------------------------------------------------------
// Plantilla humanoide chibi (16x24). Claves:
// O contorno, S piel, s piel sombra, E ojos, G ropa, g ropa sombra,
// U camiseta interior, B cinturón, W muñequeras, K botas, L pantalón, l sombra
// ---------------------------------------------------------------------------
const BODY_TOP = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......OOOO......',
  '....OOSSSSOO....',
  '...OSSSSSSSSO...',
  '...OSSSSSSSSO...',
  '...OSESSSSESO...',
  '...OSESSSSESO...',
  '...OSSSSSSSSO...',
  '....OSSssSSO....',
  '.....OOSSOO.....',
  '...OOGGUUGGOO...',
  '..OSOGGUUGGOSO..',
  '..OSOGGGGGGOSO..',
  '..OWOBBBBBBOWO..',
  '..OSOLLLLLLOSO..',
  '...OOLLllLLOO...',
];
const LEGS_A = [
  '....OLLOOLLO....',
  '....OKKOOKKO....',
  '....OOOOOOOO....',
];
const LEGS_B = [
  '...OLLO..OLLO...',
  '...OKKO..OKKO...',
  '...OOOO..OOOO...',
];

// Capas de pelo / cabeza. '.' conserva la base, '_' borra.
export const HAIR = {
  goku: [
    '................',
    '................',
    '......O....O....',
    '.....OHO..OHO...',
    '..O.OHHHOOHHHO..',
    '.OHOHHHHHHHHHHO.',
    'OHHHHHHHHHHHHHHO',
    '.OHHHHhHHhHHHHO.',
    '..OHHHSHHSHHHO..',
    '..OH........HO..',
    '..OH........HO..',
  ],
  gohan: [
    '................',
    '................',
    '......O....O....',
    '.....OHO..OHO...',
    '..O.OHHHOOHHHO..',
    '.OHOHHHHHHHHHHO.',
    'OHHHHHHHHHHHHHHO',
    '.OHHHHhHHhHHHHO.',
    '..OHHHSHHSHHHO..',
    '..OH...H....HO..',
    '..OH........HO..',
  ],
  ssj: [
    '......O..O......',
    '.....OHOOHO..O..',
    '..O..OHHHHO.OHO.',
    '.OHO.OHHHHOOHHO.',
    '.OHHOHHHHHHHHHO.',
    '..OHHHHHHHHHHO..',
    '..OHHHHHHHHHHHO.',
    '..OHHHhHHhHHHO..',
    '..OHHHSHHSHHHO..',
  ],
  ssj3: [
    '......O..O......',
    '.....OHOOHO..O..',
    '..O..OHHHHO.OHO.',
    '.OHO.OHHHHOOHHO.',
    '.OHHOHHHHHHHHHO.',
    '..OHHHHHHHHHHO..',
    '..OHHHHHHHHHHHO.',
    '..OHHHhHHhHHHO..',
    '..OHHHSSSSHHHO..',
    '.OHH........HHO.',
    '.OHH........HHO.',
    '.OHH........HHO.',
    '.OHH........HHO.',
    '.OHH........HHO.',
    '.OHH........HHO.',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OO............OO',
  ],
  vegeta: [
    '.......OO.......',
    '......OHHO......',
    '.....OHHHHO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHhHHhHHO...',
    '...OHSSHHSSHO...',
  ],
  piccolo: [
    '................',
    '................',
    '................',
    '................',
    '.....OOOOOO.....',
    '....OTTTTTTO....',
    '...OTTTTTTTTO...',
    '..OTTTPPPPTTTO..',
    '..OTTTTTTTTTTO..',
    '...OOSSSSSSOO...',
    '..OS........SO..',
  ],
  krillin: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....s..s.......',
    '.......s..s.....',
  ],
  trunks: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '......OOOO......',
    '....OOHHHHOO....',
    '...OHHHHHHHHO...',
    '..OHHHHHHHHHHO..',
    '..OHHSSSSSSHHO..',
    '..OHH......HHO..',
    '..OHH......HHO..',
    '...OH......HO...',
  ],
  soldier: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OSSSSSSSCCO..',
    '...O.......CO...',
  ],
  celljr: [
    '................',
    '................',
    '................',
    '...OO......OO...',
    '...OHO....OHO...',
    '...OHHO..OHHO...',
    '...OHHHOOHHHO...',
    '...OHhHHHHhHO...',
  ],
  raditz: [
    '................',
    '................',
    '......O....O....',
    '.....OHO..OHO...',
    '..O.OHHHOOHHHO..',
    '.OHOHHHHHHHHHHO.',
    'OHHHHHHHHHHHHHHO',
    '.OHHHHhHHhHHHHO.',
    '.OHHHHSHHSHHHHO.',
    'OHHH........HHHO',
    'OHH..........HHO',
    'OHH..........HHO',
    'OHH..........HHO',
    'OHH..........HHO',
    'OHH..........HHO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OH............HO',
    'OO............OO',
  ],
  nappa: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '...OhSSSSSShO...',
    '...OhSSSSSShO...',
    '....OhhhhhhO....',
  ],
  freezer: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '......OPPO......',
    '....OPPPPPPO....',
    '...OPPPPPPPPO...',
  ],
  cell: [
    '................',
    '................',
    '................',
    '...OO......OO...',
    '...OHO....OHO...',
    '...OHHO..OHHO...',
    '...OHHHOOHHHO...',
    '...OHhHHHHhHO...',
    '...OHHHHHHHHO...',
  ],
  buu: [
    '................',
    '................',
    '.......OO.......',
    '......OSSO......',
    '......OSSO......',
    '.......OO.......',
  ],
};

function merge(base, over) {
  const out = base.slice();
  if (!over) return out;
  for (let y = 0; y < over.length && y < out.length; y++) {
    const row = out[y].split('');
    const o = over[y];
    for (let x = 0; x < o.length && x < row.length; x++) {
      const c = o[x];
      if (c === '.') continue;
      row[x] = c === '_' ? '.' : c;
    }
    out[y] = row.join('');
  }
  return out;
}

export function gridToCanvas(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === '_') continue;
      const col = ch === 'O' ? pal.O || OUTLINE : pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function flip(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

function silhouette(src, color) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

const DEFAULT_PAL = {
  E: OUTLINE,
  C: '#3fe07a',
  S: '#f4c39a',
  s: '#d99a6c',
};

// Devuelve { frames:[[derecha, izquierda], ...], white:[...] } cacheado.
const humanoidCache = new Map();
export function humanoid(key, hairKey, pal) {
  const cacheKey = key + '|' + hairKey;
  let entry = humanoidCache.get(cacheKey);
  if (entry) return entry;
  const full = { ...DEFAULT_PAL, ...pal };
  const hair = HAIR[hairKey];
  const frames = [LEGS_A, LEGS_B].map((legs) => {
    const rows = merge(BODY_TOP.concat(legs), hair);
    const right = gridToCanvas(rows, full);
    return [right, flip(right)];
  });
  const white = frames.map(([r, l]) => [silhouette(r, '#ffffff'), silhouette(l, '#ffffff')]);
  entry = { frames, white, w: 16, h: 24 };
  humanoidCache.set(cacheKey, entry);
  return entry;
}

// Criaturas pequeñas (saibaman / esbirro majin), 12x12.
const CRITTER_A = [
  '...OOOOOO...',
  '..OGGGGGGO..',
  '.OGgGGGGgGO.',
  '.OGRRGGRRGO.',
  '.OGGGGGGGGO.',
  '..OGgGGgGO..',
  '...OOGGOO...',
  '..OGGGGGGO..',
  '.OGOGGGGOGO.',
  '.OO.OGGO.OO.',
  '...OG..GO...',
  '...OO..OO...',
];
const CRITTER_B = CRITTER_A.slice(0, 10).concat(['..OG....GO..', '..OO....OO..']);

const critterCache = new Map();
export function critter(key, pal) {
  let entry = critterCache.get(key);
  if (entry) return entry;
  const frames = [CRITTER_A, CRITTER_B].map((rows) => {
    const r = gridToCanvas(rows, pal);
    return [r, flip(r)];
  });
  const white = frames.map(([r, l]) => [silhouette(r, '#ffffff'), silhouette(l, '#ffffff')]);
  entry = { frames, white, w: 12, h: 12 };
  critterCache.set(key, entry);
  return entry;
}

// Objetos ------------------------------------------------------------------
const ITEM_GRIDS = {
  dragonball: [
    '..OOOO..',
    '.OYYYYO.',
    'OYyRYYwO',
    'OYRRRYYO',
    'OYYRYYYO',
    'OYYYYYyO',
    '.OYYYyO.',
    '..OOOO..',
  ],
  senzu: [
    '.OOOO.',
    'OGGGgO',
    'OGgGGO',
    '.OOOO.',
  ],
  capsule: [
    '.OOOOOO.',
    'OWWWRRRO',
    'OWwWRrRO',
    '.OOOOOO.',
  ],
  zeni: [
    '.OOO.',
    'OYyYO',
    'OYOYO',
    'OYyYO',
    '.OOO.',
  ],
};
const ITEM_PAL = {
  Y: '#ffa31a', y: '#ffd27a', R: '#d42020', w: '#ffffff',
  G: '#5cc93a', g: '#2f7d1f',
  W: '#f4f4f4', r: '#ff8a8a',
};
const itemCache = new Map();
export function item(name) {
  let c = itemCache.get(name);
  if (!c) {
    const pal = name === 'zeni' ? { ...ITEM_PAL, Y: '#f0c419', y: '#fff3a0', O: '#7a5a00' } : ITEM_PAL;
    c = gridToCanvas(ITEM_GRIDS[name], pal);
    itemCache.set(name, c);
  }
  return c;
}

// Terreno ------------------------------------------------------------------
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

export function groundTile() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9a66b';
  ctx.fillRect(0, 0, size, size);
  const r = rng(7);
  const cols = ['#bf9a5e', '#d4b37a', '#b88f54', '#dcc08b'];
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = cols[(r() * cols.length) | 0];
    const w = r() < 0.8 ? 1 : 2;
    ctx.fillRect((r() * size) | 0, (r() * size) | 0, w, 1);
  }
  // piedrecitas
  for (let i = 0; i < 5; i++) {
    const x = (r() * (size - 3)) | 0;
    const y = (r() * (size - 3)) | 0;
    ctx.fillStyle = '#8c6a3d';
    ctx.fillRect(x, y + 1, 3, 1);
    ctx.fillStyle = '#a98352';
    ctx.fillRect(x, y, 2, 1);
  }
  return c;
}

const ROCK = [
  '.....OOOOO......',
  '...OORRRRrOO....',
  '..ORRRRRRRrrO...',
  '..ORRRRRRRRrO...',
  '.ORRRRRRRRRrrO..',
  '.ORRRRRRRRRRrO..',
  '.ODDDRRRRRRRrO..',
  '.ODDDDDDRRRRrO..',
  'ODDDDDDDDDDDdrO.',
  'ODDDDDDDDDDDddO.',
  '.OOOOOOOOOOOOO..',
];
const MESA = [
  '..OOOOOOOOOOOO..',
  '.ORRRRRRRRRRRrO.',
  '.ORRRRRRRRRRRrO.',
  '..ODDDDDDDDDdO..',
  '..ODDDDDDDDDdO..',
  '..ODDDDDDDDDdO..',
  '..ODDDDDDDDddO..',
  '...ODDDDDDDdO...',
  '...ODDDDDDDdO...',
  '...ODDDDDDddO...',
  '...ODDDDDDddO...',
  '..ODDDDDDDDddO..',
  '..ODDDDDDDDddO..',
  '.ODDDDDDDDDDddO.',
  '.OOOOOOOOOOOOOO.',
];
const ROCK_PAL = { R: '#b07a46', r: '#8a5a30', D: '#96643a', d: '#6e4524' };
export const decorSprites = () => ({
  rock: gridToCanvas(ROCK, ROCK_PAL),
  mesa: gridToCanvas(MESA, ROCK_PAL),
});

export { rng };
