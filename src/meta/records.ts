import { CARD_POWER, CLASSES, collectible, def, PLAYABLE_CLASSES, SIM_CLASS, type CardDef, type ClassId } from '../engine';
import type { SaveData } from './save';

/** win/loss tally */
export interface Tally {
  g: number;
  w: number;
}

/** what the rankings screen learns from every finished battle */
export interface BattleRecords {
  battles: number;
  /** card id → games in which it was played (by either side) and how many of those that side won */
  cards: Record<string, Tally & { mine: number }>;
  /** NPC leader class → games against you and how many the NPC won */
  npc: Partial<Record<ClassId, Tally>>;
  /** your leader class → games and wins */
  player: Partial<Record<ClassId, Tally>>;
}

export function emptyRecords(): BattleRecords {
  return { battles: 0, cards: {}, npc: {}, player: {} };
}

export interface RecordInput {
  win: boolean;
  draw: boolean;
  playerCls: ClassId;
  enemyCls: ClassId;
  playerPlayed: Record<string, number>;
  enemyPlayed: Record<string, number>;
}

/** add one battle to the records (call inside save.update) */
export function recordBattle(d: SaveData, r: RecordInput): void {
  const rec = d.records;
  const npcWin = !r.win && !r.draw;
  rec.battles++;
  const pc = (rec.player[r.playerCls] ??= { g: 0, w: 0 });
  pc.g++;
  if (r.win) pc.w++;
  const nc = (rec.npc[r.enemyCls] ??= { g: 0, w: 0 });
  nc.g++;
  if (npcWin) nc.w++;
  const add = (ids: Record<string, number>, won: boolean, mine: boolean) => {
    for (const id of Object.keys(ids)) {
      const c = (rec.cards[id] ??= { g: 0, w: 0, mine: 0 });
      c.g++;
      if (won) c.w++;
      if (mine) c.mine++;
    }
  };
  add(r.playerPlayed ?? {}, r.win, true);
  add(r.enemyPlayed ?? {}, npcWin, false);
}

/** win rate pulled toward 50% for small samples, so 1戦1勝 doesn't top the chart */
export function score(t: Tally, prior = 6): number {
  return (t.w + prior / 2) / (t.g + prior);
}

export interface CardRow {
  d: CardDef;
  /** sort key */
  key: number;
  /** raw win rate (battles) */
  rate?: number;
  g?: number;
  mine?: number;
  /** AI sim: win-rate lift in percentage points */
  lift?: number;
}

export function cardRanking(d: SaveData, source: 'battle' | 'sim', cls: ClassId | 'all', minGames: number): CardRow[] {
  const pool = collectible().filter((c) => cls === 'all' || c.cls === cls);
  if (source === 'sim') {
    return pool
      .map((c) => ({ d: c, key: CARD_POWER[c.id] ?? 0, lift: (CARD_POWER[c.id] ?? 0) * 10 }))
      .sort((a, b) => b.key - a.key);
  }
  const out: CardRow[] = [];
  for (const c of pool) {
    const t = d.records.cards[c.id];
    if (!t || t.g < minGames) continue;
    out.push({ d: c, key: score(t), rate: t.w / t.g, g: t.g, mine: t.mine });
  }
  return out.sort((a, b) => b.key - a.key || (b.g ?? 0) - (a.g ?? 0));
}

export interface LeaderRow {
  cls: ClassId;
  key: number;
  g: number;
  w: number;
  rate: number;
}

export function leaderRanking(d: SaveData, source: 'npc' | 'player' | 'sim'): LeaderRow[] {
  const table: Partial<Record<ClassId, Tally>> = source === 'sim' ? SIM_CLASS : source === 'npc' ? d.records.npc : d.records.player;
  const out: LeaderRow[] = [];
  for (const cls of PLAYABLE_CLASSES) {
    const t = table[cls];
    if (!t || !t.g) continue;
    out.push({ cls, key: source === 'sim' ? t.w / t.g : score(t), g: t.g, w: t.w, rate: t.w / t.g });
  }
  return out.sort((a, b) => b.key - a.key || b.g - a.g);
}

export const className = (cls: ClassId) => CLASSES[cls].name;
export const cardName = (id: string) => def(id).name;
