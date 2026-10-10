import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, hasDef, KEYWORDS, type ClassId, type Keyword } from '../../engine';
import { PATCHES, type CardSnap, type ChangeKind, type Patch, type PatchChange } from '../../meta/history';
import { save } from '../../meta/save';
import { bottomNav, topBar } from '../common';
import { formatText } from '../cardview';
import { h } from '../dom';
import { go, type ScreenFn } from '../router';
import { inspectCard } from './decks';

const KIND: Record<ChangeKind, { label: string; icon: string }> = {
  buff: { label: 'アッパー', icon: '⬆️' },
  nerf: { label: 'ナーフ', icon: '⬇️' },
  rework: { label: 'リワーク', icon: '🔄' },
  adjust: { label: '調整', icon: '🔧' },
};

type Filter = ChangeKind | 'all';

/** カード歴史: every patch's buffs, nerfs and reworks with before → after */
export const historyScreen: ScreenFn = (root, params) => {
  music.play('home');
  save.update((d) => (d.flags[`seenPatch_${PATCHES[0].id}`] = true));
  const tb = topBar({ back: () => void go(typeof params.back === 'string' ? params.back : 'home'), title: 'カード歴史' });
  const body = h('div.hs-body');
  root.append(tb.el, body, bottomNav('home'));
  let filter: Filter = 'all';
  let cls: ClassId | 'all' = 'all';
  let query = '';
  const open = new Set<string>([PATCHES[0].id]);

  const draw = () => {
    const kinds: Filter[] = ['all', 'buff', 'nerf', 'rework', 'adjust'];
    const counts = { buff: 0, nerf: 0, rework: 0, adjust: 0 } as Record<ChangeKind, number>;
    for (const p of PATCHES) for (const c of p.changes) counts[c.kind]++;
    const search = h('input.hs-search', {
      type: 'search',
      placeholder: 'カード名でさがす',
      value: query,
      oninput: (e: Event) => {
        query = (e.target as HTMLInputElement).value.trim();
        drawList();
      },
    }) as HTMLInputElement;
    const chips = h(
      'div.hs-kinds',
      kinds.map((k) =>
        h(
          `button.f-chip${filter === k ? '.on' : ''}${k !== 'all' ? `.hk-${k}` : ''}`,
          { type: 'button', onclick: () => { filter = k; audio.play('tap'); draw(); } },
          k === 'all' ? 'すべて' : `${KIND[k].icon}${KIND[k].label} ${counts[k]}`,
        ),
      ),
    );
    const clsRow = h(
      'div.rk-filter',
      h(`button.f-chip${cls === 'all' ? '.on' : ''}`, { type: 'button', onclick: () => { cls = 'all'; audio.play('tap'); draw(); } }, '全クラス'),
      ...(Object.keys(CLASSES) as ClassId[]).map((c) =>
        h(`button.f-chip${cls === c ? '.on' : ''}`, { type: 'button', onclick: () => { cls = c; audio.play('tap'); draw(); } }, `${CLASSES[c].emoji}${CLASSES[c].name}`),
      ),
    );
    const list = h('div.hs-list');
    const drawList = () => list.replaceChildren(...patchList());
    body.replaceChildren(h('div.hs-intro', 'これまでのカード調整の記録です。新しい順。カードをタップすると今の性能が見られます。'), h('div.hs-tools', search, chips), clsRow, list);
    drawList();
    // keep focus while typing
    if (query) {
      search.focus();
      search.setSelectionRange(query.length, query.length);
    }
  };

  const matches = (c: PatchChange) => (filter === 'all' || c.kind === filter) && (cls === 'all' || c.cls === cls) && (!query || c.name.includes(query));

  const patchList = (): HTMLElement[] => {
    const narrowing = filter !== 'all' || cls !== 'all' || !!query;
    const out: HTMLElement[] = [];
    for (const p of PATCHES) {
      const changes = p.changes.filter(matches);
      const added = filter === 'all' ? p.added.filter((a) => (cls === 'all' || a.cls === cls) && (!query || a.name.includes(query))) : [];
      const rules = filter === 'all' && cls === 'all' && !query ? p.rules : [];
      if (narrowing && !changes.length && !added.length && !rules.length) continue;
      out.push(patchCard(p, changes, added, rules, narrowing || open.has(p.id), () => {
        if (open.has(p.id)) open.delete(p.id);
        else open.add(p.id);
        audio.play('tap');
        draw();
      }));
    }
    if (!out.length) out.push(h('div.rk-empty', h('div.rk-empty-icon', '🔍'), h('div', '条件に合う調整はありません')));
    return out;
  };

  draw();
  return () => tb.dispose();
};

