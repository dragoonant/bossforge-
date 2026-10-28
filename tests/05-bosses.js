(function () {
  'use strict';
  const BF = globalThis.BF;
  const { test, eq, ok } = BF.T;
  const T = BF.T;

  const level = (cfg) => T.run(T.board(cfg), { k: 'levelUp', seat: 0 });

  test('BMR001 Draculord: an opponent reveals their hand; take one card', () => {
    let s = level({ bosses: ['BMR001', 'BMR004'], hands: [[], ['BMR016', 'BMR040']] });
    s = T.answer(s, 1);
    eq(s.pending.opts.length, 2, 'the whole hand is shown');
    s = T.answer(s, (o) => BF.idOf(s, o.v) === 'BMR040');
    eq(T.handIds(s, 0), ['BMR040']);
    ok(s.log.some((l) => l.d.revealed), 'the reveal is logged (open information)');
  });

  test('BMR002 Xyzax: take two cards from the discard pile', () => {
    let s = level({ bosses: ['BMR002', 'BMR004'], discard: ['BMR016', 'BMR040', 'BMR041'] });
    s = T.answer(s, () => true);
    s = T.answer(s, () => true);
    eq(s.players[0].hand.length, 2);
  });

  test('BMR003 King Croak: take an Advanced Monster Room and build it over a match', () => {
    let s = level({ bosses: ['BMR003', 'BMR004'], dungeons: [['BMR016']], discard: ['BMR019'] });
    s = T.answer(s, (o) => o.v !== 'none' && BF.idOf(s, o.v) === 'BMR019' && s.discard.includes(o.v));
    s = T.answer(s, (o) => o.v !== 'keep');
    eq(T.dungeonIds(s, 0), [['BMR016', 'BMR019']]);
  });

  test('BMR004 Robobo: each opponent destroys a Room of their choice', () => {
    let s = level({ bosses: ['BMR004', 'BMR001'], dungeons: [[], ['BMR016', 'BMR018']] });
    eq(s.pending.who, 1);
    s = T.answer(s, (o) => BF.idOf(s, o.v) === 'BMR016');
    eq(T.dungeonIds(s, 1), [['BMR018']]);
  });

  test('BMR005 Cerebellus: may draw three Spells, then discard one', () => {
    let s = level({ bosses: ['BMR005', 'BMR004'] });
    s = T.answer(s, true);
    s = T.answer(s, () => true);
    eq(s.players[0].hand.length, 2);
  });

  test('BMR006 Seducia: any Hero from town or the Hero deck to your entrance', () => {
    let s = level({ bosses: ['BMR006', 'BMR004'], town: ['BMR056'] });
    const deckBefore = s.heroDeck.length;
    s = T.answer(s, (o) => o.v !== 'none' && s.heroDeck.includes(o.v) && BF.defOf(s, o.v).epic);
    eq(s.players[0].entrance.length, 1);
    eq(s.heroDeck.length, deckBefore - 1);
    const ord = s.heroDeck.filter((h) => !BF.defOf(s, h).epic).length;
    ok(s.heroDeck.slice(-ord).every((h) => !BF.defOf(s, h).epic), 'Epics stay at the bottom (RULING R9)');
  });

  test('BMR007 Cleopatra: take an Advanced Trap Room and build it over a match', () => {
    let s = level({ bosses: ['BMR007', 'BMR004'], dungeons: [['BMR027']], discard: ['BMR031'] });
    s = T.answer(s, (o) => o.v !== 'none' && s.discard.includes(o.v) && BF.idOf(s, o.v) === 'BMR031');
    s = T.answer(s, (o) => o.v !== 'keep');
    eq(T.dungeonIds(s, 0), [['BMR027', 'BMR031']]);
  });

  test('BMR008 Gorgona: a Hero in town becomes your Soul', () => {
    let s = level({ bosses: ['BMR008', 'BMR004'], town: ['BMR081'] });
    s = T.answer(s, () => true);
    eq(BF.souls(s, 0), 2);
    eq(s.town.length, 0);
  });
})();
