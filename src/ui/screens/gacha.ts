import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, def, RARITY, type Rarity } from '../../engine';
import { PITY, PULL_COST, pickupClass, pull, RATES, type PullResult } from '../../meta/gacha';
import { progressPulls } from '../../meta/missions';
import { save } from '../../meta/save';
import { staticCard } from '../cardview';
import { bottomNav, btn, modal, topBar } from '../common';
import { h, todayKey, wait } from '../dom';
import { cutIn, flash, shake, toast } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';

const ORDER: Rarity[] = ['bronze', 'silver', 'gold', 'legend'];
const GLOW: Record<Rarity, string> = { bronze: '#7fd6ff', silver: '#e8f0ff', gold: '#ffd23f', legend: '#ff5fd2' };

type Pay = 'free' | 'ticket' | 'coin1' | 'coin10' | 'gem10' | 'free10';

export const gachaScreen: ScreenFn = (root, params) => {
  music.play('gacha');
  const tb = topBar({ back: () => void go('home'), title: 'ガチャ' });
  const pick = CLASSES[pickupClass()];
  const content = h('div.gacha-main');
  root.append(h('div.gacha-bg', { style: { '--c1': pick.color, '--c2': pick.color2 } }), tb.el, content, bottomNav('gacha'));

  const draw = () => {
    const d = save.data;
    const today = todayKey();
    const freeOk = d.freePull !== today;
    const pityLeft = PITY - d.pity;
    const banner = h(
      'div.gacha-banner',
      { style: { '--c1': pick.color, '--c2': pick.color2 } },
      h('div.gb-rays'),
      h('div.gb-art', pick.leaderArt),
      h('div.gb-text', h('div.gb-kicker', '本日のピックアップ'), h('div.gb-title', `${pick.emoji} ${pick.name}`), h('div.gb-sub', 'ピックアップクラスのカードが出やすい！')),
      h('div.gb-pity', h('span', `レジェンド確定まで あと${pityLeft}回`), h('div.gb-pity-bar', h('div.gb-pity-fill', { style: { width: `${(d.pity / PITY) * 100}%` } }))),
    );
    const rateBtn = h('button.rate-btn', { type: 'button', onclick: () => showRates() }, '排出率');
    const b = (label: string, sub: string, pay: Pay, ok: boolean, cls = '') =>
      h(
        `button.pull-btn${cls ? '.' + cls : ''}${ok ? '' : '.disabled'}`,
        { type: 'button', onclick: () => { audio.unlock(); if (!ok) { audio.play('error'); toast(pay === 'gem10' ? 'ジェムが足りない！' : pay === 'ticket' ? 'チケットがない！' : 'コインが足りない！', '💸'); return; } void doPull(pay); } },
        h('span.pb-label', label),
        h('span.pb-sub', sub),
      );
    const btns = h(
      'div.pull-btns',
      freeOk ? b('無料1回', '本日分', 'free', true, 'pb-free') : null,
      d.tickets > 0 ? b(`チケット1回`, `🎫 残り${d.tickets}`, 'ticket', true, 'pb-ticket') : null,
      b('1回', `🪙 ${PULL_COST.coin1}`, 'coin1', d.coins >= PULL_COST.coin1),
      b('10連', `🪙 ${PULL_COST.coin10}（ゴールド以上1枚確定）`, 'coin10', d.coins >= PULL_COST.coin10, 'pb-ten'),
      b('10連', `💎 ${PULL_COST.gem10}（ゴールド以上1枚確定）`, 'gem10', d.gems >= PULL_COST.gem10, 'pb-ten pb-gem'),
    );
    content.replaceChildren(banner, rateBtn, btns, h('div.gacha-note', 'ダブりは4枚目から「ドパ粉」に変換。ドパ粉でカードを生成できる。'));
  };
  draw();

  const doPull = async (pay: Pay) => {
    let n = 1;
    save.update((d) => {
      if (pay === 'free') d.freePull = todayKey();
      if (pay === 'ticket') d.tickets--;
      if (pay === 'coin1') d.coins -= PULL_COST.coin1;
      if (pay === 'coin10') d.coins -= PULL_COST.coin10;
      if (pay === 'gem10') d.gems -= PULL_COST.gem10;
      if (pay === 'free10') d.flags.firstTen = true;
    });
    if (pay === 'coin10' || pay === 'gem10' || pay === 'free10') n = 10;
    let results: PullResult[] = [];
    save.update((d) => {
      if (pay === 'free10') d.pity = PITY - 10; // first ten: legend guaranteed on the last pull
      results = pull(d, n);
      progressPulls(d, n);
    });
    await reveal(results);
    draw();
  };

  if (params.free10 && !save.data.flags.firstTen) setTimeout(() => void doPull('free10'), 300);
  return () => tb.dispose();
};

function showRates(): void {
  const rows = ORDER.slice()
    .reverse()
    .map((r) => h('div.rate-row', h('span', { style: { color: RARITY[r].color } }, RARITY[r].name), h('span', `${(RATES[r] * 100).toFixed(1)}%`)));
  modal([h('div.rate-rows', rows), h('p.rate-note', `10連の10枚目はゴールド以上確定。${PITY}回引くとレジェンド確定（天井）。各カード6%でプリズム（キラキラ版）になる。`)], { title: '排出率' });
}

// ---------------------------------------------------------------- reveal

