import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, def, RARITY, type Rarity } from '../../engine';
import { FIRST_PACKS, openPacks, PACK_COST, PACK_SIZE, packsLeftToPity, pickupClass, PITY, PRISM_RATE, RATES, type PullResult } from '../../meta/gacha';
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

type Pay = 'free' | 'ticket' | 'coin1' | 'coin10' | 'gem10' | 'gift';

export const gachaScreen: ScreenFn = (root, params) => {
  music.play('gacha');
  const tb = topBar({ back: () => void go('home'), title: 'パック' });
  const pick = CLASSES[pickupClass()];
  const content = h('div.gacha-main');
  root.append(h('div.gacha-bg', { style: { '--c1': pick.color, '--c2': pick.color2 } }), tb.el, content, bottomNav('gacha'));

  const draw = () => {
    const d = save.data;
    const today = todayKey();
    const freeOk = d.freePull !== today;
    const left = packsLeftToPity(d);
    const banner = h(
      'div.gacha-banner',
      { style: { '--c1': pick.color, '--c2': pick.color2 } },
      h('div.gb-rays'),
      packArt(pick.emoji, 'gb-pack'),
      h(
        'div.gb-text',
        h('div.gb-kicker', '本日のピックアップ'),
        h('div.gb-title', `${pick.emoji} ${pick.name}`),
        h('div.gb-sub', `1パック${PACK_SIZE}枚入り！ 8枚目はシルバー以上確定`),
        h('div.gb-sub', 'ピックアップクラスのカードが出やすい！'),
      ),
      h('div.gb-pity', h('span', `レジェンド確定まで あと${left}パック`), h('div.gb-pity-bar', h('div.gb-pity-fill', { style: { width: `${((PITY - left) / PITY) * 100}%` } }))),
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
      freeOk ? b('無料 1パック', '本日分', 'free', true, 'pb-free') : null,
      d.tickets > 0 ? b('チケット 1パック', `🎫 残り${d.tickets}`, 'ticket', true, 'pb-ticket') : null,
      b('1パック', `🪙 ${PACK_COST.coin1}（${PACK_SIZE}枚）`, 'coin1', d.coins >= PACK_COST.coin1),
      b('10パック', `🪙 ${PACK_COST.coin10}（${PACK_SIZE * 10}枚・ゴールド以上確定）`, 'coin10', d.coins >= PACK_COST.coin10, 'pb-ten'),
      b('10パック', `💎 ${PACK_COST.gem10}（${PACK_SIZE * 10}枚・ゴールド以上確定）`, 'gem10', d.gems >= PACK_COST.gem10, 'pb-ten pb-gem'),
    );
    content.replaceChildren(banner, rateBtn, btns, h('div.gacha-note', 'ダブりは4枚目から「ドパ粉」に変換。ドパ粉でカードを生成できる。'));
  };
  draw();

  const doPull = async (pay: Pay) => {
    save.update((d) => {
      if (pay === 'free') d.freePull = todayKey();
      if (pay === 'ticket') d.tickets--;
      if (pay === 'coin1') d.coins -= PACK_COST.coin1;
      if (pay === 'coin10') d.coins -= PACK_COST.coin10;
      if (pay === 'gem10') d.gems -= PACK_COST.gem10;
      if (pay === 'gift') d.flags.firstTen = true;
    });
    const n = pay === 'coin10' || pay === 'gem10' ? 10 : pay === 'gift' ? FIRST_PACKS : 1;
    let results: PullResult[][] = [];
    save.update((d) => {
      // first-time gift: the last gift pack holds a legend
      if (pay === 'gift') d.pity = Math.max(d.pity, PITY - FIRST_PACKS);
      results = openPacks(d, n, Math.random, n >= 10);
      progressPulls(d, n);
    });
    await revealPacks(results);
    draw();
  };

  if (params.free10 && !save.data.flags.firstTen) setTimeout(() => void doPull('gift'), 300);
  return () => tb.dispose();
};

function packArt(emoji: string, cls = ''): HTMLElement {
  return h(
    `div.pack${cls ? '.' + cls : ''}`,
    h('div.pack-tear'),
    h('div.pack-body', h('div.pack-foil'), h('div.pack-logo', 'DOPA', h('small', 'CARD PACK')), h('div.pack-emoji', emoji), h('div.pack-count', `${PACK_SIZE}枚入り`)),
  );
}

