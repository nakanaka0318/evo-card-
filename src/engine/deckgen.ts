import { CARD_POWER } from './cardpower';
import { collectible, def } from './defs';
import { RULES } from './rules';
import type { CardDef, ClassId } from './types';

const RARITY_SCORE = { bronze: 3, silver: 4.5, gold: 6.5, legend: 9 } as const;

/** target number of cards per cost bucket (index = cost, last bucket = 7+) */
const CURVES: Partial<Record<ClassId, number[]>> = {
  swipe: [0, 9, 8, 6, 3, 2, 2, 0],
  sweets: [0, 4, 7, 6, 5, 4, 2, 2],
};
const CURVE = [0, 5, 7, 6, 5, 3, 2, 2];

/** classes whose best-rated cards are mostly spells/amulets still need early bodies */
const MIN_EARLY_FOLLOWERS: Partial<Record<ClassId, number>> = {
  novel: 6,
};

export interface DeckOptions {
  /** limit to owned copies; undefined = unlimited */
  owned?: Record<string, number>;
  rand?: () => number;
  /** 0..1 how strongly to prefer high rarity */
  quality?: number;
  /** extra card ids to prioritise */
  favor?: string[];
  /** NPC decks: weigh simulated card strength (scaled by quality) */
  smart?: boolean;
}

function bucket(cost: number): number {
  return Math.min(7, Math.max(1, cost));
}

export function cardPool(cls: ClassId): CardDef[] {
  return collectible().filter((d) => d.cls === cls || d.cls === 'neutral');
}

export function buildDeck(cls: ClassId, opts: DeckOptions = {}): string[] {
  const rand = opts.rand ?? Math.random;
  const quality = opts.quality ?? 0.8;
  const favor = new Set(opts.favor ?? []);
  const scored = cardPool(cls)
    .map((d) => {
      let sc = 3 + (RARITY_SCORE[d.rarity] - 3) * quality;
      if (d.cls === cls) sc += 2.2;
      if (favor.has(d.id)) sc += 5;
      if (opts.smart) sc += (CARD_POWER[d.id] ?? 0) * 5 * quality;
      sc += rand() * (opts.smart ? 2.5 - 1.5 * quality : 2.5);
      return { d, sc };
    })
    .sort((a, b) => b.sc - a.sc);
  const counts = new Map<string, number>();
  const avail = (id: string) => {
    const cap = opts.owned ? Math.min(RULES.maxCopies, opts.owned[id] ?? 0) : RULES.maxCopies;
    return cap - (counts.get(id) ?? 0);
  };
  const deck: string[] = [];
  const add = (id: string, n: number) => {
    for (let i = 0; i < n && deck.length < RULES.deckSize; i++) {
      if (avail(id) <= 0) return;
      deck.push(id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  };
  // pass 1: fill the curve
  const perBucket = new Array(8).fill(0);
  const curve = CURVES[cls] ?? CURVE;
  for (const { d } of scored) {
    const b = bucket(d.cost);
    const want = curve[b] - perBucket[b];
    if (want <= 0) continue;
    const before = deck.length;
    add(d.id, Math.min(want, d.rarity === 'legend' ? 2 : 3));
    perBucket[b] += deck.length - before;
  }
  // pass 2: fill remaining slots with best cards regardless of curve
  for (const { d } of scored) {
    if (deck.length >= RULES.deckSize) break;
    add(d.id, 3);
  }
  // pass 3: swap the weakest cheap non-followers for the best cheap followers
  const minEarly = MIN_EARLY_FOLLOWERS[cls] ?? 0;
  const early = (d: CardDef) => d.type === 'follower' && d.cost <= 3;
  const rank = new Map(scored.map((x, i) => [x.d.id, i]));
  let have = deck.filter((id) => early(def(id))).length;
  for (const { d } of scored) {
    if (have >= minEarly) break;
    if (!early(d)) continue;
    while (have < minEarly && avail(d.id) > 0) {
      let worst = -1;
      for (let i = 0; i < deck.length; i++) {
        const x = def(deck[i]);
        if (early(x) || x.cost > 3) continue;
        if (worst < 0 || (rank.get(deck[i]) ?? 0) > (rank.get(deck[worst]) ?? 0)) worst = i;
      }
      if (worst < 0) break;
      counts.set(deck[worst], (counts.get(deck[worst]) ?? 1) - 1);
      deck[worst] = d.id;
      counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
      have++;
    }
  }
  return sortDeck(deck);
}

export function sortDeck(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const da = def(a);
    const db = def(b);
    return da.cost - db.cost || (da.cls === 'neutral' ? 1 : 0) - (db.cls === 'neutral' ? 1 : 0) || da.id.localeCompare(db.id);
  });
}

export function deckClassOk(cls: ClassId, ids: string[]): boolean {
  return ids.every((id) => {
    const c = def(id).cls;
    return c === cls || c === 'neutral';
  });
}

export function validateDeck(cls: ClassId, ids: string[]): string | null {
  if (ids.length !== RULES.deckSize) return `デッキは${RULES.deckSize}枚ちょうどにしよう（いま${ids.length}枚）`;
  if (!deckClassOk(cls, ids)) return '他のクラスのカードが入っています';
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) if (n > RULES.maxCopies) return `「${def(id).name}」は${RULES.maxCopies}枚までです`;
  return null;
}
