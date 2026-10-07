import { audio } from '../../audio/audio';
import { CLASSES, KEYWORDS, PLAYABLE_CLASSES, RULES } from '../../engine';
import { save } from '../../meta/save';
import { staticCard } from '../cardview';
import { btn, topBar } from '../common';
import { h } from '../dom';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';

interface Page {
  title: string;
  body: () => HTMLElement[];
}

const PAGES: Page[] = [
  {
    title: '勝利条件',
    body: () => [
      h('div.rp-big', '👑 → 💥'),
      h('p', `相手のリーダーの体力 ${RULES.leaderHp} を 0 にしたら勝ち！`),
      h('p', 'フォロワーで殴る、スペルで燃やす、ガチャで当てる。手段は問わない。'),
    ],
  },
  {
    title: 'PPとカード',
    body: () => [
      h('div.rp-cards', staticCard('n_speaker', 'collection'), staticCard('n_hammer', 'collection')),
      h('p', `PPは毎ターン1ずつ増える（最大${RULES.ppMax}）。カード左上の数字がコスト。`),
      h('p', '手札のカードを上にドラッグ（またはタップ→プレイ）で出せる。光っているカードは今出せる！'),
      h('p', `場には${RULES.boardMax}体まで、手札は${RULES.handMax}枚まで。山札が切れると負け。`),
    ],
  },
  {
    title: 'フォロワーで攻撃',
    body: () => [
      h('div.rp-big', '🗡️ ⇄ 🛡️'),
      h('p', 'フォロワーは出した次のターンから攻撃できる。自分のフォロワーを相手にドラッグ！'),
      h('p', 'フォロワー同士は殴り合い。お互いに攻撃力ぶんのダメージ。体力0で破壊。'),
      h('p', '《疾走》は出たターンに何でも殴れる。《突進》はフォロワーだけ殴れる。'),
    ],
  },
  {
    title: '進化と超進化',
    body: () => [
      h('div.rp-big', '✨ 進化 → 🌈 超進化'),
      h('p', `進化：先攻${RULES.evoTurnFirst}ターン目／後攻${RULES.evoTurnSecond}ターン目から。EPを1使って+2/+2。出したばかりでもフォロワーを殴れる。`),
      h('p', `超進化：先攻${RULES.superTurnFirst}ターン目／後攻${RULES.superTurnSecond}ターン目から。SEPを1使って+3/+3。自分のターン中はダメージを受けず、攻撃で倒すと相手リーダーに1ダメージ！`),
      h('p', '進化は1ターンに1回まで。フォロワーをタップして進化ボタン！'),
    ],
  },
  {
    title: 'DOPAゲージとFEVER',
    body: () => [
      h('div.rp-big', '🔥 FEVER 🔥'),
      h('p', 'リーダーの周りのリングがDOPAゲージ。カードを出す・敵を倒す・進化する・オーバーキル・ダメージを受ける、で溜まる。'),
      h('p', '満タンでFEVERボタンが出現！ 1枚引いて、そのターンは攻撃力+1＆手札コスト-1。'),
      h('p', '負けてる時ほど溜まりやすい。逆転のチャンスを逃すな！'),
    ],
  },
  {
    title: 'キーワード',
    body: () => [h('div.rp-kws', Object.values(KEYWORDS).map((k) => h('div.rp-kw', h('b', `${k.icon} ${k.name}`), h('span', k.desc))))],
  },
  {
    title: '5つのクラス',
    body: () => [
      h(
        'div.rp-classes',
        PLAYABLE_CLASSES.map((c) => {
          const m = CLASSES[c];
          return h('div.rp-cls', { style: { '--c1': m.color, '--c2': m.color2 } }, h('span.rp-cls-art', m.leaderArt), h('div', h('b', `${m.emoji} ${m.name}「${m.mechanic}」`), h('span', m.mechanicDesc)));
        }),
      ),
    ],
  },
  {
    title: '操作のコツ',
    body: () => [
      h('p', '・カードをタップ（長押し）で詳細とキーワード説明'),
      h('p', '・フォロワーをタップすると進化ボタンと攻撃先が光る'),
      h('p', '・左上の「AUTO」でオートバトル、「x1」で演出スピード変更'),
      h('p', '・リーサル（とどめ）が見えると相手リーダーが赤く光る'),
      h('p', '・PCはスペース/Enterでターン終了、Fでフィーバー、Escでキャンセル'),
    ],
  },
];

function pager(onDone?: () => void): HTMLElement {
  let i = 0;
  const content = h('div.rp-content');
  const dots = h('div.rp-dots');
  const prev = btn('‹ 前へ', () => { if (i > 0) { i--; draw(); } }, 'btn-small');
  const next = btn('次へ ›', () => { if (i < PAGES.length - 1) { i++; draw(); } else onDone?.(); }, 'btn-small btn-hot');
  const draw = () => {
    const p = PAGES[i];
    content.replaceChildren(h('div.rp-title', `${i + 1}. ${p.title}`), ...p.body());
    dots.replaceChildren(...PAGES.map((_, k) => h(`span${k === i ? '.on' : ''}`)));
    prev.classList.toggle('disabled', i === 0);
    next.textContent = i === PAGES.length - 1 ? (onDone ? 'とじる' : 'おわり') : '次へ ›';
    audio.play('flip');
  };
  draw();
  return h('div.rules-pager', content, h('div.rp-nav', prev, dots, next));
}

export const rulesScreen: ScreenFn = (root) => {
  save.update((d) => (d.flags.rulesSeen = true));
  const tb = topBar({ back: () => void go('home'), title: '遊び方' });
  root.append(tb.el, h('div.rules-body', pager(() => void go('home'))));
  return () => tb.dispose();
};

export function showRulesOverlay(): void {
  const ov = h('div.inspect');
  const close = () => {
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 200);
  };
  ov.append(h('div.rules-overlay', pager(close), h('button.modal-x', { type: 'button', onclick: close }, '×')));
  stage.overlay.append(ov);
}
