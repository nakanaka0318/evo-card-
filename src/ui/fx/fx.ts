import { audio } from '../../audio/audio';
import { h, wait } from '../dom';
import { stage } from '../stage';
import { particles } from './particles';

export const fxConfig = {
  intensity: 2,
  flashReduce: false,
  speed: 1,
  vibrate: true,
};

/** scale a duration by the game speed setting */
export const T = (ms: number) => ms / fxConfig.speed;

let shakeRaf = 0;
let shakePower = 0;
let shakeUntil = 0;

export function shake(power: number, ms = 260): void {
  if (fxConfig.intensity === 0) power *= 0.25;
  else if (fxConfig.intensity === 1) power *= 0.6;
  shakePower = Math.max(shakePower, power);
  shakeUntil = Math.max(shakeUntil, performance.now() + ms);
  if (fxConfig.vibrate && power >= 8) audio.vibrate(Math.min(80, power * 4));
  if (shakeRaf) return;
  const el = stage.screen;
  const step = () => {
    const now = performance.now();
    if (now >= shakeUntil) {
      el.style.transform = '';
      shakeRaf = 0;
      shakePower = 0;
      return;
    }
    const k = (shakeUntil - now) / ms;
    const p = shakePower * Math.min(1, k * 1.5);
    el.style.transform = `translate(${(Math.random() - 0.5) * p}px, ${(Math.random() - 0.5) * p}px) rotate(${(Math.random() - 0.5) * p * 0.03}deg)`;
    shakeRaf = requestAnimationFrame(step);
  };
  shakeRaf = requestAnimationFrame(step);
}

export function flash(color = '#fff', alpha = 0.7, ms = 220): void {
  if (fxConfig.flashReduce) {
    alpha *= 0.3;
    ms *= 1.6;
  }
  if (fxConfig.intensity === 0) alpha *= 0.4;
  const el = h('div.fx-flash', { style: { background: color, opacity: String(alpha), transition: `opacity ${ms}ms ease-out` } });
  stage.overlay.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = '0')));
  setTimeout(() => el.remove(), ms + 60);
}

export function vignette(color = 'rgba(255,30,60,0.75)', ms = 600): void {
  const el = h('div.fx-vignette', { style: { '--vc': color, animationDuration: `${ms}ms` } });
  stage.overlay.append(el);
  setTimeout(() => el.remove(), ms + 50);
}

export interface PopOpts {
  cls?: string;
  size?: number;
  dy?: number;
  ms?: number;
  delay?: number;
}

/** floating telop text (damage numbers etc.) */
export function popText(x: number, y: number, text: string, o: PopOpts = {}): void {
  const el = h(`div.fx-pop.${o.cls ?? 'pop-dmg'}`, { style: { left: `${x}px`, top: `${y}px`, fontSize: `${o.size ?? 44}px`, '--dy': `${o.dy ?? -70}px`, animationDuration: `${o.ms ?? 900}ms`, animationDelay: `${o.delay ?? 0}ms` } }, text);
  stage.overlay.append(el);
  const w = el.offsetWidth;
  const half = w / 2 + 10;
  if (x - half < 0 || x + half > stage.w) el.style.left = `${Math.max(half, Math.min(stage.w - half, x))}px`;
  setTimeout(() => el.remove(), (o.ms ?? 900) + (o.delay ?? 0) + 50);
}

/** a big horizontal telop banner. Resolves when it has left. */
export async function banner(text: string, opts: { sub?: string; cls?: string; ms?: number; sfx?: Parameters<typeof audio.play>[0] } = {}): Promise<void> {
  const ms = opts.ms ?? 1000;
  const el = h(
    `div.fx-banner.${opts.cls ?? 'b-player'}`,
    { style: { animationDuration: `${T(ms)}ms` } },
    h('div.fx-banner-band'),
    h('div.fx-banner-text', text),
    opts.sub ? h('div.fx-banner-sub', opts.sub) : null,
  );
  stage.overlay.append(el);
  if (opts.sfx) audio.play(opts.sfx);
  await wait(T(ms));
  el.remove();
}

