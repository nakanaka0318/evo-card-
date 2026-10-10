import { def } from './defs';
import { DOPA, RULES } from './rules';
import { Ctx, type TriggerExtra } from './ctx';
import {
  isLeaderTgt,
  leaderTgt,
  tgtSide,
  type Card,
  type CardDef,
  type CardView,
  type ClassId,
  type GachaTier,
  type GameEvent,
  type GameState,
  type Hook,
  type Keyword,
  type Player,
  type PlayerStats,
  type PlayMode,
  type Side,
  type TargetSpec,
  type Tgt,
  type View,
} from './types';

// ---------------------------------------------------------------- rng

export function rnd(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rndInt(s: GameState, n: number): number {
  return Math.floor(rnd(s) * n);
}

export function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rndInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------- basics

export const other = (side: Side): Side => (side ^ 1) as Side;

export function makeCard(s: GameState, id: string, owner: Side): Card {
  const d = def(id);
  return {
    uid: s.nextUid++,
    id,
    owner,
    atk: d.atk ?? 0,
    maxHp: d.hp ?? 0,
    dmg: 0,
    kw: [...(d.kw ?? [])],
    evolved: 0,
    enteredOn: -1,
    attacks: 0,
    tmpAtk: 0,
    countdown: d.countdown ?? -1,
    exp: 0,
    level: 1,
    costMod: 0,
    data: {},
  };
}

export const hpOf = (c: Card): number => c.maxHp - c.dmg;
export const has = (c: Card, kw: Keyword): boolean => c.kw.includes(kw);
export const isFollower = (c: Card): boolean => def(c.id).type === 'follower';

export function atkOf(s: GameState, c: Card): number {
  const p = s.players[c.owner];
  const fever = p.fever && s.active === c.owner ? 1 : 0;
  return Math.max(0, c.atk + c.tmpAtk + fever);
}

export function alive(c: Card): boolean {
  if (c.doomed) return false;
  return def(c.id).type !== 'follower' || hpOf(c) > 0;
}

export function onBoard(s: GameState, c: Card): boolean {
  return s.players[c.owner].board.includes(c);
}

export function addKw(c: Card, kw: Keyword): void {
  if (!c.kw.includes(kw)) c.kw.push(kw);
}

export function removeKw(c: Card, kw: Keyword): void {
  const i = c.kw.indexOf(kw);
  if (i >= 0) c.kw.splice(i, 1);
}

export function boardCard(s: GameState, uid: number): Card | undefined {
  for (const p of s.players) {
    const c = p.board.find((x) => x.uid === uid);
    if (c) return c;
  }
  return undefined;
}

export function handCard(s: GameState, uid: number): Card | undefined {
  for (const p of s.players) {
    const c = p.hand.find((x) => x.uid === uid);
    if (c) return c;
  }
  return undefined;
}

export function evoTurn(s: GameState, side: Side): number {
  return side === s.first ? RULES.evoTurnFirst : RULES.evoTurnSecond;
}

export function superTurn(s: GameState, side: Side): number {
  return side === s.first ? RULES.superTurnFirst : RULES.superTurnSecond;
}

// ---------------------------------------------------------------- events & view

export function cardView(s: GameState, c: Card, zone: 'hand' | 'board'): CardView {
  const d = def(c.id);
  const pc = zone === 'hand' ? playCost(s, c) : { cost: d.cost, enhanced: false, mode: 'normal' as PlayMode };
  return {
    uid: c.uid,
    id: c.id,
    atk: zone === 'board' ? atkOf(s, c) : c.atk,
    hp: hpOf(c),
    maxHp: c.maxHp,
    kw: [...c.kw],
    evolved: c.evolved,
    cost: pc.cost,
    countdown: c.countdown,
    exp: c.exp,
    level: c.level,
    expNeed: d.level ? (c.level >= d.level.max ? 0 : d.level.exp) : 0,
    sick: zone === 'board' && c.enteredOn === s.turn,
    attacks: c.attacks,
    enhanced: pc.enhanced,
    trial: !!c.data.trial,
    boost: zone === 'hand' && d.spellboost ? c.data.sb ?? 0 : -1,
    mode: pc.mode,
    hold: c.hold,
  };
}

export function view(s: GameState): View {
  return {
    turn: s.turn,
    active: s.active,
    phase: s.phase,
    winner: s.winner,
    p: s.players.map((p) => ({
      hp: p.hp,
      maxHp: p.maxHp,
      pp: p.pp,
      maxPp: p.maxPp,
      ep: p.ep,
      sep: p.sep,
      dopa: p.dopa,
      fever: p.fever,
      likes: p.likes,
      sweet: p.sweet,
      parts: p.parts.length,
      treasures: p.treasures,
      harmonies: p.harmonies,
      broken: p.broken,
      rally: p.rally,
      discarded: p.discarded,
      reserveDraw: p.reserveDraw,
      chapter: p.chapter,
      flips: p.flips,
      crests: p.crests.map((c) => c.id),
      selfDmg: p.selfDmg,
      fulfilled: p.fulfilled,
      puppets: p.puppets,
      spells: p.stats.spells,
      accels: p.accels,
      crystals: p.crystals,
      enhances: p.enhances,
      luck: p.luck,
      kakuhen: p.kakuhen,
      combo: p.combo,
      deck: p.deck.length,
      turns: p.turns,
      evolvedThisTurn: p.evolvedThisTurn,
      hand: p.hand.map((c) => cardView(s, c, 'hand')),
      board: p.board.map((c) => cardView(s, c, 'board')),
    })) as View['p'],
  };
}

export function emit(s: GameState, ev: GameEvent): void {
  if (!s.record) return;
  ev.snap = view(s);
  s.events.push(ev);
}

// ---------------------------------------------------------------- setup

export interface GameSetup {
  decks: [string[], string[]];
  classes: [ClassId, ClassId];
  leaders: [string, string];
  first?: Side;
  seed?: number;
  hp?: [number, number];
  record?: boolean;
}

function emptyStats(): PlayerStats {
  return {
    dmgDealt: 0,
    leaderDmg: 0,
    maxHit: 0,
    kills: 0,
    maxCombo: 0,
    evolves: 0,
    supers: 0,
    fevers: 0,
    overkill: 0,
    cardsPlayed: 0,
    spells: 0,
    gachaRolls: 0,
    ssr: 0,
    healed: 0,
    levelUps: 0,
    buzzes: 0,
    summoned: 0,
    dmgBy: {},
    played: {},
  };
}

export function createGame(setup: GameSetup): GameState {
  const seed = setup.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s: GameState = {
    rng: seed,
    turn: 0,
    active: 0,
    first: 0,
    players: [null as unknown as Player, null as unknown as Player],
    phase: 'mulligan',
    winner: null,
    nextUid: 1,
    record: setup.record ?? true,
    events: [],
    mulliganDone: [false, false],
    depth: 0,
  };
  s.first = setup.first ?? (rnd(s) < 0.5 ? 0 : 1);
  for (const side of [0, 1] as Side[]) {
    const hp = setup.hp?.[side] ?? RULES.leaderHp;
    const p: Player = {
      side,
      cls: setup.classes[side],
      leader: setup.leaders[side],
      hp,
      maxHp: hp,
      pp: 0,
      maxPp: 0,
      ep: side === s.first ? RULES.epFirst : RULES.epSecond,
      sep: RULES.sep,
      evolvedThisTurn: false,
      deck: [],
      hand: [],
      board: [],
      grave: [],
      turns: 0,
      combo: 0,
      likes: 0,
      sweet: 0,
      luck: 0,
      kakuhen: 0,
      parts: [],
      treasures: 0,
      harmonies: 0,
      broken: 0,
      rally: 0,
      discarded: 0,
      reserveDraw: 0,
      chapter: 0,
      flips: 0,
      crests: [],
      selfDmg: 0,
      fulfilled: 0,
      puppets: 0,
      accels: 0,
      crystals: 0,
      enhances: 0,
      dopa: 0,
      fever: false,
      stats: emptyStats(),
    };
    s.players[side] = p;
    p.deck = shuffle(
      s,
      setup.decks[side].map((id) => makeCard(s, id, side)),
    );
  }
  s.active = s.first;
  emit(s, { t: 'start', first: s.first });
  for (const side of [s.first, other(s.first)]) draw(s, side, RULES.startHand);
  return s;
}

export function mulligan(s: GameState, side: Side, swap: number[]): void {
  if (s.phase !== 'mulligan' || s.mulliganDone[side]) return;
  const p = s.players[side];
  const out: Card[] = [];
  for (let i = 0; i < p.hand.length; i++) {
    const c = p.hand[i];
    if (!swap.includes(c.uid)) continue;
    const n = p.deck.shift();
    if (!n) continue;
    out.push(c);
    p.hand[i] = n;
  }
  p.deck.push(...out);
  shuffle(s, p.deck);
  s.mulliganDone[side] = true;
  emit(s, { t: 'mulligan', side, swapped: out.map((c) => c.uid) });
  if (s.mulliganDone[0] && s.mulliganDone[1]) {
    s.phase = 'main';
    startTurn(s, s.first);
  }
}

// ---------------------------------------------------------------- game over

function checkLeaders(s: GameState): void {
  if (s.winner !== null) return;
  const d0 = s.players[0].hp <= 0;
  const d1 = s.players[1].hp <= 0;
  if (!d0 && !d1) return;
  s.winner = d0 && d1 ? -1 : d0 ? 1 : 0;
  s.phase = 'over';
  emit(s, { t: 'gameOver', winner: s.winner, reason: 'hp' });
}

export function lose(s: GameState, side: Side, reason: 'deck' | 'concede'): void {
  if (s.winner !== null) return;
  s.winner = other(side);
  s.phase = 'over';
  emit(s, { t: 'gameOver', winner: s.winner, reason });
}

export const over = (s: GameState): boolean => s.phase === 'over';

// ---------------------------------------------------------------- dopa / fever

export function addDopa(s: GameState, side: Side, n: number): void {
  const p = s.players[side];
  if (n <= 0 || p.dopa >= RULES.dopaMax || over(s)) return;
  const before = p.dopa;
  p.dopa = Math.min(RULES.dopaMax, p.dopa + n);
  emit(s, { t: 'dopa', side, value: p.dopa, gain: p.dopa - before });
}

export function canFever(s: GameState): boolean {
  const p = s.players[s.active];
  return s.phase === 'main' && p.dopa >= RULES.dopaMax && !p.fever;
}

export function activateFever(s: GameState): boolean {
  if (!canFever(s)) return false;
  const p = s.players[s.active];
  p.dopa = 0;
  p.fever = true;
  p.stats.fevers++;
  emit(s, { t: 'fever', side: p.side });
  draw(s, p.side, 1, true);
  resolve(s);
  return true;
}

// ---------------------------------------------------------------- triggers

type HookName = {
  [K in keyof CardDef]-?: CardDef[K] extends Hook | undefined ? K : never;
}[keyof CardDef];

export function trigger(s: GameState, card: Card, hook: HookName, extra: TriggerExtra = {}): void {
  if (over(s)) return;
  const fn = def(card.id)[hook] as Hook | undefined;
  if (!fn) return;
  if (s.depth > 40) return;
  s.depth++;
  if (hook !== 'spell') emit(s, { t: 'trigger', uid: card.uid, kind: hook, side: card.owner });
  try {
    fn(new Ctx(s, card, extra));
  } finally {
    s.depth--;
  }
}

function boardTrigger(s: GameState, side: Side, hook: HookName, extra: TriggerExtra = {}, except?: Card): void {
  const p = s.players[side];
  for (const c of [...p.board]) {
    if (c === except || !alive(c) || !onBoard(s, c)) continue;
    if (def(c.id)[hook]) trigger(s, c, hook, extra);
  }
  // デコラー: 【クレスト】 sit on the leader and react like board cards
  for (const c of [...p.crests]) {
    if (c === except) continue;
    if (def(c.id)[hook]) trigger(s, c, hook, extra);
  }
}

// ---------------------------------------------------------------- primitives

export function damage(s: GameState, src: Card | null, tgt: Tgt, n: number, combat = false): number {
  if (over(s) || n <= 0) return 0;
  const srcSide: Side = src ? src.owner : s.active;
  const st = s.players[srcSide].stats;
  if (isLeaderTgt(tgt)) {
    const side = tgtSide(tgt);
    const p = s.players[side];
    const before = p.hp;
    p.hp -= n;
    const overkill = Math.max(0, n - Math.max(0, before));
    emit(s, { t: 'damage', target: tgt, amount: n, source: src?.uid ?? 0, overkill, combat, fatal: p.hp <= 0 });
    if (srcSide !== side) {
      if (src) st.dmgBy[src.id] = (st.dmgBy[src.id] ?? 0) + n;
      st.dmgDealt += n;
      st.leaderDmg += n;
      st.maxHit = Math.max(st.maxHit, n);
      if (n >= 5) addDopa(s, srcSide, DOPA.bigHit);
      addDopa(s, side, DOPA.hurt);
    }
    checkLeaders(s);
    if (!over(s)) boardTrigger(s, side, 'onLeaderHurt', { amount: n });
    return n;
  }
  const c = boardCard(s, tgt);
  if (!c || c.doomed || hpOf(c) <= 0) return 0;
  if (c.evolved === 2 && s.active === c.owner) {
    emit(s, { t: 'immune', uid: c.uid });
    return 0;
  }
  if (has(c, 'barrier')) {
    removeKw(c, 'barrier');
    emit(s, { t: 'barrier', uid: c.uid });
    return 0;
  }
  const before = hpOf(c);
  c.dmg += n;
  const overkill = Math.max(0, n - before);
  emit(s, { t: 'damage', target: tgt, amount: n, source: src?.uid ?? 0, overkill, combat, fatal: hpOf(c) <= 0 });
  if (srcSide !== c.owner) {
    if (src) st.dmgBy[src.id] = (st.dmgBy[src.id] ?? 0) + n;
    st.dmgDealt += n;
    st.maxHit = Math.max(st.maxHit, n);
    if (overkill > 0) st.overkill += overkill;
    if (overkill >= 2) addDopa(s, srcSide, DOPA.overkill);
  }
  return n;
}

export function healLeader(s: GameState, side: Side, n: number): number {
  if (over(s) || n <= 0) return 0;
  const p = s.players[side];
  const actual = Math.max(0, Math.min(n, p.maxHp - p.hp));
  p.hp += actual;
  p.stats.healed += actual;
  emit(s, { t: 'heal', target: leaderTgt(side), amount: actual });
  p.sweet += n;
  emit(s, { t: 'sweet', side, amount: n, total: p.sweet });
  boardTrigger(s, side, 'onHeal', { amount: n });
  return actual;
}

export function healUnit(s: GameState, c: Card, n: number): number {
  if (over(s) || n <= 0 || !onBoard(s, c)) return 0;
  const actual = Math.min(n, c.dmg);
  c.dmg -= actual;
  emit(s, { t: 'heal', target: c.uid, amount: actual });
  return actual;
}

export function buff(s: GameState, c: Card, a: number, h: number): void {
  if (over(s) || (a === 0 && h === 0)) return;
  c.atk = Math.max(0, c.atk + a);
  c.maxHp += h;
  emit(s, { t: 'buff', uid: c.uid, atk: a, hp: h });
}

export function giveKw(s: GameState, c: Card, kw: Keyword): void {
  if (has(c, kw)) return;
  addKw(c, kw);
  emit(s, { t: 'keyword', uid: c.uid, kw });
}

function placeOnBoard(s: GameState, c: Card, fromHand: boolean): void {
  const p = s.players[c.owner];
  c.enteredOn = s.turn;
  c.attacks = 0;
  p.board.push(c);
  if (isFollower(c)) {
    p.stats.summoned++;
    p.rally++;
    if (def(c.id).tags?.includes('puppet')) {
      p.puppets++;
      emit(s, { t: 'puppet', side: c.owner, total: p.puppets });
    }
  }
  emit(s, { t: 'summon', side: c.owner, uid: c.uid, fromHand });
  if (isFollower(c)) {
    emit(s, { t: 'rally', side: c.owner, total: p.rally });
    boardTrigger(s, c.owner, 'onSummon', { other: c }, c);
  }
}

export function summon(s: GameState, side: Side, id: string, n = 1): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (over(s) || s.players[side].board.length >= RULES.boardMax) break;
    const c = makeCard(s, id, side);
    placeOnBoard(s, c, false);
    out.push(c);
  }
  return out;
}

