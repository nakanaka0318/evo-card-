import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { buildDeck, CLASSES, collectible, def, PLAYABLE_CLASSES, RARITY, RULES, sortDeck, validateDeck, type ClassId, type Rarity } from '../../engine';
import { totalOwned } from '../../meta/economy';
import { save, type DeckSave } from '../../meta/save';
import { fitCardText, glossary, relatedBlock, staticCard } from '../cardview';
import { bottomNav, btn, confirmModal, modal, topBar } from '../common';
import { h } from '../dom';
import { toast } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';

export const decksScreen: ScreenFn = (root, params) => {
  music.play('home');
  const tb = topBar({ back: () => void go('home'), title: 'デッキ' });
  const body = h('div.decks-body');
  const tabs = h('div.tabs');
  root.append(tb.el, tabs, body, bottomNav('decks'));
  let tab: 'decks' | 'cards' = params.tab === 'cards' ? 'cards' : 'decks';
  const drawTabs = () => {
    tabs.replaceChildren(
      h(`button.tab${tab === 'decks' ? '.on' : ''}`, { type: 'button', onclick: () => { tab = 'decks'; audio.play('tap'); drawTabs(); draw(); } }, 'マイデッキ'),
      h(`button.tab${tab === 'cards' ? '.on' : ''}`, { type: 'button', onclick: () => { tab = 'cards'; audio.play('tap'); drawTabs(); draw(); } }, 'カード一覧', save.data.newCards.length ? h('span.badge', String(save.data.newCards.length)) : null),
    );
  };
  const draw = () => {
    if (tab === 'decks') drawDecks(body);
    else drawCollection(body);
  };
  drawTabs();
  draw();
  return () => tb.dispose();
};

// ------------------------------------------------------------------ deck list

function drawDecks(body: HTMLElement): void {
  const d = save.data;
  const list = d.decks.map((dk) => {
    const cm = CLASSES[dk.cls];
    const err = validateDeck(dk.cls, dk.cards);
    const active = dk.id === d.activeDeck;
    const top = [...new Set(dk.cards)].sort((a, b) => RARITY[def(b).rarity].order - RARITY[def(a).rarity].order).slice(0, 3);
    return h(
      `div.deck-tile${active ? '.active' : ''}`,
      { style: { '--c1': cm.color, '--c2': cm.color2 } },
      h('div.dt-art', cm.leaderArt),
      h('div.dt-info', h('div.dt-name', dk.name), h('div.dt-cls', `${cm.emoji} ${cm.name}　${dk.cards.length}/${RULES.deckSize}枚`), err ? h('div.dt-err', err) : h('div.dt-key', top.map((id) => h('span.dt-key-card', def(id).art)))),
      active ? h('div.dt-active', '使用中') : null,
      h(
        'div.dt-btns',
        !active && !err ? btn('使う', () => { save.update((s) => (s.activeDeck = dk.id)); toast(`「${dk.name}」を使用デッキにした`, '🃏'); drawDecks(body); }, 'btn-small btn-hot') : null,
        btn('編集', () => openEditor(body, dk.id), 'btn-small'),
        d.decks.length > 1 ? btn('削除', async () => {
          if (!(await confirmModal(`「${dk.name}」を削除する？`, '削除'))) return;
          save.update((s) => {
            s.decks = s.decks.filter((x) => x.id !== dk.id);
            if (s.activeDeck === dk.id) s.activeDeck = s.decks[0]?.id ?? '';
          });
          drawDecks(body);
        }, 'btn-small btn-danger') : null,
      ),
    );
  });
  const add = h('button.deck-add', { type: 'button', onclick: () => newDeck(body) }, h('span', '+'), h('small', '新しいデッキ'));
  body.replaceChildren(h('div.deck-list', list, add));
}

function newDeck(body: HTMLElement): void {
  audio.play('tap');
  const m = modal(
    h(
      'div.cls-grid',
      PLAYABLE_CLASSES.map((c) => {
        const cm = CLASSES[c];
        return h(
          'button.cls-choice',
          {
            type: 'button',
            style: { '--c1': cm.color, '--c2': cm.color2 },
            onclick: () => {
              m.close();
              const dk: DeckSave = { id: `deck_${Date.now().toString(36)}`, name: `${cm.name}デッキ`, cls: c, cards: buildDeck(c, { owned: save.data.collection }) };
              save.update((s) => s.decks.push(dk));
              openEditor(body, dk.id);
            },
          },
          h('span.cc-art', cm.leaderArt),
          h('span.cc-name', cm.name),
          h('span.cc-tag', cm.tag),
        );
      }),
    ),
    { title: 'クラスを選ぶ' },
  );
}

// ------------------------------------------------------------------ editor

