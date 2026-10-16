// Música original compuesta para el juego y tocada en tiempo real con WebAudio (sin archivos).
// Cada tema es una progresión de acordes por compás + una melodía escrita a mano; el bajo,
// el arpegio, el colchón y la batería se generan a partir de los acordes con un estilo.
import { audioCtx, musicOut } from './audio.js';

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Acorde ('Am', 'F#m', 'Bb', 'G7', 'Fmaj7', 'Dsus4') -> notas MIDI alrededor de la octava 4
function chord(name) {
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  const root = midi(m[1] + '3');
  const q = m[2];
  let iv = [0, 4, 7];
  if (q.startsWith('m') && !q.startsWith('maj')) iv = [0, 3, 7];
  if (q.includes('dim')) iv = [0, 3, 6];
  if (q.includes('sus4')) iv = [0, 5, 7];
  if (q.includes('maj7')) iv = iv.concat(11);
  else if (q.includes('7')) iv = iv.concat(10);
  return { root, notes: iv.map((i) => root + 12 + i) };
}

// "E5 - G5 . C6" -> eventos { step, len, midi } ('-' alarga la nota anterior, '.' silencio)
function parseLine(str, offset) {
  const out = [];
  const toks = str.trim().split(/\s+/);
  let cur = null;
  toks.forEach((t, i) => {
    if (t === '-') {
      if (cur) cur.len++;
      return;
    }
    cur = null;
    if (t === '.') return;
    const m = midi(t);
    if (m !== null) out.push((cur = { step: offset + i, len: 1, midi: m }));
  });
  return out;
}

