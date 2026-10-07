// Core numbers. Shadowverse-flavoured, tuned a little faster for ドパ pacing.
export const RULES = {
  leaderHp: 20,
  deckSize: 30,
  maxCopies: 3,
  startHand: 3,
  handMax: 9,
  boardMax: 5,
  ppMax: 10,
  epFirst: 2,
  epSecond: 3,
  sep: 2,
  evoTurnFirst: 5,
  evoTurnSecond: 4,
  superTurnFirst: 7,
  superTurnSecond: 6,
  dopaMax: 10,
  /** gacha ceiling (運気) — at this luck the next roll is SSR */
  luckCeiling: 6,
} as const;

/** DOPA gauge gains */
export const DOPA = {
  play: 1,
  kill: 1,
  evolve: 1,
  super: 2,
  overkill: 1,
  hurt: 1,
  bigHit: 1,
} as const;
