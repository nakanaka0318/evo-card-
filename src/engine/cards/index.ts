import { register } from '../defs';
import { GACHA } from './gacha';
import { GADGET } from './gadget';
import { GAMER } from './gamer';
import { HARMONY } from './harmony';
import { NEUTRAL } from './neutral';
import { STREAM } from './stream';
import { SWEETS } from './sweets';
import { SWIPE } from './swipe';
import { TOKENS } from './tokens';
import { TREASURE } from './treasure';

let done = false;

export function registerAllCards(): void {
  if (done) return;
  done = true;
  register([...NEUTRAL, ...GACHA, ...STREAM, ...SWEETS, ...SWIPE, ...GAMER, ...GADGET, ...TREASURE, ...HARMONY, ...TOKENS]);
}

registerAllCards();
