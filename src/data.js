// Datos del juego: sagas, personajes coleccionables, técnicas, objetos, misiones y enemigos.
// `sprite` es el id de la tira en assets/heroes (ver tools/build_sagas.py).

export const SAGAS = [
  { id: 'saiyan', name: 'Dragon Ball y Saiyajin', color: '#ff9a3a' },
  { id: 'freezer', name: 'Saga Freezer', color: '#b07aff' },
  { id: 'cell', name: 'Saga Cell', color: '#5fe07a' },
  { id: 'buu', name: 'Saga Buu', color: '#ff7ab8' },
  { id: 'movies', name: 'Películas y GT', color: '#ff5a5a' },
  { id: 'super', name: 'Dragon Ball Super', color: '#5ab8ff' },
];

export const RARITY = {
  C: { name: 'Común', color: '#b8c4d0', stars: 1, rate: 55, mult: 1, shards: 3 },
  R: { name: 'Raro', color: '#4ab0ff', stars: 2, rate: 30, mult: 1.08, shards: 5 },
  E: { name: 'Épico', color: '#c77bff', stars: 3, rate: 12, mult: 1.16, shards: 8 },
  L: { name: 'Legendario', color: '#ffd23a', stars: 4, rate: 3, mult: 1.25, shards: 15 },
};

// Las invocaciones se pagan con Cristales de Ki o con tickets (x1 y x10). El Zeni es para mejoras y objetos.
// `pity`: a las N invocaciones sin Legendario, el siguiente lo es seguro.
export const GACHA = {
  cost1: 150, cost10: 1350, shinyRate: 3, starters: ['goku_s'], pity: 70,
  welcome: { crystals: 1500, tickets: 3, ticket10: 1, zeni: 300 },
  daily: { crystals: 150, tickets: 1 },
};

