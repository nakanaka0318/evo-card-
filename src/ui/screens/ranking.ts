import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, PLAYABLE_CLASSES, RARITY, SIM_GAMES, type ClassId, type Rarity } from '../../engine';
import { cardRanking, leaderRanking, matchupTable, strongWeak, type CardRow, type LeaderRow, type MatchupTable } from '../../meta/records';
import { save } from '../../meta/save';
import { bottomNav, topBar } from '../common';
import { h } from '../dom';
import { go, type ScreenFn } from '../router';
import { inspectCard } from './decks';

type Tab = 'card' | 'npc' | 'player' | 'matchup';
type Source = 'battle' | 'sim';

const MEDAL = ['🥇', '🥈', '🥉'];
const PAGE = 30;

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** ランキング: strongest cards / NPC leaders / your leaders, from your battles or the AI simulation */
export const rankingScreen: ScreenFn = (root, params) => {
  music.play('home');
  const tb = topBar({ back: () => void go('home'), title: 'ランキング' });
  const tabs = h('div.tabs');
  const body = h('div.rk-body');
  root.append(tb.el, tabs, body, bottomNav('home'));
  let tab: Tab = params.tab === 'npc' || params.tab === 'player' || params.tab === 'matchup' ? params.tab : 'card';
  let focus: ClassId | null = null;
  const hasBattles = save.data.records.battles > 0;
  let source: Source = hasBattles ? 'battle' : 'sim';
  let cls: ClassId | 'all' = 'all';
  let shown = PAGE;

  const tabBtn = (t: Tab, label: string) =>
    h(`button.tab${tab === t ? '.on' : ''}`, { type: 'button', onclick: () => { tab = t; shown = PAGE; audio.play('tap'); draw(); } }, label);
  const chip = (on: boolean, label: string | HTMLElement[], fn: () => void, extra = '') =>
    h(`button.f-chip${on ? '.on' : ''}${extra}`, { type: 'button', onclick: () => { audio.play('tap'); fn(); draw(); } }, label);

  const draw = () => {
    tabs.replaceChildren(tabBtn('card', '🃏 カード'), tabBtn('npc', '🤖 NPCリーダー'), tabBtn('player', '🧑 プレイヤーリーダー'), tabBtn('matchup', '⚔️ 相性表'));
    const rec = save.data.records;
    const head: HTMLElement[] = [];
    if (tab !== 'player') {
      head.push(
        h(
          'div.rk-src',
          chip(source === 'battle', [h('b', 'あなたのバトル'), h('small', `${rec.battles}戦`)], () => { source = 'battle'; shown = PAGE; }),
          chip(source === 'sim', [h('b', 'AIシミュレーション'), h('small', SIM_GAMES ? `AI同士の対戦から` : '')], () => { source = 'sim'; shown = PAGE; }),
        ),
      );
    }
    if (tab === 'card') {
      head.push(
        h(
          'div.rk-filter',
          chip(cls === 'all', 'すべて', () => { cls = 'all'; shown = PAGE; }),
          ...(['neutral', ...PLAYABLE_CLASSES] as ClassId[]).map((c) =>
            chip(cls === c, `${CLASSES[c].emoji}${CLASSES[c].name}`, () => { cls = c; shown = PAGE; }),
          ),
        ),
      );
    }
    head.push(h('div.rk-note', note(tab, source, rec.battles)));
    body.replaceChildren(...head, ...(tab === 'card' ? drawCards() : tab === 'matchup' ? drawMatchups() : drawLeaders()));
  };

  const drawCards = (): HTMLElement[] => {
    const rows = cardRanking(save.data, source, cls, 3);
    if (!rows.length) return [empty(source === 'battle' ? 'まだ記録がありません。バトルで使われたカードが（3試合以上で）ここに並びます。' : 'このクラスのデータがありません。')];
    const out: HTMLElement[] = [h('div.rk-podium', rows.slice(0, 3).map((r, i) => cardPodium(r, i, source)))];
    out.push(h('div.rk-list', rows.slice(3, shown).map((r, i) => cardRow(r, i + 3, source))));
    if (rows.length > shown) out.push(h('button.rk-more', { type: 'button', onclick: () => { shown += PAGE; audio.play('tap'); draw(); } }, `もっと見る（あと${rows.length - shown}枚）`));
    return out;
  };

  const drawLeaders = (): HTMLElement[] => {
    const src = tab === 'player' ? 'player' : source === 'sim' ? 'sim' : 'npc';
    const rows = leaderRanking(save.data, src);
    if (!rows.length) {
      return [empty(tab === 'player' ? 'まだ記録がありません。バトルすると、使ったリーダーの勝率がここに並びます。' : 'まだ記録がありません。NPCと戦うと、相手リーダーの強さがここに並びます。')];
    }
    return [h('div.rk-podium', rows.slice(0, 3).map((r, i) => leaderPodium(r, i, src))), h('div.rk-list', rows.slice(3).map((r, i) => leaderRow(r, i + 3, src)))];
  };

  const drawMatchups = (): HTMLElement[] => {
    const t = matchupTable(save.data, source);
    if (!t.rows.length) return [empty('まだ記録がありません。バトルすると、使ったリーダーと相手リーダーの相性がここに表で並びます。')];
    if (focus && !t.rows.includes(focus)) focus = null;
    const pick = (c: ClassId) => {
      focus = focus === c ? null : c;
      audio.play('tap');
      draw();
    };
    return [matchupGrid(t, source, focus, pick), matchupInfo(t, source, focus)];
  };

  draw();
  return () => tb.dispose();
};