export function draw(s: GameState, side: Side, n = 1, fromEffect = false): Card[] {
  const p = s.players[side];
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (over(s)) break;
    const c = p.deck.shift();
    if (!c) {
      emit(s, { t: 'deckout', side });
      lose(s, side, 'deck');
      break;
    }
    if (p.hand.length >= RULES.handMax) {
      p.grave.push(c);
      emit(s, { t: 'burn', side, uid: c.uid, id: c.id });
      continue;
    }
    p.hand.push(c);
    emit(s, { t: 'draw', side, uid: c.uid, fromEffect });
    out.push(c);
  }
  return out;
}

export function addHand(s: GameState, side: Side, id: string, n = 1): Card[] {
  const p = s.players[side];
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (over(s)) break;
    const c = makeCard(s, id, side);
    if (p.hand.length >= RULES.handMax) {
      emit(s, { t: 'burn', side, uid: c.uid, id: c.id });
      continue;
    }
    p.hand.push(c);
    emit(s, { t: 'addHand', side, uid: c.uid });
    out.push(c);
  }
  return out;
}

export function destroy(s: GameState, c: Card): void {
  if (onBoard(s, c) && alive(c)) c.doomed = true;
}

export function banish(s: GameState, c: Card): void {
  const p = s.players[c.owner];
  const i = p.board.indexOf(c);
  if (i < 0) return;
  p.board.splice(i, 1);
  emit(s, { t: 'destroy', uid: c.uid, side: c.owner, banish: true });
}

