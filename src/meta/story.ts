import type { ClassId, Difficulty } from '../engine';
import type { Reward } from './economy';

export interface StageDef {
  id: string;
  chapter: number;
  name: string;
  enemy: string;
  art: string;
  cls: ClassId;
  diff: Difficulty;
  hp: number;
  quality: number;
  favor?: string[];
  boss?: boolean;
  reward: Reward;
  lines: { start: string; win: string; lose: string };
}

export interface ChapterDef {
  n: number;
  name: string;
  sub: string;
  cls: ClassId;
  bg: string;
}

export const CHAPTERS: ChapterDef[] = [
  { n: 1, name: 'ガチャの洞窟', sub: '回せ、回せ、運命を', cls: 'gacha', bg: '🎰' },
  { n: 2, name: 'バズの塔', sub: 'いいねの頂上を目指せ', cls: 'stream', bg: '📱' },
  { n: 3, name: 'スイーツ王国', sub: '甘い罠にご用心', cls: 'sweets', bg: '🍰' },
  { n: 4, name: 'ショート動画ハイウェイ', sub: '15秒で決着をつけろ', cls: 'swipe', bg: '⚡' },
  { n: 5, name: 'ゲーマーの城', sub: 'ラスボスはレベル99', cls: 'gamer', bg: '🎮' },
  { n: 6, name: 'ドーパミンの玉座', sub: 'すべての刺激の頂点へ', cls: 'gacha', bg: '👑' },
];

