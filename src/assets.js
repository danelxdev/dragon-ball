// Carga de sprites reales (assets/manifest.json generado por tools/build_assets.py).

export const assets = { m: null, img: {} };
const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar ' + src));
    img.src = src;
  });
}

export async function loadAssets() {
  // Si existe dist/assets-data.js (versión empaquetada), las imágenes van incrustadas y el
  // juego funciona abriendo index.html con doble clic (file://), sin servidor.
  const emb = typeof window !== 'undefined' && window.__DBS_ASSETS;
  const m = emb ? emb.manifest : await (await fetch('assets/manifest.json')).json();
  assets.m = m;
  const jobs = [];
  for (const kind of Object.keys(m)) {
    for (const [key, v] of Object.entries(m[kind])) {
      const src = emb ? emb.images[v.file] : 'assets/' + v.file;
      jobs.push(loadImage(src).then((img) => (assets.img[kind + ':' + key] = img)));
    }
  }
  await Promise.all(jobs);
}

export function img(kind, key) {
  return assets.img[kind + ':' + key];
}

export function meta(kind, key) {
  return assets.m[kind][key];
}

// Versión del sprite con los píxeles transformados (silueta blanca, cambio de tono...).
export function recolor(kind, key, mode) {
  const ck = kind + ':' + key + ':' + mode;
  let c = cache.get(ck);
  if (c) return c;
  const src = img(kind, key);
  c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    if (mode === 'white') {
      d[i] = d[i + 1] = d[i + 2] = 255;
    } else if (mode.startsWith('hue')) {
      const [r, g, b] = hueShift(d[i], d[i + 1], d[i + 2], +mode.slice(3));
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    } else if (mode.startsWith('sil')) {
      const hex = mode.slice(3);
      d[i] = parseInt(hex.slice(0, 2), 16);
      d[i + 1] = parseInt(hex.slice(2, 4), 16);
      d[i + 2] = parseInt(hex.slice(4, 6), 16);
    } else if (mode === 'gold') {
      const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
      d[i] = Math.min(255, l * 1.3 + 40);
      d[i + 1] = Math.min(255, l * 1.05 + 20);
      d[i + 2] = l * 0.4;
    }
  }
  ctx.putImageData(data, 0, 0);
  cache.set(ck, c);
  return c;
}

function hueShift(r, g, b, deg) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const dlt = max - min;
  const s = dlt === 0 ? 0 : dlt / (1 - Math.abs(2 * l - 1));
  if (dlt) {
    if (max === r) h = ((g - b) / dlt) % 6;
    else if (max === g) h = (b - r) / dlt + 2;
    else h = (r - g) / dlt + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return [(rr + m) * 255, (gg + m) * 255, (bb + m) * 255];
}

// Dibuja un fotograma de una hoja de personaje con los pies en (x, y).
// dir: 0 abajo, 1 izquierda, 2 derecha, 3 arriba.
export function drawChar(ctx, id, dir, frame, x, y, scale = 1, mode = null) {
  const m = assets.m.chars[id];
  const src = mode ? recolor('chars', id, mode) : img('chars', id);
  const f = frame % m.frames;
  const w = m.fw * scale;
  const h = m.fh * scale;
  ctx.drawImage(src, f * m.fw, dir * m.fh, m.fw, m.fh, Math.round(x - w / 2), Math.round(y - h + scale), w, h);
}

// Dibuja el fotograma i de una tira horizontal de efectos/objetos.
export function drawStrip(ctx, kind, key, i, x, y, w, h, fw, fh, row = 0, mode = null) {
  const src = mode ? recolor(kind, key, mode) : img(kind, key);
  const m = meta(kind, key);
  const fW = fw || m.fw || m.w;
  const fH = fh || m.fh || m.h;
  const n = Math.max(1, Math.floor(src.width / fW));
  ctx.drawImage(src, (i % n) * fW, row * fH, fW, fH, x, y, w, h);
}

// Escribe un número con una fuente de dígitos en tira (ui:dmg, ui:timer). ':' es el índice 10.
export function drawNumber(ctx, key, text, x, y, align = 'center', mode = null) {
  const m = meta('ui', key);
  const src = mode ? recolor('ui', key, mode) : img('ui', key);
  const str = String(text);
  const adv = m.fw - (key === 'dmg' ? 1 : 0);
  const w = str.length * adv;
  let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  for (const ch of str) {
    const i = ch === ':' ? 10 : ch.charCodeAt(0) - 48;
    if (i >= 0 && i <= 10) ctx.drawImage(src, i * m.fw, 0, m.fw, m.fh, cx, Math.round(y), m.fw, m.fh);
    cx += adv;
  }
}

// Personajes en vista lateral (assets/heroes): tira de fotogramas mirando a la derecha.
// Los pies quedan en (x, y); flip los gira para mirar a la izquierda.
export function drawHero(ctx, id, frame, x, y, flip = false, mode = null, scale = 1) {
  const m = assets.m.heroes[id];
  if (!m) return;
  const src = mode ? recolor('heroes', id, mode) : img('heroes', id);
  const f = ((frame % m.frames) + m.frames) % m.frames;
  const w = m.fw * scale;
  const h = m.fh * scale;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, f * m.fw, 0, m.fw, m.fh, Math.round(-w / 2), Math.round(y - h), w, h);
    ctx.restore();
  } else {
    ctx.drawImage(src, f * m.fw, 0, m.fw, m.fh, Math.round(x - w / 2), Math.round(y - h), w, h);
  }
}

export function heroSize(id) {
  const m = assets.m.heroes[id];
  return m ? { w: m.fw, h: m.fh } : { w: 32, h: 48 };
}

// Retrato: la parte superior del primer fotograma (cabeza y torso) en un lienzo cuadrado.
export function heroPortrait(id, size = 48, mode = null) {
  const m = assets.m.heroes[id];
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  if (!m) return c;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const src = mode ? recolor('heroes', id, mode) : img('heroes', id);
  const crop = Math.min(m.fw, Math.round(m.fh * 0.62));
  const sx = Math.round((m.fw - crop) / 2);
  ctx.drawImage(src, sx, 0, crop, crop, 0, 0, size, size);
  return c;
}

// Dibuja el personaje entero centrado en un lienzo (para cartas y menús).
export function heroCard(id, w, h, mode = null, frame = 0, shiny = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const m = assets.m.heroes[id];
  if (!m) return c;
  const s = Math.max(1, Math.floor(Math.min(w / (m.fw + 2), (h - 3) / (m.fh + 1))));
  if (shiny) drawShinyOutline(ctx, id, frame, w / 2, h - 2, false, s);
  drawHero(ctx, id, frame, w / 2, h - 2, false, mode, s);
  return c;
}

// Contorno luminoso para personajes brillantes (sin cambiar sus colores).
export function drawShinyOutline(ctx, id, frame, x, y, flip = false, scale = 1) {
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    drawHero(ctx, id, frame, x + ox * scale, y + oy * scale, flip, 'silfff2a0', scale);
  }
}
