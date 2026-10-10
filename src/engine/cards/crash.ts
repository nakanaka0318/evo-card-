import { def } from '../defs';
import { amulet, follower, spell } from './util';

// クラッシャー: own cards being destroyed fuel everything. 【いけにえ】 breaks
// another own card on purpose (its ラストワード fires too); 【破壊X】 checks how
// many own cards were destroyed this battle.
export const CRASH = [
  // ---------------- bronze
  follower({
    id: 'c_kid',
    name: 'ストレス少年',
    cls: 'crash',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🧒',
    art2: '🔨',
    text: '【ファンファーレ】「ガラクタ」を1つ出す',
    flavor: '宿題のプリントから破るタイプ。',
    fanfare: (c) => {
      c.summon('t_junk');
    },
  }),
  follower({
    id: 'c_balloon',
    name: '水風船',
    cls: 'crash',
    cost: 1,
    rarity: 'bronze',
    atk: 1,
    hp: 1,
    art: '🎈',
    text: '【ラストワード】ランダムな相手のフォロワーに2ダメージ',
    flavor: '割れる瞬間が、いちばん楽しい。',
    lastWords: (c) => c.pingFollowers(1, 2),
  }),
  spell({
    id: 'c_swing',
    name: 'フルスイング',
    cls: 'crash',
    cost: 1,
    rarity: 'bronze',
    art: '🏏',
    text: '相手のフォロワー1体に2ダメージ\n【破壊3】かわりに4ダメージ',
    flavor: 'バットは、ボールを打つためだけの道具じゃない。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      c.dmg(c.target, c.broken(3) ? 4 : 2);
    },
  }),
  follower({
    id: 'c_scrapper',
    name: 'スクラップ屋',
    cls: 'crash',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 2,
    art: '🧑‍🏭',
    text: '【ファンファーレ】【いけにえ】したら、カードを2枚引く',
    flavor: '「それ、もう使わないよね？」',
    fanfare: (c) => {
      if (c.sacrifice()) c.draw(2);
    },
  }),
  follower({
    id: 'c_plates',
    name: 'お皿割り師',
    cls: 'crash',
    cost: 2,
    rarity: 'bronze',
    atk: 2,
    hp: 3,
    art: '🍽️',
    text: '自分の他のカードが壊れるたび、ランダムな相手のフォロワーかリーダーに1ダメージ',
    flavor: 'ガシャーン！（ちゃんと弁償済み）',
    aiValue: 2,
    onBreak: (c) => c.ping(1, 1),
  }),
  amulet({
    id: 'c_dynamite',
    name: 'ダイナマイト',
    cls: 'crash',
    cost: 2,
    rarity: 'bronze',
    countdown: 2,
    art: '🧨',
    text: '【カウントダウン2】\n【ラストワード】相手のフォロワーすべてに2ダメージ',
    flavor: '導火線は短め。',
    aiValue: 3,
    lastWords: (c) => c.dmgAll(c.enemies(), 2),
  }),
  follower({
    id: 'c_kusudama',
    name: 'くす玉',
    cls: 'crash',
    cost: 3,
    rarity: 'bronze',
    atk: 1,
    hp: 4,
    kw: ['ward'],
    art: '🎊',
    text: '《守護》\n【ラストワード】カードを2枚引く',
    flavor: '割ってくれる人を、待っている。',
    lastWords: (c) => {
      c.draw(2);
    },
  }),
  follower({
    id: 'c_wrecker',
    name: '解体ショベル',
    cls: 'crash',
    cost: 4,
    rarity: 'bronze',
    atk: 4,
    hp: 4,
    art: '🚜',
    text: '【ファンファーレ】【いけにえ】したら、ランダムな相手のフォロワーに4ダメージ',
    flavor: '壊した分だけ、前に進む。',
    fanfare: (c) => {
      if (c.sacrifice()) c.pingFollowers(1, 4);
    },
  }),
  // ---------------- silver
  amulet({
    id: 'c_rageroom',
    name: 'レイジルーム',
    cls: 'crash',
    cost: 3,
    rarity: 'silver',
    countdown: 3,
    art: '🏚️',
    art2: '💢',
    text: '【カウントダウン3】\n【ファンファーレ】「ガラクタ」を2つ出す\n自分の他のカードが壊れるたび、相手のリーダーに1ダメージ',
    flavor: '30分3000円。皿は割り放題。',
    aiValue: 4,
    fanfare: (c) => {
      c.summon('t_junk', 2);
    },
    onBreak: (c) => {
      c.face(1);
    },
  }),
  spell({
    id: 'c_demolish',
    name: '解体工事',
    cls: 'crash',
    cost: 2,
    rarity: 'silver',
    art: '🚧',
    text: '相手のフォロワー1体に3ダメージ\n【いけにえ】できたら、かわりに破壊する',
    flavor: '工期は、30秒。',
    target: { kind: 'enemyFollower' },
    aiPrefer: 'big',
    spell: (c) => {
      if (c.sacrifice()) c.destroy(c.targetCard());
      else c.dmg(c.target, 3);
    },
  }),
  follower({
    id: 'c_recyclebird',
    name: 'リサイクルバード',
    cls: 'crash',
    cost: 3,
    rarity: 'silver',
    atk: 2,
    hp: 2,
    art: '🐦',
    art2: '♻️',
    text: '【ラストワード】ランダムな相手のフォロワーかリーダーに1ダメージ。一度だけ「リサイクルバード」を出す',
    flavor: '壊れても、また飛ぶ。たぶん3回目はない。',
    lastWords: (c) => {
      c.ping(1, 1);
      if (c.self.data.reborn) return;
      for (const b of c.summon('c_recyclebird')) b.data.reborn = 1;
    },
  }),
  follower({
    id: 'c_press',
    name: 'プレス機',
    cls: 'crash',
    cost: 4,
    rarity: 'silver',
    atk: 3,
    hp: 5,
    kw: ['ward'],
    art: '🗜️',
    text: '《守護》\n【ファンファーレ】【破壊4】相手のフォロワー1体を破壊する',
    flavor: 'ぺしゃんこ。',
    target: { kind: 'enemyFollower', cond: (s, card) => s.players[card.owner].broken >= 4 },
    aiPrefer: 'big',
    fanfare: (c) => {
      if (c.target !== null && c.broken(4)) c.destroy(c.targetCard());
    },
  }),
  spell({
    id: 'c_fireworks',
    name: '大花火',
    cls: 'crash',
    cost: 3,
    rarity: 'silver',
    art: '🎆',
    text: 'ランダムな相手のフォロワーかリーダーに1ダメージを2回。このバトルで壊れた自分のカード2つにつき、さらに1回（最大10回）',
    flavor: 'たーまやー！（壊れたものの数だけ）',
    spell: (c) => c.ping(Math.min(10, 2 + Math.floor(c.P.broken / 2)), 1),
  }),
  follower({
    id: 'c_bombkun',
    name: 'バクダンくん',
    cls: 'crash',
    cost: 2,
    rarity: 'silver',
    atk: 3,
    hp: 2,
    art: '💣',
    text: '【ラストワード】相手のリーダーに2ダメージ',
    flavor: '導火線に火がついてから本気出す。',
    lastWords: (c) => {
      c.face(2);
    },
  }),
  // ---------------- gold
  follower({
    id: 'c_scrapking',
    name: 'スクラップ大王',
    cls: 'crash',
    cost: 5,
    rarity: 'gold',
    atk: 4,
    hp: 5,
    art: '🦍',
    art2: '👑',
    text: '【ファンファーレ】自分の場の他のカードをすべて破壊する。壊した1つにつき、カードを1枚引く',
    flavor: '玉座も、ガラクタでできている。',
    fanfare: (c) => {
      const mine = c.P.board.filter((x) => x !== c.self && c.alive(x));
      for (const x of mine) c.destroy(x);
      if (mine.length) c.draw(mine.length);
    },
  }),
  amulet({
    id: 'c_crane',
    name: '鉄球クレーン',
    cls: 'crash',
    cost: 4,
    rarity: 'gold',
    countdown: 3,
    art: '🏗️',
    art2: '⚫',
    text: '【カウントダウン3】\n【自分のターン終了時】ランダムな相手のフォロワーに3ダメージ\n【ラストワード】相手のフォロワーすべてに2ダメージ',
    flavor: '振り子の原理で、なんでも壊す。',
    aiValue: 6,
    turnEnd: (c) => c.pingFollowers(1, 3),
    lastWords: (c) => c.dmgAll(c.enemies(), 2),
  }),
  spell({
    id: 'c_factory',
    name: 'リサイクル工場',
    cls: 'crash',
    cost: 4,
    rarity: 'gold',
    art: '🏭',
    art2: '♻️',
    text: '自分の墓場のフォロワーから、ランダムに2体（別々のカード）を場に出す',
    flavor: '壊れたものから、生まれなおす。',
    spell: (c) => {
      const ids = [...new Set(c.P.grave.filter((x) => def(x.id).type === 'follower').map((x) => x.id))];
      for (let i = 0; i < 2 && ids.length; i++) {
        const k = Math.floor(c.rand() * ids.length);
        c.summon(ids.splice(k, 1)[0]);
      }
    },
  }),
  follower({
    id: 'c_gigahammer',
    name: 'ギガントハンマー',
    cls: 'crash',
    cost: 6,
    rarity: 'gold',
    atk: 5,
    hp: 6,
    art: '⚒️',
    text: '【ファンファーレ】相手のフォロワーすべてに2ダメージ\n【破壊6】かわりに4ダメージ',
    flavor: '振り下ろすと、地面が謝る。',
    fanfare: (c) => c.dmgAll(c.enemies(), c.broken(6) ? 4 : 2),
  }),
  // ---------------- legend
  follower({
    id: 'c_garekking',
    name: '解体王ガレキング',
    cls: 'crash',
    cost: 5,
    rarity: 'legend',
    atk: 4,
    hp: 5,
    art: '🦖',
    art2: '🧱',
    text: '【ファンファーレ】「ガラクタ」を2つ出す\n自分の他のカードが壊れるたび、ランダムな相手のフォロワーかリーダーに2ダメージ',
    flavor: '「壊れる音が、オレのBGMだ」',
    aiValue: 5,
    fanfare: (c) => {
      c.summon('t_junk', 2);
    },
    onBreak: (c) => c.ping(1, 2),
  }),
  amulet({
    id: 'c_doomclock',
    name: '終末時計',
    cls: 'crash',
    cost: 3,
    rarity: 'legend',
    countdown: 5,
    art: '🕰️',
    art2: '💀',
    text: '【カウントダウン5】\n自分の他のカードが壊れるたび、このカウントダウンを1進める\n【ラストワード】相手のフォロワーすべてを破壊し、相手のリーダーに5ダメージ',
    flavor: 'チク、タク。壊すほど、針が進む。',
    aiValue: 6,
    onBreak: (c) => c.advanceCountdown(c.self, 1),
    lastWords: (c) => {
      for (const e of c.enemies()) c.destroy(e);
      c.face(5);
    },
  }),
  follower({
    id: 'c_destroya',
    name: '破壊神デストロイア',
    cls: 'crash',
    cost: 9,
    rarity: 'legend',
    atk: 8,
    hp: 8,
    kw: ['ward'],
    art: '👹',
    art2: '🌋',
    text: '《守護》\nこのバトルで壊れた自分のカード2つにつき、このカードのコスト-1\n【ファンファーレ】【破壊8】相手のフォロワーすべてを破壊する\n【破壊14】さらに相手のリーダーに5ダメージ',
    flavor: '「お前たちの壊したもの、すべて我が糧」',
    costFn: (s, card) => -Math.floor(s.players[card.owner].broken / 2),
    fanfare: (c) => {
      if (c.broken(8)) for (const e of c.enemies()) c.destroy(e);
      if (c.broken(14)) c.face(5);
    },
  }),
];