function note(tab: Tab, source: Source, battles: number): string {
  if (tab === 'matchup') {
    return source === 'sim'
      ? '行のリーダーが、列のリーダーと戦ったときの勝率（AI同士の総当たり）。緑は有利、赤は不利。行の名前をタップすると得意・苦手がわかります。'
      : `あなたが使ったリーダー（行）が、NPCリーダー（列）と戦ったときの勝率（${battles}戦）。緑は有利、赤は不利。`;
  }
  if (tab === 'player') return `あなたが使ったリーダーの勝率（${battles}戦）。試合数が少ないうちは50%寄りに補正して並べています。`;
  if (source === 'sim') {
    return tab === 'card'
      ? 'AI同士の大量対戦で、そのカードを使ったときに勝率が何ポイント上がったか。'
      : `NPCデッキ同士で総当たりさせたときの勝率（${SIM_GAMES}戦）。`;
  }
  return tab === 'card'
    ? `あなたのバトル（${battles}戦）で使われたカードの、使った側の勝率。あなたとNPCの両方を数えます。`
    : `あなたと戦ったNPCリーダーの勝率（＝あなたに勝った割合）。`;
}

function empty(text: string): HTMLElement {
  return h('div.rk-empty', h('div.rk-empty-icon', '📊'), h('div', text));
}

function cardArt(r: CardRow): HTMLElement {
  const c = CLASSES[r.d.cls];
  const rar = RARITY[r.d.rarity as Rarity];
  return h(
    'div.rk-art',
    { style: { '--c1': c.color, '--c2': c.color2, '--rc': rar.color } },
    h('span.rk-glyph', r.d.art),
    h('span.rk-cost', String(r.d.cost)),
  );
}

function cardStat(r: CardRow, source: Source): HTMLElement {
  if (source === 'sim') {
    const v = r.lift ?? 0;
    return h('div.rk-stat', h(`b${v >= 0 ? '.up' : '.down'}`, `${v >= 0 ? '+' : ''}${v.toFixed(1)}`), h('small', 'pt'));
  }
  return h('div.rk-stat', h('b', pct(r.rate ?? 0)), h('small', `${r.g}戦`));
}

function bar(x: number, color: string): HTMLElement {
  return h('div.rk-bar', h('div.rk-fill', { style: { width: `${Math.max(2, Math.min(100, x * 100))}%`, background: color } }));
}

function cardBar(r: CardRow, source: Source): HTMLElement {
  // sim lift is shown on a ±10pt scale centred at 50%
  const x = source === 'sim' ? 0.5 + (r.lift ?? 0) / 20 : (r.rate ?? 0);
  return bar(x, CLASSES[r.d.cls].color);
}

function cardSub(r: CardRow, source: Source): string {
  const c = CLASSES[r.d.cls];
  const rar = RARITY[r.d.rarity as Rarity];
  const mine = source === 'battle' && r.mine ? `　あなたが${r.mine}戦で使用` : '';
  return `${c.emoji}${c.name}・${rar.name}${mine}`;
}

function cardPodium(r: CardRow, i: number, source: Source): HTMLElement {
  return h(
    `button.rk-pod.p${i + 1}`,
    { type: 'button', onclick: () => inspectCard(r.d.id) },
    h('div.rk-medal', MEDAL[i]),
    cardArt(r),
    h('div.rk-name', r.d.name),
    h('div.rk-sub', cardSub(r, source)),
    cardStat(r, source),
    cardBar(r, source),
  );
}

function cardRow(r: CardRow, i: number, source: Source): HTMLElement {
  return h(
    'button.rk-row',
    { type: 'button', onclick: () => inspectCard(r.d.id) },
    h('div.rk-rank', String(i + 1)),
    cardArt(r),
    h('div.rk-main', h('div.rk-name', r.d.name), h('div.rk-sub', cardSub(r, source)), cardBar(r, source)),
    cardStat(r, source),
  );
}

