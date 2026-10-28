(function () {
  'use strict';
  const BF = globalThis.BF;
  const { test, eq, ok } = BF.T;
  const T = BF.T;

  // Heroes: BMR056 Cleric 4hp, BMR058 Cleric 6hp, BMR060 Cleric 8hp, BMR081 Epic Cleric 11hp.
  const buildWindow = (s, active = 0) => T.run(s, { k: 'window', ctx: 'build', active, place: false, n: 0, i: 0, passes: 0 });
  /** Pass windows until the Hero is in Room `slot` of the active dungeon. */
  T.passUntilRoom = (s, slot) => {
    while (s.pending?.kind === 'window' && !(s.adv && s.adv.pos === slot && s.pending.info?.ctx === 'room')) s = T.answer(s, 'pass');
    return s;
  };
  const adventure = (cfg) => T.run(T.board(cfg), { k: 'process', seat: 0 });

  test('BMR009 Dark Altar: destroy it to take any card from the discard pile', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR009']], discard: ['BMR040'] }));
    s = T.answer(s, T.castOpt(s, 'BMR009'));
    s = T.passAll(s);
    eq(s.pending.kind, 'take');
    s = T.answer(s, (o) => BF.idOf(s, o.v) === 'BMR040');
    s = T.passAll(s);
    eq(T.handIds(s, 0), ['BMR040']);
    eq(T.dungeonIds(s, 0), []);
  });

  test('BMR010 Open Grave: a Hero dying here lets you take a Room from the discard pile', () => {
    let s = adventure({ dungeons: [['BMR018', 'BMR010']], entrances: [['BMR056']], discard: ['BMR016', 'BMR040'] });
    eq(s.pending.kind, 'take');
    eq(s.pending.opts.length, 1, 'only Room cards');
    s = T.answer(s, () => true);
    eq(T.handIds(s, 0), ['BMR016']);
  });

  test('BMR011 Specter\'s Sanctum: the chosen opponent discards a random Spell', () => {
    let s = T.board({ dungeons: [['BMR011']], hands: [[], ['BMR040', 'BMR016']] });
    T.run(s, { k: 'onBuild', seat: 0, iid: T.top(s, 0, 0) });
    eq(s.pending.kind, 'opponent');
    s = T.answer(s, 1);
    eq(T.handIds(s, 1), ['BMR016']);
  });

  test('BMR012 Succubus Spa: take a random card of the chosen type from an opponent', () => {
    let s = adventure({ dungeons: [['BMR018', 'BMR012']], entrances: [['BMR056']], hands: [[], ['BMR040']] });
    s = T.answer(s, 1);
    s = T.answer(s, 'spell');
    eq(T.handIds(s, 0), ['BMR040']);
    eq(T.handIds(s, 1), []);
  });

  test('BMR013 Dracolich Lair: discard two Rooms to take a Room from the discard pile', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR013']], hands: [['BMR016', 'BMR018']], discard: ['BMR021'] }));
    s = T.answer(s, T.castOpt(s, 'BMR013'));
    s = T.answer(s, () => true);
    s = T.answer(s, () => true);
    s = T.passAll(s);
    s = T.answer(s, (o) => BF.idOf(s, o.v) === 'BMR021');
    eq(T.handIds(s, 0), ['BMR021']);
  });

  test('BMR014 Vampire Bordello: a Hero dying here lets you heal a Wound', () => {
    let s = adventure({ dungeons: [['BMR018', 'BMR014']], entrances: [['BMR056']], scores: [[{ id: 'BMR081', up: true }]] });
    eq(s.pending.kind, 'heal');
    s = T.answer(s, (o) => o.v !== 'no');
    eq(BF.wounds(s, 0), 0);
    eq(BF.souls(s, 0), 3, 'healed Epic counts 2 Souls, plus the new Soul');
  });

  test('BMR015 Goblin Armory: adjacent Monster Rooms +1, Trap Rooms unaffected', () => {
    const s = T.board({ dungeons: [['BMR016', 'BMR015', 'BMR009']] });
    eq(BF.roomDamage(s, 0, 0), 3);
    eq(BF.roomDamage(s, 0, 2), 1);
  });

  test('BMR016 Golem Factory: a Hero dying here draws a Room', () => {
    const s = adventure({ dungeons: [['BMR018', 'BMR016']], entrances: [['BMR056']] });
    ok(T.halted(s));
    eq(s.players[0].hand.filter((i) => BF.FILTERS.room(s, i)).length, 1);
  });

  test('BMR017 Minotaur\'s Maze: the first entry sends the Hero back one Room', () => {
    const s = adventure({ dungeons: [['BMR016', 'BMR017', 'BMR018']], entrances: [['BMR060']] });
    const hits = s.log.filter((l) => l.d.damage != null).map((l) => l.d.damage);
    eq(hits, [2, 2, 0, 3], 'Golem twice, then the Maze, then the Cave');
    eq(BF.wounds(s, 0), 1);
  });

  test('BMR017 Minotaur\'s Maze: no previous Room, no trigger (FAQ)', () => {
    const s = adventure({ dungeons: [['BMR017', 'BMR018']], entrances: [['BMR058']] });
    eq(s.log.filter((l) => l.d.damage != null).length, 2);
  });

  test('BMR019 Beast Menagerie: building another Monster Room draws a Room', () => {
    let s = T.board({ dungeons: [['BMR019']], hands: [['BMR016']] });
    T.run(s, { k: 'window', ctx: 'build', active: 0, place: true, n: 0, i: 0, passes: 0 });
    s = T.answer(s, (o) => o.v.place != null && o.v.at === 'new');
    s = T.passAll(s);
    T.run(s, { k: 'reveal' });
    eq(s.players[0].hand.filter((i) => BF.FILTERS.room(s, i)).length, 1);
  });

  test('BMR020 Monster\'s Ballroom: damage equals the Monster Rooms in the dungeon', () => {
    const s = T.board({ dungeons: [['BMR020', 'BMR016', 'BMR009']] });
    eq(BF.roomDamage(s, 0, 0), 2);
  });

  test('BMR021 Brainsucker Hive: a Hero dying here: you may draw a Spell', () => {
    let s = adventure({ dungeons: [['BMR018', 'BMR021']], entrances: [['BMR056']] });
    s = T.answer(s, true);
    eq(s.players[0].hand.filter((i) => BF.FILTERS.spell(s, i)).length, 1);
  });

  test('BMR022 Dark Laboratory: draw two Spells, then discard a Spell', () => {
    let s = T.board({ dungeons: [['BMR022']], hands: [['BMR040']] });
    T.run(s, { k: 'onBuild', seat: 0, iid: T.top(s, 0, 0) });
    eq(s.pending.kind, 'discard');
    s = T.answer(s, () => true);
    eq(s.players[0].hand.length, 2);
  });

  test('BMR023 Haunted Library: may draw from the Spell deck at the start of the turn', () => {
    let s = T.board({ dungeons: [['BMR023']] });
    T.run(s, { k: 'turnDraw', seat: 0 });
    s = T.answer(s, 'spell');
    eq(s.players[0].hand.filter((i) => BF.FILTERS.spell(s, i)).length, 1);
  });

  test('BMR024 Witch\'s Kitchen: discard a Monster Room card to draw a Spell', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR024']], hands: [['BMR016', 'BMR009']] }));
    s = T.answer(s, T.castOpt(s, 'BMR024'));
    eq(s.pending.opts.length, 1, 'only the Monster Room can pay');
    s = T.answer(s, () => true);
    s = T.passAll(s);
    eq(T.handIds(s, 0)[0], 'BMR009');
    eq(s.players[0].hand.filter((i) => BF.FILTERS.spell(s, i)).length, 1);
  });

  test('BMR025 All-Seeing Eye: discard a Spell to cancel an opponent\'s Spell', () => {
    let s = adventure({ dungeons: [['BMR018', 'BMR025']], entrances: [['BMR056']], hands: [['BMR047'], ['BMR041']] });
    s = T.passUntilRoom(s, 0);
    while (s.pending.who === 0) s = T.answer(s, 'pass');
    s = T.answer(s, T.castOpt(s, 'BMR041'));
    s = T.answer(s, () => true);
    eq(s.pending.who, 0);
    s = T.answer(s, T.castOpt(s, 'BMR025'));
    s = T.answer(s, () => true); // target: the Assassin
    s = T.answer(s, () => true); // cost: discard Giant Size
    s = T.passAll(s);
    ok(T.halted(s));
    eq(BF.souls(s, 0), 1, 'Assassin canceled; 3 + 3 kills the 4-Health Hero');
  });

  test('BMR026 Liger\'s Den: playing a Spell draws a Spell', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR026']], hands: [['BMR051']], town: ['BMR056'] }));
    s = T.answer(s, T.castOpt(s, 'BMR051'));
    s = T.answer(s, () => true);
    s = T.passAll(s);
    eq(s.players[0].hand.filter((i) => BF.FILTERS.spell(s, i)).length, 1);
  });

  test('BMR027 Bottomless Pit: destroy it to kill the Hero in it', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR027']], entrances: [['BMR081']] });
    s = T.passUntilRoom(s, 1);
    s = T.answer(s, T.castOpt(s, 'BMR027'));
    s = T.answer(s, () => true);
    s = T.passAll(s);
    eq(BF.souls(s, 0), 2);
    eq(T.dungeonIds(s, 0), [['BMR016']]);
  });

  test('BMR028 Boulder Ramp: destroy another Room to deal 5 damage to the Hero here', () => {
    let s = adventure({ dungeons: [['BMR016', 'BMR028']], entrances: [['BMR060']] });
    s = T.passUntilRoom(s, 1);
    s = T.answer(s, T.castOpt(s, 'BMR028'));
    s = T.answer(s, () => true); // the Hero
    s = T.answer(s, () => true); // destroy Golem Factory
    s = T.passAll(s);
    ok(T.halted(s));
    eq(BF.souls(s, 0), 1, '2 + 1 + 5 kills an 8-Health Hero');
  });

  test('BMR029 Dizzygas Hallway: the next Room gets +2 only if it is a Trap', () => {
    eq(BF.roomDamage(T.board({ dungeons: [['BMR029', 'BMR009']] }), 0, 1), 3);
    eq(BF.roomDamage(T.board({ dungeons: [['BMR029', 'BMR016']] }), 0, 1), 2);
  });

  test('BMR030 Jackpot Stash: destroy it to double your Rooms\' treasure this turn', () => {
    let s = buildWindow(T.board({ bosses: ['BMR008', 'BMR001'], dungeons: [['BMR030', 'BMR027']] }));
    eq(BF.treasureOf(s, 0, 'thief'), 4);
    s = T.answer(s, T.castOpt(s, 'BMR030'));
    s = T.passAll(s);
    eq(BF.treasureOf(s, 0, 'thief'), 3, 'Pit 1 x 2, plus the Boss 1 (not doubled)');
  });

  test('BMR031 Recycling Center: another Room destroyed: you may draw two Rooms', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR031', 'BMR009']], discard: ['BMR040'] }));
    s = T.answer(s, T.castOpt(s, 'BMR009'));
    eq(s.pending.kind, 'may');
    s = T.answer(s, true);
    s = T.passAll(s);
    s = T.answer(s, (o) => BF.idOf(s, o.v) === 'BMR040');
    eq(s.players[0].hand.filter((i) => BF.FILTERS.room(s, i)).length, 2);
  });

  test('BMR032 The Crushinator: destroy another Room to give your other Rooms +2', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR016', 'BMR032', 'BMR018']] }));
    s = T.answer(s, T.castOpt(s, 'BMR032'));
    s = T.answer(s, (o) => BF.idOf(s, o.v) === 'BMR016');
    s = T.passAll(s);
    eq(BF.roomDamage(s, 0, 1), 5, 'Cave 3 + 2');
    eq(BF.roomDamage(s, 0, 0), 2, 'The Crushinator itself is not boosted (FAQ)');
    eq(BF.windowOptions(s, { ctx: 'build', active: 0 }, 0).length, 0, 'once per turn (RULING R12)');
  });

  test('BMR033 Centipede Tunnel: may swap two Rooms in one dungeon', () => {
    let s = T.board({ dungeons: [['BMR033', 'BMR016', 'BMR018']] });
    T.run(s, { k: 'onBuild', seat: 0, iid: T.top(s, 0, 0) });
    s = T.answer(s, 0);
    s = T.answer(s, 1);
    s = T.answer(s, 2);
    eq(T.dungeonIds(s, 0), [['BMR033'], ['BMR018'], ['BMR016']]);
  });

  test('BMR034 Construction Zone: may build one more Room at once', () => {
    let s = T.board({ dungeons: [['BMR034']], hands: [['BMR016']] });
    T.run(s, { k: 'onBuild', seat: 0, iid: T.top(s, 0, 0) });
    s = T.answer(s, (o) => o.v !== 'no' && o.v.at === 'new');
    eq(T.dungeonIds(s, 0), [['BMR016'], ['BMR034']]);
    ok(!BF.isFaceDown(s, T.top(s, 0, 0)), 'built face-up');
  });

  test('BMR036 Mimic Vault: an ordinary Hero from town goes to your entrance', () => {
    let s = T.board({ dungeons: [['BMR036']], town: ['BMR056', 'BMR081'] });
    T.run(s, { k: 'onBuild', seat: 0, iid: T.top(s, 0, 0) });
    eq(s.pending.opts.length, 1, 'Epic Heroes are not eligible');
    s = T.answer(s, () => true);
    eq(s.players[0].entrance.map((i) => BF.idOf(s, i)), ['BMR056']);
  });

  test('BMR037 Monstrous Monument: take a Monster Room from the discard pile', () => {
    let s = T.board({ dungeons: [['BMR037']], discard: ['BMR016', 'BMR027'] });
    T.run(s, { k: 'onBuild', seat: 0, iid: T.top(s, 0, 0) });
    eq(s.pending.opts.length, 1);
    s = T.answer(s, () => true);
    eq(T.handIds(s, 0), ['BMR016']);
  });

  test('BMR038 Torture Chamber: destroy it; an opponent discards a random Room', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR038']], hands: [[], ['BMR016', 'BMR040']] }));
    s = T.answer(s, T.castOpt(s, 'BMR038'));
    s = T.answer(s, 1);
    s = T.passAll(s);
    eq(T.handIds(s, 1), ['BMR040']);
  });

  test('BMR039 Zombie Prison: destroy it; an opponent\'s Soul returns to their entrance', () => {
    let s = buildWindow(T.board({ dungeons: [['BMR039']], scores: [[], [{ id: 'BMR058' }]] }));
    s = T.answer(s, T.castOpt(s, 'BMR039'));
    s = T.answer(s, () => true);
    s = T.passAll(s);
    eq(BF.souls(s, 1), 0);
    eq(s.players[1].entrance.map((i) => BF.idOf(s, i)), ['BMR058']);
  });

  test('BMR035 Dragon Hatchery: all four treasure types', () => {
    const s = T.board({ bosses: ['BMR004', 'BMR001'], dungeons: [['BMR035']] });
    eq(BF.TREASURES.map((t) => BF.treasureOf(s, 0, t)), [1, 2, 1, 1]);
  });
})();
