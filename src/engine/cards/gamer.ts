import { amulet, follower, spell } from './util';

export const GAMER = [
  // ---------------- bronze
  follower({
    id: 'm_slime',
    name: 'はじまりのスライム',
    cls: 'gamer',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '💧',
    text: '【レベル】EXP1ごとに+1/+1（最大Lv4）',
    flavor: '最初の敵にして、最初の仲間。',
    level: { exp: 1, max: 4, gain: [1, 1] },
  }),
  follower({
    id: 'm_hero',
    name: '見習い勇者',
    cls: 'gamer',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🤺',
    text: '【レベル】EXP1ごとに+1/+1（最大Lv4）',
    flavor: 'レベル上げは、裏切らない。',
    level: { exp: 1, max: 4, gain: [1, 1] },
  }),
  spell({
    id: 'm_potion',
    name: '経験値ポーション',
    cls: 'gamer',
    cost: 1,
    rarity: 'bronze',
    art: '🧪',
    text: '自分のフォロワー1体を+1/+1し、EXP+2',
    flavor: 'ゴクッ……テレレレッテッテー！',
    target: { kind: 'allyFollower' },
    spell: (c) => {
      const t = c.targetCard();
      c.buff(t, 1, 1);
      c.exp(t, 2);
    },
  }),
  follower({
    id: 'm_tank',
    name: 'タンク職',
    cls: 'gamer',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    kw: ['ward'],
    art: '🛡️',
    text: '《守護》\n【課金5】+3/+3\n【進化時】相手のフォロワー1体に3ダメージ',
    flavor: 'ヘイトは全部、俺が買う。',
    enhance: 5,
    fanfare: (c) => {
      if (c.enhanced) c.buff(c.self, 3, 3);
    },
    evoTarget: { kind: 'enemyFollower' },
    evolve: (c) => {
      c.dmg(c.target, 3);
    },
  }),
  follower({
    id: 'm_archer',
    name: 'アーチャー',
    cls: 'gamer',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '🏹',
    text: '【課金6】+2/+0と《疾走》を得る',
    flavor: '後衛だけど、前に出たい。',
    enhance: 6,
    fanfare: (c) => {
      if (c.enhanced) {
        c.buff(c.self, 2, 0);
        c.give(c.self, 'storm');
      }
    },
  }),
  follower({
    id: 'm_boss',
    name: '中ボス',
    cls: 'gamer',
    cost: 5,
    rarity: 'bronze',
    atk: 5,
    hp: 5,
    art: '👹',
    text: '【ファンファーレ】相手のフォロワー1体に5ダメージ\n【課金7】さらに相手のリーダーに5ダメージ',
    flavor: '「フフフ……ここまで来たか」（3回目）',
    enhance: 7,
    target: { kind: 'enemyFollower' },
    fanfare: (c) => {
      c.dmg(c.target, 5);
      if (c.enhanced) c.face(5);
    },
  }),
  // ---------------- silver
  follower({
    id: 'm_card',
    name: '課金カード兵',
    cls: 'gamer',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '💳',
    text: '【課金4】+3/+3と《突進》《守護》《必殺》を得る',
    flavor: '強さは、お金で買える（PPで）。',
    enhance: 4,
    fanfare: (c) => {
      if (c.enhanced) {
        c.buff(c.self, 3, 3);
        c.give(c.self, 'rush', 'ward', 'bane');
      }
    },
  }),
  follower({
    id: 'm_healer',
    name: 'ヒーラー',
    cls: 'gamer',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    art: '🧝',
    text: '【ファンファーレ】自分のリーダーを2回復。ランダムな自分の他のフォロワー1体にEXP+1',
    flavor: '回復が遅いと怒られる職業。',
    fanfare: (c) => {
      c.heal(2);
      c.exp(c.pick(c.allies(false)), 1);
    },
  }),
  spell({
    id: 'm_skill',
    name: '必殺技',
    cls: 'gamer',
    cost: 2,
    rarity: 'silver',
    art: '🎯',
    text: '相手のフォロワー1体に3ダメージ\n【課金3】かわりに5ダメージを与え、自分のフォロワーすべてにEXP+1',
    flavor: 'ゲージ満タンで出すと気持ちいい。',
    enhance: 3,
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      if (c.enhanced) {
        c.dmg(c.target, 5);
        for (const a of c.allies()) c.exp(a, 1);
      } else c.dmg(c.target, 3);
    },
  }),
  amulet({
    id: 'm_login',
    name: 'ログインボーナス',
    cls: 'gamer',
    cost: 1,
    rarity: 'silver',
    countdown: 3,
    art: '📅',
    text: '【カウントダウン3】\n【自分のターン開始時】自分のフォロワーすべてにEXP+1\n【ラストワード】カードを1枚引く',
    flavor: '毎日来れば、毎日もらえる。',
    aiValue: 2,
    turnStart: (c) => {
      for (const a of c.allies()) c.exp(a, 1);
    },
    lastWords: (c) => {
      c.draw(1);
    },
  }),
  follower({
    id: 'm_wizard',
    name: '魔法使い',
    cls: 'gamer',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '🧙',
    text: '【レベル】EXP1ごとに+1/+1（最大Lv3）\nレベルアップするたび、相手のフォロワーすべてに1ダメージ',
    flavor: '経験を積むほど、範囲が広がる。',
    level: { exp: 1, max: 3, gain: [1, 1] },
    onLevelUp: (c) => c.dmgAll(c.enemies(), 1),
  }),
  // ---------------- gold
  follower({
    id: 'm_raid',
    name: 'レイドボス',
    cls: 'gamer',
    cost: 7,
    rarity: 'gold',
    atk: 6,
    hp: 7,
    kw: ['ward'],
    art: '🐙',
    text: '《守護》\n【課金9】【ファンファーレ】相手のフォロワーすべてに4ダメージ',
    flavor: '参加者30人推奨。',
    enhance: 9,
    fanfare: (c) => {
      if (c.enhanced) c.dmgAll(c.enemies(), 4);
    },
  }),
  follower({
    id: 'm_brave',
    name: '伝説の勇者',
    cls: 'gamer',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 4,
    kw: ['barrier'],
    art: '🦸',
    text: '《バリア》\n【レベル】EXP2ごとに+2/+2（最大Lv4）\nLv4になったとき《連撃》を得る',
    flavor: 'カンストした先に、伝説がある。',
    level: { exp: 2, max: 4, gain: [2, 2] },
    onLevelUp: (c) => {
      if (c.self.level >= 4) c.give(c.self, 'twin');
    },
  }),
  follower({
    id: 'm_mimic',
    name: '宝箱ミミック',
    cls: 'gamer',
    cost: 3,
    rarity: 'gold',
    atk: 3,
    hp: 3,
    kw: ['rush', 'bane'],
    art: '📦',
    text: '《突進》《必殺》\n【ラストワード】ランダムな自分のフォロワー1体を+1/+1し、EXP+3',
    flavor: '開けたら噛まれた。でも中身は本物。',
    lastWords: (c) => {
      const t = c.pick(c.allies());
      c.buff(t, 1, 1);
      c.exp(t, 3);
    },
  }),
  // ---------------- legend
  follower({
    id: 'm_level',
    name: 'ゲーマー レベル丸',
    cls: 'gamer',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 5,
    art: '👾',
    art2: '🎮',
    text: '【ファンファーレ】自分の他のフォロワーすべてにEXP+2\n【レベル】EXP2ごとに+2/+2（最大Lv3）',
    flavor: '「睡眠？ それってデバフ？」',
    level: { exp: 2, max: 3, gain: [2, 2] },
    fanfare: (c) => {
      for (const a of c.allies(false)) c.exp(a, 2);
    },
  }),
  follower({
    id: 'm_maou',
    name: '魔王ラスボス',
    cls: 'gamer',
    cost: 9,
    rarity: 'legend',
    atk: 8,
    hp: 8,
    kw: ['ward'],
    art: '👿',
    art2: '🏰',
    text: '《守護》\n【課金10】【ファンファーレ】相手のフォロワーすべてを破壊する',
    flavor: '「よくぞ来た。だが課金が足りぬ」',
    enhance: 10,
    fanfare: (c) => {
      if (c.enhanced) for (const e of c.enemies()) c.destroy(e);
    },
  }),
];