function openEditor(body: HTMLElement, deckId: string): void {
  const src = save.data.decks.find((x) => x.id === deckId);
  if (!src) return;
  const work: DeckSave = { ...src, cards: [...src.cards] };
  const cm = CLASSES[work.cls];
  let cost = -1;
  const nameInput = h('input.deck-name', { id: 'deck-name', value: work.name, maxlength: '14', 'aria-label': 'デッキ名' }) as HTMLInputElement;
  nameInput.addEventListener('input', () => (work.name = nameInput.value || work.name));
  const deckList = h('div.ed-deck');
  const curve = h('div.ed-curve');
  const count = h('div.ed-count');
  const pool = h('div.ed-pool');
  const filters = h('div.ed-filters');
  const owned = (id: string) => save.data.collection[id] ?? 0;
  const inDeck = (id: string) => work.cards.filter((x) => x === id).length;

  const drawDeck = () => {
    const groups = new Map<string, number>();
    for (const id of sortDeck(work.cards)) groups.set(id, (groups.get(id) ?? 0) + 1);
    deckList.replaceChildren(
      ...[...groups].map(([id, n]) => {
        const dd = def(id);
        return h(
          `button.ed-row.r-${dd.rarity}`,
          { type: 'button', onclick: () => { audio.play('back'); work.cards.splice(work.cards.indexOf(id), 1); redraw(); } },
          h('span.er-cost', String(dd.cost)),
          h('span.er-art', dd.art),
          h('span.er-name', dd.name),
          h('span.er-n', `×${n}`),
        );
      }),
    );
    const buckets = new Array(8).fill(0);
    for (const id of work.cards) buckets[Math.min(7, def(id).cost)]++;
    const max = Math.max(1, ...buckets);
    curve.replaceChildren(...buckets.map((n, i) => h('div.cv-col', h('div.cv-bar', { style: { height: `${(n / max) * 100}%` } }, n ? h('span', String(n)) : null), h('div.cv-label', i === 7 ? '7+' : String(i)))));
    count.textContent = `${work.cards.length} / ${RULES.deckSize}`;
    count.classList.toggle('ok', work.cards.length === RULES.deckSize);
  };
  const drawPool = () => {
    const cards = collectible()
      .filter((c) => c.cls === work.cls || c.cls === 'neutral')
      .filter((c) => cost < 0 || (cost === 7 ? c.cost >= 7 : c.cost === cost))
      .sort((a, b) => a.cost - b.cost || (a.cls === 'neutral' ? 1 : 0) - (b.cls === 'neutral' ? 1 : 0) || RARITY[a.rarity].order - RARITY[b.rarity].order);
    pool.replaceChildren(
      ...cards.map((c) => {
        const have = owned(c.id);
        const used = inDeck(c.id);
        const el = staticCard(c.id, 'collection', (save.data.prism[c.id] ?? 0) > 0);
        const cell = h(
          `div.pool-cell${have === 0 ? '.unowned' : ''}${used >= Math.min(3, have) ? '.maxed' : ''}`,
          {
            onclick: () => {
              if (have === 0) {
                inspectCard(c.id, () => redraw());
                return;
              }
              if (used >= Math.min(RULES.maxCopies, have)) {
                audio.play('error');
                toast(have < 3 && used >= have ? `所持枚数は${have}枚` : '同じカードは3枚まで', '⚠️');
                return;
              }
              if (work.cards.length >= RULES.deckSize) {
                audio.play('error');
                toast('デッキは30枚まで', '⚠️');
                return;
              }
              audio.play('draw', { pitch: 1.2 });
              work.cards.push(c.id);
              redraw();
            },
          },
          el,
          h('div.pool-own', `${used}/${have}`),
          h('button.pool-info', { type: 'button', 'aria-label': '詳細', onclick: (e: Event) => { e.stopPropagation(); inspectCard(c.id, () => redraw()); } }, 'i'),
        );
        return cell;
      }),
    );
  };
  const redraw = () => {
    drawDeck();
    drawPool();
  };
  const costs = [-1, 1, 2, 3, 4, 5, 6, 7];
  const drawFilters = () =>
    filters.replaceChildren(
      ...costs.map((c) => h(`button.f-chip${cost === c ? '.on' : ''}`, { type: 'button', onclick: () => { cost = c; audio.play('tap'); drawFilters(); drawPool(); } }, c < 0 ? '全' : c === 7 ? '7+' : String(c))),
    );
  drawFilters();
  const saveDeck = () => {
    const err = validateDeck(work.cls, work.cards);
    save.update((s) => {
      const i = s.decks.findIndex((x) => x.id === work.id);
      if (i >= 0) s.decks[i] = { ...work, name: nameInput.value.trim() || work.name, cards: sortDeck(work.cards) };
      if (!err && (!s.activeDeck || s.activeDeck === work.id)) s.activeDeck = work.id;
    });
    if (err) toast(`保存した（${err}）`, '⚠️');
    else {
      toast('デッキを保存した！', '💾');
      particles.burst(stage.w / 2, stage.h / 2, { n: 30, colors: [cm.color, '#fff'], speed: 9, type: 'star' });
    }
    drawDecks(body);
  };
  const tools = h(
    'div.ed-tools',
    btn('おまかせ', () => {
      work.cards = buildDeck(work.cls, { owned: save.data.collection, quality: 0.9 });
      audio.play('reveal');
      redraw();
    }, 'btn-small'),
    btn('クリア', () => {
      work.cards = [];
      redraw();
    }, 'btn-small'),
    btn('保存', saveDeck, 'btn-small btn-hot'),
  );
  body.replaceChildren(
    h(
      'div.editor',
      { style: { '--c1': cm.color, '--c2': cm.color2 } },
      h('div.ed-left', h('div.ed-head', h('span.ed-cls', cm.leaderArt), nameInput, count), curve, deckList, tools),
      h('div.ed-right', filters, pool),
    ),
  );
  redraw();
}

