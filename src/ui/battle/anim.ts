import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, def, KEYWORDS, RULES, tgtSide, type GameEvent, type GachaTier, type Side } from '../../engine';
import { save } from '../../meta/save';
import { CARD_H, CARD_W, fitCardText, staticCard } from '../cardview';
import { h, wait } from '../dom';
import { banner, cutIn, flash, notifySpam, popText, shake, slam, T, toast, vignette } from '../fx/fx';
import { hasLegendIntro, legendIntro } from '../fx/legends';
import { particles } from '../fx/particles';
import type { Battle } from './battle';
import type { Pos } from './layout';

const TRIGGER_LABEL: Record<string, string | null> = {
  fanfare: 'ファンファーレ',
  lastWords: 'ラストワード',
  evolve: null,
  superEvolve: null,
  strike: '攻撃時',
  clash: '交戦時',
  turnStart: 'ターン開始時',
  turnEnd: 'ターン終了時',
  onPlay: '発動！',
  onSummon: '発動！',
  onHeal: '発動！',
  onLevelUp: null,
  onAllyDestroyed: '発動！',
  onBreak: '発動！',
  onAllyEvolve: '発動！',
  onDiscard: '捨てられた時',
  onAnyDiscard: '発動！',
  accelerate: null,
  onHatch: null,
  onFlip: '発動！',
  onCrest: '発動！',
  onLeaderHurt: '発動！',
  onFulfill: '発動！',
  onTransform: '変身！',
  onEnter: '発動！',
  onEnemyBreak: '発動！',
};

const TIER_COLOR: Record<GachaTier, string> = {
  N: '#9aa3c7',
  R: '#38d6ff',
  SR: '#ffd23f',
  SSR: '#ff3fa4',
};

const FANS = ['ドパ太郎', 'mimi_0721', '深夜の住人', 'ガチ恋勢', 'しろくま', '通りすがりの神', '推し活中', 'ねむい人', 'バズ職人', '名無しさん'];

export class Animator {
  private lastPos = new Map<number, Pos>();
  private gachaChain = 0;
  private feverMusic = false;

  constructor(private b: Battle) {}

  async play(evs: GameEvent[]): Promise<void> {
    for (let i = 0; i < evs.length; i++) {
      if (this.b.destroyed) return;
      const ev = evs[i];
      const next = evs[i + 1];
      await this.one(ev, next);
      if (ev.t !== 'gacha') this.gachaChain = 0;
    }
    this.b.render();
    await this.announce(evs);
  }

  /** multi-kill / big-play callouts after an action resolves */
  private async announce(evs: GameEvent[]): Promise<void> {
    if (this.b.destroyed || this.b.s.phase === 'over') return;
    const kills = new Map<Side, number>();
    let maxHit = 0;
    for (const ev of evs) {
      if (ev.t === 'destroy' && !ev.banish) {
        const killer: Side = ev.side === 0 ? 1 : 0;
        kills.set(killer, (kills.get(killer) ?? 0) + 1);
      }
      if (ev.t === 'damage') maxHit = Math.max(maxHit, ev.amount);
    }
    const last = evs[evs.length - 1]?.snap;
    for (const [side, n] of kills) {
      if (n < 2) continue;
      const wiped = n >= 3 && last && last.p[side === 0 ? 1 : 0].board.filter((c) => def(c.id).type === 'follower').length === 0;
      const text = wiped ? '全滅！！！' : n >= 4 ? 'クアドラキル！！' : n === 3 ? 'トリプルキル！！' : 'ダブルキル！';
      audio.play(n >= 3 ? 'gachaSSR' : 'gachaSR');
      if (side === 0) particles.rain('💥', 10 + n * 4, 30);
      await slam(text, side === 0 ? (n >= 3 ? 'slam-ssr' : 'slam-gold') : 'slam-blue', 850, side === 0 ? `${n}体撃破` : '相手の連続撃破');
      return;
    }
    if (maxHit >= 9) {
      audio.play('gachaSR');
      await slam(maxHit >= 12 ? '神ダメージ！！' : 'エグい！', 'slam-gold', 750, `${maxHit}ダメージ`);
    }
  }

  private render(ev: GameEvent): void {
    for (const [uid, p] of this.b.pos) this.lastPos.set(uid, p);
    if (ev.snap) this.b.render(ev.snap);
    for (const [uid, p] of this.b.pos) this.lastPos.set(uid, p);
  }

  private posOf(uid: number): { x: number; y: number } {
    const p = this.b.pos.get(uid) ?? this.lastPos.get(uid);
    return p ? { x: p.x, y: p.y } : { x: this.b.g.cx, y: this.b.g.H / 2 };
  }

  private tgtPos(t: number): { x: number; y: number } {
    if (t < 0) return this.b.g.leader[tgtSide(t)];
    return this.posOf(t);
  }

  /** where a card is on screen, or its owner's leader if it isn't on the board */
  private posOr(uid: number, side: Side): { x: number; y: number } {
    return this.b.pos.has(uid) || this.lastPos.has(uid) ? this.posOf(uid) : this.b.g.leader[side];
  }

  private crestOf(side: Side, uid: number): { i: number; id: string } | null {
    const i = this.b.s.players[side].crests.findIndex((c) => c.uid === uid);
    return i < 0 ? null : { i, id: this.b.s.players[side].crests[i].id };
  }

  private clsOf(side: Side) {
    return CLASSES[side === 0 ? this.b.cfg.playerCls : this.b.cfg.enemyCls];
  }

  private ownerOf(uid: number): Side {
    const el = this.b.els.get(uid);
    if (el?.dataset.side) return Number(el.dataset.side) as Side;
    const p = this.lastPos.get(uid);
    return (p?.side ?? 0) as Side;
  }

  private bump(el: Element | undefined | null, cls: string): void {
    if (!el) return;
    el.classList.remove(cls);
    void (el as HTMLElement).offsetWidth;
    el.classList.add(cls);
  }

  say(side: Side, text: string): void {
    const L = this.b.leaderRoot(side);
    L.querySelector('.leader-say')?.remove();
    const bub = h(`div.leader-say.side-${side}`, text);
    L.append(bub);
    setTimeout(() => bub.remove(), 2600);
  }

  private lastReact = 0;

  /** the AI opponent occasionally talks back */
  enemyReact(kind: 'emote' | 'hurt' | 'legend' | 'evolve' | 'kill'): void {
    const now = performance.now();
    if (now - this.lastReact < 4000) return;
    const pool: Record<typeof kind, string[]> = {
      emote: ['こっちこそ！', 'まだ本気出してないし', 'ふーん？', 'ドパドパ！'],
      hurt: ['いたっ！', 'ちょ、待って！', 'それは効く…', 'うそでしょ！？'],
      legend: ['それはズルい！', 'レジェンド！？', 'うわ、出た…'],
      evolve: ['いくよ！', '進化の時間！', '見てて！'],
      kill: ['ごめんね？', 'はい、退場〜', 'いただき！'],
    };
    const list = pool[kind];
    this.lastReact = now;
    this.say(1, list[Math.floor(Math.random() * list.length)]);
  }

