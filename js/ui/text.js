// Turns engine text tokens into readable, hoverable HTML. Log lines are stored by seat ([p:n]) and
// card instance ([c:iid]); second person for the viewer is produced here at render time.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;

  const esc = (ui.esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));

  // Third-person verb → the form used after "You".
  const VERB = {
    places: 'place', reveals: 'reveal', gains: 'gain', casts: 'cast', uses: 'use', takes: 'take',
    discards: 'discard', draws: 'draw', heals: 'heal', becomes: 'become', wins: 'win', swaps: 'swap',
    builds: 'build', removes: 'remove', has: 'have', puts: 'put', is: 'are', receives: 'receive',
  };

  const cardRef = (s, iid) => {
    const c = s.cards[iid];
    if (!c) return '?';
    const sub = BF.cardSubtitle(c.id);
    return `<span class="ref" data-iid="${iid}" data-card="${c.id}">${esc(BF.cardName(c.id))}${sub ? `<small>, ${esc(sub)}</small>` : ''}</span>`;
  };
  ui.cardRef = cardRef;

  /** Render a token string for viewer `me` (null = third person throughout). */
  ui.rich = (s, text, me) => {
    let out = esc(text);
    out = out.replace(/\[p:(\d+)\]'s/g, (m, seat) => (Number(seat) === me ? 'your' : `${esc(s.players[seat].name)}’s`));
    out = out.replace(/\[p:(\d+)\](\s+)(\w+)/g, (m, seat, sp, word) =>
      Number(seat) === me ? `You${sp}${VERB[word] ?? word}` : `${esc(s.players[seat].name)}${sp}${word}`,
    );
    out = out.replace(/\[p:(\d+)\]/g, (m, seat) => (Number(seat) === me ? 'you' : esc(s.players[seat].name)));
    out = out.replace(/\[c:(\d+)\]/g, (m, iid) => cardRef(s, Number(iid)));
    // Re-capitalise sentence starts ("your dungeon" opening a line).
    out = out.replace(/(^|[.!?]\s+)(your|you)\b/g, (m, pre, w) => pre + w[0].toUpperCase() + w.slice(1));
    return out;
  };

  ui.plain = (s, text, me) => {
    const div = document.createElement('div');
    div.innerHTML = ui.rich(s, text, me);
    return div.textContent;
  };

  ui.TREASURE_ICON = { cleric: '✚', fighter: '⚔', mage: '✦', thief: '◆' };
  ui.TREASURE_NAME = { cleric: 'Cleric', fighter: 'Fighter', mage: 'Mage', thief: 'Thief' };
  ui.treasureHtml = (list) =>
    list.map((t) => `<i class="tr tr-${t}" title="${ui.TREASURE_NAME[t]} treasure">${ui.TREASURE_ICON[t]}</i>`).join('');
})();
