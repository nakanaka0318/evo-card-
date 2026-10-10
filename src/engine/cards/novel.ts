import { amulet, follower, spell } from './util';

// ノベラー: the leader always has a chapter open — 白の章 (protect & heal) or
// 黒の章 (attack & destroy). 【白の章】/【黒の章】 effects fire only in that chapter;
// 「ページをめくる」 switches it, and some cards react to every page turn.
export const NOVEL = [
  // ---------------- bronze
  follower({
    id: 'b_pen',
    name: '見習い作家',
    cls: 'novel',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '✍️',
    text: '【ファンファーレ】【白の章】自分のリーダーを2回復\n【黒の章】ランダムな相手のフォロワーに1ダメージ',
    flavor: '締め切りは、明日。',
    fanfare: (c) => {
      if (c.whiteCh()) c.heal(2);
      else if (c.blackCh()) c.pingFollowers(1, 1);
    },
  }),
  spell({
    id: 'b_bookmark',
    name: 'しおり',
    cls: 'novel',
    cost: 1,
    rarity: 'bronze',
    art: '🔖',
    text: 'カードを1枚引く。ページをめくる',
    flavor: 'ここまで読んだ、のしるし。',
    spell: (c) => {
      c.draw(1);
      c.flip();
    },
  }),
  follower({
    id: 'b_angel',
    name: '白いページの天使',
    cls: 'novel',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '👼',
    text: '【ファンファーレ】【白の章】《守護》を得て、自分のリーダーを2回復\n【黒の章】《突進》を得る',
    flavor: '余白は、やさしさでできている。',
    fanfare: (c) => {
      if (c.whiteCh()) {
        c.give(c.self, 'ward');
        c.heal(2);
      } else if (c.blackCh()) c.give(c.self, 'rush');
    },
  }),
  follower({
    id: 'b_imp',
    name: '黒いページの小悪魔',
    cls: 'novel',
    cost: 2,
    rarity: 'bronze',
    atk: 3,
    hp: 2,
    art: '😈',
    text: '【ファンファーレ】【黒の章】相手のフォロワー1体に2ダメージ\n【白の章】カードを1枚引く',
    flavor: 'インクのしみから、生まれた。',
    target: { kind: 'enemyFollower', cond: (s, card) => s.players[card.owner].chapter === 1 },
    fanfare: (c) => {
      if (c.white) {
        c.whiteCh();
        c.draw(1);
      } else if (c.target !== null && c.blackCh()) c.dmg(c.target, 2);
    },
  }),
  spell({
    id: 'b_twist',
    name: '急展開',
    cls: 'novel',
    cost: 1,
    rarity: 'bronze',
    art: '⚡',
    text: 'ページをめくる。その後【白の章】自分のリーダーを3回復\n【黒の章】ランダムな相手のフォロワーに3ダメージ',
    flavor: '「その時、物語が動いた——」',
    spell: (c) => {
      c.flip();
      if (c.whiteCh()) c.heal(3);
      else if (c.blackCh()) c.pingFollowers(1, 3);
    },
  }),
  amulet({
    id: 'b_inkwell',
    name: 'インク壺',
    cls: 'novel',
    cost: 1,
    rarity: 'bronze',
    countdown: 3,
    art: '🖋️',
    text: '【カウントダウン3】\n【自分のターン終了時】ページをめくる。その後【白の章】自分のリーダーを2回復\n【黒の章】相手のリーダーに2ダメージ',
    flavor: '白にも黒にも、染まれる。',
    aiValue: 3,
    turnEnd: (c) => {
      c.flip();
      if (c.whiteCh()) c.heal(2);
      else if (c.blackCh()) c.face(2);
    },
  }),
  follower({
    id: 'b_librarian',
    name: '図書委員',
    cls: 'novel',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 4,
    art: '🧑‍🏫',
    text: '【ファンファーレ】カードを1枚引く。ページをめくる',
    flavor: '「図書室では、お静かに」',
    fanfare: (c) => {
      c.draw(1);
      c.flip();
    },
  }),
  follower({
    id: 'b_twins',
    name: '白黒の双子',
    cls: 'novel',
    cost: 4,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '👯',
    art2: '☯️',
    text: '【ファンファーレ】【白の章】「白いページの天使」を2体出す\n【黒の章】「黒いページの小悪魔」を2体出す',
    flavor: '同じ顔、ちがう結末。',
    fanfare: (c) => {
      if (c.whiteCh()) c.summon('b_angel', 2);
      else if (c.blackCh()) c.summon('b_imp', 2);
    },
  }),
  // ---------------- silver
  follower({
    id: 'b_editor',
    name: '敏腕編集者',
    cls: 'novel',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '🕴️',
    text: '【ファンファーレ】ページをめくる\n自分がページをめくるたび、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: '「ここ、もっと盛り上げましょう」',
    aiValue: 2,
    fanfare: (c) => {
      c.flip();
    },
    onFlip: (c) => c.ping(1, 1),
  }),
  spell({
    id: 'b_foreshadow',
    name: '伏線回収',
    cls: 'novel',
    cost: 3,
    rarity: 'silver',
    art: '🧵',
    text: 'このバトルでページをめくった回数だけ、ランダムな相手のフォロワーかリーダーに1ダメージ（最大8回）',
    flavor: '第1話のあれが、ここでつながる。',
    spell: (c) => c.ping(Math.min(8, c.P.flips), 1),
  }),
  spell({
    id: 'b_happyend',
    name: 'ハッピーエンド',
    cls: 'novel',
    cost: 2,
    rarity: 'silver',
    art: '🌈',
    text: '白の章を開く。「白いページの天使」を1体出し、カードを1枚引く',
    flavor: 'みんな笑って、幕が下りる。',
    spell: (c) => {
      c.flip(0);
      c.summon('b_angel');
      c.draw(1);
    },
  }),
  spell({
    id: 'b_badend',
    name: 'バッドエンド',
    cls: 'novel',
    cost: 2,
    rarity: 'silver',
    art: '🥀',
    text: '相手のフォロワー1体に3ダメージ\n【黒の章】かわりに破壊する',
    flavor: 'この物語に、救いはない。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      if (c.blackCh()) c.destroy(c.targetCard());
      else c.dmg(c.target, 3);
    },
  }),
  follower({
    id: 'b_reader',
    name: '熱心な読者',
    cls: 'novel',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    art: '🤓',
    text: '【ファンファーレ】【白の章】カードを1枚引く\n【黒の章】《突進》を得る',
    flavor: '続きが気になって、寝られない。',
    fanfare: (c) => {
      if (c.whiteCh()) c.draw(1);
      else if (c.blackCh()) c.give(c.self, 'rush');
    },
  }),
  follower({
    id: 'b_ghostwriter',
    name: 'ゴーストライター',
    cls: 'novel',
    cost: 4,
    rarity: 'silver',
    atk: 4,
    hp: 4,
    kw: ['ambush'],
    art: '🫥',
    text: '《潜伏》\n【攻撃時】ページをめくる',
    flavor: '本当の作者は、誰も知らない。',
    strike: (c) => {
      c.flip();
    },
  }),
  // ---------------- gold
  follower({
    id: 'b_villain',
    name: '黒幕',
    cls: 'novel',
    cost: 5,
    rarity: 'gold',
    atk: 5,
    hp: 5,
    art: '🦹‍♂️',
    text: '【ファンファーレ】黒の章を開く。相手のフォロワーすべてに2ダメージ',
    flavor: '「すべて、私のシナリオ通り」',
    fanfare: (c) => {
      c.flip(1);
      c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'b_saint',
    name: '聖女',
    cls: 'novel',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 6,
    kw: ['ward'],
    art: '🙏',
    text: '《守護》\n【ファンファーレ】白の章を開く。自分のリーダーを5回復',
    flavor: '祈りの言葉は、白いページに書く。',
    fanfare: (c) => {
      c.flip(0);
      c.heal(5);
    },
  }),
  amulet({
    id: 'b_bestseller',
    name: 'ベストセラー',
    cls: 'novel',
    cost: 3,
    rarity: 'gold',
    countdown: 3,
    art: '📚',
    text: '【カウントダウン3】\n自分がページをめくるたび、カードを1枚引く',
    flavor: '発売3日で、100万部。',
    aiValue: 4,
    onFlip: (c) => {
      c.draw(1);
    },
  }),
  spell({
    id: 'b_plot',
    name: 'どんでん返し',
    cls: 'novel',
    cost: 3,
    rarity: 'gold',
    art: '🔄',
    text: 'ページをめくる。その後【白の章】自分のリーダーを4回復し、カードを1枚引く\n【黒の章】相手のフォロワーすべてに2ダメージ',
    flavor: '犯人は、まさかの——。',
    spell: (c) => {
      c.flip();
      if (c.whiteCh()) {
        c.heal(4);
        c.draw(1);
      } else if (c.blackCh()) c.dmgAll(c.enemies(), 2);
    },
  }),
  // ---------------- legend
  follower({
    id: 'b_shirona',
    name: '白の女王シロナ',
    cls: 'novel',
    cost: 6,
    rarity: 'legend',
    atk: 5,
    hp: 6,
    kw: ['ward'],
    art: '👸🏻',
    art2: '🤍',
    text: '《守護》\n【ファンファーレ】白の章を開く。自分のリーダーを最大体力まで回復し、「白いページの天使」を2体出す',
    flavor: '「白紙に戻しましょう。すべて、最初から」',
    fanfare: (c) => {
      c.flip(0);
      c.heal(c.P.maxHp - c.P.hp);
      c.summon('b_angel', 2);
    },
  }),
  follower({
    id: 'b_kurou',
    name: '黒の王クロウ',
    cls: 'novel',
    cost: 7,
    rarity: 'legend',
    atk: 6,
    hp: 6,
    art: '🤴🏿',
    art2: '🖤',
    text: '【ファンファーレ】黒の章を開く。相手のフォロワーすべてを破壊する',
    flavor: '「この章で、全員退場だ」',
    fanfare: (c) => {
      c.flip(1);
      for (const e of c.enemies()) c.destroy(e);
    },
  }),
  spell({
    id: 'b_finale',
    name: 'グランドフィナーレ',
    cls: 'novel',
    cost: 6,
    rarity: 'legend',
    art: '📜',
    art2: '🎆',
    text: '【白の章】自分のリーダーを8回復し、自分のフォロワーすべてを進化させる（進化ポイントは使わない）\n【黒の章】相手のリーダーに、このバトルでページをめくった回数のダメージ（最大10）',
    flavor: '最後のページは、白か、黒か。',
    spell: (c) => {
      if (c.whiteCh()) {
        c.heal(8);
        for (const a of c.allies()) c.evolve(a);
      } else if (c.blackCh()) c.face(Math.min(10, c.P.flips));
    },
  }),
];
