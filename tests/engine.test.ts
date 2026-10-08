import { describe, expect, it } from 'vitest';
import { apply, collectible, def, E, legalActions, leaderTgt, RULES, type GameState, type Side } from '../src/engine';

const filler = (id = 'n_slime') => Array.from({ length: 30 }, () => id);

function game(opts: { deck0?: string[]; deck1?: string[]; first?: Side } = {}): GameState {
  const s = E.createGame({
    decks: [opts.deck0 ?? filler(), opts.deck1 ?? filler()],
    classes: ['gacha', 'stream'],
    leaders: ['gacha', 'stream'],
    first: opts.first ?? 0,
    seed: 1234,
  });
  apply(s, { t: 'mulligan', side: 0, swap: [] });
  apply(s, { t: 'mulligan', side: 1, swap: [] });
  return s;
}

/** put a card straight onto a board (bypassing cost) */
function put(s: GameState, side: Side, id: string, opts: { fresh?: boolean } = {}) {
  const c = E.makeCard(s, id, side);
  c.enteredOn = opts.fresh ? s.turn : s.turn - 1;
  s.players[side].board.push(c);
  return c;
}

function give(s: GameState, side: Side, id: string) {
  const c = E.makeCard(s, id, side);
  s.players[side].hand.push(c);
  return c;
}

function skipTo(s: GameState, side: Side, ownTurn: number) {
  while (!(s.active === side && s.players[side].turns >= ownTurn)) apply(s, { t: 'end' });
}

describe('setup', () => {
  it('deals 3 cards, second player draws 2 on first turn', () => {
    const s = game();
    expect(s.phase).toBe('main');
    expect(s.players[0].hand.length).toBe(4);
    expect(s.players[0].maxPp).toBe(1);
    apply(s, { t: 'end' });
    expect(s.players[1].hand.length).toBe(5);
    expect(s.players[1].ep).toBe(RULES.epSecond);
    expect(s.players[0].ep).toBe(RULES.epFirst);
  });

  it('every collectible card has valid text and stats', () => {
    for (const d of collectible()) {
      expect(d.name.length).toBeGreaterThan(0);
      if (d.type === 'follower') {
        expect(d.atk).toBeTypeOf('number');
        expect(d.hp).toBeGreaterThan(0);
      }
      if (d.target) expect(d.fanfare || d.spell).toBeTruthy();
    }
    expect(collectible().length).toBeGreaterThanOrEqual(100);
  });
});

describe('combat', () => {
  it('ward must be attacked first', () => {
    const s = game();
    const a = put(s, 0, 'n_bear');
    const w = put(s, 1, 'n_cat');
    put(s, 1, 'n_slime');
    expect(E.attackTargets(s, a)).toEqual([w.uid]);
  });

  it('storm hits face on entry, rush only followers', () => {
    const s = game();
    const st = put(s, 0, 'n_rocket', { fresh: true });
    const ru = put(s, 0, 'x_swiper', { fresh: true });
    const e = put(s, 1, 'n_slime');
    expect(E.attackTargets(s, st)).toContain(leaderTgt(1));
    expect(E.attackTargets(s, ru)).toEqual([e.uid]);
  });

  it('exchanges damage and destroys', () => {
    const s = game();
    const a = put(s, 0, 'n_bear');
    const d = put(s, 1, 'n_cat');
    apply(s, { t: 'attack', uid: a.uid, target: d.uid });
    expect(s.players[1].board.includes(d)).toBe(false);
    expect(E.hpOf(a)).toBe(5);
  });

  it('bane, drain and barrier', () => {
    const s = game();
    s.players[0].hp = 10;
    const bane = put(s, 0, 's_anti');
    const big = put(s, 1, 'n_bear');
    apply(s, { t: 'attack', uid: bane.uid, target: big.uid });
    expect(s.players[1].board.includes(big)).toBe(false);
    const drain = put(s, 0, 'w_cake');
    apply(s, { t: 'attack', uid: drain.uid, target: leaderTgt(1) });
    expect(s.players[0].hp).toBe(13);
    const bal = put(s, 1, 'n_balloon');
    const hit = put(s, 0, 'n_golem');
    apply(s, { t: 'attack', uid: hit.uid, target: bal.uid });
    expect(E.hpOf(bal)).toBe(3);
    expect(E.has(bal, 'barrier')).toBe(false);
  });

  it('ambush cannot be attacked until it attacks', () => {
    const s = game();
    const a = put(s, 0, 'n_bear');
    const n = put(s, 1, 'n_ninja');
    expect(E.attackTargets(s, a)).not.toContain(n.uid);
  });

  it('twin attacks twice', () => {
    const s = game();
    const f = put(s, 0, 'x_falcon');
    apply(s, { t: 'attack', uid: f.uid, target: leaderTgt(1) });
    apply(s, { t: 'attack', uid: f.uid, target: leaderTgt(1) });
    expect(s.players[1].hp).toBe(16);
    expect(E.canAttack(s, f)).toBe(false);
  });
});

