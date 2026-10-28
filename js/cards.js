// Load-time validation of the card data and the names door. Validation throws on the first frame
// so a gap can never reach a player quietly (CLAUDE.md rules 7-8).
(function () {
  'use strict';
  const BF = globalThis.BF;
  if (!BF.CARD_DATA) throw new Error('data/cards.js is not loaded (see docs/takedown.md)');
  if (!BF.ABILITIES) throw new Error('js/abilities.js is not loaded');
  if (!BF.DEFECTS) throw new Error('data/defects.js is not loaded');

  const HOOKS = ['levelUp', 'onBuild', 'onDeath', 'acts', 'spell', 'passive'];
  const problems = [];
  for (const d of Object.values(BF.CARD_DATA)) {
    const a = BF.ABILITIES[d.id];
    const needsRules = d.kind !== 'hero' || d.id === 'BMR080';
    if (!needsRules) continue;
    if (!a) {
      problems.push(`${d.id}: no ability entry`);
      continue;
    }
    if (!a.own) problems.push(`${d.id}: no own-words gist`);
    if (a.unimplemented && !BF.DEFECTS[d.id]) problems.push(`${d.id}: unimplemented (${a.unimplemented}) but not in data/defects.js`);
    if (!a.unimplemented && !HOOKS.some((h) => a[h])) problems.push(`${d.id}: no behaviour hook`);
    if (d.kind === 'boss' && !a.levelUp) problems.push(`${d.id}: Boss without levelUp`);
    if (d.kind === 'spell' && !a.spell?.effect) problems.push(`${d.id}: Spell without effect`);
    for (const [key, act] of Object.entries(a.acts || {})) if (!act.effect) problems.push(`${d.id}.${key}: activated ability without effect`);
  }
  for (const id of Object.keys(BF.ABILITIES)) if (!BF.CARD_DATA[id]) problems.push(`${id}: ability for an unknown card`);
  for (const id of Object.keys(BF.DEFECTS)) if (!BF.CARD_DATA[id]) problems.push(`${id}: defect entry for an unknown card`);
  if (problems.length) throw new Error(`Card validation failed:\n${problems.join('\n')}`);

  // ---------------------------------------------------------------- the names door
  // Printed names and text come from data/printed.js when it is loaded (PLAN D2); without it the
  // game runs on generic names and our own words (CLAUDE.md regime 4, docs/takedown.md).

  const TYPE = { cleric: 'Cleric', fighter: 'Fighter', mage: 'Mage', thief: 'Thief' };
  const generic = (d) => {
    if (d.kind === 'boss') return `Boss ${d.id.slice(3)} (${d.xp} XP)`;
    if (d.kind === 'room') return `${d.adv ? 'Advanced ' : ''}${d.sub === 'monster' ? 'Monster' : 'Trap'} Room ${d.id.slice(3)}`;
    if (d.kind === 'spell') return `Spell ${d.id.slice(3)}`;
    if (d.id === 'BMR080') return 'The Fool';
    return `${d.epic ? 'Epic ' : ''}${TYPE[d.treasure[0]]} ${d.id.slice(3)}`;
  };

  BF.printedOn = () => !!BF.PRINTED;
  BF.cardName = (id) => BF.PRINTED?.[id]?.name ?? generic(BF.CARD_DATA[id]);
  BF.cardSubtitle = (id) => BF.PRINTED?.[id]?.subtitle ?? null;
  /** Rules text on the face: printed text verbatim, or our own words without the printed pack. */
  BF.cardText = (id) => BF.PRINTED?.[id]?.text ?? BF.ABILITIES[id]?.own ?? '';
  BF.cardFlavor = (id) => BF.PRINTED?.[id]?.flavor ?? '';
  BF.ownText = (id) => BF.ABILITIES[id]?.own ?? '';
})();
