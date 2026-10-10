import { register } from '../defs';
import { CRASH } from './crash';
import { DECO } from './deco';
import { GACHA } from './gacha';
import { GADGET } from './gadget';
import { GAMER } from './gamer';
import { HARMONY } from './harmony';
import { JEWEL } from './jewel';
import { MINIMAL } from './minimal';
import { NEUTRAL } from './neutral';
import { NOVEL } from './novel';
import { PUPPET } from './puppet';
import { RANGER } from './ranger';
import { SHRINE } from './shrine';
import { SPICY } from './spicy';
import { STREAM } from './stream';
import { SWEETS } from './sweets';
import { SWIPE } from './swipe';
import { TOKENS } from './tokens';
import { TREASURE } from './treasure';
import { WITCH } from './witch';

let done = false;

export function registerAllCards(): void {
  if (done) return;
  done = true;
  register([...NEUTRAL, ...GACHA, ...STREAM, ...SWEETS, ...SWIPE, ...GAMER, ...GADGET, ...TREASURE, ...HARMONY, ...CRASH, ...RANGER, ...WITCH, ...MINIMAL, ...JEWEL, ...NOVEL, ...DECO, ...SPICY, ...SHRINE, ...PUPPET, ...TOKENS]);
}

registerAllCards();