export const STAGES: StageDef[] = [
  {
    id: '1-1', chapter: 1, name: 'はじめてのガチャ', enemy: 'カプセル団', art: '🥚', cls: 'gacha', diff: 'easy', hp: 14, quality: 0.2,
    reward: { coins: 200, gems: 50 },
    lines: { start: 'カプセルカプセル〜！', win: 'カプセル大勝利〜！', lose: 'パカッ（割れた）' },
  },
  {
    id: '1-2', chapter: 1, name: '天井まであと少し', enemy: 'ガチャ廃人ゴロウ', art: '🤑', cls: 'gacha', diff: 'normal', hp: 18, quality: 0.4,
    reward: { coins: 250, gems: 50 },
    lines: { start: '今月の給料、全部突っ込んだ！', win: 'ほらな！ 回せば出るんだよ！', lose: '……来月は、きっと……' },
  },
  {
    id: '1-3', chapter: 1, name: 'ガチャ姫の御前', enemy: 'ガチャ姫 ルーレ', art: '👸', cls: 'gacha', diff: 'hard', hp: 24, quality: 0.8, boss: true, favor: ['g_roule', 'g_jackpot', 'g_ten'],
    reward: { coins: 400, gems: 100, tickets: 2 },
    lines: { start: '運も実力のうち。さあ、回しましょう？', win: 'SSRは、わたくしに微笑みましたわ', lose: '確率……収束しませんでしたわ……' },
  },
  {
    id: '2-1', chapter: 2, name: '同接3人の配信', enemy: '新人配信者ぴよ', art: '🐣', cls: 'stream', diff: 'normal', hp: 18, quality: 0.3,
    reward: { coins: 250, gems: 50 },
    lines: { start: 'あ、あの、見てくれてありがとうございます！', win: 'え、勝っちゃった！？ 切り抜いて！', lose: '配信、ここまでです……' },
  },
  {
    id: '2-2', chapter: 2, name: '炎上上等', enemy: '炎上系アンチ丸', art: '😈', cls: 'stream', diff: 'hard', hp: 20, quality: 0.6, favor: ['s_flame', 's_anti'],
    reward: { coins: 300, gems: 60 },
    lines: { start: '燃やせば伸びるんだよォ！', win: '燃えた燃えた！ 再生数爆上がり！', lose: '……鎮火しました' },
  },
  {
    id: '2-3', chapter: 2, name: '100万人記念配信', enemy: '超人気Vtuber バズリン', art: '🦊', cls: 'stream', diff: 'hard', hp: 25, quality: 0.9, boss: true, favor: ['s_buzzrin', 's_algo', 's_trend'],
    reward: { coins: 450, gems: 120, tickets: 2 },
    lines: { start: 'こんバズ〜！ 今日のゲストはキミだよ！', win: 'みんな〜、高評価ありがと〜！', lose: 'え、待って、コメ欄が……' },
  },
  {
    id: '3-1', chapter: 3, name: 'マカロン行進曲', enemy: 'マカロン兵団', art: '🐤', cls: 'sweets', diff: 'hard', hp: 20, quality: 0.5,
    reward: { coins: 300, gems: 60 },
    lines: { start: 'ピヨピヨ（甘くしてやる）', win: 'ピヨ！（おいしかった）', lose: 'ピ……（溶けた）' },
  },
  {
    id: '3-2', chapter: 3, name: 'パフェ要塞', enemy: 'パフェ将軍', art: '🍨', cls: 'sweets', diff: 'hard', hp: 24, quality: 0.7, favor: ['w_parfait', 'w_wedding'],
    reward: { coins: 300, gems: 60 },
    lines: { start: 'この層、突破できるかな？', win: 'まだまだ層は厚いぞ！', lose: 'くっ、崩された……！' },
  },
  {
    id: '3-3', chapter: 3, name: 'いちご女王の晩餐会', enemy: 'いちご女王アマミ', art: '🍓', cls: 'sweets', diff: 'oni', hp: 26, quality: 0.9, boss: true, favor: ['w_amami', 'w_cotton', 'w_fountain'],
    reward: { coins: 500, gems: 150, tickets: 2 },
    lines: { start: 'ようこそ。とろけるまで、帰さないわ', win: '甘い夢を、ご堪能あれ', lose: 'わたくしのケーキが……！' },
  },
  {
    id: '4-1', chapter: 4, name: '15秒の嵐', enemy: '15秒リス団', art: '🐿️', cls: 'swipe', diff: 'hard', hp: 20, quality: 0.6,
    reward: { coins: 300, gems: 60 },
    lines: { start: 'はい、スタート！ はい、終わり！', win: '次の動画いこ！', lose: 'スワイプされた……' },
  },
  {
    id: '4-2', chapter: 4, name: '倍速の修行', enemy: '早送り忍者', art: '⏩', cls: 'swipe', diff: 'oni', hp: 22, quality: 0.7, favor: ['x_ninja', 'x_falcon'],
    reward: { coins: 350, gems: 80 },
    lines: { start: '拙者、2倍速でしか動けぬ', win: '遅い、遅すぎる', lose: '……再生停止' },
  },
  {
    id: '4-3', chapter: 4, name: '秒速の覇者', enemy: '秒速の覇者シュン', art: '🐆', cls: 'swipe', diff: 'oni', hp: 25, quality: 1, boss: true, favor: ['x_shun', 'x_runner', 'x_scroll'],
    reward: { coins: 550, gems: 150, tickets: 3 },
    lines: { start: '3秒で終わらせる', win: 'タイム更新。', lose: '……ありえない。この俺が？' },
  },
  {
    id: '5-1', chapter: 5, name: 'はじまりの草原', enemy: 'スライム軍団', art: '💧', cls: 'gamer', diff: 'oni', hp: 22, quality: 0.6,
    reward: { coins: 350, gems: 80 },
    lines: { start: 'ぷるぷる。ぼくら、わるいスライムだよ', win: 'ぷるーん！ レベルアップ！', lose: 'ぷる……（経験値になった）' },
  },
  {
    id: '5-2', chapter: 5, name: '中ボスの間', enemy: '中ボス', art: '👹', cls: 'gamer', diff: 'oni', hp: 26, quality: 0.8, favor: ['m_boss', 'm_raid'],
    reward: { coins: 400, gems: 100 },
    lines: { start: 'フフフ……ここまで来たか（4回目）', win: '出直してくるがいい！', lose: 'ぐわあああ！（またか）' },
  },
  {
    id: '5-3', chapter: 5, name: '魔王城・最上階', enemy: '魔王ラスボス', art: '👿', cls: 'gamer', diff: 'oni', hp: 28, quality: 1, boss: true, favor: ['m_maou', 'm_level', 'm_brave'],
    reward: { coins: 600, gems: 200, tickets: 3 },
    lines: { start: 'よくぞ来た。だが、課金が足りぬ', win: '世界の半分は、やらぬ', lose: 'まさか……無課金で……！？' },
  },
  {
    id: 'final', chapter: 6, name: 'ドーパミン大王', enemy: 'ドーパミン大王', art: '🤴', cls: 'gacha', diff: 'oni', hp: 32, quality: 1, boss: true, favor: ['n_king', 'n_lucky7', 'g_roule', 'n_unicorn', 'n_reset'],
    reward: { coins: 1500, gems: 500, tickets: 10 },
    lines: { start: '足りぬ……刺激が足りぬ！ 貴様の脳汁を見せてみよ！', win: 'もっとだ……もっと刺激を……！', lose: 'これが……真のドーパミン……！' },
  },
];

export function stageUnlocked(story: Record<string, number>, idx: number): boolean {
  if (idx === 0) return true;
  return (story[STAGES[idx - 1].id] ?? 0) > 0;
}

export function starsFor(win: boolean, hpLeft: number, turns: number): number {
  if (!win) return 0;
  let s = 1;
  if (hpLeft >= 10) s++;
  if (turns <= 10) s++;
  return s;
}