function showRates(): void {
  const rows = ORDER.slice()
    .reverse()
    .map((r) => h('div.rate-row', h('span', { style: { color: RARITY[r].color } }, RARITY[r].name), h('span', `${(RATES[r] * 100).toFixed(1)}%`)));
  modal(
    [
      h('div.rate-rows', rows),
      h(
        'p.rate-note',
        `1パック${PACK_SIZE}枚入り（1枚ごとに上の確率）。8枚目はシルバー以上確定。10パックまとめて開けると最後のパックの8枚目はゴールド以上確定。${PITY}パック以内にレジェンド確定（天井）。各カード${Math.round(PRISM_RATE * 100)}%でプリズム（キラキラ版）になる。`,
      ),
    ],
    { title: '排出率' },
  );
}

// ---------------------------------------------------------------- reveal

const rank = (r: Rarity) => ORDER.indexOf(r);
const bestOf = (cards: PullResult[]): Rarity => cards.reduce((a, r) => (rank(r.rarity) > rank(a) ? r.rarity : a), 'bronze' as Rarity);

type Step = 'next' | 'skip' | 'done';

/** open each pack in turn (tear → 8 cards → flip), then a summary for multi-pack buys */
async function revealPacks(packs: PullResult[][]): Promise<void> {
  const pick = CLASSES[pickupClass()];
  const beams = h('div.cap-beams');
  const stageEl = h('div.pk-stage');
  const ov = h('div.gacha-reveal', h('div.gr-bg'), beams, stageEl);
  stage.overlay.append(ov);
  audio.play('reveal');
  for (let i = 0; i < packs.length; i++) {
    const step = await openOne(stageEl, beams, packs[i], i, packs.length, pick.emoji);
    if (step === 'skip') break;
  }
  if (packs.length > 1) await showSummary(stageEl, packs);
  ov.classList.add('out');
  await wait(250);
  ov.remove();
}

function openOne(host: HTMLElement, beams: HTMLElement, cards: PullResult[], idx: number, total: number, emoji: string): Promise<Step> {
  const best = bestOf(cards);
  // presentation tier, with a chance to start lower and "promote" (昇格演出)
  let shown: Rarity = best === 'legend' ? (Math.random() < 0.5 ? 'gold' : 'legend') : best === 'gold' ? (Math.random() < 0.35 ? 'silver' : 'gold') : best;
  const promote = shown !== best;
  return new Promise((res) => {
    beams.className = `cap-beams cap-${shown}`;
    const pack = packArt(emoji, `pk-${shown}`);
    const counter = total > 1 ? h('div.pk-counter', `パック ${idx + 1} / ${total}`) : null;
    const hint = h('div.cap-hint', 'タップで開封！');
    const wrap = h('div.pk-open', counter, h('div.pk-holder', pack), hint);
    host.replaceChildren(wrap);
    requestAnimationFrame(() => pack.classList.add('in'));
    let opened = false;
    const open = async () => {
      if (opened) return;
      opened = true;
      hint.remove();
      for (let i = 0; i < 2; i++) {
        pack.classList.remove('shake');
        void pack.offsetWidth;
        pack.classList.add('shake');
        audio.play('gachaTick', { pitch: 0.9 + i * 0.25 });
        shake(4 + i * 4, 160);
        await wait(300);
      }
      if (promote) {
        flash('#fff', 0.8, 200);
        audio.play('super');
        pack.classList.add('promote');
        particles.speedLines(1.1);
        await wait(700);
        pack.classList.remove(`pk-${shown}`);
        shown = best;
        pack.classList.add(`pk-${shown}`);
        beams.className = `cap-beams cap-${shown}`;
        const tag = h('div.promote-tag', '昇格！！');
        wrap.append(tag);
        shake(20, 400);
        particles.burst(stage.w / 2, stage.h / 2, { n: 80, colors: [GLOW[best], '#fff', '#ffe14d'], speed: 16, type: 'star', size: 9 });
        await wait(700);
        tag.remove();
      }
      pack.classList.add('torn');
      beams.classList.add('on');
      audio.play('shatter');
      audio.play(best === 'legend' ? 'gachaSSR' : best === 'gold' ? 'gachaSR' : 'gachaR');
      flash(GLOW[best], best === 'legend' ? 0.8 : 0.45, 400);
      particles.burst(stage.w / 2, stage.h * 0.4, { n: best === 'legend' ? 110 : 50, colors: [GLOW[best], '#fff'], speed: 14, type: 'star', size: 8 });
      if (best === 'legend') particles.confetti(90);
      await wait(520);
      res(await spread(host, cards, idx, total));
    };
    wrap.addEventListener('click', () => void open());
    // later packs of a bulk buy open on their own; the first one waits for a tap (or a moment)
    setTimeout(() => void open(), idx === 0 ? 1500 : 700);
  });
}

