import { amulet, follower, spell } from './util';

// オマモラー: お守り = countdown amulets. When one reaches 0 its wish comes true
// (成就): its ラストワード fires and "whenever an お守り is fulfilled" cards react.
// 祈願 advances every own amulet's countdown; 【成就X】 counts fulfilled ones.
export const SHRINE = [
  // ---------------- bronze
  follower({
    id: 'o_miko',
    name: '見習い巫女',
    cls: 'shrine',
    cost: 1,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '👘',
    text: '【ファンファーレ】祈願',
    flavor: '鈴の鳴らし方は、まだ練習中。',
    fanfare: (c) => c.pray(1),
  }),
  amulet({
    id: 'o_gakugyo',
    name: '学業守り',
    cls: 'shrine',
    cost: 1,
    rarity: 'bronze',
    countdown: 1,
    art: '📿',
    text: '【カウントダウン1】\n【ラストワード】カードを2枚引く',
    flavor: 'テストの前日に、買う。',
    aiValue: 2,
    lastWords: (c) => {
      c.draw(2);
    },
  }),
  amulet({
    id: 'o_ema',
    name: '絵馬',
    cls: 'shrine',
    cost: 0,
    rarity: 'bronze',
    countdown: 2,
    art: '🪧',
    text: '【カウントダウン2】\n【ファンファーレ】ランダムな相手のフォロワーに1ダメージ\n【ラストワード】ランダムな相手のフォロワーかリーダーに3ダメージ',
    flavor: '「宿敵に勝てますように」',
    aiValue: 2,
    fanfare: (c) => c.pingFollowers(1, 1),
    lastWords: (c) => c.ping(1, 3),
  }),
  spell({
    id: 'o_omikuji',
    name: 'おみくじ',
    cls: 'shrine',
    cost: 1,
    rarity: 'bronze',
    art: '🧧',
    text: '祈願。カードを1枚引く',
    flavor: '大吉が出るまで、引く。',
    spell: (c) => {
      c.pray(1);
      c.draw(1);
    },
  }),
  follower({
    id: 'o_komainu',
    name: '狛犬',
    cls: 'shrine',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 5,
    kw: ['ward'],
    art: '🐕',
    text: '《守護》\n自分のお守りが成就するたび、自分のリーダーを2回復',
    flavor: '阿吽の呼吸で、守ります。',
    aiValue: 2,
    onFulfill: (c) => {
      c.heal(2);
    },
  }),
  amulet({
    id: 'o_kenkou',
    name: '健康守り',
    cls: 'shrine',
    cost: 1,
    rarity: 'bronze',
    countdown: 2,
    art: '🍀',
    text: '【カウントダウン2】\n【ファンファーレ】自分のリーダーを2回復\n【ラストワード】自分のリーダーを4回復し、カードを1枚引く',
    flavor: '早寝早起きと、セットで効く。',
    aiValue: 2,
    fanfare: (c) => {
      c.heal(2);
    },
    lastWords: (c) => {
      c.heal(4);
      c.draw(1);
    },
  }),
  follower({
    id: 'o_kannushi',
    name: '神主',
    cls: 'shrine',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 4,
    art: '🧓',
    text: '【ファンファーレ】「絵馬」を1つ出す。祈願',
    flavor: '「願いごとは、具体的に書きなさい」',
    fanfare: (c) => {
      c.summon('o_ema');
      c.pray(1);
    },
  }),
  amulet({
    id: 'o_torii',
    name: '千本鳥居',
    cls: 'shrine',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '⛩️',
    text: '【カウントダウン3】\n【自分のターン開始時】ランダムな相手のフォロワーに2ダメージ\n【ラストワード】相手のフォロワーすべてに2ダメージ',
    flavor: 'くぐるたびに、願いが近づく。',
    aiValue: 4,
    turnStart: (c) => c.pingFollowers(1, 2),
    lastWords: (c) => c.dmgAll(c.enemies(), 2),
  }),
  // ---------------- silver
  amulet({
    id: 'o_enmusubi',
    name: '縁結び守り',
    cls: 'shrine',
    cost: 2,
    rarity: 'silver',
    countdown: 2,
    art: '💞',
    text: '【カウントダウン2】\n【ラストワード】「狛犬」を2体出す',
    flavor: 'いい縁は、ふたりでやってくる。',
    aiValue: 3,
    lastWords: (c) => {
      c.summon('o_komainu', 2);
    },
  }),
  amulet({
    id: 'o_suzu',
    name: '神社の鈴',
    cls: 'shrine',
    cost: 1,
    rarity: 'silver',
    countdown: 1,
    art: '🔔',
    text: '【カウントダウン1】\n【ファンファーレ】カードを1枚引く\n【ラストワード】祈願',
    flavor: 'ガランガラン。神さま、起きて。',
    aiValue: 1,
    fanfare: (c) => {
      c.draw(1);
    },
    lastWords: (c) => c.pray(1),
  }),
  follower({
    id: 'o_inari',
    name: 'お稲荷さま',
    cls: 'shrine',
    cost: 4,
    rarity: 'silver',
    atk: 4,
    hp: 5,
    art: '🦊',
    art2: '🍙',
    text: '【ファンファーレ】「絵馬」を1つ出す\n自分のお守りが成就するたび、ランダムな相手のフォロワーかリーダーに2ダメージ',
    flavor: 'お供えは、いなり寿司でお願いします。',
    aiValue: 3,
    fanfare: (c) => {
      c.summon('o_ema');
    },
    onFulfill: (c) => c.ping(1, 2),
  }),
  spell({
    id: 'o_oharai',
    name: 'お祓い',
    cls: 'shrine',
    cost: 2,
    rarity: 'silver',
    art: '🎋',
    text: '相手のフォロワー1体に3ダメージ\n【成就3】かわりに破壊する',
    flavor: '悪いものは、ぜんぶ払う。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      if (c.fulfilledAt(3)) c.destroy(c.targetCard());
      else c.dmg(c.target, 3);
    },
  }),
  spell({
    id: 'o_matsuri',
    name: '夏祭り',
    cls: 'shrine',
    cost: 2,
    rarity: 'silver',
    art: '🏮',
    text: '「絵馬」と「学業守り」を1つずつ出す。祈願',
    flavor: '屋台をはしごして、最後にお参り。',
    spell: (c) => {
      c.summon('o_ema');
      c.summon('o_gakugyo');
      c.pray(1);
    },
  }),
  follower({
    id: 'o_maiko',
    name: '舞う巫女',
    cls: 'shrine',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '💃🏻',
    art2: '⛩️',
    text: '【ファンファーレ】祈願\n【成就2】カードを2枚引く',
    flavor: '願いが叶ったら、お礼に舞う。',
    fanfare: (c) => {
      c.pray(1);
      if (c.fulfilledAt(2)) c.draw(2);
    },
  }),
  // ---------------- gold
  amulet({
    id: 'o_taiju',
    name: '願いの大樹',
    cls: 'shrine',
    cost: 2,
    rarity: 'gold',
    countdown: 3,
    art: '🌳',
    art2: '🎐',
    text: '【カウントダウン3】\n自分の他のお守りが成就するたび、カードを1枚引く\n【ラストワード】自分のリーダーを5回復し、「狛犬」を1体出す',
    flavor: '枝には、千の願いが結ばれている。',
    aiValue: 5,
    onFulfill: (c) => {
      c.draw(1);
    },
    lastWords: (c) => {
      c.heal(5);
      c.summon('o_komainu');
    },
  }),
  spell({
    id: 'o_kagura',
    name: '神楽',
    cls: 'shrine',
    cost: 3,
    rarity: 'gold',
    art: '🥁',
    art2: '⛩️',
    text: '祈願を2回行う。相手のフォロワーすべてに1ダメージ。カードを1枚引く',
    flavor: '太鼓の音で、神さまが踊りだす。',
    spell: (c) => {
      c.pray(1);
      c.pray(1);
      c.dmgAll(c.enemies(), 1);
      c.draw(1);
    },
  }),
  follower({
    id: 'o_raijin',
    name: '雷神さま',
    cls: 'shrine',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 6,
    art: '⚡',
    art2: '🥁',
    text: '【ファンファーレ】このバトルで成就した数だけ、ランダムな相手のフォロワーかリーダーに2ダメージ（最大6回）',
    flavor: '叶った願いの数だけ、雷が落ちる。',
    fanfare: (c) => c.ping(Math.min(6, c.P.fulfilled), 2),
  }),
  amulet({
    id: 'o_kaiun',
    name: '開運大守り',
    cls: 'shrine',
    cost: 3,
    rarity: 'gold',
    countdown: 2,
    art: '🎴',
    text: '【カウントダウン2】\n【ラストワード】相手のフォロワーすべてに3ダメージ。カードを1枚引く',
    flavor: '効果抜群。値段も抜群。',
    aiValue: 4,
    lastWords: (c) => {
      c.dmgAll(c.enemies(), 3);
      c.draw(1);
    },
  }),
  // ---------------- legend
  follower({
    id: 'o_amaterasu',
    name: '太陽の女神アマテラス',
    cls: 'shrine',
    cost: 7,
    rarity: 'legend',
    atk: 7,
    hp: 7,
    art: '🌞',
    art2: '⛩️',
    text: '【ファンファーレ】自分のアミュレットすべてのカウントダウンを0にする（すべて成就）。相手のフォロワーすべてに2ダメージ',
    flavor: '「岩戸は開いた。すべての願いを、今ここに」',
    fanfare: (c) => {
      for (const a of c.amulets()) c.advanceCountdown(a, 99);
      c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'o_kyubi',
    name: '九尾の白狐',
    cls: 'shrine',
    cost: 4,
    rarity: 'legend',
    atk: 4,
    hp: 6,
    art: '🦊',
    art2: '🌕',
    text: '自分のお守りが成就するたび、同じお守りを1つ出す（1ターンに2回まで）',
    flavor: '九つの尾に、九つの願い。',
    aiValue: 5,
    onFulfill: (c) => {
      const o = c.other;
      if (!o) return;
      if (c.self.data.turn !== c.s.turn) {
        c.self.data.turn = c.s.turn;
        c.self.data.used = 0;
      }
      if ((c.self.data.used ?? 0) >= 2) return;
      c.self.data.used = (c.self.data.used ?? 0) + 1;
      c.summon(o.id);
    },
  }),
  amulet({
    id: 'o_otorii',
    name: '満願の大鳥居',
    cls: 'shrine',
    cost: 5,
    rarity: 'legend',
    countdown: 3,
    art: '⛩️',
    art2: '🌅',
    text: '【カウントダウン3】\n【ファンファーレ】祈願を2回行う\n【ラストワード】【成就8】相手のリーダーに8ダメージ。そうでなければ、相手のフォロワーすべてに4ダメージ',
    flavor: 'すべての願いが叶う日、門は開く。',
    aiValue: 6,
    fanfare: (c) => {
      c.pray(1);
      c.pray(1);
    },
    lastWords: (c) => {
      if (c.fulfilledAt(8)) c.face(8);
      else c.dmgAll(c.enemies(), 4);
    },
  }),
];