// Personajes coleccionables. `forms` son sus evoluciones dentro de la partida: se
// alcanzan al llegar al nivel indicado. La primera forma es la inicial.
const f = (lvl, name, sprite, extra = {}) => ({ lvl, name, sprite, ...extra });
export const ROSTER = [
  // --- Dragon Ball y Saga Saiyajin ---
  { id: 'goku_kid', name: 'Goku (niño)', saga: 'saiyan', rarity: 'C', weapon: 'kamehameha', stats: { hp: 90, speed: 1.08, might: 0.98 },
    desc: 'El niño con cola que busca las Bolas de Dragón.', forms: [f(1, 'Goku niño', 'goku_kid'), f(14, 'Entrenado por el Duende Tortuga', 'goku_kid', { aura: '#ffd27a', might: 0.35, speed: 0.12 })] },
  { id: 'goku_gt_kid', name: 'Goku (GT)', saga: 'movies', rarity: 'E', weapon: 'kamehameha', stats: { hp: 100, speed: 1.1, might: 1.1 },
    desc: 'Convertido en niño por las Bolas de Dragón definitivas.', forms: [f(1, 'Goku GT', 'goku_gt_kid'), f(10, 'Super Saiyajin', 'goku_gt_kid', { aura: '#ffe14a', might: 0.3 }),
      f(24, 'Super Saiyajin 4', 'goku_ssj4', { aura: '#ff4a4a', sparks: true, might: 0.8, speed: 0.15 })] },
  { id: 'tien', name: 'Ten Shin Han', saga: 'saiyan', rarity: 'R', weapon: 'kikoho', stats: { hp: 105, speed: 1, might: 1.05, armor: 1 },
    desc: 'El guerrero de los tres ojos y el Kikoho.', forms: [f(1, 'Ten Shin Han', 'tien'), f(16, 'Shin Kikoho', 'tien', { aura: '#ffe36a', might: 0.45, speed: 0.08 })] },
  // --- Saga Saiyajin ---
  { id: 'goku_s', name: 'Goku', saga: 'saiyan', rarity: 'R', weapon: 'kamehameha', stats: { hp: 100, speed: 1, might: 1 },
    desc: 'El Saiyajin criado en la Tierra.', forms: [f(1, 'Goku', 'goku'), f(12, 'Kaioken', 'goku_kaioken', { aura: '#ff5a5a', might: 0.35, speed: 0.12 })] },
  { id: 'krilin', name: 'Krilin', saga: 'saiyan', rarity: 'C', weapon: 'kienzan', stats: { hp: 90, speed: 1.08, might: 1, magnet: 0.3 },
    desc: 'El humano más fuerte de la Tierra.', forms: [f(1, 'Krilin', 'krilin'), f(15, 'Potencial liberado', 'krilin', { aura: '#ffffff', might: 0.35, speed: 0.1 })] },
  { id: 'piccolo', name: 'Piccolo', saga: 'saiyan', rarity: 'R', weapon: 'makanko', stats: { hp: 110, speed: 0.97, might: 1, regen: 0.4 },
    desc: 'Guerrero namekiano. Se regenera solo.', forms: [f(1, 'Piccolo', 'piccolo'), f(15, 'Sin pesas', 'piccolo', { aura: '#b8ff9a', might: 0.3, speed: 0.2 })] },
  { id: 'gohan_kid', name: 'Gohan (niño)', saga: 'saiyan', rarity: 'C', weapon: 'masenko', stats: { hp: 85, speed: 1.05, might: 1, growth: 0.15 },
    desc: 'Poder oculto que estalla con la ira.', forms: [f(1, 'Gohan', 'gohan_kid'), f(15, 'Ira desatada', 'gohan_kid', { aura: '#ffe14a', might: 0.5 })] },
  { id: 'vegeta_s', name: 'Vegeta', saga: 'saiyan', rarity: 'E', weapon: 'galick', stats: { hp: 90, speed: 1, might: 1.15 },
    desc: 'El príncipe de los Saiyajin llega a la Tierra.', forms: [f(1, 'Vegeta', 'vegeta_saiyan'), f(15, 'Orgullo Saiyajin', 'vegeta_saiyan', { aura: '#9fd8ff', might: 0.4 })] },
  { id: 'raditz', name: 'Raditz', saga: 'saiyan', rarity: 'C', weapon: 'kiblast', stats: { hp: 105, speed: 1, might: 1.05 },
    desc: 'El hermano de Goku. ¿Y si fuera Super Saiyajin?', forms: [f(1, 'Raditz', 'raditz'), f(18, 'Raditz SSJ', 'raditz_ssj', { aura: '#ffe14a', might: 0.5, speed: 0.1 })] },
  { id: 'bardock', name: 'Bardock', saga: 'saiyan', rarity: 'L', weapon: 'bigbang', stats: { hp: 110, speed: 1, might: 1.1 },
    desc: 'El padre de Goku, guerrero de clase baja.', forms: [f(1, 'Bardock', 'bardock'), f(12, 'Super Saiyajin', 'bardock_ssj', { aura: '#ffe14a', might: 0.35, speed: 0.1 }),
      f(28, 'Super Saiyajin 4', 'bardock_ssj4', { aura: '#ff4a4a', sparks: true, might: 0.9, speed: 0.15 })] },
  // --- Saga Freezer ---
  { id: 'goku_n', name: 'Goku (Namek)', saga: 'freezer', rarity: 'E', weapon: 'kamehameha', stats: { hp: 100, speed: 1.03, might: 1.05 },
    desc: 'La leyenda despierta en Namek.', forms: [f(1, 'Goku', 'goku'), f(8, 'Kaioken x20', 'goku_kaioken', { aura: '#ff5a5a', might: 0.25, speed: 0.1 }),
      f(18, 'Super Saiyajin', 'goku_ssj_namek', { aura: '#ffe14a', sparks: true, might: 0.6, speed: 0.15 })] },
  { id: 'vegeta_n', name: 'Vegeta (Namek)', saga: 'freezer', rarity: 'R', weapon: 'galick', stats: { hp: 95, speed: 1.02, might: 1.1 },
    desc: 'Cada combate le hace más fuerte.', forms: [f(1, 'Vegeta', 'vegeta'), f(15, 'Zenkai', 'vegeta', { aura: '#9fd8ff', might: 0.4, speed: 0.1 })] },
  { id: 'freezer', name: 'Freezer', saga: 'freezer', rarity: 'L', weapon: 'deathbeam', stats: { hp: 95, speed: 1.02, might: 1.15 },
    desc: 'El emperador del universo y sus transformaciones.', forms: [f(1, 'Primera forma', 'freezer_1'), f(10, 'Tercera forma', 'freezer_3', { aura: '#c77bff', might: 0.25 }),
      f(20, 'Forma final', 'freezer_final', { aura: '#c77bff', might: 0.5, speed: 0.1 }), f(30, 'Máximo poder', 'freezer_fp', { aura: '#ff7ad8', might: 0.8, speed: 0.12 }),
      f(40, 'Golden Freezer', 'freezer_golden', { aura: '#ffd23a', sparks: true, might: 1.2, speed: 0.18 })] },
  { id: 'cooler', name: 'Cooler', saga: 'freezer', rarity: 'E', weapon: 'supernova', stats: { hp: 110, speed: 0.98, might: 1.12 },
    desc: 'El hermano mayor de Freezer.', forms: [f(1, 'Cooler', 'cooler'), f(20, 'Furia de Cooler', 'cooler', { aura: '#c77bff', might: 0.6 })] },
  { id: 'turles', name: 'Turles', saga: 'freezer', rarity: 'C', weapon: 'bakuhatsuha', stats: { hp: 100, speed: 1, might: 1.05, regen: 0.3 },
    desc: 'Se alimenta del fruto del Árbol Sagrado.', forms: [f(1, 'Turles', 'turles'), f(16, 'Fruto del árbol', 'turles', { aura: '#7aff6a', might: 0.45, regen: 0.6 })] },
  // --- Saga Cell ---
  { id: 'goku_c', name: 'Goku SSJ', saga: 'cell', rarity: 'E', weapon: 'kamehameha', stats: { hp: 105, speed: 1.05, might: 1.12 },
    desc: 'Super Saiyajin dominado tras entrenar en la Sala del Tiempo.', forms: [f(1, 'Super Saiyajin', 'goku_ssj', { aura: '#ffe14a' }), f(20, 'SSJ al máximo', 'goku_ssj', { aura: '#fff07a', sparks: true, might: 0.5, speed: 0.12 })] },
  { id: 'gohan_teen', name: 'Gohan (adolescente)', saga: 'cell', rarity: 'E', weapon: 'masenko', stats: { hp: 95, speed: 1.04, might: 1.08, growth: 0.1 },
    desc: 'El guerrero que superó a Cell.', forms: [f(1, 'Super Saiyajin', 'gohan_teen_ssj', { aura: '#ffe14a' }), f(18, 'Super Saiyajin 2', 'gohan_teen_ssj2', { aura: '#fff07a', sparks: true, might: 0.6, speed: 0.15 })] },
  { id: 'vegeta_c', name: 'Super Vegeta', saga: 'cell', rarity: 'R', weapon: 'galick', stats: { hp: 100, speed: 0.98, might: 1.15 },
    desc: 'Vegeta supera el Super Saiyajin.', forms: [f(1, 'Super Vegeta', 'vegeta_ssj_grade', { aura: '#ffe14a' }), f(20, 'Poder al límite', 'vegeta_ssj_grade', { aura: '#ffd84a', might: 0.5 })] },
  { id: 'trunks', name: 'Trunks del Futuro', saga: 'cell', rarity: 'E', weapon: 'sword', stats: { hp: 100, speed: 1.05, might: 1.1 },
    desc: 'Viene del futuro con su espada.', forms: [f(1, 'Trunks', 'trunks'), f(12, 'Super Saiyajin', 'trunks_ssj', { aura: '#ffe14a', might: 0.4, speed: 0.1 })] },
  { id: 'trunks_armor', name: 'Trunks (armadura)', saga: 'cell', rarity: 'R', weapon: 'bigbang', stats: { hp: 110, speed: 1, might: 1.05, armor: 1 },
    desc: 'Con la armadura Saiyajin de Vegeta.', forms: [f(1, 'Trunks', 'trunks_armor'), f(16, 'Furia del futuro', 'trunks_armor', { aura: '#ffe14a', might: 0.4 })] },
  { id: 'a16', name: 'Androide 16', saga: 'cell', rarity: 'C', weapon: 'bakuhatsuha', stats: { hp: 130, speed: 0.92, might: 1.05, armor: 2 },
    desc: 'Gigante pacífico con un gran poder.', forms: [f(1, 'Androide 16', 'a16')] },
  { id: 'a17', name: 'Androide 17', saga: 'cell', rarity: 'R', weapon: 'aura', stats: { hp: 100, speed: 1.08, might: 1.05 },
    desc: 'Energía infinita y una barrera impenetrable.', forms: [f(1, 'Androide 17', 'a17')] },
  { id: 'a18', name: 'Androide 18', saga: 'cell', rarity: 'C', weapon: 'kienzan', stats: { hp: 95, speed: 1.1, might: 1.05 },
    desc: 'Rápida y letal.', forms: [f(1, 'Androide 18', 'a18')] },
  { id: 'cell', name: 'Cell', saga: 'cell', rarity: 'L', weapon: 'kamehameha', stats: { hp: 110, speed: 1, might: 1.12, regen: 0.4 },
    desc: 'El androide definitivo del Dr. Gero.', forms: [f(1, 'Cell imperfecto', 'cell_1'), f(12, 'Cell semiperfecto', 'cell_2', { aura: '#5fe07a', might: 0.35 }),
      f(25, 'Cell perfecto', 'cell_perfect', { aura: '#ffe14a', sparks: true, might: 0.8, speed: 0.15 })] },
  // --- Saga Buu ---
  { id: 'goku_b', name: 'Goku (Saga Buu)', saga: 'buu', rarity: 'L', weapon: 'kamehameha', stats: { hp: 105, speed: 1.05, might: 1.12 },
    desc: 'Regresa del Otro Mundo con nuevas transformaciones.', forms: [f(1, 'Goku', 'goku'), f(10, 'Super Saiyajin', 'goku_ssj', { aura: '#ffe14a', might: 0.25, speed: 0.08 }),
      f(20, 'Super Saiyajin 2', 'goku_ssj2', { aura: '#fff07a', sparks: true, might: 0.55, speed: 0.12 }),
      f(30, 'Super Saiyajin 3', 'goku_ssj3', { aura: '#ffd000', sparks: true, big: true, might: 0.95, speed: 0.15 })] },
  { id: 'vegeta_b', name: 'Vegeta (Saga Buu)', saga: 'buu', rarity: 'E', weapon: 'galick', stats: { hp: 95, speed: 1.02, might: 1.15 },
    desc: 'Vuelve a ser el príncipe malvado.', forms: [f(1, 'Vegeta', 'vegeta_buu'), f(10, 'Super Saiyajin', 'vegeta_buu_ssj', { aura: '#ffe14a', might: 0.3, speed: 0.08 }),
      f(22, 'Majin Vegeta', 'majin_vegeta', { aura: '#ffe14a', sparks: true, might: 0.8, speed: 0.14 })] },
  { id: 'gohan_b', name: 'Gohan (Saga Buu)', saga: 'buu', rarity: 'R', weapon: 'masenko', stats: { hp: 100, speed: 1.03, might: 1.08, growth: 0.1 },
    desc: 'El poder definitivo de Gohan.', forms: [f(1, 'Gohan', 'gohan_adult'), f(22, 'Gohan Definitivo', 'gohan_mystic', { aura: '#ffffff', big: true, might: 0.9, speed: 0.15 })] },
  { id: 'goten', name: 'Goten', saga: 'buu', rarity: 'C', weapon: 'kamehameha', stats: { hp: 85, speed: 1.12, might: 1 },
    desc: 'El hijo pequeño de Goku. Super Saiyajin sin esfuerzo.', forms: [f(1, 'Goten', 'goten'), f(12, 'Super Saiyajin', 'goten', { aura: '#ffe14a', might: 0.4, speed: 0.1 })] },
  { id: 'trunks_kid', name: 'Trunks (niño)', saga: 'buu', rarity: 'C', weapon: 'burning', stats: { hp: 90, speed: 1.1, might: 1.02 },
    desc: 'El hijo de Vegeta, travieso y muy fuerte.', forms: [f(1, 'Trunks', 'trunks_kid'), f(12, 'Super Saiyajin', 'trunks_kid', { aura: '#ffe14a', might: 0.4, speed: 0.1 })] },
  { id: 'gotenks', name: 'Gotenks', saga: 'buu', rarity: 'R', weapon: 'ghosts', stats: { hp: 95, speed: 1.1, might: 1.08 },
    desc: 'La fusión de Goten y Trunks.', forms: [f(1, 'Gotenks', 'gotenks'), f(18, 'Gotenks al máximo', 'gotenks', { aura: '#ffe14a', might: 0.55, speed: 0.12 })] },
  { id: 'buu', name: 'Majin Buu', saga: 'buu', rarity: 'L', weapon: 'candybeam', stats: { hp: 130, speed: 0.95, might: 1.08, regen: 0.6 },
    desc: 'Todas las formas del monstruo rosa.', forms: [f(1, 'Majin Buu', 'buu_fat'), f(10, 'Buu malvado', 'buu_evil', { aura: '#ff7ab8', might: 0.25 }),
      f(20, 'Super Buu', 'buu_super', { aura: '#ff7ab8', might: 0.5, speed: 0.1 }), f(30, 'Buu absorbe a Gohan', 'buu_gohan', { aura: '#c77bff', might: 0.8, speed: 0.12 }),
      f(40, 'Kid Buu', 'buu_kid', { aura: '#ff4a8a', sparks: true, might: 1.15, speed: 0.18 })] },
  { id: 'vegito', name: 'Vegito', saga: 'buu', rarity: 'L', weapon: 'sword', stats: { hp: 110, speed: 1.06, might: 1.18 },
    desc: 'La fusión Potara de Goku y Vegeta.', forms: [f(1, 'Vegito', 'vegito'), f(10, 'Super Vegito', 'vegito_ssj', { aura: '#ffe14a', might: 0.35, speed: 0.1 }),
      f(22, 'Vegito SSJ2', 'vegito_ssj2', { aura: '#fff07a', sparks: true, might: 0.7, speed: 0.14 })] },
  // --- Películas y GT ---
  { id: 'broly', name: 'Broly', saga: 'movies', rarity: 'L', weapon: 'eraser', stats: { hp: 140, speed: 0.95, might: 1.15 },
    desc: 'El legendario Super Saiyajin.', forms: [f(1, 'Broly', 'broly_2'), f(10, 'Super Saiyajin', 'broly_3', { aura: '#ffe14a', might: 0.3 }),
      f(20, 'Legendario Super Saiyajin', 'broly_lssj', { aura: '#7aff6a', sparks: true, might: 0.7, speed: 0.1 }),
      f(35, 'Super Saiyajin 4', 'broly_ssj4', { aura: '#ff4a4a', sparks: true, big: true, might: 1.15, speed: 0.15 })] },
  { id: 'gogeta', name: 'Gogeta', saga: 'movies', rarity: 'L', weapon: 'bigbangkame', stats: { hp: 110, speed: 1.08, might: 1.2 },
    desc: 'La fusión por la Danza de la Metamorfosis.', forms: [f(1, 'Gogeta SSJ', 'gogeta', { aura: '#ffe14a' }), f(20, 'Gogeta al máximo', 'gogeta', { aura: '#fff07a', sparks: true, might: 0.7 })] },
  { id: 'janemba', name: 'Janemba', saga: 'movies', rarity: 'E', weapon: 'sword', stats: { hp: 120, speed: 1, might: 1.1 },
    desc: 'El demonio nacido de la maldad pura.', forms: [f(1, 'Janemba', 'janemba'), f(14, 'Super Janemba', 'janemba_super', { aura: '#ff4a4a', might: 0.45, speed: 0.1 }),
      f(28, 'Janemba definitivo', 'janemba_super', { aura: '#ff2a6a', sparks: true, might: 0.85, speed: 0.14 })] },
  { id: 'goku_gt', name: 'Goku SSJ4', saga: 'movies', rarity: 'L', weapon: 'kamehameha', stats: { hp: 115, speed: 1.06, might: 1.2 },
    desc: 'La transformación definitiva de GT.', forms: [f(1, 'Super Saiyajin 4', 'goku_ssj4', { aura: '#ff4a4a' }), f(25, 'SSJ4 al máximo', 'goku_ssj4', { aura: '#ff7a4a', sparks: true, might: 0.8, speed: 0.12 })] },
  { id: 'vegeta_gt', name: 'Vegeta SSJ4', saga: 'movies', rarity: 'E', weapon: 'finalflash', stats: { hp: 105, speed: 1.04, might: 1.2 },
    desc: 'El orgullo Saiyajin llevado al límite.', forms: [f(1, 'Super Saiyajin 4', 'vegeta_ssj4', { aura: '#ff4a4a' }), f(25, 'SSJ4 al máximo', 'vegeta_ssj4', { aura: '#ff7a4a', sparks: true, might: 0.8 })] },
  // --- Dragon Ball Super ---
  { id: 'goku_super', name: 'Goku (Super)', saga: 'super', rarity: 'L', weapon: 'kamehameha', stats: { hp: 110, speed: 1.08, might: 1.2 },
    desc: 'De dios Saiyajin al Ultra Instinto.', forms: [f(1, 'Super Saiyajin Dios', 'goku_god', { aura: '#ff5a5a' }), f(12, 'Super Saiyajin Blue', 'goku_blue', { aura: '#4ac8ff', might: 0.3, speed: 0.1 }),
      f(22, 'Blue Kaioken', 'goku_blue_kaioken', { aura: '#ff4a6a', sparks: true, might: 0.55, speed: 0.12 }),
      f(32, 'Ultra Instinto', 'goku_ui', { aura: '#c8d8ff', sparks: true, might: 0.85, speed: 0.2 }),
      f(42, 'Ultra Instinto dominado', 'goku_mui', { aura: '#ffffff', sparks: true, big: true, might: 1.3, speed: 0.28 })] },
  { id: 'vegeta_super', name: 'Vegeta (Super)', saga: 'super', rarity: 'L', weapon: 'galick', stats: { hp: 105, speed: 1.05, might: 1.22 },
    desc: 'El príncipe alcanza el poder de los dioses.', forms: [f(1, 'Super Saiyajin Dios', 'vegeta_god', { aura: '#ff5a5a' }), f(14, 'Super Saiyajin Blue', 'vegeta_blue', { aura: '#4ac8ff', might: 0.35, speed: 0.1 }),
      f(30, 'Blue evolucionado', 'vegeta_blue_fp', { aura: '#4a8aff', sparks: true, might: 0.9, speed: 0.16 })] },
  { id: 'vegito_blue', name: 'Vegito Blue', saga: 'super', rarity: 'L', weapon: 'sword', stats: { hp: 110, speed: 1.1, might: 1.25 },
    desc: 'La fusión Potara con el poder de los dioses.', forms: [f(1, 'Vegito Blue', 'vegito_blue', { aura: '#4ac8ff' }), f(25, 'Espada definitiva', 'vegito_blue', { aura: '#9fe8ff', sparks: true, might: 0.8 })] },
  { id: 'beerus', name: 'Bills', saga: 'super', rarity: 'L', weapon: 'hakai', stats: { hp: 115, speed: 1, might: 1.25 },
    desc: 'El Dios de la Destrucción del Universo 7.', forms: [f(1, 'Bills', 'beerus', { aura: '#c77bff' }), f(25, 'Hakai', 'beerus', { aura: '#a04aff', sparks: true, might: 0.8 })] },
  { id: 'hit', name: 'Hit', saga: 'super', rarity: 'E', weapon: 'timeskip', stats: { hp: 100, speed: 1.1, might: 1.12 },
    desc: 'El asesino legendario que salta en el tiempo.', forms: [f(1, 'Hit', 'hit'), f(20, 'Salto temporal perfecto', 'hit', { aura: '#c77bff', might: 0.6, speed: 0.15 })] },
  { id: 'goku_black', name: 'Goku Black', saga: 'super', rarity: 'E', weapon: 'sword', stats: { hp: 100, speed: 1.06, might: 1.15 },
    desc: 'Zamasu en el cuerpo de Goku.', forms: [f(1, 'Goku Black', 'goku_black'), f(15, 'Super Saiyajin Rosé', 'goku_black_rose', { aura: '#ff7ad8', sparks: true, might: 0.6, speed: 0.12 })] },
  { id: 'zamasu', name: 'Zamasu', saga: 'super', rarity: 'E', weapon: 'deathbeam', stats: { hp: 110, speed: 1, might: 1.1, regen: 0.5 },
    desc: 'El Kaio-shin que odia a los mortales.', forms: [f(1, 'Zamasu', 'zamasu'), f(22, 'Zamasu fusionado', 'zamasu_fused', { aura: '#9fffd8', sparks: true, might: 0.8, speed: 0.12 })] },
  { id: 'jiren', name: 'Jiren', saga: 'super', rarity: 'L', weapon: 'powerfist', stats: { hp: 130, speed: 1, might: 1.25, armor: 2 },
    desc: 'El guerrero más fuerte del Universo 11.', forms: [f(1, 'Jiren', 'jiren'), f(25, 'Jiren al máximo', 'jiren', { aura: '#ff4a4a', sparks: true, might: 0.8 })] },
  { id: 'toppo', name: 'Toppo', saga: 'super', rarity: 'R', weapon: 'destruction', stats: { hp: 135, speed: 0.95, might: 1.1, armor: 1 },
    desc: 'Líder de las Tropas del Orgullo.', forms: [f(1, 'Toppo', 'toppo'), f(20, 'Modo Dios de la Destrucción', 'toppo', { aura: '#a04aff', might: 0.6 })] },
  { id: 'caulifla', name: 'Caulifla', saga: 'super', rarity: 'C', weapon: 'kiblast', stats: { hp: 95, speed: 1.1, might: 1.08 },
    desc: 'Saiyajin del Universo 6 con talento innato.', forms: [f(1, 'Caulifla', 'caulifla'), f(16, 'Super Saiyajin', 'caulifla', { aura: '#ffe14a', might: 0.45, speed: 0.1 })] },
  { id: 'kale', name: 'Kale', saga: 'super', rarity: 'E', weapon: 'eraser', stats: { hp: 115, speed: 1, might: 1.1 },
    desc: 'La legendaria Super Saiyajin del Universo 6.', forms: [f(1, 'Kale', 'kale'), f(12, 'Super Saiyajin berserker', 'kale_ssj', { aura: '#7aff6a', sparks: true, might: 0.6, speed: 0.1 })] },
  { id: 'kefla', name: 'Kefla', saga: 'super', rarity: 'L', weapon: 'bigbangkame', stats: { hp: 110, speed: 1.1, might: 1.2 },
    desc: 'La fusión Potara de Caulifla y Kale.', forms: [f(1, 'Kefla SSJ', 'kefla', { aura: '#7aff6a' }), f(22, 'Kefla SSJ2', 'kefla', { aura: '#b8ff9a', sparks: true, might: 0.75, speed: 0.12 })] },
  { id: 'cabba', name: 'Cabba', saga: 'super', rarity: 'C', weapon: 'galick', stats: { hp: 95, speed: 1.05, might: 1.05 },
    desc: 'Un joven Saiyajin noble del Universo 6.', forms: [f(1, 'Cabba', 'cabba'), f(14, 'Super Saiyajin', 'cabba_ssj', { aura: '#ffe14a', might: 0.45, speed: 0.1 })] },
  { id: 'gohan_rof', name: 'Gohan (La resurrección de F)', saga: 'super', rarity: 'R', weapon: 'masenko', stats: { hp: 100, speed: 1.04, might: 1.08 },
    desc: 'Gohan vuelve a luchar con su chándal de entrenamiento.', forms: [f(1, 'Gohan', 'gohan_rof'), f(12, 'Super Saiyajin', 'gohan_rof_ssj', { aura: '#ffe14a', might: 0.4, speed: 0.1 }),
      f(26, 'Super Saiyajin al máximo', 'gohan_rof_ssj', { aura: '#fff07a', sparks: true, might: 0.8, speed: 0.12 })] },
  { id: 'copy_vegeta', name: 'Vegeta copia', saga: 'super', rarity: 'E', weapon: 'galick', stats: { hp: 100, speed: 1.05, might: 1.15 },
    desc: 'La copia de Vegeta creada por Moro.', forms: [f(1, 'Vegeta copia', 'copy_vegeta', { aura: '#c77bff' }),
      f(15, 'Super Saiyajin Blue', 'copy_vegeta_blue', { aura: '#4ac8ff', sparks: true, might: 0.6, speed: 0.12 })] },
  { id: 'trunks_super', name: 'Trunks del Futuro (Super)', saga: 'super', rarity: 'L', weapon: 'sword', stats: { hp: 105, speed: 1.08, might: 1.2 },
    desc: 'La esperanza de un futuro destruido por Goku Black.', forms: [f(1, 'Trunks del Futuro', 'trunks_super'),
      f(12, 'Super Saiyajin', 'trunks_super', { aura: '#ffe14a', might: 0.3, speed: 0.08 }),
      f(24, 'Super Saiyajin Ira', 'trunks_rage', { aura: '#7ad8ff', sparks: true, might: 0.8, speed: 0.15 })] },
  { id: 'broly_dbs', name: 'Broly (Super)', saga: 'super', rarity: 'L', weapon: 'eraser', stats: { hp: 150, speed: 0.98, might: 1.2, armor: 1 },
    desc: 'El Saiyajin cuyo poder no conoce límites.', forms: [f(1, 'Super Saiyajin', 'broly_dbs', { aura: '#ffe14a' }),
      f(18, 'Super Saiyajin furioso', 'broly_dbs', { aura: '#7aff6a', sparks: true, big: true, might: 0.9, speed: 0.12 })] },
  { id: 'jaco', name: 'Jaco', saga: 'super', rarity: 'C', weapon: 'kiblast', stats: { hp: 95, speed: 1.1, might: 0.98, magnet: 0.4 },
    desc: 'Agente de élite de la Patrulla Galáctica (según él).', forms: [f(1, 'Jaco', 'jaco'), f(15, 'Patrullero de élite', 'jaco', { aura: '#9fd8ff', might: 0.4, speed: 0.12 })] },
  { id: 'frost', name: 'Frost', saga: 'super', rarity: 'R', weapon: 'deathbeam', stats: { hp: 100, speed: 1.02, might: 1.1 },
    desc: 'El tramposo del Universo 6.', forms: [f(1, 'Frost', 'frost_1'), f(15, 'Forma final', 'frost_final', { aura: '#9fd8ff', might: 0.55, speed: 0.1 })] },
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

export const MAX_SLOTS = 4; // ranuras de técnicas (solo dispara la activa)
export const BOND_MAX = 4; // técnicas máximas vinculadas en una ranura
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
  repertorio: { name: 'Repertorio', desc: 'Empiezas la partida con 2 técnicas', max: 1, cost: 900 },
  ki: { name: 'Control del ki', desc: '+15% de carga de la barra de ki', max: 3, cost: 150 },
};

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Técnicas exclusivas y evoluciones de técnicas
// `evo`: con la técnica al nivel máximo y la pasiva `need`, se puede evolucionar a `into`.
// ---------------------------------------------------------------------------
Object.assign(WEAPONS, {
  deathbeam: {
    name: 'Rayo Mortal', color: '#ff6ad8', kind: 'beam', hue: 120,
    desc: 'Rayos finos que atraviesan a los enemigos.',
    levels: [
      { dmg: 26, cd: 1.5, len: 230, width: 5, dur: 0.22, aim: true, once: true },
      { dmg: 32, cd: 1.4, len: 250, width: 5, dur: 0.22, aim: true, once: true },
      { dmg: 32, cd: 1.3, len: 260, width: 6, dur: 0.22, aim: true, once: true, dual: true },
      { dmg: 42, cd: 1.2, len: 280, width: 6, dur: 0.22, aim: true, once: true, dual: true },
      { dmg: 55, cd: 1.0, len: 320, width: 7, dur: 0.25, aim: true, once: true, dual: true },
    ],
  },
  bigbang: {
    name: 'Big Bang Attack', color: '#7ad8ff', kind: 'bomb', hue: 0,
    desc: 'Esfera de energía rápida que estalla al impactar.',
    levels: [
      { dmg: 40, cd: 2.4, speed: 170, size: 7, blast: 50 },
      { dmg: 52, cd: 2.3, speed: 180, size: 7, blast: 55 },
      { dmg: 64, cd: 2.1, speed: 190, size: 8, blast: 62 },
      { dmg: 80, cd: 1.9, speed: 200, size: 8, blast: 70 },
      { dmg: 105, cd: 1.6, speed: 210, size: 9, blast: 82 },
    ],
  },
  supernova: {
    name: 'Supernova', color: '#ffa040', kind: 'bomb', hue: 170,
    desc: 'Una esfera gigantesca de destrucción.',
    levels: [
      { dmg: 150, cd: 8, speed: 55, size: 15, blast: 90 },
      { dmg: 200, cd: 7.5, speed: 60, size: 16, blast: 100 },
      { dmg: 250, cd: 7, speed: 62, size: 18, blast: 110 },
      { dmg: 320, cd: 6.5, speed: 65, size: 20, blast: 125 },
      { dmg: 420, cd: 5.5, speed: 70, size: 23, blast: 145 },
    ],
  },
  eraser: {
    name: 'Cañón Borrador', color: '#7aff6a', kind: 'bomb', hue: 260,
    desc: 'Esfera verde que arrasa todo a su paso.',
    levels: [
      { dmg: 60, cd: 3, speed: 110, size: 11, blast: 65 },
      { dmg: 78, cd: 2.9, speed: 115, size: 12, blast: 72 },
      { dmg: 95, cd: 2.7, speed: 120, size: 13, blast: 80 },
      { dmg: 120, cd: 2.4, speed: 125, size: 14, blast: 90 },
      { dmg: 160, cd: 2.1, speed: 130, size: 16, blast: 105 },
    ],
  },
  candybeam: {
    name: 'Rayo de Caramelo', color: '#ff8ac8', kind: 'beam', hue: 140,
    desc: 'Convierte a los enemigos en dulces (o casi).',
    levels: [
      { dmg: 8, cd: 2.2, len: 150, width: 12, dur: 0.5, aim: true },
      { dmg: 10, cd: 2.1, len: 170, width: 13, dur: 0.5, aim: true },
      { dmg: 12, cd: 1.9, len: 190, width: 15, dur: 0.6, aim: true },
      { dmg: 15, cd: 1.7, len: 210, width: 16, dur: 0.6, aim: true },
      { dmg: 19, cd: 1.5, len: 240, width: 19, dur: 0.7, aim: true, dual: true },
    ],
  },
  hakai: {
    name: 'Hakai', color: '#b07aff', kind: 'flash',
    desc: 'La destrucción divina borra a los enemigos cercanos.',
    levels: [
      { dmg: 45, cd: 6, radius: 95, stun: 0.6 },
      { dmg: 60, cd: 5.6, radius: 105, stun: 0.7 },
      { dmg: 80, cd: 5.2, radius: 115, stun: 0.8 },
      { dmg: 105, cd: 4.8, radius: 130, stun: 0.9 },
      { dmg: 140, cd: 4.2, radius: 150, stun: 1 },
    ],
  },
  timeskip: {
    name: 'Salto Temporal', color: '#d0a0ff', kind: 'flash',
    desc: 'Detiene el tiempo a tu alrededor y golpea.',
    levels: [
      { dmg: 14, cd: 5, radius: 120, stun: 2.2 },
      { dmg: 18, cd: 4.8, radius: 130, stun: 2.4 },
      { dmg: 24, cd: 4.5, radius: 140, stun: 2.6 },
      { dmg: 30, cd: 4.2, radius: 155, stun: 2.9 },
      { dmg: 40, cd: 3.8, radius: 175, stun: 3.2 },
    ],
  },
  powerfist: {
    name: 'Puño de Poder', color: '#ff5a4a', kind: 'ring',
    desc: 'Ondas de choque devastadoras.',
    levels: [
      { dmg: 26, cd: 3.2, maxR: 115 },
      { dmg: 34, cd: 3, maxR: 125 },
      { dmg: 42, cd: 2.8, maxR: 140 },
      { dmg: 54, cd: 2.5, maxR: 155 },
      { dmg: 70, cd: 2.2, maxR: 180 },
    ],
  },
  destruction: {
    name: 'Energía de Destrucción', color: '#a04aff', kind: 'aura',
    desc: 'Un aura de destrucción que desintegra lo que toca.',
    levels: [
      { dmg: 5, cd: 0.35, radius: 40 },
      { dmg: 6, cd: 0.33, radius: 46 },
      { dmg: 8, cd: 0.3, radius: 52 },
      { dmg: 10, cd: 0.28, radius: 58 },
      { dmg: 13, cd: 0.26, radius: 66 },
    ],
  },
  finalflash: {
    name: 'Final Flash', color: '#ffe36a', kind: 'beam', hue: -150,
    desc: 'El rayo más poderoso de Vegeta.',
    levels: [
      { dmg: 12, cd: 3.2, len: 200, width: 20, dur: 0.7, aim: true },
      { dmg: 15, cd: 3, len: 230, width: 22, dur: 0.7, aim: true },
      { dmg: 18, cd: 2.8, len: 260, width: 24, dur: 0.8, aim: true },
      { dmg: 22, cd: 2.6, len: 290, width: 26, dur: 0.8, aim: true },
      { dmg: 28, cd: 2.3, len: 340, width: 30, dur: 0.9, aim: true },
    ],
  },
  bigbangkame: {
    name: 'Big Bang Kamehameha', color: '#9fe8ff', kind: 'bomb', hue: 0,
    desc: 'Una fusión de técnicas que lo arrasa todo.',
    levels: [
      { dmg: 70, cd: 3.2, speed: 130, size: 12, blast: 75 },
      { dmg: 90, cd: 3, speed: 135, size: 13, blast: 82 },
      { dmg: 110, cd: 2.8, speed: 140, size: 14, blast: 90 },
      { dmg: 140, cd: 2.5, speed: 150, size: 15, blast: 100 },
      { dmg: 185, cd: 2.2, speed: 160, size: 17, blast: 118 },
    ],
  },
  kikoho: {
    name: 'Kikoho', color: '#ffe36a', kind: 'beam',
    desc: 'Un cañón de energía enorme y lento que lo aplasta todo.',
    levels: [
      { dmg: 16, cd: 2.8, len: 150, width: 26, dur: 0.55, aim: true },
      { dmg: 20, cd: 2.7, len: 165, width: 28, dur: 0.55, aim: true },
      { dmg: 25, cd: 2.5, len: 180, width: 32, dur: 0.6, aim: true },
      { dmg: 31, cd: 2.3, len: 195, width: 34, dur: 0.6, aim: true },
      { dmg: 40, cd: 2.0, len: 220, width: 40, dur: 0.7, aim: true, dual: true },
    ],
  },
  burning: {
    name: 'Burning Attack', color: '#ffb03a', kind: 'bomb',
    desc: 'Una bola de fuego de ki que estalla al impactar.',
    levels: [
      { dmg: 34, cd: 1.9, speed: 200, size: 6, blast: 42 },
      { dmg: 44, cd: 1.8, speed: 210, size: 6, blast: 46 },
      { dmg: 44, cd: 1.7, speed: 220, size: 7, blast: 50, count: 2 },
      { dmg: 58, cd: 1.6, speed: 230, size: 7, blast: 56, count: 2 },
      { dmg: 76, cd: 1.4, speed: 240, size: 8, blast: 64, count: 3 },
    ],
  },
  ghosts: {
    name: 'Ataque Kamikaze Fantasma', color: '#bfe8ff', kind: 'homing',
    desc: 'Fantasmas de Gotenks que persiguen a los enemigos y explotan.',
    levels: [
      { dmg: 30, cd: 2.4, count: 2, speed: 95, blast: 36 },
      { dmg: 36, cd: 2.3, count: 3, speed: 100, blast: 38 },
      { dmg: 44, cd: 2.2, count: 3, speed: 105, blast: 42 },
      { dmg: 52, cd: 2.0, count: 4, speed: 110, blast: 46 },
      { dmg: 66, cd: 1.8, count: 6, speed: 120, blast: 52 },
    ],
  },
  // --- Evoluciones (una sola etapa, ya al máximo) ---
  kame10: { name: 'Kamehameha x10', color: '#9fe8ff', kind: 'beam', evolved: true, desc: 'El Kamehameha definitivo.',
    levels: [{ dmg: 26, cd: 1.6, len: 330, width: 30, dur: 0.9, aim: true, dual: true }] },
  ffmax: { name: 'Final Flash definitivo', color: '#ffe36a', kind: 'beam', hue: -150, evolved: true, desc: 'Destruye todo en línea recta.',
    levels: [{ dmg: 40, cd: 2, len: 380, width: 36, dur: 1, aim: true, dual: true }] },
  masenko_max: { name: 'Gekiretsu Madan', color: '#fff27a', kind: 'wave', evolved: true, desc: 'Una lluvia de ondas de energía.',
    levels: [{ dmg: 34, cd: 0.8, speed: 240, size: 12, pierce: 20, count: 5 }] },
  kiblast_inf: { name: 'Ráfaga Infinita', color: '#ffe36a', kind: 'projectile', evolved: true, desc: 'Un torrente imparable de ki.',
    levels: [{ dmg: 20, cd: 0.28, count: 6, speed: 320, size: 5, pierce: 4 }] },
  kienzan_max: { name: 'Kienzan Doble', color: '#ffe9a8', kind: 'disc', evolved: true, desc: 'Discos que lo cortan todo.',
    levels: [{ dmg: 60, cd: 1.1, speed: 300, count: 5, range: 300 }] },
  genki_max: { name: 'Genkidama Universal', color: '#9ad8ff', kind: 'bomb', evolved: true, desc: 'La energía de todo el universo.',
    levels: [{ dmg: 650, cd: 5, speed: 95, size: 26, blast: 170 }] },
  makanko_max: { name: 'Makankosappo Supremo', color: '#ffb84a', kind: 'beam', evolved: true, desc: 'Atraviesa cualquier defensa.',
    levels: [{ dmg: 140, cd: 1.1, len: 380, width: 10, dur: 0.3, aim: true, once: true, dual: true }] },
  deathbeam_max: { name: 'Rayos Mortales Múltiples', color: '#ff6ad8', kind: 'beam', hue: 120, evolved: true, desc: 'Una lluvia de rayos letales.',
    levels: [{ dmg: 90, cd: 0.6, len: 340, width: 8, dur: 0.22, aim: true, once: true, dual: true }] },
  bigbang_max: { name: 'Final Shine', color: '#7aff9a', kind: 'bomb', evolved: true, desc: 'Explosiones de energía colosales.',
    levels: [{ dmg: 180, cd: 1.2, speed: 230, size: 11, blast: 110 }] },
  sword_max: { name: 'Espada Z', color: '#e0f0ff', kind: 'slash', evolved: true, desc: 'La legendaria Espada Z.',
    levels: [{ dmg: 90, cd: 0.6, range: 80, arc: 3.2, back: true }] },
  aura_max: { name: 'Aura Divina', color: '#ffffff', kind: 'aura', evolved: true, desc: 'Un aura que desintegra todo lo cercano.',
    levels: [{ dmg: 18, cd: 0.22, radius: 85 }] },
  ring_max: { name: 'Explosión Planetaria', color: '#ff7a3a', kind: 'ring', evolved: true, desc: 'Ondas que sacuden el planeta.',
    levels: [{ dmg: 90, cd: 1.8, maxR: 230 }] },
  kikoho_max: { name: 'Shin Kikoho', color: '#fff27a', kind: 'beam', evolved: true, desc: 'El Kikoho definitivo, a costa de la vida.',
    levels: [{ dmg: 70, cd: 1.6, len: 280, width: 52, dur: 0.8, aim: true, dual: true }] },
  burning_max: { name: 'Lluvia de fuego', color: '#ffb03a', kind: 'bomb', evolved: true, desc: 'Bolas de fuego sin parar.',
    levels: [{ dmg: 110, cd: 0.9, speed: 260, size: 9, blast: 78, count: 4 }] },
  ghosts_max: { name: 'Súper Ataque Kamikaze Fantasma', color: '#e0f4ff', kind: 'homing', evolved: true, desc: 'Un ejército de fantasmas explosivos.',
    levels: [{ dmg: 110, cd: 1.3, count: 9, speed: 140, blast: 66 }] },
});

