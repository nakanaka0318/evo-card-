import { amulet, follower, spell } from './util';

export const STREAM = [
  // ---------------- bronze
  follower({
    id: 's_newbie',
    name: '新人配信者',
    cls: 'stream',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🎤',
    text: '【ファンファーレ】いいね+1',
    flavor: '同接3人からのスタート。',
    fanfare: (c) => c.likes(1),
  }),
  follower({
    id: 's_sakura',
    name: 'サクラ雇い',
    cls: 'stream',
    cost: 2,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🕴️',
    text: '【ファンファーレ】「サクラ」を1体出す',
    flavor: '盛り上がってる風を演出します。',
    fanfare: (c) => {
      c.summon('t_sakura');
    },
  }),
  spell({
    id: 's_comment',
    name: 'コメント爆撃',
    cls: 'stream',
    cost: 2,
    rarity: 'bronze',
    art: '💬',
    text: '相手のフォロワー1体に2ダメージ\n【バズ4】かわりに4ダメージ',
    flavor: '草草草草草草草草',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      if (!c.buzz(4, (c) => c.dmg(c.target, 4))) c.dmg(c.target, 2);
    },
  }),
  follower({
    id: 's_selfie',
    name: '自撮りペンギン',
    cls: 'stream',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🐧',
    text: '【ファンファーレ】いいね+1\n【進化時】いいね+2',
    flavor: '盛れる角度を研究して3年。',
    fanfare: (c) => c.likes(1),
    evolve: (c) => c.likes(2),
  }),
  follower({
    id: 's_fan',
    name: '古参ファン',
    cls: 'stream',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    kw: ['ward'],
    art: '🙋',
    text: '《守護》\n【ラストワード】いいね+2',
    flavor: '「初配信から見てました」',
    lastWords: (c) => c.likes(2),
  }),
  spell({
    id: 's_collab',
    name: 'コラボ配信',
    cls: 'stream',
    cost: 3,
    rarity: 'bronze',
    art: '🤝',
    text: '自分のフォロワーすべてを+1/+1\n【バズ5】かわりに+2/+2',
    flavor: '1+1が3にも4にもなる。',
    spell: (c) => {
      if (!c.buzz(5, (c) => c.buffAll(c.allies(), 2, 2))) c.buffAll(c.allies(), 1, 1);
    },
  }),
  // ---------------- silver
  follower({
    id: 's_peacock',
    name: 'インフルエンサー孔雀',
    cls: 'stream',
    cost: 3,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    art: '🦚',
    text: '【ファンファーレ】自分の場のフォロワー1体につき、いいね+1',
    flavor: '映えるためなら羽も広げる。',
    fanfare: (c) => c.likes(c.allies().length),
  }),
  spell({
    id: 's_flame',
    name: '炎上',
    cls: 'stream',
    cost: 3,
    rarity: 'silver',
    art: '🔥',
    text: '相手のフォロワーすべてに1ダメージ\n【バズ6】かわりに3ダメージ\nその後、いいね+1',
    flavor: '燃えれば燃えるほど、伸びる。',
    spell: (c) => {
      if (!c.buzz(6, (c) => c.dmgAll(c.enemies(), 3))) c.dmgAll(c.enemies(), 1);
      c.likes(1);
    },
  }),
  follower({
    id: 's_clipper',
    name: '切り抜き職人',
    cls: 'stream',
    cost: 2,
    rarity: 'silver',
    atk: 1,
    hp: 1,
    art: '✂️',
    text: '【ファンファーレ】「切り抜き動画」を1枚手札に加える',
    flavor: '神回だけを、45秒に。',
    fanfare: (c) => {
      c.addHand('t_clip');
    },
  }),
  follower({
    id: 's_camera',
    name: 'カメラマン',
    cls: 'stream',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '📸',
    text: '【ファンファーレ】カードを1枚引く\n【バズ4】さらに+2/+2と《守護》',
    flavor: '「はい、もう一回いきまーす」',
    fanfare: (c) => {
      c.draw(1);
      c.buzz(4, (c) => {
        c.buff(c.self, 2, 2);
        c.give(c.self, 'ward');
      });
    },
  }),
  spell({
    id: 's_spacha',
    name: 'スパチャ',
    cls: 'stream',
    cost: 1,
    rarity: 'silver',
    art: '💸',
    text: 'いいね+2。カードを1枚引く',
    flavor: '赤スパの通知音は、脳に直接効く。',
    spell: (c) => {
      c.likes(2);
      c.draw(1);
    },
  }),
  // ---------------- gold
  follower({
    id: 's_trend',
    name: 'トレンドスター',
    cls: 'stream',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    art: '🌟',
    text: '【ファンファーレ】【バズ6】相手のフォロワーすべてに3ダメージ\n【進化時】いいね+3',
    flavor: 'トレンド1位は、だいたい一瞬。',
    fanfare: (c) => {
      c.buzz(6, (c) => c.dmgAll(c.enemies(), 3));
    },
    evolve: (c) => c.likes(3),
  }),
  amulet({
    id: 's_live',
    name: '24時間耐久配信',
    cls: 'stream',
    cost: 3,
    rarity: 'gold',
    countdown: 4,
    art: '📺',
    text: '【カウントダウン4】\n【自分のターン終了時】いいね+2。ランダムな自分のフォロワー1体を+1/+1',
    flavor: '寝落ちした瞬間が一番伸びる。',
    aiValue: 4,
    turnEnd: (c) => {
      c.likes(2);
      c.buff(c.pick(c.allies()), 1, 1);
    },
  }),
  follower({
    id: 's_anti',
    name: 'アンチ',
    cls: 'stream',
    cost: 3,
    rarity: 'gold',
    atk: 2,
    hp: 2,
    kw: ['bane'],
    art: '😈',
    text: '《必殺》【ファンファーレ】いいね+2\n【ラストワード】相手のリーダーに2ダメージ',
    flavor: '一番熱心な視聴者は、だいたいコイツ。',
    fanfare: (c) => c.likes(2),
    lastWords: (c) => {
      c.face(2);
    },
  }),
  // ---------------- legend
  follower({
    id: 's_buzzrin',
    name: '超人気Vtuber バズリン',
    cls: 'stream',
    cost: 6,
    rarity: 'legend',
    atk: 5,
    hp: 5,
    art: '🦊',
    art2: '💖',
    text: '【ファンファーレ】いいね+2\n【バズ10】相手のリーダーに6ダメージ\n【進化時】いいね+4',
    flavor: '「こんバズ〜！ 今日も10万いいね、いっちゃお？」',
    fanfare: (c) => {
      c.likes(2);
      c.buzz(10, (c) => c.face(6));
    },
    evolve: (c) => c.likes(4),
  }),
  follower({
    id: 's_algo',
    name: 'アルゴリズム様',
    cls: 'stream',
    cost: 8,
    rarity: 'legend',
    atk: 6,
    hp: 6,
    art: '👁️',
    art2: '📈',
    text: '【ファンファーレ】いいねの数だけ（最大10回）、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: 'あなたのおすすめは、すべて見られている。',
    fanfare: (c) => c.ping(Math.min(10, c.P.likes), 1),
  }),
];
