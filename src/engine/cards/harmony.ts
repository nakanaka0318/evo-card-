import { amulet, follower, spell } from './util';

// ハモラー: 【ハモり】 fires while the own deck holds an even number of cards.
// Drawing or shuffling 「コーラス」 into the deck flips odd/even.
export const HARMONY = [
  // ---------------- bronze
  follower({
    id: 'h_rookie',
    name: '見習いシンガー',
    cls: 'harmony',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🧑‍🎤',
    text: '【ファンファーレ】【ハモり】カードを1枚引く',
    flavor: 'お風呂ではプロ。',
    fanfare: (c) => {
      if (c.harmony()) c.draw(1);
    },
  }),
  spell({
    id: 'h_mic',
    name: 'マイクチェック',
    cls: 'harmony',
    cost: 1,
    rarity: 'bronze',
    art: '🎙️',
    text: 'カードを2枚引く。山札に「コーラス」を1枚加える',
    flavor: 'ワン、ツー。ワン、ツー。',
    spell: (c) => {
      c.draw(2);
      c.toDeck('t_chorus', 1);
    },
  }),
  follower({
    id: 'h_backup',
    name: 'バックコーラス',
    cls: 'harmony',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    kw: ['rush', 'ward'],
    art: '👯',
    text: '《突進》《守護》\n【ラストワード】自分のリーダーを2回復',
    flavor: '主役より、声が出てる。',
    lastWords: (c) => {
      c.heal(2);
    },
  }),
  follower({
    id: 'h_drummer',
    name: 'ドラマー',
    cls: 'harmony',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🥁',
    text: '【ファンファーレ】ランダムな相手のフォロワーに1ダメージ\n【ハモり】かわりに3ダメージを与え、コストを0にした「ドラマー」を1枚山札に加える',
    flavor: 'リズムキープは、心拍数で。',
    fanfare: (c) => {
      if (c.harmony()) {
        c.pingFollowers(1, 3);
        for (const d of c.toDeck('h_drummer', 1)) d.costMod = -9;
      } else c.pingFollowers(1, 1);
    },
  }),
  spell({
    id: 'h_echo',
    name: 'エコー',
    cls: 'harmony',
    cost: 2,
    rarity: 'bronze',
    art: '🔊',
    text: '相手のフォロワー1体に3ダメージ\n【ハモり】かわりに5ダメージ',
    flavor: 'ヤッホー……ヤッホー……ヤッホー……',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, c.harmony() ? 5 : 3);
    },
  }),
  amulet({
    id: 'h_speaker',
    name: '巨大スピーカー',
    cls: 'harmony',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '📢',
    text: '【カウントダウン3】\n【自分のターン終了時】ランダムな相手のフォロワーに1ダメージ。【ハモり】かわりに3ダメージ',
    flavor: '近所から苦情が来た。',
    aiValue: 3,
    turnEnd: (c) => {
      if (c.enemies().length) c.pingFollowers(1, c.harmony() ? 3 : 1);
    },
  }),
  follower({
    id: 'h_bassist',
    name: 'ベーシスト',
    cls: 'harmony',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 4,
    kw: ['ward'],
    art: '🎸',
    text: '《守護》\n【ファンファーレ】【ハモり】自分のリーダーを3回復',
    flavor: '目立たないけど、いないと困る。',
    fanfare: (c) => {
      if (c.harmony()) c.heal(3);
    },
  }),
  follower({
    id: 'h_duet',
    name: 'デュエットペア',
    cls: 'harmony',
    cost: 4,
    rarity: 'bronze',
    atk: 4,
    hp: 4,
    art: '👫',
    art2: '🎵',
    text: '【ファンファーレ】【ハモり】「デュエットペア」をもう1体出す',
    flavor: 'ひとりで歌うと、ただのソロ。',
    fanfare: (c) => {
      if (c.harmony()) c.summon('h_duet');
    },
  }),
  // ---------------- silver
  follower({
    id: 'h_tuner',
    name: '調律師',
    cls: 'harmony',
    cost: 2,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🎹',
    text: '【ファンファーレ】山札が奇数枚なら、山札に「コーラス」を1枚加える（ハモり状態にする）。その後【ハモり】カードを1枚引く',
    flavor: 'ラの音は、440ヘルツ。',
    fanfare: (c) => {
      if (!c.inHarmony) c.toDeck('t_chorus', 1);
      if (c.harmony()) c.draw(1);
    },
  }),
  follower({
    id: 'h_idol',
    name: '地下アイドル',
    cls: 'harmony',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '💃',
    text: '【ファンファーレ】カードを1枚引く\n【ハモり】かわりに2枚引く',
    flavor: '観客は3人。全員、古参。',
    fanfare: (c) => {
      c.draw(c.harmony() ? 2 : 1);
    },
  }),
  amulet({
    id: 'h_amp',
    name: 'ギターアンプ',
    cls: 'harmony',
    cost: 2,
    rarity: 'silver',
    countdown: 3,
    art: '🎛️',
    text: '【カウントダウン3】\n【自分のターン開始時】ランダムな相手のフォロワーに1ダメージ。【ハモり】かわりに相手のフォロワーすべてに1ダメージ',
    flavor: 'ボリュームは、いつも11。',
    aiValue: 3,
    turnStart: (c) => {
      if (!c.enemies().length) return;
      if (c.harmony()) c.dmgAll(c.enemies(), 1);
      else c.pingFollowers(1, 1);
    },
  }),
  spell({
    id: 'h_wave',
    name: 'サウンドウェーブ',
    cls: 'harmony',
    cost: 3,
    rarity: 'silver',
    art: '〰️',
    art2: '🔊',
    text: '相手のフォロワーすべてに2ダメージ\n【ハモり】かわりに3ダメージ',
    flavor: '低音が、内臓に響く。',
    spell: (c) => {
      c.dmgAll(c.enemies(), c.harmony() ? 3 : 2);
    },
  }),
  follower({
    id: 'h_dj',
    name: 'DJスクラッチ',
    cls: 'harmony',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '🎧',
    text: '【ファンファーレ】自分の山札からランダムなフォロワーを1体場に出す\n【ハモり】相手のフォロワーすべてに2ダメージ',
    flavor: 'キュキュッ。（大事なカードだった）',
    fanfare: (c) => {
      const harmony = c.harmony();
      c.deckFollowerToBoard();
      if (harmony) c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'h_vocal',
    name: '天才ボーカル',
    cls: 'harmony',
    cost: 4,
    rarity: 'silver',
    atk: 4,
    hp: 4,
    art: '🎤',
    art2: '⭐',
    text: '【ファンファーレ】相手のフォロワー1体に2ダメージ\n【ハモり】かわりに5ダメージ',
    flavor: '1曲目から、ラスサビの声量。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      c.dmg(c.target, c.harmony() ? 5 : 2);
    },
  }),
  // ---------------- gold
  follower({
    id: 'h_band',
    name: 'ロックバンド',
    cls: 'harmony',
    cost: 5,
    rarity: 'gold',
    atk: 5,
    hp: 5,
    art: '🤘',
    art2: '🎸',
    text: '【ファンファーレ】「バックコーラス」を1体出す\n【ハモり】さらに2体出す',
    flavor: '方向性の違いで、明日解散する。',
    fanfare: (c) => {
      c.summon('h_backup', c.harmony() ? 3 : 1);
    },
  }),
  spell({
    id: 'h_encore',
    name: 'アンコール',
    cls: 'harmony',
    cost: 2,
    rarity: 'gold',
    art: '👏',
    text: 'カードを2枚引く\n【ハモり】さらにPPを1回復',
    flavor: 'アン・コール！ アン・コール！',
    spell: (c) => {
      const h = c.harmony();
      c.draw(2);
      if (h) c.pp(1);
    },
  }),
  follower({
    id: 'h_conductor',
    name: '指揮者',
    cls: 'harmony',
    cost: 4,
    rarity: 'gold',
    atk: 3,
    hp: 5,
    art: '🪄',
    art2: '🎼',
    text: '【ファンファーレ】「バックコーラス」を1体出す\n【自分のターン終了時】【ハモり】「バックコーラス」を1体出す',
    flavor: '振っているのは、指揮棒かペンライトか。',
    aiValue: 3,
    turnEnd: (c) => {
      if (c.harmony()) c.summon('h_backup');
    },
    fanfare: (c) => {
      c.summon('h_backup');
    },
  }),
  follower({
    id: 'h_wall',
    name: '音の壁',
    cls: 'harmony',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 7,
    kw: ['ward'],
    art: '🧱',
    art2: '🔊',
    text: '《守護》\n【ファンファーレ】相手のフォロワーすべてに1ダメージ\n【ハモり】かわりに3ダメージ',
    flavor: '最前列は、聴覚を失う覚悟で。',
    fanfare: (c) => {
      c.dmgAll(c.enemies(), c.harmony() ? 3 : 1);
    },
  }),
  // ---------------- legend
  follower({
    id: 'h_diva',
    name: '破滅の歌姫ルシエラ',
    cls: 'harmony',
    cost: 7,
    rarity: 'legend',
    atk: 5,
    hp: 6,
    art: '🧜‍♀️',
    art2: '🌑',
    text: '【ファンファーレ】【ハモり】相手のフォロワーすべてを消滅させる。ハモっていなければ、相手のリーダーに5ダメージ',
    flavor: '「最後の一曲。聴いたら、おしまい」',
    fanfare: (c) => {
      if (c.harmony()) for (const e of c.enemies()) c.banish(e);
      else c.face(5);
    },
  }),
  follower({
    id: 'h_siren',
    name: '残響のセイレーン',
    cls: 'harmony',
    cost: 4,
    rarity: 'legend',
    atk: 0,
    hp: 8,
    kw: ['barrier'],
    art: '🧚',
    art2: '🌊',
    text: '《バリア》\n【ファンファーレ】山札に「コーラス」を1枚加える。ランダムな相手のフォロワーに3ダメージ\n【自分のターン開始時】相手のリーダーに2ダメージ。【ハモり】かわりに3ダメージし、自分のリーダーを3回復\n【進化時】ファンファーレと同じ効果',
    flavor: '歌声は、波の音にまぎれて届く。',
    aiValue: 4,
    fanfare: (c) => {
      c.toDeck('t_chorus', 1);
      c.pingFollowers(1, 3);
    },
    evolve: (c) => {
      c.toDeck('t_chorus', 1);
      c.pingFollowers(1, 3);
    },
    turnStart: (c) => {
      if (c.harmony()) {
        c.face(3);
        c.heal(3);
      } else c.face(2);
    },
  }),
  follower({
    id: 'h_maestro',
    name: '神曲マエストロ',
    cls: 'harmony',
    cost: 8,
    rarity: 'legend',
    atk: 5,
    hp: 5,
    art: '🎻',
    art2: '👑',
    text: '【ファンファーレ】自分の他のフォロワーすべてを+2/+2\n【ハモり】さらにそれらと自分に《疾走》を与える',
    flavor: '「さあ、最終楽章だ」',
    fanfare: (c) => {
      const others = c.allies(false);
      c.buffAll(others, 2, 2);
      if (c.harmony()) for (const a of c.allies()) c.give(a, 'storm');
    },
  }),
];