function resetCard(c: Card, id: string): void {
  const d = def(id);
  c.id = id;
  c.atk = d.atk ?? 0;
  c.maxHp = d.hp ?? 0;
  c.dmg = 0;
  c.kw = [...(d.kw ?? [])];
  c.evolved = 0;
  c.tmpAtk = 0;
  c.countdown = d.countdown ?? -1;
  c.exp = 0;
  c.level = 1;
  c.costMod = 0;
  c.data = {};
  c.doomed = false;
}

export function bounce(s: GameState, c: Card): void {
  const p = s.players[c.owner];
  const i = p.board.indexOf(c);
  if (i < 0 || !alive(c)) return;
  p.board.splice(i, 1);
  resetCard(c, c.hold ?? c.id);
  c.hold = undefined;
  c.enteredOn = -1;
  c.attacks = 0;
  if (p.hand.length >= RULES.handMax) {
    emit(s, { t: 'destroy', uid: c.uid, side: c.owner, banish: true });
    return;
  }
  p.hand.push(c);
  emit(s, { t: 'bounce', uid: c.uid, side: c.owner });
}

export function transform(s: GameState, c: Card, id: string): void {
  if (!onBoard(s, c)) return;
  resetCard(c, id);
  emit(s, { t: 'transform', uid: c.uid, id });
}

