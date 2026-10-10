import { amulet, follower, spell } from './util';

// ゲキカラー: a 激辛 challenge. 【激辛X】 costs X damage to the own leader for a
// strong effect; 【ピンチX】 pays off while the own leader has X HP or less.
export const SPICY = [
  // ---------------- bronze
  follower({
    id: 'f_kid',
    name: '辛いもの好きの子',
    cls: 'spicy',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    art: '🧒',
    art2: '🌶️',
    text: '【ファンファーレ】【激辛1】ランダムな相手のフォロワーに2ダメージ',
    flavor: '給食のカレーに、タバスコを持参。',
    fanfare: (c) => {
      c.selfDamage(1);
      c.pingFollowers(1, 2);
    },
  }),
  spell({
    id: 'f_chili',
    name: '唐辛子',
    cls: 'spicy',
    cost: 0,
    rarity: 'bronze',
    art: '🌶️',
    text: '【激辛2】カードを1枚引く。ランダムな相手のフォロワーかリーダーに2ダメージ',
    flavor: 'そのまま、かじる。',
    spell: (c) => {
      c.selfDamage(2);
      c.draw(1);
      c.ping(1, 2);
    },
  }),
  spell({
    id: 'f_ramen',
    name: '激辛ラーメン',
    cls: 'spicy',
    cost: 1,
    rarity: 'bronze',
    art: '🍜',
    text: '【激辛1】相手のフォロワー1体に4ダメージ',
    flavor: 'スープの色が、赤を通りこして黒い。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.selfDamage(1);
      c.dmg(c.target, 4);
    },
  }),
  follower({
    id: 'f_challenger',
    name: '激辛チャレンジャー',
    cls: 'spicy',
    cost: 2,
    rarity: 'bronze',
    atk: 4,
    hp: 2,
    kw: ['rush'],
    art: '🥵',
    text: '《突進》\n【ファンファーレ】【激辛2】',
    flavor: '「いけます！（いけない）」',
    fanfare: (c) => {
      c.selfDamage(2);
    },
  }),
  follower({
    id: 'f_sweat',
    name: '汗だくランナー',
    cls: 'spicy',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🏃‍♂️',
    art2: '💦',
    text: '【ファンファーレ】【ピンチ15】《疾走》を得る',
    flavor: '辛さから逃げるように、走る。',
    fanfare: (c) => {
      if (c.pinch(15)) c.give(c.self, 'storm');
    },
  }),
  amulet({
    id: 'f_hotpot',
    name: '激辛鍋',
    cls: 'spicy',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '🍲',
    text: '【カウントダウン3】\n【自分のターン終了時】【激辛1】相手のリーダーに3ダメージ',
    flavor: 'みんなでつつけば、みんなで泣ける。',
    aiValue: 3,
    turnEnd: (c) => {
      c.selfDamage(1);
      c.face(3);
    },
  }),
  spell({
    id: 'f_milk',
    name: 'ミルク',
    cls: 'spicy',
    cost: 1,
    rarity: 'bronze',
    art: '🥛',
    text: '自分のリーダーを3回復。カードを1枚引く',
    flavor: '水より、牛乳。これ常識。',
    spell: (c) => {
      c.heal(3);
      c.draw(1);
    },
  }),
  follower({
    id: 'f_curry',
    name: '激辛カレー屋',
    cls: 'spicy',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '🍛',
    text: '【ファンファーレ】【ピンチ12】相手のフォロワー1体に3ダメージ',
    flavor: '辛さ50倍。完食者には、写真を飾る。',
    target: { kind: 'enemyFollower', cond: (s, card) => s.players[card.owner].hp <= 12 },
    fanfare: (c) => {
      if (c.target !== null && c.pinch(12)) c.dmg(c.target, 3);
    },
  }),
  // ---------------- silver
  follower({
    id: 'f_fireeater',
    name: '火吹き芸人',
    cls: 'spicy',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🔥',
    art2: '🤡',
    text: '自分のリーダーがダメージを受けるたび、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: '辛いものを食べると、火が出る体質。',
    aiValue: 3,
    onLeaderHurt: (c) => c.ping(1, 1),
  }),
  spell({
    id: 'f_ghostpepper',
    name: 'ゴーストペッパー',
    cls: 'spicy',
    cost: 1,
    rarity: 'silver',
    art: '👻',
    art2: '🌶️',
    text: '【激辛2】相手のフォロワーすべてに2ダメージ',
    flavor: '一口で、魂が抜ける。',
    spell: (c) => {
      c.selfDamage(2);
      c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'f_streamer',
    name: '激辛配信者',
    cls: 'spicy',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🎥',
    art2: '🌶️',
    text: '【ファンファーレ】【激辛2】カードを2枚引く',
    flavor: '「今日は、世界一辛いソースに挑戦します」',
    fanfare: (c) => {
      c.selfDamage(2);
      c.draw(2);
    },
  }),
  follower({
    id: 'f_berserk',
    name: 'ヤケクソ戦士',
    cls: 'spicy',
    cost: 4,
    rarity: 'silver',
    atk: 5,
    hp: 4,
    kw: ['rush'],
    art: '😤',
    text: '《突進》\n【ファンファーレ】【ピンチ10】《連撃》を得る',
    flavor: '追いつめられてからが、本番。',
    fanfare: (c) => {
      if (c.pinch(10)) c.give(c.self, 'twin');
    },
  }),
  follower({
    id: 'f_macho',
    name: '辛さ耐性マッチョ',
    cls: 'spicy',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 5,
    kw: ['ward'],
    art: '💪',
    text: '《守護》\n【ファンファーレ】自分のリーダーを3回復',
    flavor: '辛さは、筋肉で受け止める。',
    fanfare: (c) => {
      c.heal(3);
    },
  }),
  spell({
    id: 'f_dare',
    name: '罰ゲーム',
    cls: 'spicy',
    cost: 3,
    rarity: 'silver',
    art: '🎲',
    art2: '🌶️',
    text: '【激辛2】相手のフォロワー1体を破壊する',
    flavor: '負けたら、激辛ロシアンルーレット。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      c.selfDamage(2);
      c.destroy(c.targetCard());
    },
  }),
  // ---------------- gold
  follower({
    id: 'f_volcano',
    name: '激辛火山',
    cls: 'spicy',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    art: '🌋',
    text: '【ファンファーレ】このバトルで【激辛】で受けたダメージの分だけ、ランダムな相手のフォロワーかリーダーに1ダメージ（最大8回）',
    flavor: '溜めこんだ辛さが、噴火する。',
    fanfare: (c) => c.ping(Math.min(8, c.P.selfDmg), 1),
  }),
  amulet({
    id: 'f_sauce',
    name: '地獄の激辛ソース',
    cls: 'spicy',
    cost: 2,
    rarity: 'gold',
    countdown: 3,
    art: '🧪',
    art2: '🔥',
    text: '【カウントダウン3】\n【自分のターン開始時】【激辛1】相手のフォロワーすべてと相手のリーダーに1ダメージ',
    flavor: '1滴で、鍋が赤く染まる。',
    aiValue: 4,
    turnStart: (c) => {
      c.selfDamage(1);
      c.dmgAll(c.enemies(), 1);
      c.face(1);
    },
  }),
  follower({
    id: 'f_champion',
    name: '大食いチャンピオン',
    cls: 'spicy',
    cost: 6,
    rarity: 'gold',
    atk: 6,
    hp: 5,
    kw: ['rush'],
    art: '🏆',
    art2: '🍜',
    text: '《突進》\n【ピンチ10】このカードのコスト-3\n【ファンファーレ】相手のフォロワー1体に4ダメージ',
    flavor: '「まだ、前菜ですよね？」',
    costFn: (s, card) => (s.players[card.owner].hp <= 10 ? -3 : 0),
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      c.dmg(c.target, 4);
    },
  }),
  spell({
    id: 'f_bomb',
    name: '激辛爆弾',
    cls: 'spicy',
    cost: 4,
    rarity: 'gold',
    art: '💣',
    art2: '🌶️',
    text: '相手のフォロワーすべてに3ダメージ\n【ピンチ8】さらに相手のリーダーに3ダメージ',
    flavor: '投げた本人も、むせる。',
    spell: (c) => {
      c.dmgAll(c.enemies(), 3);
      if (c.pinch(8)) c.face(3);
    },
  }),
  // ---------------- legend
  follower({
    id: 'f_enma',
    name: '地獄の料理長エンマ',
    cls: 'spicy',
    cost: 5,
    rarity: 'legend',
    atk: 5,
    hp: 6,
    art: '👺',
    art2: '🍳',
    text: '自分のリーダーがダメージを受けるたび、相手のリーダーに同じだけダメージ（1ターンに5ダメージまで）',
    flavor: '「わしの料理を残す者は、地獄行きじゃ」',
    aiValue: 5,
    onLeaderHurt: (c) => {
      if (c.self.data.turn !== c.s.turn) {
        c.self.data.turn = c.s.turn;
        c.self.data.used = 0;
      }
      const n = Math.min(c.amount, 5 - (c.self.data.used ?? 0));
      if (n <= 0) return;
      c.self.data.used = (c.self.data.used ?? 0) + n;
      c.face(n);
    },
  }),
  follower({
    id: 'f_phoenix',
    name: '炎の不死鳥',
    cls: 'spicy',
    cost: 4,
    rarity: 'legend',
    atk: 4,
    hp: 3,
    kw: ['storm'],
    art: '🐦‍🔥',
    text: '《疾走》\n【ラストワード】【ピンチ10】「炎の不死鳥」を手札に加える',
    flavor: '燃え尽きても、また燃える。',
    lastWords: (c) => {
      if (c.pinch(10)) c.addHand('f_phoenix');
    },
  }),
  follower({
    id: 'f_habaneros',
    name: '激辛ドラゴン ハバネロス',
    cls: 'spicy',
    cost: 8,
    rarity: 'legend',
    atk: 8,
    hp: 8,
    art: '🐉',
    art2: '🌶️',
    text: '【ピンチ10】このカードのコスト-4\n【ファンファーレ】【激辛3】相手のフォロワーすべてを破壊する',
    flavor: '吐く息が、すでに激辛。',
    costFn: (s, card) => (s.players[card.owner].hp <= 10 ? -4 : 0),
    fanfare: (c) => {
      c.selfDamage(3);
      for (const e of c.enemies()) c.destroy(e);
    },
  }),
];
