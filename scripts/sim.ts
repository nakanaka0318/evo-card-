// AI vs AI balance + robustness simulation.
// usage: npx tsx scripts/sim.ts [games-per-matchup] [difficulty]
import { apply, buildDeck, chooseAction, chooseMulligan, CLASSES, collectible, E, PLAYABLE_CLASSES, type ClassId, type Difficulty, type GameState } from '../src/engine';

const N = Number(process.argv[2] ?? 10);
const diff = (process.argv[3] ?? 'normal') as Difficulty;

const cardStats: Record<string, { w: number; g: number }> = {};

function playGame(a: ClassId, b: ClassId, seed: number): { s: GameState; ms: number; actions: number } {
  const playedBy: [Set<string>, Set<string>] = [new Set(), new Set()];
  const s = E.createGame({
    decks: [buildDeck(a), buildDeck(b)],
    classes: [a, b],
    leaders: [a, b],
    seed,
    record: false,
  });
  for (const side of [0, 1] as const) apply(s, { t: 'mulligan', side, swap: chooseMulligan(s, side, { difficulty: diff }) });
  const t0 = performance.now();
  let actions = 0;
  while (s.phase === 'main' && actions < 2000) {
    const a = chooseAction(s, { difficulty: diff });
    if (a.t === 'play') {
      const c = s.players[s.active].hand.find((x) => x.uid === a.uid);
      if (c) playedBy[s.active].add(c.id);
    }
    apply(s, a);
    actions++;
    if (s.turn > 80) break;
  }
  if (a !== b) {
    for (const side of [0, 1] as const) {
      for (const id of playedBy[side]) {
        cardStats[id] ??= { w: 0, g: 0 };
        cardStats[id].g++;
        if (s.winner === side) cardStats[id].w++;
      }
    }
  }
  return { s, ms: performance.now() - t0, actions };
}

const wins: Record<string, { w: number; g: number }> = {};
const played: Record<string, number> = {};
let totalTurns = 0;
let games = 0;
let maxMs = 0;
let totalMs = 0;
let firstWins = 0;
const reasons: Record<string, number> = {};
for (const a of PLAYABLE_CLASSES) {
  for (const b of PLAYABLE_CLASSES) {
    for (let i = 0; i < N; i++) {
      const seed = (games + 1) * 7919;
      const { s, ms, actions } = playGame(a, b, seed);
      games++;
      totalTurns += s.turn;
      totalMs += ms;
      maxMs = Math.max(maxMs, ms / Math.max(1, actions));
      const key = `${a}`;
      wins[key] ??= { w: 0, g: 0 };
      wins[b] ??= { w: 0, g: 0 };
      if (a !== b) {
        wins[a].g++;
        wins[b].g++;
        if (s.winner === 0) wins[a].w++;
        if (s.winner === 1) wins[b].w++;
      }
      if (s.winner === s.first) firstWins++;
      const r = s.winner === null ? 'unfinished' : s.players[0].hp <= 0 || s.players[1].hp <= 0 ? 'hp' : 'deck';
      reasons[r] = (reasons[r] ?? 0) + 1;
      for (const p of s.players) for (const c of p.grave) played[c.id] = (played[c.id] ?? 0) + 1;
    }
  }
}
console.log(`games=${games} avgTurns=${(totalTurns / games).toFixed(1)} avgMs/game=${(totalMs / games).toFixed(0)} maxMs/action=${maxMs.toFixed(0)}`);
console.log(`first player win rate=${((firstWins / games) * 100).toFixed(1)}%`, reasons);
for (const c of PLAYABLE_CLASSES) {
  const r = wins[c];
  console.log(`${CLASSES[c].name.padEnd(6)} ${((r.w / Math.max(1, r.g)) * 100).toFixed(1)}%  (${r.w}/${r.g})`);
}
const unused = collectible().filter((d) => !played[d.id]).map((d) => d.id);
console.log('never reached grave:', unused.join(', ') || '(none)');

const rows = Object.entries(cardStats)
  .filter(([, v]) => v.g >= 8)
  .map(([id, v]) => ({ id, wr: v.w / v.g, g: v.g }))
  .sort((x, y) => y.wr - x.wr);
const fmt = (r: { id: string; wr: number; g: number }) => `${r.id}:${(r.wr * 100).toFixed(0)}%(${r.g})`;
console.log('TOP  ', rows.slice(0, 15).map(fmt).join(' '));
console.log('WORST', rows.slice(-15).map(fmt).join(' '));