export const EVOLUTIONS = {
  kamehameha: { need: 'concentracion', into: 'kame10' },
  galick: { need: 'poder', into: 'ffmax' },
  finalflash: { need: 'poder', into: 'ffmax' },
  masenko: { need: 'control', into: 'masenko_max' },
  kiblast: { need: 'multiplicacion', into: 'kiblast_inf' },
  kienzan: { need: 'velocidad', into: 'kienzan_max' },
  genkidama: { need: 'meditacion', into: 'genki_max' },
  makanko: { need: 'armadura', into: 'makanko_max' },
  deathbeam: { need: 'concentracion', into: 'deathbeam_max' },
  bigbang: { need: 'vida', into: 'bigbang_max' },
  bigbangkame: { need: 'vida', into: 'bigbang_max' },
  sword: { need: 'crecimiento', into: 'sword_max' },
  aura: { need: 'radar', into: 'aura_max' },
  destruction: { need: 'radar', into: 'aura_max' },
  bakuhatsuha: { need: 'vida', into: 'ring_max' },
  powerfist: { need: 'vida', into: 'ring_max' },
  kikoho: { need: 'armadura', into: 'kikoho_max' },
  burning: { need: 'multiplicacion', into: 'burning_max' },
  ghosts: { need: 'multiplicacion', into: 'ghosts_max' },
  orbit: { need: 'control', into: 'ghosts_max' },
};

