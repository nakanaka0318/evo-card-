// Head-to-head between two AI difficulties on identical decks, seats swapped.
// usage: npx tsx scripts/duel.ts [games] [candidateDiff] [referenceDiff]
// WSET="hand=0.8,threat=0.4" overrides the candidate's evaluation weights (note: shared module, so both sides).
import { apply, buildDeck, chooseAction, chooseMulligan, E, PLAYABLE_CLASSES, type Difficulty } from '../src/engine';
import { W } from '../src/engine/ai';

for (const kv of (process.env.WSET ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (W as Record<string, number>)[k] = Number(v);
}
const N = Number(process.argv[2] ?? 40);
const diff = (process.argv[3] ?? 'hard') as Difficulty;
const refDiff = (process.argv[4] ?? 'normal') as Difficulty;
const OFF = Number(process.env.OFF ?? 0);
let wins = 0;
let games = 0;
let ms = 0;
let acts = 0;
for (let g = OFF; g < OFF + N; g++) {
  const a = PLAYABLE_CLASSES[g % 5];
  const b = PLAYABLE_CLASSES[Math.floor(g / 5) % 5];
  const decks = [buildDeck(a), buildDeck(b)];
  for (const candSide of [0, 1] as const) {
    const s = E.createGame({ decks: [[...decks[0]], [...decks[1]]], classes: [a, b], leaders: [a, b], seed: g * 7919 + 13, record: false });
    for (const side of [0, 1] as const) apply(s, { t: 'mulligan', side, swap: chooseMulligan(s, side, { difficulty: diff }) });
    let n = 0;
    while (s.phase === 'main' && n < 2000 && s.turn <= 80) {
      const t0 = performance.now();
      const act = chooseAction(s, { difficulty: s.active === candSide ? diff : refDiff });
      if (s.active === candSide) {
        ms += performance.now() - t0;
        acts++;
      }
      apply(s, act);
      n++;
    }
    games++;
    if (s.winner === candSide) wins++;
  }
}
console.log(`${diff} vs ${refDiff}: candidate won ${wins}/${games} = ${((wins / games) * 100).toFixed(1)}%  (avg ${(ms / acts).toFixed(1)}ms/action)`);
