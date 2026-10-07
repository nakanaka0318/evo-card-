import { CLASSES, PLAYABLE_CLASSES, type ClassId } from '../engine';
import type { BattleResult } from '../ui/battle/battle';
import { todayKey } from '../ui/dom';
import type { Reward } from './economy';
import type { MissionState, SaveData } from './save';

export interface MissionDef {
  id: string;
  text: string;
  goal: number;
  reward: Reward;
  xp: number;
  /** progress from one battle */
  battle?: (r: BattleResult) => number;
  /** progress from gacha pulls */
  pulls?: boolean;
}

const classWin = (cls: ClassId): MissionDef => ({
  id: `win_${cls}`,
  text: `${CLASSES[cls].name}クラスで1勝する`,
  goal: 1,
  reward: { coins: 200 },
  xp: 120,
  battle: (r) => (r.win && r.config.playerCls === cls ? 1 : 0),
});

export const MISSIONS: MissionDef[] = [
  { id: 'win1', text: 'バトルで1勝する', goal: 1, reward: { coins: 150 }, xp: 100, battle: (r) => (r.win ? 1 : 0) },
  { id: 'win3', text: 'バトルで3勝する', goal: 3, reward: { coins: 300, tickets: 1 }, xp: 200, battle: (r) => (r.win ? 1 : 0) },
  { id: 'play20', text: 'カードを20枚プレイする', goal: 20, reward: { coins: 150 }, xp: 100, battle: (r) => r.stats.cardsPlayed },
  { id: 'kill10', text: '相手のフォロワーを10体破壊する', goal: 10, reward: { coins: 150 }, xp: 100, battle: (r) => r.stats.kills },
  { id: 'evo3', text: '進化を3回する', goal: 3, reward: { coins: 150 }, xp: 100, battle: (r) => r.stats.evolves + r.stats.supers },
  { id: 'super1', text: '超進化を1回する', goal: 1, reward: { coins: 150, gems: 20 }, xp: 100, battle: (r) => r.stats.supers },
  { id: 'face30', text: '相手リーダーに合計30ダメージ', goal: 30, reward: { coins: 150 }, xp: 100, battle: (r) => r.stats.leaderDmg },
  { id: 'fever1', text: 'FEVERを発動する', goal: 1, reward: { coins: 150, gems: 20 }, xp: 100, battle: (r) => r.stats.fevers },
  { id: 'combo4', text: '1ターンに4コンボする', goal: 1, reward: { coins: 200 }, xp: 120, battle: (r) => (r.stats.maxCombo >= 4 ? 1 : 0) },
  { id: 'hit6', text: '1回で6以上のダメージを与える', goal: 1, reward: { coins: 150 }, xp: 100, battle: (r) => (r.stats.maxHit >= 6 ? 1 : 0) },
  { id: 'pull5', text: 'ガチャを5回引く', goal: 5, reward: { coins: 200 }, xp: 80, pulls: true },
  { id: 'overkill5', text: 'オーバーキルを合計5', goal: 5, reward: { coins: 150 }, xp: 100, battle: (r) => r.stats.overkill },
  { id: 'gradeS', text: 'スコアSランク以上で勝つ', goal: 1, reward: { coins: 250, gems: 30 }, xp: 150 },
  ...PLAYABLE_CLASSES.map(classWin),
];

export function missionDef(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

function pickMissions(exclude: string[] = []): MissionState[] {
  const pool = MISSIONS.filter((m) => !exclude.includes(m.id));
  const out: MissionState[] = [];
  const used = new Set<string>();
  while (out.length < 3 && used.size < pool.length) {
    const m = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(m.id)) continue;
    used.add(m.id);
    out.push({ id: m.id, progress: 0, claimed: false });
  }
  return out;
}

/** returns true when a new day's missions were rolled */
export function refreshMissions(d: SaveData): boolean {
  const day = todayKey();
  if (d.missions.day === day && d.missions.list.length) return false;
  d.missions = { day, list: pickMissions(), rerolled: false };
  return true;
}

export function rerollMission(d: SaveData, idx: number): boolean {
  if (d.missions.rerolled) return false;
  const cur = d.missions.list[idx];
  if (!cur || cur.claimed) return false;
  const [fresh] = pickMissions(d.missions.list.map((m) => m.id));
  if (!fresh) return false;
  d.missions.list[idx] = fresh;
  d.missions.rerolled = true;
  return true;
}

/** apply a battle; returns missions that just completed */
export function progressBattle(d: SaveData, r: BattleResult, grade: string): MissionDef[] {
  const done: MissionDef[] = [];
  for (const m of d.missions.list) {
    const def = missionDef(m.id);
    if (!def || m.claimed || m.progress >= def.goal) continue;
    let add = def.battle ? def.battle(r) : 0;
    if (def.id === 'gradeS' && r.win && grade.startsWith('S')) add = 1;
    if (add <= 0) continue;
    m.progress = Math.min(def.goal, m.progress + add);
    if (m.progress >= def.goal) done.push(def);
  }
  return done;
}

export function progressPulls(d: SaveData, n: number): MissionDef[] {
  const done: MissionDef[] = [];
  for (const m of d.missions.list) {
    const def = missionDef(m.id);
    if (!def?.pulls || m.claimed || m.progress >= def.goal) continue;
    m.progress = Math.min(def.goal, m.progress + n);
    if (m.progress >= def.goal) done.push(def);
  }
  return done;
}

export function claimableMissions(d: SaveData): number {
  return d.missions.list.filter((m) => {
    const def = missionDef(m.id);
    return def && !m.claimed && m.progress >= def.goal;
  }).length;
}
