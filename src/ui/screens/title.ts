import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { def } from '../../engine';
import { save } from '../../meta/save';
import { staticCard } from '../cardview';
import { h } from '../dom';
import { flash } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';

const SHOWCASE = ['g_roule', 's_buzzrin', 'w_amami', 'x_shun', 'm_level', 'n_king', 'n_unicorn'];

export const titleScreen: ScreenFn = (root) => {
  const cards = SHOWCASE.map((id, i) => {
    const el = staticCard(id, 'collection');
    return h('div.title-card', { style: { '--i': String(i), '--n': String(SHOWCASE.length) } }, el);
  });
  const logo = h(
    'div.title-logo',
    h('div.logo-kicker', '超進化ドーパミンカードバトル'),
    h('div.logo-main', h('span.l1', 'ドパ'), h('span.l2', 'バース')),
    h('div.logo-en', 'DOPAVERSE'),
  );
  const start = h('div.title-start', 'TAP TO START');
  const notice = h('div.title-notice', '※ 強い光の点滅や画面の揺れがあります。設定の「フラッシュ軽減」「ドパ度」で弱められます。');
  const ver = h('div.title-ver', `${Object.keys(save.data.collection).length ? 'おかえり、' + save.data.name : 'はじめまして'}`);
  root.append(h('div.title-bg', h('div.title-rays'), h('div.title-orbit', cards)), logo, start, ver, notice);
  let gone = false;
  const begin = () => {
    if (gone) return;
    gone = true;
    audio.unlock();
    music.play('home');
    audio.play('unlock');
    flash('#fff', 0.8, 400);
    particles.burst(stage.w / 2, stage.h / 2, { n: 90, colors: ['#ff2e88', '#ffe14d', '#38d6ff', '#fff'], speed: 16, type: 'star', size: 8 });
    setTimeout(() => void go(save.data.flags.onboarded ? 'home' : 'onboard'), 380);
  };
  root.addEventListener('pointerdown', begin);
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') begin();
  };
  window.addEventListener('keydown', key);
  const spark = window.setInterval(() => {
    particles.burst(Math.random() * stage.w, Math.random() * stage.h, { n: 3, colors: ['#ffe14d', '#ff2e88', '#38d6ff'], speed: 2, type: 'star', size: 5, gravity: -0.02 });
  }, 260);
  void def;
  return () => {
    window.removeEventListener('keydown', key);
    clearInterval(spark);
  };
};