// Arte de cada técnica (sprites de assets/fx). `tint`: giro de tono del sprite.
const ART = {
  kiblast: { art: 'ki_yellow' }, kiblast_inf: { art: 'ki_yellow' },
  kamehameha: { art: 'beam_cyan' }, kame10: { art: 'beam_cyan' },
  galick: { art: 'beam_magenta' }, finalflash: { art: 'beam_yellow' }, ffmax: { art: 'beam_yellow' },
  candybeam: { art: 'beam_pink' }, deathbeam: { art: 'beam_pink' }, deathbeam_max: { art: 'beam_pink' },
  makanko: { art: 'kikoho' }, makanko_max: { art: 'kikoho' },
  kikoho: { art: 'beam_white', tint: 'hue45' }, kikoho_max: { art: 'beam_yellow' },
  masenko: { art: 'flame' }, masenko_max: { art: 'flame' },
  kienzan: { art: 'disc' }, kienzan_max: { art: 'disc' },
  taiyoken: { art: 'star' }, hakai: { art: 'timeburst' }, timeskip: { art: 'timeburst', tint: 'hue60' },
  aura: { art: 'flames' }, destruction: { art: 'flames' }, aura_max: { art: 'flames' },
  bakuhatsuha: { art: 'cone' }, powerfist: { art: 'cone', tint: 'hue-50' }, ring_max: { art: 'cone', tint: 'hue-25' },
  orbit: { art: 'comet' },
  genkidama: { art: 'genkidama' }, genki_max: { art: 'genkidama' },
  bigbang: { art: 'comet_cyan' }, bigbangkame: { art: 'comet_cyan' }, bigbang_max: { art: 'comet_cyan', tint: 'hue-60' },
  supernova: { art: 'sun' }, eraser: { art: 'ki_yellow', tint: 'hue70' },
  burning: { art: 'comet' }, burning_max: { art: 'comet' },
  ghosts: { art: 'ghost' }, ghosts_max: { art: 'ghost' },
  sword: { art: 'slash_green' }, sword_max: { art: 'slash_green', tint: 'hue60' },
};
for (const [id, a] of Object.entries(ART)) Object.assign(WEAPONS[id], a);

