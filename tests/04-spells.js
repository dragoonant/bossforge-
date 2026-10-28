(function () {
  'use strict';
  const BF = globalThis.BF;
  const { test, eq, ok } = BF.T;
  const T = BF.T;

  const adventure = (cfg) => T.run(T.board(cfg), { k: 'process', seat: 0 });
  const buildWindow = (s, active = 0, place = false) => T.run(s, { k: 'window', ctx: 'build', active, place, n: 0, i: 0, passes: 0 });
  const cast = (s, id, ...answers) => {
    s = T.answer(s, T.castOpt(s, id));
    for (const a of answers) s = T.answer(s, a);
    return s;
  };

  test('BMR040 Annihilator: a Trap Room gets +3 damage this turn', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR009']], entrances: [['BMR058']], hands: [['BMR040']] });
    s = T.passUntilRoom(s, 0);
    s = cast(s, 'BMR040', () => true);
    s = T.passAll(s);
    eq(BF.souls(s, 0), 1, '2 + (1 + 3) kills a 6-Health Hero');
  });

  test('BMR041 Assassin: only targets a Hero in an opponent\'s dungeon', () => {
    const s = adventure({ dungeons: [['BMR016']], entrances: [['BMR058']], hands: [['BMR041']] });
    ok(!s.pending || s.pending.kind !== 'window' || !s.pending.opts.some(T.castOpt(s, 'BMR041')), 'not castable on your own Hero');
  });

  test('BMR042 Cave-In: destroy your Room and kill the Hero in it', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR018']], entrances: [['BMR081']], hands: [['BMR042']] });
    s = T.passUntilRoom(s, 0);
    s = cast(s, 'BMR042', (o) => BF.idOf(s, o.v) === 'BMR016');
    s = T.passAll(s);
    eq(BF.souls(s, 0), 2);
    eq(T.dungeonIds(s, 0), [['BMR018']]);
  });

  test('BMR043 Counterspell: cancels the Spell just played (also in 02-turn)', () => {
    let s = buildWindow(T.board({ hands: [['BMR051'], ['BMR043']], town: ['BMR056'] }));
    s = cast(s, 'BMR051', () => true);
    eq(s.pending.who, 1, 'P0 holds nothing playable, so is not asked');
    s = cast(s, 'BMR043', () => true);
    s = T.passAll(s);
    eq(s.players[0].entrance.length, 0);
    eq(s.town.length, 1);
  });

  test('BMR044 Exhaustion: damage equal to your Room count', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR016', 'BMR016']], entrances: [['BMR060']], hands: [['BMR044']] });
    s = T.passUntilRoom(s, 0);
    s = cast(s, 'BMR044', () => true);
    s = T.passAll(s);
    eq(BF.souls(s, 0), 1, '2 + 3 + 2 + 2 kills 8 Health');
  });

  test('BMR045 Fear: a Hero in a dungeon goes back to town, its damage gone', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR016']], entrances: [['BMR081']], hands: [['BMR045']] });
    s = T.passUntilRoom(s, 0);
    s = cast(s, 'BMR045', () => true);
    s = T.passAll(s);
    eq(BF.wounds(s, 0), 0);
    eq(s.town.length, 1);
    eq(s.cards[s.town[0]].dmg, 0);
  });

  test('BMR046 Freeze: a deactivated Room shows no treasure', () => {
    let s = buildWindow(T.board({ bosses: ['BMR004', 'BMR003'], dungeons: [[], ['BMR016']], hands: [['BMR046']] }));
    s = cast(s, 'BMR046', () => true);
    s = T.passAll(s);
    eq(BF.treasureOf(s, 1, 'fighter'), 1, 'only the Boss counts now');
  });

  test('BMR047 Giant Size: a Monster Room gets +3 damage this turn', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR016']], entrances: [['BMR060']], hands: [['BMR047']] });
    s = T.passUntilRoom(s, 0);
    s = cast(s, 'BMR047', (o) => o.v === T.top(s, 0, 1));
    s = T.passAll(s);
    eq(BF.wounds(s, 0), 1, '2 + 5 = 7 < 8');
  });

  test('BMR048 Jeopardy: everyone discards their hand and draws one Spell and two Rooms', () => {
    let s = buildWindow(T.board({ hands: [['BMR048', 'BMR016', 'BMR018', 'BMR021'], ['BMR009']] }));
    s = cast(s, 'BMR048');
    s = T.passAll(s);
    for (const seat of [0, 1]) {
      eq(s.players[seat].hand.filter((i) => BF.FILTERS.spell(s, i)).length, 1);
      eq(s.players[seat].hand.filter((i) => BF.FILTERS.room(s, i)).length, 2);
    }
  });

  test('BMR049 Kobold Strike: face-down Rooms go back to hand; nothing more is built', () => {
    let s = T.board({ bosses: ['BMR001', 'BMR004'], hands: [['BMR016'], ['BMR049', 'BMR016']], dungeons: [['BMR018']] });
    const turn = (active) => ({ k: 'window', ctx: 'build', active, place: true, n: 0, i: 0, passes: 0 });
    T.run(s, turn(0), turn(1), { k: 'reveal' });
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new'); // Draculord (900 XP) builds first
    s = T.answer(s, 'pass');
    s = cast(s, 'BMR049');
    s = T.passAll(s);
    eq(T.handIds(s, 0), ['BMR016'], 'face-down Room returned');
    eq(T.dungeonIds(s, 0), [['BMR018']]);
    eq(BF.buildSlots(s, 1, s.players[1].hand[0]), [], 'no Room can be built');
  });

  test('BMR050 Motivation: fewer Rooms than an opponent: build an extra Room', () => {
    let s = buildWindow(T.board({ hands: [['BMR050', 'BMR016', 'BMR018']], dungeons: [[], ['BMR016']] }), 0, true);
    s = cast(s, 'BMR050'); // nobody can respond, so it resolves and the build turn continues
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new');
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new');
    eq(s.players[0].placed, 2);
  });

  test('BMR051 Princess in Peril: a Hero from town goes to your entrance', () => {
    let s = buildWindow(T.board({ hands: [['BMR051']], town: ['BMR081'] }));
    s = cast(s, 'BMR051', () => true);
    s = T.passAll(s);
    eq(s.players[0].entrance.length, 1);
  });

  test('BMR052 Soul Harvest: remove a Soul from the game; draw two Spells', () => {
    let s = buildWindow(T.board({ hands: [['BMR052']], scores: [[{ id: 'BMR056' }]] }));
    s = cast(s, 'BMR052', () => true);
    s = T.passAll(s);
    eq(BF.souls(s, 0), 0);
    eq(s.players[0].hand.length, 2);
    eq(s.removed.length >= 1, true);
  });

  test('BMR053 Teleportation: the Hero goes back to the first Room, keeping its damage', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR016']], entrances: [['BMR060']], hands: [['BMR053']] });
    s = T.passUntilRoom(s, 1);
    s = cast(s, 'BMR053', () => true);
    s = T.passAll(s);
    eq(BF.souls(s, 0), 1, '2 + 2 + 2 + 2 kills 8 Health');
  });

  test('BMR054 Trepidation: no Hero enters the chosen leader\'s dungeon this turn', () => {
    let s = T.board({
      dungeons: [['BMR016'], ['BMR016']],
      entrances: [['BMR058'], ['BMR056']],
      hands: [['BMR054']],
      scores: [[], [{ id: 'BMR057' }, { id: 'BMR059' }]],
    });
    T.run(s, { k: 'process', seat: 0 }, { k: 'process', seat: 1 });
    s = cast(s, 'BMR054', () => true);
    s = T.passAll(s);
    ok(T.halted(s));
    eq(s.players[1].entrance.length, 1, 'the Hero waits at the entrance');
  });

  test('BMR055 Zombie Attack: an opponent\'s Soul returns to their entrance with +2 Health', () => {
    let s = buildWindow(T.board({ hands: [['BMR055']], scores: [[], [{ id: 'BMR056' }]] }));
    s = cast(s, 'BMR055', () => true);
    s = T.passAll(s);
    const h = s.players[1].entrance[0];
    eq(BF.idOf(s, h), 'BMR056');
    eq(BF.heroHealth(s, h), 6);
  });

  test('RB p9 Spells: Build Spells cannot be cast in the Adventure phase', () => {
    const s = adventure({ dungeons: [['BMR016']], entrances: [['BMR058']], hands: [['BMR051']], town: ['BMR056'] });
    ok(T.halted(s), 'no window was offered for Princess in Peril');
  });
})();
