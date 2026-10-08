import { audio } from '../../audio/audio';
import { def } from '../../engine';
import { h } from '../dom';
import { stage } from '../stage';
import { flash, fxConfig, shake, T } from './fx';
import { particles } from './particles';

/**
 * 登場演出 — every legend card has its own entrance scene (battle play and pack
 * pulls). Each scene builds DOM inside a full-screen layer and schedules beats
 * on a shared timeline; a common name plate lands at ~55%. Tap to skip.
 */

const DUR = 2700;

interface SceneCtx {
  el: HTMLElement;
  W: number;
  H: number;
  enemy: boolean;
  /** schedule a beat (ms on the unscaled timeline) */
  at(ms: number, fn: () => void): void;
  add(...nodes: (HTMLElement | null)[]): void;
}

type Scene = (c: SceneCtx) => void;

// ------------------------------------------------------------ sound helpers
type Note = [freq: number, at: number, dur: number];
function seq(notes: Note[], type: OscillatorType, vol = 0.12, extra: Parameters<typeof audio.tone>[2] = {}): void {
  if (!audio.ctx) return;
  const k = 1 / fxConfig.speed;
  for (const [f, at, d] of notes) audio.tone(f, d * k, { type, vol, at: at * k, ...extra });
}
const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ------------------------------------------------------------ scenes
const SCENES: Record<string, Scene> = {
  // ドーパミン大王: royal entrance — carpet, trumpets, falling crown, DOPA ring fills
  n_king: (c) => {
    c.add(h('div.lg-carpet'), h('div.lg-trumpet.l', '🎺'), h('div.lg-trumpet.r', '🎺'), h('div.lg-gauge'), h('div.lg-king', '🤴'), h('div.lg-crown', '👑'));
    seq([[NOTE(60), 0.05, 0.2], [NOTE(64), 0.25, 0.2], [NOTE(67), 0.45, 0.2], [NOTE(72), 0.65, 0.7], [NOTE(67), 0.65, 0.7], [NOTE(64), 0.65, 0.7]], 'sawtooth', 0.07, { filter: 2400 });
    c.at(820, () => {
      shake(16, 320);
      audio.play('bigHit');
      particles.burst(c.W / 2, c.H * 0.36, { n: 60, colors: ['#ffe14d', '#fff3b0', '#fff'], speed: 14, type: 'star', size: 8 });
    });
    c.at(1100, () => particles.rain('✨', 24, 30));
  },

  // ネオンユニコーン: neon sign flickers on, unicorn gallops through on a rainbow
  n_unicorn: (c) => {
    c.add(h('div.lg-neon', 'NEON', h('br'), 'UNICORN'), h('div.lg-rainbow'), h('div.lg-gallop', '🦄'));
    seq([[NOTE(72), 0.1, 0.25], [NOTE(76), 0.22, 0.25], [NOTE(79), 0.34, 0.25], [NOTE(84), 0.46, 0.25], [NOTE(88), 0.58, 0.5], [NOTE(91), 0.7, 0.8]], 'sine', 0.1);
    for (let i = 0; i < 4; i++) c.at(300 + i * 90, () => audio.tone(2400, 0.04, { type: 'square', vol: 0.03 }));
    c.at(700, () => audio.play('whoosh'));
    for (let i = 0; i < 6; i++)
      c.at(700 + i * 110, () => particles.burst((c.W * (i + 1)) / 7, c.H * 0.55, { n: 12, colors: ['#ff5fd2', '#ffe14d', '#38d6ff', '#3dff95', '#a066ff'], speed: 6, type: 'star', size: 6 }));
  },

  // ガチャ姫ルーレ: giant roulette spins down and lands on SSR
  g_roule: (c) => {
    const labels = ['N', 'R', 'SR', 'N', 'R', 'SSR', 'N', 'R'];
    const wheel = h(
      'div.lg-wheel',
      labels.map((t, i) => h(`span.lg-seg.s-${t}`, { style: { transform: `rotate(${i * 45 + 22.5}deg) translateY(-150px)` } }, t)),
    );
    c.add(h('div.lg-lights'), h('div.lg-pointer', '▼'), wheel, h('div.lg-ssr', 'SSR!!'), h('div.lg-princess', '👸'));
    // decelerating tick-tick-tick
    let t = 0;
    for (let i = 0; i < 22; i++) {
      t += 30 + i * i * 2.2;
      c.at(t, () => audio.play('gachaTick', { pitch: 1.4 - i * 0.025, vol: 0.7 }));
    }
    c.at(1650, () => {
      audio.play('gachaSSR');
      flash('#ffe14d', 0.6, 300);
      shake(14, 300);
      particles.burst(c.W / 2, c.H * 0.45, { n: 90, colors: ['#ff3fa4', '#ffe14d', '#38d6ff', '#fff'], speed: 16, type: 'star', size: 8 });
      particles.confetti(60);
    });
  },

  // 無限カプセル工場: sirens, conveyor belt, capsule avalanche
  g_factory: (c) => {
    const caps = Array.from({ length: 7 }, (_, i) => h('span.lg-cap', { style: { animationDelay: `calc(${i * 0.16}s * var(--k))` } }, '🥚'));
    c.add(h('div.lg-siren.l'), h('div.lg-siren.r'), h('div.lg-belt', caps), h('div.lg-factory', '🏭'), h('div.lg-stamp', '大量生産開始'));
    for (let i = 0; i < 4; i++) audio.tone(i % 2 ? 660 : 880, 0.32 * (1 / fxConfig.speed), { type: 'square', vol: 0.05, at: (i * 0.32) / fxConfig.speed });
    for (let i = 0; i < 8; i++) c.at(200 + i * 160, () => audio.noise(0.06, { type: 'bandpass', freq: 600, q: 4, vol: 0.25 }));
    c.at(1250, () => {
      audio.play('stamp');
      shake(12, 260);
      particles.rain('🥚', 30, 34);
    });
  },

  // 超人気Vtuber バズリン: going live — viewer count explodes, comments flood in
  s_buzzrin: (c) => {
    const count = h('span.lg-viewers', '0');
    const words = ['こんバズ〜！', 'かわいい', '神回', '888888', 'きたあああ', '💖💖💖', '草', '推し！', '初見です', 'スパチャ¥10000', 'バズリン！', '天才'];
    const comments = words.map((w, i) =>
      h('span.lg-comment', { style: { top: `${8 + ((i * 37) % 70)}%`, animationDelay: `calc(${(i * 0.11).toFixed(2)}s * var(--k))` } }, w),
    );
    c.add(h('div.lg-livebar', h('span.lg-live', '● LIVE'), h('span.lg-eye', '👁 ', count)), h('div.lg-heartframe', '🦊'), ...comments);
    let n = 0;
    for (let i = 1; i <= 24; i++)
      c.at(80 + i * 55, () => {
        n = Math.round(1_000_000 * Math.pow(i / 24, 3));
        count.textContent = n.toLocaleString('ja-JP');
        if (i % 3 === 0) audio.play('notify', { pitch: 1 + i * 0.03, vol: 0.5 });
      });
    c.at(1450, () => {
      audio.play('like');
      particles.rain('💖', 30, 30);
      flash('#ff5fd2', 0.35, 260);
    });
  },

  // アルゴリズム様: data rain, glitch, a giant eye opens, the graph goes vertical
  s_algo: (c) => {
    const cols = Array.from({ length: 14 }, (_, i) =>
      h('span.lg-code', { style: { left: `${(i / 14) * 100 + 2}%`, animationDelay: `calc(${((i * 7) % 10) * 0.07}s * var(--k))` } }, '1010110\n0110101\n👁1001\n📈0110\n1101001'),
    );
    const graph = h('div.lg-graph', { html: '<svg viewBox="0 0 400 200" preserveAspectRatio="none"><polyline points="0,190 60,170 110,178 170,140 220,150 270,90 320,70 360,20 400,0" /></svg>' });
    c.add(...cols, h('div.lg-scan'), graph, h('div.lg-bigeye', '👁️'), h('div.lg-glitch', 'あなたは、見られている'));
    audio.tone(55, 2.2 / fxConfig.speed, { type: 'sawtooth', vol: 0.08, filter: 300 });
    for (let i = 0; i < 12; i++) c.at(100 + i * 110, () => audio.tone(1200 + ((i * 337) % 1400), 0.04, { type: 'square', vol: 0.04 }));
    c.at(700, () => {
      shake(8, 300);
      audio.play('reveal');
    });
  },

  // いちご女王アマミ: curtains open on a cake throne under a strawberry shower
  w_amami: (c) => {
    c.add(h('div.lg-swirl'), h('div.lg-throne', '🎂'), h('div.lg-queen', '👸', h('span', '🍓')), h('div.lg-curtain.l'), h('div.lg-curtain.r'));
    // music box waltz
    seq([[NOTE(84), 0.1, 0.4], [NOTE(88), 0.35, 0.4], [NOTE(91), 0.6, 0.4], [NOTE(96), 0.85, 0.6], [NOTE(91), 1.15, 0.4], [NOTE(88), 1.4, 0.4], [NOTE(84), 1.65, 0.9]], 'sine', 0.1);
    c.at(300, () => particles.rain('🍓', 26, 32));
    c.at(1000, () => {
      audio.play('heal');
      particles.burst(c.W / 2, c.H * 0.4, { n: 40, colors: ['#ff8fb8', '#fff', '#ffe0ea'], speed: 10, type: 'glyph', glyph: '💗', size: 22 });
    });
  },

  // わたあめドラゴン: fluffy clouds swallow the screen, then part for the dragon's roar
  w_cotton: (c) => {
    const puffs = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return h('span.lg-puff', { style: { left: `${50 + Math.cos(a) * 28}%`, top: `${50 + Math.sin(a) * 26}%`, '--dx': `${Math.cos(a) * 70}vw`, '--dy': `${Math.sin(a) * 70}vh`, animationDelay: `calc(${i * 0.05}s * var(--k))` } });
    });
    c.add(h('div.lg-beam'), h('div.lg-dragon', '🐉'), ...puffs);
    c.at(1050, () => {
      audio.noise(0.9, { type: 'lowpass', freq: 900, to: 120, vol: 0.5 });
      audio.tone(70, 0.9, { type: 'sawtooth', vol: 0.18, slide: 40, filter: 500 });
      shake(22, 520);
      flash('#ffd6f5', 0.5, 300);
      particles.burst(c.W / 2, c.H / 2, { n: 70, colors: ['#ffd6f5', '#c9f2ff', '#fff'], speed: 14, type: 'dot', size: 9 });
    });
  },

  // 秒速の覇者シュン: a stopwatch, three afterimage dashes, TIME
  x_shun: (c) => {
    const time = h('span.lg-time', '3.00');
    c.add(h('div.lg-watch', time), h('div.lg-dash.d1', '🐆'), h('div.lg-dash.d2', '🐆'), h('div.lg-dash.d3', '🐆'), h('div.lg-timeup', 'TIME!'));
    particles.speedLines(T(1600) / 1000, 'rgba(255,240,120,0.9)');
    for (let i = 0; i <= 30; i++) c.at(i * 40, () => (time.textContent = Math.max(0, 3 - i * 0.1).toFixed(2)));
    for (let i = 0; i < 3; i++) c.at(250 + i * 300, () => {
      audio.play('whoosh', { pitch: 1 + i * 0.2 });
      shake(6 + i * 3, 120);
    });
    c.at(1250, () => {
      audio.play('stamp');
      flash('#ffe53d', 0.5, 220);
    });
  },

  // 無限スクロール: a phone feed that scrolls faster and faster into ∞
  x_scroll: (c) => {
    const posts = ['🐱', '🍔', '💃', '🎮', '🐶', '🌈', '😂', '🔥', '🍰', '⚡', '🐼', '🎧'];
    const feed = h('div.lg-feed', [...posts, ...posts].map((p, i) => h('div.lg-post', h('span', p), h('i', { style: { width: `${40 + ((i * 23) % 50)}%` } }))));
    c.add(h('div.lg-phone', feed), h('div.lg-inf', '♾️'));
    for (let i = 0; i < 18; i++) c.at(Math.round(1400 * (1 - Math.pow(1 - i / 18, 0.5))), () => audio.play('flip', { pitch: 1 + i * 0.05, vol: 0.6 }));
    c.at(1450, () => {
      audio.play('super');
      shake(12, 300);
      particles.ring(c.W / 2, c.H / 2, '#25e0ff', Math.max(c.W, c.H) * 0.6, 0.7, 22);
    });
  },

  // ゲーマー レベル丸: 8-bit boot screen, Lv counter rolls to 99
  m_level: (c) => {
    const lv = h('span', '1');
    c.add(h('div.lg-pixels'), h('div.lg-press', 'PRESS START'), h('div.lg-sprite', '👾'), h('div.lg-lvup', 'LEVEL UP!'), h('div.lg-lv', 'Lv.', lv), h('div.lg-exp', h('i')));
    // テレレレッテッテー
    seq([[NOTE(72), 0.6, 0.09], [NOTE(72), 0.7, 0.09], [NOTE(72), 0.8, 0.09], [NOTE(72), 0.9, 0.12], [NOTE(68), 1.05, 0.12], [NOTE(70), 1.2, 0.12], [NOTE(72), 1.35, 0.1], [NOTE(70), 1.45, 0.08], [NOTE(72), 1.55, 0.5]], 'square', 0.07);
    for (let i = 1; i <= 20; i++) c.at(600 + i * 45, () => (lv.textContent = String(Math.round(1 + (98 * i) / 20))));
    c.at(1550, () => {
      audio.play('levelUp');
      particles.burst(c.W / 2, c.H * 0.45, { n: 50, colors: ['#3dff95', '#a066ff', '#fff'], speed: 12, type: 'star', size: 7 });
    });
  },

  // 魔王ラスボス: WARNING bars, lightning, the boss HP bar fills
  m_maou: (c) => {
    c.add(h('div.lg-warnbar.t'), h('div.lg-warnbar.b'), h('div.lg-warn', '⚠ WARNING ⚠'), h('div.lg-castle', '🏰'), h('div.lg-boss', '👿'), h('div.lg-hp', h('b', '魔王ラスボス'), h('div.lg-hpbar', h('i'))));
    for (let i = 0; i < 6; i++) audio.tone(i % 2 ? 440 : 330, 0.22 / fxConfig.speed, { type: 'square', vol: 0.06, at: (i * 0.24) / fxConfig.speed });
    audio.tone(41, 2.4 / fxConfig.speed, { type: 'sawtooth', vol: 0.12, filter: 220 });
    c.at(650, () => {
      flash('#fff', 0.7, 140);
      audio.noise(0.4, { type: 'highpass', freq: 1800, vol: 0.4 });
      shake(14, 200);
    });
    c.at(900, () => flash('#c8b8ff', 0.5, 120));
    c.at(1150, () => {
      audio.play('bigHit');
      shake(20, 420);
      particles.burst(c.W / 2, c.H * 0.45, { n: 60, colors: ['#ff2e2e', '#7a00ff', '#000'], speed: 12, size: 8 });
    });
  },

  // ドパミンの神: a pillar of light, a halo, a feather shower and a choir
  n_god: (c) => {
    c.add(h('div.lg-clouds'), h('div.lg-pillar'), h('div.lg-halo'), h('div.lg-sun', '🌞'));
    const k = 1 / fxConfig.speed;
    for (const [f, at] of [[NOTE(60), 0.2], [NOTE(64), 0.2], [NOTE(67), 0.2], [NOTE(72), 0.9], [NOTE(76), 0.9], [NOTE(79), 0.9]] as [number, number][])
      audio.tone(f, 1.4 * k, { type: 'sine', vol: 0.06, at: at * k, attack: 0.3 });
    c.at(500, () => particles.rain('🪶', 22, 30));
    c.at(950, () => {
      flash('#fff6c8', 0.7, 400);
      shake(10, 300);
      particles.burst(c.W / 2, c.H * 0.38, { n: 80, colors: ['#fff6c8', '#ffe14d', '#fff'], speed: 13, type: 'star', size: 8 });
    });
  },

  // 777の女神セブン: three reels stop one by one on 7
  g_seven: (c) => {
    const strip = ['🍒', '🔔', '🍋', '💎', '⭐', '🍉', '🍒', '🔔', '7️⃣'];
    const reels = [0, 1, 2].map((i) => h(`div.lg-reel.r${i}`, h('div.lg-strip', [...strip, ...strip].slice(0, 9).map((g) => h('span', g)))));
    c.add(h('div.lg-slotlights'), h('div.lg-slot', reels), h('div.lg-jackpot', 'JACKPOT!!'), h('div.lg-fairy', '🧚'));
    for (let i = 0; i < 16; i++) c.at(i * 55, () => audio.play('gachaTick', { pitch: 1.2, vol: 0.5 }));
    for (let i = 0; i < 3; i++)
      c.at(700 + i * 300, () => {
        audio.tone(NOTE(76 + i * 4), 0.25, { type: 'square', vol: 0.08 });
        audio.noise(0.08, { type: 'lowpass', freq: 700, vol: 0.35 });
        shake(6, 120);
      });
    c.at(1450, () => {
      audio.play('gachaSSR');
      audio.play('coins');
      flash('#ffe14d', 0.55, 300);
      particles.rain('🪙', 34, 30);
    });
  },

  // 登録者1000万人ミリオン: the subscriber counter rolls to 10,000,000 and the plaque drops
  s_million: (c) => {
    const subs = h('span', '0');
    c.add(h('div.lg-subs', h('small', 'チャンネル登録者数'), subs, h('b', '人')), h('div.lg-plaque', h('div.lg-play', '▶'), h('span', '10,000,000')), h('div.lg-globe', '🌐'));
    for (let i = 1; i <= 26; i++)
      c.at(i * 42, () => {
        subs.textContent = Math.round(10_000_000 * Math.pow(i / 26, 2.5)).toLocaleString('ja-JP');
        if (i % 4 === 0) audio.play('notify', { pitch: 1 + i * 0.02, vol: 0.4 });
      });
    c.at(1250, () => {
      audio.play('rankUp');
      shake(12, 300);
      particles.confetti(80);
    });
  },

  // ペロペロ大王: a candy-swirl world, sweets everywhere, one giant lick
  w_pero: (c) => {
    c.add(h('div.lg-candyswirl'), h('div.lg-lolli', '🍭'), h('div.lg-tongue', '👅'), h('div.lg-pero', 'ペロッ'));
    seq([[NOTE(79), 0.1, 0.15], [NOTE(84), 0.25, 0.15], [NOTE(88), 0.4, 0.15], [NOTE(91), 0.55, 0.3], [NOTE(88), 0.8, 0.15], [NOTE(91), 0.95, 0.5]], 'triangle', 0.1);
    c.at(200, () => particles.rain('🍬', 26, 30));
    c.at(1100, () => {
      audio.noise(0.35, { type: 'bandpass', freq: 1400, to: 500, q: 2, vol: 0.4 });
      shake(10, 260);
      particles.burst(c.W / 2, c.H * 0.4, { n: 40, type: 'glyph', glyph: '🍭', speed: 11, size: 26 });
    });
  },

  // 光速の神ゼロ: a light-speed tunnel, then the clock stops at 0.1s
  x_zero: (c) => {
    const rings = Array.from({ length: 6 }, (_, i) => h('span.lg-ring', { style: { animationDelay: `calc(${i * 0.16}s * var(--k))` } }));
    const t = h('span', '9.9');
    c.add(...rings, h('div.lg-star', '🌠'), h('div.lg-zerotime', t, h('small', 's')));
    particles.speedLines(T(1700) / 1000, 'rgba(160,220,255,0.95)');
    audio.tone(200, 1.2 / fxConfig.speed, { type: 'sawtooth', vol: 0.06, slide: 2400, filter: 3000 });
    for (let i = 0; i <= 24; i++) c.at(300 + i * 40, () => (t.textContent = Math.max(0.1, 9.9 - i * 0.41).toFixed(1)));
    c.at(1300, () => {
      audio.play('super');
      flash('#bfe8ff', 0.7, 260);
      shake(16, 300);
    });
  },

  // チート使いバグ丸: blue screen crash, the cheat code types itself, CHEAT MODE ON
  m_bug: (c) => {
    const code = h('span.lg-code-in');
    c.add(h('div.lg-bsod', h('b', ':('), h('p', 'SYSTEM ERROR'), h('small', 'バランスが崩壊しました')), h('div.lg-cheat', code), h('div.lg-cheaton', 'CHEAT MODE ON'), h('div.lg-robot', '🤖'));
    audio.tone(110, 0.5, { type: 'square', vol: 0.1 });
    const keys = '↑↑↓↓←→←→BA';
    [...keys].forEach((ch, i) =>
      c.at(500 + i * 75, () => {
        code.textContent += ch;
        audio.tone(900 + i * 60, 0.05, { type: 'square', vol: 0.06 });
      }),
    );
    c.at(1300, () => {
      audio.play('levelUp');
      shake(14, 300);
      particles.burst(c.W / 2, c.H * 0.45, { n: 60, colors: ['#3dff95', '#ff2e5a', '#2ee8ff'], speed: 12, size: 7 });
    });
  },

  // メカ姫ギア: blueprint table, four parts fly in from the corners and snap together
  d_gear: (c) => {
    const parts = ['🔩', '🪀', '🔋', '💠'];
    c.add(
      h('div.lg-blueprint'),
      h('div.lg-gearbig.a', '⚙️'),
      h('div.lg-gearbig.b', '⚙️'),
      ...parts.map((p, i) => h(`div.lg-part.p${i}`, { style: { '--d': `${0.15 + i * 0.22}s` } }, p)),
      h('div.lg-assemble', 'ASSEMBLE!'),
      h('div.lg-mechahime', '👩‍🔧'),
    );
    parts.forEach((_, i) =>
      c.at(560 + i * 220, () => {
        audio.tone(180 + i * 40, 0.08, { type: 'square', vol: 0.1 });
        audio.tone(1400 + i * 120, 0.05, { type: 'triangle', vol: 0.06, at: 0.03 });
        shake(5 + i * 2, 120);
      }),
    );
    c.at(1300, () => {
      audio.play('evolve', { pitch: 1.3 });
      flash('#ffb36b', 0.6, 260);
      shake(14, 280);
      particles.burst(c.W / 2, c.H * 0.42, { n: 40, type: 'glyph', glyph: '⚙️', speed: 12, size: 24, gravity: 0.2 });
      particles.burst(c.W / 2, c.H * 0.42, { n: 50, colors: ['#ff8a1f', '#2ee6d6', '#fff'], speed: 14, size: 7 });
    });
  },

  // 超合金マザーシップ: a hull blots out the sky, four lamps light, tractor beam
  d_mother: (c) => {
    const lamps = Array.from({ length: 4 }, (_, i) => h('span.lg-lamp', { style: { animationDelay: `calc(${0.7 + i * 0.18}s * var(--k))` } }));
    c.add(
      h('div.lg-stars'),
      h('div.lg-beam'),
      h('div.lg-hull', h('div.lg-hull-dome', '🛰️'), h('div.lg-lamps', lamps)),
      h('div.lg-complete', 'COMPLETE 4/4'),
    );
    audio.tone(55, 1.4 / fxConfig.speed, { type: 'sawtooth', vol: 0.09, slide: 80, filter: 400 });
    for (let i = 0; i < 4; i++) c.at(700 + i * 180, () => audio.tone(NOTE(64 + i * 5), 0.18, { type: 'square', vol: 0.06 }));
    c.at(1450, () => {
      audio.play('bigHit');
      audio.play('super');
      flash('#9ff7ff', 0.75, 320);
      shake(20, 380);
      particles.burst(c.W / 2, c.H * 0.6, { n: 80, colors: ['#2ee6d6', '#b48cff', '#fff'], speed: 15, type: 'star', size: 8 });
    });
  },

  // 永久機関エターナル: a perpetual wheel spins faster and faster until the meter reads ∞
  d_eternal: (c) => {
    const meter = h('span', '0');
    const balls = Array.from({ length: 8 }, (_, i) => h('span.lg-ball', { style: { transform: `rotate(${i * 45}deg) translateY(-120px)` } }));
    c.add(h('div.lg-wheel2', balls), h('div.lg-inf', '∞'), h('div.lg-energy', 'ENERGY ', meter, h('small', '%')), h('div.lg-spiral', '🌀'));
    let t = 0;
    for (let i = 0; i < 18; i++) {
      t += Math.max(30, 140 - i * 8);
      const v = Math.round(Math.pow(i / 17, 2) * 9999);
      c.at(t, () => {
        meter.textContent = String(v);
        audio.tone(300 + i * 60, 0.05, { type: 'triangle', vol: 0.05 });
      });
    }
    c.at(t + 120, () => {
      meter.textContent = '∞';
      audio.play('gachaSSR');
      flash('#d6b8ff', 0.6, 300);
      shake(14, 300);
      particles.ring(c.W / 2, c.H * 0.42, '#b48cff', 220, 0.6, 18);
      particles.burst(c.W / 2, c.H * 0.42, { n: 60, colors: ['#b48cff', '#2ee6d6', '#fff'], speed: 13, type: 'star', size: 7 });
    });
  },
};

