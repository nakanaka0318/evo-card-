import { h } from './dom';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

type ResizeFn = () => void;

/**
 * The game renders into a fixed-logical-size "stage" that is scaled to fit the
 * viewport. Landscape keeps a 720px height, portrait keeps a 720px width; the
 * other dimension stretches within limits so tall phones and wide monitors
 * are used fully.
 */
class StageImpl {
  viewport!: HTMLElement;
  root!: HTMLElement;
  screen!: HTMLElement;
  overlay!: HTMLElement;
  toasts!: HTMLElement;
  canvas!: HTMLCanvasElement;
  w = 1280;
  h = 720;
  scale = 1;
  ox = 0;
  oy = 0;
  portrait = false;
  dpr = 1;
  /** effect-canvas resolution cap (動作モード) */
  dprCap = 2;
  /** menus use a denser (larger-looking) stage on phones held upright */
  mode: 'battle' | 'menu' = 'menu';
  private fns = new Set<ResizeFn>();

  mount(host: HTMLElement): void {
    this.viewport = h('div.viewport');
    this.viewport.id = 'viewport';
    this.root = h('div.stage');
    this.root.id = 'stage';
    this.screen = h('div.layer.layer-screen');
    this.canvas = h('canvas.layer.layer-fx') as HTMLCanvasElement;
    this.canvas.style.visibility = 'hidden';
    this.overlay = h('div.layer.layer-overlay');
    this.toasts = h('div.layer.layer-toast');
    this.root.append(this.screen, this.canvas, this.overlay, this.toasts);
    this.viewport.append(this.root);
    host.append(this.viewport);
    const on = () => this.fit();
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    this.fit();
  }

  fit(): void {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const portrait = vw / vh < 1;
    let w: number;
    let hh: number;
    if (portrait) {
      w = this.mode === 'menu' ? 560 : 720;
      hh = Math.round(Math.min(w * 2.22, Math.max(w * 1.555, (w * vh) / vw)));
    } else {
      hh = 720;
      w = Math.round(Math.min(1600, Math.max(1120, (720 * vw) / vh)));
    }
    const scale = Math.min(vw / w, vh / hh);
    const changed = w !== this.w || hh !== this.h || portrait !== this.portrait || scale !== this.scale;
    this.w = w;
    this.h = hh;
    this.scale = scale;
    this.portrait = portrait;
    this.ox = (vw - w * scale) / 2;
    this.oy = (vh - hh * scale) / 2;
    this.root.style.width = `${w}px`;
    this.root.style.height = `${hh}px`;
    this.root.style.transform = `translate(${this.ox}px, ${this.oy}px) scale(${scale})`;
    this.root.classList.toggle('portrait', portrait);
    this.root.classList.toggle('landscape', !portrait);
    this.root.style.setProperty('--sw', `${w}px`);
    this.root.style.setProperty('--sh', `${hh}px`);
    this.dpr = Math.min(this.dprCap, window.devicePixelRatio || 1);
    const cw = Math.round(w * scale * this.dpr);
    const ch = Math.round(hh * scale * this.dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    if (changed) for (const f of this.fns) f();
  }

  setDprCap(cap: number): void {
    if (this.dprCap === cap) return;
    this.dprCap = cap;
    if (this.root) this.fit();
  }

  setMode(mode: 'battle' | 'menu'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.fit();
  }

  onResize(fn: ResizeFn): () => void {
    this.fns.add(fn);
    return () => this.fns.delete(fn);
  }

  /** client (CSS px) -> stage logical coords */
  toStage(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale };
  }

  rect(el: Element): Rect {
    const r = el.getBoundingClientRect();
    const p = this.toStage(r.left, r.top);
    const w = r.width / this.scale;
    const hh = r.height / this.scale;
    return { x: p.x, y: p.y, w, h: hh, cx: p.x + w / 2, cy: p.y + hh / 2 };
  }
}

export const stage = new StageImpl();
