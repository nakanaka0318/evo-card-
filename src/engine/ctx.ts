import * as E from './core';
import { def } from './defs';
import { RULES } from './rules';
import { isLeaderTgt, leaderTgt, type Card, type GachaTier, type GameState, type Keyword, type PlayMode, type Side, type Tgt } from './types';

export interface TriggerExtra {
  target?: Tgt | null;
  enhanced?: boolean;
  combo?: number;
  other?: Card;
  amount?: number;
  mode?: PlayMode;
  /** ステラー: uids of hand cards the player picked to discard */
  discard?: number[];
}

/** the four ガジェッター パーツ tokens */
export const PART_IDS = ['t_pbolt', 't_pspring', 't_pbattery', 't_pchip'];
export const TREASURE_IDS = ['t_tcoin', 't_tgem', 't_tcup', 't_tcrown'];
/** the five common デコ crests */
export const CREST_IDS = ['t_dheart', 't_dstar', 't_dribbon', 't_dpearl', 't_dstone'];

type GachaTable = Partial<Record<GachaTier, (c: Ctx) => void>>;

/**
 * The API card effects are written against. Every method is a thin wrapper over
 * an engine primitive with `self` as the source.
 */
export class Ctx {
  readonly me: Side;
  readonly opp: Side;
  readonly target: Tgt | null;
  readonly enhanced: boolean;
  /** number of OTHER cards played this turn before this card */
  readonly combo: number;
  readonly other?: Card;
  readonly amount: number;
  /** how the card (or, for onPlay, the other card) was played */
  readonly mode: PlayMode;

  constructor(
    readonly s: GameState,
    readonly self: Card,
    extra: TriggerExtra = {},
  ) {
    this.me = self.owner;
    this.opp = E.other(self.owner);
    this.target = extra.target ?? null;
    this.enhanced = !!extra.enhanced;
    this.combo = extra.combo ?? 0;
    this.other = extra.other;
    this.amount = extra.amount ?? 0;
    this.mode = extra.mode ?? 'normal';
    this.picks = [...(extra.discard ?? [])];
  }
  /** discard choices still to use (player-picked) */
  private picks: number[];

  get P() {
    return this.s.players[this.me];
  }
  get O() {
    return this.s.players[this.opp];
  }
  get onBoard(): boolean {
    return E.onBoard(this.s, this.self) && E.alive(this.self);
  }

  // ------------------------------------------------ queries
  allies(includeSelf = true): Card[] {
    return this.P.board.filter((c) => E.isFollower(c) && E.alive(c) && (includeSelf || c !== this.self));
  }
  enemies(): Card[] {
    return this.O.board.filter((c) => E.isFollower(c) && E.alive(c));
  }
  enemyAmulets(): Card[] {
    return this.O.board.filter((c) => !E.isFollower(c) && E.alive(c));
  }
  allFollowers(): Card[] {
    return [...this.allies(), ...this.enemies()];
  }
  targetCard(): Card | undefined {
    if (this.target === null || isLeaderTgt(this.target)) return undefined;
    return E.boardCard(this.s, this.target);
  }
  pick<T>(arr: T[]): T | undefined {
    if (!arr.length) return undefined;
    return arr[E.rndInt(this.s, arr.length)];
  }
  /** engine RNG in [0, 1) (deterministic per game seed) */
  rand(): number {
    return E.rnd(this.s);
  }
  chance(p: number): boolean {
    return E.rnd(this.s) < p;
  }
  hp(c: Card): number {
    return E.hpOf(c);
  }
  atk(c: Card): number {
    return E.atkOf(this.s, c);
  }
  alive(c: Card): boolean {
    return E.alive(c) && E.onBoard(this.s, c);
  }
  isEnemy(c: Card): boolean {
    return c.owner === this.opp;
  }
  get leaderOpp(): Tgt {
    return leaderTgt(this.opp);
  }
  get leaderMe(): Tgt {
    return leaderTgt(this.me);
  }

