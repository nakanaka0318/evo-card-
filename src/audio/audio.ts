// Procedural audio: every sound is synthesised with WebAudio, no asset files.

export type SfxName =
  | 'tap'
  | 'hover'
  | 'back'
  | 'draw'
  | 'play'
  | 'summon'
  | 'spell'
  | 'hit'
  | 'bigHit'
  | 'face'
  | 'shatter'
  | 'heal'
  | 'buff'
  | 'evolve'
  | 'super'
  | 'gachaTick'
  | 'gachaN'
  | 'gachaR'
  | 'gachaSR'
  | 'gachaSSR'
  | 'coin'
  | 'coins'
  | 'levelUp'
  | 'fever'
  | 'turn'
  | 'enemyTurn'
  | 'win'
  | 'lose'
  | 'like'
  | 'notify'
  | 'error'
  | 'cash'
  | 'heartbeat'
  | 'tick'
  | 'whoosh'
  | 'barrier'
  | 'combo'
  | 'unlock'
  | 'reveal'
  | 'stamp'
  | 'gem'
  | 'flip'
  | 'rankUp'
  | 'dice';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private sfxVol = 0.8;
  private musicVol = 0.5;
  private lastPlay = new Map<string, number>();
  muted = false;

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** must be called from a user gesture */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 8;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(comp);
      this.musicBus.connect(comp);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVol = sfx;
    this.musicVol = music;
    this.applyVolumes();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.muted ? 0 : this.sfxVol, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.muted ? 0 : this.musicVol * 0.55, t, 0.05);
  }

  // ------------------------------------------------------------ primitives
  tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      vol?: number;
      at?: number;
      attack?: number;
      slide?: number;
      bus?: GainNode;
      detune?: number;
      vib?: number;
      filter?: number;
    } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.at ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.detune) o.detune.value = opts.detune;
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    if (opts.vib) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = 6;
      lg.gain.value = opts.vib;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + 0.05);
    }
    const vol = opts.vol ?? 0.3;
    const atk = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o.connect(g);
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      node = node.connect(f);
    }
    node.connect(opts.bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(
    dur: number,
    opts: { type?: BiquadFilterType; freq?: number; to?: number; q?: number; vol?: number; at?: number; attack?: number; bus?: GainNode } = {},
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.setValueAtTime(opts.freq ?? 2000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(opts.bus ?? this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------ sfx
  play(name: SfxName, opts: { pitch?: number; vol?: number } = {}): void {
    if (!this.ctx || this.muted) return;
    // throttle identical sounds a little so rapid bursts stay clean
    const now = performance.now();
    const last = this.lastPlay.get(name) ?? 0;
    if (now - last < 25) return;
    this.lastPlay.set(name, now);
    const p = opts.pitch ?? 1;
    const v = opts.vol ?? 1;
    const T = (f: number, d: number, o: Parameters<AudioEngine['tone']>[2] = {}) => this.tone(f * p, d, { ...o, vol: (o.vol ?? 0.3) * v });
    const N = (d: number, o: Parameters<AudioEngine['noise']>[1] = {}) => this.noise(d, { ...o, vol: (o.vol ?? 0.3) * v });
    switch (name) {
      case 'tap':
        T(880, 0.06, { type: 'square', vol: 0.08 });
        T(1320, 0.05, { type: 'sine', vol: 0.08, at: 0.02 });
        break;
      case 'hover':
        T(1560, 0.03, { type: 'sine', vol: 0.03 });
        break;
      case 'back':
        T(660, 0.07, { type: 'square', vol: 0.07, slide: 440 });
        break;
      case 'draw':
        N(0.16, { type: 'bandpass', freq: 900, to: 4200, q: 2, vol: 0.18 });
        T(1760, 0.05, { vol: 0.06, at: 0.1 });
        break;
      case 'flip':
        N(0.08, { type: 'highpass', freq: 3000, vol: 0.12 });
        break;
      case 'play':
        T(523.25, 0.18, { type: 'triangle', vol: 0.24 });
        T(1046.5, 0.12, { type: 'sine', vol: 0.1, at: 0.03 });
        T(140, 0.18, { type: 'sine', vol: 0.3, slide: 60 });
        break;
      case 'summon':
        T(180, 0.28, { type: 'sine', vol: 0.45, slide: 45 });
        N(0.2, { type: 'lowpass', freq: 900, to: 200, vol: 0.25 });
        break;
      case 'spell':
        for (let i = 0; i < 5; i++) T(800 + i * 260, 0.35, { vol: 0.06, at: i * 0.03, slide: 1600 + i * 300 });
        N(0.4, { type: 'highpass', freq: 5000, vol: 0.08 });
        break;
      case 'hit':
        N(0.12, { type: 'lowpass', freq: 3000, to: 400, vol: 0.4 });
        T(260, 0.12, { type: 'square', vol: 0.12, slide: 80 });
        break;
      case 'bigHit':
        N(0.3, { type: 'lowpass', freq: 2400, to: 120, vol: 0.55 });
        T(120, 0.45, { type: 'sine', vol: 0.6, slide: 30 });
        T(220, 0.2, { type: 'sawtooth', vol: 0.12, slide: 50, filter: 900 });
        break;
      case 'face':
        T(90, 0.5, { type: 'sine', vol: 0.6, slide: 35 });
        N(0.35, { type: 'lowpass', freq: 1500, to: 100, vol: 0.45 });
        break;
      case 'shatter':
        N(0.35, { type: 'highpass', freq: 2500, vol: 0.3 });
        for (let i = 0; i < 6; i++) T(2000 + Math.random() * 3000, 0.12 + Math.random() * 0.15, { vol: 0.05, at: Math.random() * 0.12 });
        T(400, 0.2, { type: 'triangle', vol: 0.12, slide: 120 });
        break;
      case 'heal':
        [1046.5, 1318.5, 1568, 2093].forEach((f, i) => T(f, 0.25, { vol: 0.1, at: i * 0.05 }));
        break;
      case 'buff':
        T(400, 0.16, { type: 'square', vol: 0.08, slide: 900 });
        T(1200, 0.12, { vol: 0.08, at: 0.08 });
        break;
      case 'barrier':
        T(1400, 0.25, { vol: 0.1, slide: 600 });
        N(0.15, { type: 'highpass', freq: 4000, vol: 0.12 });
        break;
      case 'evolve': {
        T(180, 0.7, { type: 'sawtooth', vol: 0.12, slide: 1400, filter: 3000, attack: 0.3 });
        N(0.7, { type: 'bandpass', freq: 400, to: 6000, q: 1.5, vol: 0.18, attack: 0.4 });
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((f) => {
          T(f, 0.9, { type: 'sawtooth', vol: 0.06, at: 0.7, filter: 4000, detune: -8 });
          T(f, 0.9, { type: 'sawtooth', vol: 0.06, at: 0.7, filter: 4000, detune: 8 });
        });
        T(110, 0.6, { type: 'sine', vol: 0.5, at: 0.7, slide: 40 });
        break;
      }
      case 'super': {
        T(120, 1.1, { type: 'sawtooth', vol: 0.14, slide: 2200, filter: 4000, attack: 0.6 });
        T(180, 1.1, { type: 'square', vol: 0.06, slide: 1800, filter: 3000, attack: 0.6 });
        N(1.1, { type: 'bandpass', freq: 300, to: 8000, q: 1.2, vol: 0.22, attack: 0.8 });
        const chord = [392, 493.88, 587.33, 783.99, 987.77, 1174.66];
        chord.forEach((f, i) => {
          T(f, 1.4, { type: 'sawtooth', vol: 0.05, at: 1.1 + i * 0.015, filter: 5000, detune: -10 });
          T(f, 1.4, { type: 'sawtooth', vol: 0.05, at: 1.1 + i * 0.015, filter: 5000, detune: 10 });
        });
        T(80, 0.9, { type: 'sine', vol: 0.7, at: 1.1, slide: 28 });
        N(0.6, { type: 'lowpass', freq: 3000, to: 100, vol: 0.4, at: 1.1 });
        break;
      }
      case 'gachaTick':
        T(2400, 0.03, { type: 'square', vol: 0.05 });
        break;
      case 'gachaN':
        T(392, 0.18, { type: 'triangle', vol: 0.18 });
        break;
      case 'gachaR':
        T(523.25, 0.14, { type: 'triangle', vol: 0.18 });
        T(783.99, 0.22, { type: 'triangle', vol: 0.18, at: 0.08 });
        break;
      case 'gachaSR':
        [659.25, 830.61, 987.77].forEach((f, i) => T(f, 0.4, { type: 'square', vol: 0.07, at: i * 0.06, filter: 3000 }));
        T(1975.5, 0.5, { vol: 0.08, at: 0.2 });
        break;
      case 'gachaSSR':
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => T(f, 0.6, { type: 'square', vol: 0.07, at: i * 0.05, filter: 4000 }));
        N(1, { type: 'highpass', freq: 6000, vol: 0.12, at: 0.2 });
        T(80, 0.6, { type: 'sine', vol: 0.5, slide: 40 });
        break;
      case 'coin':
        T(987.77, 0.08, { type: 'square', vol: 0.08 });
        T(1318.5, 0.25, { type: 'square', vol: 0.08, at: 0.07 });
        break;
      case 'coins':
        for (let i = 0; i < 6; i++) T(1318.5 + (i % 2) * 300, 0.12, { type: 'square', vol: 0.05, at: i * 0.06 });
        break;
      case 'gem':
        [1567.98, 2093, 2637].forEach((f, i) => T(f, 0.3, { vol: 0.08, at: i * 0.05 }));
        break;
      case 'cash':
        N(0.08, { type: 'highpass', freq: 3000, vol: 0.2 });
        T(2093, 0.3, { type: 'square', vol: 0.06, at: 0.05 });
        T(2637, 0.4, { type: 'square', vol: 0.06, at: 0.1 });
        break;
      case 'levelUp':
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => T(f, 0.18, { type: 'square', vol: 0.08, at: i * 0.07, filter: 5000 }));
        T(1568, 0.5, { type: 'square', vol: 0.08, at: 0.35, filter: 5000 });
        break;
      case 'fever': {
        T(400, 1.2, { type: 'sawtooth', vol: 0.1, slide: 1600, filter: 4000, vib: 60 });
        for (let i = 0; i < 4; i++) {
          T(110, 0.2, { type: 'sine', vol: 0.5, at: i * 0.15, slide: 40 });
          N(0.1, { type: 'highpass', freq: 6000, vol: 0.12, at: i * 0.15 + 0.07 });
        }
        [523.25, 659.25, 783.99, 1046.5].forEach((f) => T(f, 0.8, { type: 'square', vol: 0.05, at: 0.6, filter: 3500 }));
        break;
      }
      case 'turn':
        N(0.3, { type: 'bandpass', freq: 400, to: 3000, q: 1, vol: 0.18 });
        T(783.99, 0.15, { type: 'triangle', vol: 0.16, at: 0.15 });
        T(1174.66, 0.3, { type: 'triangle', vol: 0.16, at: 0.25 });
        break;
      case 'enemyTurn':
        N(0.3, { type: 'bandpass', freq: 3000, to: 400, q: 1, vol: 0.14 });
        T(392, 0.25, { type: 'triangle', vol: 0.14, at: 0.15 });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          T(f, i === 6 ? 0.9 : 0.16, { type: 'square', vol: 0.08, at: i * 0.12, filter: 5000 }),
        );
        break;
      case 'lose':
        [523.25, 493.88, 466.16, 440].forEach((f, i) => T(f, i === 3 ? 0.9 : 0.3, { type: 'triangle', vol: 0.15, at: i * 0.28, vib: i === 3 ? 6 : 0 }));
        break;
      case 'like':
        T(700, 0.08, { vol: 0.12, slide: 1200 });
        break;
      case 'notify':
        T(1318.5, 0.08, { vol: 0.1 });
        T(1760, 0.16, { vol: 0.1, at: 0.08 });
        break;
      case 'error':
        T(150, 0.18, { type: 'square', vol: 0.1, filter: 800 });
        T(140, 0.18, { type: 'square', vol: 0.1, at: 0.1, filter: 800 });
        break;
      case 'heartbeat':
        T(70, 0.15, { vol: 0.5, slide: 40 });
        T(70, 0.15, { vol: 0.4, at: 0.18, slide: 40 });
        break;
      case 'tick':
        T(1200, 0.025, { type: 'square', vol: 0.05 });
        break;
      case 'whoosh':
        N(0.25, { type: 'bandpass', freq: 500, to: 3500, q: 1.5, vol: 0.2 });
        break;
      case 'combo':
        T(659.25, 0.12, { type: 'square', vol: 0.08, filter: 4000 });
        T(987.77, 0.2, { type: 'square', vol: 0.08, at: 0.05, filter: 4000 });
        break;
      case 'unlock':
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => T(f, 0.3, { type: 'sawtooth', vol: 0.06, at: i * 0.06, filter: 3500 }));
        T(100, 0.5, { vol: 0.5, slide: 40 });
        break;
      case 'reveal':
        N(0.5, { type: 'bandpass', freq: 600, to: 5000, q: 1, vol: 0.16 });
        T(1046.5, 0.4, { vol: 0.12, at: 0.3 });
        break;
      case 'stamp':
        T(90, 0.3, { vol: 0.6, slide: 40 });
        N(0.12, { type: 'lowpass', freq: 1200, vol: 0.4 });
        break;
      case 'rankUp':
        [392, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) =>
          T(f, 0.4, { type: 'sawtooth', vol: 0.05, at: i * 0.08, filter: 4500 }),
        );
        break;
      case 'dice':
        for (let i = 0; i < 5; i++) N(0.04, { type: 'bandpass', freq: 1800 + Math.random() * 1500, q: 4, vol: 0.2, at: i * 0.06 });
        break;
    }
  }

  vibrate(pattern: number | number[]): void {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* not supported */
    }
  }
}

export const audio = new AudioEngine();
