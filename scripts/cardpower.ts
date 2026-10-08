// Rate every collectible card from AI-vs-AI games and print a TS table.
// usage: npx tsx scripts/cardpower.ts <games> <seedOffset>   → JSON stats on stdout
import { apply, buildDeck, chooseAction, chooseMulligan, collectible, E, PLAYABLE_CLASSES } from '../src/engine';

const N = Number(process.argv[2] ?? 200);
const OFF = Number(process.argv[3] ?? 0);
// random decks with every card equally likely, so each card gets measured
const flat = { quality: 0, rand: Math.random };
const stats: Record<string, { w: number; g: number; base: number }> = {};
const cls: Record<string, { w: number; g: number }> = {};
for (let i = 0; i < N; i++) {
  const a = PLAYABLE_CLASSES[(i + OFF) % PLAYABLE_CLASSES.length];
  const b = PLAYABLE_CLASSES[Math.floor((i + OFF) / PLAYABLE_CLASSES.length) % PLAYABLE_CLASSES.length];
  const s = E.createGame({ decks: [buildDeck(a, flat), buildDeck(b, flat)], classes: [a, b], leaders: [a, b], seed: (i + OFF) * 7907 + 3, record: false });
  for (const side of [0, 1] as const) apply(s, { t: 'mulligan', side, swap: chooseMulligan(s, side, { difficulty: 'normal' }) });
  const played: [Set<string>, Set<string>] = [new Set(), new Set()];
  let n = 0;
  while (s.phase === 'main' && n < 1500 && s.turn <= 70) {
    const act = chooseAction(s, { difficulty: 'normal', tune: { reply: 0, samples: 1, beam: 3, depth: 4, budget: 600 } });
    if (act.t === 'play') {
      const c = s.players[s.active].hand.find((x) => x.uid === act.uid);
      if (c && !c.id.startsWith('t_')) played[s.active].add(c.id);
    }
    apply(s, act);
    n++;
  }
  for (const side of [0, 1] as const) {
    const k = side === 0 ? a : b;
    cls[k] ??= { w: 0, g: 0 };
    cls[k].g++;
    const won = s.winner === side ? 1 : 0;
    cls[k].w += won;
    for (const id of played[side]) {
      stats[id] ??= { w: 0, g: 0, base: 0 };
      stats[id].g++;
      stats[id].w += won;
      stats[id].base += 0; // class baseline applied when merging
      (stats[id] as unknown as { cls: string }).cls = k;
    }
  }
}
console.log(JSON.stringify({ stats, cls, ids: collectible().map((d) => d.id) }));
