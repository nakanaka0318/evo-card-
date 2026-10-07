import { stage } from '../stage';

type PType = 'dot' | 'spark' | 'shard' | 'star' | 'coin' | 'heart' | 'confetti' | 'ring' | 'glow' | 'orb' | 'glyph' | 'line';

interface P {
  type: PType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  g: number;
  drag: number;
  glyph?: string;
  /** homing target for orbs */
  tx?: number;
  ty?: number;
  delay: number;
  w?: number;
  h?: number;
  grow?: number;
}

export interface BurstOpts {
  n?: number;
  colors?: string[];
  speed?: number;
  life?: number;
  size?: number;
  type?: PType;
  gravity?: number;
  spread?: number;
  angle?: number;
  drag?: number;
  glyph?: string;
}

/** sprite supersampling so cached glyphs stay sharp on hi-dpi canvases */
const SPRITE_RES = 2;

class ParticleSystem {
  private list: P[] = [];
  private raf = 0;
  private last = 0;
  intensity = 1;
  /** 動作モード multiplier on particle counts */
  quality = 1;
  maxCount = 1400;
  private lines = 0;
  private sprites = new Map<string, HTMLCanvasElement>();
  private lineColor = '#fff';
  private lineT = 0;

  private get ctx(): CanvasRenderingContext2D | null {
    return stage.canvas.getContext('2d');
  }

  private scaleN(n: number): number {
    return Math.max(1, Math.round(n * this.quality * (this.intensity === 0 ? 0.3 : this.intensity === 1 ? 0.65 : 1)));
  }

  private push(p: Partial<P> & { x: number; y: number }): void {
    if (this.list.length > this.maxCount) return;
    this.list.push({
      type: 'dot',
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 4,
      color: '#fff',
      rot: Math.random() * Math.PI * 2,
      vr: 0,
      g: 0,
      drag: 0.98,
      delay: 0,
      ...p,
    });
    this.start();
  }