const DRUMS = {
  march: { k: 'x...x...x...x...', s: '....x.......x.x.', h: 'x.xxx.xxx.xxx.xx' },
  drive: { k: 'x...x...x..xx...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  soft: { k: 'x.......x.......', s: '................', h: '..x...x...x...x.' },
  rock: { k: 'x..x..x.x..x..x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' },
  tribal: { k: 'x..x...xx..x....', s: '......x.......x.', h: 'x...x.x.x...x.x.' },
  none: { k: '', s: '', h: '' },
};

export const SONGS = {
  // Pantalla de título: épico y luminoso
  title: {
    bpm: 140, drums: 'march', bass: 'eighth', arp: 'up', lead: 'square', pad: true,
    chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'],
    melody: [
      'D5 - - A4 D5 - E5 - F#5 - - - E5 - D5 -',
      'E5 - - - C#5 - A4 - E5 - - - . . . .',
      'F#5 - - D5 F#5 - G5 - A5 - - - G5 - F#5 -',
      'E5 - - - D5 - B4 - G5 - - - . . . .',
      'A5 - - F#5 A5 - B5 - A5 - F#5 - D5 - E5 -',
      'F#5 - E5 - C#5 - E5 - A4 - - - . . A4 B4',
      'D5 - - B4 D5 - E5 - G5 - F#5 - E5 - D5 -',
      'E5 - - - - - - - C#5 - E5 - A5 - - -',
    ],
  },
  // Menús: tranquilo
  menu: {
    bpm: 96, drums: 'soft', bass: 'half', arp: 'soft', lead: 'triangle', pad: true,
    chords: ['Fmaj7', 'Em7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'G7'],
    melody: [
      'A5 - - - G5 - E5 - - - - - . . . .',
      'G5 - - - E5 - D5 - - - - - . . . .',
      'F5 - - - E5 - C5 - D5 - - - . . . .',
      'B4 - - - - - - - . . . . . . . .',
      'C6 - - - B5 - G5 - - - A5 - . . . .',
      'G5 - - - E5 - - - D5 - E5 - . . . .',
      'F5 - - - A5 - - - G5 - F5 - E5 - D5 -',
      'C5 - - - - - - - . . . . . . . .',
    ],
  },
  // Monte Paoz: aventura
  paoz: {
    bpm: 150, drums: 'drive', bass: 'eighth', arp: 'up', lead: 'square', pad: false,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    melody: [
      'E5 - G5 - C6 - - - B5 - G5 - A5 - G5 -',
      'D5 - - - G5 - - - D5 - E5 - G5 - - -',
      'A5 - - - E5 - A5 - C6 - B5 - A5 - G5 -',
      'F5 - - - A5 - - - G5 - F5 - E5 - D5 -',
      'E5 - G5 - C6 - - - D6 - C6 - B5 - C6 -',
      'D6 - - - B5 - G5 - D5 - - - G5 - - -',
      'A5 - - - C6 - A5 - F5 - - - A5 - C6 -',
      'B5 - - - - - - - G5 - A5 - B5 - D6 -',
    ],
  },
  // Planeta Namek: misterioso
  namek: {
    bpm: 128, drums: 'tribal', bass: 'pulse', arp: 'down', lead: 'triangle', pad: true,
    chords: ['Dm', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'Gm', 'A'],
    melody: [
      'D5 - - - F5 - A5 - - - G5 - F5 - - -',
      'D5 - - - - - . . F5 - E5 - D5 - - -',
      'E5 - - - G5 - C6 - - - Bb5 - A5 - - -',
      'A5 - - - - - . . . . E5 - A5 - - -',
      'D6 - - - C6 - A5 - - - F5 - G5 - A5 -',
      'Bb5 - - - A5 - F5 - D5 - - - . . . .',
      'G5 - - - Bb5 - D6 - C6 - Bb5 - A5 - G5 -',
      'A5 - - - - - - - C#5 - E5 - A5 - - -',
    ],
  },
  // Namek en destrucción: tenso
  namekd: {
    bpm: 160, drums: 'rock', bass: 'gallop', arp: 'up', lead: 'saw', pad: false,
    chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'],
    melody: [
      'E5 . E5 . G5 . E5 . B5 - - - A5 - G5 -',
      'E5 - - - . . G5 . A5 - G5 - E5 - D5 -',
      'F#5 . F#5 . A5 . F#5 . D6 - - - C6 - A5 -',
      'B5 - - - . . D#5 . F#5 - B5 - D#6 - - -',
      'E6 - D6 - B5 - G5 - E5 - - - G5 - B5 -',
      'C6 - - - B5 - G5 - E5 - G5 - C6 - - -',
      'A5 - C6 - E6 - - - D6 - C6 - A5 - - -',
      'B5 - - - A5 - - - F#5 - - - D#5 - - -',
    ],
  },
  // Jefes
  boss: {
    bpm: 168, drums: 'rock', bass: 'gallop', arp: 'none', lead: 'saw', pad: true,
    chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'E', 'E'],
    melody: [
      'A4 . A4 . C5 . A4 . E5 . D5 . C5 . B4 .',
      'A4 - - - . . . . E5 . F5 . E5 . C5 .',
      'F5 - - - E5 - C5 - A4 - C5 - F5 - - -',
      'G5 - - - F5 - D5 - B4 - D5 - G5 - - -',
      'A5 . A5 . G5 . E5 . A5 . G5 . E5 . C5 .',
      'D5 - E5 - C5 - A4 - B4 - C5 - D5 - E5 -',
      'E5 - - - G#5 - - - B5 - - - G#5 - E5 -',
      'D5 - - - B4 - - - G#4 - - - E4 - - -',
    ],
  },
  // Ring de Cell y combates duros
  arena: {
    bpm: 150, drums: 'rock', bass: 'gallop', arp: 'up', lead: 'saw', pad: true,
    chords: ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Fm', 'G'],
    melody: [
      'C5 - - - Eb5 - G5 - C6 - - - Bb5 - G5 -',
      'Ab5 - - - G5 - Eb5 - C5 - - - . . . .',
      'Bb4 - D5 - F5 - Bb5 - Ab5 - G5 - F5 - D5 -',
      'G5 - - - - - . . B4 - D5 - G5 - - -',
      'C6 - Bb5 - G5 - Eb5 - G5 - - - C6 - - -',
      'Ab5 - - - C6 - - - Eb6 - D6 - C6 - - -',
      'F5 - - - Ab5 - C6 - Bb5 - Ab5 - G5 - F5 -',
      'G5 - - - B5 - - - D6 - - - G6 - - -',
    ],
  },
  // Dragon Ball Super: épico
  super: {
    bpm: 156, drums: 'march', bass: 'eighth', arp: 'up', lead: 'square', pad: true,
    chords: ['E', 'B', 'C#m', 'A', 'E', 'B', 'A', 'B'],
    melody: [
      'E5 - - B4 E5 - F#5 - G#5 - - - F#5 - E5 -',
      'D#5 - - - F#5 - B5 - A5 - G#5 - F#5 - - -',
      'G#5 - - - C#6 - - - B5 - A5 - G#5 - F#5 -',
      'E5 - - - A5 - - - C#6 - B5 - A5 - - -',
      'B5 - - G#5 B5 - C#6 - E6 - - - D#6 - B5 -',
      'F#5 - - - D#5 - F#5 - B5 - - - . . B4 C#5',
      'E5 - - C#5 E5 - F#5 - A5 - G#5 - F#5 - E5 -',
      'F#5 - - - - - - - D#5 - F#5 - B5 - - -',
    ],
  },
  // Invocación: brillante
  gacha: {
    bpm: 120, drums: 'soft', bass: 'half', arp: 'bell', lead: 'triangle', pad: true,
    chords: ['C', 'Am', 'F', 'G'],
    melody: [
      'G5 . E5 . G5 . C6 . E6 - - - D6 - C6 -',
      'C6 - A5 - - - E5 - A5 - - - . . . .',
      'F5 . A5 . C6 . F6 . E6 - - - D6 - C6 -',
      'B5 - - - D6 - - - G6 - - - . . . .',
    ],
  },
  win: {
    bpm: 150, drums: 'march', bass: 'eighth', arp: 'up', lead: 'square', pad: true, once: true,
    chords: ['C', 'F', 'G', 'C'],
    melody: [
      'C5 . E5 . G5 . C6 - - - G5 . C6 - - -',
      'A5 - - - C6 - - - F6 - - - . . . .',
      'G5 . B5 . D6 . G6 - - - F6 . D6 - - -',
      'E6 - - - - - - - - - - - - - - -',
    ],
  },
  lose: {
    bpm: 84, drums: 'none', bass: 'half', arp: 'none', lead: 'triangle', pad: true, once: true,
    chords: ['Am', 'F', 'Dm', 'E'],
    melody: [
      'A4 - - - C5 - - - E5 - - - D5 - C5 -',
      'A4 - - - - - - - . . . . . . . .',
      'F4 - - - A4 - - - D5 - - - C5 - B4 -',
      'G#4 - - - - - - - - - - - . . . .',
    ],
  },
};

// ---------------------------------------------------------------------------
// Instrumentos
// ---------------------------------------------------------------------------
let noiseBuf = null;
function noise(c) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function voice(c, out, t, dur, freq, { type = 'square', vol = 0.2, a = 0.005, r = 0.08, cutoff = 0, vib = 0, detune = 0 }) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  if (vib) {
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = 5.5;
    lg.gain.value = freq * 0.012 * vib;
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t + 0.12);
    l.stop(t + dur + r);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur - 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
  let node = o;
  if (cutoff) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    o.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + dur + r + 0.02);
}

