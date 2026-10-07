import { buildDeck, CLASSES, collectible, PLAYABLE_CLASSES, type ClassId, type Difficulty, type PlayerStats } from '../engine';
import type { BattleResult } from '../ui/battle/battle';
import { save, type SaveData } from './save';

// ------------------------------------------------------------------ levels

export function xpForLevel(level: number): number {
  return 120 + (level - 1) * 40;
}

export interface Reward {
  coins?: number;
  gems?: number;
  tickets?: number;
  dust?: number;
}

export function levelReward(level: number): Reward {
  if (level % 10 === 0) return { gems: 300, tickets: 5, coins: 1000 };
  if (level % 5 === 0) return { gems: 120, tickets: 3 };
  if (level % 2 === 0) return { coins: 300, tickets: 1 };
  return { coins: 250 };
}

export function grant(d: SaveData, r: Reward): void {
  d.coins += r.coins ?? 0;
  d.gems += r.gems ?? 0;
  d.tickets += r.tickets ?? 0;
  d.dust += r.dust ?? 0;
}

export function rewardText(r: Reward): string {
  const out: string[] = [];
  if (r.coins) out.push(`🪙${r.coins}`);
  if (r.gems) out.push(`💎${r.gems}`);
  if (r.tickets) out.push(`🎫${r.tickets}`);
  if (r.dust) out.push(`✨${r.dust}`);
  return out.join(' ');
}

/** add xp, returning each level gained with its reward */
export function addXp(d: SaveData, xp: number): { level: number; reward: Reward }[] {
  const ups: { level: number; reward: Reward }[] = [];
  d.xp += xp;
  while (d.xp >= xpForLevel(d.level)) {
    d.xp -= xpForLevel(d.level);
    d.level++;
    const r = levelReward(d.level);
    grant(d, r);
    ups.push({ level: d.level, reward: r });
  }
  return ups;
}

// ------------------------------------------------------------------ ranks

export interface RankTier {
  name: string;
  min: number;
  emblem: string;
  color: string;
  diff: Difficulty;
}

export const RANKS: RankTier[] = [
  { name: 'ビギナー', min: 0, emblem: '🌱', color: '#7ff0c8', diff: 'easy' },
  { name: 'ブロンズ', min: 300, emblem: '🥉', color: '#d08a4e', diff: 'normal' },
  { name: 'シルバー', min: 800, emblem: '🥈', color: '#cfd8e8', diff: 'normal' },
  { name: 'ゴールド', min: 1500, emblem: '🥇', color: '#ffd23f', diff: 'hard' },
  { name: 'プラチナ', min: 2500, emblem: '💠', color: '#7fe7ff', diff: 'hard' },
  { name: 'ダイヤ', min: 3800, emblem: '💎', color: '#9bb8ff', diff: 'oni' },
  { name: 'マスター', min: 5500, emblem: '👑', color: '#ff5fd2', diff: 'oni' },
  { name: 'ドパマスター', min: 8000, emblem: '🌌', color: '#ffe14d', diff: 'oni' },
];

export function rankIndex(points: number): number {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (points >= RANKS[k].min) i = k;
  return i;
}

export function rankInfo(points: number) {
  const i = rankIndex(points);
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  const pct = next ? (points - cur.min) / (next.min - cur.min) : 1;
  return { i, cur, next, pct };
}

// ------------------------------------------------------------------ scoring

export interface ScoreLine {
  label: string;
  value: number;
  detail: string;
}

export interface Score {
  lines: ScoreLine[];
  total: number;
  grade: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';
}

