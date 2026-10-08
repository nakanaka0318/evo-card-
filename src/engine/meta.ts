import type { ClassId, Keyword, Rarity } from './types';

export interface ClassMeta {
  id: ClassId;
  name: string;
  /** one-word tagline */
  tag: string;
  emoji: string;
  color: string;
  color2: string;
  leaderName: string;
  leaderArt: string;
  mechanic: string;
  mechanicDesc: string;
  counter: 'luck' | 'likes' | 'sweet' | 'combo' | 'level' | 'none';
  /** short pitch shown on class select */
  pitch: string;
  /** leader lines used in battle */
  lines: { start: string; evolve: string; win: string; lose: string; hurt: string; fever: string };
}

export const CLASSES: Record<ClassId, ClassMeta> = {
  neutral: {
    id: 'neutral',
    name: 'ニュートラル',
    tag: '共通',
    emoji: '⚪',
    color: '#c9d3ea',
    color2: '#8a97b8',
    leaderName: '—',
    leaderArt: '⚪',
    mechanic: '',
    mechanicDesc: '',
    counter: 'none',
    pitch: 'どのクラスでも使える',
    lines: { start: '', evolve: '', win: '', lose: '', hurt: '', fever: '' },
  },
  gacha: {
    id: 'gacha',
    name: 'ガチャラー',
    tag: '一発逆転',
    emoji: '🎰',
    color: '#ffc531',
    color2: '#ff3fa4',
    leaderName: 'ガチャラー ルーレ',
    leaderArt: '👸',
    mechanic: 'ガチャ・運気',
    mechanicDesc:
      'ガチャを引くとN/R/SR/SSRのどれかが出て効果が変わる。SSR以外が出るたび運気+1。運気6（天井）で次はSSR確定！',
    counter: 'luck',
    pitch: '回せ。SSRが全部ひっくり返す。',
    lines: {
      start: '今日の運勢、確かめてみます？',
      evolve: '確定演出、入りましたわ！',
      win: 'SSRは、引くまで引くのですわ！',
      lose: '……次の天井で、取り返しますわ',
      hurt: '爆死ですわ〜！？',
      fever: '虹色演出、キマシタワー！',
    },
  },
  stream: {
    id: 'stream',
    name: 'ストリーマー',
    tag: '拡散爆発',
    emoji: '📱',
    color: '#ff4f9a',
    color2: '#27d8ff',
    leaderName: 'ストリーマー バズリン',
    leaderArt: '🦊',
    mechanic: 'いいね・バズ',
    mechanicDesc:
      'カードをプレイするたびいいね+1。【バズX】はいいねをX消費して強力な追加効果を発動！',
    counter: 'likes',
    pitch: 'いいねを集めて、一気にバズれ。',
    lines: {
      start: 'こんバズ〜！ 今日もいいねよろしく！',
      evolve: '神回きたーーー！',
      win: '高評価・チャンネル登録よろしくね！',
      lose: '配信、切り忘れてた……？',
      hurt: 'コメ欄荒れてる〜！',
      fever: 'トレンド1位、いただきっ！',
    },
  },
  sweets: {
    id: 'sweets',
    name: 'シュガラー',
    tag: '回復増強',
    emoji: '🍰',
    color: '#ff9f6e',
    color2: '#7ff0c8',
    leaderName: 'シュガラー アマミ',
    leaderArt: '🐰',
    mechanic: '糖度・シュガーハイ',
    mechanicDesc:
      '自分のリーダーを回復するたび、その数値だけ糖度が上がる（満タンでもOK）。【シュガーハイX】は糖度がX以上なら発動！',
    counter: 'sweet',
    pitch: '甘やかして、デカくして、押しつぶす。',
    lines: {
      start: 'いらっしゃいませ♪ 甘〜い時間にしましょ',
      evolve: 'デコレーション、完成です！',
      win: 'ごちそうさまでした♪',
      lose: '焦げちゃった……',
      hurt: 'クリームが崩れる〜！',
      fever: '糖分、限界突破です！',
    },
  },
  swipe: {
    id: 'swipe',
    name: 'スワイパー',
    tag: '秒速連打',
    emoji: '⚡',
    color: '#ffe53d',
    color2: '#25e0ff',
    leaderName: 'スワイパー シュン',
    leaderArt: '🐆',
    mechanic: 'コンボ',
    mechanicDesc:
      '1ターンにカードを出すほどコンボが増える。【コンボX】はこのターンに他のカードをX枚以上プレイしていれば発動！',
    counter: 'combo',
    pitch: '秒で出して、秒で殴る。',
    lines: {
      start: '3秒で終わらせる。',
      evolve: '加速、加速、加速！',
      win: 'はい、次。',
      lose: '……巻き戻し、できない？',
      hurt: 'ちょ、速っ！？',
      fever: '倍速じゃ足りない、10倍速だ！',
    },
  },
  gamer: {
    id: 'gamer',
    name: 'ゲーマー',
    tag: '育成無双',
    emoji: '🎮',
    color: '#3dff95',
    color2: '#a066ff',
    leaderName: 'ゲーマー レベル丸',
    leaderArt: '🐼',
    mechanic: 'レベル・課金',
    mechanicDesc:
      '【レベル】を持つフォロワーは攻撃するとEXP+1（相手のフォロワーを倒したら+2）。たまるとレベルアップして体力も全回復！【課金X】はPPがX以上あれば、Xを払って強化版でプレイ。',
    counter: 'level',
    pitch: 'レベルを上げて、物理で殴れ。',
    lines: {
      start: 'よろしくお願いしまーす（ガチ勢）',
      evolve: 'レベルアップ！ テレレレッテッテー！',
      win: 'GG！ 経験値うまい！',
      lose: 'ラグかった。絶対ラグかった。',
      hurt: 'HPミリなんだけど！？',
      fever: '無双モード、突入！',
    },
  },
};

