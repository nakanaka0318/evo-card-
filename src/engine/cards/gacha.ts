import { amulet, follower, spell } from './util';

export const GACHA = [
  // ---------------- bronze
  follower({
    id: 'g_capsule',
    name: 'カプセルぼうや',
    cls: 'gacha',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🥚',
    text: '【ファンファーレ】ガチャ\nN:+0/+1 R:+1/+0 SR:+1/+1 SSR:+3/+3と《疾走》',
    flavor: '中身は開けるまでわからない。',
    fanfare: (c) => {
      c.gacha({
        N: (c) => c.buff(c.self, 0, 1),
        R: (c) => c.buff(c.self, 1, 0),
        SR: (c) => c.buff(c.self, 1, 1),
        SSR: (c) => {
          c.buff(c.self, 3, 3);
          c.give(c.self, 'storm');
        },
      });
    },
  }),
  follower({
    id: 'g_maneki',
    name: 'まねきネコ',
    cls: 'gacha',
    cost: 2,
    rarity: 'bronze',
    atk: 1,
    hp: 3,
    kw: ['ward'],
    art: '😺',
    text: '《守護》【ファンファーレ】運気+1',
    flavor: '右手でSSRを、左手で天井をまねく。',
    fanfare: (c) => c.luck(1),
  }),
  spell({
    id: 'g_dice',
    name: 'サイコロ占い',
    cls: 'gacha',
    cost: 1,
    rarity: 'bronze',
    art: '🎲',
    text: '相手のフォロワー1体に1〜6のランダムなダメージ',
    flavor: '出目6のときの顔、見せたい。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, c.dice(6));
    },
  }),
  follower({
    id: 'g_addict',
    name: 'ガチャ廃人',
    cls: 'gacha',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🤑',
    text: '【ファンファーレ】ガチャ\nN:ランダムな相手のフォロワーに1ダメージ R:2ダメージ SR:3ダメージ SSR:相手のフォロワーすべてに2ダメージ',
    flavor: '「次で出る。次で出るから」',
    fanfare: (c) => {
      c.gacha({
        N: (c) => c.dmg(c.pick(c.enemies()), 1),
        R: (c) => c.dmg(c.pick(c.enemies()), 2),
        SR: (c) => c.dmg(c.pick(c.enemies()), 3),
        SSR: (c) => c.dmgAll(c.enemies(), 2),
      });
    },
  }),
  amulet({
    id: 'g_slot',
    name: 'スロットマシン',
    cls: 'gacha',
    cost: 2,
    rarity: 'bronze',
    countdown: 2,
    art: '🎰',
    text: '【カウントダウン2】\n【自分のターン終了時】ガチャ\nN:自分のリーダーを2回復 R:ランダムな相手のフォロワーに2ダメージ SR:カードを1枚引く SSR:相手のリーダーに3ダメージ',
    flavor: 'レバーを引く手が止まらない。',
    aiValue: 3,
    turnEnd: (c) => {
      c.gacha({
        N: (c) => c.heal(2),
        R: (c) => c.dmg(c.pick(c.enemies()), 2),
        SR: (c) => c.draw(1),
        SSR: (c) => c.face(3),
      });
    },
  }),
  follower({
    id: 'g_gorilla',
    name: '景品ゴリラ',
    cls: 'gacha',
    cost: 5,
    rarity: 'bronze',
    atk: 4,
    hp: 4,
    art: '🦍',
    text: '【ファンファーレ】ガチャ\nN:《守護》 R:+1/+1と《守護》 SR:+2/+2と《守護》 SSR:+3/+3と《守護》《必殺》',
    flavor: 'クレーンゲームで取れた。重い。',
    fanfare: (c) => {
      c.gacha({
        N: (c) => c.give(c.self, 'ward'),
        R: (c) => {
          c.buff(c.self, 1, 1);
          c.give(c.self, 'ward');
        },
        SR: (c) => {
          c.buff(c.self, 2, 2);
          c.give(c.self, 'ward');
        },
        SSR: (c) => {
          c.buff(c.self, 3, 3);
          c.give(c.self, 'ward', 'bane');
        },
      });
    },
  }),
  // ---------------- silver
  follower({
    id: 'g_pierrot',
    name: '確変ピエロ',
    cls: 'gacha',
    cost: 2,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🤡',
    text: '【ファンファーレ】確変（次のガチャがSR以上確定）',
    flavor: '赤いボタンを押したら、世界が虹色になった。',
    fanfare: (c) => c.kakuhen(1),
  }),
  follower({
    id: 'g_coin',
    name: 'コイントスキッド',
    cls: 'gacha',
    cost: 1,
    rarity: 'silver',
    atk: 1,
    hp: 1,
    art: '🪙',
    text: '【ファンファーレ】コイントス\n表:+1/+0と《疾走》 裏:+0/+2と《守護》',
    flavor: '表でも裏でも、投げる瞬間が楽しい。',
    fanfare: (c) => {
      if (c.coin()) {
        c.buff(c.self, 1, 0);
        c.give(c.self, 'storm');
      } else {
        c.buff(c.self, 0, 2);
        c.give(c.self, 'ward');
      }
    },
  }),
  spell({
    id: 'g_garapon',
    name: '福引きガラガラ',
    cls: 'gacha',
    cost: 2,
    rarity: 'silver',
    art: '🎉',
    text: 'ガチャ\nN:カードを1枚引く R:カードを1枚引き、運気+1 SR:カードを2枚引く SSR:カードを2枚引き、それらのコスト-1',
    flavor: 'カランカラーン！ 大当たりー！',
    spell: (c) => {
      c.gacha({
        N: (c) => c.draw(1),
        R: (c) => {
          c.draw(1);
          c.luck(1);
        },
        SR: (c) => c.draw(2),
        SSR: (c) => {
          for (const d of c.draw(2)) d.costMod -= 1;
        },
      });
    },
  }),
  spell({
    id: 'g_hazure',
    name: 'ハズレ券の山',
    cls: 'gacha',
    cost: 1,
    rarity: 'silver',
    art: '🎫',
    text: '運気+2。カードを1枚引く',
    flavor: 'ハズレの数だけ、天井は近い。',
    spell: (c) => {
      c.luck(2);
      c.draw(1);
    },
  }),
  follower({
    id: 'g_dealer',
    name: 'ディーラー',
    cls: 'gacha',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 4,
    art: '🃏',
    text: '【進化時】ガチャ\nN:自分のフォロワーすべてを+1/+0 R:+1/+1 SR:+2/+1 SSR:+2/+2',
    flavor: '「ベットは済んだかい？」',
    evolve: (c) => {
      c.gacha({
        N: (c) => c.buffAll(c.allies(), 1, 0),
        R: (c) => c.buffAll(c.allies(), 1, 1),
        SR: (c) => c.buffAll(c.allies(), 2, 1),
        SSR: (c) => c.buffAll(c.allies(), 2, 2),
      });
    },
  }),
  // ---------------- gold
  spell({
    id: 'g_ten',
    name: '十連ガチャ',
    cls: 'gacha',
    cost: 7,
    rarity: 'gold',
    art: '🔟',
    text: 'ガチャを10回行う\nN・R:ランダムな相手のフォロワーかリーダーに1ダメージ SR:2ダメージ SSR:「SSRスター」を1体出す',
    flavor: '石を砕く音が、最高に気持ちいい。',
    spell: (c) => {
      for (let i = 0; i < 10; i++) {
        c.gacha({
          N: (c) => c.ping(1, 1),
          R: (c) => c.ping(1, 1),
          SR: (c) => c.ping(1, 2),
          SSR: (c) => c.summon('t_star'),
        });
      }
    },
  }),
  follower({
    id: 'g_ceiling',
    name: '天井ガーディアン',
    cls: 'gacha',
    cost: 4,
    rarity: 'gold',
    atk: 2,
    hp: 5,
    kw: ['ward'],
    art: '🏯',
    text: '《守護》【ファンファーレ】運気+2\n【ラストワード】ガチャ\nN:自分のリーダーを2回復 R:カードを1枚引く SR:「SSRスター」を1体出す SSR:「SSRスター」を1体出し、カードを1枚引く',
    flavor: '天井まで、あと少し。',
    fanfare: (c) => c.luck(2),
    lastWords: (c) => {
      c.gacha({
        N: (c) => c.heal(2),
        R: (c) => c.draw(1),
        SR: (c) => c.summon('t_star'),
        SSR: (c) => {
          c.summon('t_star');
          c.draw(1);
        },
      });
    },
  }),
  follower({
    id: 'g_jackpot',
    name: 'ジャックポットドラゴン',
    cls: 'gacha',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 5,
    art: '🐲',
    text: '【ファンファーレ】ガチャ\nN:《突進》 R:+1/+1と《突進》 SR:《疾走》 SSR:+2/+2と《疾走》',
    flavor: 'コインの山から生まれた竜。',
    fanfare: (c) => {
      c.gacha({
        N: (c) => c.give(c.self, 'rush'),
        R: (c) => {
          c.buff(c.self, 1, 1);
          c.give(c.self, 'rush');
        },
        SR: (c) => c.give(c.self, 'storm'),
        SSR: (c) => {
          c.buff(c.self, 2, 2);
          c.give(c.self, 'storm');
        },
      });
    },
  }),
  // ---------------- legend
  follower({
    id: 'g_roule',
    name: 'ガチャ姫ルーレ',
    cls: 'gacha',
    cost: 7,
    rarity: 'legend',
    atk: 5,
    hp: 5,
    art: '👸',
    art2: '🎰',
    text: '【ファンファーレ】ガチャを3回行う\nN:ランダムな相手のフォロワーに2ダメージ R:自分のリーダーを3回復 SR:「SSRスター」を1体出す SSR:相手のリーダーに4ダメージ\n【進化時】運気+3',
    flavor: '「当たるまで回せば、それは確定ガチャですわ」',
    fanfare: (c) => {
      for (let i = 0; i < 3; i++) {
        c.gacha({
          N: (c) => c.dmg(c.pick(c.enemies()), 2),
          R: (c) => c.heal(3),
          SR: (c) => c.summon('t_star'),
          SSR: (c) => c.face(4),
        });
      }
    },
    evolve: (c) => c.luck(3),
  }),
  amulet({
    id: 'g_factory',
    name: '無限カプセル工場',
    cls: 'gacha',
    cost: 5,
    rarity: 'legend',
    art: '🏭',
    art2: '🥚',
    text: '【ファンファーレ】確変\n【自分のターン終了時】ガチャ\nN:「カプセルぼうや」を1体出す R:「カプセルぼうや」を2体出す SR:「SSRスター」を1体出す SSR:「SSRスター」を2体出す',
    flavor: '24時間365日、カプセルが止まらない。',
    aiValue: 6,
    fanfare: (c) => c.kakuhen(1),
    turnEnd: (c) => {
      c.gacha({
        N: (c) => c.summon('g_capsule'),
        R: (c) => c.summon('g_capsule', 2),
        SR: (c) => c.summon('t_star'),
        SSR: (c) => c.summon('t_star', 2),
      });
    },
  }),
];
