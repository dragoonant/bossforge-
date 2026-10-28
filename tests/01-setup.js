(function () {
  'use strict';
  const BF = globalThis.BF;
  const { test, eq, ok } = BF.T;
  const T = BF.T;

  const game = (n, seed = 3, extra = {}) => BF.newGame({ seed, players: Array.from({ length: n }, (_, i) => ({ name: `P${i}` })), ...extra });

  test('RB p10 Set Up: two Boss cards offered, five Rooms and two Spells dealt', () => {
    const s = game(2);
    for (const p of s.players) {
      eq(p.bossOffer.length, 2);
      eq(p.hand.filter((i) => BF.FILTERS.room(s, i)).length, 5);
      eq(p.hand.filter((i) => BF.FILTERS.spell(s, i)).length, 2);
    }
  });

  test('RB p10 Step 1: Hero deck by player count, ordinary Heroes on top of Epics', () => {
    for (const [n, ord, epic] of [
      [2, 13, 8],
      [3, 17, 12],
      [4, 25, 16],
    ]) {
      const s = game(n);
      const deck = s.heroDeck.map((i) => BF.defOf(s, i));
      eq(deck.filter((d) => !d.epic).length, ord, `${n}p ordinary`);
      eq(deck.filter((d) => d.epic).length, epic, `${n}p epic`);
      ok(deck.slice(-ord).every((d) => !d.epic), 'ordinary Heroes are drawn first');
    }
  });

  test('FAQ Seq 1: the discard pile starts with four Rooms and two Spells (RULING R3)', () => {
    const s = game(3);
    eq(s.discard.filter((i) => BF.FILTERS.room(s, i)).length, 4);
    eq(s.discard.filter((i) => BF.FILTERS.spell(s, i)).length, 2);
  });

  test('Never assume a choice: the Boss pick is asked of each player', () => {
    const s = game(2);
    eq(s.pending.kind, 'boss');
    eq(s.pending.who, 0);
    eq(s.pending.opts.length, 2);
  });

  test('RB p11 First Room: placed face-down in XP order, revealed together, then turn 1 begins', () => {
    let s = game(2, 11);
    s = T.answer(s, () => true);
    s = T.answer(s, () => true);
    while (s.pending.kind === 'mulligan') s = T.answer(s, 'keep');
    const first = BF.turnOrder(s)[0];
    eq(s.pending.kind, 'place');
    eq(s.pending.who, first);
    ok(s.pending.opts.every((o) => o.v === 'none' || o.v.at === 'new'), 'first Room only at the entrance');
    s = T.answer(s, (o) => o.v !== 'none');
    ok(Object.keys(s.fd).length === 1, 'face-down until the reveal');
    s = T.answer(s, (o) => o.v !== 'none');
    while (s.pending.kind !== 'window') s = T.answer(s, () => true);
    eq(s.turn, 1);
    eq(s.town.length, 2, 'one Hero per player in town');
    eq(Object.keys(s.fd).length, 0, 'revealed');
    for (const p of s.players) eq(p.dungeon.length, 1);
  });

  test('RB p10 Mulligan: offered for four Advanced Rooms', () => {
    const s = T.board({ hands: [['BMR013', 'BMR014', 'BMR019', 'BMR020', 'BMR009', 'BMR040', 'BMR041']] });
    T.run(s, { k: 'mulligan', seat: 0 });
    eq(s.pending.kind, 'mulligan');
    const t = T.answer(s, 'redraw');
    eq(t.players[0].hand.length, 7);
  });

  test('RB p20 Classic Mode: each player discards two cards', () => {
    let s = game(2, 5, { classic: true });
    s = T.answer(s, () => true);
    s = T.answer(s, () => true);
    while (s.pending.kind === 'mulligan') s = T.answer(s, 'keep');
    eq(s.pending.kind, 'discard');
    s = T.answer(s, () => true);
    s = T.answer(s, () => true);
    eq(s.players[0].hand.length, 5);
  });

  test('CLAUDE.md rule 9: the same seed replays the same game', () => {
    const play = () => {
      let s = BF.newGame({ seed: 42, players: [{ name: 'A', ai: true }, { name: 'B', ai: true }] });
      while (!BF.isTerminal(s)) s = BF.apply(s, BF.ai.choose(s, BF.whoActs(s)));
      return s.log.map((l) => l.msg).join('\n');
    };
    eq(play(), play());
  });

  test('CLAUDE.md regime 4: tests run without the printed pack; names fall back to our words', () => {
    ok(!BF.PRINTED, 'data/printed.js must not be loaded under test');
    eq(BF.cardText('BMR027'), BF.ownText('BMR027'));
    ok(BF.cardName('BMR027').includes('Trap Room'));
  });
})();
