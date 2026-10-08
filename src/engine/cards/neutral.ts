import { follower, spell } from './util';

export const NEUTRAL = [
  // ---------------- bronze
  follower({
    id: 'n_slime',
    name: 'ドパスライム',
    cls: 'neutral',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🟢',
    text: '',
    flavor: 'ぷるぷる。触ると脳汁が出る。',
  }),
  follower({
    id: 'n_dog',
    name: 'ハイタッチ犬',
    cls: 'neutral',
    cost: 2,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🐶',
    text: '【ファンファーレ】カードを1枚引く',
    flavor: 'イェーイ！の回数は1日300回。',
    fanfare: (c) => {
      c.draw(1);
    },
  }),
  follower({
    id: 'n_cat',
    name: 'ガードネコ',
    cls: 'neutral',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    kw: ['ward'],
    art: '😼',
    text: '《守護》',
    flavor: 'ここから先は通さないニャ。',
  }),
  follower({
    id: 'n_rocket',
    name: 'ロケット小僧',
    cls: 'neutral',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    kw: ['storm'],
    art: '🚀',
    text: '《疾走》',
    flavor: '待てない。1秒も待てない。',
  }),
  follower({
    id: 'n_speaker',
    name: '爆音スピーカー',
    cls: 'neutral',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '🔊',
    text: '【ファンファーレ】相手のフォロワー1体に2ダメージ',
    flavor: '音量MAX以外は認めない。',
    target: { kind: 'enemyFollower' },
    fanfare: (c) => {
      c.dmg(c.target, 2);
    },
  }),
  follower({
    id: 'n_angel',
    name: 'キャンディ天使',
    cls: 'neutral',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '👼',
    text: '【ラストワード】自分のリーダーを3回復',
    flavor: '最後に甘いのを置いていく。',
    lastWords: (c) => {
      c.heal(3);
    },
  }),
  follower({
    id: 'n_golem',
    name: 'モアイガード',
    cls: 'neutral',
    cost: 4,
    rarity: 'bronze',
    atk: 3,
    hp: 5,
    kw: ['ward'],
    art: '🗿',
    text: '《守護》\n【進化時】「ドパスライム」を2体出す',
    flavor: '無表情だが内心ノリノリ。',
    evolve: (c) => {
      c.summon('n_slime', 2);
    },
  }),
  follower({
    id: 'n_bear',
    name: 'デカ盛りクマ',
    cls: 'neutral',
    cost: 5,
    rarity: 'bronze',
    atk: 7,
    hp: 7,
    art: '🐻',
    text: '',
    flavor: 'メガ盛りの、さらに上。',
  }),
  // ---------------- silver
  follower({
    id: 'n_megaphone',
    name: 'メガホン先生',
    cls: 'neutral',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '📣',
    text: '【進化時】相手のフォロワー1体を破壊する',
    flavor: '「ハイそこ！集中ッ！」',
    evoTarget: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    evolve: (c) => {
      c.destroy(c.targetCard());
    },
  }),
  follower({
    id: 'n_balloon',
    name: '風船ナイト',
    cls: 'neutral',
    cost: 3,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    kw: ['barrier'],
    art: '🎈',
    text: '《バリア》',
    flavor: '一回だけなら、割れても平気。',
  }),
  follower({
    id: 'n_sushi',
    name: '回転すしロボ',
    cls: 'neutral',
    cost: 4,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    kw: ['rush'],
    art: '🍣',
    text: '《突進》\n【ファンファーレ】カードを2枚引く',
    flavor: '次々流れてくるのがたまらない。',
    fanfare: (c) => {
      c.draw(2);
    },
  }),
  follower({
    id: 'n_ninja',
    name: 'シャドウ忍者',
    cls: 'neutral',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 1,
    kw: ['ambush'],
    art: '🥷',
    text: '《潜伏》',
    flavor: '既読をつけずに読むプロ。',
  }),
  spell({
    id: 'n_charge',
    name: 'ドパミンチャージ',
    cls: 'neutral',
    cost: 1,
    rarity: 'silver',
    art: '⚡',
    text: '自分のフォロワー1体を+1/+1。カードを1枚引く',
    flavor: 'ビリッときて、もう1枚。',
    target: { kind: 'allyFollower' },
    spell: (c) => {
      c.buff(c.targetCard(), 1, 1);
      c.draw(1);
    },
  }),
  spell({
    id: 'n_hammer',
    name: 'ピコピコハンマー',
    cls: 'neutral',
    cost: 2,
    rarity: 'silver',
    art: '🔨',
    text: '相手のフォロワー1体に3ダメージ',
    flavor: 'ピコッ（3ダメージ）',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, 3);
    },
  }),
  // ---------------- gold
  follower({
    id: 'n_pinata',
    name: '爆裂ピニャータ',
    cls: 'neutral',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 3,
    kw: ['rush'],
    art: '🪅',
    text: '《突進》\n【ラストワード】相手のフォロワーすべてに2ダメージ',
    flavor: '割ったら中身が爆発した。',
    lastWords: (c) => {
      c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'n_lucky7',
    name: 'ラッキーセブン',
    cls: 'neutral',
    cost: 7,
    rarity: 'gold',
    atk: 7,
    hp: 7,
    art: '7️⃣',
    text: '【ファンファーレ】ランダムな相手のフォロワーかリーダーに1ダメージを7回',
    flavor: '7・7・7！ 揃った瞬間がいちばん気持ちいい。',
    fanfare: (c) => {
      c.ping(7, 1);
    },
  }),
  spell({
    id: 'n_reset',
    name: 'ハイパーリセット',
    cls: 'neutral',
    cost: 4,
    rarity: 'gold',
    art: '💥',
    text: 'すべてのフォロワーに3ダメージ',
    flavor: '全部消して、もう一回。',
    spell: (c) => {
      c.dmgAll(c.allFollowers(), 3);
    },
  }),
  spell({
    id: 'n_energy',
    name: 'エナドリ',
    cls: 'neutral',
    cost: 4,
    rarity: 'gold',
    art: '🥤',
    text: '自分のPP最大値+1。カードを1枚引く',
    flavor: '翼は授からないが、PPは授かる。',
    spell: (c) => {
      c.maxPp(1);
      c.draw(1);
    },
  }),
  // ---------------- legend
  follower({
    id: 'n_king',
    name: 'ドーパミン大王',
    cls: 'neutral',
    cost: 8,
    rarity: 'legend',
    atk: 6,
    hp: 6,
    kw: ['storm'],
    art: '🤴',
    art2: '👑',
    text: '《疾走》【ファンファーレ】自分のDOPAゲージを満タンにする',
    flavor: '「足りぬ……刺激が足りぬぞ！」',
    fanfare: (c) => {
      c.fillDopa();
    },
  }),
  follower({
    id: 'n_unicorn',
    name: 'ネオンユニコーン',
    cls: 'neutral',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 4,
    art: '🦄',
    text: '【ファンファーレ】自分の他のフォロワーすべてを+1/+1\n【進化時】自分のリーダーを4回復',
    flavor: '光るたてがみは、見るだけでアガる。',
    fanfare: (c) => {
      c.buffAll(c.allies(false), 1, 1);
    },
    evolve: (c) => {
      c.heal(4);
    },
  }),

  // ---------------- 追加カード
  follower({
    id: 'n_bubble',
    name: 'シャボン玉スナイパー',
    cls: 'neutral',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🫧',
    text: '【ファンファーレ】相手のフォロワー1体に1ダメージ',
    flavor: '割れる瞬間を、狙い撃つ。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'small',
    fanfare: (c) => {
      c.dmg(c.target, 1);
    },
  }),
  follower({
    id: 'n_cushion',
    name: 'もちもちクッション',
    cls: 'neutral',
    cost: 3,
    rarity: 'bronze',
    atk: 1,
    hp: 5,
    kw: ['ward'],
    art: '🧸',
    text: '《守護》\n【ラストワード】自分のリーダーを2回復',
    flavor: '一度座ると、もう立てない。',
    lastWords: (c) => {
      c.heal(2);
    },
  }),
  spell({
    id: 'n_mirror',
    name: 'ミラーの魔法',
    cls: 'neutral',
    cost: 3,
    rarity: 'silver',
    art: '🪞',
    text: '自分のフォロワー1体を選び、それと同じフォロワーを1体出す',
    flavor: '鏡の中のキミも、なかなかやるじゃん。',
    target: { kind: 'allyFollower' },
    spell: (c) => {
      const t = c.targetCard();
      if (t) c.summon(t.id);
    },
  }),
  follower({
    id: 'n_tiger',
    name: 'ネオンタイガー',
    cls: 'neutral',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 5,
    kw: ['storm'],
    art: '🐯',
    text: '《疾走》\n【進化時】相手のフォロワーすべてに1ダメージ',
    flavor: '夜の街を、光の速さで駆け抜ける。',
    evolve: (c) => {
      c.dmgAll(c.enemies(), 1);
    },
  }),
  follower({
    id: 'n_god',
    name: 'ドパミンの神',
    cls: 'neutral',
    cost: 9,
    rarity: 'legend',
    atk: 7,
    hp: 7,
    kw: ['ward'],
    art: '🌞',
    art2: '✨',
    text: '《守護》\n【ファンファーレ】相手のフォロワーすべてに3ダメージ。自分のリーダーを5回復。カードを2枚引く',
    flavor: '「汝、もっと刺激を求めよ」',
    fanfare: (c) => {
      c.dmgAll(c.enemies(), 3);
      c.heal(5);
      c.draw(2);
    },
  }),
];
