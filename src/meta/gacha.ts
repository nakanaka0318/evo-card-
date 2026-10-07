import { collectible, PLAYABLE_CLASSES, RARITY, type CardDef, type ClassId, type Rarity } from '../engine';
import { todayKey } from '../ui/dom';
import type { SaveData } from './save';

export const PULL_COST = { coin1: 100, coin10: 900, gem10: 300, gem1: 30 };
export const PITY = 80;
export const RATES: Record<Rarity, number> = { legend: 0.03, gold: 0.09, silver: 0.28, bronze: 0.6 };
export const PRISM_RATE = 0.06;

export interface PullResult {
  id: string;
  rarity: Rarity;
  prism: boolean;
  isNew: boolean;
  /** dust gained because copies > 3 */
  dust: number;
  pickup: boolean;
}

/** today's pickup class (rotates daily) */
export function pickupClass(day = todayKey()): ClassId {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PLAYABLE_CLASSES[h % PLAYABLE_CLASSES.length];
}

function pickCard(rarity: Rarity, pickup: ClassId, rand: () => number): CardDef {
  const pool = collectible().filter((c) => c.rarity === rarity);
  // pickup: 35% of draws come from the featured class
  const featured = pool.filter((c) => c.cls === pickup);
  if (featured.length && rand() < 0.35) return featured[Math.floor(rand() * featured.length)];
  return pool[Math.floor(rand() * pool.length)];
}

export function pull(d: SaveData, n: number, rand: () => number = Math.random): PullResult[] {
  const pickup = pickupClass();
  const out: PullResult[] = [];
  for (let i = 0; i < n; i++) {
    d.pity++;
    const last = n >= 10 && i === n - 1;
    let rarity: Rarity;
    if (d.pity >= PITY) rarity = 'legend';
    else {
      const r = rand();
      if (r < RATES.legend) rarity = 'legend';
      else if (r < RATES.legend + RATES.gold) rarity = 'gold';
      else if (last) rarity = 'gold';
      else if (r < RATES.legend + RATES.gold + RATES.silver) rarity = 'silver';
      else rarity = 'bronze';
    }
    if (rarity === 'legend') d.pity = 0;
    const c = pickCard(rarity, pickup, rand);
    const prism = rand() < PRISM_RATE;
    const had = d.collection[c.id] ?? 0;
    let dust = 0;
    if (had >= 3) dust = RARITY[rarity].dust;
    else d.collection[c.id] = had + 1;
    if (prism) d.prism[c.id] = (d.prism[c.id] ?? 0) + 1;
    d.dust += dust;
    if (had === 0 && !d.newCards.includes(c.id)) d.newCards.push(c.id);
    d.stats.pulls++;
    if (rarity === 'legend') d.stats.legendsPulled++;
    if (prism) d.stats.prismsPulled++;
    out.push({ id: c.id, rarity, prism, isNew: had === 0, dust, pickup: c.cls === pickup });
  }
  return out;
}