export function resolve(s: GameState): void {
  for (let guard = 0; guard < 30; guard++) {
    if (over(s)) return;
    const dead: Card[] = [];
    for (const side of [s.active, other(s.active)]) {
      for (const c of s.players[side].board) {
        if (c.doomed || (isFollower(c) && hpOf(c) <= 0)) dead.push(c);
      }
    }
    if (!dead.length) return;
    for (const c of dead) {
      const p = s.players[c.owner];
      const i = p.board.indexOf(c);
      if (i < 0) continue;
      p.board.splice(i, 1);
      p.grave.push(c);
      p.broken++;
      emit(s, { t: 'destroy', uid: c.uid, side: c.owner });
      emit(s, { t: 'broken', side: c.owner, total: p.broken });
      if (isFollower(c)) {
        const killer = other(c.owner);
        s.players[killer].stats.kills++;
        addDopa(s, killer, DOPA.kill);
      }
    }
    for (const c of dead) {
      trigger(s, c, 'lastWords');
      if (isFollower(c)) boardTrigger(s, c.owner, 'onAllyDestroyed', { other: c });
      boardTrigger(s, c.owner, 'onBreak', { other: c });
      boardTrigger(s, other(c.owner), 'onEnemyBreak', { other: c });
    }
  }
}

// ---------------------------------------------------------------- class mechanics