// Ataque definitivo de cada guerrero (se lanza con la barra de ki llena). Depende de su técnica.
export const ULTS = {
  kamehameha: 'Super Kamehameha', galick: 'Galick Ho máximo', finalflash: 'Final Flash', masenko: 'Masenko supremo',
  makanko: 'Makankosappo', kienzan: 'Kienzan gigante', kiblast: 'Lluvia de ki', taiyoken: 'Taiyoken cegador',
  bigbang: 'Final Explosion', supernova: 'Supernova', eraser: 'Gigantic Meteor', candybeam: 'Grito de furia',
  hakai: 'Esfera de Destrucción', timeskip: 'Mundo detenido', powerfist: 'Puño del Orgullo', destruction: 'Destrucción total',
  bigbangkame: 'Big Bang Kamehameha x100', sword: 'Espada de la Esperanza', deathbeam: 'Rayo Mortal supremo',
  kikoho: 'Shin Kikoho', burning: 'Burning Attack', ghosts: 'Súper Kamikaze Fantasma', genkidama: 'Genkidama',
  orbit: 'Tormenta de esferas', aura: 'Estallido de ki', bakuhatsuha: 'Explosión de ki',
};

// Técnicas que pueden salir al subir de nivel (las exclusivas solo las trae su personaje).
export const COMMON_WEAPONS = ['kiblast', 'kamehameha', 'masenko', 'kienzan', 'taiyoken', 'aura', 'bakuhatsuha', 'orbit', 'genkidama', 'galick', 'makanko', 'sword'];

