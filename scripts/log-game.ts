// Print a turn-by-turn log of one AI vs AI game: npx tsx scripts/log-game.ts swipe gamer
import { apply, buildDeck, chooseAction, chooseMulligan, def, E, type ClassId } from '../src/engine';
const a = (process.argv[2] ?? 'swipe') as ClassId, b = (process.argv[3] ?? 'gacha') as ClassId;
const d0 = buildDeck(a), d1 = buildDeck(b);
console.log(a, d0.map(id=>def(id).name+'('+def(id).cost+')').join(' '));
console.log(b, d1.map(id=>def(id).name+'('+def(id).cost+')').join(' '));
const s = E.createGame({ decks:[d0,d1], classes:[a,b], leaders:[a,b], seed: 42, record:false });
for (const side of [0,1] as const) apply(s, {t:'mulligan', side, swap: chooseMulligan(s, side, {difficulty:'normal'})});
let lastTurn = -1;
while (s.phase === 'main' && s.turn < 60) {
  if (s.turn !== lastTurn) { lastTurn = s.turn; const p=s.players[s.active]; console.log(`--- T${s.turn} side${s.active} hp ${s.players[0].hp}/${s.players[1].hp} pp ${p.maxPp} hand: ${p.hand.map(c=>def(c.id).name+'('+E.costOf(s,c)+')').join(',')}`); }
  const act = chooseAction(s, {difficulty:'normal'});
  let desc = act.t;
  if (act.t==='play') desc += ' '+def(s.players[s.active].hand.find(c=>c.uid===act.uid)!.id).name + (act.target!==undefined?' ->'+act.target:'');
  if (act.t==='attack') { const c = E.boardCard(s, act.uid)!; desc += ` ${def(c.id).name}(${c.atk}/${E.hpOf(c)}) -> ${act.target<0?'LEADER':def(E.boardCard(s,act.target)!.id).name}`; }
  if (act.t==='evolve') desc += (act.sup?' SUPER ':' ')+def(E.boardCard(s,act.uid)!.id).name;
  console.log('  ', desc);
  apply(s, act);
}
console.log('winner', s.winner, s.players.map(p=>p.hp));
