import { audio } from '../../audio/audio';
import { music, type TrackName } from '../../audio/music';
import {
  apply,
  chooseAction,
  chooseMulligan,
  CLASSES,
  def,
  E,
  leaderTgt,
  legalActions,
  RULES,
  tgtSide,
  type Action,
  type AiProfile,
  type Card,
  type ClassId,
  type Difficulty,
  type GameState,
  type PlayerStats,
  type Side,
  type Tgt,
  type View,
} from '../../engine';
import { save } from '../../meta/save';
import { confirmModal } from '../common';
import { CARD_H, CARD_W, createCard, fitCardText, glossary, relatedBlock, staticCard, updateCard } from '../cardview';
import { clear, h, wait } from '../dom';
import { fxConfig, T, toast } from '../fx/fx';
import { particles } from '../fx/particles';
import { PERF_INFO, type PerfLevel } from '../perf';
import { setPerf } from '../screens/settings';
import { stage } from '../stage';
import { Animator } from './anim';
import { geometry, layout, type Geo, type Pos } from './layout';

export const PLAYER: Side = 0;
export const ENEMY: Side = 1;

export interface BattleConfig {
  playerDeck: string[];
  playerCls: ClassId;
  enemyDeck: string[];
  enemyCls: ClassId;
  enemyName: string;
  enemyArt?: string;
  difficulty: Difficulty;
  mode: 'rank' | 'story' | 'free' | 'tutorial';
  enemyHp?: number;
  playerHp?: number;
  stageId?: string;
  bgm?: TrackName;
  enemyLines?: Partial<{ start: string; win: string; lose: string }>;
  tutorial?: boolean;
  onEnd(result: BattleResult): void;
  onQuit?(): void;
}

export interface BattleResult {
  win: boolean;
  draw: boolean;
  conceded: boolean;
  stats: PlayerStats;
  enemyStats: PlayerStats;
  turns: number;
  hpLeft: number;
  maxHp: number;
  config: BattleConfig;
  first: boolean;
}

type InputState =
  | { k: 'idle' }
  | { k: 'handPress'; uid: number; x0: number; y0: number; pid: number }
  | { k: 'handDrag'; uid: number; pid: number }
  | { k: 'boardPress'; uid: number; x0: number; y0: number; pid: number }
  | { k: 'attackDrag'; uid: number; pid: number; targets: Tgt[] }
  | { k: 'selected'; uid: number; targets: Tgt[] }
  | { k: 'targeting'; source: 'play' | 'evolve'; uid: number; sup: boolean; targets: Tgt[] };

interface LeaderHud {
  root: HTMLElement;
  hp: HTMLElement;
  hpNum: HTMLElement;
  evo: HTMLElement;
  counter: HTMLElement;
  ring: SVGCircleElement;
  dopaNum: HTMLElement;
  pp: HTMLElement;
  deck: HTMLElement;
  lethal: HTMLElement;
}

const RING_R = 70;
const RING_C = 2 * Math.PI * RING_R;

export class Battle {
  cfg: BattleConfig;
  s: GameState;
  v: View;
  g: Geo;
  root!: HTMLElement;
  layer!: HTMLElement;
  bg!: HTMLElement;
  leaders!: [LeaderHud, LeaderHud];
  endBtn!: HTMLElement;
  feverBtn!: HTMLElement;
  comboEl!: HTMLElement;
  promptEl!: HTMLElement;
  detailEl!: HTMLElement;
  actionsEl!: HTMLElement;
  arrow!: SVGSVGElement;
  arrowPath!: SVGPathElement;
  arrowHead!: SVGPathElement;
  thinkEl!: HTMLElement;
  autoBtn!: HTMLElement;
  speedBtn!: HTMLElement;
  els = new Map<number, HTMLElement>();
  pos = new Map<number, Pos>();
  busy = true;
  destroyed = false;
  hover: number | null = null;
  input: InputState = { k: 'idle' };
  auto = false;
  anim: Animator;
  profile: AiProfile;
  private offResize: (() => void) | null = null;
  private lethalShown = false;
  private hintTimer = 0;
  private hintEl: HTMLElement | null = null;
  private pointerXY = { x: 0, y: 0 };
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor(cfg: BattleConfig) {
    this.cfg = cfg;
    this.s = E.createGame({
      decks: [cfg.playerDeck, cfg.enemyDeck],
      classes: [cfg.playerCls, cfg.enemyCls],
      leaders: [cfg.playerCls, cfg.enemyCls],
      hp: [cfg.playerHp ?? RULES.leaderHp, cfg.enemyHp ?? RULES.leaderHp],
    });
    this.v = E.view(this.s);
    this.g = geometry(stage.w, stage.h, stage.portrait);
    this.anim = new Animator(this);
    const aggro = cfg.enemyCls === 'swipe' ? 1.3 : cfg.enemyCls === 'stream' ? 1.1 : 1;
    const diff: Difficulty = cfg.enemyCls === 'swipe' && cfg.difficulty === 'normal' ? 'hard' : cfg.difficulty;
    this.profile = { difficulty: diff, aggro };
  }

  // ================================================================== mount