/** stamp-style text that slams onto the screen */
export async function slam(text: string, cls = 'slam-gold', ms = 900, sub?: string): Promise<void> {
  const el = h(`div.fx-slam.${cls}`, { style: { animationDuration: `${T(ms)}ms` } }, h('div.fx-slam-text', text), sub ? h('div.fx-slam-sub', sub) : null);
  stage.overlay.append(el);
  shake(14, 300);
  await wait(T(ms));
  el.remove();
}

export interface CutInOpts {
  art: string;
  art2?: string;
  name: string;
  title: string;
  color: string;
  color2: string;
  kind: 'evolve' | 'super' | 'fever' | 'ssr' | 'legend' | 'buzz' | 'levelup';
  enemy?: boolean;
  line?: string;
}

/** full screen cut-in. Tap to skip. */
export function cutIn(o: CutInOpts): Promise<void> {
  const dur = o.kind === 'super' ? 1700 : o.kind === 'fever' ? 1500 : o.kind === 'legend' ? 2000 : 1250;
  const ms = fxConfig.intensity === 0 ? dur * 0.6 : dur;
  return new Promise((res) => {
    const el = h(
      `div.fx-cutin.ci-${o.kind}${o.enemy ? '.ci-enemy' : ''}`,
      { style: { '--c1': o.color, '--c2': o.color2, animationDuration: `${T(ms)}ms` } },
      h('div.ci-bg'),
      h('div.ci-rays'),
      h('div.ci-stripe'),
      h('div.ci-art', h('span.ci-glyph', o.art), o.art2 ? h('span.ci-glyph2', o.art2) : null),
      h('div.ci-title', o.title),
      h('div.ci-name', o.name),
      o.line ? h('div.ci-line', `「${o.line}」`) : null,
    );
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add('ci-out');
      setTimeout(() => {
        el.remove();
        res();
      }, 160);
    };
    el.addEventListener('pointerdown', finish);
    stage.overlay.append(el);
    particles.speedLines(T(ms) / 1000, o.kind === 'super' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)');
    setTimeout(() => {
      flash(o.kind === 'super' ? '#fff' : o.color, 0.55, 260);
      shake(o.kind === 'super' ? 22 : 12, 380);
      particles.burst(stage.w / 2, stage.h / 2, { n: 70, colors: ['#fff', o.color, o.color2], speed: 16, life: 1, size: 7 });
      particles.ring(stage.w / 2, stage.h / 2, o.color, Math.max(stage.w, stage.h) * 0.7, 0.7, 26);
    }, T(ms * 0.42));
    setTimeout(finish, T(ms));
  });
}

let toastY = 0;
export function toast(text: string, icon = '✨', cls = ''): void {
  const el = h(`div.fx-toast${cls ? '.' + cls : ''}`, h('span.toast-icon', icon), h('span.toast-text', text));
  el.style.setProperty('--ty', `${toastY}px`);
  toastY += 64;
  stage.toasts.append(el);
  setTimeout(() => {
    el.classList.add('out');
    toastY = Math.max(0, toastY - 64);
  }, 2400);
  setTimeout(() => el.remove(), 2800);
}

/** notification spam (バズ演出) */
export function notifySpam(lines: string[], ms = 1400): void {
  const n = fxConfig.intensity === 0 ? 2 : lines.length;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const el = h('div.fx-notify', { style: { top: `${80 + ((i * 74) % (stage.h * 0.6))}px` } }, h('span.nt-icon', '❤️'), h('span.nt-text', lines[i]));
      stage.overlay.append(el);
      audio.play('notify', { pitch: 1 + i * 0.04 });
      setTimeout(() => el.remove(), ms);
    }, i * 90);
  }
}