export function hasLegendIntro(id: string): boolean {
  return id in SCENES;
}

/** play a legend's entrance; resolves when it ends or is tapped away */
export function legendIntro(id: string, o: { enemy?: boolean } = {}): Promise<void> {
  const scene = SCENES[id];
  const d = def(id);
  return new Promise((res) => {
    const timers: number[] = [];
    const el = h(`div.lg.lg-${id}${o.enemy ? '.lg-enemy' : ''}`, { style: { '--k': String(1 / fxConfig.speed) } });
    const ctx: SceneCtx = {
      el,
      W: stage.w,
      H: stage.h,
      enemy: !!o.enemy,
      at: (ms, fn) => {
        timers.push(window.setTimeout(fn, T(ms)));
      },
      add: (...nodes) => {
        for (const n of nodes) if (n) el.append(n);
      },
    };
    stage.overlay.append(el);
    scene?.(ctx);
    // shared name plate
    ctx.at(DUR * 0.55, () => {
      el.append(
        h(
          'div.lg-plate',
          h('div.lg-title', o.enemy ? '相手のLEGEND' : 'LEGEND'),
          h('div.lg-name', d.name),
          d.flavor ? h('div.lg-line', d.flavor.startsWith('「') ? d.flavor : `「${d.flavor}」`) : null,
        ),
      );
    });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      for (const t of timers) clearTimeout(t);
      el.classList.add('lg-out');
      setTimeout(() => {
        el.remove();
        res();
      }, 200);
    };
    el.addEventListener('pointerdown', finish);
    timers.push(window.setTimeout(finish, T(DUR)));
  });
}
