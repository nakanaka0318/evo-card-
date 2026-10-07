import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, def } from '../../engine';
import { grant, rankInfo, rewardText } from '../../meta/economy';
import { pickupClass } from '../../meta/gacha';
import { claimLogin, LOGIN_REWARDS, ROULETTE, spinRoulette } from '../../meta/login';
import { refreshMissions } from '../../meta/missions';
import { save } from '../../meta/save';
import { badges, bottomNav, btn, modal, rewardModal, topBar } from '../common';
import { h, todayKey, wait } from '../dom';
import { flash, shake } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';
import { playerDeck } from './battleScreen';

const TIPS = [
  'FEVERはリーダーの周りのリングが満タンで発動！ コスト-1＆攻撃力+1！',
  '超進化したフォロワーは、自分のターン中ダメージを受けない！',
  'オーバーキルするとDOPAゲージがたまる。やりすぎは正義！',
  'ガチャクラスは運気6で天井。次のガチャはSSR確定！',
  '配信クラスはカードを出すだけでいいね+1。バズの準備はできてる？',
  'スワイプクラスは0コストのカードでコンボを稼げ！',
  'スイーツクラスは満タンでも回復すれば糖度が上がる！',
  'ゲーマークラスは攻撃するほど強くなる。レベル上げは裏切らない！',
  '守護（🛡️）を持つフォロワーがいると、他を攻撃できない',
  '連勝するとコインのボーナスが増えていく！',
];

export const homeScreen: ScreenFn = (root) => {
  music.play('home');
  const tb = topBar();
  const d = save.data;
  const deck = playerDeck();
  const cm = CLASSES[deck.cls];
  const deckSave = d.decks.find((x) => x.id === d.activeDeck);
  const r = rankInfo(d.rankPoints);
  const b = badges();
  const pick = CLASSES[pickupClass()];

  const ticker = h('div.ticker', h('div.ticker-track', [...TIPS, `本日のガチャピックアップ：${pick.emoji}${pick.name}`].map((t) => h('span.ticker-item', `✦ ${t}`))));
  const hero = h(
    'button.home-hero',
    { type: 'button', style: { '--c1': cm.color, '--c2': cm.color2 }, onclick: () => { audio.play('tap'); void go('decks'); } },
    h('div.hero-rays'),
    h('div.hero-art', cm.leaderArt),
    h('div.hero-info', h('div.hero-cls', `${cm.emoji} ${cm.name}`), h('div.hero-deck', deckSave?.name ?? 'デッキ'), h('div.hero-change', 'タップでデッキ変更')),
  );
  const rankBtn = h(
    'button.home-rank',
    { type: 'button', onclick: () => { audio.unlock(); audio.play('unlock'); flash('#fff', 0.5, 250); void go('battle', { mode: 'rank' }); } },
    h('div.hr-emblem', r.cur.emblem),
    h('div.hr-main', h('div.hr-label', 'ランクマッチ'), h('div.hr-rank', `${r.cur.name}  ${d.rankPoints} RP`), h('div.hr-bar', h('div.hr-fill', { style: { width: `${Math.round(r.pct * 100)}%` } }))),
    h('div.hr-go', 'BATTLE!'),
  );
  const sub = h(
    'div.home-sub',
    btn([h('span.hs-icon', '🗺️'), h('span', 'ストーリー')], () => void go('story'), 'home-subbtn'),
    btn([h('span.hs-icon', '⚔️'), h('span', 'フリーバトル')], () => void go('free'), 'home-subbtn'),
  );
  const side = h(
    'div.home-side',
    sideBtn('🎡', 'ルーレット', b.roulette, () => openRoulette()),
    sideBtn('📅', 'ログボ', false, () => openLogin(-1)),
    sideBtn('🏆', '実績', b.achievements > 0, () => void go('missions', { tab: 'ach' })),
    sideBtn('📖', '遊び方', !d.flags.rulesSeen, () => void go('rules')),
    sideBtn('⚙️', '設定', false, () => void go('settings')),
  );
  const streak = d.winStreak >= 2 ? h('div.home-streak', `🔥 ${d.winStreak}連勝中！`) : null;
  root.append(
    h('div.home-bg', { style: { '--c1': cm.color, '--c2': cm.color2 } }),
    tb.el,
    ticker,
    h('div.home-main', h('div.home-center', hero, streak, rankBtn, sub), side),
    bottomNav('home'),
  );

  // daily stuff
  const run = async () => {
    await wait(350);
    let changed = false;
    save.update((s) => {
      changed = refreshMissions(s);
    });
    if (changed) setTimeout(() => particles.burst(stage.w - 80, stage.h - 40, { n: 20, colors: ['#ff2e88', '#fff'], speed: 6 }), 100);
    let idx = -1;
    save.update((s) => {
      idx = claimLogin(s);
    });
    if (idx >= 0) await openLogin(idx);
    if (!save.data.flags.firstTen && save.data.flags.onboarded) {
      await firstTenPrompt();
    }
  };
  void run();
  return () => tb.dispose();
};

