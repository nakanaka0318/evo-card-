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
  if (mode === 'spectate') {
    type Side = { cls: ClassId; cards: string[]; name: string; diff: Difficulty };
    const a = params.a as Side;
    const b = params.b as Side;
    const battle = new Battle({
      playerDeck: a.cards,
      playerCls: a.cls,
      playerName: a.name,
      playerAi: a.diff,
      enemyDeck: b.cards,
      enemyCls: b.cls,
      enemyName: b.name,
      difficulty: b.diff,
      mode,
      onEnd: (r) => void go('aivs', { last: { aName: a.name, bName: b.name, winner: r.draw ? -1 : r.win ? 0 : 1, turns: r.turns } }),
      onQuit: () => void go('aivs'),
    });
    battle.mount(root);
    return () => battle.destroy();
  }
  if (mode === 'story') {
    const st = STAGES.find((s) => s.id === params.stage) ?? STAGES[0];
    cfg = {
      playerDeck: me.cards,
      playerCls: me.cls,
      // the tutorial stays gentle; every other NPC builds from the strongest cards
      enemyDeck: st.id === '1-1' ? buildDeck(st.cls, { quality: st.quality, favor: st.favor }) : buildDeck(st.cls, { quality: Math.min(1, st.quality + 0.3), favor: st.favor, smart: true }),
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
      enemyDeck: buildDeck(cls, { quality: Math.min(1, 0.6 + r.i * 0.1), smart: true }),
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
      enemyDeck: buildDeck(cls, { quality: diff === 'easy' ? 0.5 : diff === 'normal' ? 0.8 : 1, smart: true }),
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
