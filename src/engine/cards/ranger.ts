import { amulet, follower, spell } from './util';

// レンジャー: a sentai team. 【連携X】 counts own followers that entered the board
// this battle; cards can 変身 (evolve) allies without evolve points, and some
// trigger whenever another ally evolves.
export const RANGER = [
  // ---------------- bronze
  follower({
    id: 'k_rookie',
    name: '新人隊員',
    cls: 'ranger',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🙋',
    text: '【ファンファーレ】「研修隊員」を1体出す',
    flavor: '入隊初日。ヘルメットが大きい。',
    fanfare: (c) => {
      c.summon('t_cadet');
    },
  }),
  follower({
    id: 'k_pink',
    name: 'ドパピンク',
    cls: 'ranger',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    kw: ['rush'],
    art: '🦸‍♀️',
    art2: '🩷',
    text: '《突進》\n【進化時】自分のリーダーを3回復し、「研修隊員」を1体出す\n【変身時】「研修隊員」をもう1体出し、自分のリーダーを2回復',
    flavor: '「みんなのハートは、わたしが守る！」',
    evolve: (c) => {
      c.heal(3);
      c.summon('t_cadet');
    },
    onTransform: (c) => {
      c.summon('t_cadet');
      c.heal(2);
    },
  }),
  follower({
    id: 'k_blue',
    name: 'ドパブルー',
    cls: 'ranger',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    kw: ['rush'],
    art: '🦸‍♂️',
    art2: '💙',
    text: '《突進》\n【進化時】カードを2枚引く\n【変身時】PPを2回復',
    flavor: '作戦担当。だいたい作戦どおりにいかない。',
    evolve: (c) => {
      c.draw(2);
    },
    onTransform: (c) => {
      c.pp(2);
    },
  }),
  follower({
    id: 'k_yellow',
    name: 'ドパイエロー',
    cls: 'ranger',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    kw: ['ward', 'rush'],
    art: '🦸',
    art2: '💛',
    text: '《守護》《突進》\n【進化時】相手のフォロワー1体に3ダメージ\n【変身時】ランダムな相手のフォロワーに3ダメージ',
    flavor: 'カレーと正義が大好き。',
    evoTarget: { kind: 'enemyFollower' },
    evolve: (c) => {
      c.dmg(c.target, 3);
    },
    onTransform: (c) => {
      c.pingFollowers(1, 3);
    },
  }),
  spell({
    id: 'k_call',
    name: '緊急招集',
    cls: 'ranger',
    cost: 2,
    rarity: 'bronze',
    art: '🚨',
    text: '「研修隊員」を2体出す\n【連携6】さらにカードを1枚引く',
    flavor: '休日でも、ベルが鳴ったら集合。',
    spell: (c) => {
      c.summon('t_cadet', 2);
      if (c.rallyAt(6)) c.draw(1);
    },
  }),
  amulet({
    id: 'k_base',
    name: '秘密基地',
    cls: 'ranger',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '🏢',
    text: '【カウントダウン3】\n【自分のターン開始時】「研修隊員」を1体出す',
    flavor: '入口は、駄菓子屋の奥。',
    aiValue: 3,
    turnStart: (c) => {
      c.summon('t_cadet');
    },
  }),
  follower({
    id: 'k_green',
    name: 'ドパグリーン',
    cls: 'ranger',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    kw: ['rush'],
    art: '🦸',
    art2: '💚',
    text: '《突進》\n【ファンファーレ】【連携5】自分の他のフォロワー1体を変身（進化）させる\n【変身時】自分の他のフォロワー1体を変身（進化）させる',
    flavor: '「さあ、一緒に変身だ！」',
    fanfare: (c) => {
      if (c.rallyAt(5)) c.evolve();
    },
    onTransform: (c) => {
      c.evolve();
    },
  }),
  spell({
    id: 'k_belt',
    name: '変身ベルト',
    cls: 'ranger',
    cost: 1,
    rarity: 'bronze',
    art: '💫',
    text: '自分のフォロワー1体を変身（進化）させる。進化ポイントは使わない',
    flavor: 'へーんしんっ！（ポーズ込み）',
    target: { kind: 'allyFollower', filter: (_s, c) => c.evolved === 0 },
    spell: (c) => {
      c.evolve(c.targetCard());
    },
  }),
  // ---------------- silver
  follower({
    id: 'k_black',
    name: 'ドパブラック',
    cls: 'ranger',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 2,
    kw: ['rush'],
    art: '🥷',
    art2: '🖤',
    text: '《突進》\n【進化時】相手のフォロワーすべてに1ダメージ\n【変身時】《潜伏》を得て、相手のリーダーに2ダメージ',
    flavor: 'クールなふりして、集合時間は誰より早い。',
    evolve: (c) => c.dmgAll(c.enemies(), 1),
    onTransform: (c) => {
      c.give(c.self, 'ambush');
      c.face(2);
    },
  }),
  follower({
    id: 'k_commander',
    name: '長官',
    cls: 'ranger',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '👨‍✈️',
    text: '【ファンファーレ】進化ポイント+1\n【自分のターン終了時】【連携5】自分の他の進化していないフォロワー1体を変身（進化）させる',
    flavor: '「出動を許可する！」（言いたいだけ）',
    aiValue: 3,
    fanfare: (c) => {
      c.addEp(1);
    },
    turnEnd: (c) => {
      if (c.rallyAt(5)) c.evolve();
    },
  }),
  spell({
    id: 'k_combo',
    name: '合体必殺技',
    cls: 'ranger',
    cost: 3,
    rarity: 'silver',
    art: '🌟',
    text: '相手のフォロワー1体に、自分の場のフォロワー1体につき2ダメージ',
    flavor: '全員で、同じポーズ！',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      c.dmg(c.target, c.allies().length * 2);
    },
  }),
  spell({
    id: 'k_assemble',
    name: '戦隊集結',
    cls: 'ranger',
    cost: 4,
    rarity: 'silver',
    art: '🎌',
    text: '「研修隊員」を3体出す\n【連携10】かわりに「ドパブルー」「ドパピンク」「ドパイエロー」を1体ずつ出す',
    flavor: '5人そろって……あれ、2人足りない。',
    spell: (c) => {
      if (c.rallyAt(10)) {
        c.summon('k_blue');
        c.summon('k_pink');
        c.summon('k_yellow');
      } else c.summon('t_cadet', 3);
    },
  }),
  spell({
    id: 'k_charge',
    name: 'エネルギー充填',
    cls: 'ranger',
    cost: 2,
    rarity: 'silver',
    art: '⚡',
    text: '進化ポイント+1。カードを1枚引く',
    flavor: 'ゲージ、満タン！',
    spell: (c) => {
      c.addEp(1);
      c.draw(1);
    },
  }),
  follower({
    id: 'k_reformed',
    name: '改心した怪人',
    cls: 'ranger',
    cost: 4,
    rarity: 'silver',
    atk: 4,
    hp: 4,
    art: '👾',
    text: '【ファンファーレ】【連携8】相手のフォロワー1体を破壊する',
    flavor: '「オレも、ヒーローになりたかったんだ」',
    target: { kind: 'enemyFollower', cond: (s, card) => s.players[card.owner].rally + 1 >= 8 },
    aiPrefer: 'big',
    fanfare: (c) => {
      if (c.target !== null && c.rallyAt(8)) c.destroy(c.targetCard());
    },
  }),
  // ---------------- gold
  follower({
    id: 'k_jet',
    name: 'ドパジェット',
    cls: 'ranger',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 5,
    art: '🛩️',
    text: '【ファンファーレ】「研修隊員」を2体出す\n【連携8】さらにそれらを変身（進化）させる',
    flavor: '空から、仲間を連れてくる。',
    fanfare: (c) => {
      const cadets = c.summon('t_cadet', 2);
      if (c.rallyAt(8)) for (const x of cadets) c.evolve(x);
    },
  }),
  spell({
    id: 'k_bazooka',
    name: '必殺ドパバズーカ',
    cls: 'ranger',
    cost: 5,
    rarity: 'gold',
    art: '🎯',
    art2: '💥',
    text: '相手のフォロワーすべてに3ダメージ\n【連携12】さらに相手のリーダーに3ダメージ',
    flavor: '全員の力を、ひとつに！（反動がすごい）',
    spell: (c) => {
      c.dmgAll(c.enemies(), 3);
      if (c.rallyAt(12)) c.face(3);
    },
  }),
  follower({
    id: 'k_gold',
    name: 'ドパゴールド',
    cls: 'ranger',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    kw: ['rush'],
    art: '🦸',
    art2: '🥇',
    text: '《突進》\n【ファンファーレ】自分の他のフォロワー1体を変身（進化）させる\n自分の他のフォロワーが進化するたび、相手のリーダーに1ダメージ\n【変身時】カードを2枚引く',
    flavor: '追加戦士は、だいたい金ピカ。',
    aiValue: 3,
    fanfare: (c) => {
      c.evolve();
    },
    onAllyEvolve: (c) => {
      c.face(1);
    },
    onTransform: (c) => {
      c.draw(2);
    },
  }),
  amulet({
    id: 'k_hq',
    name: 'ドパ本部',
    cls: 'ranger',
    cost: 3,
    rarity: 'gold',
    countdown: 3,
    art: '🗼',
    text: '【カウントダウン3】\n【ファンファーレ】進化ポイント+1\n自分のフォロワーが進化するたび、「研修隊員」を1体出す',
    flavor: '地下3階には、巨大ロボの格納庫。',
    aiValue: 4,
    fanfare: (c) => {
      c.addEp(1);
    },
    onAllyEvolve: (c) => {
      c.summon('t_cadet');
    },
  }),
  // ---------------- legend
  follower({
    id: 'k_red',
    name: '熱血隊長ドパレッド',
    cls: 'ranger',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 4,
    art: '🦸',
    art2: '❤️‍🔥',
    text: '【ファンファーレ】PPを3回復\n【超進化時】【連携6】自分の他のフォロワーすべてを変身（進化）させる',
    flavor: '「いくぞみんな！ 変身だぁぁ！」',
    fanfare: (c) => {
      c.pp(3);
    },
    superEvolve: (c) => {
      if (c.rallyAt(6)) for (const a of c.allies(false)) c.evolve(a);
    },
  }),
  follower({
    id: 'k_silver',
    name: '6番目の戦士シルバー',
    cls: 'ranger',
    cost: 4,
    rarity: 'legend',
    atk: 4,
    hp: 4,
    art: '🧑‍🚀',
    art2: '⚔️',
    text: '【ファンファーレ】進化ポイント+1\n【進化時】相手のフォロワー1体を破壊する',
    flavor: '「ひとりで十分……だったんだがな」',
    evoTarget: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      c.addEp(1);
    },
    evolve: (c) => {
      c.destroy(c.targetCard());
    },
  }),
  follower({
    id: 'k_kaiser',
    name: '合体巨神ドパカイザー',
    cls: 'ranger',
    cost: 8,
    rarity: 'legend',
    atk: 7,
    hp: 7,
    kw: ['ward'],
    art: '🦾',
    art2: '🔥',
    text: '《守護》\nこのバトルで場に出た自分のフォロワー3体につき、このカードのコスト-1\n【ファンファーレ】相手のフォロワーすべてに3ダメージ\n【連携15】さらに相手のリーダーに5ダメージ',
    flavor: '「完成！ 合体巨神、ドパカイザー！」',
    costFn: (s, card) => -Math.floor(s.players[card.owner].rally / 3),
    fanfare: (c) => {
      c.dmgAll(c.enemies(), 3);
      if (c.rallyAt(15)) c.face(5);
    },
  }),
];
