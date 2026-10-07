import type { CardDef } from '../types';

type Base = Omit<CardDef, 'type'>;

export const follower = (d: Base): CardDef => ({ type: 'follower', ...d });
export const spell = (d: Base): CardDef => ({ type: 'spell', ...d });
export const amulet = (d: Base): CardDef => ({ type: 'amulet', ...d });
