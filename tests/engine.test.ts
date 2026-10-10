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
    const bane = put(s, 0, 'm_mimic');
    const big = put(s, 1, 'n_bear');
    apply(s, { t: 'attack', uid: bane.uid, target: big.uid });
    expect(s.players[1].board.includes(big)).toBe(false);
    const drain = put(s, 0, 'w_pero');
    apply(s, { t: 'attack', uid: drain.uid, target: leaderTgt(1) });
    expect(s.players[0].hp).toBe(15);
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
    expect(s.players[1].hp).toBe(14);
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
    expect(f.atk).toBe(4);
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
    expect(c.atk).toBe(5);
    expect(c.maxHp).toBe(5);
    const e = put(s, 1, 'n_bear');
    const hp = s.players[1].hp;
    apply(s, { t: 'attack', uid: c.uid, target: e.uid });
    expect(c.dmg).toBe(0);
    expect(E.hpOf(e)).toBe(2);
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
    expect(E.hpOf(e)).toBe(1);
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
    // +1 like from playing, then buzz 4 spends 4: 5 damage + 2 to the leader
    expect(s.players[0].likes).toBe(0);
    expect(E.hpOf(e)).toBe(2);
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
    apply(s, { t: 'play', uid: give(s, 0, 't_candy').uid });
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
    expect(E.playCost(s, c)).toEqual({ cost: 4, enhanced: true, mode: 'enhance' });
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
    expect(E.atkOf(s, c)).toBe(3);
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
      // cards that cost more than 10 need their discounts (マナドラゴン)
      if (d.cost > 10) c.data.sb = d.cost;
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
    const arm = give(s, 0, 'd_robo');
    const handBefore = s.players[0].hand.length;
    const act = legalActions(s).find((a) => a.t === 'play' && a.uid === arm.uid)!;
    apply(s, act);
    const onBoard = s.players[0].board.find((c) => c.uid === arm.uid)!;
    expect(onBoard.atk).toBe(10);
    expect(onBoard.maxHp).toBe(10);
    expect(E.has(onBoard, 'ward')).toBe(true);
    expect(s.players[0].hand.length).toBe(handBefore - 4);
    expect(s.players[0].parts.length).toBe(3);
  });

  it('complete gates on the number of different parts', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    const foe = put(s, 1, 'n_bear');
    const a = give(s, 0, 'd_rc');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === a.uid)!);
    expect(E.hpOf(foe)).toBe(7);
    s.players[0].parts = ['t_pbolt', 't_pspring'];
    const b = give(s, 0, 'd_rc');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === b.uid)!);
    expect(E.hpOf(foe)).toBe(5);
  });
});

describe('treasure: 財宝 count and payoffs', () => {
  it('using 財宝 counts, triggers on-use followers and gates 【財宝X】', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    put(s, 0, 'r_queen');
    s.players[0].hp = 10;
    for (const id of ['t_tcoin', 't_tcup']) {
      const c = give(s, 0, id);
      apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === c.uid)!);
    }
    expect(s.players[0].treasures).toBe(2);
    // 金貨 +0, 黄金の杯 +2, ベル +1×2
    expect(s.players[0].hp).toBe(14);
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
    expect(s.players[0].deck.length).toBe(9);
    expect(s.players[0].harmonies).toBe(1);
    const b = give(s, 0, 'h_rookie');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === b.uid)!);
    expect(s.players[0].deck.length).toBe(9);
    expect(s.players[0].harmonies).toBe(1);
  });

  it('tuner fixes an odd deck to even with a コーラス', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].deck = s.players[0].deck.slice(0, 9);
    const t = give(s, 0, 'h_tuner');
    apply(s, legalActions(s).find((x) => x.t === 'play' && x.uid === t.uid)!);
    // 9 → +コーラス = 10 (ハモり) → draws 1 = 9
    expect(s.players[0].harmonies).toBe(1);
    expect(s.players[0].deck.length).toBe(9);
    expect(s.players[0].deck.some((c) => c.id === 't_chorus')).toBe(true);
  });
});

