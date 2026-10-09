import { amulet, follower, spell } from './util';

// トレジャラー: collect 財宝 (4 cheap token spells) and use them; 【財宝X】 pays
// off once X 財宝 were used this battle. Some cards trigger whenever one is used.
export const TREASURE = [
  // ---------------- bronze
  follower({
    id: 'r_digger',
    name: '宝さがし少年',
    cls: 'treasure',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🧒',
    art2: '⛏️',
    text: '【ファンファーレ】ランダムな財宝を1枚手札に加える',
    flavor: '今日こそ、庭から金が出る。',
    fanfare: (c) => {
      c.addTreasure(1);
    },
  }),
  follower({
    id: 'r_parrot',
    name: '海賊オウム',
    cls: 'treasure',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🦜',
    text: '【ファンファーレ】【財宝2】+1/+0と《疾走》',
    flavor: '「タカラ！ タカラ！」',
    fanfare: (c) => {
      if (c.rich(2)) {
        c.buff(c.self, 1, 0);
        c.give(c.self, 'storm');
      }
    },
  }),
  spell({
    id: 'r_map',
    name: '宝の地図',
    cls: 'treasure',
    cost: 1,
    rarity: 'bronze',
    art: '🗺️',
    text: 'ランダムな財宝を2枚手札に加える',
    flavor: '×印は、だいたい海の上。',
    spell: (c) => {
      c.addTreasure(2);
    },
  }),
  follower({
    id: 'r_deckhand',
    name: '見習い甲板員',
    cls: 'treasure',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '⚓',
    text: '自分が財宝を使うたび、自分のリーダーを2回復',
    flavor: 'お給料は、金貨1枚から。',
    aiValue: 2,
    onPlay: (c) => {
      if (c.isTreasure(c.other)) c.heal(2);
    },
  }),
  amulet({
    id: 'r_chest',
    name: '開かずの宝箱',
    cls: 'treasure',
    cost: 2,
    rarity: 'bronze',
    countdown: 2,
    art: '📦',
    text: '【カウントダウン2】\n【ラストワード】ランダムな財宝を3枚手札に加える',
    flavor: 'カギは、2ターン後に見つかる。',
    aiValue: 3,
    lastWords: (c) => {
      c.addTreasure(3);
    },
  }),
  follower({
    id: 'r_safeguard',
    name: '金庫番',
    cls: 'treasure',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    kw: ['ward'],
    art: '💂',
    text: '《守護》\n【ファンファーレ】ランダムな財宝を1枚手札に加える',
    flavor: '暗証番号は、自分の誕生日。',
    fanfare: (c) => {
      c.addTreasure(1);
    },
  }),
  spell({
    id: 'r_cannon',
    name: '海賊砲',
    cls: 'treasure',
    cost: 2,
    rarity: 'bronze',
    art: '💥',
    text: '相手のフォロワー1体に3ダメージ\n【財宝4】さらに相手のリーダーに2ダメージ',
    flavor: '弾は金貨。もったいない。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      c.dmg(c.target, 3);
      if (c.rich(4)) c.face(2);
    },
  }),
  follower({
    id: 'r_bouncer',
    name: '海賊団の用心棒',
    cls: 'treasure',
    cost: 4,
    rarity: 'bronze',
    atk: 4,
    hp: 4,
    art: '🏴‍☠️',
    text: '【ファンファーレ】【財宝4】ランダムな相手のフォロワーに3ダメージ。《守護》を得る',
    flavor: '分け前は、山分けじゃなくて山盛りで。',
    fanfare: (c) => {
      if (c.rich(4)) {
        c.pingFollowers(1, 3);
        c.give(c.self, 'ward');
      }
    },
  }),
  // ---------------- silver
  follower({
    id: 'r_appraiser',
    name: '鑑定士',
    cls: 'treasure',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🧐',
    text: '【ファンファーレ】ランダムな財宝を1枚手札に加える\n【財宝3】さらにカードを1枚引く',
    flavor: '「いい仕事してますねぇ」',
    fanfare: (c) => {
      c.addTreasure(1);
      if (c.rich(3)) c.draw(1);
    },
  }),
  follower({
    id: 'r_firstmate',
    name: '副船長',
    cls: 'treasure',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🧔',
    art2: '🗡️',
    text: '自分が財宝を使うたび、ランダムな相手のフォロワーに1ダメージ',
    flavor: '船長より、だいたい働いてる。',
    aiValue: 2,
    onPlay: (c) => {
      if (c.isTreasure(c.other)) c.pingFollowers(1, 1);
    },
  }),
  spell({
    id: 'r_goldrain',
    name: '黄金の雨',
    cls: 'treasure',
    cost: 3,
    rarity: 'silver',
    art: '🌧️',
    art2: '🪙',
    text: '相手のフォロワーすべてに1ダメージ。ランダムな財宝を1枚手札に加える\n【財宝5】かわりに2ダメージ',
    flavor: '傘は、いらない。',
    spell: (c) => {
      c.dmgAll(c.enemies(), c.rich(5) ? 2 : 1);
      c.addTreasure(1);
    },
  }),
  amulet({
    id: 'r_tree',
    name: '金のなる木',
    cls: 'treasure',
    cost: 2,
    rarity: 'silver',
    countdown: 3,
    art: '🌳',
    art2: '🪙',
    text: '【カウントダウン3】\n【自分のターン開始時】ランダムな財宝を1枚手札に加える',
    flavor: '水やりは、毎朝ちゃんとした。',
    aiValue: 3,
    turnStart: (c) => {
      c.addTreasure(1);
    },
  }),
  follower({
    id: 'r_thief',
    name: '宝石どろぼう',
    cls: 'treasure',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    kw: ['ambush'],
    art: '🦝',
    text: '《潜伏》\n【攻撃時】ランダムな財宝を1枚手札に加える',
    flavor: 'キラキラしたものは、ぜんぶ自分のもの。',
    strike: (c) => {
      c.addTreasure(1);
    },
  }),
  follower({
    id: 'r_knight',
    name: '黄金騎士',
    cls: 'treasure',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🤺',
    text: '【ファンファーレ】相手のフォロワー1体に、このバトルで使った財宝の枚数のダメージ（最大5）',
    flavor: '鎧のローンが、あと30年。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      const n = Math.min(5, c.P.treasures);
      if (n) c.dmg(c.target, n);
    },
  }),
  // ---------------- gold
  follower({
    id: 'r_captain',
    name: '海賊船長ゴルド',
    cls: 'treasure',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    art: '🧑‍✈️',
    art2: '🏴‍☠️',
    text: '【ファンファーレ】ランダムな財宝を2枚手札に加え、それらのコストを0にする',
    flavor: '「野郎ども、全部タダだ！」',
    fanfare: (c) => {
      for (const t of c.addTreasure(2)) t.costMod = -9;
    },
  }),
  follower({
    id: 'r_ship',
    name: '黄金の海賊船',
    cls: 'treasure',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 6,
    kw: ['rush'],
    art: '⛵',
    art2: '✨',
    text: '《突進》\n【ファンファーレ】【財宝6】相手のフォロワーすべてに3ダメージ',
    flavor: '帆まで金箔。重くて進まない。',
    fanfare: (c) => {
      if (c.rich(6)) c.dmgAll(c.enemies(), 3);
    },
  }),
  spell({
    id: 'r_midas',
    name: '黄金の手',
    cls: 'treasure',
    cost: 4,
    rarity: 'gold',
    art: '🫳',
    art2: '✨',
    text: '相手のフォロワー1体を破壊する。ランダムな財宝を1枚手札に加える',
    flavor: 'さわったものが、ぜんぶ金になる。おにぎりも。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      c.destroy(c.targetCard());
      c.addTreasure(1);
    },
  }),
  spell({
    id: 'r_hoard',
    name: '財宝の山',
    cls: 'treasure',
    cost: 3,
    rarity: 'gold',
    art: '💰',
    text: '4種類の財宝を1枚ずつ手札に加える',
    flavor: '数えるだけで、日が暮れる。',
    spell: (c) => {
      c.allTreasures();
    },
  }),
  // ---------------- legend
  follower({
    id: 'r_queen',
    name: '海賊女王ベル',
    cls: 'treasure',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 4,
    art: '👸',
    art2: '🏴‍☠️',
    text: '【ファンファーレ】ランダムな財宝を2枚手札に加える\n自分が財宝を使うたび、相手のリーダーに1ダメージ。自分のリーダーを1回復',
    flavor: '「七つの海の宝は、ぜんぶ私の宝石箱」',
    aiValue: 4,
    fanfare: (c) => {
      c.addTreasure(2);
    },
    onPlay: (c) => {
      if (c.isTreasure(c.other)) {
        c.face(1);
        c.heal(1);
      }
    },
  }),
  follower({
    id: 'r_dragon',
    name: '財宝竜ファフニール',
    cls: 'treasure',
    cost: 8,
    rarity: 'legend',
    atk: 7,
    hp: 7,
    kw: ['ward'],
    art: '🐉',
    art2: '💰',
    text: '《守護》\nこのバトルで使った財宝2枚につき、このカードのコスト-1\n【ファンファーレ】相手のフォロワーすべてに、このバトルで使った財宝の枚数のダメージ（最大6）',
    flavor: '寝床は金貨。寝心地は最悪。',
    costFn: (s, card) => -Math.floor(s.players[card.owner].treasures / 2),
    fanfare: (c) => {
      const n = Math.min(6, c.P.treasures);
      if (n) c.dmgAll(c.enemies(), n);
    },
  }),
  amulet({
    id: 'r_eldorado',
    name: '黄金郷エルドラド',
    cls: 'treasure',
    cost: 4,
    rarity: 'legend',
    countdown: 3,
    art: '🏯',
    art2: '🌄',
    text: '【カウントダウン3】\n【ファンファーレ】ランダムな財宝を1枚手札に加える\n【自分のターン開始時】ランダムな財宝を2枚手札に加え、それらのコストを0にする',
    flavor: '地図にない国。入国審査は金貨1枚。',
    aiValue: 6,
    fanfare: (c) => {
      c.addTreasure(1);
    },
    turnStart: (c) => {
      for (const t of c.addTreasure(2)) t.costMod = -9;
    },
  }),
];
