// One card renderer, three sizes (board / hand / preview). Art is the whole face; text floats on a
// scrim. Every number shown comes from an engine door (CLAUDE.md rule 2).
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const esc = ui.esc;

  const PHASE_ICON = { build: '🔨', adventure: '⚔️', both: '🔨⚔️' };
  const PHASE_NAME = { build: 'Build', adventure: 'Adventure', both: 'Build or Adventure' };

  /**
   * opts: { size: 'board'|'hand'|'preview'|'mini', s (state, for live numbers), seat (dungeon owner),
   *   slot, roles: [css classes], back: bool, covered: n, extra: html }
   */
  ui.card = (iid, id, opts = {}) => {
    const size = opts.size || 'board';
    const roles = (opts.roles || []).join(' ');
    if (opts.back) {
      return `<div class="card back size-${size} ${roles}" ${iid != null ? `data-iid="${iid}"` : ''}><img class="art" src="${ui.back()}" alt="" aria-hidden="true" draggable="false"></div>`;
    }
    const d = BF.CARD_DATA[id];
    const s = opts.s;
    const name = BF.cardName(id);
    const sub = BF.cardSubtitle(id);
    let corner = '';
    let pips = '';
    let kindLine = '';
    if (d.kind === 'room') {
      kindLine = `${d.adv ? 'Advanced ' : ''}${d.sub === 'monster' ? 'Monster' : 'Trap'} Room`;
      corner = `<span class="kind-pip ${d.adv ? 'gold' : ''}" title="${kindLine}">${d.sub === 'monster' ? '👹' : '⚙️'}</span>`;
      let dmg = d.dmg ?? '*';
      let boosted = '';
      if (s && opts.seat != null && opts.slot != null) {
        const live = BF.roomDamage(s, opts.seat, opts.slot);
        if (live !== d.dmg) boosted = live > (d.dmg ?? 0) ? 'up' : 'down';
        dmg = live;
      }
      pips = `<span class="dmg ${boosted}" title="Damage dealt to each Hero">${dmg}</span><span class="treasures">${ui.treasureHtml(d.treasure)}</span>`;
    } else if (d.kind === 'spell') {
      kindLine = `Spell · ${PHASE_NAME[d.phase]}`;
      corner = `<span class="kind-pip spell" title="Spell">✨</span>`;
      pips = `<span class="phase-tag" title="${kindLine}">${PHASE_ICON[d.phase]} ${PHASE_NAME[d.phase]}</span>`;
    } else if (d.kind === 'hero') {
      kindLine = `${d.epic ? 'Epic ' : ''}Hero`;
      let hp = `${d.health}`;
      let hurt = '';
      if (s && iid != null && s.cards[iid]) {
        const left = BF.heroLeft(s, iid);
        const max = BF.heroHealth(s, iid);
        if (left !== d.health) {
          hp = `${left}<small>/${max}</small>`;
          hurt = 'hurt';
        }
      }
      corner = d.treasure.length ? `<span class="kind-pip hero">${ui.treasureHtml(d.treasure)}</span>` : '<span class="kind-pip hero">?</span>';
      pips = `<span class="hp ${hurt}" title="Health">${hp}</span>${d.epic ? '<span class="epic-tag">EPIC</span>' : ''}`;
    } else if (d.kind === 'boss') {
      kindLine = `Boss · ${d.xp} XP`;
      corner = `<span class="kind-pip boss" title="Boss">👑</span>`;
      pips = `<span class="xp" title="XP sets turn order: highest first">${d.xp} XP</span><span class="treasures">${ui.treasureHtml(d.treasure)}</span>`;
    }
    const text = BF.cardText(id);
    const flavor = BF.cardFlavor(id);
    const covered = opts.covered ? `<span class="covered" title="${opts.covered} Room${opts.covered > 1 ? 's' : ''} underneath">+${opts.covered}</span>` : '';
    const body =
      size === 'preview'
        ? `<div class="pv-text"><div class="pv-kind">${esc(kindLine)}</div>${text ? `<p>${esc(text)}</p>` : ''}${flavor ? `<p class="flavor">${esc(flavor)}</p>` : ''}</div>`
        : '';
    return `<div class="card size-${size} kind-${d.kind} ${d.kind === 'room' ? `sub-${d.sub}` : ''} ${d.adv || d.epic ? 'gilded' : ''} ${roles}" ${
      iid != null ? `data-iid="${iid}"` : ''
    } data-card="${id}" tabindex="0">
      <img class="art" src="${ui.art(id)}" alt="" aria-hidden="true" draggable="false">
      <div class="nameplate"><b>${esc(name)}</b>${sub && size !== 'mini' ? `<small>${esc(sub)}</small>` : ''}</div>
      ${corner}${covered}
      <div class="pips">${pips}</div>
      ${body}${opts.extra || ''}
    </div>`;
  };

  ui.cardFor = (s, iid, opts = {}) => ui.card(iid, s.cards[iid].id, { s, ...opts });
})();