describe('crash: 破壊 / いけにえ', () => {
  it('counts own destroyed cards, sacrifice prefers ガラクタ and fires onBreak', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    put(s, 0, 'c_plates');
    put(s, 0, 'n_bear');
    const kid = give(s, 0, 'c_kid');
    apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === kid.uid)!);
    expect(s.players[0].board.some((c) => c.id === 't_junk')).toBe(true);
    const hp = s.players[1].hp;
    const scr = give(s, 0, 'c_scrapper');
    const hand = s.players[0].hand.length;
    apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === scr.uid)!);
    // ガラクタ was sacrificed (bear survives): its last words hit for 2, お皿割り師 for 1
    expect(s.players[0].board.some((c) => c.id === 'n_bear')).toBe(true);
    expect(s.players[0].board.some((c) => c.id === 't_junk')).toBe(false);
    expect(s.players[0].broken).toBe(1);
    expect(s.players[0].hand.length).toBe(hand - 1 + 2);
    expect(s.players[1].hp).toBe(hp - 3);
  });

  it('終末時計 ticks down whenever another own card breaks', () => {
    const s = game();
    const clock = put(s, 0, 'c_doomclock');
    clock.countdown = 2;
    put(s, 1, 'n_bear');
    const a = put(s, 0, 'n_slime');
    const b = put(s, 0, 'n_slime');
    a.doomed = true;
    b.doomed = true;
    E.resolve(s);
    expect(s.players[0].board.includes(clock)).toBe(false);
    expect(s.players[1].board.length).toBe(0);
    expect(s.players[1].hp).toBe(15);
  });
});

describe('ranger: 連携 / 変身', () => {
  it('rally counts followers entering and free evolve triggers onAllyEvolve', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    put(s, 0, 'k_gold');
    const r0 = s.players[0].rally;
    const call = give(s, 0, 'k_call');
    apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === call.uid)!);
    expect(s.players[0].rally).toBe(r0 + 2);
    const cadet = s.players[0].board.find((c) => c.id === 't_cadet')!;
    const ep = s.players[0].ep;
    const hand = s.players[0].hand.length;
    const ehp = s.players[1].hp;
    const belt = give(s, 0, 'k_belt');
    apply(s, { t: 'play', uid: belt.uid, target: cadet.uid });
    expect(cadet.evolved).toBe(1);
    expect(cadet.atk).toBe(3);
    expect(s.players[0].ep).toBe(ep);
    // ベルト left the hand, ドパゴールド hit the leader for the evolution
    expect(s.players[0].hand.length).toBe(hand);
    expect(s.players[1].hp).toBe(ehp - 1);
  });
});

describe('witch: スペルブースト', () => {
  it('spells boost spellboost cards in hand, lowering cost and raising damage', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    const giant = give(s, 0, 'z_giant');
    const fb = give(s, 0, 'z_fireball');
    for (let i = 0; i < 3; i++) {
      const sp = give(s, 0, 't_mspark');
      apply(s, { t: 'play', uid: sp.uid });
    }
    expect(giant.data.sb).toBe(3);
    expect(E.costOf(s, giant)).toBe(4);
    expect(E.view(s).p[0].hand.find((c) => c.uid === fb.uid)!.boost).toBe(3);
    const bear = put(s, 1, 'n_bear');
    apply(s, { t: 'play', uid: fb.uid, target: bear.uid });
    expect(E.hpOf(bear)).toBe(2);
    expect(giant.data.sb).toBe(4);
  });
});