  burst(x: number, y: number, o: BurstOpts = {}): void {
    const n = this.scaleN(o.n ?? 20);
    const colors = o.colors ?? ['#fff'];
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const sp = (o.speed ?? 6) * (0.35 + Math.random() * 0.9);
      this.push({
        type: o.type ?? 'spark',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        max: (o.life ?? 0.7) * (0.6 + Math.random() * 0.6),
        size: (o.size ?? 5) * (0.5 + Math.random()),
        color: colors[i % colors.length],
        vr: (Math.random() - 0.5) * 0.4,
        g: o.gravity ?? 0.12,
        drag: o.drag ?? 0.95,
        glyph: o.glyph,
      });
    }
  }

  ring(x: number, y: number, color = '#fff', radius = 120, life = 0.45, width = 10): void {
    this.push({ type: 'ring', x, y, size: radius, color, max: life, w: width, drag: 1 });
  }

  glow(x: number, y: number, color: string, radius = 140, life = 0.5): void {
    this.push({ type: 'glow', x, y, size: radius, color, max: life, drag: 1 });
  }

  shatter(r: { x: number; y: number; w: number; h: number }, colors: string[]): void {
    const n = this.scaleN(26);
    for (let i = 0; i < n; i++) {
      const x = r.x + Math.random() * r.w;
      const y = r.y + Math.random() * r.h;
      const a = Math.atan2(y - (r.y + r.h / 2), x - (r.x + r.w / 2)) + (Math.random() - 0.5);
      const sp = 3 + Math.random() * 7;
      this.push({
        type: 'shard',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        size: 6 + Math.random() * 14,
        color: colors[i % colors.length],
        max: 0.6 + Math.random() * 0.5,
        vr: (Math.random() - 0.5) * 0.5,
        g: 0.35,
        drag: 0.97,
      });
    }
  }

  confetti(n = 120): void {
    const colors = ['#ff2e88', '#ffe14d', '#3dffc5', '#38d6ff', '#a066ff', '#ffffff', '#ff9f43'];
    const c = this.scaleN(n);
    for (let i = 0; i < c; i++) {
      this.push({
        type: 'confetti',
        x: Math.random() * stage.w,
        y: -20 - Math.random() * stage.h * 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 8 + Math.random() * 8,
        color: colors[i % colors.length],
        max: 2.5 + Math.random() * 1.5,
        vr: (Math.random() - 0.5) * 0.3,
        g: 0.04,
        drag: 0.995,
      });
    }
  }

  rain(glyph: string, n = 40, size = 34): void {
    const c = this.scaleN(n);
    for (let i = 0; i < c; i++) {
      this.push({
        type: 'glyph',
        glyph,
        x: Math.random() * stage.w,
        y: -40 - Math.random() * stage.h * 0.6,
        vx: (Math.random() - 0.5) * 2,
        vy: 4 + Math.random() * 4,
        size: size * (0.7 + Math.random() * 0.6),
        max: 2.2,
        vr: (Math.random() - 0.5) * 0.2,
        g: 0.12,
        drag: 0.99,
      });
    }
  }

  /** particles that fly from a point and home onto a target */
  orbs(fx: number, fy: number, tx: number, ty: number, n: number, color: string, glyph?: string): void {
    const c = this.scaleN(n);
    for (let i = 0; i < c; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 6;
      this.push({
        type: glyph ? 'glyph' : 'orb',
        glyph,
        x: fx,
        y: fy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        tx,
        ty,
        size: glyph ? 22 : 7 + Math.random() * 5,
        color,
        max: 1.4,
        drag: 0.9,
        delay: i * 0.025,
      });
    }
  }

  floatUp(x: number, y: number, glyph: string, n = 5, spread = 60): void {
    const c = this.scaleN(n);
    for (let i = 0; i < c; i++) {
      this.push({
        type: 'glyph',
        glyph,
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2 - Math.random() * 2.5,
        size: 18 + Math.random() * 14,
        max: 0.9 + Math.random() * 0.5,
        g: -0.02,
        drag: 0.98,
        delay: i * 0.05,
      });
    }
  }

  /** 集中線 — radial speed lines for big moments */
  speedLines(seconds: number, color = 'rgba(255,255,255,0.85)'): void {
    if (this.intensity === 0) return;
    this.lines = Math.max(this.lines, seconds);
    this.lineColor = color;
    this.start();
  }

  clear(): void {
    this.list = [];
    this.lines = 0;
  }

  private start(): void {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(t: number): void {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const ctx = this.ctx;
    if (!ctx) return;
    const k = stage.scale * stage.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, stage.canvas.width, stage.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const f = dt * 60;
    if (this.lines > 0) {
      this.lines -= dt;
      this.lineT += dt;
      this.drawLines(ctx);
    }
    const alive: P[] = [];
    for (const p of this.list) {
      if (p.delay > 0) {
        p.delay -= dt;
        alive.push(p);
        continue;
      }
      p.life += dt;
      if (p.life >= p.max) continue;
      if (p.tx !== undefined && p.ty !== undefined) {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const d = Math.hypot(dx, dy);
        const pull = 0.9 + p.life * 3;
        p.vx += (dx / (d + 1)) * pull * f;
        p.vy += (dy / (d + 1)) * pull * f;
        if (d < 18) p.life = p.max;
      }
      p.vx *= Math.pow(p.drag, f);
      p.vy *= Math.pow(p.drag, f);
      p.vy += p.g * f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.rot += p.vr * f;
      this.draw(ctx, p);
      alive.push(p);
    }
    this.list = alive;
    if (this.list.length || this.lines > 0) this.raf = requestAnimationFrame((tt) => this.frame(tt));
    else {
      this.raf = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, stage.canvas.width, stage.canvas.height);
    }
  }

  private drawLines(ctx: CanvasRenderingContext2D): void {
    const cx = stage.w / 2;
    const cy = stage.h / 2;
    const R = Math.hypot(cx, cy) * 1.1;
    ctx.save();
    ctx.fillStyle = this.lineColor;
    ctx.globalAlpha = Math.min(1, this.lines * 3) * 0.55;
    const n = Math.round(70 * Math.max(0.5, this.quality));
    const seed = Math.floor(this.lineT * 24);
    for (let i = 0; i < n; i++) {
      const r1 = ((i * 9301 + seed * 49297) % 233280) / 233280;
      const a = (i / n) * Math.PI * 2 + r1 * 0.08;
      const inner = R * (0.42 + r1 * 0.22);
      const wdt = 0.006 + r1 * 0.012;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a - wdt) * R, cy + Math.sin(a - wdt) * R);
      ctx.lineTo(cx + Math.cos(a + wdt) * R, cy + Math.sin(a + wdt) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** emoji text is slow to rasterize every frame; draw each glyph once */
  private sprite(glyph: string, size: number): HTMLCanvasElement {
    const px = Math.max(8, Math.round(size / 4) * 4);
    const key = `${glyph}|${px}`;
    let c = this.sprites.get(key);
    if (!c) {
      if (this.sprites.size > 120) this.sprites.clear();
      c = document.createElement('canvas');
      const dim = Math.ceil(px * 1.4 * SPRITE_RES);
      c.width = c.height = dim;
      const g = c.getContext('2d');
      if (g) {
        g.font = `${px * SPRITE_RES}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(glyph, dim / 2, dim / 2);
      }
      this.sprites.set(key, c);
    }
    return c;
  }

  private draw(ctx: CanvasRenderingContext2D, p: P): void {
    const k = p.life / p.max;
    const a = 1 - k;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(p.x, p.y);
    switch (p.type) {
      case 'dot':
      case 'orb': {
        ctx.globalCompositeOperation = 'lighter';
        const r = Math.max(0.1, p.size * (p.type === 'orb' ? 1 : a));
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.3, p.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'spark': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.rotate(Math.atan2(p.vy, p.vx));
        const len = p.size * 2 + Math.hypot(p.vx, p.vy) * 2.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(len, 0);
        ctx.lineTo(0, p.size * 0.35);
        ctx.lineTo(-len * 0.4, 0);
        ctx.lineTo(0, -p.size * 0.35);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'shard': {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.5, -p.size * 0.3);
        ctx.lineTo(p.size * 0.6, -p.size * 0.1);
        ctx.lineTo(-p.size * 0.1, p.size * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
      case 'star': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? s : s * 0.28;
          const an = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'confetti': {
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.life * 8 + p.rot));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      }
      case 'ring': {
        ctx.globalCompositeOperation = 'lighter';
        const r = Math.max(0.1, p.size * (0.2 + 0.8 * (1 - Math.pow(1 - k, 3))));
        ctx.strokeStyle = p.color;
        ctx.lineWidth = (p.w ?? 10) * a;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'glow': {
        ctx.globalCompositeOperation = 'lighter';
        const r = Math.max(0.1, p.size * (0.6 + 0.4 * k));
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        break;
      }
      case 'coin':
      case 'heart':
      case 'glyph': {
        ctx.rotate(p.rot * 0.3);
        const sp = this.sprite(p.glyph ?? '★', p.size);
        const d = sp.width / SPRITE_RES;
        ctx.drawImage(sp, -d / 2, -d / 2, d, d);
        break;
      }
      case 'line':
        break;
    }
    ctx.restore();
  }
}

export const particles = new ParticleSystem();
