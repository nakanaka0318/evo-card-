import { particles } from './fx/particles';
import { stage } from './stage';

/**
 * 動作モード (lag reduction).
 *
 * Profiling on a throttled phone showed the real cost is not script but
 * repaints: any looping animation of a paint property (box-shadow, filter,
 * background-position, a custom property feeding a gradient…) forces the whole
 * scaled stage to repaint every frame, while transform/opacity loops are
 * nearly free. So the lighter modes switch those loops off (keeping the
 * transform-based motion), lower the effect canvas resolution and thin out
 * particles.
 *
 * 0 = サクサク: every paint loop off, canvas at 1x, ~40% particles, no ambient sparkles
 * 1 = バランス: decorative paint loops off (indicator glows keep pulsing), canvas ≤1.5x
 * 2 = キラキラ: everything on
 */
export type PerfLevel = 0 | 1 | 2;

export const PERF_INFO: Record<PerfLevel, { name: string; emoji: string; desc: string }> = {
  0: { name: 'サクサク', emoji: '⚡', desc: '動きを最優先。キラキラ演出をしぼってカクつきを抑える' },
  1: { name: 'バランス', emoji: '⚖️', desc: '見た目と軽さのいいとこ取り。だいたいのスマホはこれでOK' },
  2: { name: 'キラキラ', emoji: '✨', desc: '全部の演出をフル表示。PCや新しい端末向け' },
};

export const perfConfig = {
  level: 2 as PerfLevel,
  /** ambient decoration (title sparkles etc.) */
  ambient: true,
  /** fps sampled on the (busy) title screen, used for the first-run recommendation */
  sampleFps: 0,
};

/** animations that tell the player something (can act, can target, low HP…) */
const INDICATORS = new Set(['hp-low', 'pulse-glow', 'rank-btn', 'lethal-pop']);
/** compositor-only, but big enough to be worth dropping in the lighter modes */
const HEAVY_TRANSFORM = new Set(['fever-stripes']);
const PAINT_PROPS = /(^|-)(shadow|filter|background|color|clip-path|mask|stroke|fill|width|height|left|top|right|bottom|outline|border|font|spacing|padding|margin)|^--/;

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
}

let styleEl: HTMLStyleElement | null = null;

function* walkRules(list: CSSRuleList): Generator<CSSRule> {
  for (const r of Array.from(list)) {
    yield r;
    const inner = (r as CSSGroupingRule).cssRules;
    if (inner && !(r instanceof CSSKeyframesRule)) yield* walkRules(inner);
  }
}

/**
 * Build the override sheet once from the live stylesheets, so every looping
 * paint animation (current and future) is covered without hand-kept lists.
 */
function buildOverrides(): string {
  const sheets = Array.from(document.styleSheets);
  const paintLoops = new Set<string>(HEAVY_TRANSFORM);
  const rules: CSSStyleRule[] = [];
  for (const sh of sheets) {
    let list: CSSRuleList;
    try {
      list = sh.cssRules;
    } catch {
      continue; // cross-origin (web fonts)
    }
    for (const r of walkRules(list)) {
      if (r instanceof CSSKeyframesRule) {
        for (const f of Array.from(r.cssRules) as CSSKeyframeRule[]) {
          for (let i = 0; i < f.style.length; i++) {
            if (PAINT_PROPS.test(f.style[i])) paintLoops.add(r.name);
          }
        }
      } else if (r instanceof CSSStyleRule && r.style.animationName) {
        rules.push(r);
      }
    }
  }
  const lite: string[] = [];
  const bal: string[] = [];
  for (const r of rules) {
    if (!r.style.animationIterationCount.includes('infinite')) continue;
    const names = r.style.animationName.split(',').map((s) => s.trim());
    const hit = names.filter((n) => paintLoops.has(n));
    if (!hit.length) continue;
    const sels = splitSelectors(r.selectorText);
    lite.push(...sels.map((s) => scoped(s, 'perf-0')));
    if (hit.some((n) => !INDICATORS.has(n))) bal.push(...sels.map((s) => scoped(s, 'perf-1')));
  }
  const out: string[] = [];
  if (lite.length) out.push(`${lite.join(',\n')} { animation: none !important; }`);
  if (bal.length) out.push(`${bal.join(',\n')} { animation: none !important; }`);
  return out.join('\n');
}

/** split a selector list on top-level commas (not inside :is()/:not()) */
function splitSelectors(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** `.x` → `html.perf-0 .x`; `html.calm .x` → `html.perf-0.calm .x` */
function scoped(sel: string, cls: string): string {
  const m = /^(?::root|html)(?![\w-])/.exec(sel);
  return m ? `html.${cls}${sel.slice(m[0].length)}` : `html.${cls} ${sel}`;
}

export function applyPerf(level: PerfLevel): void {
  perfConfig.level = level;
  perfConfig.ambient = level > 0;
  const root = document.documentElement;
  root.classList.remove('perf-0', 'perf-1', 'perf-2');
  root.classList.add(`perf-${level}`);
  if (level < 2 && !styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'perf-overrides';
    styleEl.textContent = buildOverrides();
    document.head.append(styleEl);
  }
  particles.quality = level === 0 ? 0.4 : level === 1 ? 0.75 : 1;
  particles.maxCount = level === 0 ? 320 : level === 1 ? 800 : 1400;
  stage.setDprCap(level === 0 ? 1 : level === 1 ? 1.5 : 2);
}

/** average frames per second over `ms` — used to recommend a mode */
export function measureFps(ms = 1200): Promise<number> {
  return new Promise((res) => {
    let n = 0;
    let t0 = 0;
    const step = (t: number) => {
      if (!t0) t0 = t;
      else n++;
      if (t - t0 < ms) requestAnimationFrame(step);
      else res((n * 1000) / Math.max(1, t - t0));
    };
    requestAnimationFrame(step);
  });
}

export function recommendPerf(fps: number): PerfLevel {
  if (fps < 40) return 0;
  if (isTouchDevice() || fps < 54) return 1;
  return 2;
}