function leaderArt(cls: ClassId): HTMLElement {
  const c = CLASSES[cls];
  return h('div.rk-art.rk-leader', { style: { '--c1': c.color, '--c2': c.color2, '--rc': c.color } }, h('span.rk-glyph', c.leaderArt), h('span.rk-emo', c.emoji));
}

function leaderSub(r: LeaderRow, src: 'npc' | 'player' | 'sim'): string {
  const l = r.g - r.w;
  if (src === 'npc') return `あなたに ${r.w}勝 ${l}敗`;
  return `${r.w}勝 ${l}敗`;
}

function leaderPodium(r: LeaderRow, i: number, src: 'npc' | 'player' | 'sim'): HTMLElement {
  const c = CLASSES[r.cls];
  return h(
    `div.rk-pod.p${i + 1}`,
    h('div.rk-medal', MEDAL[i]),
    leaderArt(r.cls),
    h('div.rk-name', c.name),
    h('div.rk-sub', c.mechanic),
    h('div.rk-stat', h('b', pct(r.rate)), h('small', leaderSub(r, src))),
    bar(r.rate, c.color),
  );
}

function leaderRow(r: LeaderRow, i: number, src: 'npc' | 'player' | 'sim'): HTMLElement {
  const c = CLASSES[r.cls];
  return h(
    'div.rk-row',
    h('div.rk-rank', String(i + 1)),
    leaderArt(r.cls),
    h('div.rk-main', h('div.rk-name', c.name), h('div.rk-sub', leaderSub(r, src)), bar(r.rate, c.color)),
    h('div.rk-stat', h('b', pct(r.rate)), h('small', `${r.g}戦`)),
  );
}

/** green above 50%, red below; stronger colour the further from even */
function rateColor(x: number): string {
  const k = Math.min(1, Math.abs(x - 0.5) * 2.6);
  return x >= 0.5 ? `rgba(52, 224, 176, ${0.12 + k * 0.78})` : `rgba(255, 77, 106, ${0.12 + k * 0.78})`;
}

function matchupGrid(t: MatchupTable, source: Source, focus: ClassId | null, pick: (c: ClassId) => void): HTMLElement {
  const head = h(
    'tr',
    h('th.mu-corner', h('span', '自分＼相手')),
    ...t.cols.map((b) => h(`th.mu-col${focus === b ? '.on' : ''}`, { title: CLASSES[b].name }, h('span.mu-emo', CLASSES[b].emoji), h('span.mu-short', CLASSES[b].name.replace('ー', '').slice(0, 3)))),
  );
  const rows = t.rows.map((a) =>
    h(
      `tr${focus === a ? '.on' : ''}`,
      h('th.mu-row', h('button', { type: 'button', onclick: () => pick(a) }, h('span.mu-emo', CLASSES[a].emoji), h('span', CLASSES[a].name))),
      ...t.cols.map((b) => {
        if (a === b && source === 'sim') return h('td.mu-self', '—');
        const c = t.cell(a, b);
        if (!c) return h('td.mu-none', '');
        const x = c.w / c.g;
        return h(
          `td.mu-cell${focus && focus !== a && focus !== b ? '.dim' : ''}`,
          { style: { background: rateColor(x) }, title: `${CLASSES[a].name} → ${CLASSES[b].name}：${pct(x)}（${c.g}戦）` },
          String(Math.round(x * 100)),
          // your own records are small samples: show how many games each cell is
          source === 'battle' ? h('small', `${c.g}戦`) : null,
        );
      }),
    ),
  );
  return h('div.mu-wrap', h('table.mu-table', h('thead', head), h('tbody', rows)));
}

function matchupInfo(t: MatchupTable, source: Source, focus: ClassId | null): HTMLElement {
  if (!focus) {
    return h('div.mu-legend', h('span.mu-sw.lo'), '不利', h('span.mu-sw.mid'), '五分', h('span.mu-sw.hi'), '有利', h('small', '　数字は勝率（%）'));
  }
  const c = CLASSES[focus];
  const sw = strongWeak(t, focus, source === 'sim' ? 5 : 1);
  const chips = (list: [ClassId, number][], cls: string) =>
    list.length ? list.map(([b, x]) => h(`span.mu-chip.${cls}`, `${CLASSES[b].emoji}${CLASSES[b].name} ${pct(x)}`)) : [h('span.mu-chip', 'なし')];
  return h(
    'div.mu-focus',
    { style: { '--c1': c.color } },
    h('div.mu-focus-head', h('span.mu-focus-art', c.leaderArt), h('b', `${c.emoji}${c.name} の相性`)),
    h('div.mu-focus-row', h('span.mu-tag.hi', '得意'), ...chips(sw.strong, 'hi')),
    h('div.mu-focus-row', h('span.mu-tag.lo', '苦手'), ...chips(sw.weak, 'lo')),
  );
}
