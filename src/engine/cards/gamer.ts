import { amulet, follower, spell } from './util';
import { atkOf, hpOf } from '../core';

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
    hp: 3,
    kw: ['ward'],
    art: '🛡️',
    text: '《守護》\n【レベル】EXP1ごとに+0/+2（最大Lv3）\n【レベルアップ時】自分のリーダーを2回復\n【課金5】【ファンファーレ】EXP+2。ランダムな相手のフォロワーに3ダメージ',
    flavor: 'ヘイトは全部、俺が買う。',
    enhance: 5,
    level: { exp: 1, max: 3, gain: [0, 2] },
    fanfare: (c) => {
      if (!c.enhanced) return;
      c.exp(c.self, 2);
      c.pingFollowers(1, 3);
    },
    onLevelUp: (c) => {
      c.heal(2);
    },
  }),
  follower({
    id: 'm_archer',
    name: 'アーチャー',
    cls: 'gamer',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🏹',
    text: '【レベル】EXP1ごとに+1/+0（最大Lv3）\n【レベルアップ時】ランダムな相手のフォロワーに1ダメージ\n【ファンファーレ】ランダムな相手のフォロワーに、このフォロワーの攻撃力と同じダメージ\n【課金6】先にEXP+2',
    flavor: '後衛だけど、前に出たい。',
    enhance: 6,
    level: { exp: 1, max: 3, gain: [1, 0] },
    fanfare: (c) => {
      if (c.enhanced) c.exp(c.self, 2);
      c.pingFollowers(1, atkOf(c.s, c.self));
    },
    onLevelUp: (c) => c.pingFollowers(1, 1),
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
    atk: 5,
    hp: 8,
    kw: ['ward'],
    art: '🐙',
    text: '《守護》\n【自分のターン終了時】自分の他のフォロワーすべてにEXP+1\n【課金9】【ファンファーレ】相手のフォロワーすべてに3ダメージ。自分の他のフォロワーすべてにEXP+2',
    flavor: '参加者30人推奨。',
    enhance: 9,
    aiValue: 3,
    fanfare: (c) => {
      if (!c.enhanced) return;
      c.dmgAll(c.enemies(), 3);
      for (const a of c.allies(false)) c.exp(a, 2);
    },
    turnEnd: (c) => {
      for (const a of c.allies(false)) c.exp(a, 1);
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
    cost: 8,
    rarity: 'legend',
    atk: 6,
    hp: 6,
    kw: ['ward'],
    art: '👿',
    art2: '🏰',
    text: '《守護》\n【ファンファーレ】相手のフォロワーすべてに3ダメージ\n【課金10】かわりに相手のフォロワーすべてを破壊する\n【ラストワード】「魔王ラスボス 第二形態」を1体出す',
    flavor: '「よくぞ来た。だが課金が足りぬ」',
    enhance: 10,
    fanfare: (c) => {
      if (c.enhanced) for (const e of c.enemies()) c.destroy(e);
      else c.dmgAll(c.enemies(), 3);
    },
    lastWords: (c) => {
      c.summon('t_maou2');
    },
  }),

  // ---------------- 追加カード
  follower({
    id: 'm_villager',
    name: '村人A',
    cls: 'gamer',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🧑‍🌾',
    text: '【ファンファーレ】ランダムな自分の他のフォロワー1体にEXP+1\n【レベル】EXP1ごとに+1/+1（最大Lv3）',
    flavor: '「ここは はじまりの むらです」',
    level: { exp: 1, max: 3, gain: [1, 1] },
    fanfare: (c) => {
      c.exp(c.pick(c.allies(false)), 1);
    },
  }),
  follower({
    id: 'm_guard',
    name: '城の衛兵',
    cls: 'gamer',
    cost: 4,
    rarity: 'bronze',
    atk: 3,
    hp: 5,
    kw: ['ward'],
    art: '💂',
    text: '《守護》\n【レベル】EXP1ごとに+1/+2（最大Lv3）',
    flavor: '城門の前から、一歩も動かない。',
    level: { exp: 1, max: 3, gain: [1, 2] },
  }),
  amulet({
    id: 'm_save',
    name: 'セーブポイント',
    cls: 'gamer',
    cost: 2,
    rarity: 'silver',
    countdown: 2,
    art: '💾',
    text: '【カウントダウン2】\n【自分のターン終了時】自分のフォロワーすべてにEXP+1\n【ラストワード】自分のリーダーを3回復',
    flavor: 'セーブしたから、もう怖くない。',
    aiValue: 3,
    turnEnd: (c) => {
      for (const a of c.allies()) c.exp(a, 1);
    },
    lastWords: (c) => {
      c.heal(3);
    },
  }),
  follower({
    id: 'm_dragoon',
    name: '竜騎士',
    cls: 'gamer',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 5,
    art: '🦖',
    text: '【課金8】+3/+3と《疾走》を得る\n【レベル】EXP1ごとに+1/+1（最大Lv3）',
    flavor: 'ジャンプ攻撃は、課金すると高く飛べる。',
    enhance: 8,
    level: { exp: 1, max: 3, gain: [1, 1] },
    fanfare: (c) => {
      if (c.enhanced) {
        c.buff(c.self, 3, 3);
        c.give(c.self, 'storm');
      }
    },
  }),
  follower({
    id: 'm_bug',
    name: 'チート使いバグ丸',
    cls: 'gamer',
    cost: 6,
    rarity: 'legend',
    atk: 5,
    hp: 5,
    art: '🤖',
    art2: '🐛',
    text: '【ファンファーレ】自分の他のフォロワーすべてのレベルを最大にする\n【自分のターン終了時】ランダムな相手のフォロワー1体の体力を1にする',
    flavor: '「↑↑↓↓←→←→BA。はい、全員カンスト」',
    aiValue: 4,
    fanfare: (c) => {
      for (const a of c.allies(false)) c.exp(a, 99);
    },
    turnEnd: (c) => {
      const e = c.pick(c.enemies().filter((x) => hpOf(x) > 1));
      if (e) c.dmg(e, hpOf(e) - 1);
    },
  }),
];
