import { register } from '../defs';
import { GACHA } from './gacha';
import { GAMER } from './gamer';
import { NEUTRAL } from './neutral';
import { STREAM } from './stream';
import { SWEETS } from './sweets';
import { SWIPE } from './swipe';
import { TOKENS } from './tokens';

let done = false;

export function registerAllCards(): void {
  if (done) return;
  done = true;
  register([...NEUTRAL, ...GACHA, ...STREAM, ...SWEETS, ...SWIPE, ...GAMER, ...TOKENS]);
}

registerAllCards();