function sideBtn(icon: string, label: string, badge: boolean, fn: () => void): HTMLElement {
  return h(
    'button.side-btn',
    { type: 'button', onclick: () => { audio.play('tap'); fn(); } },
    h('span.side-icon', icon),
    h('span.side-label', label),
    badge ? h('span.badge', '!') : null,
  );
}

function openLogin(todayIdx: number): Promise<void> {
  return new Promise((res) => {
    const d = save.data;
    const doneUpTo = (d.login.total - 1) % LOGIN_REWARDS.length;
    const cells = LOGIN_REWARDS.map((rw, i) => {
      const claimed = i < doneUpTo || (i === doneUpTo && todayIdx !== i);
      const today = i === todayIdx;
      return h(`div.login-cell${claimed ? '.claimed' : ''}${today ? '.today' : ''}${i === 6 ? '.big' : ''}`, h('div.lc-day', `${i + 1}日目`), h('div.lc-reward', rewardText(rw)), h('div.lc-stamp', 'GET'));
    });
    const m = modal([h('div.login-sub', `連続ログイン ${d.login.streak}日 ／ 通算 ${d.login.total}日`), h('div.login-grid', cells), btn('OK！', () => m.close(), 'btn-hot')], {
      title: 'ログインボーナス',
      cls: 'login-modal',
      onClose: () => res(),
    });
    if (todayIdx >= 0) {
      setTimeout(() => {
        const cell = cells[todayIdx];
        cell.classList.add('stamped');
        audio.play('stamp');
        shake(10, 200);
        audio.play('coins');
        particles.rain('🪙', 16, 26);
      }, 600);
    }
  });
}

function firstTenPrompt(): Promise<void> {
  return new Promise((res) => {
    const m = modal(
      [
        h('div.ft-burst', '🎁'),
        h('div.ft-text', '初回限定！'),
        h('div.ft-big', '無料10連ガチャ'),
        h('div.ft-sub', 'レジェンド1枚確定！ さっそく回そう！'),
        btn('回す！！', () => {
          m.close();
          void go('gacha', { free10: true });
        }, 'btn-hot btn-big'),
      ],
      { cls: 'first-ten', closable: false, onClose: () => res() },
    );
    audio.play('reveal');
  });
}

function openRoulette(): void {
  const d = save.data;
  const today = todayKey();
  const used = d.roulette === today;
  const n = ROULETTE.length;
  const seg = 360 / n;
  const grad = ROULETTE.map((s, i) => `${s.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  const labels = ROULETTE.map((s, i) => h('div.rl-label', { style: { transform: `rotate(${i * seg + seg / 2}deg) translateY(-118px)` } }, h('span', s.icon), h('b', s.label)));
  const wheel = h('div.rl-wheel', { style: { background: `conic-gradient(${grad})` } }, labels);
  const spinBtn = btn(used ? '今日はもう回した' : 'まわす！', () => void spin(), `btn-hot btn-big${used ? ' disabled' : ''}`);
  const m = modal([h('div.rl-wrap', h('div.rl-pointer', '▼'), wheel, h('div.rl-hub', 'DOPA')), spinBtn], { title: 'デイリールーレット', cls: 'roulette-modal' });
  let spinning = false;
  const spin = async () => {
    if (spinning || save.data.roulette === today) return;
    spinning = true;
    const idx = spinRoulette();
    const target = 360 * 6 + (360 - (idx * seg + seg / 2));
    wheel.style.transition = 'transform 3.6s cubic-bezier(.12,.75,.15,1)';
    wheel.style.transform = `rotate(${target}deg)`;
    const t0 = performance.now();
    const ticker = window.setInterval(() => {
      const k = (performance.now() - t0) / 3600;
      if (Math.random() < 1 - k) audio.play('gachaTick', { pitch: 1 + k });
    }, 70);
    await wait(3700);
    clearInterval(ticker);
    const slot = ROULETTE[idx];
    save.update((s) => {
      s.roulette = today;
      grant(s, slot.reward);
    });
    m.close();
    await rewardModal(slot.weight <= 3 ? '大当たり！！！' : '当たり！', slot.reward);
    void go('home');
  };
  void def;
}