function patchCard(p: Patch, changes: PatchChange[], added: Patch['added'], rules: string[], expanded: boolean, toggle: () => void): HTMLElement {
  const tally = (k: ChangeKind) => changes.filter((c) => c.kind === k).length;
  const badges = (['buff', 'nerf', 'rework', 'adjust'] as ChangeKind[])
    .filter((k) => tally(k))
    .map((k) => h(`span.hs-badge.hk-${k}`, `${KIND[k].icon}${tally(k)}`));
  if (added.length) badges.push(h('span.hs-badge.hk-new', `✨新カード${added.length}`));
  if (rules.length) badges.push(h('span.hs-badge.hk-rule', '📜ルール'));
  return h(
    `section.hs-patch${expanded ? '.open' : ''}`,
    h(
      'button.hs-head',
      { type: 'button', onclick: toggle },
      h('div.hs-date', p.date.replace(/-/g, '.')),
      h('div.hs-title', p.title),
      h('div.hs-badges', badges),
      h('span.hs-caret', expanded ? '▲' : '▼'),
    ),
    expanded
      ? h(
          'div.hs-content',
          h('p.hs-summary', p.summary),
          rules.length ? h('ul.hs-rules', rules.map((r) => h('li', r))) : null,
          changes.length ? h('div.hs-changes', changes.map(changeCard)) : null,
          added.length ? addedBlock(added) : null,
        )
      : null,
  );
}

function statLine(s: CardSnap, other: CardSnap): HTMLElement {
  const cell = (label: string, v: number | undefined, o: number | undefined, lowerIsBetter = false) => {
    if (v === undefined) return null;
    const diff = o === undefined || v === o ? '' : (v > o) !== lowerIsBetter ? '.up' : '.down';
    return h(`span.hs-stat${diff}`, h('small', label), String(v));
  };
  return h(
    'div.hs-stats',
    cell('コスト', s.cost, other.cost, true),
    cell('攻撃', s.atk, other.atk),
    cell('体力', s.hp, other.hp),
    s.countdown ? cell('CD', s.countdown, other.countdown, true) : null,
  );
}

function kwLine(s: CardSnap): string {
  return (s.kw ?? []).map((k) => KEYWORDS[k as Keyword]?.name ?? k).join('・');
}

function snapBox(label: string, s: CardSnap, other: CardSnap, cls: string): HTMLElement {
  const text = h('div.hs-text');
  text.innerHTML = s.text ? formatText(s.text) : '<span class="hs-vanilla">（効果なし）</span>';
  const kws = kwLine(s);
  return h(`div.hs-snap.${cls}`, h('div.hs-snap-label', label), statLine(s, other), kws && !s.text.includes('《') ? h('div.hs-kw', kws) : null, text);
}

function changeCard(c: PatchChange): HTMLElement {
  const cm = CLASSES[c.cls];
  const live = hasDef(c.id);
  return h(
    `div.hs-change.hk-${c.kind}`,
    { style: { '--c1': cm.color, '--c2': cm.color2 } },
    h(
      'button.hs-change-head',
      { type: 'button', disabled: !live, onclick: () => live && inspectCard(c.id) },
      h(`span.hs-kind.hk-${c.kind}`, `${KIND[c.kind].icon} ${KIND[c.kind].label}`),
      h('b.hs-name', c.name),
      h('span.hs-cls', `${cm.emoji}${cm.name}`),
      live ? h('span.hs-look', '今の性能 ›') : null,
    ),
    h('div.hs-ba', snapBox('変更前', c.before, c.after, 'before'), h('div.hs-arrow', '➜'), snapBox('変更後', c.after, c.before, 'after')),
  );
}

function addedBlock(added: Patch['added']): HTMLElement {
  const byCls = new Map<ClassId, string[]>();
  for (const a of added) {
    const list = byCls.get(a.cls) ?? [];
    list.push(a.name);
    byCls.set(a.cls, list);
  }
  return h(
    'div.hs-added',
    h('div.hs-added-head', `✨ 新カード ${added.length}枚`),
    ...[...byCls].map(([cls, names]) =>
      h('div.hs-added-row', h('span.hs-cls', `${CLASSES[cls].emoji}${CLASSES[cls].name}`), h('span.hs-added-names', names.join('、'))),
    ),
  );
}
