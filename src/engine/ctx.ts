import * as E from './core';
import { def } from './defs';
import { RULES } from './rules';
import { isLeaderTgt, leaderTgt, type Card, type GachaTier, type GameState, type Keyword, type Side, type Tgt } from './types';

export interface TriggerExtra {
  target?: Tgt | null;
  enhanced?: boolean;
  combo?: number;
  other?: Card;
  amount?: number;
}

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
  }

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
  /** ゲーマー: grant EXP */
  exp(c: Card | undefined, n: number): void {
    if (c) E.gainExp(this.s, c, n);
  }
  hasLevel(c: Card): boolean {
    return !!def(c.id).level;
  }
}
