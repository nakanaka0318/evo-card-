// Leader strength from AI-vs-AI games with NPC decks (scripts/classpower.ts).
// Shown on the rankings screen as the AI シミュレーション leader table.
import type { ClassId } from './types';

export const SIM_GAMES = 5508;

export const SIM_CLASS: Partial<Record<ClassId, { g: number; w: number }>> = {
  gacha: { g: 612, w: 256 },
  stream: { g: 612, w: 415 },
  sweets: { g: 612, w: 387 },
  swipe: { g: 612, w: 432 },
  gamer: { g: 612, w: 404 },
  gadget: { g: 612, w: 273 },
  treasure: { g: 612, w: 242 },
  harmony: { g: 612, w: 293 },
  crash: { g: 612, w: 300 },
  ranger: { g: 612, w: 299 },
  witch: { g: 612, w: 470 },
  minimal: { g: 612, w: 189 },
  jewel: { g: 612, w: 154 },
  novel: { g: 612, w: 318 },
  deco: { g: 612, w: 279 },
  spicy: { g: 612, w: 245 },
  shrine: { g: 612, w: 219 },
  puppet: { g: 612, w: 333 },
};
