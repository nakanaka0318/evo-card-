import { audio } from '../../audio/audio';
import { ABILITIES, CLASSES, DOPA, KEYWORDS, PLAYABLE_CLASSES, RARITY, RULES, type Rarity } from '../../engine';
import { FIRST_PACKS, PACK_COST, PACK_SIZE, PITY, RATES } from '../../meta/gacha';
import { save } from '../../meta/save';
import { staticCard } from '../cardview';
import { btn, topBar } from '../common';
import { formatText } from '../cardview';
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

// ---------------------------------------------------------------- ルール表

type Row = (string | HTMLElement)[];

function table(head: string[], rows: Row[], cls = ''): HTMLElement {
  return h(
    `table.rt${cls ? '.' + cls : ''}`,
    h('thead', h('tr', head.map((c) => h('th', c)))),
    h('tbody', rows.map((r) => h('tr', r.map((c) => h('td', c))))),
  );
}

function section(title: string, ...body: HTMLElement[]): HTMLElement {
  return h('section.rt-sec', h('h3.rt-h', title), ...body);
}

/** every rule on one scrollable sheet, built from the engine's own numbers */
export function rulesTable(): HTMLElement {
  const evoP = (n: number) => `${n}`;
  const abilityRows: Row[] = Object.entries(ABILITIES)
    // numbered variants (バズ4, 課金5…) are covered by the generic X rows below
    .filter(([k]) => !/^(カウントダウン|バズ|シュガーハイ|コンボ|課金)\d+$/.test(k))
    .map(([k, v]) => [h('b.rt-ab', `【${k}】`), v]);
  const generic: Row[] = [
    [h('b.rt-ab', '【バズX】'), 'いいねがX以上あれば、Xを消費して発動。'],
    [h('b.rt-ab', '【シュガーハイX】'), '糖度がX以上なら発動（糖度は消費しない）。'],
    [h('b.rt-ab', '【コンボX】'), 'このターン、他のカードをX枚以上プレイしていれば発動。'],
    [h('b.rt-ab', '【課金X】'), 'PPがX以上あれば、XPPを払って強化版でプレイ。'],
    [h('b.rt-ab', '【カウントダウンX】'), '自分のターン開始時に1減り、0になると破壊される（アミュレット）。'],
  ];
  const rarities: Rarity[] = ['bronze', 'silver', 'gold', 'legend'];
  return h(
    'div.rules-table',
    section(
      '基本ルール',
      table(['項目', '内容'], [
        ['勝利条件', `相手リーダーの体力（${RULES.leaderHp}）を0にする`],
        ['敗北条件', '自分のリーダーの体力が0になる／山札が0枚の時にカードを引く'],
        ['デッキ', `${RULES.deckSize}枚ちょうど・同じカードは${RULES.maxCopies}枚まで・自分のクラス＋ニュートラル`],
        ['最初の手札', `${RULES.startHand}枚（はじめに好きな枚数を引き直せる）`],
        ['手札の上限', `${RULES.handMax}枚（あふれたカードは燃えて消える）`],
        ['場の上限', `${RULES.boardMax}体（フォロワーとアミュレットの合計）`],
        ['PP', `毎ターン最大PPが+1されて全回復（最大${RULES.ppMax}）`],
        ['先攻・後攻', `コイントスで決定。後攻は最初のターンに2枚引き、EPが${RULES.epSecond}（先攻は${RULES.epFirst}）`],
      ]),
    ),
    section(
      'ターンの流れ',
      table(['順番', 'やること'], [
        ['1. 開始', '最大PP+1・PP全回復 → カードを1枚引く → アミュレットのカウントダウン-1 → 【自分のターン開始時】の効果'],
        ['2. メイン', 'カードをプレイ・フォロワーで攻撃・進化（1ターン1回）・FEVER、を好きな順で'],
        ['3. 終了', '【自分のターン終了時】の効果 → 相手のターンへ'],
      ]),
    ),
    section(
      'カードの種類',
      table(['種類', '説明'], [
        ['フォロワー', '場に出て戦う。左下が攻撃力、右下が体力。出した次のターンから攻撃できる'],
        ['スペル', '使うとすぐ効果が出て、墓地へ行く'],
        ['アミュレット', '場に置かれ、効果を出し続ける。攻撃はしない'],
      ]),
    ),
    section(
      '攻撃',
      table(['ルール', '内容'], [
        ['攻撃先', '相手のフォロワー、または相手リーダー（《守護》がいる時は守護から）'],
        ['ダメージ', 'フォロワー同士はお互いに攻撃力ぶんのダメージ。体力0で破壊'],
        ['回数', '1ターンに1回（《連撃》は2回）'],
        ['出したターン', '《疾走》なら何でも、《突進》ならフォロワーだけ攻撃できる。進化しても突進になる'],
      ]),
    ),
    section(
      '進化・超進化',
      table(['', '進化', '超進化'], [
        ['使えるターン', `先攻${RULES.evoTurnFirst}／後攻${RULES.evoTurnSecond}ターン目から`, `先攻${RULES.superTurnFirst}／後攻${RULES.superTurnSecond}ターン目から`],
        ['ポイント', `EP（先攻${evoP(RULES.epFirst)}・後攻${evoP(RULES.epSecond)}）`, `SEP（${RULES.sep}）`],
        ['強化', '+2/+2（カードによって違う）', '+3/+3'],
        ['ボーナス', 'そのターンから《突進》', '《突進》＋自分のターン中はダメージを受けない＋攻撃で倒すと相手リーダーに1ダメージ'],
        ['回数', '進化・超進化あわせて1ターン1回', ''],
      ], 'rt-3'),
    ),
    section(
      'DOPAゲージとFEVER',
      table(['DOPAが溜まる行動', '量'], [
        ['カードをプレイ', `+${DOPA.play}`],
        ['相手のフォロワーを倒す', `+${DOPA.kill}`],
        ['進化／超進化', `+${DOPA.evolve}／+${DOPA.super}`],
        ['オーバーキル', `+${DOPA.overkill}`],
        ['ダメージを受ける・大ダメージを与える', `+${DOPA.hurt}`],
        ['ゲージ満タン', `${RULES.dopaMax}`],
      ]),
      table(['FEVER（満タンで発動）', '効果'], [['発動', 'カードを1枚引く。そのターン中、自分のフォロワーの攻撃力+1・手札のコスト-1']]),
    ),
    section('キーワード', table(['キーワード', '効果'], Object.values(KEYWORDS).map((k) => [h('b', `${k.icon} ${k.name}`), k.desc]))),
    section('能力ラベル', table(['ラベル', '意味'], [...abilityRows, ...generic])),
    section(
      'クラスの仕組み',
      table(['クラス', '仕組み'], PLAYABLE_CLASSES.map((c) => {
        const m = CLASSES[c];
        return [h('div', h('b', `${m.emoji} ${m.name}`), h('small.rt-sub', m.mechanic)), h('span', { html: formatText(m.mechanicDesc) })];
      })),
    ),
    section(
      'カードパック',
      table(['項目', '内容'], [
        ['中身', `1パック${PACK_SIZE}枚。8枚目はシルバー以上確定`],
        ['値段', `1パック🪙${PACK_COST.coin1}／10パック🪙${PACK_COST.coin10}・💎${PACK_COST.gem10}（10パックは最後のパックの8枚目がゴールド以上）`],
        ['天井', `${PITY}パック以内にレジェンド確定`],
        ['はじめて', `無料${FIRST_PACKS}パック（レジェンド1枚確定）`],
      ]),
      table(['レアリティ', '1枚あたりの確率', '生成（ドパ粉）', '分解（ドパ粉）'], rarities.map((r) => [
        h('b', { style: { color: RARITY[r].color } }, RARITY[r].name),
        `${(RATES[r] * 100).toFixed(1)}%`,
        String(RARITY[r].craft),
        String(RARITY[r].dust),
      ]), 'rt-4'),
    ),
  );
}

