import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES } from '../../engine';
import { achProgress, ACHIEVEMENTS, doneSet } from '../../meta/achievements';
import { addXp, battleRewards, grant, rankIndex, rankInfo, RANKS, rewardText, scoreBattle, xpForLevel, type Reward } from '../../meta/economy';
import { progressBattle, refreshMissions } from '../../meta/missions';
import { save } from '../../meta/save';
import { STAGES, stageUnlocked, starsFor } from '../../meta/story';
import type { BattleResult } from '../battle/battle';
import { btn, rewardModal } from '../common';
import { countUp, fmtNum, h, wait } from '../dom';
import { cutIn, flash, shake, toast } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';

export const resultsScreen: ScreenFn = (root, params) => {
  const r = params.result as BattleResult;
  const replay = params.params as Record<string, unknown>;
  const score = scoreBattle(r);
  const d = save.data;
  // ---------------- apply results to the save
  const beforeDone = doneSet(d);
  const before = { level: d.level, xp: d.xp, rank: d.rankPoints, coins: d.coins, high: d.highScore };
  const streakAfter = r.win ? d.winStreak + 1 : 0;
  const rw = battleRewards(r, score, streakAfter);
  const out = { levelUps: [] as { level: number; reward: Reward }[], stars: 0, prevStars: 0, firstClear: null as Reward | null, threeStarBonus: false };
  save.update((s) => {
    refreshMissions(s);
    const st = s.stats;
    st.games++;
    if (r.win) st.wins++;
    else if (!r.draw) st.losses++;
    st.kills += r.stats.kills;
    st.damage += r.stats.dmgDealt;
    st.maxHit = Math.max(st.maxHit, r.stats.maxHit);
    st.maxCombo = Math.max(st.maxCombo, r.stats.maxCombo);
    st.evolves += r.stats.evolves;
    st.supers += r.stats.supers;
    st.fevers += r.stats.fevers;
    st.ssr += r.stats.ssr;
    st.levelUps += r.stats.levelUps;
    st.buzzes += r.stats.buzzes;
    st.overkill += r.stats.overkill;
    if (r.win) {
      st.classWins[r.config.playerCls] = (st.classWins[r.config.playerCls] ?? 0) + 1;
      if (!st.fastestWin || r.turns < st.fastestWin) st.fastestWin = r.turns;
      if (r.hpLeft <= 3) st.clutchWins++;
    }
    s.winStreak = streakAfter;
    s.bestStreak = Math.max(s.bestStreak, s.winStreak);
    s.coins += rw.coins;
    s.rankPoints = Math.max(0, s.rankPoints + rw.rankDelta);
    s.bestRank = Math.max(s.bestRank, s.rankPoints);
    if (score.total > s.highScore) s.highScore = score.total;
    out.levelUps = addXp(s, rw.xp);
    if (r.config.mode === 'story' && r.config.stageId) {
      const id = r.config.stageId;
      out.prevStars = s.story[id] ?? 0;
      out.stars = starsFor(r.win, r.hpLeft, r.turns);
      if (out.stars > out.prevStars) s.story[id] = out.stars;
      const stDef = STAGES.find((x) => x.id === id);
      if (stDef && r.win && out.prevStars === 0) {
        out.firstClear = stDef.reward;
        grant(s, stDef.reward);
      }
      if (out.stars === 3 && out.prevStars < 3) {
        out.threeStarBonus = true;
        grant(s, { gems: 50 });
      }
    }
  });
  const missionsDone = progressBattle(save.data, r, score.grade);
  save.touch();
  const { levelUps, stars, firstClear, threeStarBonus } = out;
  const afterDone = doneSet(save.data);
  const newAch = ACHIEVEMENTS.filter((a) => afterDone.has(a.id) && !beforeDone.has(a.id) && !achProgress(save.data, a).claimed);

  // ---------------- build the screen
  const win = r.win;
  music.play('result');
  const head = h(`div.res-head${win ? '.win' : r.draw ? '.draw' : '.lose'}`, h('div.res-title', win ? 'VICTORY!!' : r.draw ? 'DRAW' : 'DEFEAT'), h('div.res-vs', `VS ${r.config.enemyName}`));
  const lineBox = h('div.res-lines');
  const totalNum = h('span.res-total-num', '0');
  const total = h('div.res-total', h('span.res-total-label', 'SCORE'), totalNum);
  const gradeEl = h(`div.res-grade.g-${score.grade}`, score.grade);
  const xpFill = h('div.res-xp-fill');
  const xpText = h('div.res-xp-text');
  const lvEl = h('div.res-lv', `Lv${before.level}`);
  const xpBox = h('div.res-xp', lvEl, h('div.res-xp-bar', xpFill), xpText);
  const coinsEl = h('div.res-reward', h('span', '🪙'), h('span.res-coins', '+0'));
  const rankBox = h('div.res-rank');
  const starBox = h('div.res-stars');
  const stIdx = r.config.stageId ? STAGES.findIndex((x) => x.id === r.config.stageId) : -1;
  const next = stIdx >= 0 && stIdx + 1 < STAGES.length && stageUnlocked(save.data.story, stIdx + 1) ? STAGES[stIdx + 1] : null;
  const btns = h(
    'div.res-btns',
    next && win
      ? btn(`次へ：${next.name}`, () => void go('battle', { mode: 'story', stage: next.id }), 'btn-hot btn-big')
      : btn(win ? 'もう一戦！' : 'リベンジ！', () => void go('battle', replay), 'btn-hot btn-big'),
    next && win ? btn('もう一回', () => void go('battle', replay), 'btn-big') : null,
    btn('ホームへ', () => void go('home'), 'btn-big'),
  );
  btns.classList.add('hidden');
  const panel = h('div.res-panel', head, h('div.res-main', h('div.res-left', lineBox, total), h('div.res-right', gradeEl, starBox)), xpBox, h('div.res-rewards', coinsEl, rankBox), btns);
  root.append(h('div.res-bg', { style: { '--c1': CLASSES[r.config.playerCls].color, '--c2': CLASSES[r.config.playerCls].color2 } }), panel);

  let skip = false;
  root.addEventListener('pointerdown', () => (skip = true));
  const pause = (ms: number) => (skip ? Promise.resolve() : wait(ms));

  const run = async () => {
    if (win) {
      particles.confetti(80);
      audio.play('win');
    } else audio.play('lose');
    await pause(500);
    let running = 0;
    for (const l of score.lines) {
      const num = h('span.sl-val', '0');
      const row = h('div.res-line', h('span.sl-label', l.label), h('span.sl-detail', l.detail), num);
      lineBox.append(row);
      audio.play('tick', { pitch: 1 + running / 8000 });
      void countUp(num, 0, l.value, skip ? 0 : 350, fmtNum);
      const from = running;
      running += l.value;
      void countUp(totalNum, from, running, skip ? 0 : 350, fmtNum);
      await pause(180);
    }
    await pause(350);
    totalNum.textContent = fmtNum(score.total);
    if (score.total > before.high && score.total > 0) {
      total.append(h('span.res-record', 'NEW RECORD!'));
      audio.play('rankUp');
    }
    await pause(250);
    gradeEl.classList.add('in');
    audio.play('stamp');
    shake(score.grade.startsWith('S') ? 18 : 8, 300);
    if (score.grade.startsWith('S')) {
      flash('#ffe14d', 0.4, 300);
      particles.burst(stage.w * 0.72, stage.h * 0.4, { n: 60, colors: ['#ffe14d', '#ff2e88', '#fff'], speed: 12, type: 'star', size: 8 });
    }
    await pause(400);
    // stars (story)
    if (r.config.mode === 'story') {
      const conds = ['クリア', '体力10以上で勝利', '10ターン以内に勝利'];
      for (let i = 0; i < 3; i++) {
        const on = i < stars;
        const s = h(`div.star-item${on ? '.on' : ''}`, h('span.star-icon', '★'), h('span.star-cond', conds[i]));
        starBox.append(s);
        if (on) {
          audio.play('stamp', { pitch: 1 + i * 0.15 });
          particles.burst(stage.w * 0.72, stage.h * 0.62, { n: 20, colors: ['#ffe14d', '#fff'], speed: 8, type: 'star' });
        }
        await pause(260);
      }
    }
    // coins
    void countUp(coinsEl.querySelector('.res-coins') as HTMLElement, 0, rw.coins, skip ? 0 : 600, (v) => `+${fmtNum(v)}`);
    audio.play('coins');
    if (rw.streakBonus) coinsEl.append(h('span.res-streak', `🔥${streakAfter}連勝ボーナス +${rw.streakBonus}`));
    // xp bar
    const xpNeed0 = xpForLevel(before.level);
    xpFill.style.width = `${(before.xp / xpNeed0) * 100}%`;
    xpText.textContent = `+${rw.xp} EXP`;
    await pause(200);
    let lv = before.level;
    for (const up of levelUps) {
      xpFill.style.transition = 'width .5s cubic-bezier(.3,1.4,.5,1)';
      xpFill.style.width = '100%';
      await pause(550);
      lv = up.level;
      lvEl.textContent = `Lv${lv}`;
      xpFill.style.transition = 'none';
      xpFill.style.width = '0%';
      void xpFill.offsetWidth;
      audio.play('levelUp');
      flash('#3dff95', 0.3, 250);
      await cutIn({ art: '⬆️', name: `報酬 ${rewardText(up.reward)}`, title: `LEVEL ${up.level}`, color: '#3dff95', color2: '#ffe14d', kind: 'levelup' });
    }
    xpFill.style.transition = 'width .6s ease-out';
    xpFill.style.width = `${(save.data.xp / xpForLevel(save.data.level)) * 100}%`;
    await pause(400);
    // rank
    if (r.config.mode === 'rank') {
      const after = rankInfo(save.data.rankPoints);
      const prevI = rankIndex(before.rank);
      rankBox.append(
        h('div.rank-row', h('span.rank-emb', after.cur.emblem), h('span.rank-name', after.cur.name), h(`span.rank-delta${rw.rankDelta >= 0 ? '.up' : '.down'}`, `${rw.rankDelta >= 0 ? '+' : ''}${rw.rankDelta} RP`)),
        h('div.rank-bar', h('div.rank-fill', { style: { width: `${after.pct * 100}%` } })),
        h('div.rank-next', after.next ? `次のランク ${after.next.emblem}${after.next.name} まで ${after.next.min - save.data.rankPoints} RP` : '最高ランク！'),
      );
      if (after.i > prevI) {
        await pause(300);
        audio.play('rankUp');
        await cutIn({ art: RANKS[after.i].emblem, name: 'ランクアップ！', title: RANKS[after.i].name, color: RANKS[after.i].color, color2: '#ffffff', kind: 'legend' });
      }
    }
    if (firstClear) {
      await pause(200);
      await rewardModal('初回クリア報酬！', firstClear, threeStarBonus ? '★3ボーナス 💎50 もゲット！' : undefined);
    } else if (threeStarBonus) {
      await rewardModal('★3達成ボーナス！', { gems: 50 });
    }
    for (const m of missionsDone) toast(`ミッション達成！「${m.text}」`, '📋', 't-hot');
    for (const a of newAch) toast(`実績解除！「${a.name}」`, a.icon, 't-gold');
    btns.classList.remove('hidden');
    btns.classList.add('pop-in');
  };
  void run();
};