  // ------------------------------------------------ damage / heal
  dmg(t: Tgt | Card | undefined | null, n: number): number {
    if (t === undefined || t === null) return 0;
    const tgt = typeof t === 'number' ? t : t.uid;
    return E.damage(this.s, this.self, tgt, n);
  }
  dmgAll(cards: Card[], n: number): void {
    for (const c of [...cards]) if (E.alive(c)) E.damage(this.s, this.self, c.uid, n);
  }
  face(n: number): number {
    return E.damage(this.s, this.self, leaderTgt(this.opp), n);
  }
  dmgLeader(side: Side, n: number): number {
    return E.damage(this.s, this.self, leaderTgt(side), n);
  }
  /** hit a random enemy (follower or leader) `times` times */
  ping(times: number, n: number, includeLeader = true): void {
    for (let i = 0; i < times; i++) {
      if (E.over(this.s)) return;
      const pool: Tgt[] = this.enemies().map((c) => c.uid);
      if (includeLeader) pool.push(leaderTgt(this.opp));
      const t = this.pick(pool);
      if (t === undefined) return;
      E.damage(this.s, this.self, t, n);
    }
  }
  /** hit random enemy followers, re-picking living ones each time */
  pingFollowers(times: number, n: number): void {
    this.ping(times, n, false);
  }
  heal(n: number, side: Side = this.me): number {
    return E.healLeader(this.s, side, n);
  }
  healUnit(c: Card | undefined, n: number): number {
    if (!c) return 0;
    return E.healUnit(this.s, c, n);
  }

  // ------------------------------------------------ stats / keywords
  buff(c: Card | undefined, a: number, h: number): void {
    if (c) E.buff(this.s, c, a, h);
  }
  buffAll(cards: Card[], a: number, h: number): void {
    for (const c of cards) E.buff(this.s, c, a, h);
  }
  tmp(c: Card | undefined, a: number): void {
    if (!c) return;
    c.tmpAtk += a;
    E.emit(this.s, { t: 'buff', uid: c.uid, atk: a, hp: 0 });
  }
  give(c: Card | undefined, ...kws: Keyword[]): void {
    if (!c) return;
    for (const k of kws) E.giveKw(this.s, c, k);
  }
  destroy(c: Card | undefined): void {
    if (c) E.destroy(this.s, c);
  }
  banish(c: Card | undefined): void {
    if (c) E.banish(this.s, c);
  }
  bounce(c: Card | undefined): void {
    if (c) E.bounce(this.s, c);
  }
  transform(c: Card | undefined, id: string): void {
    if (c) E.transform(this.s, c, id);
  }

  // ------------------------------------------------ cards
  summon(id: string, n = 1, side: Side = this.me): Card[] {
    return E.summon(this.s, side, id, n);
  }
  draw(n = 1): Card[] {
    return E.draw(this.s, this.me, n, true);
  }
  addHand(id: string, n = 1): Card[] {
    return E.addHand(this.s, this.me, id, n);
  }
  boardFree(): number {
    return RULES.boardMax - this.P.board.length;
  }