describe('minimal: ハンドレス / 捨てる', () => {
  it('discard prefers 捨てられた時 cards and triggers them and onAnyDiscard', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].hand = [];
    put(s, 0, 'q_danshari');
    give(s, 0, 'n_bear');
    const ghost = give(s, 0, 'q_ghost');
    const hp = s.players[1].hp;
    const t = give(s, 0, 'q_trash');
    apply(s, legalActions(s).find((a) => a.t === 'play' && a.uid === t.uid)!);
    expect(s.players[0].discarded).toBe(1);
    expect(s.players[0].board.some((c) => c.id === 'q_ghost')).toBe(true);
    expect(s.players[0].hand.includes(ghost)).toBe(false);
    expect(s.players[1].hp).toBe(hp - 2);
  });

  it('ムガ costs as much as the hand size', () => {
    const s = game();
    s.players[0].hand = [];
    const m = give(s, 0, 'q_muga');
    expect(E.costOf(s, m)).toBe(1);
    give(s, 0, 'n_bear');
    give(s, 0, 'n_bear');
    expect(E.costOf(s, m)).toBe(3);
  });
});

describe('jewel: 結晶 / アクセラレート / エンハンス', () => {
  it('accelerate plays a follower as a spell when PP is short', () => {
    const s = game();
    s.players[0].pp = 2;
    const ruby = give(s, 0, 'j_sapphire');
    const hand = s.players[0].hand.length;
    expect(E.playCost(s, ruby)).toEqual({ cost: 2, enhanced: false, mode: 'accel' });
    apply(s, { t: 'play', uid: ruby.uid });
    expect(s.players[0].board.includes(ruby)).toBe(false);
    expect(s.players[0].grave.includes(ruby)).toBe(true);
    expect(s.players[0].hand.length).toBe(hand - 1 + 2);
    expect(s.players[0].accels).toBe(1);
    expect(s.players[0].stats.spells).toBe(1);
  });

  it('crystallize leaves a 結晶 that hatches into the follower', () => {
    const s = game();
    s.players[0].pp = 2;
    const pearl = give(s, 0, 'j_pearl');
    expect(E.playCost(s, pearl).mode).toBe('crystal');
    apply(s, { t: 'play', uid: pearl.uid });
    const cr = s.players[0].board.find((c) => c.id === 't_crystal')!;
    expect(cr.hold).toBe('j_pearl');
    expect(cr.countdown).toBe(3);
    put(s, 1, 'n_bear');
    for (let i = 0; i < 3; i++) {
      apply(s, { t: 'end' });
      apply(s, { t: 'end' });
    }
    const hatched = s.players[0].board.find((c) => c.id === 'j_pearl')!;
    expect(hatched).toBeTruthy();
    expect(s.players[0].board.some((c) => c.id === 't_crystal')).toBe(false);
    // hatched followers get 突進: followers yes, leader no on the turn they come out
    expect(E.has(hatched, 'rush')).toBe(true);
    const tg = E.attackTargets(s, hatched);
    expect(tg.length).toBeGreaterThan(0);
    expect(tg.includes(leaderTgt(1))).toBe(false);
  });

  it('jewelia: hatch effect fires, fanfare does not', () => {
    const s = game();
    const cr = E.makeCard(s, 't_crystal', 0);
    cr.hold = 'j_jewelia';
    cr.countdown = 1;
    cr.enteredOn = s.turn - 1;
    s.players[0].board.push(cr);
    const big = put(s, 1, 'n_bear');
    const small = put(s, 1, 'n_slime');
    cr.doomed = true;
    E.resolve(s);
    expect(s.players[0].board.some((c) => c.id === 'j_jewelia')).toBe(true);
    expect(s.players[1].board.includes(small)).toBe(false);
    expect(E.hpOf(big)).toBe(4);
  });
});