describe('evolution', () => {
  it('unlocks on the right turns and grants rush', () => {
    const s = game();
    const c = put(s, 0, 'n_slime', { fresh: true });
    expect(E.canEvolve(s, c, false)).toBe(false);
    skipTo(s, 0, RULES.evoTurnFirst);
    const f = put(s, 0, 'n_slime', { fresh: true });
    const e = put(s, 1, 'n_slime');
    expect(E.canEvolve(s, f, false)).toBe(true);
    expect(E.canEvolve(s, f, true)).toBe(false);
    apply(s, { t: 'evolve', uid: f.uid, sup: false });
    expect(f.atk).toBe(3);
    expect(f.maxHp).toBe(4);
    expect(E.attackTargets(s, f)).toEqual([e.uid]);
    expect(s.players[0].ep).toBe(RULES.epFirst - 1);
    // one evolution per turn
    const g = put(s, 0, 'n_slime');
    expect(E.canEvolve(s, g, false)).toBe(false);
  });

  it('super evolved followers are immune on their own turn and ping the leader on kill', () => {
    const s = game();
    skipTo(s, 0, RULES.superTurnFirst);
    const c = put(s, 0, 'n_slime');
    apply(s, { t: 'evolve', uid: c.uid, sup: true });
    expect(c.atk).toBe(4);
    expect(c.maxHp).toBe(5);
    const e = put(s, 1, 'n_golem');
    const hp = s.players[1].hp;
    apply(s, { t: 'attack', uid: c.uid, target: e.uid });
    expect(c.dmg).toBe(0);
    expect(E.hpOf(e)).toBe(1);
    expect(s.players[1].hp).toBe(hp);
  });

  it('evolve target effects require a target', () => {
    const s = game();
    skipTo(s, 0, RULES.evoTurnFirst);
    const c = put(s, 0, 'n_megaphone');
    const e = put(s, 1, 'n_cat');
    expect(apply(s, { t: 'evolve', uid: c.uid, sup: false }).length).toBe(0);
    apply(s, { t: 'evolve', uid: c.uid, sup: false, target: e.uid });
    expect(s.players[1].board.includes(e)).toBe(false);
  });
});