  // ------------------------------------------------ resources
  pp(n: number): void {
    const p = this.P;
    const before = p.pp;
    p.pp = Math.min(p.maxPp, p.pp + n);
    if (p.pp !== before) E.emit(this.s, { t: 'pp', side: this.me, amount: p.pp - before, max: false });
  }
  maxPp(n: number): void {
    const p = this.P;
    const before = p.maxPp;
    p.maxPp = Math.min(RULES.ppMax, p.maxPp + n);
    if (p.maxPp !== before) E.emit(this.s, { t: 'pp', side: this.me, amount: p.maxPp - before, max: true });
  }
  /** lower the opponent leader's max HP (never below 1) */
  enemyMaxHp(n: number): void {
    const p = this.O;
    const d = Math.min(n, p.maxHp - 1);
    if (d <= 0) return;
    p.maxHp -= d;
    p.hp = Math.min(p.hp, p.maxHp);
    E.emit(this.s, { t: 'maxHp', side: E.other(this.me), amount: -d });
  }
  /** copies of up to n random amulets of cost ≤ maxCost from the own deck (the deck keeps them) */
  deckAmuletCopies(n: number, maxCost: number): Card[] {
    const pool = this.P.deck.filter((c) => def(c.id).type === 'amulet' && def(c.id).cost <= maxCost);
    const out: Card[] = [];
    for (let i = 0; i < n && pool.length; i++) {
      const c = pool.splice(E.rndInt(this.s, pool.length), 1)[0];
      out.push(...this.summon(c.id));
    }
    return out;
  }
  maxHp(n: number): void {
    const p = this.P;
    p.maxHp += n;
    E.emit(this.s, { t: 'maxHp', side: this.me, amount: n });
  }
  fillDopa(): void {
    E.addDopa(this.s, this.me, RULES.dopaMax);
  }
  dopa(n: number): void {
    E.addDopa(this.s, this.me, n);
  }
  msg(text: string): void {
    E.emit(this.s, { t: 'msg', text, side: this.me });
  }

