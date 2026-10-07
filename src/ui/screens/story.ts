import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, PLAYABLE_CLASSES, type ClassId, type Difficulty } from '../../engine';
import { rewardText } from '../../meta/economy';
import { save } from '../../meta/save';
import { CHAPTERS, STAGES, stageUnlocked } from '../../meta/story';
import { bottomNav, btn, modal, topBar } from '../common';
import { h } from '../dom';
import { go, type ScreenFn } from '../router';

const DIFF_LABEL: Record<Difficulty, string> = { easy: 'かんたん', normal: 'ふつう', hard: 'つよい', oni: '鬼' };

export const storyScreen: ScreenFn = (root) => {
  music.play('home');
  const tb = topBar({ back: () => void go('home'), title: 'ストーリー「ドパ道」' });
  const d = save.data;
  const totalStars = STAGES.reduce((a, s) => a + (d.story[s.id] ?? 0), 0);
  const chapters = CHAPTERS.map((ch) => {
    const stages = STAGES.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === ch.n);
    const cm = CLASSES[ch.cls];
    const open = stageUnlocked(d.story, stages[0].i);
    return h(
      `div.chapter${open ? '' : '.locked'}`,
      { style: { '--c1': ch.n === 6 ? '#ffe14d' : cm.color, '--c2': ch.n === 6 ? '#ff2e88' : cm.color2 } },
      h('div.ch-head', h('span.ch-icon', ch.bg), h('div.ch-title', h('div.ch-n', ch.n === 6 ? 'FINAL' : `第${ch.n}章`), h('div.ch-name', ch.name), h('div.ch-sub', ch.sub))),
      h(
        'div.ch-stages',
        stages.map(({ s, i }) => {
          const unlocked = stageUnlocked(d.story, i);
          const stars = d.story[s.id] ?? 0;
          return h(
            `button.stage-node${unlocked ? '' : '.locked'}${s.boss ? '.boss' : ''}${stars ? '.cleared' : ''}`,
            {
              type: 'button',
              onclick: () => {
                if (!unlocked) {
                  audio.play('error');
                  return;
                }
                audio.play('tap');
                stageModal(s.id);
              },
            },
            h('span.sn-art', unlocked ? s.art : '🔒'),
            h('span.sn-id', s.id === 'final' ? 'BOSS' : s.id),
            h('span.sn-stars', [0, 1, 2].map((k) => h(`span${k < stars ? '.on' : ''}`, '★'))),
          );
        }),
      ),
    );
  });
  root.append(tb.el, h('div.story-head', `獲得★ ${totalStars} / ${STAGES.length * 3}`), h('div.story-map', chapters), bottomNav('story'));
  return () => tb.dispose();
};

function stageModal(id: string): void {
  const s = STAGES.find((x) => x.id === id)!;
  const stars = save.data.story[id] ?? 0;
  const cm = CLASSES[s.cls];
  const m = modal(
    [
      h('div.sm-art', { style: { '--c1': cm.color, '--c2': cm.color2 } }, s.art),
      h('div.sm-enemy', s.enemy),
      h('div.sm-line', `「${s.lines.start}」`),
      h('div.sm-meta', `${cm.emoji}${cm.name}　難易度：${DIFF_LABEL[s.diff]}　相手体力 ${s.hp}`),
      h('div.sm-reward', stars ? 'クリア済み（★3で 💎50）' : `初回報酬 ${rewardText(s.reward)}`),
      h('div.sm-conds', ['クリア', '体力10以上で勝利', '10ターン以内に勝利'].map((c, i) => h(`div.sm-cond${i < stars ? '.on' : ''}`, `★ ${c}`))),
      btn('バトル開始！', () => {
        m.close();
        void go('battle', { mode: 'story', stage: id });
      }, 'btn-hot btn-big'),
    ],
    { title: s.name, cls: 'stage-modal' },
  );
}

export const freeScreen: ScreenFn = (root) => {
  music.play('home');
  const tb = topBar({ back: () => void go('home'), title: 'フリーバトル' });
  let cls: ClassId | 'random' = 'random';
  let diff: Difficulty = 'normal';
  const body = h('div.free-body');
  const draw = () => {
    body.replaceChildren(
      h('div.free-label', '相手のクラス'),
      h(
        'div.free-chips',
        (['random', ...PLAYABLE_CLASSES] as const).map((c) =>
          h(`button.f-chip.big${cls === c ? '.on' : ''}`, { type: 'button', onclick: () => { cls = c; audio.play('tap'); draw(); } }, c === 'random' ? '🎲 ランダム' : `${CLASSES[c].emoji} ${CLASSES[c].name}`),
        ),
      ),
      h('div.free-label', '強さ'),
      h(
        'div.free-chips',
        (['easy', 'normal', 'hard', 'oni'] as Difficulty[]).map((x) =>
          h(`button.f-chip.big${diff === x ? '.on' : ''}`, { type: 'button', onclick: () => { diff = x; audio.play('tap'); draw(); } }, DIFF_LABEL[x]),
        ),
      ),
      h('div.free-note', 'フリーバトルはランクが変動しない。報酬は少しだけ控えめ。'),
      btn('バトル開始！', () => {
        const c = cls === 'random' ? PLAYABLE_CLASSES[Math.floor(Math.random() * PLAYABLE_CLASSES.length)] : cls;
        void go('battle', { mode: 'free', enemyCls: c, difficulty: diff });
      }, 'btn-hot btn-big'),
    );
  };
  draw();
  root.append(tb.el, body, bottomNav('home'));
  return () => tb.dispose();
};
