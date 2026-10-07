// Same AI, smart NPC deck vs plain deck of the same class pairing.
import { apply, buildDeck, chooseAction, chooseMulligan, E, PLAYABLE_CLASSES, type Difficulty } from '../src/engine';
const N = Number(process.argv[2] ?? 40);
const diff = (process.argv[3] ?? 'normal') as Difficulty;
const q = Number(process.argv[4] ?? 1);
const OFF = Number(process.env.OFF ?? 0);
let wins = 0, games = 0;
for (let g = OFF; g < OFF + N; g++) {
  const a = PLAYABLE_CLASSES[g % 5];
  const b = PLAYABLE_CLASSES[Math.floor(g / 5) % 5];
  for (const smartSide of [0, 1] as const) {
    const decks = [0, 1].map((side) => buildDeck(side === 0 ? a : b, side === smartSide ? { quality: q, smart: true } : { quality: q }));
    const s = E.createGame({ decks: decks as [string[], string[]], classes: [a, b], leaders: [a, b], seed: g * 31 + smartSide, record: false });
    for (const side of [0, 1] as const) apply(s, { t: 'mulligan', side, swap: chooseMulligan(s, side, { difficulty: diff }) });
    let n = 0;
    while (s.phase === 'main' && n < 1500 && s.turn <= 70) { apply(s, chooseAction(s, { difficulty: diff })); n++; }
    games++;
    if (s.winner === smartSide) wins++;
  }
}
console.log(`smart deck won ${wins}/${games} = ${((wins / games) * 100).toFixed(1)}%`);
