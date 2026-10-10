// ドパバース engine types.
// The game state is plain data (structuredClone-able) so the AI can simulate freely.
// Card behaviour lives in CardDef hook functions, looked up by id.

export type Side = 0 | 1;
export type ClassId = 'neutral' | 'gacha' | 'stream' | 'sweets' | 'swipe' | 'gamer' | 'gadget' | 'treasure' | 'harmony' | 'crash' | 'ranger' | 'witch' | 'minimal' | 'jewel' | 'novel' | 'deco' | 'spicy' | 'shrine' | 'puppet';
export type CardType = 'follower' | 'spell' | 'amulet';
export type Rarity = 'bronze' | 'silver' | 'gold' | 'legend';
export type Keyword = 'ward' | 'storm' | 'rush' | 'bane' | 'drain' | 'ambush' | 'barrier' | 'aura' | 'twin';
export type GachaTier = 'N' | 'R' | 'SR' | 'SSR';
/** how a card is played: normal cost, 【エンハンス/課金】, 【アクセラレート】 (as a spell) or 【結晶】 (as a countdown amulet) */
export type PlayMode = 'normal' | 'enhance' | 'accel' | 'crystal';

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
  /** ジュエラー: the follower sleeping inside a 「結晶」 */
  hold?: string;
  /** a card id a card remembers (捨てられないカバン) */
  memo?: string;
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
  /** cards played from hand this battle (id → times), for the rankings */
  played: Record<string, number>;
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
  /** トレジャラー: 財宝 cards used this battle */
  treasures: number;
  /** ハモラー: how many 【ハモり】 effects fired this battle */
  harmonies: number;
  /** クラッシャー: own cards destroyed this battle */
  broken: number;
  /** レンジャー: own followers that entered the board this battle (【連携】) */
  rally: number;
  /** ステラー: cards discarded from hand this battle */
  discarded: number;
  /** ステラー: cards drawn at the start of the next own turn (予約ドロー) */
  reserveDraw: number;
  /** ノベラー: open chapter — 0 = 白の章, 1 = 黒の章 */
  chapter: 0 | 1;
  /** ノベラー: pages turned this battle */
  flips: number;
  /** デコラー: permanent leader effects (【クレスト】), stored as hidden cards */
  crests: Card[];
  /** ゲキカラー: damage this player dealt to their own leader (【激辛】) */
  selfDmg: number;
  /** オマモラー: own amulets whose countdown reached 0 (【成就】) */
  fulfilled: number;
  /** パペッター: 「人形」 that entered the own board */
  puppets: number;
  /** ジュエラー: cards played via 【アクセラレート】 / 【結晶】 / 【エンハンス・課金】 */
  accels: number;
  crystals: number;
  enhances: number;
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
  mode: PlayMode;
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
  /** banished at the end of the opponent's turn (パペッター's 人形) */
  fleeting?: boolean;
  /** -1 cost while in hand each time an own amulet is fulfilled (九尾の白狐) */
  fulfillDiscount?: boolean;
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
  /** クラッシャー: any other own card (follower or amulet) was destroyed */
  onBreak?: Hook;
  /** レンジャー: another allied follower evolved */
  onAllyEvolve?: Hook;
  /** レンジャー: evolved by a card effect (変身), on top of its 【進化時】 */
  onTransform?: Hook;
  /** any card on the opponent's side breaks (destroyed, not banished) */
  onEnemyBreak?: Hook;
  /** this card arrives on the board by any route */
  onEnter?: Hook;
  /** スペラー: 【スペルブースト】 — +1 boost (card.data.sb) per spell cast while in hand */
  spellboost?: boolean;
  /** ステラー: how many hand cards the player picks to discard when this is played */
  discardPick?: number;
  /** ステラー: this card was discarded from the hand */
  onDiscard?: Hook;
  /** ステラー: the owner discarded another card while this is on board */
  onAnyDiscard?: Hook;
  /** ジュエラー: 【アクセラレートX】 — when PP can't pay the cost, play for X as a spell */
  accel?: number;
  accelerate?: Hook;
  /** ジュエラー: 【結晶X】 — when PP can't pay the cost, play for X as a 「結晶」 amulet */
  crystal?: number;
  /** countdown of the 「結晶」 (default 2) */
  crystalCd?: number;
  /** ジュエラー: entered the board out of a 「結晶」 */
  onHatch?: Hook;
  /** ノベラー: the owner turned the page (白⇄黒) */
  onFlip?: Hook;
  /** デコラー: the owner put on a 【クレスト】 (incl. this one, if it's a crest) */
  onCrest?: Hook;
  /** ゲキカラー: the owner's leader took damage (ctx.amount) */
  onLeaderHurt?: Hook;
  /** オマモラー: an own amulet's countdown reached 0 (ctx.other) */
  onFulfill?: Hook;
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
  /** 【スペルブースト】 count while in hand (-1 = not a spellboost card) */
  boost?: number;
  /** how it would be played right now (hand only) */
  mode?: PlayMode;
  /** 「結晶」: the follower inside */
  hold?: string;
  /** a card id a card remembers (捨てられないカバン) */
  memo?: string;
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
  treasures: number;
  harmonies: number;
  broken: number;
  rally: number;
  discarded: number;
  reserveDraw: number;
  chapter: 0 | 1;
  flips: number;
  crests: string[];
  selfDmg: number;
  fulfilled: number;
  puppets: number;
  spells: number;
  accels: number;
  crystals: number;
  enhances: number;
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
  | { t: 'play'; side: Side; uid: number; id: string; target: Tgt | null; enhanced: boolean; combo: number; mode?: PlayMode }
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
  | { t: 'treasure'; side: Side; id: string; total: number }
  | { t: 'rich'; side: Side; uid: number; need: number }
  | { t: 'harmony'; side: Side; uid: number; total: number }
  | { t: 'broken'; side: Side; total: number }
  | { t: 'smash'; side: Side; uid: number; need: number }
  | { t: 'sacrifice'; side: Side; uid: number; victim: number }
  | { t: 'rally'; side: Side; total: number }
  | { t: 'rallyHit'; side: Side; uid: number; need: number }
  | { t: 'boost'; side: Side; uids: number[] }
  | { t: 'discard'; side: Side; uid: number; id: string }
  | { t: 'handless'; side: Side; uid: number; need: number }
  | { t: 'reserve'; side: Side; n: number; total: number }
  | { t: 'reserveDraw'; side: Side; n: number }
  | { t: 'flip'; side: Side; chapter: 0 | 1; total: number }
  | { t: 'chapterHit'; side: Side; uid: number; chapter: 0 | 1 }
  | { t: 'crest'; side: Side; id: string; total: number }
  | { t: 'crestHit'; side: Side; uid: number; need: number }
  | { t: 'spicy'; side: Side; uid: number; n: number; total: number }
  | { t: 'pinch'; side: Side; uid: number; need: number }
  | { t: 'pray'; side: Side; uid: number; n: number }
  | { t: 'fulfill'; side: Side; uid: number; id: string; total: number }
  | { t: 'fulfillHit'; side: Side; uid: number; need: number }
  | { t: 'puppet'; side: Side; total: number }
  | { t: 'puppetHit'; side: Side; uid: number; need: number }
  | { t: 'accel'; side: Side; uid: number; id: string }
  | { t: 'crystal'; side: Side; uid: number; id: string }
  | { t: 'hatch'; side: Side; uid: number; id: string }
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
  | { t: 'play'; uid: number; target?: Tgt; discard?: number[] }
  | { t: 'attack'; uid: number; target: Tgt }
  | { t: 'evolve'; uid: number; sup: boolean; target?: Tgt }
  | { t: 'fever' }
  | { t: 'end' }
  | { t: 'concede'; side: Side };
