import { amulet, follower, spell } from './util';

// ジュエラー: one card, three shapes. With too little PP a card can be played
// via 【アクセラレートX】 (as a cheap spell) or 【結晶X】 (as a countdown amulet
// that hatches into the follower); with plenty of PP, 【エンハンスX】 powers it up.
const enhanced = (_s: unknown, _c: unknown, info: { enhanced: boolean }) => info.enhanced;

export const JEWEL = [
  // ---------------- bronze
  follower({
    id: 'j_polisher',
    name: '研磨職人',
    cls: 'jewel',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '👩‍🔬',
    text: '【ファンファーレ】ランダムな相手のフォロワーに1ダメージ\n【エンハンス4】かわりに相手のフォロワー1体に3ダメージ',
    flavor: '1日8時間、石とにらめっこ。',
    enhance: 4,
    target: { kind: 'enemyFollower', cond: enhanced },
    aiPrefer: 'big',
    fanfare: (c) => {
      if (c.enhanced) c.dmg(c.target, 3);
      else c.pingFollowers(1, 1);
    },
  }),
  follower({
    id: 'j_ruby',
    name: 'ルビーの指輪',
    cls: 'jewel',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '💍',
    text: '【ファンファーレ】ランダムな相手のフォロワーに2ダメージ\n【アクセラレート1】ランダムな相手のフォロワーに2ダメージ',
    flavor: '燃えるような赤。指にはめると熱い。',
    accel: 1,
    accelerate: (c) => c.pingFollowers(1, 2),
    fanfare: (c) => c.pingFollowers(1, 2),
  }),
  follower({
    id: 'j_pearl',
    name: '真珠の守り手',
    cls: 'jewel',
    cost: 4,
    rarity: 'bronze',
    atk: 3,
    hp: 5,
    kw: ['ward'],
    art: '🦪',
    text: '《守護》\n【ファンファーレ】自分のリーダーを3回復\n【結晶2】カウントダウン1',
    flavor: '殻の中で、ゆっくり輝きを育てる。',
    crystal: 2,
    crystalCd: 1,
    fanfare: (c) => {
      c.heal(3);
    },
  }),
  follower({
    id: 'j_sapphire',
    name: 'サファイアの騎士',
    cls: 'jewel',
    cost: 5,
    rarity: 'bronze',
    atk: 5,
    hp: 5,
    art: '🔷',
    text: '【ファンファーレ】カードを1枚引く\n【アクセラレート2】カードを2枚引く',
    flavor: '青い誓いは、決して割れない。',
    accel: 2,
    accelerate: (c) => {
      c.draw(2);
    },
    fanfare: (c) => {
      c.draw(1);
    },
  }),
  spell({
    id: 'j_flash',
    name: '輝きの一撃',
    cls: 'jewel',
    cost: 2,
    rarity: 'bronze',
    art: '🔆',
    text: '相手のフォロワー1体に3ダメージ\n【エンハンス5】かわりに相手のフォロワーすべてに3ダメージ',
    flavor: 'まぶしすぎて、目をつぶった隙に。',
    enhance: 5,
    target: { kind: 'enemyFollower', cond: (_s, _c, info) => !info.enhanced },
    aiPrefer: 'big',
    spell: (c) => {
      if (c.enhanced) c.dmgAll(c.enemies(), 3);
      else c.dmg(c.target, 3);
    },
  }),
  follower({
    id: 'j_emerald',
    name: 'エメラルドの巨兵',
    cls: 'jewel',
    cost: 6,
    rarity: 'bronze',
    atk: 6,
    hp: 6,
    art: '⛰️',
    art2: '💚',
    text: '【ファンファーレ】ランダムな相手のフォロワーに3ダメージ\n【結晶2】カウントダウン2',
    flavor: '山ひとつ分の、エメラルド。',
    crystal: 2,
    crystalCd: 2,
    fanfare: (c) => c.pingFollowers(1, 3),
  }),
  follower({
    id: 'j_amethyst',
    name: 'アメジストの魔女',
    cls: 'jewel',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    art: '💜',
    text: '【ファンファーレ】カードを1枚引く\n【エンハンス6】かわりに3枚引く',
    flavor: '紫は、知恵の色。',
    enhance: 6,
    fanfare: (c) => {
      c.draw(c.enhanced ? 3 : 1);
    },
  }),
  amulet({
    id: 'j_showcase',
    name: 'ショーケース',
    cls: 'jewel',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '🪟',
    text: '【カウントダウン3】\n【ファンファーレ】カードを1枚引く\n【自分のターン開始時】自分の「結晶」すべてのカウントダウンを1進める。「結晶」がなければ、ランダムな相手のフォロワーに1ダメージ',
    flavor: 'ライトアップすると、宝石が目を覚ます。',
    aiValue: 3,
    turnStart: (c) => {
      if (c.crystals().length) c.advanceCrystals(1);
      else c.pingFollowers(1, 1);
    },
    fanfare: (c) => {
      c.draw(1);
    },
  }),
  // ---------------- silver
  follower({
    id: 'j_diamond',
    name: 'ダイヤの番人',
    cls: 'jewel',
    cost: 7,
    rarity: 'silver',
    atk: 6,
    hp: 7,
    kw: ['ward'],
    art: '💎',
    art2: '🛡️',
    text: '《守護》\n【ファンファーレ】相手のフォロワーすべてに2ダメージ\n【結晶3】カウントダウン2',
    flavor: '世界でいちばん硬い、門番。',
    crystal: 3,
    crystalCd: 2,
    fanfare: (c) => c.dmgAll(c.enemies(), 2),
  }),
  follower({
    id: 'j_topaz',
    name: 'トパーズの弓兵',
    cls: 'jewel',
    cost: 4,
    rarity: 'silver',
    atk: 4,
    hp: 4,
    art: '🔶',
    text: '【ファンファーレ】相手のフォロワー1体に2ダメージ\n【アクセラレート1】ランダムな相手のフォロワーかリーダーに1ダメージを2回',
    flavor: '金色の矢は、夕陽のように飛ぶ。',
    target: { kind: 'enemyFollower' },
    accel: 1,
    fanfare: (c) => {
      c.dmg(c.target, 2);
    },
    accelerate: (c) => c.ping(2, 1),
  }),
  spell({
    id: 'j_cut',
    name: 'ブリリアントカット',
    cls: 'jewel',
    cost: 1,
    rarity: 'silver',
    art: '✂️',
    text: 'カードを1枚引く\n【エンハンス4】かわりに2枚引き、PPを1回復',
    flavor: '58面体。全部の面で、きみを映す。',
    enhance: 4,
    spell: (c) => {
      if (c.enhanced) {
        c.draw(2);
        c.pp(1);
      } else c.draw(1);
    },
  }),
  follower({
    id: 'j_opal',
    name: 'オパールの道化',
    cls: 'jewel',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🤡',
    text: '【ファンファーレ】カードを1枚引く\n【アクセラレート0】カードを1枚引く',
    flavor: '見るたびに色が変わる。性格も変わる。',
    accel: 0,
    accelerate: (c) => {
      c.draw(1);
    },
    fanfare: (c) => {
      c.draw(1);
    },
  }),
  amulet({
    id: 'j_tiara',
    name: 'リボンのティアラ',
    cls: 'jewel',
    cost: 2,
    rarity: 'silver',
    countdown: 3,
    art: '🎀',
    text: '【カウントダウン3】\n【自分のターン開始時】ランダムな相手のフォロワーに2ダメージ。自分の「結晶」があれば、かわりに3ダメージ',
    flavor: 'かわいいは、正義。正義は、痛い。',
    aiValue: 3,
    turnStart: (c) => c.pingFollowers(1, c.crystals().length ? 3 : 2),
  }),
  follower({
    id: 'j_garnet',
    name: 'ガーネットの竜騎士',
    cls: 'jewel',
    cost: 5,
    rarity: 'silver',
    atk: 4,
    hp: 5,
    art: '🏇',
    text: '【ファンファーレ】ランダムな相手のフォロワーに2ダメージ\n【エンハンス8】かわりに《守護》を得て、相手のフォロワー1体を破壊する',
    flavor: '真紅の鎧は、勝利の数だけ深くなる。',
    enhance: 8,
    target: { kind: 'enemyFollower', cond: enhanced },
    aiPrefer: 'big',
    fanfare: (c) => {
      if (!c.enhanced) return c.pingFollowers(1, 2);
      c.give(c.self, 'ward');
      c.destroy(c.targetCard());
    },
  }),
  // ---------------- gold
  spell({
    id: 'j_starsapphire',
    name: 'スターサファイア',
    cls: 'jewel',
    cost: 6,
    rarity: 'gold',
    art: '⭐',
    art2: '🔷',
    text: '相手のフォロワーすべてに4ダメージ\n【アクセラレート2】ランダムな相手のフォロワーに4ダメージ',
    flavor: '中に、星がひとつ閉じこめられている。',
    accel: 2,
    spell: (c) => c.dmgAll(c.enemies(), 4),
    accelerate: (c) => c.pingFollowers(1, 4),
  }),
  follower({
    id: 'j_titan',
    name: '宝石巨兵',
    cls: 'jewel',
    cost: 9,
    rarity: 'gold',
    atk: 8,
    hp: 8,
    kw: ['ward'],
    art: '🗿',
    art2: '💎',
    text: '《守護》\n【結晶3】カウントダウン2\n【ファンファーレ】相手のフォロワーすべてに3ダメージ',
    flavor: '目覚めるまで、千年かかった。',
    crystal: 3,
    crystalCd: 2,
    fanfare: (c) => c.dmgAll(c.enemies(), 3),
  }),
  follower({
    id: 'j_dealer',
    name: '宝石商',
    cls: 'jewel',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 5,
    art: '🤵',
    text: '【ファンファーレ】自分の「結晶」すべてのカウントダウンを0にする（すぐに中身が出る）。「結晶」がなければ、カードを1枚引く',
    flavor: '「今が、いちばんの売りどきですよ」',
    fanfare: (c) => {
      if (c.crystals().length) c.advanceCrystals(99);
      else c.draw(1);
    },
  }),
  spell({
    id: 'j_prism',
    name: 'プリズムの輝き',
    cls: 'jewel',
    cost: 3,
    rarity: 'gold',
    art: '🌈',
    text: 'ランダムな相手のフォロワーに2ダメージを3回\n【エンハンス6】かわりに3ダメージを3回',
    flavor: '光を七つに分けて、七倍たのしい。',
    enhance: 6,
    spell: (c) => c.pingFollowers(3, c.enhanced ? 3 : 2),
  }),
  // ---------------- legend
  follower({
    id: 'j_jewelia',
    name: '宝石の女王ジュエリア',
    cls: 'jewel',
    cost: 8,
    rarity: 'legend',
    atk: 7,
    hp: 7,
    art: '👸',
    art2: '💎',
    text: '【結晶3】カウントダウン2\n【ファンファーレ】相手のフォロワーすべてを破壊する\n【結晶から出たとき】相手のフォロワーすべてに3ダメージ',
    flavor: '「わたしより輝くものは、要らないの」',
    crystal: 3,
    crystalCd: 2,
    fanfare: (c) => {
      for (const e of c.enemies()) c.destroy(e);
    },
    onHatch: (c) => c.dmgAll(c.enemies(), 3),
  }),
  follower({
    id: 'j_prisma',
    name: '虹晶竜プリズマ',
    cls: 'jewel',
    cost: 6,
    rarity: 'legend',
    atk: 5,
    hp: 5,
    art: '🦎',
    art2: '🌈',
    text: '【ファンファーレ】ランダムな相手のフォロワーに3ダメージ\n【アクセラレート3】相手のフォロワーすべてに2ダメージ。カードを1枚引く\n【エンハンス9】かわりに相手のフォロワーすべてを破壊し、《守護》を得る',
    flavor: '七色の鱗は、PPの数だけ姿を変える。',
    accel: 3,
    enhance: 9,
    fanfare: (c) => {
      if (c.enhanced) {
        for (const e of c.enemies()) c.destroy(e);
        c.give(c.self, 'ward');
      } else c.pingFollowers(1, 3);
    },
    accelerate: (c) => {
      c.dmgAll(c.enemies(), 2);
      c.draw(1);
    },
  }),
  amulet({
    id: 'j_kaleido',
    name: '万華鏡カレイドスコープ',
    cls: 'jewel',
    cost: 3,
    rarity: 'legend',
    countdown: 4,
    art: '🪩',
    text: '【カウントダウン4】\n【ファンファーレ】カードを1枚引く\n自分がアクセラレート・結晶・エンハンスでカードを使うたび、カードを1枚引き、相手のリーダーに1ダメージ',
    flavor: 'のぞくたびに、ちがう未来が見える。',
    aiValue: 5,
    fanfare: (c) => {
      c.draw(1);
    },
    onPlay: (c) => {
      if (c.altPlay) {
        c.draw(1);
        c.face(1);
      }
    },
  }),
];
