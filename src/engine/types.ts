// ドパバース engine types.
// The game state is plain data (structuredClone-able) so the AI can simulate freely.
// Card behaviour lives in CardDef hook functions, looked up by id.

export type Side = 0 | 1;
export type ClassId = 'neutral' | 'gacha' | 'stream' | 'sweets' | 'swipe' | 'gamer' | 'gadget';
export type CardType = 'follower' | 'spell' | 'amulet';
export type Rarity = 'bronze' | 'silver' | 'gold' | 'legend';
export type Keyword = 'ward' | 'storm' | 'rush' | 'bane' | 'drain' | 'ambush' | 'barrier' | 'aura' | 'twin';
export type GachaTier = 'N' | 'R' | 'SR' | 'SSR';

/** Target reference: positive = card uid, -1 = leader of side 0, -2 = leader of side 1. */
export type Tgt = number;
export const leaderTgt = (side: Side): Tgt => -(side + 1);
export const isLeaderTgt = (t: Tgt): boolean => t < 0;
export const tgtSide = (t: Tgt): Side => (-t - 1) as Side;

export interface Card {
  uid: number;
  id: string;
  owner: Side;
  atk: number;
  maxHp: number;
  dmg: number;
  kw: Keyword[];
  /** 0 = normal, 1 = evolved, 2 = super evolved */
  evolved: 0 | 1 | 2;
  /** global turn number the card entered the board (-1 = not on board) */
  enteredOn: number;
  attacks: number;
  tmpAtk: number;
  countdown: number;
  exp: number;
  level: number;
  costMod: number;
  /** card-specific counters */
  data: Record<string, number>;
  /** marked for destruction (bane etc.) */
  doomed?: boolean;
}

export interface PlayerStats {
  dmgDealt: number;
  leaderDmg: number;
  maxHit: number;
  kills: number;
  maxCombo: number;
  evolves: number;
  supers: number;
  fevers: number;
  overkill: number;
  cardsPlayed: number;
  spells: number;
  gachaRolls: number;
  ssr: number;
  healed: number;
  levelUps: number;
  buzzes: number;
  summoned: number;
  /** damage dealt to the enemy per card id (for the MVP display) */
  dmgBy: Record<string, number>;
}

export interface Player {
  side: Side;
  cls: ClassId;
  leader: string;
  hp: number;
  maxHp: number;
  pp: number;
  maxPp: number;
  ep: number;
  sep: number;
  evolvedThisTurn: boolean;
  deck: Card[];
  hand: Card[];
  board: Card[];
  grave: Card[];
  turns: number;
  /** cards played this turn */
  combo: number;
  likes: number;
  sweet: number;
  luck: number;
  kakuhen: number;
  /** ガジェッター: distinct パーツ ids played or 合体'd this battle */
  parts: string[];
  dopa: number;
  fever: boolean;
  stats: PlayerStats;
}

export interface GameState {
  rng: number;
  turn: number;
  active: Side;
  first: Side;
  players: [Player, Player];
  phase: 'mulligan' | 'main' | 'over';
  /** null = ongoing, -1 = draw */
  winner: Side | -1 | null;
  nextUid: number;
  record: boolean;
  events: GameEvent[];
  mulliganDone: [boolean, boolean];
  depth: number;
}

export type TargetKind = 'enemyFollower' | 'allyFollower' | 'anyFollower' | 'enemyAny' | 'any';

export interface PlayInfo {
  enhanced: boolean;
  /** number of OTHER cards played this turn before this one */
  combo: number;
}

export interface TargetSpec {
  kind: TargetKind;
  /** only ask for a target when this returns true */
  cond?: (s: GameState, card: Card, info: PlayInfo) => boolean;
  filter?: (s: GameState, c: Card) => boolean;
}

export interface LevelSpec {
  exp: number;
  max: number;
  gain: [number, number];
}

export type Hook = (c: import('./ctx').Ctx) => void;

export interface CardDef {
  id: string;
  name: string;
  cls: ClassId;
  type: CardType;
  cost: number;
  rarity: Rarity;
  atk?: number;
  hp?: number;
  /** absolute evolved stats (normal evolve). Super evolve adds +1/+1 on top. */
  evo?: [number, number];
  kw?: Keyword[];
  evoKw?: Keyword[];
  art: string;
  /** optional secondary art glyph */
  art2?: string;
  text: string;
  evoText?: string;
  flavor?: string;
  token?: boolean;
  countdown?: number;
  target?: TargetSpec;
  evoTarget?: TargetSpec;
  /** 課金 (enhance) cost */
  enhance?: number;
  level?: LevelSpec;
  noEvolve?: boolean;
  /** dynamic cost delta while in hand */
  costFn?: (s: GameState, c: Card) => number;
  /** AI value bonus while on board */
  aiValue?: number;
  /** AI: spell/fanfare is a removal that should target the best enemy */
  aiPrefer?: 'big' | 'small';
  /** tags used by deck builder / missions */
  tags?: string[];

