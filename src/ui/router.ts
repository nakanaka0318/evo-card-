import { stage } from './stage';
import { clear } from './dom';

export type Cleanup = (() => void) | void;
export type ScreenFn = (root: HTMLElement, params: Record<string, unknown>) => Cleanup;

const screens = new Map<string, () => Promise<ScreenFn>>();
let cleanup: Cleanup;
let current = '';
let token = 0;

export function registerScreen(name: string, loader: () => Promise<ScreenFn>): void {
  screens.set(name, loader);
}

export function currentScreen(): string {
  return current;
}

export async function go(name: string, params: Record<string, unknown> = {}): Promise<void> {
  const loader = screens.get(name);
  if (!loader) throw new Error(`no screen ${name}`);
  const my = ++token;
  const fn = await loader();
  if (my !== token) return;
  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;
  clear(stage.overlay);
  stage.setMode(name === 'battle' ? 'battle' : 'menu');
  const root = stage.screen;
  clear(root);
  root.className = `layer layer-screen scr-${name}`;
  current = name;
  const wrap = document.createElement('div');
  wrap.className = `screen screen-${name} screen-enter`;
  root.append(wrap);
  cleanup = fn(wrap, params);
  requestAnimationFrame(() => wrap.classList.remove('screen-enter'));
}
