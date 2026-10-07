import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { achProgress, ACHIEVEMENTS } from '../../meta/achievements';
import { addXp, grant, rewardText } from '../../meta/economy';
import { missionDef, refreshMissions, rerollMission } from '../../meta/missions';
import { save } from '../../meta/save';
import { bottomNav, btn, rewardModal, topBar } from '../common';
import { h } from '../dom';
import { toast } from '../fx/fx';
import { go, type ScreenFn } from '../router';

export const missionsScreen: ScreenFn = (root, params) => {
  music.play('home');
  save.update((d) => void refreshMissions(d));
  const tb = topBar({ back: () => void go('home'), title: 'ミッション' });
  const body = h('div.mis-body');
  const tabs = h('div.tabs');
  root.append(tb.el, tabs, body, bottomNav('missions'));
  let tab: 'daily' | 'ach' = params.tab === 'ach' ? 'ach' : 'daily';
  const draw = () => {
    tabs.replaceChildren(
      h(`button.tab${tab === 'daily' ? '.on' : ''}`, { type: 'button', onclick: () => { tab = 'daily'; audio.play('tap'); draw(); } }, 'デイリー'),
      h(`button.tab${tab === 'ach' ? '.on' : ''}`, { type: 'button', onclick: () => { tab = 'ach'; audio.play('tap'); draw(); } }, '実績'),
    );
    if (tab === 'daily') drawDaily();
    else drawAch();
  };
  const drawDaily = () => {
    const d = save.data;
    const now = new Date();
    const mid = new Date(now);
    mid.setHours(24, 0, 0, 0);
    const left = Math.max(0, mid.getTime() - now.getTime());
    const hh = Math.floor(left / 3600000);
    const mm = Math.floor((left % 3600000) / 60000);
    const rows = d.missions.list.map((m, i) => {
      const def = missionDef(m.id);
      if (!def) return null;
      const done = m.progress >= def.goal;
      return h(
        `div.mis-row${m.claimed ? '.claimed' : done ? '.done' : ''}`,
        h('div.mis-text', def.text),
        h('div.mis-bar', h('div.mis-fill', { style: { width: `${(m.progress / def.goal) * 100}%` } }), h('span.mis-prog', `${m.progress}/${def.goal}`)),
        h('div.mis-reward', `${rewardText(def.reward)} ＋EXP${def.xp}`),
        m.claimed
          ? h('div.mis-stamp', 'CLEAR')
          : done
            ? btn('受け取る', async () => {
                save.update((s) => {
                  const mm2 = s.missions.list[i];
                  mm2.claimed = true;
                  grant(s, def.reward);
                  addXp(s, def.xp);
                });
                await rewardModal('ミッション達成！', def.reward, `EXP +${def.xp}`);
                draw();
              }, 'btn-small btn-hot')
            : !d.missions.rerolled
              ? btn('入れ替え', () => {
                  save.update((s) => void rerollMission(s, i));
                  toast('ミッションを入れ替えた（1日1回）', '🔄');
                  draw();
                }, 'btn-small')
              : null,
      );
    });
    body.replaceChildren(h('div.mis-head', `毎日0時に更新　残り ${hh}時間${mm}分`), h('div.mis-list', rows));
  };
  const drawAch = () => {
    const d = save.data;
    const list = ACHIEVEMENTS.map((a) => ({ a, p: achProgress(d, a) })).sort((x, y) => Number(y.p.done && !y.p.claimed) - Number(x.p.done && !x.p.claimed) || Number(x.p.claimed) - Number(y.p.claimed));
    body.replaceChildren(
      h(
        'div.ach-grid',
        list.map(({ a, p }) =>
          h(
            `div.ach${p.claimed ? '.claimed' : p.done ? '.done' : ''}`,
            h('div.ach-icon', a.icon),
            h('div.ach-name', a.name),
            h('div.ach-desc', a.desc),
            h('div.mis-bar', h('div.mis-fill', { style: { width: `${(p.cur / p.goal) * 100}%` } }), h('span.mis-prog', `${p.cur}/${p.goal}`)),
            p.claimed
              ? h('div.ach-got', '獲得済み')
              : p.done
                ? btn(`受け取る ${rewardText(a.reward)}`, async () => {
                    save.update((s) => {
                      s.achievements[a.id] = true;
                      grant(s, a.reward);
                    });
                    await rewardModal(`実績「${a.name}」`, a.reward);
                    draw();
                  }, 'btn-small btn-hot')
                : h('div.ach-reward', rewardText(a.reward)),
          ),
        ),
      ),
    );
  };
  draw();
  return () => tb.dispose();
};
