import { ABILITIES, allDefs, CLASSES, def, KEYWORDS, RARITY, type CardDef, type CardView, type Keyword } from '../engine';
import { h } from './dom';

export const CARD_W = 180;
export const CARD_H = 252;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

/** card text -> html with styled keywords, ability labels and gacha tiers */
export function formatText(text: string): string {
  let t = esc(text);
  t = t.replace(/【([^】]+)】/g, (_m, a: string) => `<b class="ab ab-${abilityKind(a)}">${a}</b>`);
  t = t.replace(/《([^》]+)》/g, (_m, k: string) => {
    const kw = Object.values(KEYWORDS).find((x) => x.name === k);
    return `<span class="kw">${kw ? kw.icon : ''}${k}</span>`;
  });
  t = t.replace(/(^|\s|\n)(SSR|SR|N・R|N|R):/g, (_m, pre: string, tier: string) => `${pre}<span class="tier tier-${tier.replace('・', '')}">${tier}</span>`);
  t = t.replace(/「([^」]+)」/g, '<span class="ref">「$1」</span>');
  return t.replace(/\n/g, '<br>');
}

function abilityKind(a: string): string {
  if (a.startsWith('バズ')) return 'buzz';
  if (a.startsWith('シュガーハイ')) return 'sugar';
  if (a.startsWith('コンボ')) return 'combo';
  if (a.startsWith('課金')) return 'enhance';
  if (a.startsWith('合体') || a.startsWith('コンプリート')) return 'gadget';
  if (a.startsWith('財宝')) return 'treasure';
  if (a === 'ハモり') return 'harmony';
  if (a.startsWith('破壊') || a === 'いけにえ') return 'crash';
  if (a.startsWith('連携')) return 'ranger';
  if (a === 'スペルブースト') return 'witch';
  if (a.startsWith('ハンドレス') || a === '捨てられた時') return 'minimal';
  if (a.startsWith('結晶') || a.startsWith('アクセラレート') || a.startsWith('エンハンス')) return 'jewel';
  if (a.startsWith('カウントダウン')) return 'cd';
  if (a === 'ガチャ' || a === '確変') return 'gacha';
  if (a === 'レベル') return 'level';
  return 'base';
}

export function abilityDesc(label: string): string | null {
  if (ABILITIES[label]) return ABILITIES[label];
  let m = label.match(/^バズ(\d+)$/);
  if (m) return `いいねが${m[1]}以上あれば、${m[1]}消費して発動。`;
  m = label.match(/^シュガーハイ(\d+)$/);
  if (m) return `糖度が${m[1]}以上なら発動（糖度は消費しない）。`;
  m = label.match(/^コンボ(\d+)$/);
  if (m) return `このターン、他のカードを${m[1]}枚以上プレイしていれば発動。`;
  m = label.match(/^課金(\d+)$/);
  if (m) return `PPが${m[1]}以上あれば、${m[1]}PP払って強化版でプレイ。`;
  m = label.match(/^合体(\d+)$/);
  if (m) return `手札のパーツを最大${m[1]}枚取り込む（手札から消える）。取り込んだ枚数で効果が変わる。`;
  m = label.match(/^コンプリート(\d+)$/);
  if (m) return `このバトルで出した／取り込んだパーツが${m[1]}種類以上なら発動。`;
  m = label.match(/^破壊(\d+)$/);
  if (m) return `このバトルで自分のカードが${m[1]}回以上壊れていれば発動。`;
  m = label.match(/^連携(\d+)$/);
  if (m) return `このバトルで場に出た自分のフォロワーが${m[1]}体以上なら発動。`;
  m = label.match(/^ハンドレス(\d+)$/);
  if (m) return `自分の手札が${m[1]}枚以下なら発動。`;
  m = label.match(/^アクセラレート(\d+)$/);
  if (m) return `PPがコストに足りないとき、${m[1]}PPでスペルとして使える（このフォロワーは場に出ない）。`;
  m = label.match(/^結晶(\d+)$/);
  if (m) return `PPがコストに足りないとき、${m[1]}PPで「結晶」として出せる。カウントダウンが0になると、このフォロワーが出てきてすぐに攻撃できる（ファンファーレは発動しない）。`;
  m = label.match(/^エンハンス(\d+)$/);
  if (m) return `PPが${m[1]}以上あれば、${m[1]}PP払って強化版でプレイ。`;
  m = label.match(/^財宝(\d+)$/);
  if (m) return `このバトルで財宝を${m[1]}枚以上使っていれば発動。`;
  m = label.match(/^カウントダウン(\d+)$/);
  if (m) return '自分のターン開始時に1減り、0になると破壊される。';
  return null;
}

