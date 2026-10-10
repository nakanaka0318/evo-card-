import { apply, cloneForSim, legalActions } from './actions';
import * as E from './core';
import { def } from './defs';
import { RULES } from './rules';
import type { Action, Card, GameState, Player, Side } from './types';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'oni';

export interface AiProfile {
  difficulty: Difficulty;
  /** weight on enemy leader HP (aggression) */
  aggro?: number;
  /** override search settings (tuning / tests) */
  tune?: Partial<SearchCfg>;
}

interface SearchCfg {
  beam: number;
  depth: number;
  noise: number;
  budget: number;
  reply: number;
  /** random-outcome samples for first actions */
  samples: number;
}

const DIFF: Record<Difficulty, SearchCfg> = {
  easy: { beam: 2, depth: 3, noise: 2.5, budget: 400, reply: 0, samples: 1 },
  normal: { beam: 4, depth: 6, noise: 0.3, budget: 1200, reply: 2, samples: 3 },
  hard: { beam: 6, depth: 8, noise: 0, budget: 2400, reply: 4, samples: 4 },
  oni: { beam: 8, depth: 10, noise: 0, budget: 4000, reply: 6, samples: 5 },
};

/** evaluation weights (exported so tuning scripts can try variations) */
export const W = {
  hand: 1.1,
  oppHand: 0.6,
  lethalThreat: 18,
  threat: 0.25,
  myLethal: 6,
};

function hpVal(h: number): number {
  if (h <= 0) return -60;
  return h + (h < 10 ? (10 - h) * -0.7 : 0);
}

function unitVal(s: GameState, c: Card): number {
  const d = def(c.id);
  if (d.type === 'amulet') {
    if (c.hold) {
      // 「結晶」: worth a discounted share of the follower sleeping inside
      const hd = def(c.hold);
      const full = (hd.atk ?? 0) * 1.05 + (hd.hp ?? 0) * 0.95 + 0.6;
      return full * (c.countdown <= 1 ? 0.75 : c.countdown === 2 ? 0.6 : 0.45);
    }
    const base = d.aiValue ?? 2;
    return c.countdown > 0 ? base * Math.min(1, 0.4 + c.countdown * 0.25) : base;
  }
  const atk = E.atkOf(s, c) - (s.players[c.owner].fever && s.active === c.owner ? 1 : 0);
  const hp = E.hpOf(c);
  if (hp <= 0 || c.doomed) return 0;
  let v = atk * 1.05 + hp * 0.95 + 0.6;
  for (const k of c.kw) {
    if (k === 'ward') v += 1 + hp * 0.15;
    else if (k === 'bane') v += 2;
    else if (k === 'drain') v += atk * 0.3;
    else if (k === 'ambush') v += 1;
    else if (k === 'barrier') v += 1.5;
    else if (k === 'aura') v += 1;
    else if (k === 'twin') v += atk * 0.7;
  }
  if (d.level && c.level < d.level.max) v += 0.6 + c.exp * 0.4;
  if (d.lastWords) v += 1;
  if (d.turnEnd || d.turnStart || d.onPlay || d.onHeal || d.onSummon) v += 1.2;
  return v;
}

function boardVal(s: GameState, p: Player): number {
  let v = 0;
  for (const c of p.board) v += unitVal(s, c);
  return v;
}

function faceThreat(s: GameState, attacker: Player): number {
  let n = 0;
  for (const c of attacker.board) {
    if (!E.isFollower(c) || !E.alive(c) || c.data.noAttack) continue;
    n += c.atk * (E.has(c, 'twin') ? 2 : 1);
  }
  return n;
}

export function evaluate(s: GameState, me: Side, aggro = 1): number {
  if (s.winner !== null) return s.winner === me ? 1e6 : s.winner === -1 ? -5e5 : -1e6;
  const P = s.players[me];
  const O = s.players[E.other(me)];
  let v = 0;
  v += hpVal(P.hp) - hpVal(O.hp) * aggro;
  v += boardVal(s, P) - boardVal(s, O);
  v += Math.min(P.hand.length, RULES.handMax) * W.hand - Math.min(O.hand.length, RULES.handMax) * W.oppHand;
  // cards with a cheap alternative mode (アクセラレート/結晶) are worth their full cost while held,
  // so the search doesn't throw a big follower away as a small effect too early
  for (const c of P.hand) {
    const d = def(c.id);
    if (d.accel !== undefined || d.crystal !== undefined) v += Math.min(d.cost, 9) * 0.35;
  }
  v += P.ep * 1.6 + P.sep * 2.4;
  v += Math.min(P.reserveDraw, RULES.handMax - P.hand.length) * W.hand * 0.9;
  v += P.dopa * 0.2 + (P.dopa >= RULES.dopaMax && !P.fever ? 1.5 : 0);
  v += Math.min(P.likes, 15) * 0.25 + P.luck * 0.35 + P.kakuhen * 1.2 + Math.min(P.sweet, 25) * 0.06;
  v += Math.min(P.maxPp, 10) * 0.6;
  const myWards = P.board.some((c) => E.has(c, 'ward') && E.alive(c));
  const oppWards = O.board.some((c) => E.has(c, 'ward') && E.alive(c));
  const threat = faceThreat(s, O);
  if (!myWards) {
    if (threat >= P.hp) v -= W.lethalThreat;
    else v -= threat * W.threat;
  }
  const mine = faceThreat(s, P);
  if (!oppWards && mine >= O.hp) v += W.myLethal;
  if (P.deck.length <= 2) v -= (3 - P.deck.length) * 4;
  return v;
}