describe('cards & mechanics', () => {
  it('spells with targets cannot be cast without a target', () => {
    const s = game();
    s.players[0].pp = 5;
    const h = give(s, 0, 'n_hammer');
    expect(E.canPlay(s, h)).toBe(false);
    const e = put(s, 1, 'n_golem');
    expect(E.canPlay(s, h)).toBe(true);
    apply(s, { t: 'play', uid: h.uid, target: e.uid });
    expect(E.hpOf(e)).toBe(2);
  });

  it('gacha ceiling guarantees SSR and resets luck', () => {
    const s = game();
    s.players[0].luck = RULES.luckCeiling;
    s.players[0].pp = 1;
    const c = give(s, 0, 'g_capsule');
    const evs = apply(s, { t: 'play', uid: c.uid });
    const g = evs.find((e) => e.t === 'gacha');
    expect(g && g.t === 'gacha' && g.tier).toBe('SSR');
    expect(s.players[0].luck).toBe(0);
    expect(c.atk).toBe(3);
    expect(E.has(c, 'storm')).toBe(true);
  });

  it('kakuhen gives SR or better', () => {
    for (let i = 0; i < 20; i++) {
      const s = game();
      s.rng = i * 31;
      s.players[0].kakuhen = 1;
      s.players[0].pp = 1;
      const c = give(s, 0, 'g_capsule');
      const evs = apply(s, { t: 'play', uid: c.uid });
      const g = evs.find((e) => e.t === 'gacha');
      expect(g && g.t === 'gacha' && ['SR', 'SSR'].includes(g.tier)).toBe(true);
    }
  });

  it('likes are gained per play and spent by buzz', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].likes = 3;
    const e = put(s, 1, 'n_bear');
    const sp = give(s, 0, 's_comment');
    apply(s, { t: 'play', uid: sp.uid, target: e.uid });
    // +1 like from playing, then buzz 4 spends 4: 4 damage + 2 to the leader
    expect(s.players[0].likes).toBe(0);
    expect(E.hpOf(e)).toBe(3);
    expect(s.players[1].hp).toBe(18);
  });

  it('combo counts other cards played this turn', () => {
    const s = game();
    s.players[0].pp = 10;
    for (let i = 0; i < 2; i++) apply(s, { t: 'play', uid: give(s, 0, 'x_skip').uid });
    const d = give(s, 0, 'x_dancer');
    apply(s, { t: 'play', uid: d.uid });
    expect(d.atk).toBe(2);
    expect(d.maxHp).toBe(4);
    const runner = give(s, 0, 'x_runner');
    expect(E.costOf(s, runner)).toBe(3);
  });

  it('sweetness accumulates from heals even at full HP', () => {
    const s = game();
    s.players[0].pp = 10;
    apply(s, { t: 'play', uid: give(s, 0, 'w_hiyoko').uid });
    expect(s.players[0].sweet).toBe(2);
    const donut = put(s, 0, 'w_donut');
    apply(s, { t: 'play', uid: give(s, 0, 't_candy').uid });
    expect(s.players[0].sweet).toBe(4);
    expect(donut.atk).toBe(2);
  });

  it('skip hands back a free skip that only draws', () => {
    const s = game();
    s.players[0].pp = 2;
    s.players[0].hand = [];
    const first = give(s, 0, 'x_skip');
    expect(E.costOf(s, first)).toBe(2);
    apply(s, { t: 'play', uid: first.uid });
    const free = s.players[0].hand.find((c) => c.id === 't_skip');
    expect(free && E.costOf(s, free)).toBe(0);
    const before = s.players[0].hand.length;
    apply(s, { t: 'play', uid: free!.uid });
    // played the free one (-1), drew one (+1), and no new skip came back
    expect(s.players[0].hand.length).toBe(before);
    expect(s.players[0].hand.some((c) => c.id === 't_skip' || c.id === 'x_skip')).toBe(false);
  });

  it('mid boss always hits a follower; 課金 also hits the leader', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    const e = put(s, 1, 'n_bear');
    apply(s, { t: 'play', uid: give(s, 0, 'm_boss').uid, target: e.uid });
    expect(E.hpOf(e)).toBe(2);
    expect(s.players[1].hp).toBe(15);
  });

  it('level-ups restore the follower to full health', () => {
    const s = game();
    const h = put(s, 0, 'm_hero');
    const e = put(s, 1, 'n_slime');
    apply(s, { t: 'attack', uid: h.uid, target: e.uid });
    expect(h.level).toBeGreaterThan(1);
    expect(h.dmg).toBe(0);
  });

  it('enhance pays the higher cost when affordable', () => {
    const s = game();
    s.players[0].pp = 4;
    const c = give(s, 0, 'm_card');
    expect(E.playCost(s, c)).toEqual({ cost: 4, enhanced: true });
    apply(s, { t: 'play', uid: c.uid });
    expect(s.players[0].pp).toBe(0);
    expect(c.atk).toBe(5);
  });

  it('level up through attacks', () => {
    const s = game();
    const sl = put(s, 0, 'm_slime');
    apply(s, { t: 'attack', uid: sl.uid, target: leaderTgt(1) });
    expect(sl.level).toBe(2);
    expect(sl.atk).toBe(2);
  });

  it('countdown amulets expire and trigger last words', () => {
    const s = game();
    s.players[0].pp = 1;
    const a = give(s, 0, 'm_login');
    apply(s, { t: 'play', uid: a.uid });
    const hand = () => s.players[0].hand.length;
    for (let i = 0; i < 3; i++) {
      apply(s, { t: 'end' });
      apply(s, { t: 'end' });
    }
    expect(s.players[0].board.includes(a)).toBe(false);
    expect(hand()).toBeGreaterThan(0);
  });

  it('last words chain and AoE', () => {
    const s = game();
    s.players[0].pp = 10;
    const p = put(s, 1, 'n_pinata');
    const mine = put(s, 0, 'n_slime');
    const r = give(s, 0, 'n_reset');
    apply(s, { t: 'play', uid: r.uid });
    expect(s.players[1].board.includes(p)).toBe(false);
    // pinata's last words hits side 0's followers (its enemies)
    expect(s.players[0].board.includes(mine)).toBe(false);
  });

  it('fever: +1 attack, -1 cost, draws a card', () => {
    const s = game();
    s.players[0].dopa = RULES.dopaMax;
    const c = put(s, 0, 'n_slime');
    const h = give(s, 0, 'n_bear');
    const handBefore = s.players[0].hand.length;
    apply(s, { t: 'fever' });
    expect(s.players[0].fever).toBe(true);
    expect(s.players[0].dopa).toBe(0);
    expect(E.atkOf(s, c)).toBe(2);
    expect(E.costOf(s, h)).toBe(4);
    expect(s.players[0].hand.length).toBe(handBefore + 1);
    apply(s, { t: 'end' });
    expect(s.players[0].fever).toBe(false);
  });

  it('overdraw burns, empty deck loses', () => {
    const s = game({ deck0: filler().slice(0, 8) });
    while (s.players[0].hand.length < RULES.handMax) give(s, 0, 'n_slime');
    const deckBefore = s.players[0].deck.length;
    apply(s, { t: 'end' });
    apply(s, { t: 'end' });
    expect(s.players[0].hand.length).toBe(RULES.handMax);
    expect(s.players[0].deck.length).toBe(deckBefore - 1);
    s.players[0].deck = [];
    apply(s, { t: 'end' });
    apply(s, { t: 'end' });
    expect(s.winner).toBe(1);
  });

  it('every card can be played without throwing', () => {
    for (const d of collectible()) {
      const s = game();
      s.players[0].pp = 10;
      s.players[0].maxPp = 10;
      s.players[0].likes = 20;
      s.players[0].sweet = 30;
      s.players[0].combo = 4;
      put(s, 0, 'n_slime');
      put(s, 1, 'n_golem');
      put(s, 1, 'n_bear');
      const c = give(s, 0, d.id);
      const acts = legalActions(s).filter((a) => a.t === 'play' && a.uid === c.uid);
      expect(acts.length, d.id).toBeGreaterThan(0);
      for (const a of acts.slice(0, 1)) apply(s, a);
      expect(s.players[0].hand.includes(c), d.id).toBe(false);
      expect(def(d.id).name).toBeTruthy();
    }
  });
});

