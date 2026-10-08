import { amulet, follower, spell } from './util';

// ガジェッター: collect パーツ (4 token types), play them or 【合体】 them into
// bigger machines; 【コンプリートX】 pays off once X different パーツ were used.
export const GADGET = [
  // ---------------- bronze
  follower({
    id: 'd_tinker',
    name: '見習いメカニック',
    cls: 'gadget',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🧑‍🔧',
    text: '【ファンファーレ】ランダムなパーツを1枚手札に加える',
    flavor: 'ネジを締めるのは、まだ3回に1回。',
    fanfare: (c) => {
      c.addParts(1);
    },
  }),
  follower({
    id: 'd_drone',
    name: 'ミニドローン',
    cls: 'gadget',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🚁',
    text: '【ファンファーレ】【合体1】取り込んだら+2/+1と《突進》',
    flavor: 'プロペラ1枚足りないけど、飛ぶ。',
    fanfare: (c) => {
      if (c.fuse(1).length) {
        c.buff(c.self, 2, 1);
        c.give(c.self, 'rush');
      }
    },
  }),
  spell({
    id: 'd_toolbox',
    name: '工具箱',
    cls: 'gadget',
    cost: 1,
    rarity: 'bronze',
    art: '🧰',
    text: 'ランダムなパーツを2枚手札に加える',
    flavor: '開けるたびに、知らない部品が出てくる。',
    spell: (c) => {
      c.addParts(2);
    },
  }),
  follower({
    id: 'd_rc',
    name: 'ラジコンカー',
    cls: 'gadget',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    kw: ['rush'],
    art: '🏎️',
    text: '《突進》\n【ファンファーレ】【コンプリート2】+1/+1',
    flavor: '電池が切れるまで、止まらない。',
    fanfare: (c) => {
      if (c.complete(2)) c.buff(c.self, 1, 1);
    },
  }),
  follower({
    id: 'd_arm',
    name: 'ロボットアーム',
    cls: 'gadget',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🦾',
    text: '【ファンファーレ】【合体2】取り込んだパーツ1枚につき+2/+2',
    flavor: 'つかんだものは、ぜんぶ部品。',
    fanfare: (c) => {
      const n = c.fuse(2).length;
      c.buff(c.self, n * 2, n * 2);
    },
  }),
  follower({
    id: 'd_scrap',
    name: 'スクラップゴーレム',
    cls: 'gadget',
    cost: 4,
    rarity: 'bronze',
    atk: 3,
    hp: 5,
    kw: ['ward'],
    art: '⚙️',
    text: '《守護》\n【ラストワード】ランダムなパーツを2枚手札に加える',
    flavor: '壊れても、部品は次に回す。',
    lastWords: (c) => {
      c.addParts(2);
    },
  }),
  spell({
    id: 'd_spark',
    name: 'ショートスパーク',
    cls: 'gadget',
    cost: 2,
    rarity: 'bronze',
    art: '🧨',
    text: '相手のフォロワー1体に2ダメージ\n【コンプリート3】かわりに4ダメージ',
    flavor: '配線ミスも、武器になる。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, c.complete(3) ? 4 : 2);
    },
  }),
  amulet({
    id: 'd_conveyor',
    name: 'ベルトコンベア',
    cls: 'gadget',
    cost: 1,
    rarity: 'bronze',
    countdown: 3,
    art: '🏗️',
    text: '【カウントダウン3】\n【自分のターン開始時】ランダムなパーツを1枚手札に加える',
    flavor: '部品は、勝手に流れてくる。',
    aiValue: 3,
    turnStart: (c) => {
      c.addParts(1);
    },
  }),
  // ---------------- silver
  follower({
    id: 'd_drill',
    name: 'ドリルモグラ',
    cls: 'gadget',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '⛏️',
    text: '【ファンファーレ】【合体1】取り込んだら《必殺》と《突進》を得る',
    flavor: '掘って、掘って、突き抜ける。',
    fanfare: (c) => {
      if (c.fuse(1).length) c.give(c.self, 'bane', 'rush');
    },
  }),
  follower({
    id: 'd_magnet',
    name: 'マグネット博士',
    cls: 'gadget',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🧲',
    text: '【ファンファーレ】ランダムなパーツを3枚山札に加える。カードを1枚引く',
    flavor: '「鉄のものは、ぜんぶ吾輩のもとへ！」',
    fanfare: (c) => {
      c.addParts(3, 'deck');
      c.draw(1);
    },
  }),
  spell({
    id: 'd_upgrade',
    name: 'アップグレード',
    cls: 'gadget',
    cost: 2,
    rarity: 'silver',
    art: '🛠️',
    text: '自分のフォロワー1体を+1/+1\n【合体2】取り込んだパーツ1枚につき、さらに+2/+2',
    flavor: 'バージョン2.0、配信開始。',
    target: { kind: 'allyFollower' },
    spell: (c) => {
      const t = c.targetCard();
      const n = c.fuse(2).length;
      c.buff(t, 1 + n * 2, 1 + n * 2);
    },
  }),
  follower({
    id: 'd_mechacat',
    name: 'メカネコ',
    cls: 'gadget',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🐈‍⬛',
    text: '【ファンファーレ】ランダムなパーツを1枚手札に加える\n【コンプリート2】さらにカードを1枚引く',
    flavor: 'しっぽはUSBケーブル。',
    fanfare: (c) => {
      c.addParts(1);
      if (c.complete(2)) c.draw(1);
    },
  }),
  amulet({
    id: 'd_assembly',
    name: '組み立てライン',
    cls: 'gadget',
    cost: 2,
    rarity: 'silver',
    countdown: 3,
    art: '🔨',
    text: '【カウントダウン3】\n【ファンファーレ】ランダムなパーツを1枚手札に加える\n自分がパーツをプレイするたび、それを+1/+1し《突進》を与える',
    flavor: 'ここを通ると、ちょっと強くなる。',
    aiValue: 3,
    fanfare: (c) => {
      c.addParts(1);
    },
    onPlay: (c) => {
      const o = c.other;
      if (o && o.id.startsWith('t_p') && c.alive(o)) {
        c.buff(o, 1, 1);
        c.give(o, 'rush');
      }
    },
  }),
  follower({
    id: 'd_jet',
    name: 'ジェットパック隊員',
    cls: 'gadget',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    kw: ['storm'],
    art: '🧑‍🚀',
    text: '《疾走》\n【ファンファーレ】【合体2】取り込んだパーツ1枚につき+2/+1',
    flavor: '燃料はバッテリー1個分。',
    fanfare: (c) => {
      const n = c.fuse(2).length;
      c.buff(c.self, n * 2, n);
    },
  }),
  // ---------------- gold
  follower({
    id: 'd_robo',
    name: '合体ロボ ガッタイン',
    cls: 'gadget',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    art: '🤖',
    art2: '🔧',
    text: '【ファンファーレ】【合体4】取り込んだパーツ1枚につき+2/+2。2枚以上なら《守護》、4枚なら《疾走》も得る',
    flavor: '「ガッ・タイーン！」（毎回言う）',
    fanfare: (c) => {
      const n = c.fuse(4).length;
      c.buff(c.self, n * 2, n * 2);
      if (n >= 2) c.give(c.self, 'ward');
      if (n >= 4) c.give(c.self, 'storm');
    },
  }),
  spell({
    id: 'd_emp',
    name: 'EMPボム',
    cls: 'gadget',
    cost: 4,
    rarity: 'gold',
    art: '💣',
    text: '相手のフォロワーすべてに2ダメージ\n【コンプリート4】かわりに4ダメージ',
    flavor: '電子機器は、すべて沈黙する。',
    spell: (c) => {
      c.dmgAll(c.enemies(), c.complete(4) ? 4 : 2);
    },
  }),
  follower({
    id: 'd_ace',
    name: 'エースメカニック',
    cls: 'gadget',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 4,
    art: '👷',
    text: '【ファンファーレ】4種類のパーツを1枚ずつ手札に加える',
    flavor: '工具を持たせたら、町一番。',
    fanfare: (c) => {
      c.allParts();
    },
  }),
  follower({
    id: 'd_ufo',
    name: 'ミステリーUFO',
    cls: 'gadget',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 6,
    art: '🛸',
    text: '【ファンファーレ】【合体3】取り込んだパーツ1枚につき、ランダムな相手のフォロワー1体に3ダメージ',
    flavor: '部品の出どころは、誰も知らない。',
    fanfare: (c) => {
      const n = c.fuse(3).length;
      for (let i = 0; i < n; i++) c.dmg(c.pick(c.enemies()), 3);
    },
  }),
  // ---------------- legend
  follower({
    id: 'd_gear',
    name: 'メカ姫ギア',
    cls: 'gadget',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 4,
    art: '👩‍🔧',
    art2: '⚙️',
    text: '【ファンファーレ】【合体4】取り込んだパーツと同じパーツを1体ずつ出す\n【コンプリート4】さらに自分のフォロワーすべてを+1/+1',
    flavor: '「設計図？ 頭の中にぜんぶあるわ」',
    fanfare: (c) => {
      for (const id of c.fuse(4)) c.summon(id);
      if (c.complete(4)) c.buffAll(c.allies(), 1, 1);
    },
  }),
  follower({
    id: 'd_mother',
    name: '超合金マザーシップ',
    cls: 'gadget',
    cost: 8,
    rarity: 'legend',
    atk: 6,
    hp: 8,
    kw: ['ward'],
    art: '🛰️',
    art2: '🌌',
    text: '《守護》\n【ファンファーレ】【合体4】取り込んだパーツ1枚につき+1/+1\n【コンプリート4】相手のフォロワーすべてを破壊する',
    flavor: '空が、まるごと機械になった。',
    fanfare: (c) => {
      const n = c.fuse(4).length;
      c.buff(c.self, n, n);
      if (c.complete(4)) for (const e of c.enemies()) c.destroy(e);
    },
  }),
  follower({
    id: 'd_eternal',
    name: '永久機関エターナル',
    cls: 'gadget',
    cost: 7,
    rarity: 'legend',
    atk: 5,
    hp: 5,
    art: '🌀',
    art2: '♾️',
    text: '【ファンファーレ】このバトルで使ったパーツの種類×2回（最大8回）、ランダムな相手のフォロワーかリーダーに1ダメージ\n【ラストワード】4種類のパーツを1枚ずつ手札に加える',
    flavor: '止まらない。止める方法も、誰も知らない。',
    fanfare: (c) => c.ping(Math.min(8, c.P.parts.length * 2), 1),
    lastWords: (c) => {
      c.allParts();
    },
  }),
];