export function gachaRoll(s: GameState, src: Card): GachaTier {
  const p = s.players[src.owner];
  let tier: GachaTier;
  let ceiling = false;
  let kakuhen = false;
  if (p.luck >= RULES.luckCeiling) {
    tier = 'SSR';
    ceiling = true;
  } else {
    const r = rnd(s);
    if (p.kakuhen > 0) {
      p.kakuhen--;
      kakuhen = true;
      tier = r < 0.2 + 0.06 * p.luck ? 'SSR' : 'SR';
    } else {
      const ssr = 0.03 + 0.03 * p.luck;
      tier = r < ssr ? 'SSR' : r < ssr + 0.15 ? 'SR' : r < ssr + 0.45 ? 'R' : 'N';
    }
  }
  if (tier === 'SSR') {
    p.luck = 0;
    p.stats.ssr++;
  } else {
    p.luck = Math.min(RULES.luckCeiling, p.luck + 1);
  }
  p.stats.gachaRolls++;
  emit(s, { t: 'gacha', side: p.side, uid: src.uid, tier, luck: p.luck, ceiling, kakuhen });
  return tier;
}

export function gainLikes(s: GameState, side: Side, n: number): void {
  if (n === 0 || over(s)) return;
  const p = s.players[side];
  p.likes = Math.max(0, p.likes + n);
  emit(s, { t: 'likes', side, amount: n, total: p.likes });
}

export function gainExp(s: GameState, c: Card, n: number): void {
  const L = def(c.id).level;
  if (!L || n <= 0 || over(s) || !onBoard(s, c) || !alive(c) || c.level >= L.max) return;
  c.exp += n;
  emit(s, { t: 'exp', uid: c.uid, exp: Math.min(c.exp, L.exp), need: L.exp });
  while (c.exp >= L.exp && c.level < L.max) {
    c.exp -= L.exp;
    c.level++;
    c.atk += L.gain[0];
    c.maxHp += L.gain[1];
    s.players[c.owner].stats.levelUps++;
    emit(s, { t: 'levelUp', uid: c.uid, level: c.level });
    // level-ups also restore the follower to full health
    if (c.dmg > 0) healUnit(s, c, c.dmg);
    addDopa(s, c.owner, 1);
    trigger(s, c, 'onLevelUp');
  }
  if (c.level >= L.max) c.exp = 0;
}

// ---------------------------------------------------------------- turn flow

function tickCountdown(s: GameState, side: Side): void {
  for (const c of [...s.players[side].board]) {
    if (def(c.id).type !== 'amulet' || c.countdown <= 0) continue;
    c.countdown--;
    emit(s, { t: 'countdown', uid: c.uid, value: c.countdown });
    if (c.countdown === 0) expire(s, c);
  }
  resolve(s);
}

/** an amulet's countdown reached 0: it will be destroyed — オマモラー calls that 【成就】 */
export function expire(s: GameState, c: Card): void {
  if (c.doomed) return;
  c.doomed = true;
  const p = s.players[c.owner];
  p.fulfilled++;
  emit(s, { t: 'fulfill', side: c.owner, uid: c.uid, id: c.id, total: p.fulfilled });
  boardTrigger(s, c.owner, 'onFulfill', { other: c }, c);
}

/** ノベラー: turn the page (or open a given chapter; no flip if it's already open) */
export function flipChapter(s: GameState, side: Side, to?: 0 | 1): boolean {
  const p = s.players[side];
  const next = to ?? ((p.chapter ^ 1) as 0 | 1);
  if (next === p.chapter) return false;
  p.chapter = next;
  p.flips++;
  emit(s, { t: 'flip', side, chapter: next, total: p.flips });
  boardTrigger(s, side, 'onFlip');
  return true;
}

/** デコラー: put a 【クレスト】 on the leader (max 8) */
export function addCrest(s: GameState, side: Side, id: string): Card | undefined {
  const p = s.players[side];
  if (p.crests.length >= 8) return undefined;
  const c = makeCard(s, id, side);
  p.crests.push(c);
  emit(s, { t: 'crest', side, id, total: p.crests.length });
  boardTrigger(s, side, 'onCrest', { other: c });
  return c;
}

export function startTurn(s: GameState, side: Side): void {
  s.active = side;
  s.turn++;
  const p = s.players[side];
  p.turns++;
  p.maxPp = Math.min(RULES.ppMax, p.maxPp + 1);
  p.pp = p.maxPp;
  p.evolvedThisTurn = false;
  p.combo = 0;
  p.fever = false;
  for (const c of p.board) c.attacks = 0;
  emit(s, { t: 'turnStart', side, turn: s.turn, ownTurn: p.turns });
  if (p.turns === evoTurn(s, side)) emit(s, { t: 'unlock', side, kind: 'evolve' });
  if (p.turns === superTurn(s, side)) emit(s, { t: 'unlock', side, kind: 'super' });
  draw(s, side, side !== s.first && p.turns === 1 ? 2 : 1);
  if (over(s)) return;
  if (p.reserveDraw > 0) {
    const n = p.reserveDraw;
    p.reserveDraw = 0;
    emit(s, { t: 'reserveDraw', side, n });
    draw(s, side, n, true);
    if (over(s)) return;
  }
  tickCountdown(s, side);
  boardTrigger(s, side, 'turnStart');
  resolve(s);
}

