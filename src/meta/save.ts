import type { ClassId } from '../engine';
import { emptyRecords, type BattleRecords } from './records';

export interface DeckSave {
  id: string;
  name: string;
  cls: ClassId;
  cards: string[];
}

export interface MissionState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface Settings {
  sfx: number;
  bgm: number;
  speed: number;
  /** ドパ度: 0 = 控えめ, 1 = 普通, 2 = MAX */
  intensity: number;
  flashReduce: boolean;
  vibrate: boolean;
  hints: boolean;
  autoEnd: boolean;
  /** 動作モード: 0 = サクサク, 1 = バランス, 2 = キラキラ */
  perf: 0 | 1 | 2;
}

export interface LifetimeStats {
  games: number;
  wins: number;
  losses: number;
  kills: number;
  damage: number;
  maxHit: number;
  maxCombo: number;
  evolves: number;
  supers: number;
  fevers: number;
  ssr: number;
  pulls: number;
  /** packs opened */
  packs: number;
  legendsPulled: number;
  prismsPulled: number;
  levelUps: number;
  buzzes: number;
  fastestWin: number;
  classWins: Partial<Record<ClassId, number>>;
  clutchWins: number;
  overkill: number;
  crafted: number;
}

export interface SaveData {
  v: 1;
  created: number;
  updated: number;
  name: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  dust: number;
  tickets: number;
  collection: Record<string, number>;
  prism: Record<string, number>;
  newCards: string[];
  decks: DeckSave[];
  activeDeck: string;
  rankPoints: number;
  bestRank: number;
  story: Record<string, number>;
  missions: { day: string; list: MissionState[]; rerolled: boolean };
  login: { last: string; streak: number; total: number };
  achievements: Record<string, boolean>;
  stats: LifetimeStats;
  settings: Settings;
  pity: number;
  freePull: string;
  roulette: string;
  winStreak: number;
  bestStreak: number;
  flags: Record<string, boolean>;
  highScore: number;
  favoriteClass: ClassId;
  firstWinDay: string;
  /** per-card / per-leader results for the rankings screen */
  records: BattleRecords;
}

export function defaultSettings(): Settings {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const touch = typeof window !== 'undefined' && (!!window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
  return {
    sfx: 0.8,
    bgm: 0.5,
    speed: 1,
    intensity: reduce ? 0 : 2,
    flashReduce: !!reduce,
    vibrate: true,
    hints: true,
    autoEnd: false,
    perf: touch ? 1 : 2,
  };
}

export function emptyStats(): LifetimeStats {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    kills: 0,
    damage: 0,
    maxHit: 0,
    maxCombo: 0,
    evolves: 0,
    supers: 0,
    fevers: 0,
    ssr: 0,
    pulls: 0,
    packs: 0,
    legendsPulled: 0,
    prismsPulled: 0,
    levelUps: 0,
    buzzes: 0,
    fastestWin: 0,
    classWins: {},
    clutchWins: 0,
    overkill: 0,
    crafted: 0,
  };
}

export function newSave(): SaveData {
  const now = Date.now();
  return {
    v: 1,
    created: now,
    updated: now,
    name: 'ドパ民',
    level: 1,
    xp: 0,
    coins: 500,
    gems: 300,
    dust: 0,
    tickets: 0,
    collection: {},
    prism: {},
    newCards: [],
    decks: [],
    activeDeck: '',
    rankPoints: 0,
    bestRank: 0,
    story: {},
    missions: { day: '', list: [], rerolled: false },
    login: { last: '', streak: 0, total: 0 },
    achievements: {},
    stats: emptyStats(),
    settings: defaultSettings(),
    pity: 0,
    freePull: '',
    roulette: '',
    winStreak: 0,
    bestStreak: 0,
    flags: {},
    highScore: 0,
    favoriteClass: 'gacha',
    firstWinDay: '',
    records: emptyRecords(),
  };
}

const KEY = 'dopaverse.save.v1';

/** merge a loaded object onto defaults so older saves gain new fields */
function hydrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const base = newSave();
  const r = raw as Partial<SaveData>;
  if (r.v !== 1) return null;
  if (Array.isArray(r.decks)) r.decks = r.decks.map((d) => ({ ...d, name: renameDeck(d.name) }));
  return {
    ...base,
    ...r,
    settings: { ...base.settings, ...(r.settings ?? {}) },
    stats: { ...base.stats, ...(r.stats ?? {}) },
    missions: { ...base.missions, ...(r.missions ?? {}) },
    login: { ...base.login, ...(r.login ?? {}) },
    records: { ...base.records, ...(r.records ?? {}) },
  } as SaveData;
}

/** class names were unified (ガチャ→ガチャラー …); carry auto-named decks over */
const OLD_CLASS_NAMES: [string, string][] = [
  ['ガチャ', 'ガチャラー'],
  ['配信', 'ストリーマー'],
  ['スイーツ', 'シュガラー'],
  ['スワイプ', 'スワイパー'],
];
function renameDeck(name: string): string {
  for (const [from, to] of OLD_CLASS_NAMES) {
    if (name === `${from}スターター` || name === `${from}デッキ`) return to + name.slice(from.length);
  }
  return name;
}

type CloudDoc = { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void> };

class SaveStore {
  data: SaveData = newSave();
  private cloud: CloudDoc | null = null;
  private timer: number | null = null;
  private writing = false;
  private dirty = false;
  private listeners = new Set<() => void>();
  isNew = true;

  load(): void {
    try {
      const txt = localStorage.getItem(KEY);
      const d = txt ? hydrate(JSON.parse(txt)) : null;
      if (d) {
        this.data = d;
        this.isNew = false;
      }
    } catch {
      /* storage unavailable: play with a fresh save */
    }
  }

  /** Try to attach the claude.ai per-viewer store; newer save wins. */
  async attachCloud(onChange: () => void): Promise<void> {
    const w = window as unknown as { claude?: { use(n: string): Promise<unknown> } };
    if (!w.claude?.use) return;
    try {
      const [db, user] = (await Promise.all([w.claude.use('db'), w.claude.use('user')])) as [
        { doc(p: string): CloudDoc } | null,
        { id(): Promise<string | null> } | null,
      ];
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.doc(`data/users/${id}/save`);
      const snap = await ref.get();
      this.cloud = ref;
      const remote = snap.exists ? hydrate(snap.data()?.save ? JSON.parse(String(snap.data()!.save)) : null) : null;
      if (remote && remote.updated > this.data.updated) {
        this.data = remote;
        this.isNew = false;
        this.writeLocal();
        onChange();
      } else if (!this.isNew) {
        this.flushCloud();
      }
    } catch {
      this.cloud = null;
    }
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** mutate + persist (debounced) */
  update(fn: (d: SaveData) => void): void {
    fn(this.data);
    this.touch();
  }

  touch(): void {
    this.isNew = false;
    this.data.updated = Date.now();
    this.writeLocal();
    for (const f of this.listeners) f();
    if (this.cloud) {
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.flushCloud(), 1500);
    }
  }

  private writeLocal(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }

  private async flushCloud(): Promise<void> {
    if (!this.cloud) return;
    if (this.writing) {
      this.dirty = true;
      return;
    }
    this.writing = true;
    try {
      await this.cloud.set({ save: JSON.stringify(this.data), updated: this.data.updated });
    } catch {
      /* keep local copy */
    } finally {
      this.writing = false;
      if (this.dirty) {
        this.dirty = false;
        void this.flushCloud();
      }
    }
  }

  reset(): void {
    this.data = newSave();
    this.isNew = true;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    this.touch();
  }
}

export const save = new SaveStore();
