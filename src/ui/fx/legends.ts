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

  // 海賊女王ベル: the jolly roger goes up, three cannon blasts, a rain of gold
  r_queen: (c) => {
    c.add(h('div.lg-sea'), h('div.lg-flag', '🏴‍☠️'), h('div.lg-queen', '👸'), h('div.lg-loot', '全部いただき！'));
    seq([[NOTE(57), 0.05, 0.2], [NOTE(62), 0.25, 0.2], [NOTE(65), 0.45, 0.2], [NOTE(69), 0.65, 0.5]], 'sawtooth', 0.06, { filter: 1800 });
    [450, 700, 950].forEach((ms, i) =>
      c.at(ms, () => {
        audio.play('bigHit', { pitch: 0.8 + i * 0.1 });
        shake(8 + i * 4, 160);
        flash('#ffdf80', 0.25, 120);
        particles.burst(c.W * (0.2 + i * 0.3), c.H * 0.62, { n: 20, colors: ['#888', '#ffb000', '#fff'], speed: 9, size: 7 });
      }),
    );
    c.at(1250, () => {
      audio.play('cash');
      particles.rain('🪙', 34, 30);
    });
  },

  // 財宝竜ファフニール: two eyes open over a mountain of gold, then the dragon erupts
  r_dragon: (c) => {
    c.add(h('div.lg-goldpile'), h('div.lg-eyes', h('span'), h('span')), h('div.lg-wyrm', '🐉'));
    audio.tone(48, 1.6 / fxConfig.speed, { type: 'sawtooth', vol: 0.1, slide: 70, filter: 300 });
    c.at(500, () => audio.tone(1800, 0.12, { type: 'triangle', vol: 0.05 }));
    c.at(1150, () => {
      audio.play('bigHit');
      audio.tone(90, 0.8, { type: 'sawtooth', vol: 0.12, slide: 40, filter: 900 });
      shake(22, 420);
      flash('#ffcf4d', 0.5, 260);
      particles.burst(c.W / 2, c.H * 0.7, { n: 70, type: 'glyph', glyph: '🪙', speed: 15, size: 24, gravity: 0.35 });
    });
  },

  // 黄金郷エルドラド: dawn breaks, golden rays, the city rises from the horizon
  r_eldorado: (c) => {
    c.add(h('div.lg-rays'), h('div.lg-dawn'), h('div.lg-city', '🏯'), h('div.lg-eltitle', 'EL DORADO'));
    seq([[NOTE(72), 0.1, 0.6], [NOTE(76), 0.3, 0.6], [NOTE(79), 0.5, 0.6], [NOTE(84), 0.7, 1.0]], 'triangle', 0.08);
    c.at(1250, () => {
      audio.play('gachaSSR');
      flash('#fff3b0', 0.6, 300);
      particles.burst(c.W / 2, c.H * 0.45, { n: 70, colors: ['#ffe14d', '#ffb000', '#fff'], speed: 14, type: 'star', size: 8 });
    });
  },

  // 破滅の歌姫ルシエラ: a single spotlight, one sung note, and darkness swallows the stage
  h_diva: (c) => {
    c.add(h('div.lg-spot'), h('div.lg-moon', '🌑'), h('div.lg-void'), h('div.lg-diva', '🧜‍♀️'), h('div.lg-finale', '— FINALE —'));
    seq([[NOTE(69), 0.2, 0.9], [NOTE(76), 0.2, 0.9], [NOTE(68), 1.1, 0.8]], 'sine', 0.09, { vib: 6 });
    c.at(1250, () => {
      audio.play('shatter');
      shake(16, 380);
      particles.burst(c.W / 2, c.H * 0.42, { n: 60, colors: ['#3a0a5a', '#b48cff', '#000'], speed: 15, size: 8 });
    });
  },

  // 残響のセイレーン: deep water, sonar rings echo outward, she rises with the bubbles
  h_siren: (c) => {
    const rings = Array.from({ length: 4 }, (_, i) => h('span.lg-ripple', { style: { animationDelay: `calc(${0.25 + i * 0.3}s * var(--k))` } }));
    c.add(h('div.lg-deep'), ...rings, h('div.lg-siren', '🧚'));
    particles.floatUp(c.W / 2, c.H * 0.85, '🫧', 18, 120);
    [250, 550, 850, 1150].forEach((ms, i) => c.at(ms, () => audio.tone(NOTE(76 - i * 3), 0.6, { type: 'sine', vol: 0.07 - i * 0.012 })));
    c.at(1300, () => {
      audio.play('heal');
      particles.ring(c.W / 2, c.H * 0.42, '#4de1ff', 240, 0.7, 10);
    });
  },

  // 神曲マエストロ: the staff draws itself, notes rush across, the baton comes down
  h_maestro: (c) => {
    const lines = Array.from({ length: 5 }, (_, i) => h('span.lg-staff', { style: { top: `${36 + i * 4}%`, animationDelay: `calc(${i * 0.06}s * var(--k))` } }));
    const notes = ['♪', '♫', '♩', '♬', '♪', '♫'].map((n, i) => h('span.lg-note', { style: { top: `${33 + (i % 5) * 4}%`, '--d': `${0.35 + i * 0.12}s` } }, n));
    c.add(...lines, ...notes, h('div.lg-violin', '🎻'), h('div.lg-baton', '🪄'));
    seq([[NOTE(60), 0.3, 0.25], [NOTE(64), 0.45, 0.25], [NOTE(67), 0.6, 0.25], [NOTE(72), 0.75, 0.25], [NOTE(76), 0.9, 0.25], [NOTE(79), 1.05, 0.25], [NOTE(84), 1.25, 0.9], [NOTE(72), 1.25, 0.9], [NOTE(76), 1.25, 0.9]], 'triangle', 0.07);
    c.at(1250, () => {
      shake(14, 300);
      flash('#fff', 0.5, 240);
      particles.burst(c.W / 2, c.H * 0.42, { n: 50, type: 'glyph', glyph: '🎵', speed: 12, size: 24, gravity: 0.1 });
    });
  },

  // ===================================================== クラッシャー
  // 解体王ガレキング: a brick wall builds up, cracks, and a dinosaur smashes through
  c_garekking: (c) => {
    const bricks = Array.from({ length: 30 }, (_, i) => {
      const dx = (Math.random() - 0.5) * 1600;
      const dy = (Math.random() - 0.6) * 1400;
      return h('span.lg-brick', { style: { '--i': String(i), '--dx': `${dx}px`, '--dy': `${dy}px`, '--r': `${(Math.random() - 0.5) * 900}deg` } });
    });
    c.add(h('div.lg-wall', bricks), h('div.lg-crack'), h('div.lg-rex', '🦖'), h('div.lg-break', 'BREAK!!'));
    for (let i = 0; i < 6; i++) c.at(80 + i * 90, () => audio.tone(120 + i * 15, 0.06, { type: 'square', vol: 0.06 }));
    c.at(850, () => {
      audio.play('shatter', { vol: 0.6 });
      shake(6, 200);
    });
    c.at(1200, () => {
      audio.play('bigHit');
      audio.play('shatter');
      shake(24, 420);
      flash('#ffb36b', 0.5, 220);
      particles.burst(c.W / 2, c.H * 0.45, { n: 60, colors: ['#b5542d', '#8a3a1e', '#e0c0a0'], speed: 16, size: 9, gravity: 0.4 });
    });
  },

  // 終末時計: the clock hands race to midnight, ticking faster and faster
  c_doomclock: (c) => {
    const ticks = Array.from({ length: 12 }, (_, i) => h('span.lg-tick', { style: { transform: `rotate(${i * 30}deg) translateY(-140px)` } }));
    c.add(h('div.lg-clock', ticks, h('span.lg-hand.hr'), h('span.lg-hand.mn'), h('span.lg-pin')), h('div.lg-skull', '💀'), h('div.lg-doom', 'DOOMSDAY'));
    let t = 0;
    for (let i = 0; i < 20; i++) {
      t += Math.max(35, 150 - i * 7);
      c.at(t, () => audio.tone(i % 2 ? 1800 : 1400, 0.03, { type: 'square', vol: 0.05 }));
    }
    c.at(1300, () => {
      audio.tone(70, 1.2, { type: 'sawtooth', vol: 0.12, filter: 500 });
      audio.play('bigHit');
      flash('#ff1a1a', 0.7, 300);
      shake(18, 380);
    });
  },

  // 破壊神デストロイア: the ground splits open, magma glows, and the god rises
  c_destroya: (c) => {
    c.add(h('div.lg-ground'), h('div.lg-rift'), h('div.lg-magma'), h('div.lg-oni', '👹'), h('div.lg-kourin', '破壊神 降臨'));
    audio.tone(40, 1.8 / fxConfig.speed, { type: 'sawtooth', vol: 0.12, slide: 30, filter: 260 });
    for (let i = 0; i < 4; i++) c.at(150 + i * 220, () => shake(6 + i * 3, 160));
    c.at(1150, () => {
      audio.play('bigHit');
      audio.play('super');
      flash('#ff3b00', 0.65, 320);
      shake(26, 480);
      particles.burst(c.W / 2, c.H * 0.6, { n: 80, colors: ['#ff3b00', '#ffb000', '#3a0a0a'], speed: 16, size: 8, gravity: -0.1 });
    });
  },

  // ===================================================== レンジャー
  // 熱血隊長ドパレッド: five colored explosions behind the classic pose
  k_red: (c) => {
    const colors = ['#2e7bff', '#ff7ad9', '#ffd23d', '#3dff95', '#ff2e4d'];
    const booms = colors.map((col, i) => h('span.lg-boom', { style: { '--col': col, left: `${12 + i * 19}%`, animationDelay: `calc(${0.15 + i * 0.16}s * var(--k))` } }));
    c.add(h('div.lg-sentai-bg'), ...booms, h('div.lg-hero', '🦸'), h('div.lg-team', 'ドパレンジャー！！'));
    colors.forEach((col, i) =>
      c.at(150 + i * 160, () => {
        audio.play('bigHit', { pitch: 0.8 + i * 0.08, vol: 0.6 });
        particles.burst((c.W * (12 + i * 19 + 4)) / 100, c.H * 0.7, { n: 22, colors: [col, '#fff'], speed: 10, size: 7 });
      }),
    );
    c.at(1150, () => {
      audio.play('super');
      shake(14, 300);
      particles.speedLines(0.8, 'rgba(255,220,120,0.9)');
    });
  },

  // 6番目の戦士シルバー: a silver meteor crosses the night and lands with a shockwave
  k_silver: (c) => {
    c.add(h('div.lg-night'), h('div.lg-moon2', '🌕'), h('div.lg-meteor'), h('div.lg-shock'), h('div.lg-astro', '🧑‍🚀'), h('div.lg-sixth', '6番目の戦士'));
    audio.tone(2400, 0.9 / fxConfig.speed, { type: 'sawtooth', vol: 0.05, slide: 200, filter: 3000 });
    c.at(900, () => {
      audio.play('bigHit');
      flash('#e6f0ff', 0.6, 240);
      shake(18, 320);
      particles.burst(c.W / 2, c.H * 0.55, { n: 50, colors: ['#e6f0ff', '#9ab4d6', '#fff'], speed: 13, type: 'star', size: 7 });
    });
  },

  // 合体巨神ドパカイザー: five vehicles fly in from every side and combine
  k_kaiser: (c) => {
    const parts = ['🚒', '🚓', '🛩️', '🚜', '🚀'];
    c.add(
      h('div.lg-hangar'),
      ...parts.map((p, i) => h(`div.lg-vehicle.v${i}`, { style: { '--d': `${0.1 + i * 0.16}s` } }, p)),
      h('div.lg-kaiser', '🦾'),
      h('div.lg-gattai', '合体完了！'),
    );
    parts.forEach((_, i) => c.at(450 + i * 160, () => audio.tone(200 + i * 60, 0.1, { type: 'square', vol: 0.09 })));
    c.at(1250, () => {
      audio.play('evolve', { pitch: 0.7 });
      audio.play('bigHit');
      flash('#ffd23d', 0.6, 260);
      shake(22, 400);
      particles.burst(c.W / 2, c.H * 0.45, { n: 70, colors: ['#ff2e4d', '#ffd23d', '#2e7bff', '#fff'], speed: 15, type: 'spark', size: 7 });
    });
  },

  // ===================================================== スペラー
  // 魔法少女マジカル☆リリィ: magic circle, ribbon of hearts, transformation sparkle
  z_lily: (c) => {
    const hearts = Array.from({ length: 10 }, (_, i) => h('span.lg-heart', { style: { transform: `rotate(${i * 36}deg) translateY(-170px)` } }, i % 2 ? '💖' : '⭐'));
    c.add(h('div.lg-circle'), h('div.lg-circle.c2'), h('div.lg-ribbon', hearts), h('div.lg-lily', '👱‍♀️'), h('div.lg-change', 'マジカル☆チェンジ！'));
    seq([[NOTE(76), 0.1, 0.15], [NOTE(79), 0.22, 0.15], [NOTE(83), 0.34, 0.15], [NOTE(88), 0.46, 0.15], [NOTE(91), 0.58, 0.15], [NOTE(95), 0.7, 0.5]], 'sine', 0.09);
    c.at(1200, () => {
      audio.play('gachaSSR');
      flash('#ffd1f2', 0.55, 260);
      particles.burst(c.W / 2, c.H * 0.42, { n: 70, colors: ['#ff8de8', '#c9a6ff', '#fff', '#ffe14d'], speed: 13, type: 'star', size: 8 });
    });
  },

  // 禁断の魔導書: the sealed book shakes, chains snap, and an eye opens in the runes
  z_grimoire: (c) => {
    const runes = '⛧✶☽✷☾✸⛤✹'.split('').map((r, i) => h('span.lg-rune', { style: { transform: `rotate(${i * 45}deg) translateY(-160px)` } }, r));
    c.add(h('div.lg-runering', runes), h('div.lg-book', '📕'), h('div.lg-chain.a'), h('div.lg-chain.b'), h('div.lg-eye', '👁️'), h('div.lg-unseal', '封印解除'));
    audio.tone(55, 1.3 / fxConfig.speed, { type: 'sawtooth', vol: 0.09, filter: 420 });
    for (let i = 0; i < 5; i++) c.at(200 + i * 110, () => audio.tone(300 - i * 20, 0.05, { type: 'square', vol: 0.05 }));
    c.at(850, () => {
      audio.play('shatter');
      shake(12, 260);
    });
    c.at(1250, () => {
      audio.play('super');
      flash('#6a1aa8', 0.6, 300);
      particles.floatUp(c.W / 2, c.H * 0.5, '📄', 16, 260);
    });
  },

  // マナドラゴン: the cost counts down 10 → 0 as mana pours in, then the dragon erupts
  z_manadragon: (c) => {
    const n = h('span', '10');
    c.add(h('div.lg-manabg'), h('div.lg-manacost', n), h('div.lg-manalabel', 'MANA'), h('div.lg-ryu', '🐲'));
    for (let i = 1; i <= 10; i++)
      c.at(80 + i * 95, () => {
        n.textContent = String(10 - i);
        audio.tone(NOTE(60 + i * 2), 0.08, { type: 'triangle', vol: 0.07 });
        particles.orbs(Math.random() * c.W, c.H, c.W / 2, c.H * 0.3, 1, '#7ac8ff');
      });
    c.at(1150, () => {
      audio.play('bigHit');
      audio.play('gachaSSR');
      flash('#9fdcff', 0.6, 280);
      shake(18, 360);
      particles.burst(c.W / 2, c.H * 0.45, { n: 70, colors: ['#38a6ff', '#9fdcff', '#fff'], speed: 15, size: 8, gravity: -0.05 });
    });
  },

  // ===================================================== ステラー
  // 捨て神ダンシャリー: clutter gets swept away until the room is spotless
  q_danshari: (c) => {
    const junk = ['📦', '🧸', '👟', '📚', '🎮', '🧦', '🪀', '📻', '🛼', '🧺'];
    const items = junk.map((j, i) =>
      h('span.lg-clutter', { style: { left: `${8 + (i % 5) * 18}%`, top: `${30 + Math.floor(i / 5) * 22}%`, '--d': `${0.25 + i * 0.08}s` } }, j),
    );
    c.add(h('div.lg-room'), ...items, h('div.lg-halo'), h('div.lg-angel', '😇'), h('div.lg-sukkiri', 'スッキリ！'));
    junk.forEach((_, i) => c.at(250 + i * 80, () => audio.play('whoosh', { pitch: 1.2 + i * 0.05, vol: 0.4 })));
    c.at(1200, () => {
      seq([[NOTE(84), 0, 0.4], [NOTE(88), 0.05, 0.4], [NOTE(91), 0.1, 0.6]], 'sine', 0.08);
      flash('#ffffff', 0.5, 300);
      particles.burst(c.W / 2, c.H * 0.4, { n: 40, colors: ['#ffffff', '#c9fff0', '#ffe14d'], speed: 9, type: 'star', size: 6 });
    });
  },

  // 無我の龍ムガ: an ensō brushes itself onto blank paper; the dragon emerges from the mist
  q_muga: (c) => {
    c.add(h('div.lg-paper'), h('div.lg-enso'), h('div.lg-mist'), h('div.lg-mugaryu', '🐉'), h('div.lg-mu', '無'));
    audio.tone(110, 1.4 / fxConfig.speed, { type: 'sine', vol: 0.08 });
    audio.tone(165, 1.4 / fxConfig.speed, { type: 'sine', vol: 0.05 });
    c.at(1100, () => {
      audio.tone(NOTE(57), 1.0, { type: 'triangle', vol: 0.1 });
      audio.play('whoosh', { pitch: 0.6 });
      shake(8, 300);
    });
  },

  // フリマ女王メルカ: the phone explodes with "売れました！" notifications
  q_merca: (c) => {
    const items = ['ぬいぐるみ', 'ゲーム機', 'スニーカー', '漫画全巻', 'ギター', 'ドレス', '古い手札'];
    const notes = items.map((it, i) =>
      h('div.lg-sold', { style: { '--d': `${0.1 + i * 0.13}s`, top: `${8 + i * 9}%` } }, h('b', '🛍️ 売れました！'), h('span', `${it}　¥${(i + 1) * 1200}`)),
    );
    c.add(h('div.lg-phonebg'), ...notes, h('div.lg-merca', '👩‍💼'), h('div.lg-soldout', 'SOLD OUT'));
    items.forEach((_, i) => c.at(100 + i * 130, () => audio.play('coin', { pitch: 1 + i * 0.08, vol: 0.6 })));
    c.at(1150, () => {
      audio.play('cash');
      particles.rain('💴', 26, 28);
      shake(10, 260);
    });
  },

  // ===================================================== ジュエラー
  // 宝石の女王ジュエリア: crystal spires grow from the floor, then shatter around her
  j_jewelia: (c) => {
    const spires = Array.from({ length: 9 }, (_, i) =>
      h('span.lg-spire', { style: { left: `${6 + i * 11}%`, '--hh': `${120 + ((i * 37) % 5) * 60}px`, '--d': `${0.05 + Math.abs(4 - i) * 0.08}s` } }),
    );
    c.add(h('div.lg-gemcave'), ...spires, h('div.lg-jqueen', '👸'), h('div.lg-jname', 'JEWELIA'));
    for (let i = 0; i < 9; i++) c.at(60 + i * 80, () => audio.tone(NOTE(84 + (i % 4) * 3), 0.2, { type: 'triangle', vol: 0.05 }));
    c.at(1150, () => {
      audio.play('shatter');
      audio.play('gachaSSR');
      flash('#ffe6fa', 0.7, 300);
      shake(14, 300);
      particles.burst(c.W / 2, c.H * 0.6, { n: 80, type: 'glyph', glyph: '💎', speed: 15, size: 20, gravity: 0.3 });
    });
  },

  // 虹晶竜プリズマ: a beam of light hits a prism and fans into a rainbow dragon
  j_prisma: (c) => {
    c.add(h('div.lg-darkroom'), h('div.lg-beam2'), h('div.lg-prism'), h('div.lg-fan'), h('div.lg-prismaryu', '🦎'), h('div.lg-pname', 'PRISMA'));
    audio.tone(880, 0.8 / fxConfig.speed, { type: 'sine', vol: 0.05, slide: 1760 });
    c.at(700, () => seq([[NOTE(72), 0, 0.5], [NOTE(76), 0.06, 0.5], [NOTE(79), 0.12, 0.5], [NOTE(83), 0.18, 0.5], [NOTE(86), 0.24, 0.7]], 'triangle', 0.06));
    c.at(1200, () => {
      audio.play('super');
      flash('#ffffff', 0.6, 260);
      particles.burst(c.W / 2, c.H * 0.45, { n: 70, colors: ['#ff4d4d', '#ffb000', '#ffe14d', '#3dff95', '#38d6ff', '#b48cff'], speed: 14, type: 'star', size: 8 });
    });
  },

  // 万華鏡カレイドスコープ: mirrored segments spin and bloom, a mirror ball drops in
  j_kaleido: (c) => {
    c.add(h('div.lg-kaleido'), h('div.lg-kaleido.k2'), h('div.lg-mball', '🪩'), h('div.lg-kname', 'KALEIDO'));
    for (let i = 0; i < 8; i++) c.at(100 + i * 120, () => audio.tone(NOTE(79 + ((i * 5) % 12)), 0.12, { type: 'sine', vol: 0.06 }));
    c.at(1150, () => {
      audio.play('gachaSR');
      flash('#fff0fb', 0.5, 240);
      for (let i = 0; i < 6; i++) particles.burst((c.W * (i + 1)) / 7, c.H * 0.3 + (i % 2) * 120, { n: 14, colors: ['#ff7ad9', '#7af0ff', '#ffe14d', '#fff'], speed: 8, type: 'star', size: 6 });
    });
  },

  // ===================================================== ノベラー
  // 白の女王シロナ: lines of ink are wiped back to a blank page, feathers fall, the queen rises
  b_shirona: (c) => {
    const text = ['むかしむかし、黒いインクの', '物語がありました。だれも', '結末を知らないまま、ページは', '黒く、黒く、塗りつぶされて——', 'そこで女王は言いました。'];
    const lines = text.map((t, i) => h('div.lg-msline', { style: { top: `${14 + i * 11}%`, '--d': `${0.35 + i * 0.1}s` } }, t));
    c.add(h('div.lg-parchment'), ...lines, h('div.lg-whiteout'), h('div.lg-shirolight'), h('div.lg-shirona', '👸🏻'), h('div.lg-shiro', '白'));
    seq([[NOTE(76), 0.05, 0.5], [NOTE(79), 0.25, 0.5], [NOTE(84), 0.45, 0.5], [NOTE(88), 0.9, 1.0], [NOTE(84), 0.9, 1.0], [NOTE(79), 0.9, 1.0]], 'sine', 0.07);
    for (let i = 0; i < 5; i++) c.at(350 + i * 100, () => audio.play('whoosh', { pitch: 1.6 + i * 0.1, vol: 0.25 }));
    c.at(900, () => {
      flash('#fffaf0', 0.7, 320);
      particles.rain('🪶', 22, 30);
    });
    c.at(1150, () => particles.burst(c.W / 2, c.H * 0.45, { n: 50, colors: ['#ffffff', '#fff3c4', '#ffe7a0'], speed: 11, type: 'star', size: 7, gravity: -0.05 }));
  },

  // 黒の王クロウ: ink drops splash and swallow the screen, crows scatter, the king steps out
  b_kurou: (c) => {
    const blots = Array.from({ length: 7 }, (_, i) =>
      h('span.lg-inkblot', { style: { left: `${10 + ((i * 37) % 80)}%`, top: `${15 + ((i * 53) % 70)}%`, '--d': `${0.1 + i * 0.12}s`, '--s': `${2 + (i % 3)}` } }),
    );
    const crows = Array.from({ length: 6 }, (_, i) => h('span.lg-crow', { style: { top: `${10 + i * 12}%`, '--d': `${0.9 + i * 0.07}s` } }, '🐦‍⬛'));
    c.add(h('div.lg-inkpage'), ...blots, ...crows, h('div.lg-kuroglow'), h('div.lg-kurou', '🤴🏿'), h('div.lg-kuro', '黒'), h('div.lg-taijo', '全員退場'));
    for (let i = 0; i < 7; i++) c.at(100 + i * 120, () => audio.tone(NOTE(45 + (i % 3) * 3), 0.25, { type: 'sine', vol: 0.09, slide: 40 }));
    c.at(900, () => {
      audio.play('whoosh', { pitch: 0.7 });
      for (let i = 0; i < 4; i++) audio.tone(1800 + i * 200, 0.05, { type: 'square', vol: 0.02, at: i * 0.05 });
    });
    c.at(1150, () => {
      audio.play('bigHit');
      seq([[NOTE(38), 0, 0.9], [NOTE(45), 0, 0.9], [NOTE(50), 0, 0.9]], 'sawtooth', 0.06, { filter: 900 });
      shake(16, 360);
      flash('#2a0b4e', 0.6, 300);
      particles.burst(c.W / 2, c.H * 0.45, { n: 50, colors: ['#1a0b2e', '#4a2a7a', '#8a3cff'], speed: 13, size: 8 });
    });
  },

  // グランドフィナーレ: the giant book — white page and black page — slams shut on "Fin."
  b_finale: (c) => {
    c.add(h('div.lg-stagebg'), h('div.lg-bookwrap', h('div.lg-bookL', h('span', '白')), h('div.lg-bookR', h('span', '黒'))), h('div.lg-fin', 'Fin.'));
    seq([[NOTE(67), 0.05, 0.3], [NOTE(72), 0.3, 0.3], [NOTE(76), 0.55, 0.3], [NOTE(79), 0.8, 0.3]], 'triangle', 0.08);
    c.at(950, () => {
      audio.play('bigHit');
      audio.play('flip', { pitch: 0.6 });
      shake(14, 280);
    });
    c.at(1150, () => {
      audio.play('gachaSSR');
      seq([[NOTE(72), 0, 0.9], [NOTE(76), 0, 0.9], [NOTE(79), 0, 0.9], [NOTE(84), 0.05, 1.1]], 'sawtooth', 0.05, { filter: 2600 });
    });
    for (let i = 0; i < 7; i++)
      c.at(1150 + i * 160, () => {
        const x = c.W * (0.12 + ((i * 0.37) % 0.76));
        const y = c.H * (0.15 + (i % 3) * 0.12);
        particles.burst(x, y, { n: 30, colors: i % 2 ? ['#fffaf0', '#ffe7a0', '#fff'] : ['#8a3cff', '#d9c2ff', '#ff7ad9'], speed: 10, type: 'star', size: 6, gravity: 0.12 });
        audio.tone(200 + i * 30, 0.2, { type: 'triangle', vol: 0.05 });
      });
  },

  // ===================================================== デコラー
  // デコの女神デコリーナ: stickers rain down and stick everywhere, a halo descends on the goddess
  e_decorina: (c) => {
    const kinds = ['💗', '⭐', '🎀', '⚪', '💎', '💖', '🌟', '🦄'];
    const stk = Array.from({ length: 26 }, (_, i) =>
      h(
        'span.lg-stk',
        { style: { left: `${4 + ((i * 41) % 92)}%`, top: `${6 + ((i * 29) % 82)}%`, '--r': `${((i * 47) % 60) - 30}deg`, '--d': `${0.05 + i * 0.035}s` } },
        kinds[i % kinds.length],
      ),
    );
    c.add(h('div.lg-decobg'), ...stk, h('div.lg-halo2'), h('div.lg-decorina', '🧚‍♀️'), h('div.lg-dname', 'DECORINA'));
    for (let i = 0; i < 13; i++) c.at(50 + i * 70, () => audio.play('stamp', { pitch: 1.2 + (i % 4) * 0.12, vol: 0.35 }));
    c.at(1100, () => {
      seq([[NOTE(84), 0, 0.5], [NOTE(88), 0.06, 0.5], [NOTE(91), 0.12, 0.5], [NOTE(96), 0.18, 0.8]], 'sine', 0.07);
      flash('#ffe3f4', 0.6, 260);
      particles.burst(c.W / 2, c.H * 0.45, { n: 60, colors: ['#ff9ad5', '#ffe14d', '#9ae6ff', '#fff'], speed: 13, type: 'star', size: 7 });
    });
  },

  // 金ピカ社長: gold leaf sweeps the screen, bullion stacks up, "金ピカ" stamps down
  e_president: (c) => {
    const bars = Array.from({ length: 12 }, (_, i) =>
      h('span.lg-bar', { style: { left: `calc(50% + ${((i % 4) - 1.5) * 96 + (Math.floor(i / 4) % 2) * 48}px)`, bottom: `${Math.floor(i / 4) * 38}px`, '--d': `${0.1 + i * 0.06}s` } }),
    );
    c.add(h('div.lg-goldbg'), h('div.lg-goldfoil'), ...bars, h('div.lg-ceo', '🤑'), h('div.lg-kinpika', '金ピカ'));
    for (let i = 0; i < 12; i++) c.at(100 + i * 60, () => audio.play('coin', { pitch: 0.9 + i * 0.05, vol: 0.5 }));
    c.at(1100, () => {
      audio.play('cash');
      audio.play('gachaSSR');
      flash('#fff3b0', 0.6, 280);
      shake(10, 260);
      particles.rain('🪙', 26, 30);
      particles.burst(c.W / 2, c.H * 0.4, { n: 50, colors: ['#ffc23d', '#fff3b0', '#fff'], speed: 12, type: 'star', size: 7 });
    });
  },

  // デコ盛り城: the castle stacks up tier by tier, then gets bombed with deco
  e_castle: (c) => {
    const tiers = Array.from({ length: 4 }, (_, i) => h('div.lg-tier', { style: { '--i': String(i), '--d': `${0.1 + i * 0.18}s` } }));
    const deco = ['💗', '⭐', '🎀', '💎', '💖', '🌸', '🍭', '✨', '🎀', '💗'].map((g, i) =>
      h('span.lg-castdeco', { style: { left: `${30 + ((i * 23) % 40)}%`, top: `${26 + ((i * 31) % 50)}%`, '--d': `${0.95 + i * 0.05}s` } }, g),
    );
    c.add(h('div.lg-skypink'), ...tiers, h('div.lg-castle', '🏰'), ...deco, h('div.lg-cname', 'DECO CASTLE'));
    for (let i = 0; i < 4; i++) c.at(100 + i * 180, () => audio.play('bigHit', { pitch: 0.7 + i * 0.1, vol: 0.4 }));
    for (let i = 0; i < 10; i++) c.at(950 + i * 50, () => audio.play('stamp', { pitch: 1.3, vol: 0.3 }));
    c.at(1250, () => {
      audio.play('gachaSSR');
      shake(12, 300);
      for (let i = 0; i < 5; i++) particles.burst(c.W * (0.2 + i * 0.15), c.H * 0.25, { n: 18, colors: ['#ff9ad5', '#ffe14d', '#fff'], speed: 9, type: 'star', size: 6 });
    });
  },

  // ===================================================== ゲキカラー
  // 地獄の料理長エンマ: hellfire kitchen, the wok flips a storm of chilies, verdict: 激辛
  f_enma: (c) => {
    c.add(h('div.lg-hell'), h('div.lg-hellfire'), h('div.lg-wok', '🍳'), h('div.lg-enma', '👺'), h('div.lg-hanketsu', h('small', '判決'), '激辛'));
    audio.noise(1.4 / fxConfig.speed, { type: 'lowpass', freq: 600, vol: 0.05 });
    c.at(500, () => {
      audio.play('whoosh', { pitch: 0.8 });
      for (let i = 0; i < 3; i++) particles.burst(c.W / 2, c.H * 0.7, { n: 14, type: 'glyph', glyph: '🌶️', speed: 14, size: 26, gravity: 0.35 });
    });
    c.at(1050, () => {
      audio.play('bigHit');
      seq([[NOTE(40), 0, 0.8], [NOTE(47), 0, 0.8], [NOTE(52), 0.02, 0.8]], 'sawtooth', 0.07, { filter: 1200 });
      flash('#ff3b1f', 0.6, 300);
      shake(16, 340);
    });
    c.at(1300, () => {
      audio.play('stamp');
      particles.burst(c.W / 2, c.H * 0.5, { n: 50, colors: ['#ff3b1f', '#ffb000', '#ffe14d'], speed: 13, size: 8, gravity: -0.2 });
    });
  },

  // 炎の不死鳥: an ember in the ashes flares, wings of fire unfold and it shoots upward
  f_phoenix: (c) => {
    c.add(h('div.lg-ashbg'), h('div.lg-ember'), h('div.lg-wingL'), h('div.lg-wingR'), h('div.lg-phoenix', '🐦‍🔥'), h('div.lg-rebirth', 'REBIRTH'));
    for (let i = 0; i < 3; i++) c.at(150 + i * 200, () => audio.play('heartbeat', { vol: 0.5 + i * 0.15 }));
    c.at(750, () => {
      audio.play('whoosh', { pitch: 1.2 });
      audio.tone(220, 0.6, { type: 'sawtooth', vol: 0.06, slide: 1760, filter: 3000 });
      flash('#ffb000', 0.6, 260);
      particles.burst(c.W / 2, c.H * 0.7, { n: 70, colors: ['#ff3b1f', '#ffb000', '#ffe14d', '#fff'], speed: 15, size: 8, gravity: -0.3 });
    });
    c.at(1100, () => {
      audio.play('super');
      particles.speedLines(0.5, 'rgba(255,170,60,0.9)');
    });
  },

  // 激辛ドラゴン ハバネロス: the Scoville meter blows past its limit, then the dragon breathes fire
  f_habaneros: (c) => {
    const num = h('b', '0');
    c.add(h('div.lg-hotbg'), h('div.lg-meter', h('div.lg-meterfill'), h('div.lg-meterbulb')), h('div.lg-shu', num, h('small', ' SHU')), h('div.lg-breath'), h('div.lg-habadragon', '🐉'), h('div.lg-hname', 'HABANEROS'));
    const steps = [500, 5000, 30000, 100000, 350000, 800000, 1600000, 3000000];
    steps.forEach((v, i) =>
      c.at(80 + i * 100, () => {
        num.textContent = v.toLocaleString('en-US');
        audio.tone(NOTE(55 + i * 3), 0.09, { type: 'square', vol: 0.04 });
      }),
    );
    c.at(900, () => {
      audio.play('shatter');
      num.textContent = 'MAX!!';
      shake(10, 200);
      particles.burst(c.W * 0.15, c.H * 0.3, { n: 30, colors: ['#ff3b1f', '#fff'], speed: 12, size: 6 });
    });
    c.at(1150, () => {
      audio.play('bigHit');
      audio.noise(0.8, { type: 'lowpass', freq: 1500, vol: 0.12 });
      flash('#ff5a00', 0.7, 320);
      shake(20, 420);
      particles.burst(c.W * 0.6, c.H * 0.5, { n: 70, colors: ['#ff3b1f', '#ffb000', '#ffe14d'], speed: 16, size: 9, gravity: -0.1 });
    });
  },

  // ===================================================== オマモラー
  // 太陽の女神アマテラス: the rock door of the cave slides open and sunlight floods out
  o_amaterasu: (c) => {
    c.add(h('div.lg-cavebg'), h('div.lg-sunrays'), h('div.lg-sunorb'), h('div.lg-amaterasu', '🌞'), h('div.lg-rockL'), h('div.lg-rockR'), h('div.lg-tensho', '天', h('br'), '照'));
    audio.tone(55, 1.0 / fxConfig.speed, { type: 'sawtooth', vol: 0.05, filter: 300 });
    c.at(300, () => {
      audio.play('heartbeat', { vol: 0.6 });
      shake(6, 600);
    });
    c.at(850, () => {
      audio.play('whoosh', { pitch: 0.5 });
      seq([[NOTE(64), 0, 1.2], [NOTE(69), 0.05, 1.2], [NOTE(76), 0.1, 1.2], [NOTE(81), 0.3, 1.2]], 'triangle', 0.07);
      flash('#fff6c8', 0.8, 400);
    });
    c.at(1150, () => {
      audio.play('gachaSSR');
      particles.burst(c.W / 2, c.H * 0.42, { n: 70, colors: ['#ffe14d', '#fff6c8', '#ff9a3d', '#fff'], speed: 15, type: 'star', size: 8 });
    });
  },

  // 九尾の白狐: under a full moon, nine tails fan open one by one and foxfire circles
  o_kyubi: (c) => {
    const tails = Array.from({ length: 9 }, (_, i) => h('span.lg-tail', { style: { '--a': `${-80 + i * 20}deg`, '--d': `${0.2 + i * 0.09}s` } }));
    const fires = Array.from({ length: 6 }, (_, i) => h('span.lg-foxfire', { style: { '--a': `${i * 60}deg`, '--d': `${0.1 + i * 0.05}s` } }));
    c.add(h('div.lg-nightbg'), h('div.lg-fullmoon'), ...tails, ...fires, h('div.lg-kyubi', '🦊'), h('div.lg-kyu', '九', h('br'), '尾'));
    for (let i = 0; i < 9; i++) c.at(200 + i * 90, () => audio.tone(NOTE(69 + [0, 3, 5, 7, 10, 12, 15, 17, 19][i]), 0.25, { type: 'sine', vol: 0.06 }));
    c.at(1150, () => {
      audio.play('gachaSSR');
      audio.tone(NOTE(57), 1.0, { type: 'triangle', vol: 0.06 });
      flash('#dff4ff', 0.5, 280);
      particles.burst(c.W / 2, c.H * 0.45, { n: 50, colors: ['#9ad8ff', '#ffffff', '#c9e8ff'], speed: 11, size: 7, gravity: -0.1 });
    });
  },

  // 満願の大鳥居: rushing through a tunnel of a thousand torii into the sunrise
  o_otorii: (c) => {
    const gate = () => h('div.lg-gate', h('i.kasagi'), h('i.nuki'), h('i.hashira.l'), h('i.hashira.r'));
    const gates = Array.from({ length: 7 }, (_, i) => {
      const g = gate();
      g.style.setProperty('--d', `${i * 0.12}s`);
      return g;
    });
    c.add(h('div.lg-dawnbg'), h('div.lg-sunrise'), ...gates, h('div.lg-bigtorii', '⛩️'), h('div.lg-mangan', '満', h('br'), '願', h('br'), '成', h('br'), '就'));
    for (let i = 0; i < 7; i++) c.at(i * 120, () => audio.play('whoosh', { pitch: 0.8 + i * 0.08, vol: 0.35 }));
    c.at(950, () => {
      audio.tone(NOTE(62), 1.4, { type: 'triangle', vol: 0.08 });
      audio.tone(NOTE(69), 1.4, { type: 'triangle', vol: 0.06, at: 0.05 });
      flash('#ffe0b0', 0.6, 300);
    });
    c.at(1250, () => {
      audio.play('stamp');
      audio.play('gachaSSR');
      particles.burst(c.W / 2, c.H * 0.4, { n: 40, type: 'glyph', glyph: '🌸', speed: 10, size: 22, gravity: 0.1 });
    });
  },

  // ===================================================== パペッター
  // 人形姫オルカ: strings drop under a spotlight, the dolls start to dance on cue
  p_orca: (c) => {
    const n = 7;
    const strings = Array.from({ length: n }, (_, i) =>
      h('span.lg-pstring', { style: { left: `${12 + i * 12.6}%`, '--len': `${30 + ((i * 17) % 3) * 8}%`, '--d': `${0.1 + i * 0.06}s` } }, h('b', '🪆')),
    );
    c.add(h('div.lg-theater'), h('div.lg-spot'), ...strings, h('div.lg-controlbar'), h('div.lg-orca', '👸'), h('div.lg-oname', 'ORCA'));
    for (let i = 0; i < n; i++) c.at(100 + i * 60, () => audio.tone(NOTE(76 + ((i * 2) % 7)), 0.08, { type: 'triangle', vol: 0.05 }));
    c.at(600, () => seq([[NOTE(72), 0, 0.15], [NOTE(76), 0.15, 0.15], [NOTE(79), 0.3, 0.15], [NOTE(76), 0.45, 0.15], [NOTE(84), 0.6, 0.5]], 'square', 0.04, { filter: 2000 }));
    c.at(1150, () => {
      audio.play('gachaSSR');
      flash('#f0e4ff', 0.5, 260);
      particles.burst(c.W / 2, c.H * 0.45, { n: 50, colors: ['#b48cff', '#ff5a7a', '#fff'], speed: 12, type: 'star', size: 7 });
    });
  },

  // 終幕の人形劇: the curtain opens on bowing dolls, then falls under the moon — 終幕
  p_curtain: (c) => {
    const dolls = ['🪆', '🤡', '🎎', '🪆', '🧸'].map((g, i) => h('span.lg-bowdoll', { style: { left: `${18 + i * 16}%`, '--d': `${0.55 + i * 0.07}s` } }, g));
    c.add(h('div.lg-stagefloor'), h('div.lg-moon2'), ...dolls, h('div.lg-curtL'), h('div.lg-curtR'), h('div.lg-shumaku', '終幕'));
    c.at(100, () => audio.play('whoosh', { pitch: 0.6 }));
    c.at(500, () => seq([[NOTE(67), 0, 0.3], [NOTE(64), 0.3, 0.3], [NOTE(60), 0.6, 0.6]], 'triangle', 0.06));
    c.at(1050, () => {
      audio.play('whoosh', { pitch: 0.5 });
      audio.play('bigHit', { vol: 0.5, pitch: 0.7 });
    });
    c.at(1300, () => {
      audio.tone(NOTE(48), 1.2, { type: 'sine', vol: 0.08 });
      particles.rain('🌙', 10, 26);
    });
  },

  // 巨大人形ギガドール: hundreds of little dolls march to the center and fuse into a giant
  p_gigadoll: (c) => {
    const minis = Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      return h('span.lg-minidoll', { style: { '--x': `${Math.cos(a) * 720}px`, '--y': `${Math.sin(a) * 480}px`, '--d': `${(i % 6) * 0.05}s` } }, '🪆');
    });
    c.add(h('div.lg-gigabg'), ...minis, h('div.lg-fusion'), h('div.lg-giga', '🗿'), h('div.lg-gigaeyes'), h('div.lg-gname', 'GIGADOLL'));
    for (let i = 0; i < 8; i++) c.at(100 + i * 100, () => audio.play('bigHit', { pitch: 1.5 - i * 0.05, vol: 0.2 }));
    c.at(950, () => {
      flash('#ffffff', 0.8, 300);
      audio.play('shatter');
    });
    c.at(1100, () => {
      audio.play('bigHit');
      seq([[NOTE(33), 0, 1.0], [NOTE(40), 0, 1.0]], 'sawtooth', 0.08, { filter: 700 });
      shake(24, 500);
      particles.burst(c.W / 2, c.H * 0.85, { n: 60, colors: ['#8a7a6a', '#b48cff', '#fff'], speed: 12, size: 8, gravity: 0.3 });
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