  mount(parent: HTMLElement): void {
    const pc = CLASSES[this.cfg.playerCls];
    const ec = CLASSES[this.cfg.enemyCls];
    this.root = h('div.battle', {
      style: { '--p1': pc.color, '--p2': pc.color2, '--e1': ec.color, '--e2': ec.color2, '--spd': String(fxConfig.speed) },
    });
    this.bg = h('div.bf-bg', h('div.bf-spot.bf-spot-e'), h('div.bf-spot.bf-spot-p'), h('div.bf-grid'), h('div.bf-mid'), h('div.bf-fever'));
    this.layer = h('div.bf-cards');
    this.leaders = [this.makeLeader(PLAYER), this.makeLeader(ENEMY)];
    this.endBtn = h('button.end-btn', { type: 'button', onclick: () => this.onEnd() }, h('span.end-main', 'ターン終了'), h('span.end-sub', 'END'));
    this.feverBtn = h('button.fever-btn', { type: 'button', onclick: () => this.onFever() }, h('span', 'FEVER'), h('small', 'タップで発動！'));
    this.comboEl = h('div.combo-meter', h('div.combo-num', '0'), h('div.combo-label', 'COMBO'));
    this.promptEl = h('div.bf-prompt');
    this.actionsEl = h('div.bf-actions');
    this.detailEl = h('div.bf-detail');
    this.thinkEl = h('div.bf-think', h('span.dot'), h('span.dot'), h('span.dot'), h('span.think-text', '考え中'));
    this.arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.arrow.classList.add('bf-arrow');
    this.arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.arrowPath.classList.add('arrow-line');
    this.arrowHead.classList.add('arrow-head');
    this.arrow.append(this.arrowPath, this.arrowHead);
    this.autoBtn = h('button.bf-chip.auto-btn', { type: 'button', onclick: () => this.toggleAuto() }, 'AUTO');
    this.speedBtn = h('button.bf-chip.speed-btn', { type: 'button', onclick: () => this.cycleSpeed() }, `x${fxConfig.speed}`);
    const menuBtn = h('button.bf-chip.menu-btn', { type: 'button', onclick: () => this.openMenu() }, '☰');
    const top = h('div.bf-top', menuBtn, this.autoBtn, this.speedBtn);
    const enemyTag = h('div.enemy-tag', h('span.et-name', this.cfg.enemyName), h('span.et-diff', diffLabel(this.cfg.difficulty)));
    this.root.append(
      this.bg,
      h('div.lane.lane-e', h('span.lane-mark', ec.emoji)),
      h('div.lane.lane-p', h('span.lane-mark', pc.emoji)),
      this.leaders[1].root,
      this.leaders[0].root,
      this.leaders[0].pp,
      this.leaders[1].pp,
      this.leaders[0].deck,
      this.leaders[1].deck,
      this.comboEl,
      this.endBtn,
      this.feverBtn,
      enemyTag,
      this.layer,
      this.arrow,
      this.actionsEl,
      this.promptEl,
      this.thinkEl,
      this.detailEl,
      top,
    );
    parent.append(this.root);
    this.applyGeo();
    this.offResize = stage.onResize(() => {
      this.g = geometry(stage.w, stage.h, stage.portrait);
      this.applyGeo();
      this.render();
    });
    this.root.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.keyHandler);
    this.layer.addEventListener('pointerover', (e) => this.onHover(e));
    this.layer.addEventListener('pointerout', (e) => this.onHoverOut(e));
    music.play(this.cfg.bgm ?? 'battle');
    this.render();
    if (location.hash === '#qa') this.exposeQa();
    void this.start();
  }

  destroy(): void {
    this.destroyed = true;
    this.offResize?.();
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.keyHandler);
    clearTimeout(this.hintTimer);
    particles.clear();
    this.root.remove();
  }

  private makeLeader(side: Side): LeaderHud {
    const cls = side === PLAYER ? this.cfg.playerCls : this.cfg.enemyCls;
    const cm = CLASSES[cls];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.classList.add('dopa-ring');
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const c of [track, ring]) {
      c.setAttribute('cx', '80');
      c.setAttribute('cy', '80');
      c.setAttribute('r', String(RING_R));
    }
    track.classList.add('ring-track');
    ring.classList.add('ring-fill');
    ring.style.strokeDasharray = `${RING_C}`;
    ring.style.strokeDashoffset = `${RING_C}`;
    svg.append(track, ring);
    const hpNum = h('span.hp-num', String(RULES.leaderHp));
    const hp = h('div.leader-hp', hpNum);
    const evo = h('div.leader-evo');
    const counter = h('div.leader-counter');
    const dopaNum = h('div.leader-dopa', '0');
    const lethal = h('div.leader-lethal', 'LETHAL!');
    const art = side === ENEMY && this.cfg.enemyArt ? this.cfg.enemyArt : cm.leaderArt;
    const emote =
      side === PLAYER
        ? h('button.leader-emote', { type: 'button', 'aria-label': 'エモート', onclick: (e: Event) => { e.stopPropagation(); this.openEmotes(); } }, '💬')
        : null;
    const root = h(
      `div.leader.side-${side}.cls-${cls}`,
      { 'data-leader': String(side), style: { '--c1': cm.color, '--c2': cm.color2 } },
      emote,
      svg,
      h('div.leader-portrait', h('div.leader-bgfx'), h('span.leader-glyph', art)),
      dopaNum,
      hp,
      evo,
      counter,
      lethal,
    );
    const pp = h(`div.pp.side-${side}`, h('div.pp-label', 'PP'), h('div.pp-num'), h('div.pp-gems'));
    const deck = h(`div.deck-count.side-${side}`, h('span.deck-icon', '🂠'), h('span.deck-num', '30'));
    return { root, hp, hpNum, evo, counter, ring, dopaNum, pp, deck, lethal };
  }

  private applyGeo(): void {
    const g = this.g;
    this.root.classList.toggle('portrait', g.portrait);
    const setPos = (el: HTMLElement, x: number, y: number) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    for (const side of [0, 1] as const) {
      const L = this.leaders[side];
      setPos(L.root, g.leader[side].x, g.leader[side].y);
      setPos(L.pp, g.pp[side].x, g.pp[side].y);
      const dx = g.portrait ? (side === 0 ? 108 : g.W - 92) : g.pp[side].x - 110;
      const dy = g.portrait ? (side === 0 ? g.pp[0].y + 70 : g.pp[1].y + 66) : g.pp[side].y + (side === 0 ? -2 : 0);
      setPos(L.deck, dx, dy);
    }
    setPos(this.endBtn, g.end.x, g.end.y);
    setPos(this.feverBtn, g.fever.x, g.fever.y);
    setPos(this.comboEl, g.combo.x, g.combo.y);
    const lanes = this.root.querySelectorAll<HTMLElement>('.lane');
    const laneW = Math.min(g.W - 40, g.slot * 5 + 40);
    const laneH = CARD_H * g.boardScale + 34;
    lanes.forEach((l) => {
      const side = l.classList.contains('lane-p') ? 0 : 1;
      l.style.left = `${g.cx - laneW / 2}px`;
      l.style.top = `${g.boardY[side] - laneH / 2}px`;
      l.style.width = `${laneW}px`;
      l.style.height = `${laneH}px`;
    });
    this.arrow.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
    this.arrow.style.width = `${g.W}px`;
    this.arrow.style.height = `${g.H}px`;
    this.root.style.setProperty('--mid-y', `${(g.boardY[0] + g.boardY[1]) / 2}px`);
  }

  // ================================================================== flow

  private async start(): Promise<void> {
    await wait(200);
    if (this.destroyed) return;
    await this.anim.versus();
    if (this.destroyed) return;
    const first = this.s.first === PLAYER;
    await this.anim.coinToss(first);
    const line = this.cfg.enemyLines?.start ?? CLASSES[this.cfg.enemyCls].lines.start;
    if (line) this.anim.say(ENEMY, line);
    // initial hands
    this.render();
    audio.play('draw');
    await wait(T(500));
    const swap = await this.mulliganUi();
    if (this.destroyed) return;
    const evs = [
      ...apply(this.s, { t: 'mulligan', side: PLAYER, swap }),
      ...apply(this.s, { t: 'mulligan', side: ENEMY, swap: chooseMulligan(this.s, ENEMY, this.profile) }),
    ];
    await this.anim.play(evs);
    this.afterAction();
  }

  private mulliganUi(): Promise<number[]> {
    return new Promise((resolve) => {
      const hand = this.s.players[PLAYER].hand;
      const picked = new Set<number>();
      const cards = hand.map((c) => {
        const el = staticCard(c.id, 'detail', isPrism(c.id));
        const wrap = h('div.mull-card', { onclick: () => {
          audio.play('flip');
          if (picked.has(c.uid)) picked.delete(c.uid);
          else picked.add(c.uid);
          wrap.classList.toggle('swap', picked.has(c.uid));
        } }, el, h('div.mull-x', '交換'));
        return wrap;
      });
      const ov = h(
        'div.mulligan',
        h('div.mull-title', 'マリガン'),
        h('div.mull-sub', '交換したいカードをタップ！（1回だけ）'),
        h('div.mull-cards', cards),
        h('button.btn.btn-hot.mull-ok', { type: 'button', onclick: () => {
          audio.play('tap');
          ov.classList.add('out');
          setTimeout(() => ov.remove(), 250);
          resolve([...picked]);
        } }, '決定！'),
      );
      this.root.append(ov);
      fitCardText(ov);
    });
  }

  /** called whenever an action (and its animations) finished */
  afterAction(): void {
    if (this.destroyed) return;
    this.render();
    if (this.s.phase === 'over') {
      void this.finish();
      return;
    }
    if (this.s.active === ENEMY) {
      void this.runAi(ENEMY);
      return;
    }
    if (this.auto) {
      void this.runAi(PLAYER);
      return;
    }
    this.busy = false;
    this.refreshIdle();
  }

  async commit(a: Action): Promise<void> {
    if (this.busy || this.destroyed) return;
    this.setInput({ k: 'idle' });
    this.busy = true;
    this.hideHint();
    this.refreshIdle();
    const evs = apply(this.s, a);
    if (!evs.length && a.t !== 'end') {
      this.busy = false;
      this.render();
      this.refreshIdle();
      return;
    }
    await this.anim.play(evs);
    this.afterAction();
  }

  private async runAi(side: Side): Promise<void> {
    this.busy = true;
    this.refreshIdle();
    this.thinkEl.classList.toggle('on', side === ENEMY);
    let guard = 0;
    while (!this.destroyed && this.s.phase === 'main' && this.s.active === side && guard++ < 60) {
      if (side === PLAYER && !this.auto) break;
      await wait(T(side === ENEMY ? 420 : 260));
      if (this.destroyed) return;
      const prof: AiProfile = side === ENEMY ? this.profile : { difficulty: 'normal' };
      const a = chooseAction(this.s, prof);
      const evs = apply(this.s, a);
      this.thinkEl.classList.remove('on');
      await this.anim.play(evs);
      if (a.t === 'end') break;
      this.thinkEl.classList.toggle('on', side === ENEMY && this.s.active === ENEMY);
    }
    this.thinkEl.classList.remove('on');
    if (guard >= 60 && this.s.active === side && this.s.phase === 'main') {
      await this.anim.play(apply(this.s, { t: 'end' }));
    }
    this.afterAction();
  }

  private finishing = false;

  private async finish(): Promise<void> {
    if (this.finishing) return;
    this.finishing = true;
    this.busy = true;
    const w = this.s.winner;
    const win = w === PLAYER;
    await this.anim.ending(w === -1 ? null : win);
    if (this.destroyed) return;
    const p = this.s.players[PLAYER];
    this.cfg.onEnd({
      win,
      draw: w === -1,
      conceded: this.conceded,
      stats: p.stats,
      enemyStats: this.s.players[ENEMY].stats,
      turns: p.turns,
      hpLeft: Math.max(0, p.hp),
      maxHp: p.maxHp,
      config: this.cfg,
      first: this.s.first === PLAYER,
    });
  }

  private conceded = false;

  // ================================================================== render

  render(v: View = this.v): void {
    this.v = v;
    this.pos = layout(v, this.g, this.input.k === 'idle' || this.input.k === 'selected' ? this.hover : null);
    const seen = new Set<number>();
    const placeAll = (side: Side, zone: 'hand' | 'board') => {
      const list = zone === 'hand' ? v.p[side].hand : v.p[side].board;
      for (const cv of list) {
        const p = this.pos.get(cv.uid)!;
        let el = this.els.get(cv.uid);
        const fresh = !el;
        if (!el) {
          el = createCard(cv.id, { zone: zone === 'board' ? 'board' : 'hand', uid: cv.uid, facedown: p.zone === 'ehand', prism: side === PLAYER && isPrism(cv.id) });
          el.dataset.uid = String(cv.uid);
          el.dataset.side = String(side);
          this.els.set(cv.uid, el);
          this.layer.append(el);
          this.spawnAt(el, p);
        }
        const prevZone = el.dataset.zone;
        el.dataset.zone = p.zone;
        if (prevZone === 'ehand' && p.zone !== 'ehand') {
          el.classList.remove('facedown');
          el.classList.add('flip-up');
          setTimeout(() => el!.classList.remove('flip-up'), 500);
        }
        if (p.zone === 'ehand') el.classList.add('facedown');
        updateCard(el, cv, zone);
        if (!fresh && !(this.input.k === 'handDrag' && this.input.uid === cv.uid)) this.place(el, p);
        seen.add(cv.uid);
      }
    };
    for (const side of [0, 1] as const) {
      placeAll(side, 'board');
      placeAll(side, 'hand');
    }
    for (const [uid, el] of this.els) {
      if (seen.has(uid)) continue;
      this.els.delete(uid);
      if (el.dataset.gone) el.remove();
      else {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 320);
      }
    }
    this.renderHud(v);
  }

  place(el: HTMLElement, p: Pos): void {
    el.style.transform = `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) rotate(${p.r}deg) scale(${p.s})`;
    el.style.zIndex = String(p.z);
  }

  private spawnAt(el: HTMLElement, p: Pos): void {
    const g = this.g;
    el.classList.add('no-trans');
    if (p.zone === 'board') {
      el.style.transform = `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) scale(0.05)`;
      el.style.zIndex = String(p.z);
    } else {
      const d = g.deck[p.side];
      el.style.transform = `translate(${d.x - CARD_W / 2}px, ${d.y - CARD_H / 2}px) rotate(${p.side === 0 ? 40 : 200}deg) scale(${p.s})`;
    }
    void el.offsetWidth;
    el.classList.remove('no-trans');
    const uid = Number(el.dataset.uid);
    requestAnimationFrame(() => {
      const st = this.input;
      if (st.k === 'handDrag' && st.uid === uid) return;
      if (st.k === 'targeting' && st.uid === uid) return;
      const cur = this.pos.get(uid);
      if (cur && this.els.get(uid) === el) this.place(el, cur);
    });
  }

  private renderHud(v: View): void {
    for (const side of [0, 1] as const) {
      const pv = v.p[side];
      const L = this.leaders[side];
      if (L.hpNum.textContent !== String(pv.hp)) {
        const prev = Number(L.hpNum.textContent);
        L.hpNum.textContent = String(pv.hp);
        L.hp.classList.remove('bump-down', 'bump-up');
        void L.hp.offsetWidth;
        L.hp.classList.add(pv.hp < prev ? 'bump-down' : 'bump-up');
      }
      L.hp.classList.toggle('low', pv.hp <= 6);
      L.hp.classList.toggle('over-max', pv.maxHp > RULES.leaderHp);
      L.root.classList.toggle('danger', pv.hp <= 6);
      // dopa ring
      const k = pv.dopa / RULES.dopaMax;
      L.ring.style.strokeDashoffset = String(RING_C * (1 - k));
      L.root.classList.toggle('dopa-full', pv.dopa >= RULES.dopaMax);
      L.root.classList.toggle('fever-on', pv.fever);
      L.dopaNum.textContent = pv.fever ? 'FEVER!' : 'DOPA MAX';
      // evolution points
      const evoTurn = side === this.s.first ? RULES.evoTurnFirst : RULES.evoTurnSecond;
      const supTurn = side === this.s.first ? RULES.superTurnFirst : RULES.superTurnSecond;
      const evoOpen = pv.turns >= evoTurn;
      const supOpen = pv.turns >= supTurn;
      const sig = `${pv.ep}/${pv.sep}/${evoOpen}/${supOpen}/${pv.evolvedThisTurn}`;
      if (L.evo.dataset.sig !== sig) {
        L.evo.dataset.sig = sig;
        const used = pv.evolvedThisTurn;
        const ep = Array.from({ length: side === this.s.first ? RULES.epFirst : RULES.epSecond }, (_, i) =>
          h(`span.ep-orb${i < pv.ep ? '.on' : ''}${evoOpen ? '' : '.locked'}${used ? '.used' : ''}`),
        );
        const sp = Array.from({ length: RULES.sep }, (_, i) => h(`span.sep-orb${i < pv.sep ? '.on' : ''}${supOpen ? '' : '.locked'}${used ? '.used' : ''}`));
        L.evo.replaceChildren(h('span.evo-group', ep), h('span.evo-group', sp));
      }
      // counter
      this.renderCounter(side, L.counter, pv);
      // pp
      const ppNum = L.pp.querySelector('.pp-num')!;
      ppNum.innerHTML = `${pv.pp}<small>/${pv.maxPp}</small>`;
      const gems = L.pp.querySelector('.pp-gems')!;
      const gsig = `${pv.pp}/${pv.maxPp}`;
      if ((gems as HTMLElement).dataset.sig !== gsig) {
        (gems as HTMLElement).dataset.sig = gsig;
        gems.replaceChildren(...Array.from({ length: pv.maxPp }, (_, i) => h(`span.pp-gem${i < pv.pp ? '.on' : ''}`)));
      }
      L.deck.querySelector('.deck-num')!.textContent = String(pv.deck);
      L.deck.classList.toggle('low', pv.deck <= 5);
    }
    const me = v.p[PLAYER];
    this.root.classList.toggle('fever-0', me.fever);
    this.root.classList.toggle('fever-1', v.p[ENEMY].fever);
    this.root.classList.toggle('my-turn', v.active === PLAYER && v.phase === 'main');
    const combo = v.p[v.active].combo;
    const cn = this.comboEl.querySelector('.combo-num')!;
    if (cn.textContent !== String(combo)) cn.textContent = String(combo);
    this.comboEl.classList.toggle('on', combo >= 2);
    this.comboEl.classList.toggle('enemy', v.active === ENEMY);
    this.comboEl.style.setProperty('--combo', String(Math.min(combo, 10)));
  }

  private renderCounter(side: Side, el: HTMLElement, pv: View['p'][0]): void {
    const cls = side === PLAYER ? this.cfg.playerCls : this.cfg.enemyCls;
    const kind = CLASSES[cls].counter;
    let sig = '';
    let content: (HTMLElement | string)[] = [];
    if (kind === 'luck') {
      sig = `l${pv.luck}/${pv.kakuhen}`;
      content = [
        h('span.ctr-label', pv.kakuhen ? '確変中' : '運気'),
        h('span.ctr-stars', Array.from({ length: RULES.luckCeiling }, (_, i) => h(`span.star${i < pv.luck ? '.on' : ''}`, '★'))),
      ];
    } else if (kind === 'likes') {
      sig = `k${pv.likes}`;
      content = [h('span.ctr-icon', '❤'), h('span.ctr-num', String(pv.likes))];
    } else if (kind === 'sweet') {
      sig = `s${pv.sweet}`;
      content = [h('span.ctr-icon', '🍬'), h('span.ctr-label', '糖度'), h('span.ctr-num', String(pv.sweet))];
    } else if (kind === 'combo') {
      sig = `c${pv.combo}`;
      content = [h('span.ctr-icon', '⚡'), h('span.ctr-label', 'コンボ'), h('span.ctr-num', String(pv.combo))];
    } else if (kind === 'level') {
      const ups = this.s.players[side].stats.levelUps;
      sig = `v${ups}`;
      content = [h('span.ctr-icon', '🎮'), h('span.ctr-label', 'LvUP'), h('span.ctr-num', String(ups))];
    }
    if (el.dataset.sig !== sig) {
      el.dataset.sig = sig;
      el.replaceChildren(...content);
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
  }

  // ================================================================== idle state

  private card(uid: number): Card | undefined {
    return E.boardCard(this.s, uid) ?? E.handCard(this.s, uid);
  }

  refreshIdle(): void {
    const s = this.s;
    const idle = !this.busy && s.phase === 'main' && s.active === PLAYER;
    const me = s.players[PLAYER];
    let anything = false;
    for (const c of me.hand) {
      const el = this.els.get(c.uid);
      const ok = idle && E.canPlay(s, c);
      el?.classList.toggle('playable', ok);
      if (ok) anything = true;
    }
    for (const c of me.board) {
      const el = this.els.get(c.uid);
      const atk = idle && E.attackTargets(s, c).length > 0;
      const evo = idle && (E.canEvolve(s, c, false) || E.canEvolve(s, c, true));
      el?.classList.toggle('can-attack', atk);
      el?.classList.toggle('can-evolve', evo);
      if (atk) anything = true;
    }
    for (const c of s.players[ENEMY].board) this.els.get(c.uid)?.classList.remove('can-attack', 'can-evolve', 'playable');
    this.endBtn.classList.toggle('active', idle);
    this.endBtn.classList.toggle('done', idle && !anything);
    this.endBtn.classList.toggle('wait', !idle);
    const endMain = this.endBtn.querySelector('.end-main')!;
    endMain.textContent = s.active === ENEMY ? '相手のターン' : 'ターン終了';
    this.feverBtn.classList.toggle('on', idle && E.canFever(s));
    // lethal hint
    const lethal = idle && this.hasLethal();
    this.leaders[ENEMY].root.classList.toggle('lethal', lethal);
    if (lethal && !this.lethalShown) {
      this.lethalShown = true;
      audio.play('heartbeat');
      toast('リーサル圏内！ 顔を殴れ！', '💀', 't-hot');
    }
    if (!lethal) this.lethalShown = false;
    if (idle) this.scheduleHint();
  }

  private hasLethal(): boolean {
    const s = this.s;
    const opp = s.players[ENEMY];
    if (opp.board.some((c) => E.has(c, 'ward') && E.alive(c) && !E.has(c, 'ambush'))) return false;
    let dmg = 0;
    for (const c of s.players[PLAYER].board) {
      if (!E.attackTargets(s, c).includes(leaderTgt(ENEMY))) continue;
      const left = (E.has(c, 'twin') ? 2 : 1) - c.attacks;
      dmg += E.atkOf(s, c) * left;
    }
    return dmg >= opp.hp;
  }

  // ================================================================== hints

  private scheduleHint(): void {
    clearTimeout(this.hintTimer);
    if (!save.data.settings.hints && !this.cfg.tutorial) return;
    this.hintTimer = window.setTimeout(() => this.showHint(), this.cfg.tutorial ? 1400 : 4500);
  }

  private hideHint(): void {
    clearTimeout(this.hintTimer);
    this.hintEl?.remove();
    this.hintEl = null;
  }

  private showHint(): void {
    if (this.busy || this.destroyed || this.input.k !== 'idle') return;
    const s = this.s;
    const me = s.players[PLAYER];
    let text = '';
    let at: { x: number; y: number } | null = null;
    const playable = me.hand.find((c) => E.canPlay(s, c));
    const attacker = me.board.find((c) => E.attackTargets(s, c).length);
    const evolver = me.board.find((c) => E.canEvolve(s, c, false) || E.canEvolve(s, c, true));
    if (E.canFever(s)) {
      text = 'DOPAゲージ満タン！ FEVERで大暴れ！';
      at = this.g.fever;
    } else if (evolver && !me.evolvedThisTurn) {
      text = 'フォロワーをタップして進化！';
      at = this.pos.get(evolver.uid) ?? null;
    } else if (playable) {
      text = 'カードを上にドラッグして出そう！';
      at = this.pos.get(playable.uid) ?? null;
    } else if (attacker) {
      text = 'フォロワーを相手にドラッグして攻撃！';
      at = this.pos.get(attacker.uid) ?? null;
    } else {
      text = 'できることは全部やった！ ターン終了！';
      at = this.g.end;
    }
    if (!at) return;
    this.hintEl?.remove();
    this.hintEl = h('div.bf-hint', { style: { left: `${at.x}px`, top: `${at.y}px` } }, h('div.hint-bubble', text), h('div.hint-finger', '👆'));
    this.root.append(this.hintEl);
    const half = this.hintEl.offsetWidth / 2 + 12;
    const x = Math.max(half, Math.min(this.g.W - half, at.x));
    if (x !== at.x) {
      this.hintEl.style.left = `${x}px`;
      (this.hintEl.querySelector('.hint-finger') as HTMLElement).style.marginLeft = `${(at.x - x) * 2}px`;
    }
  }

  // ================================================================== input

  setInput(st: InputState): void {
    const prev = this.input;
    this.input = st;
    // clear visual state
    if (prev.k === 'selected' || prev.k === 'targeting' || prev.k === 'attackDrag') {
      this.layer.querySelectorAll('.targetable,.selected,.pending,.aim').forEach((e) => e.classList.remove('targetable', 'selected', 'pending', 'aim'));
      for (const L of this.leaders) L.root.classList.remove('targetable', 'aim');
      this.actionsEl.replaceChildren();
      this.promptEl.classList.remove('on');
      this.arrow.classList.remove('on');
    }
    if (prev.k === 'handDrag') {
      const el = this.els.get(prev.uid);
      el?.classList.remove('dragging');
      this.root.classList.remove('drag-play', 'drag-noplay');
    }
    if (st.k === 'selected') {
      this.els.get(st.uid)?.classList.add('selected');
      this.markTargets(st.targets);
      this.showActions(st.uid);
    }
    if (st.k === 'attackDrag') {
      this.els.get(st.uid)?.classList.add('selected');
      this.markTargets(st.targets);
      this.arrow.classList.add('on');
      this.arrow.classList.remove('heal');
    }
    if (st.k === 'targeting') {
      this.markTargets(st.targets);
      const el = this.els.get(st.uid);
      if (el && st.source === 'play') {
        el.classList.add('pending');
        el.style.transform = `translate(${this.g.pending.x - CARD_W / 2}px, ${this.g.pending.y - CARD_H / 2}px) scale(0.9)`;
        el.style.zIndex = '950';
      } else el?.classList.add('selected');
      const d = def(this.card(st.uid)?.id ?? 'n_slime');
      this.promptEl.replaceChildren(
        h('span.prompt-text', `${d.name}：対象を選んでね`),
        h('button.btn.btn-small', { type: 'button', onclick: () => this.cancelTargeting() }, 'キャンセル'),
      );
      this.promptEl.classList.add('on');
      this.arrow.classList.add('on');
      const ally = st.targets.length > 0 && st.targets.every((t) => t > 0 && this.s.players[PLAYER].board.some((c) => c.uid === t));
      this.arrow.classList.toggle('heal', ally);
    }
  }

  private markTargets(ts: Tgt[]): void {
    for (const t of ts) {
      if (t < 0) this.leaders[tgtSide(t)].root.classList.add('targetable');
      else this.els.get(t)?.classList.add('targetable');
    }
  }

  private showActions(uid: number): void {
    const c = this.card(uid);
    const p = this.pos.get(uid);
    if (!c || !p) return;
    const btns: HTMLElement[] = [];
    if (E.canEvolve(this.s, c, false)) btns.push(h('button.act-btn.act-evo', { type: 'button', onclick: (e: Event) => { e.stopPropagation(); this.beginEvolve(uid, false); } }, h('b', '進化'), h('small', 'EP')));
    if (E.canEvolve(this.s, c, true)) btns.push(h('button.act-btn.act-super', { type: 'button', onclick: (e: Event) => { e.stopPropagation(); this.beginEvolve(uid, true); } }, h('b', '超進化'), h('small', 'SEP')));
    btns.push(h('button.act-btn.act-info', { type: 'button', onclick: (e: Event) => { e.stopPropagation(); this.inspect(uid); } }, h('b', '詳細')));
    const wrap = h('div.act-wrap', { style: { left: `${p.x}px`, top: `${p.y - (CARD_H * p.s) / 2 - 12}px` } }, btns);
    this.actionsEl.replaceChildren(wrap);
  }

  /** valid target nearest to a stage point (within a forgiving radius) */
  private nearestTarget(p: { x: number; y: number }, targets: Tgt[], radius = 80): Tgt | undefined {
    let best: Tgt | undefined;
    let bd = radius;
    for (const t of targets) {
      const tp = t < 0 ? this.g.leader[tgtSide(t)] : this.pos.get(t);
      if (!tp) continue;
      const d = Math.hypot(tp.x - p.x, tp.y - p.y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  private hitTest(clientX: number, clientY: number): { card?: number; leader?: Side } {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return {};
    const card = el.closest<HTMLElement>('.card');
    if (card && card.dataset.uid && !card.classList.contains('dragging')) return { card: Number(card.dataset.uid) };
    const leader = el.closest<HTMLElement>('.leader');
    if (leader) return { leader: Number(leader.dataset.leader) as Side };
    return {};
  }

  private onPointerDown(e: PointerEvent): void {
    audio.unlock();
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.mulligan') || target.closest('.bf-detail')) return;
    if (this.busy || this.destroyed) {
      // allow inspecting while the enemy acts
      const hit = this.hitTest(e.clientX, e.clientY);
      if (hit.card) this.inspect(hit.card);
      return;
    }
    const p = stage.toStage(e.clientX, e.clientY);
    this.pointerXY = p;
    const hit = this.hitTest(e.clientX, e.clientY);
    const st = this.input;
    if (st.k === 'targeting') {
      let t = hit.card ?? (hit.leader !== undefined ? leaderTgt(hit.leader) : undefined);
      if (t === undefined || !st.targets.includes(t)) t = this.nearestTarget(p, st.targets, 60) ?? t;
      if (t !== undefined && st.targets.includes(t)) {
        audio.play('tap');
        if (st.source === 'play') void this.commit({ t: 'play', uid: st.uid, target: t });
        else void this.commit({ t: 'evolve', uid: st.uid, sup: st.sup, target: t });
      } else if (t !== undefined) {
        audio.play('error');
      }
      return;
    }
    if (st.k === 'selected') {
      let t = hit.card ?? (hit.leader !== undefined ? leaderTgt(hit.leader) : undefined);
      if (t === undefined || !st.targets.includes(t)) t = this.nearestTarget(p, st.targets, 60) ?? t;
      if (t !== undefined && st.targets.includes(t)) {
        void this.commit({ t: 'attack', uid: st.uid, target: t });
        return;
      }
      if (hit.card === st.uid) {
        this.setInput({ k: 'idle' });
        this.render();
        return;
      }
      this.setInput({ k: 'idle' });
    }
    if (hit.card !== undefined) {
      const c = this.card(hit.card);
      if (!c) return;
      if (c.owner === PLAYER && this.s.players[PLAYER].hand.includes(c)) {
        this.input = { k: 'handPress', uid: c.uid, x0: p.x, y0: p.y, pid: e.pointerId };
        return;
      }
      if (c.owner === PLAYER && this.s.players[PLAYER].board.includes(c)) {
        this.input = { k: 'boardPress', uid: c.uid, x0: p.x, y0: p.y, pid: e.pointerId };
        return;
      }
      this.inspect(c.uid);
      return;
    }
    if (hit.leader !== undefined) this.inspectLeader(hit.leader);
  }

  private onMove = (e: PointerEvent) => {
    const p = stage.toStage(e.clientX, e.clientY);
    this.pointerXY = p;
    const st = this.input;
    if (st.k === 'handPress' && Math.hypot(p.x - st.x0, p.y - st.y0) > 10) {
      this.hideHint();
      this.input = { k: 'handDrag', uid: st.uid, pid: st.pid };
      const el = this.els.get(st.uid);
      el?.classList.add('dragging');
      const c = this.card(st.uid);
      const ok = c ? E.canPlay(this.s, c) : false;
      this.root.classList.toggle('drag-play', ok);
      this.root.classList.toggle('drag-noplay', !ok);
      this.hover = null;
      this.render();
      audio.play('flip');
    }
    if (this.input.k === 'handDrag') {
      const el = this.els.get(this.input.uid);
      if (el) {
        el.style.transform = `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) rotate(${Math.max(-12, Math.min(12, (p.x - this.g.cx) * 0.01))}deg) scale(0.86)`;
        el.style.zIndex = '1000';
        el.classList.toggle('over-line', p.y < this.g.playLine);
      }
      return;
    }
    if (st.k === 'boardPress' && Math.hypot(p.x - st.x0, p.y - st.y0) > 8) {
      const c = this.card(st.uid);
      const targets = c ? E.attackTargets(this.s, c) : [];
      if (!targets.length) {
        this.input = { k: 'idle' };
        if (c && !E.canEvolve(this.s, c, false) && !E.canEvolve(this.s, c, true)) toast('このフォロワーは今は攻撃できない', '💤');
        return;
      }
      this.hideHint();
      this.setInput({ k: 'attackDrag', uid: st.uid, pid: st.pid, targets });
      audio.play('whoosh', { vol: 0.5 });
    }
    if (this.input.k === 'attackDrag' || this.input.k === 'targeting') {
      this.drawArrow(p);
    }
  };

  private onUp = (e: PointerEvent) => {
    const st = this.input;
    const p = stage.toStage(e.clientX, e.clientY);
    if (st.k === 'handPress') {
      this.input = { k: 'idle' };
      this.inspect(st.uid);
      return;
    }
    if (st.k === 'boardPress') {
      this.input = { k: 'idle' };
      const c = this.card(st.uid);
      if (!c) return;
      const targets = E.attackTargets(this.s, c);
      audio.play('tap');
      this.setInput({ k: 'selected', uid: st.uid, targets });
      return;
    }
    if (st.k === 'handDrag') {
      const c = this.card(st.uid);
      this.setInput({ k: 'idle' });
      if (c && p.y < this.g.playLine) {
        if (E.canPlay(this.s, c)) {
          this.beginPlay(c.uid);
          return;
        }
        audio.play('error');
        const cost = E.playCost(this.s, c).cost;
        toast(cost > this.s.players[PLAYER].pp ? `PPが足りない！（必要 ${cost}）` : def(c.id).type === 'spell' ? '対象がいないよ' : '場がいっぱい！', '⚠️');
      }
      this.render();
      return;
    }
    if (st.k === 'attackDrag') {
      const hit = this.hitTest(e.clientX, e.clientY);
      let t = hit.card ?? (hit.leader !== undefined ? leaderTgt(hit.leader) : undefined);
      if (t === undefined || !st.targets.includes(t)) t = this.nearestTarget(p, st.targets);
      if (t !== undefined && st.targets.includes(t)) {
        void this.commit({ t: 'attack', uid: st.uid, target: t });
      } else {
        this.setInput({ k: 'idle' });
        this.render();
      }
    }
  };

  private drawArrow(p: { x: number; y: number }): void {
    const st = this.input;
    if (st.k !== 'attackDrag' && st.k !== 'targeting') return;
    const from = st.k === 'targeting' && st.source === 'play' ? this.g.pending : this.pos.get(st.uid);
    if (!from) return;
    // snap to hovered target
    let tx = p.x;
    let ty = p.y;
    let aimed = false;
    for (const t of st.targets) {
      const tp = t < 0 ? this.g.leader[tgtSide(t)] : this.pos.get(t);
      if (!tp) continue;
      if (Math.hypot(tp.x - p.x, tp.y - p.y) < 70) {
        tx = tp.x;
        ty = tp.y;
        aimed = true;
        this.layer.querySelectorAll('.aim').forEach((e) => e.classList.remove('aim'));
        for (const L of this.leaders) L.root.classList.remove('aim');
        if (t < 0) this.leaders[tgtSide(t)].root.classList.add('aim');
        else this.els.get(t)?.classList.add('aim');
        break;
      }
    }
    if (!aimed) {
      this.layer.querySelectorAll('.aim').forEach((e) => e.classList.remove('aim'));
      for (const L of this.leaders) L.root.classList.remove('aim');
    }
    const mx = (from.x + tx) / 2;
    const my = Math.min(from.y, ty) - Math.abs(tx - from.x) * 0.25 - 40;
    this.arrowPath.setAttribute('d', `M ${from.x} ${from.y} Q ${mx} ${my} ${tx} ${ty}`);
    const ang = Math.atan2(ty - my, tx - mx);
    const s = 26;
    const p1 = `${tx + Math.cos(ang) * 8} ${ty + Math.sin(ang) * 8}`;
    const p2 = `${tx - Math.cos(ang - 0.5) * s} ${ty - Math.sin(ang - 0.5) * s}`;
    const p3 = `${tx - Math.cos(ang + 0.5) * s} ${ty - Math.sin(ang + 0.5) * s}`;
    this.arrowHead.setAttribute('d', `M ${p1} L ${p2} L ${p3} Z`);
    this.arrow.classList.toggle('aimed', aimed);
  }

  private beginPlay(uid: number): void {
    const c = this.card(uid);
    if (!c) return;
    const ts = E.playTargets(this.s, c);
    if (ts && ts.length) {
      audio.play('tap');
      this.setInput({ k: 'targeting', source: 'play', uid, sup: false, targets: ts });
      this.drawArrow(this.pointerXY);
      return;
    }
    void this.commit({ t: 'play', uid });
  }

  private beginEvolve(uid: number, sup: boolean): void {
    const c = this.card(uid);
    if (!c) return;
    const ts = E.evoTargets(this.s, c);
    if (ts && ts.length) {
      audio.play('tap');
      this.setInput({ k: 'targeting', source: 'evolve', uid, sup, targets: ts });
      return;
    }
    void this.commit({ t: 'evolve', uid, sup });
  }

  private cancelTargeting(): void {
    audio.play('back');
    this.setInput({ k: 'idle' });
    this.render();
    this.refreshIdle();
  }

  private onHover(e: PointerEvent): void {
    if (e.pointerType !== 'mouse') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('.card');
    if (!card) return;
    const uid = Number(card.dataset.uid);
    if (this.input.k === 'idle' && !this.busy && this.s.players[PLAYER].hand.some((c) => c.uid === uid)) {
      if (this.hover !== uid) {
        this.hover = uid;
        audio.play('hover');
        this.render();
      }
    }
    if (!this.g.portrait && (this.input.k === 'idle' || this.input.k === 'selected' || this.busy)) this.showDetail(uid);
  }

  private onHoverOut(e: PointerEvent): void {
    if (e.pointerType !== 'mouse') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('.card');
    const to = (e.relatedTarget as HTMLElement | null)?.closest?.('.card');
    if (!card || to === card) return;
    if (this.hover === Number(card.dataset.uid)) {
      this.hover = null;
      if (this.input.k === 'idle') this.render();
    }
    this.detailEl.classList.remove('on');
  }

  private showDetail(uid: number): void {
    const c = this.card(uid);
    if (!c) return;
    const facedown = c.owner === ENEMY && this.s.players[ENEMY].hand.includes(c);
    if (facedown) return;
    const d = def(c.id);
    const big = staticCard(c.id, 'detail', c.owner === PLAYER && isPrism(c.id));
    this.detailEl.replaceChildren(
      h('div.detail-card', big),
      h('div.detail-gloss', glossary(d).map((g) => h('div.gloss', h('b', g.name), h('span', g.desc)))),
      ...[relatedBlock(d)].filter((x): x is HTMLElement => !!x),
    );
    this.detailEl.classList.add('on');
    this.detailEl.classList.toggle('right', (this.pos.get(uid)?.x ?? 0) < this.g.W * 0.35);
    fitCardText(this.detailEl);
  }

  inspect(uid: number): void {
    const c = this.card(uid);
    if (!c) return;
    const facedown = c.owner === ENEMY && this.s.players[ENEMY].hand.includes(c);
    if (facedown) return;
    audio.play('tap');
    const d = def(c.id);
    const close = () => {
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 200);
    };
    const btns: HTMLElement[] = [];
    const idle = !this.busy && this.s.active === PLAYER;
    if (idle && this.s.players[PLAYER].hand.includes(c)) {
      const ok = E.canPlay(this.s, c);
      btns.push(h(`button.btn.btn-hot${ok ? '' : '.disabled'}`, { type: 'button', onclick: () => {
        if (!ok) {
          audio.play('error');
          return;
        }
        close();
        this.beginPlay(c.uid);
      } }, ok ? 'プレイする！' : 'まだ出せない'));
    }
    if (idle && this.s.players[PLAYER].board.includes(c)) {
      if (E.canEvolve(this.s, c, false)) btns.push(h('button.btn.btn-evo', { type: 'button', onclick: () => { close(); this.beginEvolve(c.uid, false); } }, '進化！'));
      if (E.canEvolve(this.s, c, true)) btns.push(h('button.btn.btn-super', { type: 'button', onclick: () => { close(); this.beginEvolve(c.uid, true); } }, '超進化！！'));
    }
    btns.push(h('button.btn', { type: 'button', onclick: () => { audio.play('back'); close(); } }, '閉じる'));
    const live = E.boardCard(this.s, uid);
    const big = staticCard(c.id, 'detail', c.owner === PLAYER && isPrism(c.id));
    if (live) updateCard(big, E.cardView(this.s, live, 'board'), 'board');
    big.classList.remove('zone-board', 'zone-hand');
    big.classList.add('zone-detail');
    const ov = h(
      'div.inspect',
      h('div.inspect-body', h('div.inspect-card', big), h('div.inspect-side', h('div.inspect-flavor', d.flavor ?? ''), h('div.detail-gloss', glossary(d).map((g) => h('div.gloss', h('b', g.name), h('span', g.desc)))), relatedBlock(d), h('div.inspect-btns', btns))),
    );
    closeOnTap(ov, close, true);
    stage.overlay.append(ov);
    fitCardText(ov);
  }

  private inspectLeader(side: Side): void {
    audio.play('tap');
    const cls = side === PLAYER ? this.cfg.playerCls : this.cfg.enemyCls;
    const cm = CLASSES[cls];
    const p = this.s.players[side];
    const close = () => {
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 200);
    };
    const ov = h(
      'div.inspect',
      h(
        'div.inspect-body.leader-info',
        h('div.li-art', { style: { '--c1': cm.color, '--c2': cm.color2 } }, side === ENEMY && this.cfg.enemyArt ? this.cfg.enemyArt : cm.leaderArt),
        h(
          'div.inspect-side',
          h('div.li-name', side === ENEMY ? this.cfg.enemyName : `${save.data.name}（${cm.name}）`),
          h('div.li-mech', h('b', cm.mechanic), h('p', cm.mechanicDesc)),
          h('div.li-stats', `体力 ${p.hp}/${p.maxHp}　手札 ${p.hand.length}　山札 ${p.deck.length}　DOPA ${p.dopa}/${RULES.dopaMax}`),
          h('div.li-mech', h('b', 'FEVER'), h('p', 'DOPAゲージ（リーダーの周りのリング）が満タンになると発動できる。カードを1枚引き、そのターン中は自分のフォロワーの攻撃力+1、手札のコスト-1！')),
        ),
      ),
    );
    closeOnTap(ov, close, false);
    stage.overlay.append(ov);
  }

  private onEnd(): void {
    audio.unlock();
    if (this.busy || this.s.active !== PLAYER) return;
    audio.play('tap');
    void this.commit({ t: 'end' });
  }

  private onFever(): void {
    if (this.busy || !E.canFever(this.s)) return;
    void this.commit({ t: 'fever' });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.input.k === 'targeting') this.cancelTargeting();
      else if (this.input.k !== 'idle') {
        this.setInput({ k: 'idle' });
        this.render();
      }
    }
    if ((e.key === ' ' || e.key === 'Enter') && !(e.target as HTMLElement).closest?.('input,button')) {
      e.preventDefault();
      this.onEnd();
    }
    if (e.key === 'f' || e.key === 'F') this.onFever();
  }

  private toggleAuto(): void {
    audio.play('tap');
    this.auto = !this.auto;
    this.autoBtn.classList.toggle('on', this.auto);
    toast(this.auto ? 'オートバトル ON' : 'オートバトル OFF', '🤖');
    if (this.auto && !this.busy && this.s.active === PLAYER && this.s.phase === 'main') {
      this.setInput({ k: 'idle' });
      void this.runAi(PLAYER);
    }
  }

  private cycleSpeed(): void {
    audio.play('tap');
    const order = [1, 1.5, 2, 3];
    const i = order.indexOf(fxConfig.speed);
    const next = order[(i + 1) % order.length];
    fxConfig.speed = next;
    this.root.style.setProperty('--spd', String(next));
    this.speedBtn.textContent = `x${next}`;
    save.update((d) => (d.settings.speed = next));
  }

  private openMenu(): void {
    audio.play('tap');
    const close = () => {
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 200);
    };
    const ov = h(
      'div.inspect',
      h(
        'div.menu-panel',
        h('div.menu-title', 'メニュー'),
        h('button.btn', { type: 'button', onclick: () => { close(); this.showRules(); } }, '遊び方'),
        h('button.btn', { type: 'button', onclick: () => { close(); this.toggleHints(); } }, save.data.settings.hints ? 'ヒント：ON' : 'ヒント：OFF'),
        h('button.btn.perf-cycle', { type: 'button', onclick: (e: Event) => {
          const next = ((save.data.settings.perf + 2) % 3) as PerfLevel;
          setPerf(next);
          audio.play('tap');
          (e.currentTarget as HTMLElement).textContent = perfLabel();
          toast(`動作モード：${PERF_INFO[next].name}`, PERF_INFO[next].emoji);
        } }, perfLabel()),
        h('button.btn.btn-danger', { type: 'button', onclick: async () => {
          close();
          if (await confirmModal('降参する？ この試合は負けになるよ。', '降参する', '続ける')) void this.concede();
        } }, '降参する'),
        h('button.btn.btn-hot', { type: 'button', onclick: () => { audio.play('back'); close(); } }, 'バトルに戻る'),
      ),
    );
    closeOnTap(ov, close, true);
    stage.overlay.append(ov);
  }

  private lastEmote = 0;

  private openEmotes(): void {
    audio.play('tap');
    const old = this.root.querySelector('.emote-menu');
    if (old) {
      old.remove();
      return;
    }
    const lines = ['よろしく！', 'ナイス！', 'ドパドパ！', 'うそでしょ…', 'まだまだ！', 'GG！'];
    const L = this.g.leader[PLAYER];
    const menu = h(
      'div.emote-menu',
      { style: { left: `${L.x - 90}px`, top: `${L.y - 90}px` } },
      lines.map((t) =>
        h('button.emote-opt', { type: 'button', onclick: (e: Event) => {
          e.stopPropagation();
          menu.remove();
          if (performance.now() - this.lastEmote < 2500) return;
          this.lastEmote = performance.now();
          this.anim.say(PLAYER, t);
          audio.play('notify');
          if (Math.random() < 0.45) setTimeout(() => this.anim.enemyReact('emote'), 900);
        } }, t),
      ),
    );
    this.root.append(menu);
  }

  private toggleHints(): void {
    save.update((d) => (d.settings.hints = !d.settings.hints));
    toast(save.data.settings.hints ? 'ヒントを表示します' : 'ヒントを非表示にしました', '💡');
  }

  private showRules(): void {
    import('../screens/rules').then((m) => m.showRulesOverlay());
  }

  private async concede(): Promise<void> {
    if (this.s.phase === 'over') return;
    this.conceded = true;
    const wasBusy = this.busy;
    this.busy = true;
    const evs = apply(this.s, { t: 'concede', side: PLAYER });
    if (!wasBusy) await this.anim.play(evs);
    this.afterAction();
  }

  /** test hook (only with #qa in the URL): lets automated visual checks set up board states */
  private exposeQa(): void {
    const b = this;
    (window as unknown as { __qa: unknown }).__qa = {
      b,
      E,
      give(id: string, side: Side = PLAYER) {
        const c = E.makeCard(b.s, id, side);
        b.s.players[side].hand.push(c);
        b.render(E.view(b.s));
        return c.uid;
      },
      put(id: string, side: Side = PLAYER) {
        const c = E.makeCard(b.s, id, side);
        c.enteredOn = b.s.turn - 1;
        b.s.players[side].board.push(c);
        b.render(E.view(b.s));
        return c.uid;
      },
      set(fn: (s: GameState) => void) {
        fn(b.s);
        b.render(E.view(b.s));
        b.refreshIdle();
      },
      act(a: Action) {
        void b.commit(a);
      },
      legal: () => legalActions(b.s),
    };
  }

  // ================================================================== helpers for the animator

  /** stage coords of a target */
  at(t: Tgt | number, kind: 'tgt' | 'uid' = 'tgt'): { x: number; y: number } {
    if (kind === 'tgt' && t < 0) return this.g.leader[tgtSide(t)];
    const p = this.pos.get(t);
    if (p) return { x: p.x, y: p.y };
    return { x: this.g.cx, y: this.g.H / 2 };
  }

  leaderRoot(side: Side): HTMLElement {
    return this.leaders[side].root;
  }

  clearLayer(): void {
    clear(this.layer);
    this.els.clear();
  }
}

function diffLabel(d: Difficulty): string {
  return d === 'easy' ? 'かんたん' : d === 'normal' ? 'ふつう' : d === 'hard' ? 'つよい' : '鬼';
}

export function isPrism(id: string): boolean {
  return (save.data.prism[id] ?? 0) > 0;
}

function perfLabel(): string {
  const i = PERF_INFO[save.data.settings.perf];
  return `動作：${i.emoji}${i.name}`;
}

/**
 * Close an overlay when tapped (`backdropOnly`: only on its dimmed backdrop).
 * Overlays open on pointerdown/up, so the click that follows the opening tap
 * lands on the fresh overlay — only count taps that also *started* on it.
 */
function closeOnTap(ov: HTMLElement, close: () => void, backdropOnly: boolean): void {
  let armed = false;
  ov.addEventListener('pointerdown', (e) => {
    armed = !backdropOnly || e.target === ov;
  });
  ov.addEventListener('click', (e) => {
    if (armed && (!backdropOnly || e.target === ov)) close();
    armed = false;
  });
}
