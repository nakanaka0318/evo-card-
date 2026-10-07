import type { View } from '../../engine';
import { CARD_H, CARD_W } from '../cardview';

export interface Pos {
  x: number;
  y: number;
  r: number;
  s: number;
  z: number;
  zone: 'hand' | 'board' | 'ehand';
  side: 0 | 1;
  index: number;
}

export interface Geo {
  W: number;
  H: number;
  portrait: boolean;
  cx: number;
  leader: [{ x: number; y: number }, { x: number; y: number }];
  boardY: [number, number];
  boardScale: number;
  slot: number;
  handScale: number;
  handY: number;
  handL: number;
  handR: number;
  ehand: { x: number; y: number; s: number; step: number };
  end: { x: number; y: number; r: number };
  fever: { x: number; y: number };
  combo: { x: number; y: number };
  pp: [{ x: number; y: number }, { x: number; y: number }];
  deck: [{ x: number; y: number }, { x: number; y: number }];
  /** pointer y above which a dragged hand card is "played" */
  playLine: number;
  /** pending area for a card that awaits a target */
  pending: { x: number; y: number };
}

export function geometry(W: number, H: number, portrait: boolean): Geo {
  const cx = W / 2;
  if (!portrait) {
    return {
      W,
      H,
      portrait,
      cx,
      leader: [
        { x: cx, y: H - 94 },
        { x: cx, y: 100 },
      ],
      boardY: [452, 264],
      boardScale: 0.62,
      slot: 134,
      handScale: 0.68,
      handY: H - 76,
      handL: cx + 168,
      handR: W - 26,
      ehand: { x: W - 250, y: 30, s: 0.34, step: 30 },
      end: { x: W - 92, y: 358, r: 72 },
      fever: { x: Math.max(96, cx - 500), y: H - 150 },
      combo: { x: 112, y: 358 },
      pp: [
        { x: cx - 300, y: H - 72 },
        { x: cx - 300, y: 72 },
      ],
      deck: [
        { x: W + 120, y: H - 120 },
        { x: W + 80, y: -140 },
      ],
      playLine: H - 190,
      pending: { x: cx - 330, y: 358 },
    };
  }
  const eb = Math.round(H * 0.285);
  const pb = Math.round(H * 0.47);
  const ly = Math.round(H * 0.645);
  return {
    W,
    H,
    portrait,
    cx,
    leader: [
      { x: cx, y: ly },
      { x: cx, y: Math.round(H * 0.085) },
    ],
    boardY: [pb, eb],
    boardScale: 0.68,
    slot: 136,
    handScale: 0.8,
    handY: H - 118,
    handL: 18,
    handR: W - 18,
    ehand: { x: W - 150, y: 28, s: 0.3, step: 22 },
    end: { x: W - 92, y: ly, r: 64 },
    fever: { x: W - 92, y: ly - 128 },
    combo: { x: cx, y: Math.round((eb + pb) / 2) },
    pp: [
      { x: 108, y: ly + 96 },
      { x: 92, y: Math.round(H * 0.085) },
    ],
    deck: [
      { x: W + 120, y: H - 100 },
      { x: W + 80, y: -140 },
    ],
    playLine: ly + 40,
    pending: { x: cx, y: Math.round((eb + pb) / 2) },
  };
}

export function layout(v: View, g: Geo, hover: number | null): Map<number, Pos> {
  const out = new Map<number, Pos>();
  // boards
  for (const side of [0, 1] as const) {
    const b = v.p[side].board;
    const n = b.length;
    b.forEach((c, i) => {
      out.set(c.uid, {
        x: g.cx + (i - (n - 1) / 2) * g.slot,
        y: g.boardY[side],
        r: 0,
        s: g.boardScale,
        z: 100 + i,
        zone: 'board',
        side,
        index: i,
      });
    });
  }
  // player hand: fan
  const hand = v.p[0].hand;
  const n = hand.length;
  const cw = CARD_W * g.handScale;
  const span = g.handR - g.handL - cw;
  const step = n > 1 ? Math.min(cw * 0.92, span / (n - 1)) : 0;
  const total = step * (n - 1);
  const start = g.portrait ? g.cx - total / 2 : Math.max(g.handL + cw / 2, g.handR - cw / 2 - total);
  hand.forEach((c, i) => {
    const t = n > 1 ? i / (n - 1) - 0.5 : 0;
    const isHover = hover === c.uid;
    out.set(c.uid, {
      x: start + i * step,
      y: g.handY + Math.abs(t) * (g.portrait ? 26 : 22) - (isHover ? (g.portrait ? 120 : 110) : 0),
      r: isHover ? 0 : t * (g.portrait ? 10 : 12),
      s: isHover ? g.handScale * 1.32 : g.handScale,
      z: isHover ? 900 : 300 + i,
      zone: 'hand',
      side: 0,
      index: i,
    });
  });
  // enemy hand: small backs
  const eh = v.p[1].hand;
  eh.forEach((c, i) => {
    const t = eh.length > 1 ? i / (eh.length - 1) - 0.5 : 0;
    out.set(c.uid, {
      x: g.ehand.x + (i - (eh.length - 1) / 2) * g.ehand.step,
      y: g.ehand.y + Math.abs(t) * 8,
      r: 180 + t * 14,
      s: g.ehand.s,
      z: 50 + i,
      zone: 'ehand',
      side: 1,
      index: i,
    });
  });
  return out;
}

export const CARD_SIZE = { w: CARD_W, h: CARD_H };
