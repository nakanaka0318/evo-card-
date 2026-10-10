// Dump every card's printed stats as JSON (used to build the カード歴史 patch notes).
// usage: npx tsx scripts/carddump.ts > cards.json
import { allDefs } from '../src/engine';

const out: Record<string, unknown> = {};
for (const d of allDefs()) {
  out[d.id] = {
    name: d.name,
    cls: d.cls,
    type: d.type,
    rarity: d.rarity,
    cost: d.cost,
    atk: d.atk,
    hp: d.hp,
    countdown: d.countdown,
    kw: d.kw ?? [],
    art: d.art,
    text: d.text,
    token: !!d.token,
  };
}
console.log(JSON.stringify(out));
