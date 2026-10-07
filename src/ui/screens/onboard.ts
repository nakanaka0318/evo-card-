import { audio } from '../../audio/audio';
import { CLASSES, PLAYABLE_CLASSES, type ClassId } from '../../engine';
import { grantStarter } from '../../meta/economy';
import { save } from '../../meta/save';
import { btn } from '../common';
import { h } from '../dom';
import { flash } from '../fx/fx';
import { particles } from '../fx/particles';
import { go, type ScreenFn } from '../router';
import { stage } from '../stage';

export const onboardScreen: ScreenFn = (root) => {
  const step1 = () => {
    root.replaceChildren();
    const input = h('input.name-input', { id: 'player-name', maxlength: '10', value: save.data.name, placeholder: 'ドパ民', 'aria-label': 'プレイヤー名' }) as HTMLInputElement;
    root.append(
      h(
        'div.onb',
        h('div.onb-kicker', 'STEP 1 / 2'),
        h('div.onb-title', 'きみの名前は？'),
        h('div.onb-sub', 'あとから設定で変えられるよ'),
        input,
        btn('決定！', () => {
          const v = input.value.trim().slice(0, 10);
          save.update((d) => (d.name = v || 'ドパ民'));
          step2();
        }, 'btn-hot btn-big'),
      ),
    );
    setTimeout(() => input.focus(), 50);
  };
  const step2 = () => {
    root.replaceChildren();
    let picked: ClassId | null = null;
    const go2 = btn('このクラスではじめる！', () => {
      if (!picked) return;
      finish(picked);
    }, 'btn-hot btn-big disabled');
    const cards = PLAYABLE_CLASSES.map((c) => {
      const m = CLASSES[c];
      const el = h(
        `button.class-pick.cls-${c}`,
        {
          type: 'button',
          style: { '--c1': m.color, '--c2': m.color2 },
          onclick: () => {
            audio.play('flip');
            picked = c;
            root.querySelectorAll('.class-pick').forEach((x) => x.classList.toggle('on', x === el));
            go2.classList.remove('disabled');
            particles.burst(stage.w / 2, stage.h / 2, { n: 24, colors: [m.color, m.color2, '#fff'], speed: 9, type: 'star' });
          },
        },
        h('div.cp-art', m.leaderArt),
        h('div.cp-emoji', m.emoji),
        h('div.cp-name', m.name),
        h('div.cp-tag', m.tag),
        h('div.cp-pitch', m.pitch),
        h('div.cp-mech', m.mechanic),
      );
      return el;
    });
    root.append(
      h(
        'div.onb',
        h('div.onb-kicker', 'STEP 2 / 2'),
        h('div.onb-title', '最初のクラスを選ぼう'),
        h('div.onb-sub', '全クラスのスターターデッキがもらえる。あとで自由に乗り換えOK！'),
        h('div.class-picks', cards),
        go2,
      ),
    );
  };
  const finish = (cls: ClassId) => {
    save.update((d) => {
      if (!d.flags.starter) {
        grantStarter(d);
        d.flags.starter = true;
      }
      d.favoriteClass = cls;
      d.activeDeck = d.decks.find((x) => x.cls === cls)?.id ?? d.decks[0]?.id ?? '';
      d.flags.onboarded = true;
    });
    audio.play('unlock');
    flash('#fff', 0.7, 300);
    void go('battle', { mode: 'story', stage: '1-1', tutorial: true });
  };
  step1();
};
