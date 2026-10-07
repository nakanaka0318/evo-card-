import { audio } from '../../audio/audio';
import { music } from '../../audio/music';
import { CLASSES, PLAYABLE_CLASSES } from '../../engine';
import { save } from '../../meta/save';
import { btn, confirmModal, topBar } from '../common';
import { fmtNum, h } from '../dom';
import { fxConfig, toast } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';

export function applySettings(): void {
  const s = save.data.settings;
  audio.setVolumes(s.sfx, s.bgm);
  fxConfig.intensity = s.intensity;
  fxConfig.flashReduce = s.flashReduce;
  fxConfig.speed = s.speed;
  fxConfig.vibrate = s.vibrate;
  particles.intensity = s.intensity;
  document.documentElement.classList.toggle('calm', s.intensity === 0);
  document.documentElement.classList.toggle('flash-reduce', s.flashReduce);
}

export const settingsScreen: ScreenFn = (root) => {
  music.play('home');
  const tb = topBar({ back: () => void go('home'), title: '設定' });
  const body = h('div.set-body');
  const draw = () => {
    const s = save.data.settings;
    const slider = (id: string, label: string, v: number, set: (n: number) => void) => {
      const input = h('input', { type: 'range', id, min: '0', max: '100', value: String(Math.round(v * 100)) }) as HTMLInputElement;
      input.addEventListener('input', () => {
        set(Number(input.value) / 100);
        applySettings();
      });
      input.addEventListener('change', () => audio.play('tap'));
      return h('label.set-row', { for: id }, h('span.set-label', label), input);
    };
    const choice = <T extends number>(label: string, opts: [T, string][], cur: T, set: (v: T) => void) =>
      h(
        'div.set-row',
        h('span.set-label', label),
        h(
          'div.set-chips',
          opts.map(([v, l]) =>
            h(`button.f-chip${cur === v ? '.on' : ''}`, { type: 'button', onclick: () => { save.update(() => set(v)); applySettings(); audio.play('tap'); draw(); } }, l),
          ),
        ),
      );
    const toggle = (label: string, desc: string, cur: boolean, set: (v: boolean) => void) =>
      h(
        'div.set-row',
        h('span.set-label', label, h('small', desc)),
        h(`button.toggle${cur ? '.on' : ''}`, { type: 'button', role: 'switch', 'aria-checked': String(cur), onclick: () => { save.update(() => set(!cur)); applySettings(); audio.play('tap'); draw(); } }, h('span')),
      );
    const nameInput = h('input.name-input', { id: 'set-name', maxlength: '10', value: save.data.name, 'aria-label': 'プレイヤー名' }) as HTMLInputElement;
    nameInput.addEventListener('change', () => {
      save.update((d) => (d.name = nameInput.value.trim().slice(0, 10) || 'ドパ民'));
      toast('名前を変更した', '✏️');
    });
    const st = save.data.stats;
    const wr = st.games ? Math.round((st.wins / st.games) * 100) : 0;
    body.replaceChildren(
      h(
        'div.set-section',
        h('div.set-h', 'サウンド'),
        slider('set-sfx', '効果音', s.sfx, (n) => save.update((d) => (d.settings.sfx = n))),
        slider('set-bgm', 'BGM', s.bgm, (n) => save.update((d) => (d.settings.bgm = n))),
      ),
      h(
        'div.set-section',
        h('div.set-h', '演出'),
        choice('ドパ度', [[0, '控えめ'], [1, '普通'], [2, 'MAX']], s.intensity, (v) => (save.data.settings.intensity = v)),
        choice('バトル速度', [[1, 'x1'], [1.5, 'x1.5'], [2, 'x2'], [3, 'x3']], s.speed, (v) => (save.data.settings.speed = v)),
        toggle('フラッシュ軽減', '画面の点滅を弱くする', s.flashReduce, (v) => (save.data.settings.flashReduce = v)),
        toggle('振動', '対応端末で大ダメージ時に振動', s.vibrate, (v) => (save.data.settings.vibrate = v)),
        toggle('ヒント', 'バトル中に次の一手を教えてくれる', s.hints, (v) => (save.data.settings.hints = v)),
      ),
      h('div.set-section', h('div.set-h', 'プレイヤー'), h('label.set-row', { for: 'set-name' }, h('span.set-label', '名前'), nameInput)),
      h(
        'div.set-section',
        h('div.set-h', '戦績'),
        h(
          'div.stats-grid',
          stat('対戦', st.games),
          stat('勝利', st.wins),
          stat('勝率', `${wr}%`),
          stat('最高スコア', fmtNum(save.data.highScore)),
          stat('最大コンボ', st.maxCombo),
          stat('最大ヒット', st.maxHit),
          stat('撃破', st.kills),
          stat('超進化', st.supers),
          stat('FEVER', st.fevers),
          stat('最大連勝', save.data.bestStreak),
          stat('ガチャ', st.pulls),
          stat('レジェンド', st.legendsPulled),
          ...PLAYABLE_CLASSES.map((c) => stat(`${CLASSES[c].emoji}勝利`, st.classWins[c] ?? 0)),
        ),
      ),
      h(
        'div.set-section',
        h('div.set-h', 'データ'),
        h('p.set-note', 'セーブデータはこのブラウザに保存されます（claude.aiで開いているときはアカウントにも同期）。'),
        btn('データをリセット', async () => {
          if (!(await confirmModal('すべてのデータを消して最初からやり直す？', '消す'))) return;
          if (!(await confirmModal('本当に？ カードもコインも全部消えるよ！', '本当に消す'))) return;
          save.reset();
          void go('title');
        }, 'btn-danger'),
      ),
      h('div.set-credit', 'ドパバース — 音もイラストもすべてコードで生成しています'),
    );
  };
  draw();
  root.append(tb.el, body);
  return () => tb.dispose();
};

function stat(label: string, v: number | string): HTMLElement {
  return h('div.stat', h('div.stat-v', String(v)), h('div.stat-l', label));
}
