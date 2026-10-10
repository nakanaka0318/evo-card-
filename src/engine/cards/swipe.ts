import { amulet, follower, spell } from './util';

export const SWIPE = [
  // ---------------- bronze
  follower({
    id: 'x_swiper',
    name: 'スワイプ小僧',
    cls: 'swipe',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    kw: ['rush'],
    art: '👆',
    text: '《突進》\n【ファンファーレ】「フリック」を1枚手札に加える',
    flavor: '親指の速さなら誰にも負けない。',
    fanfare: (c) => {
      c.addHand('t_flick');
    },
  }),
  follower({
    id: 'x_squirrel',
    name: '15秒リス',
    cls: 'swipe',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    art: '🐿️',
    text: '【ファンファーレ】【コンボ3】《疾走》を得る\n【ラストワード】「フリック」を1枚手札に加える',
    flavor: '集中力は15秒で切れる。',
    fanfare: (c) => {
      if (c.comboAt(3)) c.give(c.self, 'storm');
    },
    lastWords: (c) => {
      c.addHand('t_flick');
    },
  }),
  spell({
    id: 'x_skip',
    name: 'スキップ',
    cls: 'swipe',
    cost: 2,
    rarity: 'bronze',
    art: '⏭️',
    text: 'カードを1枚引く。その後、コスト0の「スキップ」を1枚手札に加える',
    flavor: 'イントロは飛ばす。次のイントロも飛ばす。',
    spell: (c) => {
      c.draw(1);
      c.addHand('t_skip');
    },
  }),
  follower({
    id: 'x_ninja',
    name: '早送り忍者',
    cls: 'swipe',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '⏩',
    text: '【ファンファーレ】【コンボ1】相手のフォロワー1体に2ダメージ\n【進化時】カードを2枚引く',
    flavor: '倍速視聴で修行を終えた。',
    target: { kind: 'enemyFollower', cond: (_s, _c, i) => i.combo >= 1 },
    fanfare: (c) => {
      if (c.comboAt(1)) c.dmg(c.target, 2);
    },
    evolve: (c) => {
      c.draw(2);
    },
  }),
  follower({
    id: 'x_falcon',
    name: '倍速ハヤブサ',
    cls: 'swipe',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    kw: ['twin', 'rush'],
    art: '🦅',
    text: '《連撃》《突進》',
    flavor: '2倍速が標準。',
  }),
  spell({
    id: 'x_flashmob',
    name: 'フラッシュモブ',
    cls: 'swipe',
    cost: 2,
    rarity: 'bronze',
    art: '🪩',
    text: '「バックダンサー」を2体出す\n【コンボ2】さらに1体出し、カードを1枚引く',
    flavor: '突然始まって、突然終わる。',
    spell: (c) => {
      c.summon('t_dancer', 2);
      if (c.comboAt(2)) {
        c.summon('t_dancer');
        c.draw(1);
      }
    },
  }),
  // ---------------- silver
  spell({
    id: 'x_loop',
    name: '無限ループ',
    cls: 'swipe',
    cost: 1,
    rarity: 'silver',
    art: '🔁',
    text: '自分のフォロワー1体を破壊する。それと同名のカードを1枚手札に加える',
    flavor: '気づいたら朝だった。',
    target: { kind: 'allyFollower' },
    spell: (c) => {
      const t = c.targetCard();
      if (!t) return;
      // a fresh copy: printed cost and stats, no carried-over discounts or buffs
      const id = t.hold ?? t.id;
      c.destroy(t);
      c.addHand(id);
    },
  }),
  spell({
    id: 'x_slash',
    name: 'スワイプ斬り',
    cls: 'swipe',
    cost: 1,
    rarity: 'silver',
    art: '🗡️',
    text: '相手のフォロワー1体に1ダメージ\n【コンボ1】PPを1回復し、カードを1枚引く',
    flavor: '次の動画へ、物理的に。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, 1);
      if (c.comboAt(1)) {
        c.pp(1);
        c.draw(1);
      }
    },
  }),
  follower({
    id: 'x_dancer',
    name: 'バズダンサー',
    cls: 'swipe',
    cost: 4,
    rarity: 'silver',
    atk: 0,
    hp: 2,
    kw: ['storm'],
    art: '🕺',
    text: '《疾走》\n【ファンファーレ】このターンにプレイした他のカード1枚につき+1/+1。「フリック」を1枚手札に加える',
    flavor: '流行りの振り付けは全部踊れる。',
    fanfare: (c) => {
      c.buff(c.self, c.combo, c.combo);
      c.addHand('t_flick');
    },
  }),
  follower({
    id: 'x_cat',
    name: '秒速ネコ',
    cls: 'swipe',
    cost: 2,
    rarity: 'silver',
    atk: 1,
    hp: 1,
    kw: ['storm'],
    art: '🐈',
    text: '《疾走》\n【ファンファーレ】【コンボ1】+2/+1',
    flavor: 'ネコ動画は、無限に見られる。',
    fanfare: (c) => {
      if (c.comboAt(1)) c.buff(c.self, 2, 1);
    },
  }),
  spell({
    id: 'x_adskip',
    name: '広告スキップ',
    cls: 'swipe',
    cost: 1,
    rarity: 'silver',
    art: '🚫',
    text: '相手のフォロワー1体を手札に戻す',
    flavor: '5秒も待てない。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.bounce(c.targetCard());
    },
  }),
  // ---------------- gold
  follower({
    id: 'x_feed',
    name: 'おすすめ欄の支配者',
    cls: 'swipe',
    cost: 3,
    rarity: 'gold',
    atk: 2,
    hp: 3,
    art: '🌀',
    text: '【ファンファーレ】カードを1枚引く\n自分がカードをプレイするたび、それがこのターン2枚目以降なら、ランダムな相手のフォロワーに2ダメージ',
    flavor: 'スクロールの果てに、何がある。',
    aiValue: 3,
    fanfare: (c) => {
      c.draw(1);
    },
    onPlay: (c) => {
      if (c.P.combo >= 2) c.pingFollowers(1, 2);
    },
  }),
  follower({
    id: 'x_runner',
    name: 'スピードランナー',
    cls: 'swipe',
    cost: 6,
    rarity: 'gold',
    atk: 4,
    hp: 3,
    kw: ['storm'],
    art: '🏃',
    text: '《疾走》\nこのターンにプレイしたカード1枚につき、このカードのコスト-1',
    flavor: 'タイマーは、もう止められない。',
    costFn: (s, card) => -s.players[card.owner].combo,
  }),
  spell({
    id: 'x_storm',
    name: '連打の嵐',
    cls: 'swipe',
    cost: 2,
    rarity: 'gold',
    art: '👊',
    text: 'ランダムな相手のフォロワーかリーダーに1ダメージを（このターンにプレイした他のカードの枚数）回',
    flavor: 'オラオラオラオラ！',
    spell: (c) => c.ping(c.combo, 1),
  }),
  // ---------------- legend
  follower({
    id: 'x_shun',
    name: '秒速の覇者シュン',
    cls: 'swipe',
    cost: 7,
    rarity: 'legend',
    atk: 2,
    hp: 3,
    kw: ['storm'],
    art: '🐆',
    art2: '⚡',
    text: '《疾走》\n【ファンファーレ】このターンにプレイした他のカード1枚につき+1/+0。「フリック」を2枚手札に加える\n【コンボ2】《連撃》を得る',
    flavor: '「遅い。全部、遅すぎる」',
    fanfare: (c) => {
      c.buff(c.self, c.combo, 0);
      c.addHand('t_flick', 2);
      if (c.comboAt(2)) c.give(c.self, 'twin');
    },
  }),
  amulet({
    id: 'x_scroll',
    name: '無限スクロール',
    cls: 'swipe',
    cost: 2,
    rarity: 'legend',
    countdown: 2,
    art: '♾️',
    art2: '📱',
    text: '【カウントダウン2】\n自分がカードをプレイするたび、ランダムな相手のフォロワーかリーダーに1ダメージ\n【ラストワード】カードを1枚引く',
    flavor: '終わりがないのが、終わり。',
    aiValue: 4,
    onPlay: (c) => c.ping(1, 1),
    lastWords: (c) => {
      c.draw(1);
    },
  }),

  // ---------------- 追加カード
  spell({
    id: 'x_tap',
    name: '連打ボタン',
    cls: 'swipe',
    cost: 1,
    rarity: 'bronze',
    art: '🔘',
    text: '相手のフォロワー1体に1ダメージ\n【コンボ1】さらに相手のリーダーに1ダメージ',
    flavor: 'ボタンが壊れるのが先か、相手が先か。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, 1);
      if (c.comboAt(1)) c.face(1);
    },
  }),
  follower({
    id: 'x_skate',
    name: 'スケボー少年',
    cls: 'swipe',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 1,
    kw: ['rush'],
    art: '🛹',
    text: '《突進》\n【ファンファーレ】【コンボ1】ランダムな相手のフォロワーに2ダメージ',
    flavor: '止まり方は、まだ知らない。',
    fanfare: (c) => {
      if (c.comboAt(1)) c.pingFollowers(1, 2);
    },
  }),
  spell({
    id: 'x_reels',
    name: 'リール連投',
    cls: 'swipe',
    cost: 2,
    rarity: 'silver',
    art: '🎬',
    text: '「バックダンサー」を1体出す。カードを1枚引く。「フリック」を1枚手札に加える',
    flavor: '投稿ボタンを、押して押して押しまくる。',
    spell: (c) => {
      c.summon('t_dancer');
      c.draw(1);
      c.addHand('t_flick');
    },
  }),
  follower({
    id: 'x_rider',
    name: '音速ライダー',
    cls: 'swipe',
    cost: 4,
    rarity: 'gold',
    atk: 2,
    hp: 2,
    kw: ['storm'],
    art: '🏍️',
    text: '《疾走》\n【ファンファーレ】このターンにプレイした他のカード1枚につき、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: 'エンジン音が、遅れて聞こえる。',
    fanfare: (c) => c.ping(c.combo, 1),
  }),
  follower({
    id: 'x_zero',
    name: '光速の神ゼロ',
    cls: 'swipe',
    cost: 7,
    rarity: 'legend',
    atk: 3,
    hp: 3,
    kw: ['storm'],
    art: '🌠',
    art2: '⏱️',
    text: '《疾走》\n【ファンファーレ】このターンにプレイした他のカード1枚につき+1/+1\n【コンボ3】相手のフォロワーすべてに3ダメージ',
    flavor: '「0.1秒あれば、世界は終わる」',
    fanfare: (c) => {
      c.buff(c.self, c.combo, c.combo);
      if (c.comboAt(3)) c.dmgAll(c.enemies(), 3);
    },
  }),
];