function prepRoot(s: GameState): GameState {
  const c = cloneForSim(s, true);
  // never peek at hidden information: reshuffle both decks
  for (const p of c.players) E.shuffle(c, p.deck);
  return c;
}

interface Node {
  st: GameState;
  seq: Action[];
  v: number;
}

/** play out the opponent's greedy reply turn and score the result for `me` */
function afterReply(st: GameState, me: Side, aggro: number): number {
  const c = cloneForSim(st, false);
  apply(c, { t: 'end' });
  for (let guard = 0; c.phase === 'main' && c.active !== me && guard < 12; guard++) {
    const opp = c.active;
    let best: Action = { t: 'end' };
    let bv = evaluate(c, opp);
    for (const a of legalActions(c)) {
      if (a.t === 'end') continue;
      const cc = cloneForSim(c, false);
      apply(cc, a);
      const v = evaluate(cc, opp);
      if (v > bv + 0.05) {
        bv = v;
        best = a;
      }
    }
    apply(c, best);
    if (best.t === 'end') break;
  }
  return evaluate(c, me, aggro);
}

/** Choose the next action for the active player. */
export function chooseAction(s: GameState, prof: AiProfile): Action {
  const me = s.active;
  const cfg = { ...DIFF[prof.difficulty], ...prof.tune };
  const aggro = prof.aggro ?? 1;
  const root = prepRoot(s);
  const baseV = evaluate(root, me, aggro);
  let budget: number = cfg.budget;
  let beam: Node[] = [{ st: root, seq: [], v: baseV }];
  let best: Node = beam[0];
  // best leaf found for each distinct first action (for the 2-ply re-score)
  const byFirst = new Map<string, Node>();
  for (let depth = 0; depth < cfg.depth && budget > 0; depth++) {
    const next: Node[] = [];
    for (const node of beam) {
      const acts = legalActions(node.st);
      for (const a of acts) {
        if (a.t === 'end') continue;
        if (budget-- <= 0) break;
        const c = cloneForSim(node.st, false);
        apply(c, a);
        let v = evaluate(c, me, aggro);
        if (depth === 0 && cfg.samples > 1) {
          // random effects (gacha, dice, random pings): average a few rolls so
          // the plan isn't chosen for one lucky simulated outcome
          for (let k = 1; k < cfg.samples; k++) {
            const alt = cloneForSim(node.st, false);
            alt.rng = (alt.rng + k * 0x9e3779b9) >>> 0;
            apply(alt, a);
            v += evaluate(alt, me, aggro);
          }
          v /= cfg.samples;
        }
        if (cfg.noise && depth === 0) v += (Math.random() - 0.5) * cfg.noise;
        const n: Node = { st: c, seq: [...node.seq, a], v };
        next.push(n);
        if (cfg.reply) {
          const key = JSON.stringify(n.seq[0]);
          const prev = byFirst.get(key);
          if (!prev || prev.v < v) byFirst.set(key, n);
        }
      }
    }
    if (!next.length) break;
    next.sort((a, b) => b.v - a.v);
    beam = next.slice(0, cfg.beam);
    if (beam[0].v > best.v) best = beam[0];
    if (best.v >= 1e6) break;
  }
  if (best.v >= 1e6) return best.seq[0];
  if (cfg.reply && byFirst.size) {
    // re-score the top candidate plans by the opponent's best reply
    // blend with the static score: the reply alone over-rewards passivity
    // (cards kept in hand are always "safe" from the opponent's turn)
    const cands = [...byFirst.values()].sort((a, b) => b.v - a.v).slice(0, cfg.reply);
    let pick: Action = { t: 'end' };
    let pv = (baseV + afterReply(root, me, aggro)) / 2 + 0.05;
    for (const n of cands) {
      if (n.st.phase === 'over') continue;
      const v = (n.v + afterReply(n.st, me, aggro)) / 2;
      if (v > pv) {
        pv = v;
        pick = n.seq[0];
      }
    }
    return pick;
  }
  if (!best.seq.length || best.v <= baseV + 0.05) return { t: 'end' };
  return best.seq[0];
}

export function chooseMulligan(s: GameState, side: Side, prof: AiProfile): number[] {
  const hand = s.players[side].hand;
  if (prof.difficulty === 'easy') return hand.filter(() => Math.random() < 0.3).map((c) => c.uid);
  const swap: number[] = [];
  let keptCheap = 0;
  for (const c of hand) if (def(c.id).cost <= 2) keptCheap++;
  for (const c of hand) {
    const cost = def(c.id).cost;
    if (cost >= 5 || (cost >= 4 && keptCheap === 0)) swap.push(c.uid);
  }
  return swap;
}
