import * as E from './core';
import type { Action, GameEvent, GameState } from './types';

/** Apply an action, returning the events it produced (empty if illegal). */
export function apply(s: GameState, a: Action): GameEvent[] {
  s.events = [];
  switch (a.t) {
    case 'mulligan':
      E.mulligan(s, a.side, a.swap);
      break;
    case 'play':
      E.playCard(s, a.uid, a.target);
      break;
    case 'attack':
      E.attack(s, a.uid, a.target);
      break;
    case 'evolve':
      E.evolve(s, a.uid, a.sup, a.target);
      break;
    case 'fever':
      E.activateFever(s);
      break;
    case 'end':
      E.endTurn(s);
      break;
    case 'concede':
      E.lose(s, a.side, 'concede');
      break;
  }
  const out = s.events;
  s.events = [];
  return out;
}

export function legalActions(s: GameState): Action[] {
  if (s.phase !== 'main') return [];
  const p = s.players[s.active];
  const out: Action[] = [];
  for (const c of p.hand) {
    if (!E.canPlay(s, c)) continue;
    const ts = E.playTargets(s, c);
    if (ts && ts.length) for (const t of ts) out.push({ t: 'play', uid: c.uid, target: t });
    else out.push({ t: 'play', uid: c.uid });
  }
  for (const c of p.board) {
    for (const t of E.attackTargets(s, c)) out.push({ t: 'attack', uid: c.uid, target: t });
    for (const sup of [false, true]) {
      if (!E.canEvolve(s, c, sup)) continue;
      const ts = E.evoTargets(s, c);
      if (ts && ts.length) for (const t of ts) out.push({ t: 'evolve', uid: c.uid, sup, target: t });
      else out.push({ t: 'evolve', uid: c.uid, sup });
    }
  }
  if (E.canFever(s)) out.push({ t: 'fever' });
  out.push({ t: 'end' });
  return out;
}

export function cloneForSim(s: GameState, reseed = true): GameState {
  const events = s.events;
  s.events = [];
  const c = structuredClone(s);
  s.events = events;
  c.record = false;
  if (reseed) c.rng = (Math.random() * 2 ** 31) | 0;
  return c;
}
