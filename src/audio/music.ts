import { audio } from './audio';

export type TrackName = 'title' | 'home' | 'battle' | 'fever' | 'gacha' | 'boss' | 'result';

interface TrackDef {
  bpm: number;
  root: number; // midi note of tonic
  minor: boolean;
  prog: number[]; // scale degree per bar
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  arp: boolean;
  lead: boolean;
  pad: boolean;
  seed: number;
  leadOct: number;
  leadType: OscillatorType;
  energy: number;
}

const TRACKS: Record<TrackName, TrackDef> = {
  title: {
    bpm: 112, root: 60, minor: false, prog: [0, 4, 5, 3],
    kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'x...x...x...x.x.',
    arp: true, lead: true, pad: true, seed: 7, leadOct: 1, leadType: 'square', energy: 0.7,
  },
  home: {
    bpm: 118, root: 62, minor: false, prog: [0, 5, 3, 4],
    kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'x..x..x...x..x..',
    arp: true, lead: true, pad: true, seed: 21, leadOct: 1, leadType: 'triangle', energy: 0.6,
  },
  battle: {
    bpm: 142, root: 57, minor: true, prog: [0, 5, 3, 4, 0, 5, 6, 4],
    kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'xxx.xxx.xxx.xxx.', bass: 'x.xxx.xxx.xxx.xx',
    arp: true, lead: true, pad: false, seed: 3, leadOct: 1, leadType: 'square', energy: 0.85,
  },
  fever: {
    bpm: 172, root: 59, minor: false, prog: [0, 4, 5, 3],
    kick: 'x...x...x...x...', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx', bass: 'xxxxxxxxxxxxxxxx',
    arp: true, lead: true, pad: true, seed: 99, leadOct: 2, leadType: 'square', energy: 1,
  },
  boss: {
    bpm: 150, root: 52, minor: true, prog: [0, 0, 5, 5, 3, 3, 4, 4],
    kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'x.x.x.x.x.x.x.x.',
    arp: true, lead: true, pad: true, seed: 66, leadOct: 1, leadType: 'sawtooth', energy: 0.9,
  },
  gacha: {
    bpm: 96, root: 64, minor: false, prog: [0, 3, 0, 4],
    kick: 'x.......x.......', snare: '............x...', hat: '....x.......x...', bass: 'x.......x.......',
    arp: true, lead: false, pad: true, seed: 12, leadOct: 1, leadType: 'triangle', energy: 0.5,
  },
  result: {
    bpm: 128, root: 60, minor: false, prog: [0, 3, 4, 0],
    kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'x...x...x...x...',
    arp: true, lead: true, pad: true, seed: 42, leadOct: 1, leadType: 'square', energy: 0.7,
  },
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Music {
  private track: TrackName | null = null;
  private def: TrackDef | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private melody: (number | null)[] = [];
  enabled = true;

  play(name: TrackName): void {
    if (this.track === name) return;
    this.track = name;
    this.def = TRACKS[name];
    this.melody = this.makeMelody(this.def);
    this.step = 0;
    if (!audio.ctx) return;
    this.nextTime = audio.ctx.currentTime + 0.08;
    this.ensureTimer();
  }

  current(): TrackName | null {
    return this.track;
  }

  /** resume scheduling after the audio context is unlocked */
  kick(): void {
    if (!this.track || !audio.ctx) return;
    if (this.nextTime < audio.ctx.currentTime) this.nextTime = audio.ctx.currentTime + 0.08;
    this.ensureTimer();
  }

  stop(): void {
    this.track = null;
    this.def = null;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private ensureTimer(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private makeMelody(d: TrackDef): (number | null)[] {
    const r = mulberry(d.seed);
    const bars = 4;
    const out: (number | null)[] = [];
    let deg = 4;
    const phrase: (number | null)[] = [];
    for (let i = 0; i < 16 * 2; i++) {
      const onBeat = i % 4 === 0;
      const play = onBeat ? r() < 0.85 : i % 2 === 0 ? r() < 0.45 : r() < 0.18;
      if (!play) {
        phrase.push(null);
        continue;
      }
      deg += Math.floor(r() * 5) - 2;
      deg = Math.max(0, Math.min(9, deg));
      phrase.push(deg);
    }
    // AABA structure over 4 bars of 16 steps (phrase = 2 bars)
    const b: (number | null)[] = phrase.map((x, i) => (x === null ? null : i > 20 ? Math.max(0, x - 2) : x));
    for (let bar = 0; bar < bars; bar += 2) out.push(...(bar === 2 ? b : phrase));
    return out;
  }

  private tick(): void {
    const ctx = audio.ctx;
    const d = this.def;
    if (!ctx || !d || !this.enabled) return;
    if (ctx.state !== 'running') return;
    // after a suspend (tab hidden, slow unlock) skip ahead instead of bursting old notes
    if (this.nextTime < ctx.currentTime - 0.1) this.nextTime = ctx.currentTime + 0.05;
    const spb = 60 / d.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.schedule(d, this.step, this.nextTime);
      this.nextTime += spb;
      this.step++;
    }
  }

  private schedule(d: TrackDef, step: number, time: number): void {
    const ctx = audio.ctx!;
    const at = Math.max(0, time - ctx.currentTime);
    const bus = audio.musicBus;
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const scale = d.minor ? MINOR : MAJOR;
    const chordDeg = d.prog[bar % d.prog.length];
    const note = (deg: number, oct = 0) => {
      const o = Math.floor(deg / 7);
      const k = ((deg % 7) + 7) % 7;
      return d.root + scale[k] + 12 * (o + oct);
    };
    const e = d.energy;
    const spb = 60 / d.bpm / 4;
    if (d.kick[s16] === 'x') {
      audio.tone(150, 0.22, { type: 'sine', vol: 0.55 * e, at, slide: 40, bus });
    }
    if (d.snare[s16] === 'x') {
      audio.noise(0.14, { type: 'bandpass', freq: 1800, q: 0.8, vol: 0.22 * e, at, bus });
      audio.tone(220, 0.08, { type: 'triangle', vol: 0.12 * e, at, slide: 120, bus });
    }
    if (d.hat[s16] === 'x') {
      audio.noise(0.04, { type: 'highpass', freq: 7500, vol: (s16 % 4 === 0 ? 0.08 : 0.05) * e, at, bus });
    }
    if (d.bass[s16] === 'x') {
      const oct = s16 % 8 === 6 ? 0 : -1;
      audio.tone(midi(note(chordDeg, oct - 1)), spb * 1.8, { type: 'square', vol: 0.11 * e, at, filter: 700, bus });
    }
    if (d.arp) {
      const tones = [0, 2, 4, 7];
      const k = tones[s16 % 4];
      if (s16 % 2 === 0 || e > 0.8) {
        audio.tone(midi(note(chordDeg + k, 1)), spb * 0.9, { type: 'triangle', vol: 0.045 * e, at, bus });
      }
    }
    if (d.pad && s16 === 0) {
      for (const k of [0, 2, 4]) {
        const f = midi(note(chordDeg + k, 0));
        audio.tone(f, spb * 15, { type: 'sawtooth', vol: 0.018, at, attack: 0.3, filter: 1400, detune: -7, bus });
        audio.tone(f, spb * 15, { type: 'sawtooth', vol: 0.018, at, attack: 0.3, filter: 1400, detune: 7, bus });
      }
    }
    if (d.lead) {
      const m = this.melody[step % this.melody.length];
      if (m !== null && m !== undefined) {
        const f = midi(note(chordDeg + m, d.leadOct) - 12);
        audio.tone(f, spb * 1.7, { type: d.leadType, vol: 0.05, at, filter: 3200, vib: 3, bus });
      }
    }
  }
}

export const music = new Music();