function spread(host: HTMLElement, cards: PullResult[], idx: number, total: number): Promise<Step> {
  return new Promise((res) => {
    const grid = h('div.gr-grid.pack-grid');
    let flipped = 0;
    let finished = false;
    const flips: (() => Promise<void>)[] = [];
    const cells = cards.map((r) => {
      const cell = h(
        `div.gr-cell.r-${r.rarity}${r.prism ? '.prism' : ''}`,
        { style: { '--glow': GLOW[r.rarity] } },
        h('div.gr-aura'),
        h('div.gr-flip', h('div.gr-back', h('span', 'D')), h('div.gr-front', staticCard(r.id, 'collection', r.prism))),
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
        if (r.rarity === 'gold') {
          audio.play('gachaSR');
          particles.burst(stage.w / 2, stage.h / 2, { n: 18, colors: ['#ffd23f', '#fff'], speed: 6, type: 'star' });
        }
        if (r.rarity === 'legend') {
          const d = def(r.id);
          audio.play('gachaSSR');
          await cutIn({ art: d.art, art2: d.art2, name: d.name, title: r.prism ? 'PRISM LEGEND' : 'LEGEND', color: '#ff5fd2', color2: '#ffe14d', kind: 'legend', line: d.flavor });
        } else if (r.prism) {
          audio.play('gem');
          flash('#fff', 0.3, 200);
        }
        flipped++;
        if (flipped === cards.length) finish();
      };
      flips.push(flip);
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        void flip();
      });
      return cell;
    });
    grid.append(...cells);
    const flipAll = async () => {
      for (const f of flips) {
        await f();
        await wait(90);
      }
    };
    const footer = h('div.gr-footer', btn('まとめてめくる', () => void flipAll(), 'btn-hot'));
    const counter = total > 1 ? h('div.pk-counter', `パック ${idx + 1} / ${total}`) : null;
    host.replaceChildren(h('div.pk-spread', counter, grid, footer));
    cells.forEach((c, i) =>
      setTimeout(() => {
        c.classList.add('in');
        audio.play('draw', { pitch: 1 + i * 0.05, vol: 0.6 });
      }, i * 70),
    );
    const finish = () => {
      if (finished) return;
      finished = true;
      const last = idx === total - 1;
      const btns: HTMLElement[] = [];
      if (!last) {
        btns.push(btn(`次のパック ▶（${idx + 2}/${total}）`, () => res('next'), 'btn-hot btn-big'));
        btns.push(btn('のこりを全部ひらく', () => res('skip'), 'btn-small'));
      } else btns.push(btn(total > 1 ? '結果を見る' : 'OK', () => res('done'), 'btn-hot btn-big'));
      footer.replaceChildren(h('div.gr-summary', summary(cards)), h('div.gr-btns', btns));
    };
  });
}

/** all packs of a bulk buy: counts plus the hits (gold+, NEW, prism) as mini cards */
function showSummary(host: HTMLElement, packs: PullResult[][]): Promise<void> {
  return new Promise((res) => {
    const all = packs.flat();
    const hits = all
      .filter((r) => rank(r.rarity) >= 2 || r.isNew || r.prism)
      .sort((a, b) => rank(b.rarity) - rank(a.rarity) || Number(b.isNew) - Number(a.isNew));
    const list = h(
      'div.pk-hits',
      hits.map((r) =>
        h(
          `div.pk-hit.r-${r.rarity}`,
          { style: { '--glow': GLOW[r.rarity] } },
          h('div.pk-hit-card', staticCard(r.id, 'collection', r.prism)),
          r.isNew ? h('div.pk-hit-new', 'NEW') : null,
          r.prism ? h('div.pk-hit-prism', 'PRISM') : null,
        ),
      ),
    );
    host.replaceChildren(
      h(
        'div.pk-summary',
        h('div.pk-sum-title', `${packs.length}パック開封結果`),
        h('div.gr-summary', summary(all)),
        hits.length ? h('div.pk-sum-sub', '今回のアタリ') : h('div.pk-sum-sub', 'ゴールド以上・新カードはなかった……次こそ！'),
        list,
        btn('OK', () => res(), 'btn-hot btn-big'),
      ),
    );
    audio.play('unlock');
  });
}

function summary(results: PullResult[]): string {
  const c = (r: Rarity) => results.filter((x) => x.rarity === r).length;
  const parts = [`L×${c('legend')}`, `G×${c('gold')}`, `S×${c('silver')}`, `B×${c('bronze')}`];
  const nw = results.filter((r) => r.isNew).length;
  const dust = results.reduce((a, r) => a + r.dust, 0);
  return `${parts.join(' ')}　NEW ${nw}枚${dust ? `　✨+${dust}` : ''}`;
}