// ------------------------------------------------------------------ collection

let collCls: ClassId | 'all' = 'all';

function drawCollection(body: HTMLElement): void {
  const d = save.data;
  const t = totalOwned(d);
  const classes: (ClassId | 'all')[] = ['all', ...PLAYABLE_CLASSES, 'neutral'];
  const chips = classes.map((c) =>
    h(`button.f-chip${collCls === c ? '.on' : ''}`, { type: 'button', onclick: () => { collCls = c; audio.play('tap'); drawCollection(body); } }, c === 'all' ? '全部' : `${CLASSES[c].emoji}${CLASSES[c].name}`),
  );
  const cards = collectible()
    .filter((c) => collCls === 'all' || c.cls === collCls)
    .sort((a, b) => PLAYABLE_CLASSES.indexOf(a.cls as never) - PLAYABLE_CLASSES.indexOf(b.cls as never) || a.cost - b.cost || RARITY[a.rarity].order - RARITY[b.rarity].order);
  const grid = cards.map((c) => {
    const have = d.collection[c.id] ?? 0;
    const isNew = d.newCards.includes(c.id);
    return h(
      `div.coll-cell${have === 0 ? '.unowned' : ''}`,
      { onclick: () => inspectCard(c.id, () => drawCollection(body)) },
      staticCard(c.id, 'collection', (d.prism[c.id] ?? 0) > 0),
      h('div.pool-own', `×${have}`),
      isNew ? h('div.coll-new', 'NEW') : null,
    );
  });
  body.replaceChildren(
    h('div.coll-head', h('div.coll-rate', `所持率 ${Math.floor((t.have / t.total) * 100)}%（${t.have}/${t.total}）`), h('div.coll-dust', `✨ドパ粉 ${d.dust}`)),
    h('div.ed-filters', chips),
    h('div.coll-grid', grid),
  );
  if (d.newCards.length) save.update((s) => (s.newCards = []));
}

export function inspectCard(id: string, onChange?: () => void): void {
  audio.play('tap');
  const d = def(id);
  const r = RARITY[d.rarity as Rarity];
  const have = () => save.data.collection[id] ?? 0;
  const ownEl = h('div.ic-own');
  const btns = h('div.ic-btns');
  const refresh = () => {
    ownEl.textContent = `所持 ${have()}枚　✨ドパ粉 ${save.data.dust}`;
    btns.replaceChildren(
      btn(`生成 ✨${r.craft}`, () => {
        if (have() >= 3) return toast('もう3枚持っている', '✋');
        if (save.data.dust < r.craft) {
          audio.play('error');
          return toast('ドパ粉が足りない！', '💸');
        }
        save.update((s) => {
          s.dust -= r.craft;
          s.collection[id] = (s.collection[id] ?? 0) + 1;
          s.stats.crafted++;
        });
        audio.play('gachaSR');
        particles.burst(stage.w / 2, stage.h / 2, { n: 50, colors: [r.color, '#fff'], speed: 12, type: 'star' });
        refresh();
        onChange?.();
      }, `btn-small btn-hot${have() >= 3 || save.data.dust < r.craft ? ' disabled' : ''}`),
      btn(`分解 +✨${r.dust}`, async () => {
        if (have() <= 0) return;
        if (!(await confirmModal(`「${d.name}」を1枚分解してドパ粉${r.dust}にする？`, '分解'))) return;
        save.update((s) => {
          s.dust += r.dust;
          s.collection[id] = Math.max(0, (s.collection[id] ?? 0) - 1);
          s.decks = s.decks.map((dk) => {
            const max = s.collection[id] ?? 0;
            const cards = [...dk.cards];
            while (cards.filter((x) => x === id).length > max) cards.splice(cards.indexOf(id), 1);
            return { ...dk, cards };
          });
        });
        audio.play('shatter');
        refresh();
        onChange?.();
      }, `btn-small btn-danger${have() <= 0 ? ' disabled' : ''}`),
    );
  };
  refresh();
  modal(
    h(
      'div.inspect-body',
      h('div.inspect-card', staticCard(id, 'detail', (save.data.prism[id] ?? 0) > 0)),
      h(
        'div.inspect-side',
        h('div.ic-meta', `${CLASSES[d.cls].emoji}${CLASSES[d.cls].name} ／ `, h('span', { style: { color: r.color } }, r.name)),
        h('div.inspect-flavor', d.flavor ?? ''),
        h('div.detail-gloss', glossary(d).map((g) => h('div.gloss', h('b', g.name), h('span', g.desc)))),
        relatedBlock(d),
        ownEl,
        btns,
      ),
    ),
    { cls: 'inspect-modal' },
  );
  fitCardText(stage.overlay);
}
