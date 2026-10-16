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
  const res = await fetch('assets/manifest.json');
  const m = await res.json();
  assets.m = m;
  const jobs = [];
  for (const kind of Object.keys(m)) {
    for (const [key, v] of Object.entries(m[kind])) {
      jobs.push(loadImage('assets/' + v.file).then((img) => (assets.img[kind + ':' + key] = img)));
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
