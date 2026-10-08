import { describe, expect, it } from 'vitest';
import { RARITY } from '../src/engine';
import { openPacks, PACK_SIZE, PITY } from '../src/meta/gacha';
import { newSave } from '../src/meta/save';

const order = (r: keyof typeof RARITY) => RARITY[r].order;

/** deterministic rand */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('card packs', () => {
  it('a pack holds 8 cards and the 8th is silver or better', () => {
    const d = newSave();
    const packs = openPacks(d, 200, lcg(7));
    expect(packs).toHaveLength(200);
    for (const p of packs) {
      expect(p).toHaveLength(PACK_SIZE);
      expect(order(p[PACK_SIZE - 1].rarity)).toBeGreaterThanOrEqual(order('silver'));
    }
    expect(d.stats.packs).toBe(200);
    expect(d.stats.pulls).toBe(200 * PACK_SIZE);
  });

  it('a 10-pack buy has gold or better in the last pack', () => {
    for (let seed = 1; seed < 40; seed++) {
      const d = newSave();
      const packs = openPacks(d, 10, lcg(seed), true);
      expect(order(packs[9][PACK_SIZE - 1].rarity)).toBeGreaterThanOrEqual(order('gold'));
    }
  });

  it('never goes more than PITY packs without a legend', () => {
    const d = newSave();
    // a rand that never rolls legend on its own
    const packs = openPacks(d, PITY * 3, () => 0.99);
    packs.forEach((p, i) => {
      const hasLegend = p.some((c) => c.rarity === 'legend');
      expect(hasLegend).toBe((i + 1) % PITY === 0);
    });
  });

  it('old per-card pity converts to packs once', () => {
    const d = newSave();
    d.pity = 79;
    openPacks(d, 1, () => 0.99);
    expect(d.flags.packPity).toBe(true);
    expect(d.pity).toBeLessThanOrEqual(PITY);
  });
});
