import { CLASSES, PLAYABLE_CLASSES } from '../engine';
import type { Reward } from './economy';
import { rankIndex, totalOwned } from './economy';
import type { SaveData } from './save';

export interface AchDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  reward: Reward;
  /** current value and goal */
  check: (d: SaveData) => [number, number];
}

const wins = (n: number, reward: Reward): AchDef => ({
  id: `wins${n}`,
  name: `${n}勝`,
  desc: `通算${n}勝する`,
  icon: n >= 100 ? '🏆' : n >= 30 ? '🥇' : '🎖️',
  reward,
  check: (d) => [d.stats.wins, n],
});

export const ACHIEVEMENTS: AchDef[] = [
  wins(1, { gems: 50 }),
  wins(10, { gems: 100 }),
  wins(30, { gems: 200, tickets: 3 }),
  wins(100, { gems: 500, tickets: 10 }),
  { id: 'combo5', name: 'コンボ職人', desc: '1ターンに5コンボ', icon: '⚡', reward: { gems: 80 }, check: (d) => [d.stats.maxCombo, 5] },
  { id: 'combo8', name: '指が止まらない', desc: '1ターンに8コンボ', icon: '🌀', reward: { gems: 200 }, check: (d) => [d.stats.maxCombo, 8] },
  { id: 'hit10', name: '会心の一撃', desc: '1回で10以上のダメージ', icon: '💥', reward: { gems: 100 }, check: (d) => [d.stats.maxHit, 10] },
  { id: 'super10', name: '超進化マニア', desc: '超進化を通算10回', icon: '🌟', reward: { gems: 120 }, check: (d) => [d.stats.supers, 10] },
  { id: 'fever10', name: 'フィーバー中毒', desc: 'FEVERを通算10回', icon: '🔥', reward: { gems: 120 }, check: (d) => [d.stats.fevers, 10] },
  { id: 'ssr10', name: '神引き', desc: 'バトル中のガチャでSSRを通算10回', icon: '🎰', reward: { gems: 150 }, check: (d) => [d.stats.ssr, 10] },
  { id: 'buzz10', name: 'インフルエンサー', desc: 'バズを通算10回', icon: '📱', reward: { gems: 150 }, check: (d) => [d.stats.buzzes, 10] },
  { id: 'lvup20', name: 'レベル上げ廃人', desc: 'フォロワーのレベルアップを通算20回', icon: '🎮', reward: { gems: 150 }, check: (d) => [d.stats.levelUps, 20] },
  { id: 'kills100', name: '殲滅者', desc: 'フォロワーを通算100体破壊', icon: '☠️', reward: { gems: 150 }, check: (d) => [d.stats.kills, 100] },
  { id: 'overkill50', name: 'やりすぎ', desc: 'オーバーキルを通算50', icon: '🤯', reward: { gems: 100 }, check: (d) => [d.stats.overkill, 50] },
  { id: 'clutch', name: '心臓に悪い', desc: '体力3以下で勝利', icon: '💓', reward: { gems: 100 }, check: (d) => [d.stats.clutchWins, 1] },
  { id: 'speed', name: '秒殺', desc: '7ターン以内に勝利', icon: '⏱️', reward: { gems: 150 }, check: (d) => [d.stats.fastestWin && d.stats.fastestWin <= 7 ? 1 : 0, 1] },
  { id: 'pull100', name: '開ける手が止まらない', desc: 'カードパックを通算30パック開ける', icon: '🎲', reward: { gems: 200 }, check: (d) => [d.stats.packs, 30] },
  { id: 'legend1', name: 'はじめてのレジェンド', desc: 'レジェンドカードを引く', icon: '👑', reward: { gems: 100 }, check: (d) => [d.stats.legendsPulled, 1] },
  { id: 'prism1', name: 'キラキラ', desc: 'プリズムカードを引く', icon: '💠', reward: { gems: 100 }, check: (d) => [d.stats.prismsPulled, 1] },
  {
    id: 'collect50',
    name: 'コレクター',
    desc: 'カード所持率50%',
    icon: '📚',
    reward: { gems: 200 },
    check: (d) => {
      const t = totalOwned(d);
      return [Math.floor((t.have / t.total) * 100), 50];
    },
  },
  {
    id: 'collect100',
    name: 'コンプリート',
    desc: 'カード所持率100%',
    icon: '🌈',
    reward: { gems: 1000 },
    check: (d) => {
      const t = totalOwned(d);
      return [Math.floor((t.have / t.total) * 100), 100];
    },
  },
  { id: 'rankGold', name: 'ゴールド到達', desc: 'ランクマッチでゴールドに到達', icon: '🥇', reward: { gems: 200 }, check: (d) => [rankIndex(d.bestRank), 3] },
  { id: 'rankMaster', name: 'マスター到達', desc: 'ランクマッチでマスターに到達', icon: '👑', reward: { gems: 500, tickets: 5 }, check: (d) => [rankIndex(d.bestRank), 6] },
  { id: 'streak5', name: '5連勝', desc: '5連勝する', icon: '🔥', reward: { gems: 150 }, check: (d) => [d.bestStreak, 5] },
  { id: 'level10', name: 'Lv10', desc: 'プレイヤーレベル10', icon: '⬆️', reward: { gems: 100 }, check: (d) => [d.level, 10] },
  { id: 'level30', name: 'Lv30', desc: 'プレイヤーレベル30', icon: '🚀', reward: { gems: 300 }, check: (d) => [d.level, 30] },
  ...PLAYABLE_CLASSES.map(
    (c): AchDef => ({
      id: `cls_${c}`,
      name: `${CLASSES[c].name}マスター`,
      desc: `${CLASSES[c].name}で10勝`,
      icon: CLASSES[c].emoji,
      reward: { gems: 150 },
      check: (d) => [d.stats.classWins[c] ?? 0, 10],
    }),
  ),
  { id: 'story', name: 'ドパ道 完走', desc: 'ストーリーの最終ステージをクリア', icon: '🏁', reward: { gems: 500, tickets: 5 }, check: (d) => [d.story['final'] ? 1 : 0, 1] },
];

export function achProgress(d: SaveData, a: AchDef): { cur: number; goal: number; done: boolean; claimed: boolean } {
  const [cur, goal] = a.check(d);
  return { cur: Math.min(cur, goal), goal, done: cur >= goal, claimed: !!d.achievements[a.id] };
}

export function claimableAchievements(d: SaveData): number {
  return ACHIEVEMENTS.filter((a) => {
    const p = achProgress(d, a);
    return p.done && !p.claimed;
  }).length;
}

/** achievements newly completed since `before` snapshot of done ids */
export function doneSet(d: SaveData): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => achProgress(d, a).done).map((a) => a.id));
}