describe('minimal: picked discards / 予約ドロー', () => {
  it('discards the cards the player picked', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].hand = [];
    const keep = give(s, 0, 'q_ghost');
    const toss = give(s, 0, 'n_bear');
    const bag = give(s, 0, 'q_bag');
    apply(s, { t: 'play', uid: bag.uid, discard: [toss.uid] });
    // the picked card is the one that goes
    expect(s.players[0].grave.includes(toss)).toBe(true);
    expect(s.players[0].hand.includes(keep)).toBe(true);
    expect(s.players[0].discarded).toBe(1);
  });

  it('a pick that is not in hand is ignored', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hand = [];
    const a = give(s, 0, 'n_bear');
    const t = give(s, 0, 'q_trash');
    apply(s, { t: 'play', uid: t.uid, discard: [99999, t.uid] });
    expect(s.players[0].grave.includes(a)).toBe(true);
  });

  it('reserved draws arrive at the start of the next own turn', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hand = [];
    const chest = give(s, 0, 'q_emptychest');
    apply(s, { t: 'play', uid: chest.uid });
    expect(s.players[0].reserveDraw).toBe(4);
    expect(s.players[0].hand.length).toBe(0);
    apply(s, { t: 'end' });
    apply(s, { t: 'end' });
    // 1 normal draw + 4 reserved
    expect(s.players[0].hand.length).toBe(5);
    expect(s.players[0].reserveDraw).toBe(0);
  });
});

describe('novel: 白の章 / 黒の章', () => {
  it('starts in 白の章; flipping counts pages and fires onFlip', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    expect(s.players[0].chapter).toBe(0);
    const ed = put(s, 0, 'b_librarian');
    const foe = put(s, 1, 'n_bear');
    const bm = give(s, 0, 'b_bookmark');
    apply(s, { t: 'play', uid: bm.uid });
    expect(s.players[0].chapter).toBe(1);
    expect(s.players[0].flips).toBe(1);
    // 図書委員 pinged the only enemy follower
    expect(E.hpOf(foe)).toBe(6);
    expect(s.players[0].board.includes(ed)).toBe(true);
    // opening an already open chapter is not a flip
    expect(E.flipChapter(s, 0, 1)).toBe(false);
    expect(s.players[0].flips).toBe(1);
  });

  it('chapter gates pick the matching branch', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hp = 10;
    const bear = put(s, 1, 'n_bear');
    const bad = give(s, 0, 'b_badend');
    apply(s, { t: 'play', uid: bad.uid, target: bear.uid });
    expect(E.hpOf(bear)).toBe(4);
    E.flipChapter(s, 0, 1);
    const bad2 = give(s, 0, 'b_badend');
    apply(s, { t: 'play', uid: bad2.uid, target: bear.uid });
    expect(s.players[1].board.includes(bear)).toBe(false);
  });
});

describe('deco: クレスト', () => {
  it('crests stick to the leader, trigger like board cards and cap at 8', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hp = 10;
    put(s, 0, 'e_mirror');
    const foe = put(s, 1, 'n_bear');
    const st = give(s, 0, 'e_sticker');
    apply(s, { t: 'play', uid: st.uid });
    expect(s.players[0].crests.map((c) => c.id)).toEqual(['t_dheart']);
    // デコミラー pinged a follower for the crest
    expect(E.hpOf(foe)).toBe(6);
    apply(s, { t: 'end' });
    // ハートデコ heals at own turn end
    expect(s.players[0].hp).toBe(11);
    for (let i = 0; i < 10; i++) E.addCrest(s, 0, 't_dstar');
    expect(s.players[0].crests.length).toBe(8);
    expect(E.view(s).p[0].crests.length).toBe(8);
  });

  it('デコ盛り城 gets cheaper per crest', () => {
    const s = game();
    const castle = give(s, 0, 'e_castle');
    expect(E.playCost(s, castle).cost).toBe(8);
    for (let i = 0; i < 3; i++) E.addCrest(s, 0, 't_dheart');
    expect(E.playCost(s, castle).cost).toBe(5);
  });
});