  // ------------------------------------------------ class mechanics
  /** 配信: gain likes */
  likes(n: number): void {
    E.gainLikes(this.s, this.me, n);
  }
  /** 配信: バズX — spend X likes for a bonus */
  buzz(x: number, fn: (c: Ctx) => void): boolean {
    if (this.P.likes < x || E.over(this.s)) return false;
    this.P.likes -= x;
    this.P.stats.buzzes++;
    E.emit(this.s, { t: 'buzz', side: this.me, uid: this.self.uid, spent: x });
    fn(this);
    return true;
  }
  /** スイーツ: シュガーハイX — sweetness threshold */
  sugarHigh(x: number): boolean {
    if (this.P.sweet < x) return false;
    E.emit(this.s, { t: 'sugarHigh', side: this.me, uid: this.self.uid, need: x });
    return true;
  }
  /** スワイプ: コンボX — X other cards played this turn */
  comboAt(x: number): boolean {
    if (this.combo < x) return false;
    E.emit(this.s, { t: 'comboHit', side: this.me, uid: this.self.uid, need: x });
    return true;
  }
  /** ガチャ: roll and run the matching table entry */
  gacha(table: GachaTable): GachaTier {
    const tier = E.gachaRoll(this.s, this.self);
    table[tier]?.(this);
    return tier;
  }
  luck(n: number): void {
    const p = this.P;
    p.luck = Math.max(0, Math.min(RULES.luckCeiling, p.luck + n));
    E.emit(this.s, { t: 'luck', side: this.me, value: p.luck });
  }
  kakuhen(n = 1): void {
    this.P.kakuhen += n;
    E.emit(this.s, { t: 'kakuhen', side: this.me });
  }
  coin(): boolean {
    const heads = E.rnd(this.s) < 0.5;
    E.emit(this.s, { t: 'coin', side: this.me, uid: this.self.uid, heads });
    return heads;
  }
  dice(sides = 6): number {
    const value = 1 + E.rndInt(this.s, sides);
    E.emit(this.s, { t: 'dice', side: this.me, uid: this.self.uid, value });
    return value;
  }
  /** ガジェッター: add random パーツ to the hand (or shuffle them into the deck) */
  addParts(n: number, where: 'hand' | 'deck' = 'hand'): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < n; i++) {
      const id = PART_IDS[E.rndInt(this.s, PART_IDS.length)];
      if (where === 'hand') out.push(...this.addHand(id));
      else {
        const c = E.makeCard(this.s, id, this.me);
        this.P.deck.splice(E.rndInt(this.s, this.P.deck.length + 1), 0, c);
        out.push(c);
      }
    }
    if (where === 'deck' && n > 0) this.msg(`山札にパーツ×${n}`);
    return out;
  }
  /** ガジェッター: one of every パーツ into the hand */
  allParts(): Card[] {
    return PART_IDS.flatMap((id) => this.addHand(id));
  }
  /** ガジェッター: 【合体X】 absorb up to X パーツ from the hand; returns their ids */
  fuse(max: number): string[] {
    const taken = this.P.hand.filter((c) => def(c.id).tags?.includes('part')).slice(0, max);
    if (!taken.length) return [];
    for (const c of taken) {
      this.P.hand.splice(this.P.hand.indexOf(c), 1);
      this.P.grave.push(c);
    }
    const ids = taken.map((c) => c.id);
    E.emit(this.s, { t: 'fuse', side: this.me, uid: this.self.uid, ids });
    for (const id of ids) E.addPart(this.s, this.me, id);
    return ids;
  }
  /** ガジェッター: 【コンプリートX】 X distinct パーツ started this battle */
  complete(x: number): boolean {
    if (this.P.parts.length < x) return false;
    E.emit(this.s, { t: 'complete', side: this.me, uid: this.self.uid, need: x });
    return true;
  }

  /** トレジャラー: random 財宝 cards into the hand */
  addTreasure(n: number): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < n; i++) out.push(...this.addHand(TREASURE_IDS[E.rndInt(this.s, TREASURE_IDS.length)]));
    return out;
  }
  /** トレジャラー: one of every 財宝 into the hand */
  allTreasures(): Card[] {
    return TREASURE_IDS.flatMap((id) => this.addHand(id));
  }
  isTreasure(c: Card | undefined): boolean {
    return !!c && !!def(c.id).tags?.includes('treasure');
  }
  /** トレジャラー: 【財宝X】 X 財宝 used this battle */
  rich(x: number): boolean {
    if (this.P.treasures < x) return false;
    E.emit(this.s, { t: 'rich', side: this.me, uid: this.self.uid, need: x });
    return true;
  }
  /** ハモラー: is the deck in ハモり (even number of cards)? no side effects */
  get inHarmony(): boolean {
    return this.P.deck.length % 2 === 0;
  }
  /** ハモラー: 【ハモり】 check — fires (and is counted) when the deck has an even number of cards */
  harmony(): boolean {
    if (!this.inHarmony) return false;
    this.P.harmonies++;
    E.emit(this.s, { t: 'harmony', side: this.me, uid: this.self.uid, total: this.P.harmonies });
    return true;
  }
  /** shuffle n copies of a card into the own deck */
  toDeck(id: string, n = 1): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < n; i++) {
      const c = E.makeCard(this.s, id, this.me);
      this.P.deck.splice(E.rndInt(this.s, this.P.deck.length + 1), 0, c);
      out.push(c);
    }
    if (n > 0) this.msg(`山札に「${def(id).name}」×${n}`);
    return out;
  }
  /** put a random follower from the own deck onto the board */
  deckFollowerToBoard(): Card | undefined {
    const pool = this.P.deck.filter((c) => def(c.id).type === 'follower');
    if (!pool.length || this.boardFree() <= 0) return undefined;
    const c = pool[E.rndInt(this.s, pool.length)];
    this.P.deck.splice(this.P.deck.indexOf(c), 1);
    return this.summon(c.id)[0];
  }
  /** banish the top n cards of the own deck */
  burnTop(n = 1): void {
    const gone = this.P.deck.splice(0, n);
    if (gone.length) this.msg(`山札の上から${gone.length}枚を消滅`);
  }

  // ------------------------------------------------ クラッシャー
  /** 【いけにえ】 destroy another own card (ガラクタ → ラストワード持ち → 低コスト順); returns it */
  sacrifice(): Card | undefined {
    const pool = this.P.board.filter((c) => c !== this.self && E.alive(c) && !c.doomed);
    if (!pool.length) return undefined;
    const score = (c: Card) => {
      const d = def(c.id);
      return (d.tags?.includes('junk') ? -100 : 0) + (d.lastWords ? -20 : 0) + d.cost * 2 + (E.isFollower(c) ? E.hpOf(c) + c.atk : 0) * 0.5;
    };
    const v = [...pool].sort((a, b) => score(a) - score(b))[0];
    E.emit(this.s, { t: 'sacrifice', side: this.me, uid: this.self.uid, victim: v.uid });
    E.destroy(this.s, v);
    return v;
  }
  /** 【破壊X】 own cards destroyed this battle ≥ X */
  broken(x: number): boolean {
    if (this.P.broken < x) return false;
    E.emit(this.s, { t: 'smash', side: this.me, uid: this.self.uid, need: x });
    return true;
  }

  // ------------------------------------------------ レンジャー
  /** 【連携X】 own followers that entered the board this battle ≥ X */
  rallyAt(x: number): boolean {
    if (this.P.rally < x) return false;
    E.emit(this.s, { t: 'rallyHit', side: this.me, uid: this.self.uid, need: x });
    return true;
  }
  /** evolve a follower without spending evolve points; default: a random un-evolved ally */
  evolve(c?: Card): boolean {
    const t = c ?? this.pick(this.allies(false).filter((a) => a.evolved === 0 && !def(a.id).noEvolve));
    return t ? E.evolveFree(this.s, t) : false;
  }
  addEp(n: number): void {
    this.P.ep += n;
    this.msg(`進化ポイント+${n}`);
  }

  // ------------------------------------------------ スペラー
  /** this card's 【スペルブースト】 count */
  get boost(): number {
    return this.self.data.sb ?? 0;
  }
  /** extra 【スペルブースト】 on the hand */
  spellboost(n = 1): void {
    E.boostHand(this.s, this.me, n);
  }
  isSpell(c: Card | undefined): boolean {
    return !!c && (def(c.id).type === 'spell' || this.mode === 'accel');
  }

  // ------------------------------------------------ ステラー
  /** discard n cards: the player's picks first, otherwise 【捨てられた時】持ち優先、なければランダム */
  discard(n = 1): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < n; i++) {
      const hand = this.P.hand.filter((c) => c !== this.self);
      if (!hand.length) break;
      let c: Card | undefined;
      while (!c && this.picks.length) {
        const u = this.picks.shift();
        c = hand.find((x) => x.uid === u);
      }
      if (!c) {
        const pref = hand.filter((x) => def(x.id).onDiscard);
        const pool = pref.length ? pref : hand;
        c = pool[E.rndInt(this.s, pool.length)];
      }
      E.discard(this.s, c);
      out.push(c);
    }
    return out;
  }
  discardAll(): Card[] {
    return this.discard(this.P.hand.length);
  }
  /** 予約ドロー: draw n more cards at the start of the next own turn */
  reserveDraw(n: number): void {
    if (n <= 0) return;
    this.P.reserveDraw += n;
    E.emit(this.s, { t: 'reserve', side: this.me, n, total: this.P.reserveDraw });
  }
  /** 【ハンドレスX】 hand size ≤ X */
  handless(x: number): boolean {
    if (this.P.hand.length > x) return false;
    E.emit(this.s, { t: 'handless', side: this.me, uid: this.self.uid, need: x });
    return true;
  }

  // ------------------------------------------------ ジュエラー
  crystals(): Card[] {
    return this.P.board.filter((c) => c.id === 't_crystal' && E.alive(c));
  }
  /** advance every own 「結晶」 countdown by n (0 → hatches) */
  advanceCrystals(n: number): void {
    for (const c of this.crystals()) this.advanceCountdown(c, n);
  }
  /** move an amulet's countdown n steps closer to 0 (0 → destroyed / 【成就】) */
  advanceCountdown(c: Card, n: number): void {
    if (c.countdown <= 0 || c.doomed) return;
    c.countdown = Math.max(0, c.countdown - n);
    E.emit(this.s, { t: 'countdown', uid: c.uid, value: c.countdown });
    if (c.countdown === 0) E.expire(this.s, c);
  }

  // ------------------------------------------------ ノベラー
  get white(): boolean {
    return this.P.chapter === 0;
  }
  get black(): boolean {
    return this.P.chapter === 1;
  }
  /** 【白の章】 check (emits for the animator) */
  whiteCh(): boolean {
    if (!this.white) return false;
    E.emit(this.s, { t: 'chapterHit', side: this.me, uid: this.self.uid, chapter: 0 });
    return true;
  }
  /** 【黒の章】 check */
  blackCh(): boolean {
    if (!this.black) return false;
    E.emit(this.s, { t: 'chapterHit', side: this.me, uid: this.self.uid, chapter: 1 });
    return true;
  }
  /** ページをめくる (白⇄黒); with `to`, open that chapter */
  flip(to?: 0 | 1): boolean {
    return E.flipChapter(this.s, this.me, to);
  }

  // ------------------------------------------------ デコラー
  crest(id: string): Card | undefined {
    return E.addCrest(this.s, this.me, id);
  }
  randomCrest(n = 1): void {
    for (let i = 0; i < n; i++) this.crest(CREST_IDS[E.rndInt(this.s, CREST_IDS.length)]);
  }
  get crestCount(): number {
    return this.P.crests.length;
  }
  /** 【クレストX】 X or more crests on the leader */
  crestAt(x: number): boolean {
    if (this.P.crests.length < x) return false;
    E.emit(this.s, { t: 'crestHit', side: this.me, uid: this.self.uid, need: x });
    return true;
  }

  // ------------------------------------------------ ゲキカラー
  /** 【激辛X】 damage the own leader */
  selfDamage(n: number): void {
    if (n <= 0) return;
    this.P.selfDmg += n;
    E.emit(this.s, { t: 'spicy', side: this.me, uid: this.self.uid, n, total: this.P.selfDmg });
    E.damage(this.s, this.self, leaderTgt(this.me), n);
  }
  /** 【ピンチX】 own leader HP ≤ X */
  pinch(x: number): boolean {
    if (this.P.hp > x) return false;
    E.emit(this.s, { t: 'pinch', side: this.me, uid: this.self.uid, need: x });
    return true;
  }

  // ------------------------------------------------ オマモラー
  amulets(): Card[] {
    return this.P.board.filter((c) => def(c.id).type === 'amulet' && E.alive(c) && !c.doomed);
  }
  /** 祈願: advance every own amulet's countdown by n */
  pray(n = 1): void {
    E.emit(this.s, { t: 'pray', side: this.me, uid: this.self.uid, n });
    for (const c of this.amulets()) if (c !== this.self) this.advanceCountdown(c, n);
  }
  /** 【成就X】 X amulets fulfilled this battle */
  fulfilledAt(x: number): boolean {
    if (this.P.fulfilled < x) return false;
    E.emit(this.s, { t: 'fulfillHit', side: this.me, uid: this.self.uid, need: x });
    return true;
  }

  // ------------------------------------------------ パペッター
  isPuppet(c: Card | undefined): boolean {
    return !!c && !!def(c.id).tags?.includes('puppet');
  }
  puppetsOnBoard(): Card[] {
    return this.allies().filter((c) => this.isPuppet(c));
  }
  addPuppets(n: number): Card[] {
    return this.addHand('t_puppet', n);
  }
  /** 【操演X】 X 「人形」 entered the own board this battle */
  puppetAt(x: number): boolean {
    if (this.P.puppets < x) return false;
    E.emit(this.s, { t: 'puppetHit', side: this.me, uid: this.self.uid, need: x });
    return true;
  }
  hatch(): Card | undefined {
    return E.hatch(this.s, this.self);
  }
  /** the other card (onPlay) was played via 【アクセラレート】/【結晶】/【エンハンス】 */
  get altPlay(): boolean {
    return this.mode !== 'normal';
  }

  /** ゲーマー: grant EXP */
  exp(c: Card | undefined, n: number): void {
    if (c) E.gainExp(this.s, c, n);
  }
  hasLevel(c: Card): boolean {
    return !!def(c.id).level;
  }
}
