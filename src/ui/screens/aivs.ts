import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { apply, buildDeck, chooseAction, chooseMulligan, CLASSES, def, E, PLAYABLE_CLASSES, RARITY, sortDeck, validateDeck, type ClassId, type Difficulty, type Rarity } from '../../engine';
import { save } from '../../meta/save';
import { bottomNav, btn, topBar } from '../common';
import { h, wait } from '../dom';
import { toast } from '../fx/fx';
import { go, type ScreenFn } from '../router';
import { inspectCard } from './decks';

/** one side of an AI-vs-AI match */
export interface AiSide {
  /** 'npc' = the deck the balance simulation builds for that class; otherwise a saved deck id */
  source: 'npc' | 'mine';
  cls: ClassId;
  deckId: string;
  /** the NPC deck in use (kept so a re-watch uses the same list) */
  npcDeck: string[];
  diff: Difficulty;
}

export interface AiVsResult {
  aName: string;
  bName: string;
  winner: 0 | 1 | -1;
  turns: number;
}

const DIFF_LABEL: Record<Difficulty, string> = { easy: 'かんたん', normal: 'ふつう', hard: 'つよい', oni: '鬼' };
const COUNTS = [10, 30, 100];

// remembered while the app is open, so coming back from 観戦 keeps the setup
const state: { a: AiSide; b: AiSide; count: number } = {
  a: { source: 'npc', cls: 'gacha', deckId: '', npcDeck: [], diff: 'normal' },
  b: { source: 'npc', cls: 'stream', deckId: '', npcDeck: [], diff: 'normal' },
  count: 10,
};

/** the NPC deck exactly as the AI balance runs build it */
export function npcDeck(cls: ClassId): string[] {
  return buildDeck(cls, { quality: 1, smart: true });
}

function sideDeck(x: AiSide): { cls: ClassId; cards: string[]; name: string } | null {
  if (x.source === 'npc') {
    if (!x.npcDeck.length) x.npcDeck = npcDeck(x.cls);
    return { cls: x.cls, cards: x.npcDeck, name: `${CLASSES[x.cls].name}（AI調整用デッキ）` };
  }
  const d = save.data.decks.find((k) => k.id === x.deckId);
  if (!d) return null;
  return { cls: d.cls, cards: d.cards, name: d.name };
}

/** play `n` AI-vs-AI games without animation; seats alternate */
export async function simulate(
  a: { cls: ClassId; cards: string[]; diff: Difficulty },
  b: { cls: ClassId; cards: string[]; diff: Difficulty },
  n: number,
  progress: (done: number, r: SimTally) => void,
  cancelled: () => boolean,
): Promise<SimTally> {
  const r: SimTally = { a: 0, b: 0, draw: 0, games: 0, turns: 0, aFirst: 0, aFirstWins: 0 };
  // the quick search budget the balance runs use
  const tune = { reply: 0, samples: 1, beam: 3, depth: 4, budget: 600 };
  for (let g = 0; g < n && !cancelled(); g++) {
    const aSeat = (g % 2) as 0 | 1;
    const sides = aSeat === 0 ? [a, b] : [b, a];
    const s = E.createGame({ decks: [[...sides[0].cards], [...sides[1].cards]], classes: [sides[0].cls, sides[1].cls], leaders: [sides[0].cls, sides[1].cls], record: false });
    for (const sd of [0, 1] as const) apply(s, { t: 'mulligan', side: sd, swap: chooseMulligan(s, sd, { difficulty: sides[sd].diff }) });
    let steps = 0;
    while (s.phase === 'main' && steps < 1500 && s.turn <= 70) {
      apply(s, chooseAction(s, { difficulty: sides[s.active].diff, tune }));
      steps++;
      if (steps % 8 === 0) {
        await wait(0);
        if (cancelled()) break;
      }
    }
    if (cancelled()) break;
    r.games++;
    r.turns += s.turn;
    const aFirst = s.first === aSeat;
    if (aFirst) r.aFirst++;
    if (s.winner === aSeat) {
      r.a++;
      if (aFirst) r.aFirstWins++;
    } else if (s.winner === null || s.winner === -1) r.draw++;
    else r.b++;
    progress(g + 1, r);
  }
  return r;
}

export interface SimTally {
  a: number;
  b: number;
  draw: number;
  games: number;
  turns: number;
  aFirst: number;
  aFirstWins: number;
}

