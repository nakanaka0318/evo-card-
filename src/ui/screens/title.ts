import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { save } from '../../meta/save';
import { staticCard } from '../cardview';
import { h } from '../dom';
import { flash } from '../fx/fx';
import { particles } from '../fx/particles';
import { measureFps, perfConfig, PERF_INFO } from '../perf';
import { go, type ScreenFn } from '../router';
import { quickSettingsModal } from './settings';
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
  const notice = h('div.title-notice', '※ 強い光の点滅や画面の揺れがあります。右上の⚙「かんたん設定」で弱められます。カクつく時は動作モードを「サクサク」に。');
  const gearLabel = h('span.tg-mode');
  const syncGear = () => {
    const i = PERF_INFO[save.data.settings.perf];
    gearLabel.textContent = `${i.emoji}${i.name}`;
  };
  syncGear();
  const gear = h(
    'button.title-gear',
    {
      type: 'button',
      'aria-label': 'かんたん設定',
      onpointerdown: (e: Event) => e.stopPropagation(),
      onclick: (e: Event) => {
        e.stopPropagation();
        audio.unlock();
        audio.play('tap');
        quickSettingsModal();
        const obs = new MutationObserver(() => {
          syncGear();
          if (!stage.overlay.querySelector('.qs-modal')) obs.disconnect();
        });
        obs.observe(stage.overlay, { childList: true, subtree: true });
      },
    },
    h('span.tg-icon', '⚙'),
    gearLabel,
  );
  const ver = h('div.title-ver', `${Object.keys(save.data.collection).length ? 'おかえり、' + save.data.name : 'はじめまして'}`);
  root.append(h('div.title-bg', h('div.title-rays'), h('div.title-orbit', cards)), logo, start, ver, notice, gear);
  // sample after the entrance animation settles
  setTimeout(() => void measureFps(1500).then((f) => (perfConfig.sampleFps = Math.max(perfConfig.sampleFps, f))), 600);
  let gone = false;
  const begin = () => {
    if (gone || stage.overlay.querySelector('.modal')) return;
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
    if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) begin();
  };
  window.addEventListener('keydown', key);
  const spark = window.setInterval(() => {
    if (!perfConfig.ambient) return;
    particles.burst(Math.random() * stage.w, Math.random() * stage.h, { n: 3, colors: ['#ffe14d', '#ff2e88', '#38d6ff'], speed: 2, type: 'star', size: 5, gravity: -0.02 });
  }, 260);
  return () => {
    window.removeEventListener('keydown', key);
    clearInterval(spark);
  };
};