export function endTurn(s: GameState): void {
  if (s.phase !== 'main') return;
  const side = s.active;
  boardTrigger(s, side, 'turnEnd');
  resolve(s);
  if (over(s)) return;
  for (const p of s.players) for (const c of p.board) c.tmpAtk = 0;
  // 人形 only last until the end of the opponent's turn
  for (const c of [...s.players[other(side)].board]) if (def(c.id).fleeting && alive(c)) banish(s, c);
  s.players[side].fever = false;
  emit(s, { t: 'turnEnd', side });
  startTurn(s, other(side));
}

// ---------------------------------------------------------------- legality helpers

export function costOf(s: GameState, c: Card): number {
  const d = def(c.id);
  let v = d.cost + c.costMod + (d.costFn ? d.costFn(s, c) : 0);
  if (s.players[c.owner].fever) v -= 1;
  return Math.max(0, v);
}

export function playCost(s: GameState, c: Card): { cost: number; enhanced: boolean; mode: PlayMode } {
  const base = costOf(s, c);
  const d = def(c.id);
  const p = s.players[c.owner];
  const fv = p.fever ? 1 : 0;
  if (d.enhance !== undefined) {
    const ec = Math.max(0, d.enhance - fv);
    if (p.pp >= ec && ec > base) return { cost: ec, enhanced: true, mode: 'enhance' };
  }
  if (p.pp < base) {
    // 【アクセラレート】/【結晶】 only kick in when the normal cost can't be paid
    if (d.accel !== undefined) {
      const ac = Math.max(0, d.accel - fv);
      if (p.pp >= ac) return { cost: ac, enhanced: false, mode: 'accel' };
    }
    if (d.crystal !== undefined) {
      const cc = Math.max(0, d.crystal - fv);
      if (p.pp >= cc) return { cost: cc, enhanced: false, mode: 'crystal' };
    }
  }
  return { cost: base, enhanced: false, mode: 'normal' };
}

export function validTargets(s: GameState, side: Side, spec: TargetSpec, exclude?: number): Tgt[] {
  const me = s.players[side];
  const opp = s.players[other(side)];
  const enemyOk = (c: Card) => isFollower(c) && alive(c) && !has(c, 'ambush') && !has(c, 'aura');
  const allyOk = (c: Card) => isFollower(c) && alive(c) && c.uid !== exclude;
  let cards: Card[] = [];
  const leaders: Tgt[] = [];
  switch (spec.kind) {
    case 'enemyFollower':
      cards = opp.board.filter(enemyOk);
      break;
    case 'allyFollower':
      cards = me.board.filter(allyOk);
      break;
    case 'anyFollower':
      cards = [...me.board.filter(allyOk), ...opp.board.filter(enemyOk)];
      break;
    case 'enemyAny':
      cards = opp.board.filter(enemyOk);
      leaders.push(leaderTgt(opp.side));
      break;
    case 'any':
      cards = [...me.board.filter(allyOk), ...opp.board.filter(enemyOk)];
      leaders.push(leaderTgt(opp.side), leaderTgt(me.side));
      break;
  }
  if (spec.filter) cards = cards.filter((c) => spec.filter!(s, c));
  return [...cards.map((c) => c.uid), ...leaders];
}

export function needsPlayTarget(s: GameState, c: Card): TargetSpec | null {
  const d = def(c.id);
  if (!d.target) return null;
  const { enhanced, mode } = playCost(s, c);
  if (mode === 'accel' || mode === 'crystal') return null;
  const info = { enhanced, mode, combo: s.players[c.owner].combo };
  if (d.target.cond && !d.target.cond(s, c, info)) return null;
  return d.target;
}

/** null = no target needed. [] = target wanted but none available. */
export function playTargets(s: GameState, c: Card): Tgt[] | null {
  const spec = needsPlayTarget(s, c);
  if (!spec) return null;
  return validTargets(s, c.owner, spec, c.uid);
}

export function canPlay(s: GameState, c: Card): boolean {
  if (s.phase !== 'main' || c.owner !== s.active) return false;
  const p = s.players[c.owner];
  if (!p.hand.includes(c)) return false;
  const pc = playCost(s, c);
  if (pc.cost > p.pp) return false;
  const d = def(c.id);
  const asSpell = d.type === 'spell' || pc.mode === 'accel';
  if (!asSpell && p.board.length >= RULES.boardMax) return false;
  if (d.type === 'spell') {
    const ts = playTargets(s, c);
    if (ts && ts.length === 0) return false;
  }
  return true;
}

export function canAttack(s: GameState, c: Card): boolean {
  if (s.phase !== 'main' || c.owner !== s.active || !isFollower(c) || !alive(c)) return false;
  if (!onBoard(s, c)) return false;
  if (c.data.noAttack) return false;
  return c.attacks < (has(c, 'twin') ? 2 : 1);
}

export function attackTargets(s: GameState, c: Card): Tgt[] {
  if (!canAttack(s, c)) return [];
  const sick = c.enteredOn === s.turn;
  const canFace = !sick || has(c, 'storm');
  const canFollowers = !sick || has(c, 'storm') || has(c, 'rush') || c.evolved > 0;
  const opp = s.players[other(c.owner)];
  const targetable = opp.board.filter((o) => isFollower(o) && alive(o) && !has(o, 'ambush'));
  const wards = targetable.filter((o) => has(o, 'ward'));
  const out: Tgt[] = [];
  if (canFollowers) out.push(...(wards.length ? wards : targetable).map((o) => o.uid));
  if (canFace && !wards.length) out.push(leaderTgt(opp.side));
  return out;
}

