import type { CardDef } from '../types';
import { amulet, follower, spell } from './util';

// スペラー: 【スペルブースト】 cards grow while they sit in the hand — +1 boost
// (card.data.sb) for every spell cast. Boost lowers costs or powers effects up.
const boostCost: CardDef['costFn'] = (_s, card) => -(card.data.sb ?? 0);

export const WITCH = [
  // ---------------- bronze
  follower({
    id: 'z_apprentice',
    name: '見習い魔法少女',
    cls: 'witch',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '👧',
    art2: '✨',
    text: '【ファンファーレ】「マジカルスパーク」を1枚手札に加える',
    flavor: '呪文はまだ、カンペを見ながら。',
    fanfare: (c) => {
      c.addHand('t_mspark');
    },
  }),
  spell({
    id: 'z_arrow',
    name: 'マジックアロー',
    cls: 'witch',
    cost: 1,
    rarity: 'bronze',
    art: '🏹',
    text: '相手のフォロワー1体に2ダメージ',
    flavor: '狙ったところに、だいたい飛ぶ。',
    target: { kind: 'enemyFollower' },
    spell: (c) => {
      c.dmg(c.target, 2);
    },
  }),
  spell({
    id: 'z_review',
    name: '魔法のおさらい',
    cls: 'witch',
    cost: 1,
    rarity: 'bronze',
    art: '📖',
    text: 'カードを1枚引く。手札をスペルブーストする',
    flavor: '予習より、復習派。',
    spell: (c) => {
      c.draw(1);
      c.spellboost(1);
    },
  }),
  follower({
    id: 'z_owl',
    name: 'フクロウ便',
    cls: 'witch',
    cost: 3,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🦉',
    text: '【スペルブースト】このカードのコスト-1\n【ファンファーレ】カードを1枚引く',
    flavor: '魔法学校の通知は、だいたいフクロウで来る。',
    spellboost: true,
    costFn: boostCost,
    fanfare: (c) => {
      c.draw(1);
    },
  }),
  follower({
    id: 'z_golem',
    name: 'ルーンゴーレム',
    cls: 'witch',
    cost: 5,
    rarity: 'bronze',
    atk: 4,
    hp: 5,
    kw: ['ward'],
    art: '🪨',
    art2: '✨',
    text: '《守護》\n【スペルブースト】このカードのコスト-1',
    flavor: '呪文が刻まれるたび、目を覚ます。',
    spellboost: true,
    costFn: boostCost,
  }),
  spell({
    id: 'z_fireball',
    name: 'ファイアボール',
    cls: 'witch',
    cost: 2,
    rarity: 'bronze',
    art: '🔥',
    text: '相手のフォロワー1体に2ダメージ\n【スペルブースト】ブースト1につき+1ダメージ',
    flavor: '熱い。とにかく熱い。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spellboost: true,
    spell: (c) => {
      c.dmg(c.target, 2 + c.boost);
    },
  }),
  amulet({
    id: 'z_wand',
    name: '魔法のステッキ',
    cls: 'witch',
    cost: 1,
    rarity: 'bronze',
    countdown: 3,
    art: '🪄',
    text: '【カウントダウン3】\n自分がスペルを使うたび、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: '振ると星が出る。電池式。',
    aiValue: 2,
    onPlay: (c) => {
      if (c.isSpell(c.other)) c.ping(1, 1);
    },
  }),
  follower({
    id: 'z_blackcat',
    name: '黒猫の使い魔',
    cls: 'witch',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '😼',
    text: '【ラストワード】「マジカルスパーク」を2枚手札に加える',
    flavor: 'ご主人より、魔法がうまい。',
    lastWords: (c) => {
      c.addHand('t_mspark', 2);
    },
  }),
  // ---------------- silver
  spell({
    id: 'z_blizzard',
    name: 'ブリザード',
    cls: 'witch',
    cost: 3,
    rarity: 'silver',
    art: '❄️',
    text: '相手のフォロワーすべてに1ダメージ\n【スペルブースト】ブースト2につき+1ダメージ（最大+3）',
    flavor: '吹雪の中で、魔力だけが燃えている。',
    spellboost: true,
    spell: (c) => c.dmgAll(c.enemies(), 1 + Math.min(3, Math.floor(c.boost / 2))),
  }),
  spell({
    id: 'z_inspire',
    name: 'ひらめき',
    cls: 'witch',
    cost: 2,
    rarity: 'silver',
    art: '💡',
    text: 'カードを2枚引く\n【スペルブースト】このカードのコスト-1',
    flavor: '答えは、いつもお風呂で降りてくる。',
    spellboost: true,
    costFn: boostCost,
    spell: (c) => {
      c.draw(2);
    },
  }),
  follower({
    id: 'z_mimi',
    name: '魔女っ子ミミ',
    cls: 'witch',
    cost: 3,
    rarity: 'silver',
    atk: 2,
    hp: 3,
    art: '🧙',
    text: '【ファンファーレ】このバトルで使ったスペル1枚につき、ランダムな相手のフォロワーかリーダーに1ダメージ（最大6回）',
    flavor: '「今までの魔法、ぜーんぶ見てたよ！」',
    fanfare: (c) => c.ping(Math.min(6, c.P.stats.spells), 1),
  }),
  amulet({
    id: 'z_fountain',
    name: '魔力の泉',
    cls: 'witch',
    cost: 2,
    rarity: 'silver',
    countdown: 3,
    art: '⛲',
    text: '【カウントダウン3】\n【自分のターン開始時】「マジカルスパーク」を1枚手札に加える',
    flavor: '飲むと、ちょっとだけ魔法が上手になる。',
    aiValue: 3,
    turnStart: (c) => {
      c.addHand('t_mspark');
    },
  }),
  follower({
    id: 'z_giant',
    name: 'マナの巨人',
    cls: 'witch',
    cost: 7,
    rarity: 'silver',
    atk: 6,
    hp: 6,
    art: '🧌',
    text: '【スペルブースト】このカードのコスト-1',
    flavor: '魔力を吸って、大きくなる。食費はかからない。',
    spellboost: true,
    costFn: boostCost,
  }),
  spell({
    id: 'z_meteor',
    name: 'メテオ',
    cls: 'witch',
    cost: 5,
    rarity: 'silver',
    art: '☄️',
    text: '相手のフォロワーすべてに3ダメージ\n【スペルブースト】このカードのコスト-1',
    flavor: '空から、答えが降ってくる。',
    spellboost: true,
    costFn: boostCost,
    spell: (c) => c.dmgAll(c.enemies(), 3),
  }),
  // ---------------- gold
  follower({
    id: 'z_merlin',
    name: '大魔導師マーリン',
    cls: 'witch',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 5,
    art: '🧙‍♂️',
    art2: '📜',
    text: '【ファンファーレ】手札を2回スペルブーストする。カードを1枚引く',
    flavor: '「魔法とは、積み重ねじゃよ」',
    fanfare: (c) => {
      c.spellboost(2);
      c.draw(1);
    },
  }),
  spell({
    id: 'z_overload',
    name: '魔力暴走',
    cls: 'witch',
    cost: 3,
    rarity: 'gold',
    art: '🌪️',
    text: 'ランダムな相手のフォロワーかリーダーに1ダメージを3回\n【スペルブースト】ブースト1につき+1回',
    flavor: '止まらない。止め方を習ってない。',
    spellboost: true,
    spell: (c) => c.ping(3 + c.boost, 1),
  }),
  spell({
    id: 'z_summon',
    name: '使い魔召喚',
    cls: 'witch',
    cost: 3,
    rarity: 'gold',
    art: '🦇',
    text: '「使い魔」を2体出す\n【スペルブースト】ブースト3以上なら3体出す',
    flavor: '魔法陣は、チョークで手描き。',
    spellboost: true,
    spell: (c) => {
      c.summon('t_familiar', c.boost >= 3 ? 3 : 2);
    },
  }),
  amulet({
    id: 'z_crystalball',
    name: '水晶玉',
    cls: 'witch',
    cost: 2,
    rarity: 'gold',
    countdown: 2,
    art: '🔮',
    text: '【カウントダウン2】\n自分がスペルを使うたび、カードを1枚引く',
    flavor: '未来が見える。来週の小テストも見える。',
    aiValue: 3,
    onPlay: (c) => {
      if (c.isSpell(c.other)) c.draw(1);
    },
  }),
  // ---------------- legend
  follower({
    id: 'z_lily',
    name: '魔法少女マジカル☆リリィ',
    cls: 'witch',
    cost: 4,
    rarity: 'legend',
    atk: 3,
    hp: 4,
    art: '👱‍♀️',
    art2: '🪄',
    text: '【ファンファーレ】「マジカルスパーク」を3枚手札に加える\n自分がスペルを使うたび、相手のリーダーに1ダメージ',
    flavor: '「愛と、魔力と、ドーパミンで！」',
    aiValue: 4,
    fanfare: (c) => {
      c.addHand('t_mspark', 3);
    },
    onPlay: (c) => {
      if (c.isSpell(c.other)) c.face(1);
    },
  }),
  spell({
    id: 'z_grimoire',
    name: '禁断の魔導書',
    cls: 'witch',
    cost: 4,
    rarity: 'legend',
    art: '📕',
    art2: '💀',
    text: '相手のフォロワーすべてに2ダメージ\n【スペルブースト】ブースト6以上なら、かわりに相手のフォロワーすべてを消滅させ、相手のリーダーに4ダメージ',
    flavor: '開いてはいけない。……もう開いてる。',
    spellboost: true,
    spell: (c) => {
      if (c.boost >= 6) {
        for (const e of c.enemies()) c.banish(e);
        c.face(4);
      } else c.dmgAll(c.enemies(), 2);
    },
  }),
  follower({
    id: 'z_manadragon',
    name: 'マナドラゴン',
    cls: 'witch',
    cost: 10,
    rarity: 'legend',
    atk: 8,
    hp: 8,
    art: '🐲',
    art2: '✨',
    text: '【スペルブースト】このカードのコスト-1\n【ファンファーレ】相手のフォロワーすべてに4ダメージ',
    flavor: '千の呪文を食べて、目を覚ました。',
    spellboost: true,
    costFn: boostCost,
    fanfare: (c) => c.dmgAll(c.enemies(), 4),
  }),
];
