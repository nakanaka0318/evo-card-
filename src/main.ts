import './styles/base.css';
import './styles/card.css';
import './styles/battle.css';
import './styles/fx.css';
import './styles/screens.css';
import './engine/cards';
import { audio } from './audio/audio';
import { music } from './audio/music';
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

function boot(): void {
  const app = document.getElementById('app') ?? document.body;
  stage.mount(app);
  save.load();
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