/** AI観戦: pick two decks (the AI's own NPC decks or your saved decks) and let the AI play both */
export const aivsScreen: ScreenFn = (root, params) => {
  music.play('home');
  const tb = topBar({ back: () => void go('home'), title: 'AI観戦' });
  const body = h('div.av-body');
  root.append(tb.el, body, bottomNav('home'));
  let running = false;
  let cancel = false;
  const last = params.last as AiVsResult | undefined;

  const draw = () => {
    const a = sideDeck(state.a);
    const b = sideDeck(state.b);
    const err = (x: ReturnType<typeof sideDeck>) => (x ? validateDeck(x.cls, x.cards) : 'デッキを選んでね');
    const errA = err(a);
    const errB = err(b);
    const ok = !errA && !errB;
    body.replaceChildren(
      h('div.av-intro', 'AI同士を戦わせて観戦したり、何十戦もまとめて勝率を測ったりできます。デッキは「AI調整用デッキ」（ランキングや相性表のシミュレーションでAIが使っているもの）か、自分で作ったデッキから選べます。'),
      ...(last
        ? [h(
            'div.av-last',
            h('b', '前回の観戦'),
            h('span', last.winner === -1 ? `引き分け（${last.turns}ターン）` : `${last.winner === 0 ? last.aName : last.bName} の勝ち（${last.turns}ターン）`),
          )]
        : []),
      h('div.av-sides', sidePanel('A', state.a, a, errA, draw), h('div.av-vs', 'VS'), sidePanel('B', state.b, b, errB, draw)),
      h(
        'div.av-actions',
        btn('👀 観戦する', () => {
          if (!ok || !a || !b) return toast(errA ?? errB ?? '', '⚠️');
          audio.unlock();
          void go('battle', {
            mode: 'spectate',
            a: { cls: a.cls, cards: a.cards, name: a.name, diff: state.a.diff },
            b: { cls: b.cls, cards: b.cards, name: b.name, diff: state.b.diff },
          });
        }, `btn-hot btn-big${ok ? '' : ' disabled'}`),
        h(
          'div.av-sim',
          h('div.av-sim-head', '⚡ 高速シミュレーション（演出なし）'),
          h(
            'div.av-chips',
            COUNTS.map((n) => h(`button.f-chip${state.count === n ? '.on' : ''}`, { type: 'button', onclick: () => { state.count = n; audio.play('tap'); draw(); } }, `${n}戦`)),
          ),
          btn(running ? 'とめる' : `${state.count}戦 まとめて戦わせる`, () => {
            if (running) {
              cancel = true;
              return;
            }
            if (!ok || !a || !b) return toast(errA ?? errB ?? '', '⚠️');
            void runSim(a, b);
          }, running ? 'btn-danger' : `btn-sim${ok ? '' : ' disabled'}`),
          simBox,
        ),
      ),
    );
  };

  const simBox = h('div.av-result');
  const runSim = async (a: NonNullable<ReturnType<typeof sideDeck>>, b: NonNullable<ReturnType<typeof sideDeck>>) => {
    running = true;
    cancel = false;
    draw();
    const n = state.count;
    const show = (done: number, r: SimTally, finished: boolean) => {
      const pa = r.games ? r.a / r.games : 0;
      const pb = r.games ? r.b / r.games : 0;
      simBox.replaceChildren(
        h('div.av-prog', h('div.av-prog-fill', { style: { width: `${(done / n) * 100}%` } }), h('span', finished ? `${r.games}戦 終了` : `${done} / ${n} 戦…`)),
        h(
          'div.av-score',
          h('div.av-score-side', { style: { '--c1': CLASSES[a.cls].color } }, h('span', `${CLASSES[a.cls].emoji} A`), h('b', `${Math.round(pa * 100)}%`), h('small', `${r.a}勝`)),
          h('div.av-bar', h('div.av-bar-a', { style: { width: `${pa * 100}%`, background: CLASSES[a.cls].color } }), h('div.av-bar-b', { style: { width: `${pb * 100}%`, background: CLASSES[b.cls].color } })),
          h('div.av-score-side', { style: { '--c1': CLASSES[b.cls].color } }, h('span', `B ${CLASSES[b.cls].emoji}`), h('b', `${Math.round(pb * 100)}%`), h('small', `${r.b}勝`)),
        ),
        ...(r.games
          ? [h(
              'div.av-detail',
              `引き分け ${r.draw}　平均 ${(r.turns / r.games).toFixed(1)} ターン　Aが先攻のときの勝率 ${r.aFirst ? Math.round((r.aFirstWins / r.aFirst) * 100) : 0}%　後攻のとき ${r.games - r.aFirst ? Math.round(((r.a - r.aFirstWins) / (r.games - r.aFirst)) * 100) : 0}%`,
            )]
          : []),
      );
    };
    show(0, { a: 0, b: 0, draw: 0, games: 0, turns: 0, aFirst: 0, aFirstWins: 0 }, false);
    const r = await simulate({ ...a, diff: state.a.diff }, { ...b, diff: state.b.diff }, n, (d, t) => show(d, t, false), () => cancel || !root.isConnected);
    running = false;
    if (!root.isConnected) return;
    draw();
    show(r.games, r, true);
    audio.play(r.games ? 'unlock' : 'back');
  };

  draw();
  return () => {
    cancel = true;
    tb.dispose();
  };
};