/** list of keyword/ability explanations that appear on a card */
export function glossary(d: CardDef): { name: string; desc: string }[] {
  const out: { name: string; desc: string }[] = [];
  const seen = new Set<string>();
  const add = (name: string, desc: string | null) => {
    if (!desc || seen.has(name)) return;
    seen.add(name);
    out.push({ name, desc });
  };
  for (const m of d.text.matchAll(/《([^》]+)》/g)) {
    const kw = Object.values(KEYWORDS).find((x) => x.name === m[1]);
    if (kw) add(`${kw.icon}${kw.name}`, kw.desc);
  }
  for (const m of d.text.matchAll(/【([^】]+)】/g)) add(m[1], abilityDesc(m[1]));
  if (d.text.includes('運気')) add('運気', ABILITIES['運気']);
  if (d.text.includes('いいね')) add('いいね', ABILITIES['いいね']);
  if (d.text.includes('EXP')) add('EXP', ABILITIES['レベル']);
  if (d.text.includes('パーツ')) add('パーツ', ABILITIES['パーツ']);
  if (d.text.includes('財宝')) add('財宝', ABILITIES['財宝']);
  if (d.text.includes('コーラス')) add('コーラス', ABILITIES['コーラス']);
  if (d.text.includes('ガラクタ')) add('ガラクタ', ABILITIES['ガラクタ']);
  if (d.text.includes('「結晶」')) add('結晶', ABILITIES['結晶']);
  if (d.text.includes('変身')) add('変身', '進化のこと。進化ポイントを使わずに進化させる効果もある。');
  if (d.text.includes('進化ポイント')) add('進化ポイント', ABILITIES['進化ポイント']);
  if (d.text.includes('捨てる')) add('捨てる', '自分の手札を捨てる。【捨てられた時】を持つカードが優先され、なければランダム。');
  if (d.text.includes('DOPA')) add('DOPAゲージ', 'カードを出したり敵を倒したりすると溜まる。満タンでFEVER発動！');
  return out;
}

/** cards named in 「」 in this card's text (tokens it makes, cards it adds…), excluding itself */
export function relatedCards(d: CardDef): CardDef[] {
  const out: CardDef[] = [];
  for (const m of d.text.matchAll(/「([^」]+)」/g)) {
    // prefer another card with that name (e.g. the free token version of スキップ)
    const r = allDefs().find((x) => x.name === m[1] && x.id !== d.id);
    if (r && r.id !== d.id && !out.includes(r)) out.push(r);
  }
  return out;
}

/** 関連カード block shown under a card's description */
export function relatedBlock(d: CardDef): HTMLElement | null {
  const list = relatedCards(d);
  if (!list.length) return null;
  return h(
    'div.related',
    h('div.related-h', '関連カード'),
    list.map((r) =>
      h(
        'div.related-row',
        h('div.related-card', staticCard(r.id, 'collection')),
        h(
          'div.related-info',
          h('div.related-name', r.name),
          h(
            'div.related-meta',
            `コスト${r.cost}`,
            r.type === 'follower' ? `　${r.atk ?? 0}/${r.hp ?? 0}` : r.type === 'spell' ? '　スペル' : '　アミュレット',
          ),
          r.text ? h('div.related-text', { html: formatText(r.text) }) : h('div.related-text.flavor', r.flavor ?? ''),
        ),
      ),
    ),
  );
}

export interface CardElOpts {
  zone?: 'hand' | 'board' | 'detail' | 'collection' | 'mini';
  facedown?: boolean;
  prism?: boolean;
  uid?: number;
}

