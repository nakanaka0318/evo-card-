// Compare two card dumps (scripts/carddump.ts) and print the changed cards as patch-note entries.
// usage: node scripts/patchdiff.mjs before.json after.json   → JSON { changed: [...], added: [...] }
// A change's kind is guessed from cost/stats (buff / nerf / adjust); rewrites can be relabelled 'rework'.
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const snap = (d) => {
  const o = { cost: d.cost, text: d.text };
  if (d.atk !== undefined) o.atk = d.atk;
  if (d.hp !== undefined) o.hp = d.hp;
  if (d.countdown !== undefined && d.countdown > 0) o.countdown = d.countdown;
  if (d.kw?.length) o.kw = d.kw;
  return o;
};
const same = (x, y) => JSON.stringify(snap(x)) === JSON.stringify(snap(y));
const kind = (x, y) => {
  const stat = (y.atk ?? 0) - (x.atk ?? 0) + (y.hp ?? 0) - (x.hp ?? 0);
  const v = (x.cost - y.cost) * 2 + stat;
  if (v > 0) return 'buff';
  if (v < 0) return 'nerf';
  return 'adjust';
};
const changed = [];
const added = [];
for (const [id, y] of Object.entries(b)) {
  const x = a[id];
  if (!x) {
    if (!y.token) added.push(id);
    continue;
  }
  if (same(x, y)) continue;
  changed.push({ id, name: y.name, cls: y.cls, kind: kind(x, y), before: snap(x), after: snap(y) });
}
console.log(JSON.stringify({ changed, added }));
