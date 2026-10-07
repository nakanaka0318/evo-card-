import { audio } from '../audio/audio';
import { claimableAchievements } from '../meta/achievements';
import { rankInfo, rewardText, xpForLevel, type Reward } from '../meta/economy';
import { claimableMissions } from '../meta/missions';
import { save } from '../meta/save';
import { countUp, fmtNum, h, todayKey } from './dom';
import { flash } from './fx/fx';
import { particles } from './fx/particles';
import { go } from './router';
import { stage } from './stage';

export function btn(label: string | HTMLElement | (string | HTMLElement)[], onclick: () => void, cls = ''): HTMLElement {
  return h(
    `button.btn${cls ? '.' + cls.split(' ').join('.') : ''}`,
    {
      type: 'button',
      onclick: () => {
        audio.unlock();
        audio.play('tap');
        onclick();
      },
    },
    label as never,
  );
}

/** currency + level header that live-updates */
export function topBar(opts: { back?: () => void; title?: string } = {}): { el: HTMLElement; dispose: () => void } {
  const lvNum = h('span.tb-lv-num');
  const xpFill = h('span.tb-xp-fill');
  const name = h('span.tb-name');
  const coins = h('span.cur-num');
  const gems = h('span.cur-num');
  const tickets = h('span.cur-num');
  const dust = h('span.cur-num');
  const rank = h('span.tb-rank');
  const el = h(
    'div.topbar',
    opts.back ? h('button.tb-back', { type: 'button', onclick: () => { audio.play('back'); opts.back!(); } }, '‹') : null,
    h('div.tb-player', h('div.tb-lv', h('span.tb-lv-label', 'Lv'), lvNum), h('div.tb-info', name, h('span.tb-xp', xpFill)), rank),
    opts.title ? h('div.tb-title', opts.title) : h('div.tb-spacer'),
    h(
      'div.tb-cur',
      h('div.cur.cur-coin', { title: 'コイン' }, h('span.cur-icon', '🪙'), coins),
      h('div.cur.cur-gem', { title: 'ジェム' }, h('span.cur-icon', '💎'), gems),
      h('div.cur.cur-ticket', { title: 'ガチャチケット' }, h('span.cur-icon', '🎫'), tickets),
      h('div.cur.cur-dust', { title: 'ドパ粉（カード生成に使う）' }, h('span.cur-icon', '✨'), dust),
    ),
  );
  const prev = { coins: -1, gems: -1, tickets: -1, dust: -1 };
  const upd = () => {
    const d = save.data;
    lvNum.textContent = String(d.level);
    xpFill.style.width = `${Math.round((d.xp / xpForLevel(d.level)) * 100)}%`;
    name.textContent = d.name;
    const r = rankInfo(d.rankPoints);
    rank.textContent = `${r.cur.emblem} ${r.cur.name}`;
    const pairs: [keyof typeof prev, HTMLElement][] = [
      ['coins', coins],
      ['gems', gems],
      ['tickets', tickets],
      ['dust', dust],
    ];
    for (const [k, node] of pairs) {
      const v = d[k];
      if (prev[k] === v) continue;
      if (prev[k] >= 0 && v > prev[k]) {
        void countUp(node, prev[k], v, 600, fmtNum);
        node.parentElement?.classList.remove('gain');
        void node.parentElement?.offsetWidth;
        node.parentElement?.classList.add('gain');
      } else node.textContent = fmtNum(v);
      prev[k] = v;
    }
  };
  upd();
  const off = save.onChange(upd);
  return { el, dispose: off };
}

export interface Badges {
  gacha: boolean;
  missions: number;
  achievements: number;
  roulette: boolean;
}

export function badges(): Badges {
  const d = save.data;
  const today = todayKey();
  return {
    gacha: d.freePull !== today || d.tickets > 0,
    missions: claimableMissions(d),
    achievements: claimableAchievements(d),
    roulette: d.roulette !== today,
  };
}

export function bottomNav(active: string): HTMLElement {
  const b = badges();
  const tab = (id: string, icon: string, label: string, badge: number | boolean) =>
    h(
      `button.nav-tab${active === id ? '.active' : ''}`,
      { type: 'button', onclick: () => { if (active !== id) { audio.play('tap'); void go(id); } } },
      h('span.nav-icon', icon),
      h('span.nav-label', label),
      badge ? h('span.badge', typeof badge === 'number' ? String(badge) : '!') : null,
    );
  return h(
    'nav.bottomnav',
    tab('home', '🏠', 'ホーム', false),
    tab('story', '🗺️', 'ストーリー', false),
    tab('gacha', '🎰', 'ガチャ', b.gacha),
    tab('decks', '🃏', 'デッキ', false),
    tab('missions', '📋', 'ミッション', b.missions + b.achievements),
  );
}

export interface ModalOpts {
  title?: string;
  cls?: string;
  closable?: boolean;
  onClose?: () => void;
}

export function modal(content: HTMLElement | HTMLElement[], o: ModalOpts = {}): { el: HTMLElement; close: () => void } {
  const close = () => {
    if (!el.isConnected) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
    o.onClose?.();
  };
  const panel = h(
    `div.modal-panel${o.cls ? '.' + o.cls : ''}`,
    o.title ? h('div.modal-title', o.title) : null,
    o.closable !== false ? h('button.modal-x', { type: 'button', 'aria-label': '閉じる', onclick: () => { audio.play('back'); close(); } }, '×') : null,
    h('div.modal-body', content),
  );
  const el = h('div.modal', { onclick: (e: Event) => { if (e.target === el && o.closable !== false) close(); } }, panel);
  stage.overlay.append(el);
  return { el, close };
}

export function rewardModal(title: string, r: Reward, sub?: string): Promise<void> {
  return new Promise((res) => {
    const items = [
      r.coins ? ['🪙', r.coins, 'コイン'] : null,
      r.gems ? ['💎', r.gems, 'ジェム'] : null,
      r.tickets ? ['🎫', r.tickets, 'チケット'] : null,
      r.dust ? ['✨', r.dust, 'ドパ粉'] : null,
    ].filter(Boolean) as [string, number, string][];
    const els = items.map(([icon, n, label]) => {
      const num = h('span.rw-num', '0');
      setTimeout(() => void countUp(num, 0, n, 700, (v) => `+${fmtNum(v)}`), 250);
      return h('div.rw-item', h('span.rw-icon', icon), num, h('span.rw-label', label));
    });
    audio.play('coins');
    particles.rain('🪙', 24, 30);
    flash('#ffe14d', 0.25, 300);
    const m = modal(
      [
        h('div.rw-burst'),
        sub ? h('div.rw-sub', sub) : h('div'),
        h('div.rw-items', els),
        btn('受け取る！', () => m.close(), 'btn-hot btn-big'),
      ],
      { title, cls: 'reward-modal', onClose: () => res() },
    );
    void rewardText;
  });
}

export function confirmModal(text: string, ok: string, cancel = 'やめる'): Promise<boolean> {
  return new Promise((res) => {
    let answered = false;
    const m = modal(
      [
        h('div.confirm-text', text),
        h(
          'div.confirm-btns',
          btn(cancel, () => { answered = true; m.close(); res(false); }),
          btn(ok, () => { answered = true; m.close(); res(true); }, 'btn-hot'),
        ),
      ],
      { cls: 'confirm-modal', onClose: () => { if (!answered) res(false); } },
    );
  });
}