export function scoreBattle(r: BattleResult): Score {
  const st: PlayerStats = r.stats;
  const lines: ScoreLine[] = [
    { label: '与ダメージ', value: st.dmgDealt * 10, detail: `${st.dmgDealt} × 10` },
    { label: '撃破', value: st.kills * 60, detail: `${st.kills}体 × 60` },
    { label: '最大コンボ', value: st.maxCombo * st.maxCombo * 25, detail: `${st.maxCombo}² × 25` },
    { label: '進化', value: st.evolves * 100 + st.supers * 250, detail: `進化${st.evolves} 超進化${st.supers}` },
    { label: 'FEVER', value: st.fevers * 300, detail: `${st.fevers}回 × 300` },
    { label: 'オーバーキル', value: st.overkill * 30, detail: `${st.overkill} × 30` },
    { label: '最大ヒット', value: st.maxHit * 40, detail: `${st.maxHit} × 40` },
  ];
  if (st.ssr) lines.push({ label: 'SSR', value: st.ssr * 200, detail: `${st.ssr}回 × 200` });
  if (st.buzzes) lines.push({ label: 'バズ', value: st.buzzes * 200, detail: `${st.buzzes}回 × 200` });
  if (st.levelUps) lines.push({ label: 'レベルアップ', value: st.levelUps * 80, detail: `${st.levelUps}回 × 80` });
  if (r.win) {
    lines.push({ label: '勝利ボーナス', value: 2000, detail: 'WIN!' });
    lines.push({ label: '残り体力', value: r.hpLeft * 60, detail: `${r.hpLeft} × 60` });
    const speed = Math.max(0, 12 - r.turns) * 200;
    if (speed) lines.push({ label: 'スピード', value: speed, detail: `${r.turns}ターンで決着` });
    if (r.hpLeft <= 3) lines.push({ label: 'ギリギリ勝利', value: 800, detail: '心臓に悪い！' });
  }
  const total = lines.reduce((a, l) => a + l.value, 0);
  const grade = total >= 9000 ? 'SSS' : total >= 7000 ? 'SS' : total >= 5000 ? 'S' : total >= 3200 ? 'A' : total >= 1600 ? 'B' : 'C';
  return { lines: lines.filter((l) => l.value > 0), total, grade };
}

export const GRADE_BONUS: Record<Score['grade'], number> = { SSS: 200, SS: 140, S: 90, A: 50, B: 20, C: 0 };

export interface BattleRewards {
  coins: number;
  xp: number;
  rankDelta: number;
  streakBonus: number;
}

export function battleRewards(r: BattleResult, score: Score, streak: number): BattleRewards {
  const mode = r.config.mode;
  const base = r.win ? 110 : r.draw ? 50 : 40;
  const streakBonus = r.win ? Math.min(100, Math.max(0, streak - 1) * 20) : 0;
  const coins = base + GRADE_BONUS[score.grade] + streakBonus + (mode === 'free' ? -20 : 0);
  const xp = Math.round(40 + score.total / 30);
  let rankDelta = 0;
  if (mode === 'rank') {
    if (r.win) rankDelta = 100 + Math.min(60, Math.max(0, streak - 1) * 15) + (score.grade.startsWith('S') ? 20 : 0);
    else if (!r.draw) rankDelta = rankIndex(save.data.rankPoints) === 0 ? 0 : -40;
  }
  return { coins: Math.max(20, coins), xp, rankDelta, streakBonus };
}

// ------------------------------------------------------------------ starter content

export function grantStarter(d: SaveData): void {
  for (const c of collectible()) {
    if (c.rarity === 'bronze') d.collection[c.id] = 3;
    else if (c.rarity === 'silver') d.collection[c.id] = 2;
  }
  d.decks = PLAYABLE_CLASSES.map((cls) => starterDeck(cls, d));
}

export function starterDeck(cls: ClassId, d: SaveData, name?: string) {
  let seed = cls.length * 977;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return {
    id: `deck_${cls}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    name: name ?? `${CLASSES[cls].name}スターター`,
    cls,
    cards: buildDeck(cls, { owned: d.collection, rand, quality: 0.6 }),
  };
}

export function totalOwned(d: SaveData): { have: number; total: number } {
  let have = 0;
  let total = 0;
  for (const c of collectible()) {
    total += 3;
    have += Math.min(3, d.collection[c.id] ?? 0);
  }
  return { have, total };
}
