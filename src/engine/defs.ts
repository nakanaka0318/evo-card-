import type { CardDef } from './types';

const REGISTRY = new Map<string, CardDef>();

export function register(defs: CardDef[]): void {
  for (const d of defs) {
    if (REGISTRY.has(d.id)) throw new Error(`duplicate card id ${d.id}`);
    REGISTRY.set(d.id, d);
  }
}

export function def(id: string): CardDef {
  const d = REGISTRY.get(id);
  if (!d) throw new Error(`unknown card ${id}`);
  return d;
}

export function hasDef(id: string): boolean {
  return REGISTRY.has(id);
}

export function allDefs(): CardDef[] {
  return [...REGISTRY.values()];
}

export function collectible(): CardDef[] {
  return allDefs().filter((d) => !d.token);
}