/** Build a card element. Stats are filled by updateCard(). */
export function createCard(id: string, o: CardElOpts = {}): HTMLElement {
  const d = def(id);
  const cm = CLASSES[d.cls];
  const el = h(
    `div.card.zone-${o.zone ?? 'hand'}.cls-${d.cls}.r-${d.rarity}.t-${d.type}`,
    {
      style: { '--c1': cm.color, '--c2': cm.color2, '--rc': RARITY[d.rarity].color },
      'data-id': id,
      'data-uid': o.uid ?? '',
    },
    h(
      'div.card-inner',
      h(
        'div.card-face',
        h(
          'div.card-art',
          h('div.art-bg'),
          h('div.art-pattern'),
          h('div.art-glyph', d.art),
          d.art2 ? h('div.art-glyph2', d.art2) : null,
          h('div.art-shine'),
        ),
        h('div.card-frame'),
        d.cls !== 'neutral' ? h('div.card-cls', cm.emoji) : null,
        h('div.card-cost', h('span.cost-num', String(d.cost))),
        h('div.card-name', h('span', d.name)),
        h('div.card-type', d.type === 'spell' ? 'スペル' : d.type === 'amulet' ? 'アミュレット' : ''),
        d.text ? h('div.card-text', { html: formatText(d.text) }) : h('div.card-text.flavor-only', d.flavor ?? ''),
        d.type === 'follower' ? h('div.card-atk', h('span.stat-num', String(d.atk ?? 0))) : null,
        d.type === 'follower' ? h('div.card-hp', h('span.stat-num', String(d.hp ?? 0))) : null,
        h('div.card-kws'),
        h('div.card-badges'),
        h('div.card-lv'),
        d.type === 'amulet' && d.countdown ? h('div.card-cd', String(d.countdown)) : null,
      ),
      h('div.card-back', h('div.back-logo', 'D')),
    ),
  );
  if (o.facedown) el.classList.add('facedown');
  if (o.prism) el.classList.add('prism');
  return el;
}

function setText(el: Element | null, v: string): void {
  if (el && el.textContent !== v) el.textContent = v;
}

