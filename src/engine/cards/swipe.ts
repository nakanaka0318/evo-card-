import { amulet, follower, spell } from './util';

export const SWIPE = [
  // ---------------- bronze
  follower({
    id: 'x_swiper',
    name: 'スワイプ小僧',
    cls: 'swipe',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    kw: ['rush'],
    art: '👆',
    text: '《突進》',
    flavor: '親指の速さなら誰にも負けない。',
  }),
  follower({
    id: 'x_squirrel',
    name: '15秒リス',
    cls: 'swipe',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    art: '🐿️',
    text: '【ファンファーレ】【コンボ1】《疾走》を得る',
    flavor: '集中力は15秒で切れる。',
    fanfare: (c) => {
      if (c.comboAt(1)) c.give(c.self, 'storm');
    },
  }),
  spell({
    id: 'x_skip',
    name: 'スキップ',
    cls: 'swipe',
    cost: 0,
    rarity: 'bronze',
    art: '⏭️',
    text: 'カードを1枚引く',
    flavor: 'イントロは飛ばす。',
    spell: (c) => {
      c.draw(1);
    },
  }),
  follower({
    id: 'x_ninja',
    name: '早送り忍者',
    cls: 'swipe',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '⏩',
    text: '【ファンファーレ】【コンボ1】相手のフォロワー1体に2ダメージ',
    flavor: '倍速視聴で修行を終えた。',
    target: { kind: 'enemyFollower', cond: (_s, _c, i) => i.combo >= 1 },
    fanfare: (c) => {
      if (c.comboAt(1)) c.dmg(c.target, 2);
    },
  }),
  follower({
    id: 'x_falcon',
    name: '倍速ハヤブサ',
    cls: 'swipe',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    kw: ['twin', 'rush'],
    art: '🦅',
    text: '《連撃》《突進》',
    flavor: '2倍速が標準。',
  }),
  spell({
    id: 'x_flashmob',
    name: 'フラッシュモブ',
    cls: 'swipe',
    cost: 2,
    rarity: 'bronze',
    art: '🪩',
    text: '「バックダンサー」を2体出す\n【コンボ3】さらに1体出す',
    flavor: '突然始まって、突然終わる。',
    spell: (c) => {
      c.summon('t_dancer', 2);
      if (c.comboAt(3)) c.summon('t_dancer', 1);
    },
  }),
  // ---------------- silver
  spell({
    id: 'x_loop',
    name: '無限ループ',
    cls: 'swipe',
    cost: 1,
    rarity: 'silver',
    art: '🔁',
    text: '自分のフォロワー1体を手札に戻す。カードを1枚引く',
    flavor: '気づいたら朝だった。',
    target: { kind: 'allyFollower' },
    spell: (c) => {
      c.bounce(c.targetCard());
      c.draw(1);
    },
  }),
  spell({
    id: 'x_slash',
    name: 'スワイプ斬り',
    cls: 'swipe',
    cost: 1,
    rarity: 'silver',
    art: '🗡️',
    text: '相手のフォロワー1体に1ダメージ\n【コンボ2】かわりに3ダメージ',
    flavor: '次の動画へ、物理的に。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, c.comboAt(2) ? 3 : 1);
    },
  }),
  follower({
    id: 'x_dancer',
    name: 'バズダンサー',
    cls: 'swipe',
    cost: 2,
    rarity: 'silver',
    atk: 1,
    hp: 2,
    art: '🕺',
    text: '【ファンファーレ】このターンにプレイした他のカード1枚につき+1/+1',
    flavor: '流行りの振り付けは全部踊れる。',
    fanfare: (c) => c.buff(c.self, c.combo, c.combo),
  }),
  follower({
    id: 'x_cat',
    name: '秒速ネコ',
    cls: 'swipe',
    cost: 2,
    rarity: 'silver',
    atk: 1,
    hp: 1,
    kw: ['storm'],
    art: '🐈',
    text: '《疾走》\n【ファンファーレ】【コンボ2】+2/+1',
    flavor: 'ネコ動画は、無限に見られる。',
    fanfare: (c) => {
      if (c.comboAt(2)) c.buff(c.self, 2, 1);
    },
  }),
  spell({
    id: 'x_adskip',
    name: '広告スキップ',
    cls: 'swipe',
    cost: 1,
    rarity: 'silver',
    art: '🚫',
    text: '相手のフォロワー1体を手札に戻す',
    flavor: '5秒も待てない。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.bounce(c.targetCard());
    },
  }),
  // ---------------- gold
  follower({
    id: 'x_feed',
    name: 'おすすめ欄の支配者',
    cls: 'swipe',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 4,
    art: '🌀',
    text: '【ファンファーレ】【コンボ2】相手のフォロワーすべてに2ダメージ',
    flavor: 'スクロールの果てに、何がある。',
    fanfare: (c) => {
      if (c.comboAt(2)) c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'x_runner',
    name: 'スピードランナー',
    cls: 'swipe',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 3,
    kw: ['storm'],
    art: '🏃',
    text: '《疾走》\nこのターンにプレイしたカード1枚につき、このカードのコスト-1',
    flavor: 'タイマーは、もう止められない。',
    costFn: (s, card) => -s.players[card.owner].combo,
  }),
  spell({
    id: 'x_storm',
    name: '連打の嵐',
    cls: 'swipe',
    cost: 2,
    rarity: 'gold',
    art: '👊',
    text: 'ランダムな相手のフォロワーかリーダーに1ダメージを（2+このターンにプレイした他のカードの枚数）回',
    flavor: 'オラオラオラオラ！',
    spell: (c) => c.ping(2 + c.combo, 1),
  }),
  // ---------------- legend
  follower({
    id: 'x_shun',
    name: '秒速の覇者シュン',
    cls: 'swipe',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 3,
    kw: ['storm'],
    art: '🐆',
    art2: '⚡',
    text: '《疾走》\n【ファンファーレ】このターンにプレイした他のカード1枚につき+1/+0\n【コンボ3】《連撃》を得る',
    flavor: '「遅い。全部、遅すぎる」',
    fanfare: (c) => {
      c.buff(c.self, c.combo, 0);
      if (c.comboAt(3)) c.give(c.self, 'twin');
    },
  }),
  amulet({
    id: 'x_scroll',
    name: '無限スクロール',
    cls: 'swipe',
    cost: 2,
    rarity: 'legend',
    countdown: 3,
    art: '♾️',
    art2: '📱',
    text: '【カウントダウン3】\n自分がカードをプレイするたび、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: '終わりがないのが、終わり。',
    aiValue: 4,
    onPlay: (c) => c.ping(1, 1),
  }),
];
