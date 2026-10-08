import './styles/base.css';
import './styles/card.css';
import './styles/battle.css';
import './styles/fx.css';
import './styles/screens.css';
import './styles/legends.css';
import './engine/cards';
import { audio } from './audio/audio';
import { music } from './audio/music';
import { collectible, PLAYABLE_CLASSES } from './engine';
import { grantStarter, starterDeck } from './meta/economy';
import { save } from './meta/save';
import { battleScreen } from './ui/screens/battleScreen';
import { decksScreen } from './ui/screens/decks';
import { gachaScreen } from './ui/screens/gacha';
import { homeScreen } from './ui/screens/home';
import { missionsScreen } from './ui/screens/missions';
import { onboardScreen } from './ui/screens/onboard';
import { resultsScreen } from './ui/screens/results';
import { rulesScreen } from './ui/screens/rules';
import { applySettings, settingsScreen } from './ui/screens/settings';
import { freeScreen, storyScreen } from './ui/screens/story';
import { titleScreen } from './ui/screens/title';
import { currentScreen, go, registerScreen } from './ui/router';
import { stage } from './ui/stage';

const NEW_CARDS_2 = ['n_bubble', 'n_cushion', 'n_mirror', 'g_ball', 'g_miko', 'g_scratch', 's_kids', 's_mod', 's_short', 'w_berry', 'w_tea', 'w_oven', 'x_tap', 'x_skate', 'x_reels', 'm_villager', 'm_guard', 'm_save'];

function boot(): void {
  const app = document.getElementById('app') ?? document.body;
  stage.mount(app);
  save.load();
  if (save.data.flags.onboarded && (!save.data.flags.starter || !save.data.decks.length)) {
    save.update((d) => {
      if (!d.flags.starter) grantStarter(d);
      if (!d.decks.length) d.decks = PLAYABLE_CLASSES.map((c) => starterDeck(c, d));
      d.flags.starter = true;
      if (!d.decks.some((x) => x.id === d.activeDeck)) d.activeDeck = d.decks[0].id;
    });
  }
  // the 2nd card wave: give existing players the same starter share (bronze ×3, silver ×2)
  if (save.data.flags.starter && !save.data.flags.cards2) {
    save.update((d) => {
      for (const c of collectible()) {
        if (!NEW_CARDS_2.includes(c.id)) continue;
        const want = c.rarity === 'bronze' ? 3 : c.rarity === 'silver' ? 2 : 0;
        if ((d.collection[c.id] ?? 0) < want) d.collection[c.id] = want;
      }
      d.flags.cards2 = true;
    });
  }
  // the 6th class (ガジェッター): starter share of its cards + a starter deck
  if (save.data.flags.starter && !save.data.flags.gadget) {
    save.update((d) => {
      for (const c of collectible()) {
        if (c.cls !== 'gadget') continue;
        const want = c.rarity === 'bronze' ? 3 : c.rarity === 'silver' ? 2 : 0;
        if ((d.collection[c.id] ?? 0) < want) d.collection[c.id] = want;
      }
      if (!d.decks.some((x) => x.cls === 'gadget')) d.decks.push(starterDeck('gadget', d));
      d.flags.gadget = true;
    });
  }
  applySettings();
  registerScreen('title', async () => titleScreen);
  registerScreen('onboard', async () => onboardScreen);
  registerScreen('home', async () => homeScreen);
  registerScreen('battle', async () => battleScreen);
  registerScreen('results', async () => resultsScreen);
  registerScreen('gacha', async () => gachaScreen);
  registerScreen('decks', async () => decksScreen);
  registerScreen('missions', async () => missionsScreen);
  registerScreen('story', async () => storyScreen);
  registerScreen('free', async () => freeScreen);
  registerScreen('settings', async () => settingsScreen);
  registerScreen('rules', async () => rulesScreen);
  window.addEventListener(
    'pointerdown',
    () => {
      audio.unlock();
      music.kick();
    },
    { capture: true },
  );
  document.addEventListener('visibilitychange', () => {
    if (!audio.ctx) return;
    if (document.hidden) void audio.ctx.suspend();
    else void audio.ctx.resume();
  });
  void go('title');
  void save.attachCloud(() => {
    applySettings();
    if (currentScreen() === 'title' || currentScreen() === 'home') void go(currentScreen());
  });
}

boot();