function drum(c, out, t, kind) {
  if (kind === 'k') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.18);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  const g = c.createGain();
  if (kind === 's') {
    f.type = 'bandpass';
    f.frequency.value = 1800;
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  } else {
    f.type = 'highpass';
    f.frequency.value = 7000;
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  }
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.2);
}

const LEADS = {
  square: { type: 'square', vol: 0.11, cutoff: 3200, vib: 1 },
  triangle: { type: 'triangle', vol: 0.22, vib: 1 },
  saw: { type: 'sawtooth', vol: 0.09, cutoff: 2600, vib: 0.8 },
};

// ---------------------------------------------------------------------------
// Reproductor con planificación anticipada
// ---------------------------------------------------------------------------
let current = null; // { id, song, gain, start, step, events, len }
let timer = null;

function compile(song) {
  const bars = song.chords.length;
  const len = bars * 16;
  const lead = [];
  song.melody.forEach((line, b) => lead.push(...parseLine(line, b * 16)));
  return { lead, len, chords: song.chords.map(chord) };
}

function schedule() {
  const c = audioCtx();
  if (!c || !current) return;
  const { song, comp, out } = current;
  const spb = 60 / song.bpm / 4; // segundos por semicorchea
  const horizon = c.currentTime + 0.15;
  while (current.start + current.step * spb < horizon) {
    const st = current.step;
    const t = current.start + st * spb;
    if (song.once && st >= comp.len) {
      stopMusic(0.8);
      return;
    }
    const s = st % comp.len;
    const bar = Math.floor(s / 16);
    const k = s % 16;
    const ch = comp.chords[bar];
    // Melodía
    for (const ev of comp.lead) if (ev.step === s) voice(c, out, t, ev.len * spb, hz(ev.midi), LEADS[song.lead]);
    // Bajo
    const bassNote = hz(ch.root - 12);
    if (song.bass === 'eighth' && k % 2 === 0) voice(c, out, t, spb * 1.6, k % 4 === 2 ? bassNote * 2 : bassNote, { type: 'triangle', vol: 0.32 });
    if (song.bass === 'half' && k % 8 === 0) voice(c, out, t, spb * 7, bassNote, { type: 'triangle', vol: 0.3, r: 0.2 });
    if (song.bass === 'pulse' && [0, 3, 6, 8, 11, 14].includes(k)) voice(c, out, t, spb * 1.5, bassNote, { type: 'triangle', vol: 0.3 });
    if (song.bass === 'gallop' && [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(k)) {
      voice(c, out, t, spb * 0.8, bassNote, { type: 'sawtooth', vol: 0.12, cutoff: 700 });
    }
    // Arpegio
    const ns = ch.notes;
    if (song.arp === 'up') voice(c, out, t, spb * 0.7, hz(ns[k % ns.length] + 12), { type: 'square', vol: 0.035, cutoff: 2400 });
    if (song.arp === 'down' && k % 2 === 0) voice(c, out, t, spb * 1.5, hz(ns[ns.length - 1 - ((k / 2) % ns.length)] + 12), { type: 'triangle', vol: 0.08 });
    if (song.arp === 'soft' && k % 4 === 0) voice(c, out, t, spb * 3, hz(ns[(k / 4) % ns.length] + 12), { type: 'triangle', vol: 0.07, r: 0.3 });
    if (song.arp === 'bell' && k % 2 === 0) voice(c, out, t, spb, hz(ns[(k / 2) % ns.length] + 24), { type: 'triangle', vol: 0.06, r: 0.25 });
    // Colchón
    if (song.pad && k === 0) {
      for (const n of ns.slice(0, 3)) {
        voice(c, out, t, spb * 15, hz(n), { type: 'sawtooth', vol: 0.025, a: 0.25, r: 0.4, cutoff: 900, detune: 7 });
      }
    }
    // Batería
    const d = DRUMS[song.drums];
    for (const kind of ['k', 's', 'h']) if (d[kind][k] === 'x') drum(c, out, t, kind);
    current.step++;
  }
}

export function playMusic(id) {
  if (current && current.id === id) return;
  const c = audioCtx();
  if (!c) return;
  stopMusic(0.6);
  const song = SONGS[id];
  if (!song) return;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 0.5);
  out.connect(musicOut());
  current = { id, song, comp: compile(song), out, start: c.currentTime + 0.08, step: 0 };
  if (!timer) timer = setInterval(schedule, 40);
  schedule();
}

export function stopMusic(fade = 0.5) {
  const c = audioCtx();
  if (!current || !c) return;
  const g = current.out;
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setValueAtTime(g.gain.value, c.currentTime);
  g.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
  setTimeout(() => g.disconnect(), fade * 1000 + 300);
  current = null;
}

export function currentMusic() {
  return current ? current.id : null;
}
