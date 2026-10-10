import { amulet, follower, spell } from './util';

// パペッター: 「人形」 are free 1/1 《突進》 tokens. Cards fill the hand with them,
// react whenever one enters or breaks, and 【操演X】 counts how many entered.
export const PUPPET = [
  // ---------------- bronze
  follower({
    id: 'p_girl',
    name: '人形使いの少女',
    cls: 'puppet',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 2,
    art: '👧',
    art2: '🪆',
    text: '【ファンファーレ】「人形」を1枚手札に加える',
    flavor: 'いつも、誰かと手をつないでいる。',
    fanfare: (c) => {
      c.addPuppets(1);
    },
  }),
  spell({
    id: 'p_strings',
    name: '操り糸',
    cls: 'puppet',
    cost: 1,
    rarity: 'bronze',
    art: '🧶',
    text: '「人形」を2枚手札に加える',
    flavor: '見えない糸が、指から伸びる。',
    spell: (c) => {
      c.addPuppets(2);
    },
  }),
  follower({
    id: 'p_maker',
    name: '人形職人',
    cls: 'puppet',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🧑‍🎨',
    text: '【ファンファーレ】「人形」を2枚手札に加える',
    flavor: '目を描くのは、最後。',
    fanfare: (c) => {
      c.addPuppets(2);
    },
  }),
  follower({
    id: 'p_marionette',
    name: 'マリオネット',
    cls: 'puppet',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🕺',
    art2: '🧵',
    text: '自分の人形が場に出るたび、ランダムな相手のフォロワーに1ダメージ',
    flavor: 'カタカタ、と笑う。',
    aiValue: 3,
    onSummon: (c) => {
      if (c.isPuppet(c.other)) c.pingFollowers(1, 1);
    },
  }),
  amulet({
    id: 'p_stage',
    name: '人形劇場',
    cls: 'puppet',
    cost: 2,
    rarity: 'bronze',
    countdown: 3,
    art: '🎪',
    art2: '🎭',
    text: '【カウントダウン3】\n【自分のターン開始時】「人形」を1枚手札に加える',
    flavor: '本日の演目：人形たちの反乱。',
    aiValue: 3,
    turnStart: (c) => {
      c.addPuppets(1);
    },
  }),
  follower({
    id: 'p_kuroko',
    name: '黒子',
    cls: 'puppet',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 4,
    art: '🥷',
    text: '自分の人形が破壊されるたび、「人形」を1枚手札に加え、ランダムな相手のフォロワーに1ダメージ',
    flavor: '見えないことに、なっている。',
    aiValue: 3,
    onAllyDestroyed: (c) => {
      if (!c.isPuppet(c.other)) return;
      c.addPuppets(1);
      c.pingFollowers(1, 1);
    },
  }),
  follower({
    id: 'p_tin',
    name: 'ブリキの兵隊',
    cls: 'puppet',
    cost: 3,
    rarity: 'bronze',
    atk: 3,
    hp: 3,
    art: '💂',
    text: '【ファンファーレ】「人形」を1体出す\n【進化時】自分の山札に「叛逆の人形」を5枚加える',
    flavor: 'ゼンマイが切れるまで、行進する。',
    fanfare: (c) => {
      c.summon('t_puppet');
    },
    evolve: (c) => {
      c.toDeck('t_rebel', 5);
    },
  }),
  spell({
    id: 'p_scissors',
    name: '糸切りばさみ',
    cls: 'puppet',
    cost: 2,
    rarity: 'bronze',
    art: '✂️',
    text: '自分の場の人形を1体破壊する。そうしたら、ランダムな相手のフォロワー1体を破壊し、カードを2枚引く',
    flavor: '切れない糸は、ない。',
    spell: (c) => {
      const mine = c.pick(c.puppetsOnBoard().filter((p) => !p.doomed));
      if (!mine) return;
      c.destroy(mine);
      c.destroy(c.pick(c.enemies().filter((e) => !e.doomed)));
      c.draw(2);
    },
  }),
  // ---------------- silver
  follower({
    id: 'p_ventriloquist',
    name: '腹話術師',
    cls: 'puppet',
    cost: 3,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🗣️',
    text: '【ファンファーレ】自分の場の人形1体につき、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: '「しゃべってるのは、こいつだよ」',
    fanfare: (c) => c.ping(c.puppetsOnBoard().length, 1),
  }),
  spell({
    id: 'p_parade',
    name: '人形パレード',
    cls: 'puppet',
    cost: 3,
    rarity: 'silver',
    art: '🎏',
    text: '「人形」を3体出す',
    flavor: '先頭の人形だけ、ちょっと偉そう。',
    spell: (c) => {
      c.summon('t_puppet', 3);
    },
  }),
  follower({
    id: 'p_bisque',
    name: '呪いのビスクドール',
    cls: 'puppet',
    cost: 3,
    rarity: 'silver',
    atk: 1,
    hp: 1,
    art: '🎎',
    text: '【ラストワード】ランダムな相手のフォロワー1体を破壊する\n【進化時】自分の山札に「叛逆の人形」を5枚加える',
    flavor: '夜中に、髪が伸びている。',
    evolve: (c) => {
      c.toDeck('t_rebel', 5);
    },
    lastWords: (c) => {
      c.destroy(c.pick(c.enemies()));
    },
  }),
  amulet({
    id: 'p_workshop',
    name: 'からくり工房',
    cls: 'puppet',
    cost: 3,
    rarity: 'silver',
    countdown: 3,
    art: '⚙️',
    art2: '🪆',
    text: '【カウントダウン3】\n自分の人形が場に出るたび、それに《必殺》を与える',
    flavor: '小さな刃を、仕込んでおいた。',
    aiValue: 3,
    onSummon: (c) => {
      if (c.isPuppet(c.other)) c.give(c.other, 'bane');
    },
  }),
  amulet({
    id: 'p_dollhouse',
    name: 'ドールハウス',
    cls: 'puppet',
    cost: 1,
    rarity: 'silver',
    countdown: 2,
    art: '🏠',
    art2: '🪆',
    text: '【カウントダウン2】\n【ラストワード】「人形」を3枚手札に加える',
    flavor: '小さな家に、小さな住人。',
    aiValue: 2,
    lastWords: (c) => {
      c.addPuppets(3);
    },
  }),
  follower({
    id: 'p_jester',
    name: '道化人形',
    cls: 'puppet',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 3,
    art: '🃏',
    text: '【ファンファーレ】「人形」を2体出す\n【操演6】さらにカードを1枚引く\n【超進化時】自分の山札に「叛逆の人形」を20枚加える',
    flavor: '笑っているのは、顔だけ。',
    fanfare: (c) => {
      c.summon('t_puppet', 2);
      if (c.puppetAt(6)) c.draw(1);
    },
    superEvolve: (c) => {
      c.toDeck('t_rebel', 20);
    },
  }),
  // ---------------- gold
  follower({
    id: 'p_geppetto',
    name: '人形師ゼペット',
    cls: 'puppet',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 4,
    art: '👴',
    art2: '🪚',
    text: '【ファンファーレ】「人形」を3枚手札に加える。それらは《必殺》を得る',
    flavor: '「さあ、命を吹きこもう」',
    fanfare: (c) => {
      for (const p of c.addPuppets(3)) if (!p.kw.includes('bane')) p.kw.push('bane');
    },
  }),
  follower({
    id: 'p_king',
    name: '操り人形の王',
    cls: 'puppet',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 5,
    art: '🤴',
    art2: '🧵',
    text: '【ファンファーレ】自分の人形すべてを進化させる（進化ポイントは使わない）',
    flavor: '王の糸は、金色に光る。',
    fanfare: (c) => {
      for (const p of c.puppetsOnBoard()) c.evolve(p);
    },
  }),
  spell({
    id: 'p_march',
    name: '人形の大行進',
    cls: 'puppet',
    cost: 4,
    rarity: 'gold',
    art: '🎺',
    art2: '🪆',
    text: '自分の場がいっぱいになるまで「人形」を出す\n【操演10】それらは《疾走》を得る\n【操演15】かわりに「叛逆の人形」を出す\n【操演25】その後、自分の場の人形すべてを+1/-1する',
    flavor: '真夜中のおもちゃ箱から、行進曲。',
    spell: (c) => {
      const ps = c.summon(c.puppetAt(15) ? 't_rebel' : 't_puppet', c.boardFree());
      if (c.puppetAt(10)) for (const p of ps) c.give(p, 'storm');
      if (c.puppetAt(25)) for (const p of c.puppetsOnBoard()) c.buff(p, 1, -1);
    },
  }),
  follower({
    id: 'p_matryoshka',
    name: 'マトリョーシカ',
    cls: 'puppet',
    cost: 3,
    rarity: 'gold',
    atk: 3,
    hp: 3,
    art: '🪆',
    tags: ['puppet'],
    text: '（人形）\n【ラストワード】「ミニマトリョーシカ」を1体出す',
    flavor: '開けても開けても、出てくる。',
    lastWords: (c) => {
      c.summon('t_matry2');
    },
  }),
  // ---------------- legend
  follower({
    id: 'p_orca',
    name: '人形姫オルカ',
    cls: 'puppet',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 5,
    art: '👸',
    art2: '🧵',
    text: '【ファンファーレ】「人形」を4枚手札に加える\n自分の人形が場に出るたび、それに《疾走》を与える',
    flavor: '「さあ、踊りなさい。わたしのために」',
    aiValue: 4,
    fanfare: (c) => {
      c.addPuppets(4);
    },
    onSummon: (c) => {
      if (c.isPuppet(c.other)) c.give(c.other, 'storm');
    },
  }),
  amulet({
    id: 'p_curtain',
    name: '終幕の人形劇',
    cls: 'puppet',
    cost: 4,
    rarity: 'legend',
    countdown: 3,
    art: '🎭',
    art2: '🌙',
    text: '【カウントダウン3】\n【ファンファーレ】相手のフォロワー1体を破壊する\n自分の人形が破壊されるたび、ランダムな相手のフォロワーかリーダーに2ダメージ\n【ラストワード】「人形」を3体出す',
    flavor: '幕が下りても、人形たちは踊りつづける。',
    aiValue: 5,
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    fanfare: (c) => {
      c.destroy(c.targetCard());
    },
    onAllyDestroyed: (c) => {
      if (c.isPuppet(c.other)) c.ping(1, 2);
    },
    lastWords: (c) => {
      c.summon('t_puppet', 3);
    },
  }),
  follower({
    id: 'p_gigadoll',
    name: '巨大人形ギガドール',
    cls: 'puppet',
    cost: 9,
    rarity: 'legend',
    atk: 9,
    hp: 9,
    kw: ['ward'],
    art: '🗿',
    art2: '🧵',
    text: '《守護》\nこのバトルで出した人形1体につき、このカードのコスト-1\n【ファンファーレ】相手のフォロワーすべてに2ダメージ',
    flavor: '千の人形が、ひとつになった。',
    costFn: (s, card) => -s.players[card.owner].puppets,
    fanfare: (c) => c.dmgAll(c.enemies(), 2),
  }),
];