  fanfare?: Hook;
  spell?: Hook;
  lastWords?: Hook;
  evolve?: Hook;
  superEvolve?: Hook;
  strike?: Hook;
  clash?: Hook;
  turnStart?: Hook;
  turnEnd?: Hook;
  /** owner played another card while this is on board */
  onPlay?: Hook;
  /** another allied follower entered the board */
  onSummon?: Hook;
  /** owner's leader was healed */
  onHeal?: Hook;
  onLevelUp?: Hook;
  /** an allied follower (other than this) was destroyed */
  onAllyDestroyed?: Hook;
}

// ---------- events (for the UI animator) ----------

export interface CardView {
  uid: number;
  id: string;
  atk: number;
  hp: number;
  maxHp: number;
  kw: Keyword[];
  evolved: 0 | 1 | 2;
  cost: number;
  countdown: number;
  exp: number;
  level: number;
  expNeed: number;
  sick: boolean;
  attacks: number;
  enhanced: boolean;
  /** 🔰 a copy the player doesn't own (お試し) */
  trial: boolean;
}

export interface PlayerView {
  hp: number;
  maxHp: number;
  pp: number;
  maxPp: number;
  ep: number;
  sep: number;
  dopa: number;
  fever: boolean;
  likes: number;
  sweet: number;
  parts: number;
  luck: number;
  kakuhen: number;
  combo: number;
  deck: number;
  turns: number;
  evolvedThisTurn: boolean;
  hand: CardView[];
  board: CardView[];
}

export interface View {
  turn: number;
  active: Side;
  phase: GameState['phase'];
  winner: GameState['winner'];
  p: [PlayerView, PlayerView];
}

export type GameEvent = { snap?: View } & (
  | { t: 'start'; first: Side }
  | { t: 'mulligan'; side: Side; swapped: number[] }
  | { t: 'turnStart'; side: Side; turn: number; ownTurn: number }
  | { t: 'turnEnd'; side: Side }
  | { t: 'unlock'; side: Side; kind: 'evolve' | 'super' }
  | { t: 'draw'; side: Side; uid: number; burned?: boolean; fromEffect?: boolean }
  | { t: 'addHand'; side: Side; uid: number }
  | { t: 'deckout'; side: Side }
  | { t: 'play'; side: Side; uid: number; id: string; target: Tgt | null; enhanced: boolean; combo: number }
  | { t: 'summon'; side: Side; uid: number; fromHand: boolean }
  | { t: 'spell'; side: Side; uid: number; id: string; target: Tgt | null }
  | { t: 'trigger'; uid: number; kind: string; side: Side }
  | { t: 'attack'; uid: number; target: Tgt }
  | { t: 'damage'; target: Tgt; amount: number; source: number; overkill: number; combat: boolean; fatal: boolean }
  | { t: 'immune'; uid: number }
  | { t: 'barrier'; uid: number }
  | { t: 'heal'; target: Tgt; amount: number }
  | { t: 'destroy'; uid: number; side: Side; banish?: boolean }
  | { t: 'burn'; side: Side; uid: number; id: string }
  | { t: 'bounce'; uid: number; side: Side }
  | { t: 'buff'; uid: number; atk: number; hp: number }
  | { t: 'keyword'; uid: number; kw: Keyword }
  | { t: 'evolve'; uid: number; side: Side; sup: boolean }
  | { t: 'transform'; uid: number; id: string }
  | { t: 'gacha'; side: Side; uid: number; tier: GachaTier; luck: number; ceiling: boolean; kakuhen: boolean }
  | { t: 'coin'; side: Side; uid: number; heads: boolean }
  | { t: 'dice'; side: Side; uid: number; value: number }
  | { t: 'likes'; side: Side; amount: number; total: number }
  | { t: 'buzz'; side: Side; uid: number; spent: number }
  | { t: 'sweet'; side: Side; amount: number; total: number }
  | { t: 'sugarHigh'; side: Side; uid: number; need: number }
  | { t: 'combo'; side: Side; count: number }
  | { t: 'comboHit'; side: Side; uid: number; need: number }
  | { t: 'parts'; side: Side; id: string; total: number }
  | { t: 'fuse'; side: Side; uid: number; ids: string[] }
  | { t: 'complete'; side: Side; uid: number; need: number }
  | { t: 'enhance'; side: Side; uid: number }
  | { t: 'exp'; uid: number; exp: number; need: number }
  | { t: 'levelUp'; uid: number; level: number }
  | { t: 'dopa'; side: Side; value: number; gain: number }
  | { t: 'fever'; side: Side }
  | { t: 'pp'; side: Side; amount: number; max: boolean }
  | { t: 'maxHp'; side: Side; amount: number }
  | { t: 'countdown'; uid: number; value: number }
  | { t: 'luck'; side: Side; value: number }
  | { t: 'kakuhen'; side: Side }
  | { t: 'msg'; text: string; side?: Side }
  | { t: 'gameOver'; winner: Side | -1; reason: 'hp' | 'deck' | 'concede' }
);

export type GameEventType = GameEvent['t'];

export type Action =
  | { t: 'mulligan'; side: Side; swap: number[] }
  | { t: 'play'; uid: number; target?: Tgt }
  | { t: 'attack'; uid: number; target: Tgt }
  | { t: 'evolve'; uid: number; sup: boolean; target?: Tgt }
  | { t: 'fever' }
  | { t: 'end' }
  | { t: 'concede'; side: Side };
