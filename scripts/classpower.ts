// Leader strength from AI-vs-AI games with NPC (smart) decks, every class vs every other.
// usage: npx tsx scripts/classpower.ts <gamesPerPair> <seedOffset>   → JSON on stdout
//        npx tsx scripts/classpower.ts merge a.json b.json …       → writes src/engine/simstats.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { apply, buildDeck, chooseAction, chooseMulligan, E, PLAYABLE_CLASSES, type ClassId } from '../src/engine';

if (process.argv[2] === 'merge') {
  const t: Record<string, { w: number; g: number }> = {};
  for (const f of process.argv.slice(3)) {
    for (const [k, v] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Record<string, { w: number; g: number }>)) {
      t[k] ??= { w: 0, g: 0 };
      t[k].w += v.w;
      t[k].g += v.g;
    }
  }
  const total = PLAYABLE_CLASSES.reduce((n, c) => n + (t[c]?.g ?? 0), 0) / 2;
  const pairs = Object.keys(t).filter((k) => k.includes('>')).sort();
  const lines = [
    '// Leader strength from AI-vs-AI games with NPC decks (scripts/classpower.ts).',
    '// Shown on the rankings screen as the AI シミュレーション leader table.',
    "import type { ClassId } from './types';",
    '',
    `export const SIM_GAMES = ${Math.round(total)};`,
    '',
    'export const SIM_CLASS: Partial<Record<ClassId, { g: number; w: number }>> = {',
    ...PLAYABLE_CLASSES.filter((c) => t[c]).map((c) => `  ${c}: { g: ${t[c].g}, w: ${t[c].w} },`),
    '};',
    '',
    '/** `a>b` → games of leader a against leader b, and a\'s wins */',
    'export const SIM_MATCHUP: Record<string, { g: number; w: number }> = {',
    ...pairs.map((k) => `  '${k}': { g: ${t[k].g}, w: ${t[k].w} },`),
    '};',
    '',
  ];
  writeFileSync('src/engine/simstats.ts', lines.join('\n'));
  console.log('wrote src/engine/simstats.ts', total, 'games');
} else {
  const N = Number(process.argv[2] ?? 1);
  const OFF = Number(process.argv[3] ?? 0);
  const res: Record<string, { w: number; g: number }> = {};
  let seed = OFF * 100000;
  const cs = PLAYABLE_CLASSES;
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      for (let k = 0; k < N; k++) {
        seed++;
        const cls: [ClassId, ClassId] = seed % 2 ? [cs[i], cs[j]] : [cs[j], cs[i]];
        const decks: [string[], string[]] = [buildDeck(cls[0], { quality: 1, smart: true }), buildDeck(cls[1], { quality: 1, smart: true })];
        const s = E.createGame({ decks, classes: cls, leaders: cls, seed: seed * 7907 + 3, record: false });
        for (const sd of [0, 1] as const) apply(s, { t: 'mulligan', side: sd, swap: chooseMulligan(s, sd, { difficulty: 'normal' }) });
        let n = 0;
        while (s.phase === 'main' && n < 1500 && s.turn <= 70) {
          apply(s, chooseAction(s, { difficulty: 'normal', tune: { reply: 0, samples: 1, beam: 3, depth: 4, budget: 600 } }));
          n++;
        }
        for (const sd of [0, 1] as const) {
          // per leader, and per pairing as `a>b` from a's side (for the 相性表)
          for (const k of [cls[sd], `${cls[sd]}>${cls[1 - sd]}`]) {
            res[k] ??= { w: 0, g: 0 };
            res[k].g++;
            if (s.winner === sd) res[k].w++;
          }
        }
      }
    }
  }
  console.log(JSON.stringify(res));
}