describe('gadget: parts / fuse / complete', () => {
  it('playing a part counts distinct parts once', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    for (const id of ['t_pbolt', 't_pbolt', 't_pspring']) {
      const c = give(s, 0, id);
      apply(s, { t: 'play', uid: c.uid });
    }
    expect(s.players[0].parts).toEqual(['t_pbolt', 't_pspring']);
    expect(E.view(s).p[0].parts).toBe(2);
  });

  it('fusion absorbs hand parts, buffs per part and counts them for complete', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    give(s, 0, 't_pbolt');
    give(s, 0, 't_pbattery');
    give(s, 0, 't_pchip');
    const arm = give(s, 0, 'd_arm');
    const handBefore = s.players[0].hand.length;
    const act = legalActions(s).find((a) => a.t === 'play' && a.uid === arm.uid)!;
    apply(s, act);
    const onBoard = s.players[0].board.find((c) => c.uid === arm.uid)!;
    expect(onBoard.atk).toBe(6);
    expect(onBoard.maxHp).toBe(7);
    expect(s.players[0].hand.length).toBe(handBefore - 3);
    expect(s.players[0].parts.length).toBe(2);
  });

  it('complete gates on the number of different parts', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    const a = give(s, 0, 'd_rc');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === a.uid)!);
    expect(s.players[0].board.find((c) => c.uid === a.uid)!.atk).toBe(2);
    s.players[0].parts = ['t_pbolt', 't_pspring'];
    const b = give(s, 0, 'd_rc');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === b.uid)!);
    expect(s.players[0].board.find((c) => c.uid === b.uid)!.atk).toBe(3);
  });
});

describe('treasure: 財宝 count and payoffs', () => {
  it('using 財宝 counts, triggers on-use followers and gates 【財宝X】', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    const hand = put(s, 0, 'r_deckhand');
    for (const id of ['t_tcoin', 't_tcup']) {
      const c = give(s, 0, id);
      apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === c.uid)!);
    }
    expect(s.players[0].treasures).toBe(2);
    expect(hand.atk).toBe(4);
    expect(E.view(s).p[0].treasures).toBe(2);
    const p = give(s, 0, 'r_parrot');
    apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === p.uid)!);
    expect(E.has(p, 'storm')).toBe(true);
  });

  it('captain makes its 財宝 free and the dragon gets cheaper', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    const cap = give(s, 0, 'r_captain');
    const before = s.players[0].hand.length;
    apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === cap.uid)!);
    const got = s.players[0].hand.slice(before - 1);
    expect(got.length).toBe(2);
    for (const t of got) expect(E.costOf(s, t)).toBe(0);
    const dragon = give(s, 0, 'r_dragon');
    s.players[0].treasures = 6;
    expect(E.costOf(s, dragon)).toBe(5);
  });
});

describe('harmony: even deck', () => {
  it('【ハモり】 fires only with an even deck and is counted', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].deck = s.players[0].deck.slice(0, 10);
    const a = give(s, 0, 'h_rookie');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === a.uid)!);
    expect(a.atk).toBe(3);
    expect(s.players[0].harmonies).toBe(1);
    s.players[0].deck = s.players[0].deck.slice(0, 9);
    const b = give(s, 0, 'h_rookie');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === b.uid)!);
    expect(b.atk).toBe(2);
    expect(s.players[0].harmonies).toBe(1);
  });

  it('tuner fixes an odd deck to even with a コーラス', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].deck = s.players[0].deck.slice(0, 9);
    const t = give(s, 0, 'h_tuner');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === t.uid)!);
    expect(s.players[0].deck.length).toBe(10);
    expect(s.players[0].deck.some((c) => c.id === 't_chorus')).toBe(true);
  });
});
