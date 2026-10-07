import { amulet, follower, spell } from './util';

export const SWEETS = [
  // ---------------- bronze
  follower({
    id: 'w_hiyoko',
    name: 'マカロンひよこ',
    cls: 'sweets',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🐤',
    text: '【ファンファーレ】自分のリーダーを2回復',
    flavor: 'ピヨッ（あまい）',
    fanfare: (c) => {
      c.heal(2);
    },
  }),
  follower({
    id: 'w_pudding',
    name: 'プリンガード',
    cls: 'sweets',
    cost: 2,
    rarity: 'bronze',
    atk: 1,
    hp: 5,
    kw: ['ward'],
    art: '🍮',
    text: '《守護》',
    flavor: 'ぷるんと受け止める。',
  }),
  spell({
    id: 'w_candy',
    name: 'キャンディ投げ',
    cls: 'sweets',
    cost: 1,
    rarity: 'bronze',
    art: '🍬',
    text: '相手のフォロワー1体に1ダメージ。自分のリーダーを3回復',
    flavor: '当たると痛い。舐めると甘い。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, 1);
      c.heal(3);
    },
  }),
  follower({
    id: 'w_donut',
    name: 'ドーナツマン',
    cls: 'sweets',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    art: '🍩',
    text: '自分のリーダーが回復するたび、+1/+0',
    flavor: '穴の分だけ、強くなる。',
    onHeal: (c) => c.buff(c.self, 1, 0),
  }),
  follower({
    id: 'w_cake',
    name: 'ショートケーキ騎士',
    cls: 'sweets',
    cost: 4,
    rarity: 'bronze',
    atk: 3,
    hp: 4,
    kw: ['drain'],
    art: '🍰',
    text: '《ドレイン》',
    flavor: 'いちごは最後まで取っておく派。',
  }),
  follower({
    id: 'w_parfait',
    name: 'パフェタワー',
    cls: 'sweets',
    cost: 5,
    rarity: 'bronze',
    atk: 3,
    hp: 6,
    kw: ['ward'],
    art: '🍨',
    text: '《守護》【ファンファーレ】自分のリーダーを3回復',
    flavor: '層が多いほど、幸せも多い。',
    fanfare: (c) => {
      c.heal(3);
    },
  }),
  // ---------------- silver
  follower({
    id: 'w_cookie',
    name: 'クッキーモンスター',
    cls: 'sweets',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🍪',
    text: '【ラストワード】「キャンディ」を1枚手札に加える',
    flavor: '砕けても、おやつは残す。',
    lastWords: (c) => {
      c.addHand('t_candy');
    },
  }),
  follower({
    id: 'w_icecream',
    name: 'アイスの精',
    cls: 'sweets',
    cost: 3,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    art: '🍦',
    text: '【ファンファーレ】自分の他のフォロワー1体を+0/+2し、《守護》を与える',
    flavor: 'ひんやり、しっかり守る。',
    target: { kind: 'allyFollower' },
    fanfare: (c) => {
      const t = c.targetCard();
      c.buff(t, 0, 2);
      c.give(t, 'ward');
    },
  }),
  follower({
    id: 'w_bee',
    name: 'ハチミツ蜂',
    cls: 'sweets',
    cost: 2,
    rarity: 'silver',
    atk: 1,
    hp: 1,
    kw: ['storm', 'drain'],
    art: '🐝',
    text: '《疾走》《ドレイン》',
    flavor: '刺して、吸って、甘くなる。',
  }),
  spell({
    id: 'w_rush',
    name: 'シュガーラッシュ',
    cls: 'sweets',
    cost: 2,
    rarity: 'silver',
    art: '🍭',
    text: '自分のフォロワーすべてを+1/+0\n【シュガーハイ10】かわりに+1/+1し、カードを1枚引く',
    flavor: '血糖値スパイク、キメていこう。',
    spell: (c) => {
      if (c.sugarHigh(10)) {
        c.buffAll(c.allies(), 1, 1);
        c.draw(1);
      } else c.buffAll(c.allies(), 1, 0);
    },
  }),
  spell({
    id: 'w_choco',
    name: 'チョコ溶岩',
    cls: 'sweets',
    cost: 4,
    rarity: 'silver',
    art: '🍫',
    text: '相手のフォロワーすべてに2ダメージ。自分のリーダーを3回復',
    flavor: 'フォンダンショコラの中身が噴火した。',
    spell: (c) => {
      c.dmgAll(c.enemies(), 2);
      c.heal(3);
    },
  }),
  // ---------------- gold
  follower({
    id: 'w_golem',
    name: 'マジパンゴーレム',
    cls: 'sweets',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 5,
    art: '🧁',
    text: '自分のリーダーが回復するたび、ランダムな相手のフォロワー1体に1ダメージ',
    flavor: '甘い顔して、容赦ない。',
    onHeal: (c) => {
      c.dmg(c.pick(c.enemies()), 1);
    },
  }),
  amulet({
    id: 'w_fountain',
    name: 'チョコファウンテン',
    cls: 'sweets',
    cost: 3,
    rarity: 'gold',
    countdown: 3,
    art: '⛲',
    art2: '🍫',
    text: '【カウントダウン3】\n【自分のターン終了時】自分のリーダーを2回復。自分のフォロワーすべてを+0/+1',
    flavor: '永遠に流れ続けるチョコ。',
    aiValue: 4,
    turnEnd: (c) => {
      c.heal(2);
      c.buffAll(c.allies(), 0, 1);
    },
  }),
  follower({
    id: 'w_wedding',
    name: 'ウェディングケーキ巨人',
    cls: 'sweets',
    cost: 7,
    rarity: 'gold',
    atk: 5,
    hp: 7,
    kw: ['ward', 'drain'],
    art: '🎂',
    text: '《守護》《ドレイン》\n【ファンファーレ】【シュガーハイ15】+3/+3',
    flavor: '入刀したら、反撃された。',
    fanfare: (c) => {
      if (c.sugarHigh(15)) c.buff(c.self, 3, 3);
    },
  }),
  // ---------------- legend
  follower({
    id: 'w_amami',
    name: 'いちご女王アマミ',
    cls: 'sweets',
    cost: 6,
    rarity: 'legend',
    atk: 4,
    hp: 6,
    art: '🍓',
    art2: '👑',
    text: '【ファンファーレ】自分のリーダーの最大体力+5。自分のリーダーを5回復\n【進化時】【シュガーハイ10】相手のフォロワーすべてに3ダメージ',
    flavor: '「甘やかしてあげる。たっぷりと、ね」',
    fanfare: (c) => {
      c.maxHp(5);
      c.heal(5);
    },
    evolve: (c) => {
      if (c.sugarHigh(10)) c.dmgAll(c.enemies(), 3);
    },
  }),
  follower({
    id: 'w_cotton',
    name: 'わたあめドラゴン',
    cls: 'sweets',
    cost: 8,
    rarity: 'legend',
    atk: 6,
    hp: 8,
    art: '🐉',
    art2: '☁️',
    text: '【ファンファーレ】【シュガーハイ20】相手のフォロワーすべてを破壊する',
    flavor: 'ふわふわの口から、甘い破壊光線。',
    fanfare: (c) => {
      if (c.sugarHigh(20)) for (const e of c.enemies()) c.destroy(e);
    },
  }),
];