function sidePanel(label: string, x: AiSide, deck: ReturnType<typeof sideDeck>, err: string | null, redraw: () => void): HTMLElement {
  const cls = deck?.cls ?? x.cls;
  const cm = CLASSES[cls];
  const mine = save.data.decks;
  const chip = (on: boolean, text: string, fn: () => void) =>
    h(`button.f-chip${on ? '.on' : ''}`, { type: 'button', onclick: () => { audio.play('tap'); fn(); redraw(); } }, text);
  return h(
    'section.av-side',
    { style: { '--c1': cm.color, '--c2': cm.color2 } },
    h('div.av-side-head', h('span.av-tag', label), h('span.av-art', cm.leaderArt), h('div', h('b', deck?.name ?? '（未選択）'), h('small', `${cm.emoji}${cm.name}`))),
    h('div.av-row', chip(x.source === 'npc', '🤖 AI調整用デッキ', () => (x.source = 'npc')), chip(x.source === 'mine', '🃏 自分のデッキ', () => (x.source = 'mine'))),
    x.source === 'npc'
      ? h(
          'div.av-pick',
          h(
            'select.av-select',
            {
              onchange: (e: Event) => {
                x.cls = (e.target as HTMLSelectElement).value as ClassId;
                x.npcDeck = npcDeck(x.cls);
                redraw();
              },
            },
            PLAYABLE_CLASSES.map((c) => h('option', { value: c, selected: c === x.cls }, `${CLASSES[c].emoji} ${CLASSES[c].name}`)),
          ),
          h('button.av-reroll', { type: 'button', onclick: () => { x.npcDeck = npcDeck(x.cls); audio.play('flip'); redraw(); } }, '🎲 組み直す'),
        )
      : mine.length
        ? h(
            'select.av-select',
            {
              onchange: (e: Event) => {
                x.deckId = (e.target as HTMLSelectElement).value;
                redraw();
              },
            },
            h('option', { value: '', selected: !x.deckId }, 'デッキを選ぶ…'),
            mine.map((d) => h('option', { value: d.id, selected: d.id === x.deckId }, `${CLASSES[d.cls].emoji} ${d.name}（${d.cards.length}枚）`)),
          )
        : h('div.av-warn', 'まだデッキがありません'),
    h(
      'div.av-row',
      h('span.av-label', 'AIの強さ'),
      ...(['normal', 'hard', 'oni'] as Difficulty[]).map((d) => chip(x.diff === d, DIFF_LABEL[d], () => (x.diff = d))),
    ),
    err ? h('div.av-warn', `⚠️ ${err}`) : null,
    deck ? deckList(deck.cards) : null,
  );
}

function deckList(cards: string[]): HTMLElement {
  const counts = new Map<string, number>();
  for (const id of sortDeck(cards)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return h(
    'details.av-deck',
    h('summary', `デッキの中身（${cards.length}枚）`),
    h(
      'div.av-cards',
      [...counts].map(([id, n]) => {
        const d = def(id);
        return h(
          'button.av-card',
          { type: 'button', style: { '--rc': RARITY[d.rarity as Rarity].color }, onclick: () => inspectCard(id) },
          h('span.av-cost', String(d.cost)),
          h('span.av-cname', `${d.art} ${d.name}`),
          h('span.av-n', `×${n}`),
        );
      }),
    ),
  );
}
