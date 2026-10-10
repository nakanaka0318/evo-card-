import { amulet, follower, spell } from './util';

// ステラー: 断捨離. 【ハンドレスX】 fires while the hand holds X cards or fewer;
// effects 「捨てる」 cards from the hand (【捨てられた時】 cards first), which
// triggers their 【捨てられた時】 and any "whenever you discard" cards.
export const MINIMAL = [
  // ---------------- bronze
  follower({
    id: 'q_trash',
    name: 'ゴミ出し当番',
    cls: 'minimal',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '🚮',
    text: '【ファンファーレ】手札を1枚選んで捨てる。カードを1枚引く',
    flavor: '燃えるゴミは、月・木。',
    fanfare: (c) => {
      c.discard(1);
      c.draw(1);
    },
    discardPick: 1,
  }),
  follower({
    id: 'q_box',
    name: 'いらない箱',
    cls: 'minimal',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🗳️',
    text: '【ファンファーレ】「古き天剣」を1枚山札に加える\n【捨てられた時】ランダムな相手のフォロワーに2ダメージ',
    flavor: '「いつか使う」は、来ない。',
    fanfare: (c) => {
      c.toDeck('t_oldsword', 1);
    },
    onDiscard: (c) => c.pingFollowers(1, 2),
  }),
  spell({
    id: 'q_sell',
    name: 'フリマ出品',
    cls: 'minimal',
    cost: 1,
    rarity: 'bronze',
    art: '🏷️',
    text: '手札を1枚選んで捨てる。「売上金」を2枚手札に加える',
    flavor: '値下げ交渉は、即ブロック。',
    spell: (c) => {
      c.discard(1);
      c.addHand('t_cash', 2);
    },
    discardPick: 1,
  }),
  follower({
    id: 'q_minimalist',
    name: 'ミニマリスト',
    cls: 'minimal',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🧘',
    text: '【ファンファーレ】【ハンドレス2】ランダムな相手のフォロワーに3ダメージ',
    flavor: '持ち物は、スマホとこのカードだけ。',
    fanfare: (c) => {
      if (c.handless(2)) c.pingFollowers(1, 3);
    },
  }),
  spell({
    id: 'q_cleanup',
    name: '大掃除',
    cls: 'minimal',
    cost: 2,
    rarity: 'bronze',
    art: '🧽',
    text: '手札をすべて捨てる。捨てた枚数+1枚のカードを引く',
    flavor: '年末じゃなくても、やるときはやる。',
    spell: (c) => {
      const n = c.discardAll().length;
      c.draw(n + 1);
    },
  }),
  follower({
    id: 'q_ghost',
    name: '断捨離ゴースト',
    cls: 'minimal',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '👻',
    text: '【捨てられた時】このカードを場に出す',
    flavor: '捨てたはずなのに、また部屋にいる。',
    onDiscard: (c) => {
      c.summon(c.self.id);
    },
  }),
  follower({
    id: 'q_runner',
    name: '身軽ランナー',
    cls: 'minimal',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '🏃',
    text: '【ファンファーレ】【ハンドレス2】《突進》と《バリア》を得る\n【ハンドレス0】さらに【予約ドロー2】',
    flavor: '荷物がないと、こんなに速い。',
    fanfare: (c) => {
      if (c.handless(2)) c.give(c.self, 'rush', 'barrier');
      if (c.P.hand.length === 0 && c.handless(0)) c.reserveDraw(2);
    },
  }),
  amulet({
    id: 'q_shelf',
    name: 'からっぽの棚',
    cls: 'minimal',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '🗄️',
    text: '【カウントダウン3】\n【自分のターン終了時】【ハンドレス2】ランダムな相手のフォロワーかリーダーに2ダメージ。【ハンドレス0】さらに【予約ドロー2】',
    flavor: '何も置かないための、棚。',
    aiValue: 3,
    turnEnd: (c) => {
      if (c.handless(2)) c.ping(1, 2);
      if (c.P.hand.length === 0 && c.handless(0)) c.reserveDraw(2);
    },
  }),
  // ---------------- silver
  follower({
    id: 'q_recycler',
    name: 'リサイクラー',
    cls: 'minimal',
    cost: 2,
    rarity: 'silver',
    atk: 1,
    hp: 3,
    art: '♻️',
    text: '【捨てられた時】カードを1枚引き、「リサイクラー」を1枚山札に加える',
    flavor: '捨てたものは、ちゃんと分別して投げる。',
    onDiscard: (c) => {
      c.draw(1);
      c.toDeck('q_recycler', 1);
    },
  }),
  follower({
    id: 'q_bag',
    name: '捨てられないカバン',
    cls: 'minimal',
    cost: 3,
    rarity: 'silver',
    atk: 2,
    hp: 5,
    kw: ['ward'],
    art: '👜',
    text: '《守護》\n【ファンファーレ】手札を1枚選んで捨てる\n【ラストワード】捨てたカードと同名のカードを1枚手札に加える',
    flavor: '中身を全部出したら、軽くなった。',
    discardPick: 1,
    fanfare: (c) => {
      const [t] = c.discard(1);
      if (t) c.self.memo = t.id;
    },
    lastWords: (c) => {
      if (c.self.memo) c.addHand(c.self.memo);
    },
  }),
  spell({
    id: 'q_zen',
    name: '無の境地',
    cls: 'minimal',
    cost: 3,
    rarity: 'silver',
    art: '☯️',
    text: '手札を1枚選んで捨てる。相手のフォロワー1体を破壊する',
    flavor: '何も持たない者は、何も恐れない。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    discardPick: 1,
    spell: (c) => {
      c.discard(1);
      c.destroy(c.targetCard());
    },
  }),
  amulet({
    id: 'q_flea',
    name: 'フリマアプリ',
    cls: 'minimal',
    cost: 1,
    rarity: 'silver',
    countdown: 3,
    art: '🛍️',
    text: '【カウントダウン3】\n自分がカードを捨てるたび、「売上金」を1枚手札に加える',
    flavor: '通知が鳴るたび、ちょっと嬉しい。',
    aiValue: 2,
    onAnyDiscard: (c) => {
      c.addHand('t_cash');
    },
  }),
  follower({
    id: 'q_vacuum',
    name: 'ロボット掃除機',
    cls: 'minimal',
    cost: 6,
    rarity: 'silver',
    atk: 6,
    hp: 9,
    kw: ['barrier', 'ward'],
    art: '🧹',
    art2: '🤖',
    text: '《バリア》《守護》\n【ファンファーレ】手札を1枚選んで捨てる。ランダムな相手のフォロワーに6ダメージ\n【進化時】ファンファーレと同じ効果',
    flavor: '吸い込んだものは、二度と戻らない。',
    discardPick: 1,
    fanfare: (c) => {
      c.discard(1);
      c.pingFollowers(1, 6);
    },
    evolve: (c) => {
      c.discard(1);
      c.pingFollowers(1, 6);
    },
  }),
  follower({
    id: 'q_monk',
    name: 'さとり僧',
    cls: 'minimal',
    cost: 6,
    rarity: 'silver',
    atk: 4,
    hp: 6,
    kw: ['ward', 'storm'],
    art: '🧘‍♂️',
    text: '《守護》《疾走》\n自分の手札が2枚以下なら、このカードのコスト-3\n【ファンファーレ】「古き天剣」を2枚山札に加える\n【超進化時】手札の枚数だけ「古き天剣」を山札に加える。その後、手札をすべて捨て、捨てた枚数と同じ枚数のカードを引く',
    flavor: '煩悩の数だけ、手札を捨ててきた。',
    costFn: (s, card) => (s.players[card.owner].hand.length <= 2 ? -3 : 0),
    fanfare: (c) => {
      c.toDeck('t_oldsword', 2);
    },
    superEvolve: (c) => {
      c.toDeck('t_oldsword', c.P.hand.length);
      const n = c.discardAll().length;
      c.draw(n);
    },
  }),
  // ---------------- gold
  follower({
    id: 'q_master',
    name: '断捨離マスター',
    cls: 'minimal',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    art: '🥋',
    text: '【ファンファーレ】手札をすべて捨てる。その後【ハンドレス0】相手のフォロワーすべてに3ダメージ。【予約ドロー3】',
    flavor: '「ときめかないものは、すべて捨てなさい」',
    fanfare: (c) => {
      c.discardAll();
      if (c.handless(0)) c.dmgAll(c.enemies(), 3);
      c.reserveDraw(3);
    },
  }),
  spell({
    id: 'q_emptychest',
    name: 'からっぽの宝箱',
    cls: 'minimal',
    cost: 1,
    rarity: 'gold',
    art: '🪣',
    text: '【予約ドロー2】\n【ハンドレス0】かわりに【予約ドロー4】し、「古き天剣」を2枚山札に加える',
    flavor: '空っぽだから、なんでも入る。',
    spell: (c) => {
      if (c.handless(0)) {
        c.reserveDraw(4);
        c.toDeck('t_oldsword', 2);
      } else c.reserveDraw(2);
    },
  }),
  follower({
    id: 'q_doll',
    name: '捨てられたぬいぐるみ',
    cls: 'minimal',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 3,
    art: '🧸',
    text: '【捨てられた時】「捨てられたぬいぐるみ」を2体出す',
    flavor: '捨てられても、ずっと笑っている。',
    onDiscard: (c) => {
      c.summon('q_doll', 2);
    },
  }),
  amulet({
    id: 'q_shredder',
    name: 'シュレッダー',
    cls: 'minimal',
    cost: 3,
    rarity: 'gold',
    countdown: 3,
    art: '🗂️',
    text: '【カウントダウン3】\n自分がカードを捨てるたび、ランダムな相手のフォロワーに2ダメージ',
    flavor: 'ガガガガガ。思い出ごと細切れ。',
    aiValue: 4,
    onAnyDiscard: (c) => c.pingFollowers(1, 2),
  }),
  // ---------------- legend
  follower({
    id: 'q_danshari',
    name: '捨て神ダンシャリー',
    cls: 'minimal',
    cost: 3,
    rarity: 'legend',
    atk: 2,
    hp: 3,
    art: '😇',
    art2: '🧹',
    text: '【ファンファーレ】手札を1枚選んで捨てる\n自分がカードを捨てるたび、ランダムな相手のフォロワーかリーダーに2ダメージ。自分のリーダーを1回復',
    flavor: '「手放したぶんだけ、あなたは自由」',
    aiValue: 4,
    fanfare: (c) => {
      c.discard(1);
    },
    onAnyDiscard: (c) => {
      c.ping(1, 2);
      c.heal(1);
    },
    discardPick: 1,
  }),
  follower({
    id: 'q_muga',
    name: '無我の龍ムガ',
    cls: 'minimal',
    cost: 9,
    rarity: 'legend',
    atk: 8,
    hp: 8,
    kw: ['ward'],
    art: '☁️',
    art2: '🐉',
    text: '《守護》\nこのカードのコストは、自分の手札の枚数と同じになる\n【ファンファーレ】相手のフォロワー1体を破壊する。【ハンドレス0】【予約ドロー3】',
    flavor: '何も持たぬ者の前にだけ、姿を現す。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      c.destroy(c.targetCard());
      if (c.handless(0)) c.reserveDraw(3);
    },
    costFn: (s, card) => s.players[card.owner].hand.length - 9,
  }),
  follower({
    id: 'q_merca',
    name: 'フリマ女王メルカ',
    cls: 'minimal',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 5,
    art: '👩‍💼',
    art2: '💴',
    text: '【ファンファーレ】手札をすべて捨て、捨てた枚数と同じ枚数のカードを引く。その後、このバトルで捨てたカード1枚につき、ランダムな相手のフォロワーかリーダーに1ダメージ（最大10回）',
    flavor: '「売れないものは、ない」',
    fanfare: (c) => {
      const n = c.discardAll().length;
      c.draw(n);
      c.ping(Math.min(10, c.P.discarded), 1);
    },
  }),
];
