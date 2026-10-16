// Efectos de sonido sintetizados con WebAudio (sin archivos externos).
// La música (src/music.js) comparte el mismo AudioContext con su propio volumen.

let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;
let muted = false;
let vol = { music: 0.6, sfx: 0.8 };
const last = {};

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.25 * vol.sfx;
  sfxGain.connect(master);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.32 * vol.music;
  musicGain.connect(master);
  return ctx;
}

export function audioCtx() {
  return ensure();
}

export function musicOut() {
  ensure();
  return musicGain;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 1;
}
export function isMuted() {
  return muted;
}

export function setVolumes(v) {
  vol = { ...vol, ...v };
  if (sfxGain) sfxGain.gain.value = 0.25 * vol.sfx;
  if (musicGain) musicGain.gain.value = 0.32 * vol.music;
}

function tone({ type = 'square', from = 440, to = from, dur = 0.1, vol = 0.3, noise = false }) {
  const c = ensure();
  if (!c || muted || !vol.sfx) return;
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  g.connect(sfxGain);
  if (noise) {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    src.connect(f);
    f.connect(g);
    src.start(t);
    src.stop(t + dur);
    return;
  }
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur);
}

const SFX = {
  shot: () => tone({ type: 'square', from: 880, to: 440, dur: 0.06, vol: 0.08 }),
  beam: () => tone({ type: 'sawtooth', from: 200, to: 900, dur: 0.35, vol: 0.12 }),
  hit: () => tone({ type: 'square', from: 220, to: 110, dur: 0.04, vol: 0.06 }),
  boom: () => tone({ noise: true, from: 1800, to: 80, dur: 0.4, vol: 0.4 }),
  pickup: () => tone({ type: 'triangle', from: 900, to: 1400, dur: 0.05, vol: 0.06 }),
  hurt: () => tone({ type: 'sawtooth', from: 300, to: 80, dur: 0.15, vol: 0.2 }),
  level: () => {
    tone({ type: 'square', from: 523, dur: 0.1, vol: 0.15 });
    setTimeout(() => tone({ type: 'square', from: 659, dur: 0.1, vol: 0.15 }), 90);
    setTimeout(() => tone({ type: 'square', from: 784, dur: 0.18, vol: 0.15 }), 180);
  },
  transform: () => {
    tone({ noise: true, from: 400, to: 4000, dur: 1.0, vol: 0.35 });
    tone({ type: 'sawtooth', from: 80, to: 600, dur: 1.0, vol: 0.15 });
  },
  dragonball: () => {
    tone({ type: 'triangle', from: 1046, dur: 0.12, vol: 0.2 });
    setTimeout(() => tone({ type: 'triangle', from: 1568, dur: 0.25, vol: 0.2 }), 110);
  },
  boss: () => tone({ type: 'sawtooth', from: 110, to: 55, dur: 0.8, vol: 0.3 }),
  slash: () => tone({ noise: true, from: 6000, to: 800, dur: 0.12, vol: 0.12 }),
  switch: () => tone({ type: 'square', from: 660, to: 990, dur: 0.07, vol: 0.1 }),
  ult: () => {
    tone({ type: 'sawtooth', from: 60, to: 900, dur: 1.2, vol: 0.18 });
    tone({ noise: true, from: 300, to: 6000, dur: 1.2, vol: 0.3 });
  },
  bond: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ type: 'triangle', from: f, dur: 0.18, vol: 0.2 }), i * 80));
  },
  fuse: () => tone({ type: 'square', from: 300, to: 60, dur: 0.25, vol: 0.12 }),
  coin: () => {
    tone({ type: 'square', from: 988, dur: 0.05, vol: 0.08 });
    setTimeout(() => tone({ type: 'square', from: 1319, dur: 0.12, vol: 0.08 }), 50);
  },
  capsule: () => tone({ type: 'triangle', from: 300, to: 1200, dur: 0.5, vol: 0.18 }),
  reveal: () => {
    tone({ noise: true, from: 8000, to: 500, dur: 0.5, vol: 0.25 });
    tone({ type: 'triangle', from: 1568, dur: 0.4, vol: 0.18 });
  },
};

export function sfx(name, minGap = 0.04) {
  const now = performance.now() / 1000;
  if (last[name] && now - last[name] < minGap) return;
  last[name] = now;
  const f = SFX[name];
  if (f) f();
}