/** slides ⇄ table switch used by the rules screen and the in-battle overlay */
function rulesView(onDone?: () => void): HTMLElement {
  const body = h('div.rv-body');
  let mode: 'slides' | 'table' = 'slides';
  const tabs = h('div.rv-tabs');
  const draw = () => {
    tabs.replaceChildren(
      h(`button.f-chip${mode === 'slides' ? '.on' : ''}`, { type: 'button', onclick: () => { mode = 'slides'; audio.play('tap'); draw(); } }, '📖 スライドで学ぶ'),
      h(`button.f-chip${mode === 'table' ? '.on' : ''}`, { type: 'button', onclick: () => { mode = 'table'; audio.play('tap'); draw(); } }, '📋 ルール表'),
    );
    body.replaceChildren(mode === 'slides' ? pager(onDone) : rulesTable());
  };
  draw();
  return h('div.rules-view', tabs, body);
}

export const rulesScreen: ScreenFn = (root) => {
  save.update((d) => (d.flags.rulesSeen = true));
  const tb = topBar({ back: () => void go('home'), title: '遊び方' });
  root.append(tb.el, h('div.rules-body', rulesView(() => void go('home'))));
  return () => tb.dispose();
};

export function showRulesOverlay(): void {
  const ov = h('div.inspect');
  const close = () => {
    ov.classList.add('out');
    setTimeout(() => ov.remove(), 200);
  };
  ov.append(h('div.rules-overlay', rulesView(close), h('button.modal-x', { type: 'button', onclick: close }, '×')));
  stage.overlay.append(ov);
}