export function canEvolve(s: GameState, c: Card, sup: boolean): boolean {
  if (s.phase !== 'main' || c.owner !== s.active) return false;
  const p = s.players[c.owner];
  if (!p.board.includes(c) || !isFollower(c) || !alive(c) || c.evolved !== 0) return false;
  if (def(c.id).noEvolve || p.evolvedThisTurn) return false;
  return sup ? p.sep > 0 && p.turns >= superTurn(s, c.owner) : p.ep > 0 && p.turns >= evoTurn(s, c.owner);
}

export function evoTargets(s: GameState, c: Card): Tgt[] | null {
  const d = def(c.id);
  if (!d.evoTarget) return null;
  const info = { enhanced: false, mode: 'normal' as PlayMode, combo: s.players[c.owner].combo };
  if (d.evoTarget.cond && !d.evoTarget.cond(s, c, info)) return null;
  return validTargets(s, c.owner, d.evoTarget, c.uid);
}

// ---------------------------------------------------------------- actions

export function playCard(s: GameState, uid: number, target?: Tgt, discardPick?: number[]): boolean {
  const p = s.players[s.active];
  const c = p.hand.find((x) => x.uid === uid);
  if (!c || !canPlay(s, c)) return false;
  const d = def(c.id);
  const { cost, enhanced, mode } = playCost(s, c);
  const ts = playTargets(s, c);
  let tgt: Tgt | null = null;
  if (ts && ts.length) {
    if (target === undefined || !ts.includes(target)) return false;
    tgt = target;
  }
  const comboBefore = p.combo;
  p.pp -= cost;
  p.hand.splice(p.hand.indexOf(c), 1);
  p.combo++;
  p.stats.cardsPlayed++;
  if (!def(c.id).token) p.stats.played[c.id] = (p.stats.played[c.id] ?? 0) + 1;
  p.stats.maxCombo = Math.max(p.stats.maxCombo, p.combo);
  emit(s, { t: 'play', side: p.side, uid: c.uid, id: c.id, target: tgt, enhanced, combo: p.combo, mode });
  if (p.combo >= 2) emit(s, { t: 'combo', side: p.side, count: p.combo });
  if (enhanced) {
    p.enhances++;
    emit(s, { t: 'enhance', side: p.side, uid: c.uid });
  }
  gainLikes(s, p.side, 1);
  addDopa(s, p.side, DOPA.play);
  // ステラー: the hand cards the player chose to discard (validated; the rest is auto-picked)
  const picks = d.discardPick ? [...new Set(discardPick ?? [])].filter((u) => u !== c.uid && p.hand.some((x) => x.uid === u)).slice(0, d.discardPick) : undefined;
  const extra: TriggerExtra = { target: tgt, enhanced, combo: comboBefore, mode, discard: picks };
  let castSpell = false;
  if (mode === 'accel') {
    // played as a spell: the follower itself goes to the graveyard
    p.accels++;
    p.stats.spells++;
    castSpell = true;
    emit(s, { t: 'accel', side: p.side, uid: c.uid, id: c.id });
    emit(s, { t: 'spell', side: p.side, uid: c.uid, id: c.id, target: null });
    trigger(s, c, 'accelerate', extra);
    p.grave.push(c);
  } else if (mode === 'crystal') {
    // a 「結晶」 amulet that hatches into this follower when its countdown ends
    p.crystals++;
    const cr = makeCard(s, 't_crystal', p.side);
    cr.hold = c.id;
    cr.countdown = d.crystalCd ?? 2;
    emit(s, { t: 'crystal', side: p.side, uid: c.uid, id: c.id });
    placeOnBoard(s, cr, true);
  } else if (d.type === 'spell') {
    p.stats.spells++;
    castSpell = true;
    emit(s, { t: 'spell', side: p.side, uid: c.uid, id: c.id, target: tgt });
    trigger(s, c, 'spell', extra);
    p.grave.push(c);
  } else {
    placeOnBoard(s, c, true);
    trigger(s, c, 'fanfare', extra);
  }
  if (castSpell) boostHand(s, p.side, 1);
  resolve(s);
  if (d.tags?.includes('part')) addPart(s, p.side, c.id);
  if (d.tags?.includes('treasure')) {
    p.treasures++;
    emit(s, { t: 'treasure', side: p.side, id: c.id, total: p.treasures });
  }
  boardTrigger(s, p.side, 'onPlay', { other: c, mode }, c);
  resolve(s);
  return true;
}

/** スペラー: +n 【スペルブースト】 on every spellboost card in the hand */
export function boostHand(s: GameState, side: Side, n: number): void {
  const p = s.players[side];
  const uids: number[] = [];
  for (const h of p.hand) {
    if (!def(h.id).spellboost) continue;
    h.data.sb = (h.data.sb ?? 0) + n;
    uids.push(h.uid);
  }
  if (uids.length) emit(s, { t: 'boost', side, uids });
}