// ---------------------------------------------------------------------------
// Objetos equipables (uno por partida)
// ---------------------------------------------------------------------------
export const ITEMS = {
  pesas: { name: 'Pesas de Piccolo', desc: '+15% de daño, -5% de velocidad.', price: 400, mod: { might: 0.15, speed: -0.05 } },
  kinton: { name: 'Nube Kinton', desc: '+20% de velocidad.', price: 400, mod: { speed: 0.2 } },
  radar: { name: 'Radar del Dragón', desc: 'Las Bolas de Dragón aparecen antes y atraes objetos desde más lejos.', price: 500, mod: { magnet: 0.4, dball: 0.6 } },
  scouter: { name: 'Rastreador', desc: '+12% de golpe crítico y +10% de experiencia.', price: 600, mod: { crit: 0.12, growth: 0.1 } },
  senzu: { name: 'Bolsa de Semillas', desc: 'Revives una vez al caer.', price: 900, mod: { revive: 1 } },
  nyoibo: { name: 'Báculo Sagrado', desc: '+1 proyectil en todas las técnicas.', price: 1200, mod: { amount: 1 } },
  potara: { name: 'Pendientes Potara', desc: '+10% de daño, velocidad y vida.', price: 1500, mod: { might: 0.1, speed: 0.1, hp: 0.1 } },
  agua: { name: 'Agua Ultradivina', desc: '+40% de daño pero -30% de vida.', price: 800, mod: { might: 0.4, hp: -0.3 } },
  capsula: { name: 'Cápsula Corp', desc: 'Empiezas con una técnica extra al azar.', price: 700, mod: { extraWeapon: 1 } },
  cola: { name: 'Cola de mono', desc: 'Te transformas 4 niveles antes.', price: 1000, mod: { formLvl: -4 } },
  halo: { name: 'Halo del Otro Mundo', desc: '+1 de vida por segundo.', price: 600, mod: { regen: 1 } },
  ropa: { name: 'Ropa de Kaio-sama', desc: '-10% de recarga y +10% de área.', price: 800, mod: { haste: 0.1, area: 0.1 } },
};