  private async matchmaking(): Promise<void> {
    const b = this.b;
    const text = h('div.match-text', '対戦相手を探しています');
    const sub = h('div.match-sub', 'ランクマッチ');
    const ring = h('div.match-ring');
    const el = h('div.matching', ring, text, sub);
    b.root.append(el);
    let dots = 0;
    const t = window.setInterval(() => {
      dots = (dots + 1) % 4;
      text.textContent = '対戦相手を探しています' + '.'.repeat(dots);
      audio.play('tick', { vol: 0.5 });
    }, 220);
    await wait(900 + Math.random() * 900);
    clearInterval(t);
    ring.remove();
    text.replaceWith(h('div.match-found', 'MATCH!'));
    audio.play('unlock');
    await wait(T(550));
    el.classList.add('out');
    await wait(200);
    el.remove();
  }

  async versus(): Promise<void> {
    const b = this.b;
    if (b.cfg.mode === 'rank') await this.matchmaking();
    const pc = CLASSES[b.cfg.playerCls];
    const ec = CLASSES[b.cfg.enemyCls];
    const side = (cls: string, c: typeof pc, art: string, name: string) =>
      h(`div.vs-side.${cls}`, { style: { '--c1': c.color, '--c2': c.color2 } }, h('div.vs-rays'), h('div.vs-art', art), h('div.vs-name', name), h('div.vs-sub', `${c.emoji} ${c.name}`));
    const el = h(
      'div.versus',
      side('vs-p', pc, pc.leaderArt, save.data.winStreak >= 2 ? `${save.data.name} 🔥${save.data.winStreak}連勝中` : save.data.name),
      side('vs-e', ec, b.cfg.enemyArt ?? ec.leaderArt, b.cfg.enemyName),
      h('div.vs-mark', 'VS'),
    );
    b.root.append(el);
    audio.play('whoosh');
    await wait(T(380));
    audio.play('stamp');
    shake(18, 320);
    flash('#fff', 0.5, 220);
    particles.burst(b.g.cx, b.g.H / 2, { n: 60, colors: ['#ffe14d', '#fff', pc.color, ec.color], speed: 14, type: 'spark', size: 7 });
    particles.speedLines(0.9);
    await wait(T(1150));
    el.classList.add('out');
    await wait(260);
    el.remove();
  }

  async coinToss(first: boolean): Promise<void> {
    const el = h('div.coin-toss', h('div.coin-spin', h('div.coin-face', '🪙')), h('div.coin-result', first ? '先攻' : '後攻'), h('div.coin-sub', first ? 'あなたからスタート！' : '2枚ドロー＆EP多めでスタート！'));
    this.b.root.append(el);
    audio.play('dice');
    await wait(T(700));
    el.classList.add('done');
    audio.play(first ? 'gachaSR' : 'gachaR');
    particles.burst(this.b.g.cx, this.b.g.H / 2, { n: 40, colors: ['#ffe14d', '#fff'], speed: 10 });
    await wait(T(900));
    el.remove();
  }

  // ------------------------------------------------------------------ events