describe('spicy: 激辛 / ピンチ', () => {
  it('self damage is tracked and triggers onLeaderHurt', () => {
    const s = game();
    s.players[0].pp = 10;
    put(s, 0, 'f_enma');
    const ehp = s.players[1].hp;
    const ch = give(s, 0, 'f_chili');
    apply(s, { t: 'play', uid: ch.uid });
    expect(s.players[0].selfDmg).toBe(2);
    expect(s.players[0].hp).toBe(18);
    // enma mirrors 2, chili pings 2 (only target: the leader)
    expect(s.players[1].hp).toBe(ehp - 4);
  });

  it('enma mirrors every point of damage to the own leader', () => {
    const s = game();
    put(s, 0, 'f_enma');
    const ehp = s.players[1].hp;
    E.damage(s, null, leaderTgt(0), 4);
    E.damage(s, null, leaderTgt(0), 4);
    expect(s.players[1].hp).toBe(ehp - 8);
  });

  it('pinch discounts and gates', () => {
    const s = game();
    const champ = give(s, 0, 'f_champion');
    expect(E.playCost(s, champ).cost).toBe(6);
    s.players[0].hp = 10;
    expect(E.playCost(s, champ).cost).toBe(3);
  });
});

describe('shrine: お守り / 成就 / 祈願', () => {
  it('countdown 0 is a 成就: counted, onFulfill fires, last words resolve', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hp = 10;
    put(s, 0, 'o_komainu');
    const ema = put(s, 0, 'o_kenkou');
    expect(ema.countdown).toBe(2);
    const mk = give(s, 0, 'o_omikuji');
    apply(s, { t: 'play', uid: mk.uid });
    expect(ema.countdown).toBe(1);
    const mk2 = give(s, 0, 'o_omikuji');
    apply(s, { t: 'play', uid: mk2.uid });
    expect(s.players[0].board.includes(ema)).toBe(false);
    expect(s.players[0].fulfilled).toBe(1);
    // komainu +2, 健康守り +4
    expect(s.players[0].hp).toBe(16);
  });

  it('natural countdown also fulfills; 九尾 re-summons twice per turn', () => {
    const s = game();
    put(s, 0, 'o_kyubi');
    const a = put(s, 0, 'o_gakugyo');
    a.countdown = 1;
    apply(s, { t: 'end' });
    apply(s, { t: 'end' });
    expect(s.players[0].fulfilled).toBe(1);
    expect(s.players[0].board.filter((c) => c.id === 'o_gakugyo').length).toBe(1);
  });
});

describe('puppet: 人形 / 操演', () => {
  it('counts puppets entering the board and reacts to them', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    put(s, 0, 'p_workshop');
    const par = give(s, 0, 'p_parade');
    apply(s, { t: 'play', uid: par.uid });
    const ps = s.players[0].board.filter((c) => c.id === 't_puppet');
    expect(ps.length).toBe(3);
    expect(s.players[0].puppets).toBe(3);
    expect(ps.every((p) => E.has(p, 'bane') && E.has(p, 'rush'))).toBe(true);
    const giga = give(s, 0, 'p_gigadoll');
    expect(E.playCost(s, giga).cost).toBe(6);
  });

  it('人形 vanish at the end of the opponent turn', () => {
    const s = game();
    s.players[0].pp = 10;
    const par = give(s, 0, 'p_parade');
    apply(s, { t: 'play', uid: par.uid });
    const mat = put(s, 0, 'p_matryoshka');
    apply(s, { t: 'end' });
    expect(s.players[0].board.filter((c) => c.id === 't_puppet').length).toBe(3);
    apply(s, { t: 'end' });
    expect(s.players[0].board.some((c) => c.id === 't_puppet')).toBe(false);
    // only the basic token is fleeting
    expect(s.players[0].board.includes(mat)).toBe(true);
    expect(s.players[0].puppets).toBe(3);
  });

  it('puppets from hand cost 0 and orca gives them storm', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].hand = [];
    const orca = give(s, 0, 'p_orca');
    apply(s, { t: 'play', uid: orca.uid });
    const dolls = s.players[0].hand.filter((c) => c.id === 't_puppet');
    expect(dolls.length).toBe(4);
    expect(E.playCost(s, dolls[0]).cost).toBe(0);
    apply(s, { t: 'play', uid: dolls[0].uid });
    expect(E.has(dolls[0], 'storm')).toBe(true);
    expect(s.players[0].puppets).toBe(1);
  });
});

