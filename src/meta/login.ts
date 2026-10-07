import { todayKey } from '../ui/dom';
import { grant, type Reward } from './economy';
import type { SaveData } from './save';

export const LOGIN_REWARDS: Reward[] = [
  { coins: 300 },
  { tickets: 1 },
  { coins: 500 },
  { gems: 60 },
  { tickets: 2 },
  { coins: 800 },
  { gems: 200, tickets: 3 },
];

/** claim today's bonus if not yet claimed. Returns the day index (0-6) or -1. */
export function claimLogin(d: SaveData): number {
  const today = todayKey();
  if (d.login.last === today) return -1;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const consecutive = d.login.last === todayKey(y);
  d.login.streak = consecutive ? d.login.streak + 1 : 1;
  d.login.total++;
  d.login.last = today;
  const idx = (d.login.total - 1) % LOGIN_REWARDS.length;
  grant(d, LOGIN_REWARDS[idx]);
  return idx;
}

export interface RouletteSlot {
  label: string;
  icon: string;
  reward: Reward;
  weight: number;
  color: string;
}

export const ROULETTE: RouletteSlot[] = [
  { label: '100', icon: '🪙', reward: { coins: 100 }, weight: 26, color: '#38d6ff' },
  { label: '1', icon: '🎫', reward: { tickets: 1 }, weight: 16, color: '#ff9f43' },
  { label: '300', icon: '🪙', reward: { coins: 300 }, weight: 18, color: '#3dffc5' },
  { label: '30', icon: '💎', reward: { gems: 30 }, weight: 14, color: '#a066ff' },
  { label: '200', icon: '🪙', reward: { coins: 200 }, weight: 18, color: '#ff2e88' },
  { label: '3', icon: '🎫', reward: { tickets: 3 }, weight: 4, color: '#ffe14d' },
  { label: '100', icon: '💎', reward: { gems: 100 }, weight: 3, color: '#ff5fd2' },
  { label: '1000', icon: '🪙', reward: { coins: 1000 }, weight: 1, color: '#ffffff' },
];

export function spinRoulette(): number {
  const total = ROULETTE.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ROULETTE.length; i++) {
    r -= ROULETTE[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}