/** ステラー: discard a card from the hand (triggers its 【捨てられた時】) */
export function discard(s: GameState, c: Card): void {
  const p = s.players[c.owner];
  const i = p.hand.indexOf(c);
  if (i < 0) return;
  p.hand.splice(i, 1);
  p.grave.push(c);
  p.discarded++;
  emit(s, { t: 'discard', side: c.owner, uid: c.uid, id: c.id });
  trigger(s, c, 'onDiscard');
  boardTrigger(s, c.owner, 'onAnyDiscard', { other: c });
}

/** ジュエラー: a 「結晶」 hatches — summon the follower inside (no fanfare) */
export function hatch(s: GameState, cr: Card): Card | undefined {
  if (!cr.hold) return undefined;
  const [c] = summon(s, cr.owner, cr.hold, 1);
  if (!c) return undefined;
  // a hatched follower wakes up with 《突進》: it can hit followers right away, not the leader
  c.enteredOn = s.turn;
  emit(s, { t: 'hatch', side: c.owner, uid: c.uid, id: c.id });
  giveKw(s, c, 'rush');
  trigger(s, c, 'onHatch');
  return c;
}

/** ガジェッター: remember a パーツ type as started (played or 合体'd) */
export function addPart(s: GameState, side: Side, id: string): void {
  const p = s.players[side];
  if (p.parts.includes(id)) return;
  p.parts.push(id);
  emit(s, { t: 'parts', side, id, total: p.parts.length });
}

export function attack(s: GameState, uid: number, target: Tgt): boolean {
  const a = s.players[s.active].board.find((x) => x.uid === uid);
  if (!a || !attackTargets(s, a).includes(target)) return false;
  a.attacks++;
  removeKw(a, 'ambush');
  emit(s, { t: 'attack', uid: a.uid, target });
  trigger(s, a, 'strike', { target });
  let d: Card | undefined;
  if (!isLeaderTgt(target)) {
    d = boardCard(s, target);
    if (d) {
      trigger(s, a, 'clash', { other: d, target });
      trigger(s, d, 'clash', { other: a, target: a.uid });
    }
  }
  resolve(s);
  if (over(s) || !onBoard(s, a) || !alive(a)) return true;
  if (isLeaderTgt(target)) {
    const dealt = damage(s, a, target, atkOf(s, a), true);
    if (dealt > 0 && has(a, 'drain')) healLeader(s, a.owner, dealt);
    gainExp(s, a, 1);
  } else {
    if (!d || !onBoard(s, d) || !alive(d)) return true;
    const aa = atkOf(s, a);
    const da = atkOf(s, d);
    const toD = damage(s, a, d.uid, aa, true);
    const toA = damage(s, d, a.uid, da, true);
    if (toD > 0 && has(a, 'bane')) d.doomed = true;
    if (toA > 0 && has(d, 'bane')) a.doomed = true;
    if (toD > 0 && has(a, 'drain')) healLeader(s, a.owner, toD);
    const killed = !alive(d);
    gainExp(s, a, killed ? 2 : 1);
    if (killed && a.evolved === 2 && alive(a)) damage(s, a, leaderTgt(d.owner), 1);
  }
  resolve(s);
  return true;
}

export function evolve(s: GameState, uid: number, sup: boolean, target?: Tgt): boolean {
  const p = s.players[s.active];
  const c = p.board.find((x) => x.uid === uid);
  if (!c || !canEvolve(s, c, sup)) return false;
  const ts = evoTargets(s, c);
  let tgt: Tgt | null = null;
  if (ts && ts.length) {
    if (target === undefined || !ts.includes(target)) return false;
    tgt = target;
  }
  p.evolvedThisTurn = true;
  if (sup) p.sep--;
  else p.ep--;
  applyEvolve(s, c, sup, tgt);
  resolve(s);
  return true;
}

/** レンジャー: evolve a follower by a card effect (no evolve point, no once-per-turn limit) */
export function evolveFree(s: GameState, c: Card, sup = false): boolean {
  if (!onBoard(s, c) || !isFollower(c) || !alive(c) || c.evolved !== 0 || def(c.id).noEvolve) return false;
  const ts = evoTargets(s, c);
  const tgt = ts && ts.length ? ts[rndInt(s, ts.length)] : null;
  applyEvolve(s, c, sup, tgt);
  trigger(s, c, 'onTransform', { target: tgt });
  return true;
}

function applyEvolve(s: GameState, c: Card, sup: boolean, tgt: Tgt | null): void {
  const p = s.players[c.owner];
  const d = def(c.id);
  const [ea, eh] = d.evo ?? [(d.atk ?? 0) + 2, (d.hp ?? 0) + 2];
  let da = ea - (d.atk ?? 0);
  let dh = eh - (d.hp ?? 0);
  if (sup) {
    da++;
    dh++;
  }
  c.atk += da;
  c.maxHp += dh;
  c.evolved = sup ? 2 : 1;
  for (const kw of d.evoKw ?? []) addKw(c, kw);
  if (sup) p.stats.supers++;
  else p.stats.evolves++;
  emit(s, { t: 'evolve', uid: c.uid, side: p.side, sup });
  addDopa(s, p.side, sup ? DOPA.super : DOPA.evolve);
  trigger(s, c, 'evolve', { target: tgt });
  if (sup) trigger(s, c, 'superEvolve', { target: tgt });
  boardTrigger(s, p.side, 'onAllyEvolve', { other: c }, c);
}