// ---------------------------------------------------------------------------
// Misiones (logros). `stat` es una clave de save.stats; `target` el valor a alcanzar.
// ---------------------------------------------------------------------------
export const MISSIONS = [
  { id: 'k1', name: 'Primeros pasos', desc: 'Derrota a 500 enemigos.', stat: 'kills', target: 500, reward: 150 },
  { id: 'k2', name: 'Exterminador', desc: 'Derrota a 5.000 enemigos.', stat: 'kills', target: 5000, reward: 500 },
  { id: 'k3', name: 'Leyenda viviente', desc: 'Derrota a 30.000 enemigos.', stat: 'kills', target: 30000, reward: 1500 },
  { id: 'r1', name: 'Calentamiento', desc: 'Juega 3 partidas.', stat: 'runs', target: 3, reward: 150 },
  { id: 's1', name: 'Superviviente', desc: 'Aguanta 5 minutos.', stat: 'best', target: 300, reward: 200 },
  { id: 's2', name: 'Guerrero Z', desc: 'Aguanta 10 minutos.', stat: 'best', target: 600, reward: 400 },
  { id: 's3', name: 'Salvador de la Tierra', desc: 'Aguanta los 15 minutos.', stat: 'best', target: 900, reward: 1000 },
  { id: 'b1', name: 'Adiós, Raditz', desc: 'Derrota a Raditz.', stat: 'boss_raditz', target: 1, reward: 200 },
  { id: 'b2', name: 'El fin del emperador', desc: 'Derrota a Freezer.', stat: 'boss_freezer', target: 1, reward: 300 },
  { id: 'b3', name: 'Juegos de Cell', desc: 'Derrota a Cell.', stat: 'boss_cell', target: 1, reward: 400 },
  { id: 'b4', name: 'Adiós, Buu', desc: 'Derrota a Kid Buu.', stat: 'boss_buu', target: 1, reward: 500 },
  { id: 'b5', name: 'El legendario', desc: 'Derrota a Broly.', stat: 'boss_broly', target: 1, reward: 700 },
  { id: 'd1', name: 'Sal, Shenlong', desc: 'Pide un deseo a Shenlong.', stat: 'wishes', target: 1, reward: 300 },
  { id: 'd2', name: 'Coleccionista de esferas', desc: 'Pide 5 deseos.', stat: 'wishes', target: 5, reward: 800 },
  { id: 'l1', name: 'Entrenamiento duro', desc: 'Llega al nivel 25 en una partida.', stat: 'maxLevel', target: 25, reward: 250 },
  { id: 'l2', name: 'Más de 9.000', desc: 'Llega al nivel 50 en una partida.', stat: 'maxLevel', target: 50, reward: 700 },
  { id: 'f1', name: 'Despertar', desc: 'Alcanza la última forma de un personaje.', stat: 'maxForms', target: 1, reward: 400 },
  { id: 'e1', name: 'Técnica definitiva', desc: 'Evoluciona una técnica.', stat: 'evolutions', target: 1, reward: 400 },
  { id: 'c1', name: 'Equipo Z', desc: 'Consigue 10 personajes.', stat: 'owned', target: 10, reward: 400 },
  { id: 'c2', name: 'Multiverso', desc: 'Consigue 25 personajes.', stat: 'owned', target: 25, reward: 1000 },
  { id: 'c3', name: 'Todos los guerreros', desc: 'Consigue todos los personajes.', stat: 'owned', target: ROSTER.length, reward: 4000 },
  { id: 'g1', name: 'Deseo de poder', desc: 'Haz 10 invocaciones.', stat: 'pulls', target: 10, reward: 200 },
  { id: 'g2', name: 'Adicto a las cápsulas', desc: 'Haz 100 invocaciones.', stat: 'pulls', target: 100, reward: 1200 },
  { id: 'sh', name: '¡Brilla!', desc: 'Consigue un personaje brillante.', stat: 'shinies', target: 1, reward: 600 },
  { id: 'w3', name: 'Muchos héroes', desc: 'Gana con 3 personajes distintos.', stat: 'winners', target: 3, reward: 1500 },
  { id: 'v1', name: 'Fusión de técnicas', desc: 'Vincula técnicas 3 veces.', stat: 'bonds', target: 3, reward: 300 },
  { id: 'v2', name: 'Maestro de las artes', desc: 'Vincula técnicas 25 veces.', stat: 'bonds', target: 25, reward: 1000 },
  { id: 'u1', name: '¡Kame... hame... HA!', desc: 'Lanza 10 ataques definitivos.', stat: 'ults', target: 10, reward: 300 },
  { id: 'u2', name: 'Poder desbordante', desc: 'Lanza 100 ataques definitivos.', stat: 'ults', target: 100, reward: 1200 },
  { id: 'x1', name: 'Rompecápsulas', desc: 'Rompe 30 cápsulas.', stat: 'pods', target: 30, reward: 300 },
];
// Las misiones también dan Cristales de Ki para invocar (un 40% de su Zeni).
for (const m of MISSIONS) m.crystals = Math.round((m.reward * 0.4) / 10) * 10;