export const PLAYABLE_CLASSES: ClassId[] = ['gacha', 'stream', 'sweets', 'swipe', 'gamer'];

export interface KeywordMeta {
  name: string;
  icon: string;
  desc: string;
}

export const KEYWORDS: Record<Keyword, KeywordMeta> = {
  ward: { name: '守護', icon: '🛡️', desc: '相手はこのフォロワーを倒すまで、他のフォロワーやリーダーを攻撃できない。' },
  storm: { name: '疾走', icon: '💨', desc: '場に出たターンから、フォロワーにもリーダーにも攻撃できる。' },
  rush: { name: '突進', icon: '🐗', desc: '場に出たターンから、フォロワーに攻撃できる。' },
  bane: { name: '必殺', icon: '☠️', desc: 'ダメージを与えたフォロワーを破壊する。' },
  drain: { name: 'ドレイン', icon: '💗', desc: '攻撃でダメージを与えたとき、その分だけ自分のリーダーを回復。' },
  ambush: { name: '潜伏', icon: '👻', desc: '攻撃するまで、相手に攻撃されず、能力で選ばれない。' },
  barrier: { name: 'バリア', icon: '🔰', desc: '次に受けるダメージを1回だけ0にする。' },
  aura: { name: 'オーラ', icon: '✨', desc: '相手のスペルや能力で選ばれない。' },
  twin: { name: '連撃', icon: '⚔️', desc: '1ターンに2回攻撃できる。' },
};

/** ability labels that appear in 【】 in card text */
export const ABILITIES: Record<string, string> = {
  ファンファーレ: 'カードを手札から出したときに発動。',
  ラストワード: '破壊されたときに発動。',
  進化時: '進化させたときに発動。超進化でも発動する。',
  超進化時: '超進化させたときに発動。',
  攻撃時: 'このフォロワーが攻撃するときに発動。',
  交戦時: 'このフォロワーがフォロワーと戦うときに発動。',
  カウントダウン3: '自分のターン開始時に1減り、0になると破壊される。',
  カウントダウン2: '自分のターン開始時に1減り、0になると破壊される。',
  カウントダウン4: '自分のターン開始時に1減り、0になると破壊される。',
  '自分のターン開始時': '自分のターンのはじめに発動。',
  '自分のターン終了時': '自分のターンのおわりに発動。',
  ガチャ: 'N/R/SR/SSRのどれかを引く。SSR以外なら運気+1。運気6で次はSSR確定。',
  確変: '次のガチャがSR以上確定になる。',
  運気: 'ガチャでSSRが出る確率が上がる。6で天井（SSR確定）。',
  いいね: 'カードをプレイするたびに1増える。バズで消費する。',
  バズ3: 'いいねが3以上あれば、3消費して発動。',
  バズ4: 'いいねが4以上あれば、4消費して発動。',
  バズ5: 'いいねが5以上あれば、5消費して発動。',
  バズ6: 'いいねが6以上あれば、6消費して発動。',
  バズ10: 'いいねが10以上あれば、10消費して発動。',
  シュガーハイ10: '糖度が10以上なら発動（糖度は消費しない）。',
  シュガーハイ15: '糖度が15以上なら発動（糖度は消費しない）。',
  シュガーハイ20: '糖度が20以上なら発動（糖度は消費しない）。',
  コンボ2: 'このターン、他のカードを2枚以上プレイしていれば発動。',
  コンボ3: 'このターン、他のカードを3枚以上プレイしていれば発動。',
  コンボ4: 'このターン、他のカードを4枚以上プレイしていれば発動。',
  課金3: 'PPが3以上あれば、3PP払って強化版でプレイ。',
  課金4: 'PPが4以上あれば、4PP払って強化版でプレイ。',
  課金5: 'PPが5以上あれば、5PP払って強化版でプレイ。',
  課金6: 'PPが6以上あれば、6PP払って強化版でプレイ。',
  課金7: 'PPが7以上あれば、7PP払って強化版でプレイ。',
  課金9: 'PPが9以上あれば、9PP払って強化版でプレイ。',
  課金10: 'PPが10あれば、10PP払って強化版でプレイ。',
  レベル: '攻撃するとEXP+1（相手のフォロワーを倒したら+2）。たまるとレベルアップして強くなり、体力も全回復する。',
};

export const RARITY: Record<Rarity, { name: string; short: string; color: string; craft: number; dust: number; order: number }> = {
  bronze: { name: 'ブロンズ', short: 'B', color: '#d08a4e', craft: 40, dust: 10, order: 0 },
  silver: { name: 'シルバー', short: 'S', color: '#cfd8e8', craft: 120, dust: 30, order: 1 },
  gold: { name: 'ゴールド', short: 'G', color: '#ffd23f', craft: 500, dust: 100, order: 2 },
  legend: { name: 'レジェンド', short: 'L', color: '#ff5fd2', craft: 2000, dust: 400, order: 3 },
};