async function reveal(results: PullResult[]): Promise<void> {
  const best = results.reduce((a, r) => (ORDER.indexOf(r.rarity) > ORDER.indexOf(a) ? r.rarity : a), 'bronze' as Rarity);
  // presentation tier, with a chance to start lower and "promote" (昇格演出)
  let shown: Rarity = best === 'legend' ? (Math.random() < 0.5 ? 'gold' : 'legend') : best === 'gold' ? (Math.random() < 0.35 ? 'silver' : 'gold') : best;
  const promote = shown !== best;
  return new Promise((res) => {
    const capsule = h(`div.capsule.cap-${shown}`, h('div.cap-top'), h('div.cap-band'), h('div.cap-bottom'), h('div.cap-shine'));
    const beams = h(`div.cap-beams.cap-${shown}`);
    const hint = h('div.cap-hint', 'タップで開ける！');
    const ov = h('div.gacha-reveal', h('div.gr-bg'), beams, h('div.cap-stage', capsule), hint);
    stage.overlay.append(ov);
    audio.play('reveal');
    let stageN = 0;
    const open = async () => {
      if (stageN !== 0) return;
      stageN = 1;
      hint.remove();
      for (let i = 0; i < 3; i++) {
        capsule.classList.remove('shake');
        void capsule.offsetWidth;
        capsule.classList.add('shake');
        audio.play('gachaTick', { pitch: 0.8 + i * 0.2 });
        shake(4 + i * 3, 160);
        await wait(320);
      }
      if (promote) {
        flash('#fff', 0.8, 200);
        audio.play('super');
        capsule.classList.add('promote');
        particles.speedLines(1.1);
        await wait(700);
        capsule.classList.remove(`cap-${shown}`);
        beams.classList.remove(`cap-${shown}`);
        shown = best;
        capsule.classList.add(`cap-${shown}`);
        beams.classList.add(`cap-${shown}`);
        const tag = h('div.promote-tag', '昇格！！');
        ov.append(tag);
        shake(20, 400);
        particles.burst(stage.w / 2, stage.h / 2, { n: 80, colors: [GLOW[best], '#fff', '#ffe14d'], speed: 16, type: 'star', size: 9 });
        await wait(700);
        tag.remove();
      }
      capsule.classList.add('open');
      beams.classList.add('on');
      audio.play(best === 'legend' ? 'gachaSSR' : best === 'gold' ? 'gachaSR' : 'gachaR');
      flash(GLOW[best], best === 'legend' ? 0.8 : 0.5, 400);
      particles.burst(stage.w / 2, stage.h / 2, { n: best === 'legend' ? 120 : 60, colors: [GLOW[best], '#fff'], speed: 14, type: 'star', size: 8 });
      if (best === 'legend') particles.confetti(100);
      await wait(650);
      showCards();
    };
    const showCards = () => {
      stageN = 2;
      ov.querySelector('.cap-stage')?.remove();
      const grid = h(`div.gr-grid${results.length === 1 ? '.single' : ''}`);
      let flipped = 0;
      const cells = results.map((r) => {
        const front = staticCard(r.id, 'collection', r.prism);
        const cell = h(
          `div.gr-cell.r-${r.rarity}${r.prism ? '.prism' : ''}`,
          { style: { '--glow': GLOW[r.rarity] } },
          h('div.gr-aura'),
          h('div.gr-flip', h('div.gr-back', h('span', 'D')), h('div.gr-front', front)),
          r.isNew ? h('div.gr-new', 'NEW!') : null,
          r.dust ? h('div.gr-dust', `✨+${r.dust}`) : null,
          r.prism ? h('div.gr-prism', 'PRISM') : null,
        );
        let done = false;
        const flip = async () => {
          if (done) return;
          done = true;
          cell.classList.add('flipped');
          audio.play('flip');
          const rr = r.rarity;
          if (rr === 'gold') {
            audio.play('gachaSR');
            particles.burst(stage.w / 2, stage.h / 2, { n: 20, colors: ['#ffd23f', '#fff'], speed: 6, type: 'star' });
          }
          if (rr === 'legend') {
            const d = def(r.id);
            audio.play('gachaSSR');
            await cutIn({ art: d.art, art2: d.art2, name: d.name, title: r.prism ? 'PRISM LEGEND' : 'LEGEND', color: '#ff5fd2', color2: '#ffe14d', kind: 'legend', line: d.flavor });
          } else if (r.prism) {
            audio.play('gem');
            flash('#fff', 0.3, 200);
          }
          flipped++;
          if (flipped === results.length) finish();
        };
        cell.addEventListener('click', () => void flip());
        (cell as HTMLElement & { flip?: () => Promise<void> }).flip = flip;
        return cell;
      });
      grid.append(...cells);
      const all = btn('まとめてめくる', async () => {
        all.remove();
        for (const c of cells) {
          await (c as HTMLElement & { flip?: () => Promise<void> }).flip?.();
          await wait(results.length > 1 ? 120 : 0);
        }
      }, 'btn-hot');
      const footer = h('div.gr-footer', all);
      ov.append(grid, footer);
      cells.forEach((c, i) => setTimeout(() => {
        c.classList.add('in');
        audio.play('draw', { pitch: 1 + i * 0.04, vol: 0.6 });
      }, i * 70));
      const finish = () => {
        footer.replaceChildren(
          h('div.gr-summary', summary(results)),
          btn('OK', () => {
            ov.classList.add('out');
            setTimeout(() => ov.remove(), 250);
            res();
          }, 'btn-hot btn-big'),
        );
      };
    };
    ov.addEventListener('click', () => void open());
    setTimeout(() => void open(), results.length > 1 ? 1800 : 1200);
  });
}

function summary(results: PullResult[]): string {
  const c = (r: Rarity) => results.filter((x) => x.rarity === r).length;
  const parts = [`L×${c('legend')}`, `G×${c('gold')}`, `S×${c('silver')}`, `B×${c('bronze')}`];
  const nw = results.filter((r) => r.isNew).length;
  const dust = results.reduce((a, r) => a + r.dust, 0);
  return `${parts.join(' ')}　NEW ${nw}枚${dust ? `　✨+${dust}` : ''}`;
}
