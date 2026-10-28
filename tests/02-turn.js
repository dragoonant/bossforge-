(function () {
  'use strict';
  const BF = globalThis.BF;
  const { test, eq, ok } = BF.T;
  const T = BF.T;

  // Heroes used below: BMR056 Cleric 4hp, BMR058 Cleric 6hp, BMR062 Fighter 4hp, BMR074 Thief 4hp,
  // BMR081 Epic Cleric 11hp. Rooms: BMR018 Neanderthal Cave (Monster 3, Fighter), BMR016 Golem
  // Factory (Monster 2, Fighter), BMR035 Dragon Hatchery (0, all four).

  test('RB p7 Rooms: Advanced Rooms only over a Room sharing a treasure; FAQ: Neanderthal Cave refuses them', () => {
    const s = T.board({ hands: [['BMR014']], dungeons: [['BMR016', 'BMR010', 'BMR018']] });
    const adv = s.players[0].hand[0]; // Vampire Bordello, Cleric
    eq(BF.buildSlots(s, 0, adv), [T.top(s, 0, 1)], 'only over Open Grave (Cleric)');
    const s2 = T.board({ hands: [['BMR019']], dungeons: [['BMR018', 'BMR016']] }); // Beast Menagerie, Fighter
    eq(BF.buildSlots(s2, 0, s2.players[0].hand[0]), [T.top(s2, 0, 1)], 'not over Neanderthal Cave');
  });

  test('RB p5 Gameplay: a dungeon holds five Rooms; then only building over is legal', () => {
    const s = T.board({ hands: [['BMR016']], dungeons: [['BMR016', 'BMR016', 'BMR016', 'BMR016', 'BMR016']] });
    ok(!BF.buildSlots(s, 0, s.players[0].hand[0]).includes('new'));
  });

  test('RB p13 Build Phase: new Rooms go to the left (the entrance side)', () => {
    let s = T.board({ hands: [['BMR018']], dungeons: [['BMR016']] });
    T.run(s, { k: 'window', ctx: 'build', active: 0, place: true, n: 0, i: 0, passes: 0 });
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new');
    s = T.passAll(s);
    T.run(s, { k: 'reveal' });
    eq(T.dungeonIds(s, 0), [['BMR018'], ['BMR016']]);
  });

  test('RB p14: a face-down Room shows no treasure until the reveal', () => {
    let s = T.board({ hands: [['BMR035']], dungeons: [['BMR016']] });
    T.run(s, { k: 'window', ctx: 'build', active: 0, place: true, n: 0, i: 0, passes: 0 });
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new');
    eq(BF.treasureOf(s, 0, 'mage'), 0);
    s = T.passAll(s);
    T.run(s, { k: 'reveal' });
    eq(BF.treasureOf(s, 0, 'mage'), 1);
  });

  test('RB p12 XP: the highest-XP Boss takes the first build turn', () => {
    const s = T.board({ bosses: ['BMR004', 'BMR001'], hands: [['BMR016'], ['BMR016']] }); // 400 vs 900 XP
    T.run(s, { k: 'buildPhase' });
    eq(s.pending.who, 1);
  });

  test('RB p23 Level Up: triggers once, at the reveal of the fifth Room', () => {
    let s = T.board({ bosses: ['BMR002', 'BMR004'], hands: [['BMR016']], dungeons: [['BMR016', 'BMR016', 'BMR016', 'BMR016']], discard: ['BMR040', 'BMR041'] });
    T.run(s, { k: 'window', ctx: 'build', active: 0, place: true, n: 0, i: 0, passes: 0 });
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new');
    s = T.passAll(s);
    T.run(s, { k: 'reveal' });
    eq(s.pending.kind, 'take', 'Xyzax Level Up asks for discard cards');
    s = T.answer(s, () => true);
    s = T.answer(s, () => true);
    ok(T.halted(s));
    ok(s.players[0].leveled);
    eq(T.handIds(s, 0).sort(), ['BMR040', 'BMR041']);
    eq(BF.checkLevelUp(s, 0), false, 'never twice');
  });

  test('RB p15 Bait Phase: single highest treasure lures; ties and zero stay in town', () => {
    const s = T.board({
      bosses: ['BMR002', 'BMR001'], // two Cleric Bosses
      dungeons: [['BMR016'], ['BMR021']], // Fighter Room vs Mage Room
      town: ['BMR062', 'BMR056', 'BMR074'],
    });
    T.run(s, { k: 'bait' });
    eq(s.players[0].entrance.map((i) => BF.idOf(s, i)), ['BMR062'], 'Fighter: 1 vs 0');
    eq(s.players[1].entrance.length, 0, 'Cleric: 1 vs 1 is a tie');
    eq(s.town.map((i) => BF.idOf(s, i)), ['BMR056', 'BMR074'], 'tie and zero stay');
  });

  test('FAQ The Fool: lured to the fewest Souls; a tie keeps it in town', () => {
    const s = T.board({ town: ['BMR080'], scores: [[{ id: 'BMR056' }], []] });
    T.run(s, { k: 'bait' });
    eq(s.players[1].entrance.length, 1);
    const t = T.board({ town: ['BMR080'] });
    T.run(t, { k: 'bait' });
    eq(t.town.length, 1);
  });

  test('RB p17 Adventure: Rooms deal damage in turn; a Hero leaving a Room at 0 Health dies there', () => {
    const s = T.board({ dungeons: [['BMR016', 'BMR018']], entrances: [['BMR058']] }); // 2 + 3 vs 6
    T.run(s, { k: 'process', seat: 0 });
    ok(T.halted(s));
    eq(BF.wounds(s, 0), 1, '5 damage does not kill a 6-Health Hero');
    const t = T.board({ dungeons: [['BMR018', 'BMR018']], entrances: [['BMR058']] });
    T.run(t, { k: 'process', seat: 0 });
    eq(BF.souls(t, 0), 1);
  });

  test('RB p8 Heroes: Epic Heroes count as two Souls or two Wounds', () => {
    const s = T.board({ dungeons: [['BMR016']], entrances: [['BMR081']] });
    T.run(s, { k: 'process', seat: 0 });
    eq(BF.wounds(s, 0), 2);
  });

  test('FAQ Assassin: cast after a Room deals lethal damage, before the Hero leaves', () => {
    let s = T.board({ dungeons: [['BMR018', 'BMR018']], entrances: [['BMR056']], hands: [[], ['BMR041']] });
    T.run(s, { k: 'process', seat: 0 });
    eq(s.pending.who, 1, 'opponent may act after the first Room');
    s = T.answer(s, T.castOpt(s, 'BMR041'));
    eq(s.pending.kind, 'target', 'never assume a choice: the single target is asked');
    s = T.answer(s, () => true);
    s = T.passAll(s);
    ok(T.halted(s));
    eq(BF.wounds(s, 0), 1, '4 Health + 3 survives 6 damage');
  });

  test('RB p21 Deactivate: a deactivated Room is a blank space and breaks adjacency', () => {
    const s = T.board({ dungeons: [['BMR015', 'BMR016', 'BMR016']] });
    eq(BF.roomDamage(s, 0, 1), 3, 'Goblin Armory gives its neighbour +1');
    s.eot.deact[T.top(s, 0, 0)] = true;
    eq(BF.roomDamage(s, 0, 1), 2);
    eq(BF.roomDamage(s, 0, 0), 0);
  });

  test('FAQ Top Five: a Hero in a destroyed Room exits at once and moves on', () => {
    let s = T.board({ dungeons: [['BMR027', 'BMR016']], entrances: [['BMR058']] });
    T.run(s, { k: 'process', seat: 0 });
    // Bottomless Pit (1 dmg) is the first Room; use its own ability to kill the Hero.
    s = T.answer(s, T.castOpt(s, 'BMR027'));
    s = T.answer(s, () => true);
    s = T.passAll(s);
    ok(T.halted(s));
    eq(BF.souls(s, 0), 1);
    eq(T.dungeonIds(s, 0), [['BMR016']]);
  });

  test('RB p19 End of Turn: game ends at 10 Souls; Souls minus Wounds decides', () => {
    const tenSouls = Array.from({ length: 10 }, () => ({ id: 'BMR056' }));
    const s = T.board({ scores: [tenSouls.concat([{ id: 'BMR081', up: true }, { id: 'BMR082', up: true }]), Array.from({ length: 7 }, () => ({ id: 'BMR056' }))] });
    T.run(s, { k: 'endTurn' });
    ok(s.result, 'game over');
    eq(s.result.winners, [1], '7 beats 10 - 4 = 6: Wounds can cost a 10-Soul Boss the game (RB p4)');
    const t = T.board({ bosses: ['BMR004', 'BMR001'], scores: [tenSouls, tenSouls] });
    T.run(t, { k: 'endTurn' });
    eq(t.result.winners, [1], 'tie goes to the higher XP (RULING R1)');
  });

  test('RB p19: five Wounds end the game', () => {
    const s = T.board({ scores: [Array.from({ length: 5 }, () => ({ id: 'BMR056', up: true })), []] });
    T.run(s, { k: 'endTurn' });
    eq(s.result.winners, [1]);
  });

  test('RB p9 Priority: the last Spell played resolves first (Counterspell)', () => {
    let s = T.board({ dungeons: [['BMR018', 'BMR016']], entrances: [['BMR056']], hands: [['BMR043'], ['BMR041']] });
    T.run(s, { k: 'process', seat: 0 });
    s = T.answer(s, T.castOpt(s, 'BMR041')); // P1 casts Assassin on the Hero in P0's dungeon
    s = T.answer(s, () => true);
    eq(s.pending.who, 0);
    s = T.answer(s, T.castOpt(s, 'BMR043')); // P0 responds with Counterspell
    s = T.answer(s, () => true);
    s = T.passAll(s);
    ok(T.halted(s));
    eq(BF.souls(s, 0), 1, 'Assassin was canceled; 5 damage kills the 4-Health Hero');
    ok(s.log.some((l) => l.d.canceled != null));
  });
})();
