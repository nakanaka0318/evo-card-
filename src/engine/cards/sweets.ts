import { amulet, follower, spell } from './util';

export const SWEETS = [
  // ---------------- bronze
  follower({
    id: 'w_hiyoko',
    name: 'マカロンひよこ',
    cls: 'sweets',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    art: '🐤',
    text: '【ラストワード】自分のリーダーを3回復し、カードを1枚引く',
    flavor: 'ピヨッ（あまい）',
    lastWords: (c) => {
      c.heal(3);
      c.draw(1);
    },
  }),
  follower({
    id: 'w_pudding',
    name: 'プリンガード',
    cls: 'sweets',
    cost: 2,
    rarity: 'bronze',
    atk: 1,
    hp: 3,
    art: '🍮',
    text: '自分のリーダーが回復するたび、ランダムな相手のフォロワーに1ダメージ',
    flavor: 'ぷるんと受け止める。',
    aiValue: 2,
    onHeal: (c) => c.pingFollowers(1, 1),
  }),
  spell({
    id: 'w_candy',
    name: 'キャンディ投げ',
    cls: 'sweets',
    cost: 1,
    rarity: 'bronze',
    art: '🍬',
    text: '相手のフォロワー1体に2ダメージ。自分のリーダーを3回復',
    flavor: '当たると痛い。舐めると甘い。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, 2);
      c.heal(3);
    },
  }),
  follower({
    id: 'w_donut',
    name: 'ドーナツマン',
    cls: 'sweets',
    cost: 3,
    rarity: 'bronze',
    atk: 1,
    hp: 4,
    kw: ['storm'],
    art: '🍩',
    text: '《疾走》\n自分のリーダーが回復するたび、+1/+0',
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
    art: '🍰',
    text: '【ファンファーレ】相手のフォロワー1体に3ダメージ\n【シュガーハイ15】かわりに破壊する',
    flavor: 'いちごは最後まで取っておく派。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      if (c.target === null) return;
      if (c.sugarHigh(15)) c.destroy(c.targetCard());
      else c.dmg(c.target, 3);
    },
  }),
  follower({
    id: 'w_parfait',
    name: 'パフェタワー',
    cls: 'sweets',
    cost: 5,
    rarity: 'bronze',
    atk: 4,
    hp: 6,
    kw: ['ward'],
    art: '🍨',
    text: '《守護》【ファンファーレ】自分のリーダーを3回復\n【進化時】「パフェタワー」を1体出す',
    flavor: '層が多いほど、幸せも多い。',
    fanfare: (c) => {
      c.heal(3);
    },
    evolve: (c) => {
      c.summon('w_parfait');
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
    hp: 3,
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
    text: '【ファンファーレ】相手のフォロワー1体を-3/-0（凍らせる）。自分のリーダーを2回復',
    flavor: 'ひんやり、しっかり守る。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      const t = c.targetCard();
      if (t) c.buff(t, -Math.min(3, c.atk(t)), 0);
      c.heal(2);
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
    text: '相手のフォロワー1体に2ダメージ。自分のリーダーを2回復\n【シュガーハイ10】かわりに4ダメージ',
    flavor: '血糖値スパイク、キメていこう。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, c.sugarHigh(10) ? 4 : 2);
      c.heal(2);
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
    text: '自分のリーダーが回復するたび、ランダムな相手のフォロワー1体に1ダメージ\n【進化時】【シュガーハイ20】相手のフォロワーすべてに5ダメージ',
    flavor: '甘い顔して、容赦ない。',
    onHeal: (c) => {
      c.dmg(c.pick(c.enemies()), 1);
    },
    evolve: (c) => {
      if (c.sugarHigh(20)) c.dmgAll(c.enemies(), 5);
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
    text: '【カウントダウン3】\n【自分のターン終了時】自分のリーダーを2回復。ランダムな相手のフォロワーに1ダメージ',
    flavor: '永遠に流れ続けるチョコ。',
    aiValue: 4,
    turnEnd: (c) => {
      c.heal(2);
      c.pingFollowers(1, 1);
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
    kw: ['ward', 'drain', 'rush'],
    art: '🎂',
    text: '《守護》《ドレイン》《突進》\n【ファンファーレ】【シュガーハイ15】相手のフォロワーすべてに3ダメージ',
    flavor: '入刀したら、反撃された。',
    fanfare: (c) => {
      if (c.sugarHigh(15)) c.dmgAll(c.enemies(), 3);
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

  // ---------------- 追加カード
  follower({
    id: 'w_berry',
    name: 'ブルーベリーゼリー',
    cls: 'sweets',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 3,
    art: '🫐',
    text: '【ファンファーレ】自分のリーダーを2回復',
    flavor: 'ぷるぷる、きらきら。',
    fanfare: (c) => {
      c.heal(2);
    },
  }),
  follower({
    id: 'w_tea',
    name: 'ミルクティー執事',
    cls: 'sweets',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🧋',
    text: '【ファンファーレ】自分のリーダーを3回復\n【シュガーハイ10】さらにカードを1枚引く',
    flavor: '「タピオカ、増量しておきました」',
    fanfare: (c) => {
      c.heal(3);
      if (c.sugarHigh(10)) c.draw(1);
    },
  }),
  amulet({
    id: 'w_oven',
    name: 'お菓子オーブン',
    cls: 'sweets',
    cost: 2,
    rarity: 'silver',
    countdown: 3,
    art: '🍳',
    text: '【カウントダウン3】\n【自分のターン終了時】「キャンディ」を1枚手札に加える',
    flavor: '焼きたての甘い匂いがする。',
    aiValue: 3,
    turnEnd: (c) => {
      c.addHand('t_candy');
    },
  }),
  follower({
    id: 'w_baker',
    name: 'パティシエ見習い',
    cls: 'sweets',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 5,
    art: '🧑‍🍳',
    text: '【ファンファーレ】自分のリーダーを4回復。「キャンディ」を2枚手札に加える\n【シュガーハイ15】さらに相手のフォロワーすべてに2ダメージ',
    flavor: '失敗作も、ちゃんと甘い。',
    fanfare: (c) => {
      c.heal(4);
      c.addHand('t_candy', 2);
      if (c.sugarHigh(15)) c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'w_pero',
    name: 'ペロペロ大王',
    cls: 'sweets',
    cost: 7,
    rarity: 'legend',
    atk: 5,
    hp: 7,
    kw: ['drain'],
    art: '👅',
    art2: '🍭',
    text: '《ドレイン》\n【ファンファーレ】自分のリーダーを10回復\n【シュガーハイ25】さらに相手のフォロワーすべてに4ダメージ',
    flavor: '「この国のお菓子は、ぜんぶ余のもの」',
    fanfare: (c) => {
      c.heal(10);
      if (c.sugarHigh(25)) c.dmgAll(c.enemies(), 4);
    },
  }),
];