  private async one(ev: GameEvent, next?: GameEvent): Promise<void> {
    const b = this.b;
    const g = b.g;
    switch (ev.t) {
      case 'start':
      case 'mulligan':
        this.render(ev);
        await wait(T(120));
        return;
      case 'turnStart': {
        this.render(ev);
        if (this.feverMusic) {
          this.feverMusic = false;
          music.play(b.cfg.bgm ?? 'battle');
        }
        if (ev.side === 0) await banner('YOUR TURN', { sub: `${ev.ownTurn}ターン目`, cls: 'b-player', sfx: 'turn', ms: 950 });
        else await banner('ENEMY TURN', { sub: `${ev.ownTurn}ターン目`, cls: 'b-enemy', sfx: 'enemyTurn', ms: 800 });
        return;
      }
      case 'turnEnd':
        this.render(ev);
        return;
      case 'unlock': {
        this.render(ev);
        const sup = ev.kind === 'super';
        if (ev.side === 0) {
          particles.burst(g.leader[0].x, g.leader[0].y, { n: 60, colors: sup ? ['#ff3fa4', '#ffe14d', '#38d6ff'] : ['#ffe14d', '#fff'], speed: 12 });
          await banner(sup ? '超進化 解禁！！' : '進化 解禁！', { sub: sup ? 'SEPでフォロワーを超進化できる！' : 'EPでフォロワーを進化できる！', cls: sup ? 'b-super' : 'b-evo', sfx: 'unlock', ms: 1300 });
        } else toast(sup ? '相手の超進化が解禁された' : '相手の進化が解禁された', '⚠️');
        return;
      }
      case 'draw': {
        this.render(ev);
        audio.play('draw', { pitch: 0.9 + Math.random() * 0.2, vol: ev.side === 0 ? 1 : 0.5 });
        await wait(T(ev.side === 0 ? 170 : 90));
        return;
      }
      case 'addHand': {
        this.render(ev);
        if (ev.side === 0) {
          const p = this.posOf(ev.uid);
          particles.burst(p.x, p.y, { n: 18, colors: ['#ffe14d', '#fff'], speed: 6, type: 'star', size: 7 });
          audio.play('reveal', { vol: 0.6 });
        }
        await wait(T(240));
        return;
      }
      case 'burn': {
        this.render(ev);
        const tmp = staticCard(ev.id, 'detail');
        const wrap = h('div.burn-card', { style: { left: `${g.cx}px`, top: `${g.H / 2}px` } }, tmp);
        b.root.append(wrap);
        toast(ev.side === 0 ? '手札がいっぱい！カードが燃え尽きた' : '相手の手札があふれた', '🔥');
        await wait(T(500));
        particles.burst(g.cx, g.H / 2, { n: 40, colors: ['#ff7b2e', '#ffe14d', '#ff2e2e'], speed: 8, gravity: -0.15 });
        wrap.remove();
        return;
      }
      case 'deckout':
        this.render(ev);
        await banner('山札切れ…', { cls: 'b-enemy', ms: 1000 });
        return;
      case 'play': {
        const pd = def(ev.id);
        if (pd.rarity === 'legend') {
          const c = this.clsOf(ev.side);
          audio.play('gachaSSR');
          if (hasLegendIntro(ev.id)) await legendIntro(ev.id, { enemy: ev.side === 1 });
          else await cutIn({ art: pd.art, art2: pd.art2, name: pd.name, title: ev.side === 0 ? 'LEGEND' : '相手のLEGEND', color: c.color, color2: c.counter === 'combo' || c.counter === 'luck' ? '#ff3fa4' : '#ffe14d', kind: 'legend', enemy: ev.side === 1, line: pd.flavor });
          if (ev.side === 0 && Math.random() < 0.6) this.enemyReact('legend');
        } else if (ev.side === 1) await this.revealEnemyPlay(ev.id, ev.enhanced);
        this.render(ev);
        const pitch = Math.pow(2, (Math.min(ev.combo, 12) - 1) * (2 / 12));
        audio.play('play', { pitch });
        await wait(T(ev.side === 1 ? 160 : 120));
        return;
      }
      case 'combo': {
        this.render(ev);
        const n = ev.count;
        const pos = g.combo;
        this.bump(b.comboEl, 'bump');
        popText(pos.x, pos.y - 70, n >= 5 ? `${n} COMBO!!!` : `${n} COMBO!`, { cls: n >= 4 ? 'pop-combo-big' : 'pop-combo', size: 36 + Math.min(n, 8) * 6, ms: 900 });
        audio.play('combo', { pitch: Math.pow(2, Math.min(n, 12) / 12) });
        if (n >= 4) {
          shake(4 + n, 200);
          particles.burst(pos.x, pos.y, { n: 10 + n * 4, colors: ['#ffe14d', '#ff2e88', '#38d6ff'], speed: 9 });
        }
        if (n === 5) popText(g.cx, g.H * 0.42, 'ドパドパ！', { cls: 'pop-hype', size: 64, ms: 1000 });
        if (n === 7) popText(g.cx, g.H * 0.42, '止まらない！！', { cls: 'pop-hype', size: 70, ms: 1000 });
        await wait(T(140));
        return;
      }
      case 'enhance': {
        const p = this.posOf(ev.uid);
        const at = b.pos.has(ev.uid) ? p : { x: g.cx, y: g.H / 2 };
        popText(at.x, at.y - 40, '課金！！', { cls: 'pop-cash', size: 52, ms: 1000 });
        particles.burst(at.x, at.y, { n: 24, type: 'glyph', glyph: '💰', speed: 9, size: 24, gravity: 0.3 });
        particles.rain('🪙', 10, 26);
        audio.play('cash');
        await wait(T(380));
        return;
      }
      case 'summon': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        const c = this.clsOf(ev.side);
        if (ev.fromHand) {
          await wait(T(150));
          particles.ring(p.x, p.y + 10, c.color, 120, 0.4, 12);
          particles.burst(p.x, p.y + 60, { n: 18, colors: ['#ffffff', c.color], speed: 5, spread: Math.PI, angle: -Math.PI / 2, gravity: 0.2, type: 'dot', size: 4 });
          shake(6, 160);
          audio.play('summon');
          await wait(T(180));
        } else {
          particles.burst(p.x, p.y, { n: 16, colors: ['#ffffff', c.color2], speed: 6, type: 'star', size: 6 });
          audio.play('summon', { pitch: 1.4, vol: 0.6 });
          await wait(T(200));
        }
        return;
      }
      case 'spell': {
        this.render(ev);
        const c = this.clsOf(ev.side);
        const el = h('div.spell-cast', { style: { left: `${g.cx}px`, top: `${g.H / 2}px`, '--c1': c.color } }, staticCard(ev.id, 'detail'));
        b.root.append(el);
        fitCardText(el);
        audio.play('spell');
        await wait(T(520));
        particles.burst(g.cx, g.H / 2, { n: 50, colors: [c.color, c.color2, '#fff'], speed: 12, type: 'star', size: 7 });
        particles.ring(g.cx, g.H / 2, c.color, 260, 0.5, 14);
        el.classList.add('out');
        setTimeout(() => el.remove(), 260);
        if (ev.target !== null) {
          const tp = this.tgtPos(ev.target);
          particles.orbs(g.cx, g.H / 2, tp.x, tp.y, 14, c.color);
          await wait(T(220));
        }
        return;
      }
      case 'trigger': {
        const label = TRIGGER_LABEL[ev.kind];
        if (label === null || label === undefined) return;
        const crest = this.crestOf(ev.side, ev.uid);
        if (crest) {
          // デコラー: a crest on the leader reacts
          const L = g.leader[ev.side];
          const stk = b.leaderRoot(ev.side).querySelectorAll<HTMLElement>('.crest-stk')[crest.i];
          this.bump(stk, 'crest-go');
          particles.burst(L.x, L.y, { n: 8, type: 'glyph', glyph: def(crest.id).art, speed: 6, size: 18, gravity: -0.05 });
          popText(L.x + 80, L.y - 50, def(crest.id).name, { cls: 'pop-crest', size: 18, dy: -26, ms: 700 });
          await wait(T(150));
          return;
        }
        const p = this.posOf(ev.uid);
        const el = b.els.get(ev.uid);
        this.bump(el, 'triggered');
        popText(p.x, p.y - 70, label, { cls: `pop-trigger trig-${ev.kind}`, size: 22, dy: -30, ms: 800 });
        await wait(T(ev.kind === 'lastWords' ? 260 : 170));
        return;
      }
      case 'attack': {
        const el = b.els.get(ev.uid);
        const from = this.posOf(ev.uid);
        const to = this.tgtPos(ev.target);
        if (el) {
          const p = b.pos.get(ev.uid);
          const s = p ? p.s : 0.6;
          const k = 0.72;
          const x = from.x + (to.x - from.x) * k;
          const y = from.y + (to.y - from.y) * k;
          el.classList.add('lunge');
          el.style.zIndex = '800';
          el.style.transform = `translate(${from.x - CARD_W / 2}px, ${from.y - CARD_H / 2 + (ev.uid && this.ownerOf(ev.uid) === 0 ? 30 : -30)}px) scale(${s * 1.12})`;
          audio.play('whoosh', { vol: 0.7 });
          await wait(T(110));
          el.style.transform = `translate(${x - CARD_W / 2}px, ${y - CARD_H / 2}px) scale(${s * 1.15})`;
          await wait(T(110));
          setTimeout(() => el.classList.remove('lunge'), 300);
        }
        return;
      }
      case 'damage': {
        const p = this.tgtPos(ev.target);
        const n = ev.amount;
        const big = n >= 5;
        const leader = ev.target < 0;
        const size = Math.min(120, 40 + n * 5);
        popText(p.x + (Math.random() - 0.5) * 20, p.y - 20, String(n), { cls: n >= 8 ? 'pop-crit' : big ? 'pop-dmg-big' : 'pop-dmg', size, ms: big ? 1100 : 850 });
        if (ev.overkill > 0 && !leader) setTimeout(() => popText(p.x, p.y + 30, `OVERKILL +${ev.overkill}`, { cls: 'pop-overkill', size: 24, ms: 900 }), 120);
        const colors = ev.combat ? ['#ffffff', '#ffe14d', '#ff7b2e'] : ['#ffffff', '#ff4dff', '#38d6ff'];
        particles.burst(p.x, p.y, { n: 10 + Math.min(30, n * 3), colors, speed: 7 + Math.min(10, n), type: 'spark', size: 5 + Math.min(6, n) });
        if (big) particles.ring(p.x, p.y, '#ffe14d', 100 + n * 8, 0.35, 10);
        shake(Math.min(30, 4 + n * 2.4), big ? 340 : 200);
        if (leader) {
          const side = tgtSide(ev.target);
          const L = b.leaderRoot(side);
          this.bump(L, 'hurt');
          if (side === 1 && n >= 4 && Math.random() < 0.5) this.enemyReact('hurt');
          audio.play('face', { vol: Math.min(1, 0.6 + n * 0.06) });
          if (side === 0) vignette(n >= 5 ? 'rgba(255,20,60,0.9)' : 'rgba(255,30,60,0.6)', 600);
          if (ev.fatal) {
            flash('#fff', 0.9, 400);
            particles.speedLines(0.6);
          } else if (side === 0 && n >= 3 && Math.random() < 0.5) this.say(0, this.clsOf(0).lines.hurt);
        } else {
          this.bump(b.els.get(ev.target), 'hit');
          audio.play(big ? 'bigHit' : 'hit');
        }
        if (big) {
          flash('#fff', 0.25, 120);
          await wait(T(80));
        }
        this.render(ev);
        await wait(T(big ? 240 : 150));
        return;
      }
      case 'immune': {
        const p = this.posOf(ev.uid);
        popText(p.x, p.y - 30, '無効！', { cls: 'pop-shield', size: 34 });
        particles.ring(p.x, p.y, '#ffffff', 90, 0.35, 8);
        audio.play('barrier');
        await wait(T(220));
        return;
      }
      case 'barrier': {
        const p = this.posOf(ev.uid);
        popText(p.x, p.y - 30, 'バリア！', { cls: 'pop-shield', size: 34 });
        particles.ring(p.x, p.y, '#38d6ff', 110, 0.45, 12);
        particles.burst(p.x, p.y, { n: 20, colors: ['#38d6ff', '#fff'], speed: 7, type: 'shard', size: 8 });
        audio.play('barrier');
        this.render(ev);
        await wait(T(260));
        return;
      }
      case 'heal': {
        this.render(ev);
        if (ev.amount <= 0) return;
        const p = this.tgtPos(ev.target);
        popText(p.x, p.y - 20, `+${ev.amount}`, { cls: 'pop-heal', size: 40 + ev.amount * 3 });
        particles.burst(p.x, p.y, { n: 16, colors: ['#3dffc5', '#ffffff', '#b8ffea'], speed: 4, gravity: -0.12, type: 'star', size: 6 });
        if (ev.target < 0) this.bump(b.leaderRoot(tgtSide(ev.target)), 'healed');
        audio.play('heal');
        await wait(T(220));
        return;
      }
      case 'destroy': {
        const p = this.b.pos.get(ev.uid) ?? this.lastPos.get(ev.uid);
        const el = b.els.get(ev.uid);
        if (p && el && !ev.banish) {
          el.dataset.gone = '1';
          const w = CARD_W * p.s;
          const hh = CARD_H * p.s;
          const c = this.clsOf(ev.side);
          particles.shatter({ x: p.x - w / 2, y: p.y - hh / 2, w, h: hh }, [c.color, c.color2, '#ffffff', '#1b1440']);
          particles.ring(p.x, p.y, c.color, 110, 0.4, 10);
          const killer: Side = ev.side === 0 ? 1 : 0;
          const L = g.leader[killer];
          particles.orbs(p.x, p.y, L.x, L.y, 6, '#ff2e88');
          audio.play('shatter');
        } else if (el) {
          el.classList.add('banished');
          audio.play('whoosh');
        }
        this.render(ev);
        await wait(T(240));
        return;
      }
      case 'bounce':
        this.render(ev);
        audio.play('whoosh');
        await wait(T(260));
        return;
      case 'buff': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
        const txt = ev.hp === 0 ? `${sign(ev.atk)} ATK` : ev.atk === 0 ? `${sign(ev.hp)} HP` : `${sign(ev.atk)}/${sign(ev.hp)}`;
        const neg = ev.atk < 0 || ev.hp < 0;
        popText(p.x, p.y - 40, txt, { cls: neg ? 'pop-nerf' : 'pop-buff', size: 30 });
        if (!neg) particles.burst(p.x, p.y + 30, { n: 10, colors: ['#ffe14d', '#fff'], speed: 4, spread: 1, angle: -Math.PI / 2, gravity: -0.05, type: 'spark', size: 4 });
        this.bump(b.els.get(ev.uid), 'buffed-flash');
        audio.play('buff', { pitch: 1 + Math.random() * 0.15 });
        await wait(T(150));
        return;
      }
      case 'keyword': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        const k = KEYWORDS[ev.kw];
        popText(p.x, p.y - 50, `${k.icon}${k.name}`, { cls: 'pop-kw', size: 28 });
        audio.play('buff', { pitch: 1.3 });
        await wait(T(200));
        return;
      }
      case 'evolve': {
        const side = ev.side;
        const cv = ev.snap?.p[side].board.find((c) => c.uid === ev.uid);
        const d = def(cv?.id ?? 'n_slime');
        const c = this.clsOf(side);
        audio.play(ev.sup ? 'super' : 'evolve');
        if (side === 0 && Math.random() < 0.6) this.say(0, c.lines.evolve);
        if (side === 1 && Math.random() < 0.5) this.enemyReact('evolve');
        await cutIn({ art: d.art, art2: d.art2, name: d.name, title: ev.sup ? '超進化' : '進化', color: ev.sup ? '#ff3fa4' : c.color, color2: ev.sup ? '#ffe14d' : c.color2, kind: ev.sup ? 'super' : 'evolve', enemy: side === 1 });
        this.render(ev);
        const p = this.posOf(ev.uid);
        particles.ring(p.x, p.y, ev.sup ? '#ff3fa4' : c.color, 160, 0.5, 16);
        particles.burst(p.x, p.y, { n: 40, colors: ev.sup ? ['#ff3fa4', '#ffe14d', '#38d6ff', '#fff'] : [c.color, '#fff'], speed: 10, type: 'star', size: 7 });
        this.bump(b.els.get(ev.uid), 'evo-flash');
        await wait(T(260));
        return;
      }
      case 'transform': {
        const p = this.posOf(ev.uid);
        flash('#fff', 0.3, 160);
        particles.burst(p.x, p.y, { n: 30, colors: ['#fff', '#ffe14d'], speed: 8 });
        this.render(ev);
        await wait(T(260));
        return;
      }
      case 'gacha':
        await this.gacha(ev.side, ev.uid, ev.tier, ev.ceiling, ev.kakuhen, next?.t === 'gacha' || this.gachaChain > 0);
        this.gachaChain++;
        this.render(ev);
        return;
      case 'coin': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        const el = h('div.mini-roll.coin', { style: { left: `${p.x}px`, top: `${p.y - 30}px` } }, h('div.roll-face', '🪙'));
        b.root.append(el);
        audio.play('flip');
        await wait(T(550));
        el.classList.add('done');
        el.querySelector('.roll-face')!.textContent = ev.heads ? '表' : '裏';
        audio.play('coin');
        await wait(T(450));
        el.remove();
        return;
      }
      case 'dice': {
        const p = { x: g.cx, y: g.H / 2 };
        const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const face = h('div.roll-face', faces[0]);
        const el = h('div.mini-roll.dice', { style: { left: `${p.x}px`, top: `${p.y}px` } }, face);
        b.root.append(el);
        audio.play('dice');
        for (let i = 0; i < 8; i++) {
          face.textContent = faces[Math.floor(Math.random() * 6)];
          await wait(T(55));
        }
        face.textContent = faces[ev.value - 1];
        el.classList.add('done');
        popText(p.x, p.y - 70, `${ev.value}！`, { cls: ev.value === 6 ? 'pop-crit' : 'pop-buff', size: 56 });
        if (ev.value === 6) {
          particles.burst(p.x, p.y, { n: 50, colors: ['#ffe14d', '#ff2e88', '#fff'], speed: 12 });
          audio.play('gachaSSR');
        } else audio.play('coin');
        await wait(T(500));
        el.remove();
        return;
      }
      case 'likes': {
        this.render(ev);
        if (ev.amount <= 0) return;
        const streamer = this.clsOf(ev.side).counter === 'likes';
        if (!streamer) return;
        const L = g.leader[ev.side];
        particles.floatUp(L.x + 70, L.y, '❤️', Math.min(8, 1 + ev.amount), 50);
        popText(L.x + 90, L.y - 30, `+${ev.amount}❤`, { cls: 'pop-like', size: 26, dy: -40, ms: 800 });
        audio.play('like', { pitch: 1 + Math.min(ev.total, 20) * 0.02 });
        await wait(T(ev.amount >= 2 ? 160 : 60));
        return;
      }
      case 'buzz': {
        this.render(ev);
        const lines = Array.from({ length: 7 }, (_, i) => `${FANS[(i * 3 + ev.spent) % FANS.length]}さんがいいねしました`);
        notifySpam(lines);
        particles.rain('❤️', 30, 28);
        await slam('バズった！！', 'slam-pink', 1000, `いいね -${ev.spent}`);
        return;
      }
      case 'sweet': {
        this.render(ev);
        if (this.clsOf(ev.side).counter !== 'sweet') return;
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y + 20, `糖度+${ev.amount}`, { cls: 'pop-sweet', size: 22, dy: -30, ms: 700 });
        await wait(T(60));
        return;
      }
      case 'sugarHigh': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, 'シュガーハイ！', { cls: 'pop-sugar', size: 38, ms: 1000 });
        particles.burst(p.x, p.y, { n: 18, type: 'glyph', glyph: '🍭', speed: 8, size: 26, gravity: 0.2 });
        audio.play('gachaSR');
        await wait(T(380));
        return;
      }
      case 'comboHit': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, `コンボ${ev.need}発動！`, { cls: 'pop-combo', size: 32, ms: 900 });
        particles.burst(p.x, p.y, { n: 24, colors: ['#ffe53d', '#25e0ff', '#fff'], speed: 9 });
        audio.play('combo', { pitch: 1.5 });
        await wait(T(300));
        return;
      }
      case 'parts': {
        this.render(ev);
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 20, `パーツ${ev.total}種`, { cls: 'pop-parts', size: 24, dy: -40, ms: 700 });
        particles.burst(L.x + 70, L.y, { n: 10, type: 'glyph', glyph: '⚙️', speed: 5, size: 20, gravity: 0.15 });
        audio.play('tick', { pitch: 0.8 + ev.total * 0.1 });
        await wait(T(120));
        return;
      }
      case 'fuse': {
        this.render(ev);
        if (!b.pos.has(ev.uid)) return;
        const p = this.posOf(ev.uid);
        popText(p.x, p.y - 64, ev.ids.length >= 3 ? `${ev.ids.length}体合体！！` : '合体！', { cls: 'pop-fuse', size: 34 + ev.ids.length * 2, ms: 1000 });
        particles.ring(p.x, p.y, '#ff8a1f', 120, 0.45, 12);
        particles.burst(p.x, p.y, { n: 14 + ev.ids.length * 6, type: 'glyph', glyph: '🔩', speed: 8, size: 22, gravity: 0.25 });
        particles.burst(p.x, p.y, { n: 20, colors: ['#ff8a1f', '#2ee6d6', '#fff'], speed: 9 });
        this.bump(b.els.get(ev.uid), 'evo-flash');
        audio.play('evolve', { pitch: 1.2 });
        await wait(T(420));
        return;
      }
      case 'complete': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, `コンプリート${ev.need}！`, { cls: 'pop-complete', size: 34, ms: 1000 });
        particles.ring(p.x, p.y, '#2ee6d6', 150, 0.55, 14);
        particles.burst(p.x, p.y, { n: 26, type: 'glyph', glyph: '⚙️', speed: 10, size: 22, gravity: 0.1 });
        audio.play('gachaSR');
        await wait(T(380));
        return;
      }
      case 'treasure': {
        this.render(ev);
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 20, `財宝×${ev.total}`, { cls: 'pop-treasure', size: 24, dy: -40, ms: 700 });
        particles.burst(L.x + 70, L.y, { n: 12, type: 'glyph', glyph: '🪙', speed: 6, size: 20, gravity: 0.25 });
        audio.play('coin', { pitch: 1 + Math.min(ev.total, 12) * 0.04 });
        await wait(T(120));
        return;
      }
      case 'rich': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, `財宝${ev.need}！`, { cls: 'pop-rich', size: 34, ms: 1000 });
        particles.burst(p.x, p.y, { n: 24, type: 'glyph', glyph: '💰', speed: 9, size: 22, gravity: 0.3 });
        particles.burst(p.x, p.y, { n: 20, colors: ['#ffc23d', '#fff3b0', '#fff'], speed: 10, type: 'star', size: 6 });
        audio.play('cash');
        await wait(T(360));
        return;
      }
      case 'harmony': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, 'ハモり♪', { cls: 'pop-harmony', size: 34, ms: 1000 });
        particles.ring(p.x, p.y, '#4de1ff', 110, 0.5, 8);
        particles.ring(p.x, p.y, '#ff4fd8', 150, 0.6, 6);
        particles.burst(p.x, p.y, { n: 14, type: 'glyph', glyph: '🎵', speed: 6, size: 24, gravity: -0.08 });
        audio.tone(660, 0.18, { type: 'sine', vol: 0.08 });
        audio.tone(825, 0.18, { type: 'sine', vol: 0.07 });
        audio.tone(990, 0.25, { type: 'sine', vol: 0.06, at: 0.08 });
        await wait(T(340));
        return;
      }
      case 'broken': {
        this.render(ev);
        if (this.clsOf(ev.side).counter !== 'broken') return;
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 20, `破壊${ev.total}`, { cls: 'pop-broken', size: 22, dy: -36, ms: 600 });
        particles.burst(L.x + 70, L.y, { n: 8, type: 'glyph', glyph: '🔩', speed: 5, size: 16, gravity: 0.3 });
        await wait(T(60));
        return;
      }
      case 'smash': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, `破壊${ev.need}！`, { cls: 'pop-smash', size: 38, ms: 1000 });
        particles.burst(p.x, p.y, { n: 26, colors: ['#ff4d2e', '#ffb000', '#3a3a50'], speed: 11, size: 7 });
        shake(10, 220);
        audio.play('bigHit', { vol: 0.7 });
        await wait(T(340));
        return;
      }
      case 'sacrifice': {
        const p = b.pos.has(ev.victim) ? this.posOf(ev.victim) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 50, 'いけにえ！', { cls: 'pop-sacrifice', size: 30, ms: 900 });
        particles.ring(p.x, p.y, '#ff4d2e', 100, 0.4, 10);
        particles.burst(p.x, p.y, { n: 18, type: 'glyph', glyph: '💥', speed: 7, size: 20, gravity: 0.2 });
        this.bump(b.els.get(ev.victim), 'triggered');
        audio.play('shatter', { vol: 0.8 });
        await wait(T(300));
        return;
      }
      case 'rally': {
        this.render(ev);
        if (this.clsOf(ev.side).counter !== 'rally') return;
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 20, `連携${ev.total}`, { cls: 'pop-rally', size: 22, dy: -36, ms: 600 });
        await wait(T(40));
        return;
      }
      case 'rallyHit': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, `連携${ev.need}！`, { cls: 'pop-rallyhit', size: 36, ms: 1000 });
        particles.burst(p.x, p.y, { n: 30, colors: ['#ff2e4d', '#2e7bff', '#ffd23d', '#3dff95', '#ff7ad9'], speed: 10, type: 'star', size: 7 });
        audio.play('combo', { pitch: 1.3 });
        await wait(T(340));
        return;
      }
      case 'boost': {
        this.render(ev);
        if (ev.side !== 0) return;
        for (const uid of ev.uids) {
          if (!b.pos.has(uid)) continue;
          const p = this.posOf(uid);
          particles.burst(p.x, p.y - 30, { n: 8, colors: ['#c9a6ff', '#ff8de8', '#fff'], speed: 4, type: 'star', size: 5, gravity: -0.05 });
          this.bump(b.els.get(uid), 'boosted');
        }
        audio.tone(1320, 0.12, { type: 'sine', vol: 0.05 });
        audio.tone(1760, 0.14, { type: 'sine', vol: 0.04, at: 0.06 });
        await wait(T(110));
        return;
      }
      case 'discard': {
        const from = b.pos.has(ev.uid) ? this.posOf(ev.uid) : g.leader[ev.side];
        this.render(ev);
        const wrap = h('div.discard-card', { style: { left: `${from.x}px`, top: `${from.y}px` } }, staticCard(ev.id, 'detail'));
        b.root.append(wrap);
        popText(from.x, from.y - 90, 'ポイッ！', { cls: 'pop-discard', size: 28, ms: 800 });
        audio.play('whoosh', { pitch: 1.3, vol: 0.7 });
        await wait(T(420));
        particles.burst(from.x, from.y - 120, { n: 12, type: 'glyph', glyph: '✨', speed: 5, size: 16, gravity: 0.1 });
        wrap.remove();
        return;
      }
      case 'handless': {
        const p = b.pos.has(ev.uid) ? this.posOf(ev.uid) : { x: g.cx, y: g.H / 2 };
        popText(p.x, p.y - 60, `ハンドレス${ev.need}！`, { cls: 'pop-handless', size: 32, ms: 1000 });
        particles.ring(p.x, p.y, '#34e0b0', 130, 0.5, 8);
        audio.play('gachaSR', { vol: 0.6 });
        await wait(T(320));
        return;
      }
      case 'reserve': {
        this.render(ev);
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 30, `予約ドロー+${ev.n}`, { cls: 'pop-handless', size: 26, dy: -40, ms: 900 });
        particles.burst(L.x + 70, L.y, { n: 10, type: 'glyph', glyph: '📦', speed: 5, size: 18, gravity: -0.05 });
        audio.play('reveal', { vol: 0.5 });
        await wait(T(200));
        return;
      }
      case 'reserveDraw': {
        this.render(ev);
        const L = g.leader[ev.side];
        popText(L.x, L.y - 90, `予約ドロー！ ${ev.n}枚`, { cls: 'pop-handless', size: 34, ms: 1000 });
        particles.ring(L.x, L.y, '#34e0b0', 140, 0.5, 10);
        audio.play('gachaSR', { vol: 0.6 });
        await wait(T(320));
        return;
      }
      case 'accel': {
        const at = ev.side === 0 ? { x: g.cx, y: g.H * 0.55 } : { x: g.cx, y: g.H * 0.4 };
        popText(at.x, at.y - 80, 'アクセラレート！', { cls: 'pop-accel', size: 40, ms: 1000 });
        particles.speedLines(0.4, 'rgba(255,170,240,0.9)');
        particles.burst(at.x, at.y, { n: 20, type: 'glyph', glyph: '⚡', speed: 10, size: 20, gravity: 0 });
        audio.play('whoosh', { pitch: 1.5 });
        await wait(T(320));
        return;
      }
      case 'crystal': {
        const at = { x: g.cx, y: ev.side === 0 ? g.H * 0.55 : g.H * 0.4 };
        popText(at.x, at.y - 80, '結晶化！', { cls: 'pop-crystal', size: 40, ms: 1000 });
        particles.burst(at.x, at.y, { n: 22, type: 'glyph', glyph: '💠', speed: 8, size: 20, gravity: 0.1 });
        audio.tone(1568, 0.3, { type: 'triangle', vol: 0.06 });
        audio.tone(2093, 0.4, { type: 'triangle', vol: 0.05, at: 0.08 });
        await wait(T(300));
        return;
      }
      case 'hatch': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        popText(p.x, p.y - 70, '結晶から目覚めた！', { cls: 'pop-crystal', size: 30, ms: 1100 });
        particles.burst(p.x, p.y, { n: 30, type: 'glyph', glyph: '💎', speed: 11, size: 20, gravity: 0.25 });
        particles.ring(p.x, p.y, '#7af0ff', 150, 0.55, 12);
        this.bump(b.els.get(ev.uid), 'evo-flash');
        audio.play('gachaSR');
        await wait(T(420));
        return;
      }
      // ------------------------------------------------ ノベラー
      case 'flip': {
        this.render(ev);
        const L = g.leader[ev.side];
        const black = ev.chapter === 1;
        const el = h(`div.fx-pageflip.${black ? 'to-black' : 'to-white'}`, { style: { left: `${L.x}px`, top: `${L.y + (ev.side === 0 ? -150 : 150)}px` } }, h('div.pf-page.pf-a'), h('div.pf-page.pf-b'), h('div.pf-page.pf-c'));
        b.root.append(el);
        setTimeout(() => el.remove(), T(900));
        audio.play('flip', { pitch: black ? 0.8 : 1.2 });
        audio.play('whoosh', { pitch: 1.6, vol: 0.4 });
        popText(L.x, L.y - 100, black ? '📕 黒の章' : '📖 白の章', { cls: black ? 'pop-ch-black' : 'pop-ch-white', size: 30, ms: 1000 });
        particles.burst(L.x, L.y, { n: 14, type: 'glyph', glyph: black ? '🖋️' : '🪶', speed: 7, size: 18, gravity: black ? 0.2 : -0.1 });
        await wait(T(360));
        return;
      }
      case 'chapterHit': {
        const p = this.posOr(ev.uid, ev.side);
        const black = ev.chapter === 1;
        popText(p.x, p.y - 64, black ? '【黒の章】' : '【白の章】', { cls: black ? 'pop-ch-black' : 'pop-ch-white', size: 24, dy: -34, ms: 800 });
        particles.ring(p.x, p.y, black ? '#8a3cff' : '#fff6d8', 110, 0.4, 8);
        if (black) particles.burst(p.x, p.y, { n: 12, colors: ['#1a0b2e', '#4a2a7a', '#8a3cff'], speed: 7, size: 7 });
        else particles.burst(p.x, p.y, { n: 12, colors: ['#fff', '#fff3c4', '#ffe7a0'], speed: 6, type: 'star', size: 6, gravity: -0.05 });
        await wait(T(200));
        return;
      }
      // ------------------------------------------------ デコラー
      case 'crest': {
        this.render(ev);
        const L = g.leader[ev.side];
        const d = def(ev.id);
        popText(L.x, L.y - 100, `${d.art} ${d.name}`, { cls: 'pop-crest', size: 26, ms: 1000 });
        particles.burst(L.x, L.y, { n: 18, colors: ['#ff9ad5', '#ffe14d', '#fff', '#9ae6ff'], speed: 8, type: 'star', size: 6 });
        particles.ring(L.x, L.y, '#ff9ad5', 120, 0.45, 10);
        audio.play('stamp', { vol: 0.7 });
        audio.tone(1760, 0.12, { type: 'sine', vol: 0.05, at: 0.05 });
        await wait(T(330));
        return;
      }
      case 'crestHit': {
        const p = this.posOr(ev.uid, ev.side);
        popText(p.x, p.y - 60, `クレスト${ev.need}！`, { cls: 'pop-crest', size: 34, ms: 1000 });
        particles.burst(p.x, p.y, { n: 22, type: 'glyph', glyph: '💝', speed: 9, size: 20, gravity: 0.1 });
        audio.play('gachaSR', { vol: 0.6 });
        await wait(T(320));
        return;
      }
      // ------------------------------------------------ ゲキカラー
      case 'spicy': {
        this.render(ev);
        const L = g.leader[ev.side];
        popText(L.x, L.y - 95, `激辛${ev.n}！`, { cls: 'pop-spicy', size: 34, ms: 900 });
        particles.burst(L.x, L.y, { n: 6 + ev.n * 4, type: 'glyph', glyph: '🌶️', speed: 9, size: 20, gravity: 0.25 });
        particles.burst(L.x, L.y + 30, { n: 26, colors: ['#ff3b1f', '#ffb000', '#ffe14d'], speed: 9, size: 7, gravity: -0.15 });
        this.bump(b.leaderRoot(ev.side), 'spicy-hit');
        if (ev.side === 0) vignette('rgba(255,90,0,0.55)', 420);
        audio.play('bigHit', { vol: 0.5, pitch: 1.4 });
        await wait(T(240));
        return;
      }
      case 'pinch': {
        const p = this.posOr(ev.uid, ev.side);
        popText(p.x, p.y - 62, `ピンチ${ev.need}！`, { cls: 'pop-pinch', size: 34, ms: 1000 });
        particles.burst(p.x, p.y, { n: 28, colors: ['#ff2a00', '#ff8a00', '#ffe14d', '#fff'], speed: 11, size: 7, gravity: -0.2 });
        audio.play('heartbeat', { vol: 0.8 });
        await wait(T(320));
        return;
      }
      // ------------------------------------------------ オマモラー
      case 'pray': {
        const p = this.posOr(ev.uid, ev.side);
        popText(p.x, p.y - 62, '祈願', { cls: 'pop-pray', size: 30, ms: 900 });
        particles.ring(p.x, p.y, '#ffd86b', 120, 0.5, 8);
        // a glint flies to every own amulet
        for (const c of b.s.players[ev.side].board) {
          if (def(c.id).type !== 'amulet' || c.uid === ev.uid || !b.pos.has(c.uid)) continue;
          const q = this.posOf(c.uid);
          particles.orbs(p.x, p.y, q.x, q.y, 5, '#ffd86b');
        }
        audio.tone(1047, 0.5, { type: 'triangle', vol: 0.06 });
        audio.tone(1568, 0.6, { type: 'triangle', vol: 0.04, at: 0.07 });
        await wait(T(260));
        return;
      }
      case 'fulfill': {
        const p = this.posOr(ev.uid, ev.side);
        this.bump(b.els.get(ev.uid), 'fulfill-glow');
        popText(p.x, p.y - 64, '成就！', { cls: 'pop-fulfill', size: 36, ms: 1100 });
        particles.burst(p.x, p.y, { n: 18, type: 'glyph', glyph: '🌸', speed: 7, size: 18, gravity: 0.06 });
        particles.ring(p.x, p.y, '#ffd86b', 150, 0.6, 12);
        particles.ring(p.x, p.y, '#ff5a5a', 100, 0.45, 8);
        audio.play('gem', { vol: 0.7 });
        audio.tone(784, 0.4, { type: 'sine', vol: 0.06, at: 0.05 });
        audio.tone(1175, 0.5, { type: 'sine', vol: 0.05, at: 0.12 });
        this.render(ev);
        await wait(T(380));
        return;
      }
      case 'fulfillHit': {
        const p = this.posOr(ev.uid, ev.side);
        popText(p.x, p.y - 60, `成就${ev.need}！`, { cls: 'pop-fulfill', size: 34, ms: 1000 });
        particles.burst(p.x, p.y, { n: 22, type: 'glyph', glyph: '⛩️', speed: 9, size: 20, gravity: 0.15 });
        audio.play('gachaSR', { vol: 0.6 });
        await wait(T(320));
        return;
      }
      // ------------------------------------------------ パペッター
      case 'puppet': {
        this.render(ev);
        if (this.clsOf(ev.side).counter !== 'puppet') return;
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 20, `操演${ev.total}`, { cls: 'pop-puppet', size: 22, dy: -36, ms: 600 });
        await wait(T(40));
        return;
      }
      case 'puppetHit': {
        const p = this.posOr(ev.uid, ev.side);
        popText(p.x, p.y - 60, `操演${ev.need}！`, { cls: 'pop-puppet', size: 34, ms: 1000 });
        particles.burst(p.x, p.y, { n: 20, type: 'glyph', glyph: '🪆', speed: 9, size: 20, gravity: 0.2 });
        particles.burst(p.x, p.y, { n: 16, colors: ['#b48cff', '#ff5a7a', '#fff'], speed: 9, type: 'star', size: 6 });
        audio.play('combo', { pitch: 0.9 });
        await wait(T(320));
        return;
      }
      case 'exp': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        popText(p.x + 30, p.y + 40, '+EXP', { cls: 'pop-exp', size: 20, dy: -30, ms: 600 });
        await wait(T(90));
        return;
      }
      case 'levelUp': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        popText(p.x, p.y - 60, `LEVEL UP!`, { cls: 'pop-level', size: 40, ms: 1100 });
        popText(p.x, p.y - 20, `Lv${ev.level}`, { cls: 'pop-buff', size: 28, ms: 1000, delay: 120 });
        particles.ring(p.x, p.y, '#3dff95', 140, 0.5, 14);
        particles.burst(p.x, p.y, { n: 36, colors: ['#3dff95', '#ffe14d', '#fff'], speed: 10, type: 'star', size: 7, gravity: -0.05 });
        this.bump(b.els.get(ev.uid), 'evo-flash');
        audio.play('levelUp');
        await wait(T(480));
        return;
      }
      case 'dopa': {
        this.render(ev);
        if (ev.value >= RULES.dopaMax && ev.gain > 0) {
          const L = g.leader[ev.side];
          popText(L.x, L.y - 90, 'FEVER READY!', { cls: 'pop-fever', size: 34, ms: 1200 });
          particles.ring(L.x, L.y, '#ff2e88', 130, 0.6, 12);
          audio.play('unlock', { vol: 0.7 });
          if (ev.side === 0) toast('DOPAゲージMAX！ FEVERボタンで発動！', '🔥', 't-hot');
          await wait(T(300));
        }
        return;
      }
      case 'fever': {
        const c = this.clsOf(ev.side);
        audio.play('fever');
        if (ev.side === 0) this.say(0, c.lines.fever);
        await cutIn({ art: '🔥', art2: c.leaderArt, name: ev.side === 0 ? 'コスト-1 ＆ 攻撃力+1 ＆ 1ドロー' : '相手のFEVER！', title: 'FEVER', color: '#ff2e88', color2: '#ffe14d', kind: 'fever', enemy: ev.side === 1 });
        this.render(ev);
        particles.confetti(90);
        music.play('fever');
        this.feverMusic = true;
        return;
      }
      case 'pp': {
        this.render(ev);
        const p = g.pp[ev.side];
        popText(p.x, p.y - 40, ev.max ? `PP最大値+${ev.amount}` : `PP+${ev.amount}`, { cls: 'pop-pp', size: 28 });
        particles.burst(p.x, p.y, { n: 16, colors: ['#3dffc5', '#fff'], speed: 6 });
        audio.play('gem');
        await wait(T(260));
        return;
      }
      case 'maxHp': {
        this.render(ev);
        const L = g.leader[ev.side];
        if (ev.amount < 0) {
          popText(L.x, L.y - 70, `最大体力${ev.amount}`, { cls: 'pop-dmg', size: 30 });
          audio.play('shatter', { vol: 0.6 });
        } else {
          popText(L.x, L.y - 70, `最大体力+${ev.amount}`, { cls: 'pop-heal', size: 30 });
          audio.play('heal');
        }
        await wait(T(260));
        return;
      }
      case 'countdown': {
        this.render(ev);
        const p = this.posOf(ev.uid);
        popText(p.x, p.y - 30, ev.value > 0 ? `あと${ev.value}` : '0！', { cls: 'pop-cd', size: 26 });
        audio.play('tick');
        await wait(T(180));
        return;
      }
      case 'luck': {
        this.render(ev);
        const L = g.leader[ev.side];
        popText(L.x + 90, L.y - 20, ev.value >= RULES.luckCeiling ? '天井！' : `運気${ev.value}`, { cls: 'pop-luck', size: 26, dy: -40 });
        audio.play('coin', { pitch: 1 + ev.value * 0.05 });
        await wait(T(160));
        return;
      }
      case 'kakuhen':
        this.render(ev);
        particles.rain('⭐', 24, 26);
        await banner('確変突入！！', { sub: '次のガチャはSR以上確定！', cls: 'b-kakuhen', sfx: 'gachaSR', ms: 1000 });
        return;
      case 'msg':
        toast(ev.text, '💬');
        return;
      case 'gameOver':
        this.render(ev);
        return;
      default:
        this.render(ev);
    }
  }

  private async revealEnemyPlay(id: string, enhanced: boolean): Promise<void> {
    const g = this.b.g;
    const el = h('div.enemy-reveal', { style: { left: `${g.portrait ? g.cx : g.cx + 300}px`, top: `${g.H * 0.42}px` } }, h('div.reveal-label', enhanced ? '相手のプレイ（課金）' : '相手のプレイ'), staticCard(id, 'detail'));
    this.b.root.append(el);
    fitCardText(el);
    audio.play('reveal', { vol: 0.6 });
    await wait(T(900));
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }

  private async gacha(side: Side, uid: number, tier: GachaTier, ceiling: boolean, kakuhen: boolean, fast: boolean): Promise<void> {
    const g = this.b.g;
    const p = this.b.pos.has(uid) ? this.posOf(uid) : { x: g.cx, y: g.H / 2 };
    const reel = h('div.reel-text', 'N');
    const el = h('div.gacha-roll', { style: { left: `${p.x}px`, top: `${p.y - 10}px` } }, h('div.gr-cap'), reel, h('div.gr-label', ceiling ? '天井！' : kakuhen ? '確変' : 'GACHA'));
    this.b.root.append(el);
    const tiers: GachaTier[] = ['N', 'R', 'SR', 'SSR'];
    const spins = fast ? 3 : 9;
    for (let i = 0; i < spins; i++) {
      // tease: show higher tiers more often as the reel slows down
      const t = tiers[Math.floor(Math.random() * (i > spins - 3 ? 4 : 3))];
      reel.textContent = t;
      reel.style.color = TIER_COLOR[t];
      audio.play('gachaTick', { pitch: 1 + i * 0.05 });
      await wait(T(fast ? 40 : 45 + i * 12));
    }
    reel.textContent = tier;
    reel.style.color = TIER_COLOR[tier];
    el.classList.add(`tier-${tier}`, 'done');
    audio.play(tier === 'SSR' ? 'gachaSSR' : tier === 'SR' ? 'gachaSR' : tier === 'R' ? 'gachaR' : 'gachaN');
    if (tier === 'SSR') {
      flash('#ff3fa4', 0.4, 300);
      particles.burst(p.x, p.y, { n: 70, colors: ['#ff3fa4', '#ffe14d', '#38d6ff', '#3dff95', '#fff'], speed: 14, type: 'star', size: 8 });
      particles.ring(p.x, p.y, '#ffe14d', 260, 0.6, 18);
      if (!fast) {
        particles.speedLines(0.5);
        await slam('SSR!!!', 'slam-ssr', 900, ceiling ? '天井到達！' : '大当たり！');
        if (side === 0) this.say(0, 'キタ━━━━！！');
      } else popText(p.x, p.y - 70, 'SSR!!', { cls: 'pop-crit', size: 60 });
    } else if (tier === 'SR') {
      particles.burst(p.x, p.y, { n: 30, colors: ['#ffe14d', '#fff'], speed: 9, type: 'star', size: 6 });
    } else if (tier === 'N' && !fast) {
      popText(p.x, p.y - 50, 'ハズレ…運気UP', { cls: 'pop-sad', size: 22 });
    }
    await wait(T(fast ? 160 : tier === 'SSR' ? 200 : 380));
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }

  async ending(win: boolean | null): Promise<void> {
    const b = this.b;
    music.stop();
    await wait(T(350));
    if (win === null) {
      await slam('DRAW', 'slam-blue', 1400);
      return;
    }
    if (b.cfg.mode === 'spectate') {
      // AI観戦: no "you" — just name the winner
      const side = win ? 0 : 1;
      const name = win ? (b.cfg.playerName ?? CLASSES[b.cfg.playerCls].name) : b.cfg.enemyName;
      particles.confetti(120);
      audio.play('win');
      this.say(side, CLASSES[win ? b.cfg.playerCls : b.cfg.enemyCls].lines.win);
      await slam('WINNER', 'slam-win', 1600, `${name} の勝ち！`);
      return;
    }
    if (win) {
      particles.speedLines(1.2);
      flash('#fff', 0.9, 500);
      shake(30, 600);
      audio.play('bigHit');
      await slam('K.O.!!', 'slam-ko', 1100);
      audio.play('win');
      particles.confetti(160);
      particles.rain('🪙', 40, 30);
      const line = CLASSES[b.cfg.playerCls].lines.win;
      this.say(0, line);
      if (b.cfg.enemyLines?.lose) this.say(1, b.cfg.enemyLines.lose);
      await slam('VICTORY', 'slam-win', 1500, 'ドーパミン、全開！');
    } else {
      b.root.classList.add('defeat');
      audio.play('lose');
      this.say(0, CLASSES[b.cfg.playerCls].lines.lose);
      if (b.cfg.enemyLines?.win) this.say(1, b.cfg.enemyLines.win);
      await slam('LOSE…', 'slam-lose', 1700, '次は勝てる。たぶん。');
    }
  }
}