/** apply live stats from the engine view */
export function updateCard(el: HTMLElement, v: CardView, zone: 'hand' | 'board'): void {
  const d = def(v.id);
  if (el.dataset.id !== v.id) {
    // transformed into another card: rebuild the face
    const fresh = createCard(v.id, { zone, uid: v.uid });
    el.dataset.id = v.id;
    const keep = ['prism', 'facedown'].filter((c) => el.classList.contains(c));
    el.className = [fresh.className, ...keep].join(' ');
    for (const k of ['--c1', '--c2', '--rc']) el.style.setProperty(k, fresh.style.getPropertyValue(k));
    el.replaceChildren(...Array.from(fresh.childNodes));
  }
  el.classList.toggle('zone-hand', zone === 'hand');
  el.classList.toggle('zone-board', zone === 'board');
  const cost = el.querySelector('.cost-num');
  setText(cost, String(v.cost));
  el.classList.toggle('cost-down', v.cost < d.cost);
  el.classList.toggle('cost-up', v.cost > d.cost);
  el.classList.toggle('enhanced', v.enhanced);
  const mode = v.mode ?? 'normal';
  if ((el.dataset.mode ?? 'normal') !== mode) {
    el.dataset.mode = mode;
    el.querySelector('.card-mode')?.remove();
    const label = mode === 'accel' ? 'アクセラレート' : mode === 'crystal' ? '結晶' : mode === 'enhance' && d.cls === 'jewel' ? 'エンハンス' : '';
    if (label) el.querySelector('.card-face')?.append(h(`div.card-mode.mode-${mode}`, label));
  }
  const boost = v.boost ?? -1;
  if (String(boost) !== (el.dataset.boost ?? '-1')) {
    el.dataset.boost = String(boost);
    el.querySelector('.card-boost')?.remove();
    if (boost >= 0) el.querySelector('.card-face')?.append(h(`div.card-boost${boost > 0 ? '.on' : ''}`, { title: 'スペルブースト' }, `✨${boost}`));
  }
  if (v.hold && el.dataset.hold !== v.hold) {
    el.dataset.hold = v.hold;
    const hd = def(v.hold);
    el.classList.add('crystal-hold');
    const glyph = el.querySelector('.art-glyph');
    if (glyph) glyph.textContent = hd.art;
    setText(el.querySelector('.card-name span'), `${hd.name}の結晶`);
    const text = el.querySelector('.card-text');
    if (text) text.innerHTML = formatText(`【ラストワード】「${hd.name}」が出てくる`);
  }
  if (d.type === 'follower') {
    const atk = el.querySelector('.card-atk');
    const hp = el.querySelector('.card-hp');
    setText(atk?.firstElementChild ?? null, String(v.atk));
    setText(hp?.firstElementChild ?? null, String(v.hp));
    const baseAtk = (d.atk ?? 0) + (v.evolved ? 2 : 0);
    atk?.classList.toggle('buffed', v.atk > (zone === 'board' ? baseAtk : d.atk ?? 0));
    atk?.classList.toggle('nerfed', v.atk < (d.atk ?? 0));
    hp?.classList.toggle('damaged', v.hp < v.maxHp);
    hp?.classList.toggle('buffed', v.hp >= v.maxHp && v.maxHp > (d.hp ?? 0) + (v.evolved ? 2 : 0));
  }
  if (v.trial !== el.classList.contains('trial')) {
    el.classList.toggle('trial', v.trial);
    const face = el.querySelector('.card-face');
    if (v.trial && face && !face.querySelector('.card-trial')) face.append(h('div.card-trial', { title: '未所持カード（お試し）' }, '🔰'));
    if (!v.trial) el.querySelector('.card-trial')?.remove();
  }
  el.classList.toggle('evolved', v.evolved === 1);
  el.classList.toggle('super', v.evolved === 2);
  el.classList.toggle('sick', v.sick);
  for (const k of Object.keys(KEYWORDS) as Keyword[]) el.classList.toggle(`kw-${k}`, v.kw.includes(k));
  const kws = el.querySelector('.card-kws');
  if (kws) {
    const sig = v.kw.join(',');
    if ((kws as HTMLElement).dataset.sig !== sig) {
      (kws as HTMLElement).dataset.sig = sig;
      kws.replaceChildren(...v.kw.map((k) => h('span.kw-icon', { title: KEYWORDS[k].name }, KEYWORDS[k].icon)));
    }
  }
  const lv = el.querySelector('.card-lv') as HTMLElement | null;
  if (lv) {
    if (d.level) {
      const sig = `${v.level}/${v.exp}/${v.expNeed}`;
      if (lv.dataset.sig !== sig) {
        lv.dataset.sig = sig;
        const pct = v.expNeed ? Math.round((v.exp / v.expNeed) * 100) : 100;
        lv.replaceChildren(h('span.lv-num', v.level >= d.level.max ? 'MAX' : `Lv${v.level}`), h('span.lv-bar', h('span.lv-fill', { style: { width: `${pct}%` } })));
      }
      lv.hidden = false;
    } else lv.hidden = true;
  }
  const cd = el.querySelector('.card-cd');
  if (cd && v.countdown >= 0) setText(cd, String(v.countdown));
  const badges = el.querySelector('.card-badges') as HTMLElement | null;
  if (badges) {
    const sig = `${v.evolved}`;
    if (badges.dataset.sig !== sig) {
      badges.dataset.sig = sig;
      badges.replaceChildren(...(v.evolved === 2 ? [h('span.badge-super', '超')] : v.evolved === 1 ? [h('span.badge-evo', '進')] : []));
    }
  }
}

/** shrink long card text until it fits its box (call after the card is in the DOM) */
export function fitCardText(root: ParentNode): void {
  requestAnimationFrame(() => {
    root.querySelectorAll<HTMLElement>('.zone-detail .card-text').forEach((t) => {
      let size = 9.5;
      t.style.fontSize = `${size}px`;
      while (t.scrollHeight > t.clientHeight + 1 && size > 6.5) {
        size -= 0.5;
        t.style.fontSize = `${size}px`;
      }
    });
  });
}

/** a static, fully readable card (collection, gacha, detail) */
export function staticCard(id: string, zone: CardElOpts['zone'] = 'detail', prism = false): HTMLElement {
  const d = def(id);
  const el = createCard(id, { zone, prism });
  if (d.type === 'follower') {
    updateCard(
      el,
      {
        uid: 0,
        id,
        atk: d.atk ?? 0,
        hp: d.hp ?? 0,
        maxHp: d.hp ?? 0,
        kw: d.kw ?? [],
        evolved: 0,
        cost: d.cost,
        countdown: d.countdown ?? -1,
        exp: 0,
        level: 1,
        expNeed: d.level?.exp ?? 0,
        sick: false,
        attacks: 0,
        enhanced: false,
        trial: false,
      },
      'hand',
    );
  }
  el.classList.remove('zone-hand');
  el.classList.add(`zone-${zone}`);
  return el;
}
