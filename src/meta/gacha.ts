import { collectible, PLAYABLE_CLASSES, RARITY, type CardDef, type ClassId, type Rarity } from '../engine';
import { todayKey } from '../ui/dom';
import type { SaveData } from './save';

/** cards per pack */
export const PACK_SIZE = 8;
/** prices are per pack */
export const PACK_COST = { coin1: 200, coin10: 1800, gem10: 500 };
/** a legend is guaranteed in at most this many packs (天井) */
export const PITY = 10;
/** first-time gift */
export const FIRST_PACKS = 5;
export const RATES: Record<Rarity, number> = { legend: 0.02, gold: 0.08, silver: 0.25, bronze: 0.65 };
export const PRISM_RATE = 0.05;

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

function rollRarity(rand: () => number, floor: Rarity): Rarity {
  const r = rand();
  if (r < RATES.legend) return 'legend';
  if (r < RATES.legend + RATES.gold) return 'gold';
  if (floor === 'gold') return 'gold';
  if (r < RATES.legend + RATES.gold + RATES.silver) return 'silver';
  return floor === 'silver' ? 'silver' : 'bronze';
}

/** saves from the per-card era counted pity in cards; convert once */
function migratePity(d: SaveData): void {
  if (d.flags.packPity) return;
  d.pity = Math.min(PITY - 1, Math.floor(d.pity / PACK_SIZE));
  d.flags.packPity = true;
}

export function packsLeftToPity(d: SaveData): number {
  migratePity(d);
  return PITY - d.pity;
}

/**
 * Open `packs` packs of PACK_SIZE cards. The 8th card of every pack is silver
 * or better; in a 10-pack purchase (`bulk`) the last pack's 8th card is gold or
 * better; the PITY-th pack without a legend turns its 8th card into a legend.
 */
export function openPacks(d: SaveData, packs: number, rand: () => number = Math.random, bulk = false): PullResult[][] {
  migratePity(d);
  const pickup = pickupClass();
  const out: PullResult[][] = [];
  for (let p = 0; p < packs; p++) {
    d.pity++;
    const cards: PullResult[] = [];
    let gotLegend = false;
    for (let i = 0; i < PACK_SIZE; i++) {
      const last = i === PACK_SIZE - 1;
      let rarity: Rarity;
      if (last && !gotLegend && d.pity >= PITY) rarity = 'legend';
      else rarity = rollRarity(rand, last ? (bulk && p === packs - 1 ? 'gold' : 'silver') : 'bronze');
      if (rarity === 'legend') gotLegend = true;
      cards.push(take(d, rarity, pickup, rand));
    }
    if (gotLegend) d.pity = 0;
    d.stats.packs++;
    out.push(cards);
  }
  return out;
}

function take(d: SaveData, rarity: Rarity, pickup: ClassId, rand: () => number): PullResult {
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
  return { id: c.id, rarity, prism, isNew: had === 0, dust, pickup: c.cls === pickup };
}