// ---------------------------------------------------------------------------
// Enemigos: hordas de Saibaman y variantes de color; élites y jefes son villanos de la serie.
// ---------------------------------------------------------------------------
export const ENEMIES = {
  saibaman: { name: 'Saibaman', sprite: 'saibaman', hp: 7, speed: 52, dmg: 5, xp: 1, r: 6 },
  kyukonman: { name: 'Kyukonman', sprite: 'saibaman', hue: -55, hp: 18, speed: 47, dmg: 7, xp: 2, r: 6 },
  jinkouman: { name: 'Jinkouman', sprite: 'saibaman', hue: 150, hp: 38, speed: 68, dmg: 10, xp: 4, r: 6 },
  tennenman: { name: 'Tennenman', sprite: 'saibaman', hue: -120, hp: 75, speed: 58, dmg: 14, xp: 6, r: 8,
    ranged: { range: 150, cd: 4.5, speed: 120, dmg: 6, fx: 'ki' } },
  // Se agarra a ti y se autodestruye (como con Yamcha). Avisa con un círculo rojo en el suelo.
  kamikaze: { name: 'Saibaman kamikaze', sprite: 'saibaman', hue: -95, hp: 14, speed: 66, dmg: 4, xp: 2, r: 6,
    bomb: { range: 30, fuse: 0.9, radius: 38, dmg: 16 } },
  bioman: { name: 'Bio-Man', sprite: 'bioman', hp: 46, speed: 74, dmg: 11, xp: 5, r: 7 },
};

// Élites (con contorno dorado): villanos que aparecen cada cierto tiempo.
export const ELITES = ['raditz', 'a16', 'a17', 'a18', 'turles', 'freezer_1', 'cell_1', 'buu_fat', 'frost_1', 'cooler'];

export const BOSSES = {
  raditz: { name: 'Raditz', sprite: 'raditz', r: 12, hp: 650, speed: 52, dmg: 15, xp: 60, color: '#ff6a6a' },
  freezer: { name: 'Freezer', sprite: 'freezer_final', r: 12, hp: 2200, speed: 60, dmg: 22, xp: 160, color: '#c77bff' },
  cell: { name: 'Cell Perfecto', sprite: 'cell_perfect', r: 13, hp: 6000, speed: 64, dmg: 28, xp: 300, color: '#5fe07a' },
  buu: { name: 'Kid Buu', sprite: 'buu_kid', r: 11, hp: 11000, speed: 74, dmg: 32, xp: 450, color: '#ff8ac8' },
  broly: { name: 'Broly', sprite: 'broly_lssj', r: 16, hp: 18000, speed: 68, dmg: 38, xp: 600, color: '#7aff6a' },
};

export const WAVES = [
  { t: 0, types: ['saibaman'], rate: 3.5 },
  { t: 60, types: ['saibaman', 'saibaman', 'kyukonman'], rate: 6 },
  { t: 150, types: ['kyukonman', 'saibaman', 'jinkouman', 'kamikaze'], rate: 8 },
  { t: 240, types: ['kyukonman', 'jinkouman', 'kamikaze'], rate: 10 },
  { t: 360, types: ['jinkouman', 'kyukonman', 'tennenman', 'bioman'], rate: 12 },
  { t: 480, types: ['jinkouman', 'tennenman', 'bioman', 'kamikaze'], rate: 14 },
  { t: 600, types: ['tennenman', 'bioman', 'jinkouman'], rate: 16 },
  { t: 720, types: ['tennenman', 'bioman', 'jinkouman', 'kamikaze'], rate: 19 },
];

export const BOSS_SCHEDULE = [
  { t: 120, id: 'raditz' },
  { t: 270, id: 'freezer' },
  { t: 450, id: 'cell' },
  { t: 630, id: 'buu' },
  { t: 810, id: 'broly' },
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