describe('rankings: battle records', () => {
  it('counts played cards per side and tallies leaders', async () => {
    const { newSave } = await import('../src/meta/save');
    const { recordBattle, cardRanking, leaderRanking } = await import('../src/meta/records');
    const s = game();
    s.players[0].pp = 10;
    const a = give(s, 0, 'n_slime');
    apply(s, { t: 'play', uid: a.uid });
    expect(s.players[0].stats.played).toEqual({ n_slime: 1 });
    const d = newSave();
    recordBattle(d, { win: true, draw: false, playerCls: 'novel', enemyCls: 'deco', playerPlayed: { n_slime: 2, b_pen: 1 }, enemyPlayed: { e_nail: 1, n_slime: 1 } });
    recordBattle(d, { win: false, draw: false, playerCls: 'novel', enemyCls: 'deco', playerPlayed: { b_pen: 1 }, enemyPlayed: { e_nail: 1 } });
    expect(d.records.battles).toBe(2);
    expect(d.records.player.novel).toEqual({ g: 2, w: 1 });
    expect(d.records.npc.deco).toEqual({ g: 2, w: 1 });
    // slime was played by both sides in the first battle: one win, one loss
    expect(d.records.cards.n_slime).toEqual({ g: 2, w: 1, mine: 1 });
    expect(d.records.cards.e_nail).toEqual({ g: 2, w: 1, mine: 0 });
    const rows = cardRanking(d, 'battle', 'all', 2); // (the screen uses 3)
    expect(rows.map((r) => r.d.id).sort()).toEqual(['b_pen', 'e_nail', 'n_slime']);
    expect(leaderRanking(d, 'player')[0].cls).toBe('novel');
    expect(cardRanking(d, 'sim', 'novel', 0).length).toBe(21);
  });
});

describe('rankings: matchup table', () => {
  it('records your leader vs the NPC leader and finds strong/weak matchups', async () => {
    const { newSave } = await import('../src/meta/save');
    const { recordBattle, matchupTable, strongWeak } = await import('../src/meta/records');
    const d = newSave();
    const r = (win: boolean, enemyCls: 'deco' | 'spicy') => recordBattle(d, { win, draw: false, playerCls: 'novel', enemyCls, playerPlayed: {}, enemyPlayed: {} });
    r(true, 'deco');
    r(true, 'deco');
    r(false, 'spicy');
    expect(d.records.matchups['novel>deco']).toEqual({ g: 2, w: 2 });
    const t = matchupTable(d, 'battle');
    expect(t.rows).toEqual(['novel']);
    expect(t.cols).toEqual(['deco', 'spicy']);
    const sw = strongWeak(t, 'novel');
    expect(sw.strong[0][0]).toBe('deco');
    expect(sw.weak[0][0]).toBe('spicy');
    expect(matchupTable(d, 'sim').rows.length).toBe(18);
  });
});

describe('patch: card adjustments', () => {
  it('無限ループ destroys a follower and returns a fresh copy', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hand = [];
    const t = put(s, 0, 'n_bear');
    t.atk += 3;
    const loop = give(s, 0, 'x_loop');
    apply(s, { t: 'play', uid: loop.uid, target: t.uid });
    expect(s.players[0].board.includes(t)).toBe(false);
    const back = s.players[0].hand.find((c) => c.id === 'n_bear')!;
    expect(back).toBeTruthy();
    expect(back.atk).toBe(def('n_bear').atk);
    expect(E.playCost(s, back).cost).toBe(def('n_bear').cost);
  });

  it('炎上 with 30 likes leaves 炎上の火, which burns every turn end', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].likes = 30;
    const f = give(s, 0, 's_flame');
    apply(s, { t: 'play', uid: f.uid });
    expect(s.players[0].board.some((c) => c.id === 't_flamefire')).toBe(true);
    const hp = s.players[1].hp;
    apply(s, { t: 'end' });
    expect(s.players[1].hp).toBe(hp - 4);
  });

  it('アンチ splits on evolve; 魔王 comes back in its second form', () => {
    const s = game();
    s.players[0].ep = 2;
    s.players[0].turns = 10;
    const a = put(s, 0, 's_anti');
    apply(s, { t: 'evolve', uid: a.uid, sup: false });
    expect(s.players[0].board.filter((c) => c.id === 's_anti').length).toBe(3);
    const m = put(s, 1, 'm_maou');
    m.doomed = true;
    E.resolve(s);
    expect(s.players[1].board.some((c) => c.id === 't_maou2')).toBe(true);
  });
});

