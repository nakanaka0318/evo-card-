import { buildDeck, CLASSES, PLAYABLE_CLASSES, validateDeck, type ClassId, type Difficulty } from '../../engine';
import { rankInfo, starterDeck } from '../../meta/economy';
import { save } from '../../meta/save';
import { STAGES } from '../../meta/story';
import { Battle, type BattleConfig } from '../battle/battle';
import { fxConfig } from '../fx/fx';
import { go, type ScreenFn } from '../router';

const HANDLES = ['ねむねむ王子', '連打の鬼', 'ガチャ沼の住人', 'いいね乞食', '深夜3時の勇者', 'カフェイン中毒', 'ドパ吉', '指スワイパー', '甘党番長', 'レベル上げ職人', '天井到達者', 'スパチャ王', '秒速民', 'ぷりん大好き', 'ラスボス見習い'];

export function playerDeck(): { cls: ClassId; cards: string[] } {
  const d = save.data;
  let deck = d.decks.find((x) => x.id === d.activeDeck) ?? d.decks[0];
  if (!deck || validateDeck(deck.cls, deck.cards)) {
    const cls = deck?.cls ?? d.favoriteClass;
    const fresh = starterDeck(cls, d);
    save.update((s) => {
      s.decks.push(fresh);
      s.activeDeck = fresh.id;
    });
    deck = fresh;
  }
  return { cls: deck.cls, cards: [...deck.cards] };
}

export const battleScreen: ScreenFn = (root, params) => {
  const mode = (params.mode as BattleConfig['mode']) ?? 'free';
  const me = playerDeck();
  fxConfig.speed = save.data.settings.speed;
  let cfg: Omit<BattleConfig, 'onEnd'>;
  if (mode === 'story') {
    const st = STAGES.find((s) => s.id === params.stage) ?? STAGES[0];
    cfg = {
      playerDeck: me.cards,
      playerCls: me.cls,
      enemyDeck: buildDeck(st.cls, { quality: st.quality, favor: st.favor }),
      enemyCls: st.cls,
      enemyName: st.enemy,
      enemyArt: st.art,
      difficulty: st.diff,
      mode,
      enemyHp: st.hp,
      stageId: st.id,
      bgm: st.boss ? 'boss' : 'battle',
      enemyLines: st.lines,
      tutorial: !!params.tutorial || (st.id === '1-1' && !save.data.story['1-1']),
    };
  } else if (mode === 'rank') {
    const r = rankInfo(save.data.rankPoints);
    const cls = PLAYABLE_CLASSES[Math.floor(Math.random() * PLAYABLE_CLASSES.length)];
    cfg = {
      playerDeck: me.cards,
      playerCls: me.cls,
      enemyDeck: buildDeck(cls, { quality: Math.min(1, 0.4 + r.i * 0.1) }),
      enemyCls: cls,
      enemyName: HANDLES[Math.floor(Math.random() * HANDLES.length)],
      difficulty: r.cur.diff,
      mode,
    };
  } else {
    const cls = (params.enemyCls as ClassId) ?? PLAYABLE_CLASSES[Math.floor(Math.random() * PLAYABLE_CLASSES.length)];
    const diff = (params.difficulty as Difficulty) ?? 'normal';
    cfg = {
      playerDeck: me.cards,
      playerCls: me.cls,
      enemyDeck: buildDeck(cls, { quality: diff === 'easy' ? 0.3 : diff === 'normal' ? 0.6 : 1 }),
      enemyCls: cls,
      enemyName: `${CLASSES[cls].leaderName}`,
      difficulty: diff,
      mode: 'free',
    };
  }
  const battle = new Battle({
    ...cfg,
    onEnd: (result) => void go('results', { result, params }),
  });
  battle.mount(root);
  return () => battle.destroy();
};