describe('カード歴史', () => {
  it('the latest patch notes match the cards as they are now', async () => {
    const { PATCHES } = await import('../src/meta/history');
    for (const c of PATCHES[0].changes) {
      const d = def(c.id);
      expect(d.cost, c.id).toBe(c.after.cost);
      expect(d.text, c.id).toBe(c.after.text);
      expect(d.atk, c.id).toBe(c.after.atk);
      expect(d.hp, c.id).toBe(c.after.hp);
    }
  });
});

describe('patch: card adjustments (part 2)', () => {
  it('rangers get a bonus when transformed by an effect, not by an evolve point', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].maxPp = 10;
    s.players[0].hand = [];
    const blue = put(s, 0, 'k_blue');
    expect(E.has(blue, 'rush')).toBe(true);
    s.players[0].pp = 3;
    E.evolveFree(s, blue);
    // 進化時 draws 2, 変身時 restores 2 PP
    expect(s.players[0].hand.length).toBe(2);
    expect(s.players[0].pp).toBe(5);
  });

  it('お皿割り師 reacts to enemy cards breaking too', () => {
    const s = game();
    put(s, 0, 'c_plates');
    const e = put(s, 1, 'n_slime');
    const hp = s.players[1].hp;
    e.doomed = true;
    E.resolve(s);
    expect(s.players[1].hp).toBe(hp - 1);
  });

  it('古き天剣 burns the board when discarded', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hand = [];
    give(s, 0, 't_oldsword');
    const foe = put(s, 1, 'n_bear');
    const zen = give(s, 0, 'q_zen');
    const other = put(s, 1, 'n_golem');
    apply(s, { t: 'play', uid: zen.uid, target: other.uid });
    expect(s.players[1].board.includes(other)).toBe(false);
    expect(E.hpOf(foe)).toBe(4);
  });
});

describe('patch: card adjustments (part 3)', () => {
  it('叛逆の人形 lowers the enemy max HP and draws however it enters', () => {
    const s = game();
    s.players[0].hand = [];
    const max = s.players[1].maxHp;
    E.summon(s, 0, 't_rebel', 2);
    expect(s.players[1].maxHp).toBe(max - 4);
    expect(s.players[0].hand.length).toBe(2);
    expect(s.players[0].puppets).toBe(2);
  });

  it('九尾の白狐 gets cheaper in hand for every 成就', () => {
    const s = game();
    const fox = give(s, 0, 'o_kyubi');
    const a = put(s, 0, 'o_gakugyo');
    const b = put(s, 0, 'o_ema');
    E.expire(s, a);
    E.expire(s, b);
    expect(E.playCost(s, fox).cost).toBe(def('o_kyubi').cost - 2);
  });

  it('日輪 trades an amulet for damage, healing and another 日輪', () => {
    const s = game();
    s.players[0].pp = 10;
    s.players[0].hp = 10;
    s.players[0].hand = [];
    put(s, 0, 'o_torii');
    const ehp = s.players[1].hp;
    const n = give(s, 0, 't_nichirin');
    apply(s, { t: 'play', uid: n.uid });
    expect(s.players[0].board.some((c) => c.id === 'o_torii')).toBe(false);
    expect(s.players[0].hand.some((c) => c.id === 't_nichirin')).toBe(true);
    expect(s.players[0].hp).toBe(12);
    expect(s.players[1].hp).toBeLessThan(ehp);
  });
});
