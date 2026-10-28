// The BossForge rules engine. Surface: BF.newGame / BF.legalActions / BF.apply / BF.isTerminal /
// BF.whoActs. One resolution queue is the whole control flow (CLAUDE.md rule 3): each queue step
// is plain data handled by STEPS[step.k]; a step that needs a decision calls BF.ask and stops.
// Spells and activated abilities use one LIFO stack (RB p9 Priority, RULING R2).
(function () {
  'use strict';
  const BF = globalThis.BF;
  const { fail, bug, WAIT, STAY } = BF;
  const STEPS = (BF.STEPS = {});
  const ASKED = (BF.ASKED = { asked: true });

  // ---------------------------------------------------------------- cards and text tokens

  BF.idOf = (s, iid) => s.cards[iid].id;
  BF.defOf = (s, iid) => BF.CARD_DATA[s.cards[iid].id];
  BF.abOf = (s, iid) => BF.ABILITIES[s.cards[iid].id] || {};
  const kindOf = (s, iid) => BF.defOf(s, iid).kind;

  // Log and prompt text carry tokens the UI turns into names and hover targets: [p:seat], [c:iid].
  const P = (BF.P = (seat) => `[p:${seat}]`);
  const C = (BF.C = (iid) => `[c:${iid}]`);

  /** The one log door (CLAUDE.md rule 10). */
  BF.log = (s, msg, data = {}) => {
    s.log.push({ t: s.turn, ph: s.phase, msg, d: data });
  };

  // ---------------------------------------------------------------- the choice door

  /**
   * Asks `who` a question for queue step `st`, or returns the answer if it was given. There is no
   * auto-take path: one option or fifty, the player is asked (CLAUDE.md rule 5).
   */
  BF.ask = (s, st, qid, q) => {
    if (Object.prototype.hasOwnProperty.call(st.ans, qid)) return st.ans[qid];
    if (!q.opts.length) bug(`question "${q.prompt}" has no options`);
    s.pending = { who: q.who, qid, kind: q.kind, prompt: q.prompt, opts: q.opts, src: q.src ?? null, info: q.info ?? null };
    return ASKED;
  };

  BF.whoActs = (s) => (s.pending ? s.pending.who : null);
  BF.isTerminal = (s) => !!s.result;

  BF.legalActions = (s) => {
    if (s.result) return [];
    if (!s.pending) bug('no pending decision');
    if (!s.pending.opts.length) bug('pending decision with no options');
    return s.pending.opts.map((o) => ({ type: 'choose', v: o.v }));
  };

  BF.apply = (s0, action) => {
    if (s0.result) fail('The game is over');
    if (!s0.pending) fail('Nothing to answer');
    if (!action || action.type !== 'choose') fail('Unknown action');
    if (!s0.pending.opts.some((o) => BF.same(o.v, action.v))) fail('That is not one of the choices');
    const s = BF.clone(s0);
    const st = s.queue[0];
    st.ans[s.pending.qid] = action.v;
    s.pending = null;
    BF.run(s);
    return s;
  };

  BF.run = (s) => {
    let guard = 0;
    while (s.queue.length && !s.result && !s.pending) {
      if (++guard > 200000) bug('the queue does not settle');
      const st = s.queue[0];
      const handler = STEPS[st.k] || bug(`no handler for step "${st.k}"`);
      st.ans = st.ans || {};
      const r = handler(s, st);
      if (r === WAIT) {
        if (!s.pending) bug(`step "${st.k}" waited without asking`);
        return;
      }
      if (r === STAY) continue;
      const i = s.queue.indexOf(st);
      if (i < 0) bug(`step "${st.k}" vanished`);
      s.queue.splice(i, 1);
    }
    if (!s.queue.length && !s.result) bug('the queue ran dry');
  };

  /** Queues steps to run next, in the order given. */
  const next = (BF.next = (s, ...steps) => {
    s.queue.unshift(...steps.map((x) => ({ ...x, ans: {} })));
  });

  // ---------------------------------------------------------------- players, order, scoring

  const xpOf = (s, seat) => {
    const b = s.players[seat].boss;
    return b == null ? -seat : BF.defOf(s, b).xp;
  };
  /** Seats in XP order, highest first (RB p12 XP). */
  BF.turnOrder = (s) => s.players.map((p) => p.seat).sort((a, b) => xpOf(s, b) - xpOf(s, a));
  BF.opponents = (s, seat) => s.players.filter((p) => p.seat !== seat).map((p) => p.seat);

  /** Soul and Wound value of a Hero card: Epic Heroes count double (RB p8 Heroes). */
  BF.heroValue = (s, iid) => (BF.defOf(s, iid).epic ? 2 : 1);
  BF.souls = (s, seat) => s.players[seat].score.reduce((n, x) => n + (x.up ? 0 : BF.heroValue(s, x.iid)), 0);
  BF.wounds = (s, seat) => s.players[seat].score.reduce((n, x) => n + (x.up ? BF.heroValue(s, x.iid) : 0), 0);

  // ---------------------------------------------------------------- dungeon geometry

  // dungeon[0] is the leftmost Room, next to the entrance; the Boss sits after the last slot.
  const top = (p, slot) => p.dungeon[slot][p.dungeon[slot].length - 1];
  BF.topOf = top;
  BF.isFaceDown = (s, iid) => !!s.fd[iid];
  /** A Room that is visible and not deactivated (RB p21 Deactivate, Face-Down). */
  BF.slotActive = (s, p, slot) =>
    slot >= 0 && slot < p.dungeon.length && !s.fd[top(p, slot)] && !s.eot.deact[top(p, slot)];
  BF.activeSlots = (s, seat) => {
    const p = s.players[seat];
    return p.dungeon.map((_, i) => i).filter((i) => BF.slotActive(s, p, i));
  };
  BF.roomCount = (s, seat) => BF.activeSlots(s, seat).length;

  /** Where a Room card is: its dungeon, slot and whether it is the visible top of the stack. */
  BF.findRoom = (s, iid) => {
    for (const p of s.players) {
      for (let slot = 0; slot < p.dungeon.length; slot++) {
        const i = p.dungeon[slot].indexOf(iid);
        if (i >= 0) return { seat: p.seat, slot, isTop: i === p.dungeon[slot].length - 1 };
      }
    }
    return null;
  };
  /** True when iid is an active Room (visible top of its stack, face-up, not deactivated). */
  BF.roomIsActive = (s, iid) => {
    const at = BF.findRoom(s, iid);
    return !!at && at.isTop && BF.slotActive(s, s.players[at.seat], at.slot);
  };

  // ---------------------------------------------------------------- the damage, treasure and health doors

  /** Damage the Room in `slot` deals (RB p7 Rooms), with every modifier. The one damage door. */
  BF.roomDamage = (s, seat, slot) => {
    const p = s.players[seat];
    if (!BF.slotActive(s, p, slot)) return 0;
    const iid = top(p, slot);
    const d = BF.defOf(s, iid);
    let dmg = d.dmg;
    if (d.id === 'BMR020') dmg = BF.activeSlots(s, seat).filter((i) => BF.defOf(s, top(p, i)).sub === 'monster').length; // Monster's Ballroom, FAQ Monster's Ballroom
    const neighbour = (i) => (BF.slotActive(s, p, i) ? BF.idOf(s, top(p, i)) : null);
    if (d.sub === 'monster') {
      // Goblin Armory: adjacent Monster Rooms +1; a deactivated neighbour breaks adjacency (FAQ Goblin Armory).
      dmg += [neighbour(slot - 1), neighbour(slot + 1)].filter((x) => x === 'BMR015').length;
    }
    // Dizzygas Hallway: the next Room (to its right) gets +2 if it is a Trap (FAQ Dizzygas Hallway).
    if (d.sub === 'trap' && neighbour(slot - 1) === 'BMR029') dmg += 2;
    dmg += s.eot.roomDmg[iid] || 0;
    for (const c of s.eot.crush) if (c.seat === seat && c.src !== iid) dmg += 2; // FAQ The Crushinator: all other Rooms
    return Math.max(0, dmg);
  };

  /** Treasure of type `t` a dungeon shows (RB p6 Bosses: the Boss counts). The one treasure door. */
  BF.treasureOf = (s, seat, t) => {
    const p = s.players[seat];
    let rooms = 0;
    for (const slot of BF.activeSlots(s, seat)) rooms += BF.defOf(s, top(p, slot)).treasure.filter((x) => x === t).length;
    if (s.eot.dbl[seat]) rooms *= 2; // Jackpot Stash doubles Rooms only (FAQ Jackpot Stash)
    const boss = p.boss == null ? 0 : BF.defOf(s, p.boss).treasure.filter((x) => x === t).length;
    return rooms + boss;
  };

  /** Current Health of a Hero card, with "until end of turn" bonuses. The one health door. */
  BF.heroHealth = (s, iid) => BF.defOf(s, iid).health + (s.eot.heroHp[iid] || 0);
  BF.heroLeft = (s, iid) => BF.heroHealth(s, iid) - (s.cards[iid].dmg || 0);

  /** The Hero moving through a Room right now, if any (RULING R6). */
  BF.heroInRoom = (s) => (s.adv && s.adv.pos >= 0 && s.adv.hero != null ? s.adv : null);

  // ---------------------------------------------------------------- deck doors

  /** Draws a Room or Spell card (RULING R4 when the deck is empty). The one draw door. */
  BF.draw = (s, seat, type) => {
    const deck = type === 'room' ? s.roomDeck : s.spellDeck;
    if (!deck.length) {
      const back = s.discard.filter((iid) => kindOf(s, iid) === type);
      if (!back.length) {
        BF.log(s, `${P(seat)} cannot draw: no ${type === 'room' ? 'Room' : 'Spell'} cards are left.`);
        return null;
      }
      s.discard = s.discard.filter((iid) => kindOf(s, iid) !== type);
      deck.push(...BF.shuffle(s, back));
      BF.log(s, `The ${type === 'room' ? 'Room' : 'Spell'} deck is reshuffled from the discard pile.`);
    }
    const iid = deck.pop();
    s.players[seat].hand.push(iid);
    return iid;
  };

  /** Moves a card from wherever it is to the discard pile. The one discard door. */
  BF.discardCard = (s, iid) => {
    removeFromZones(s, iid);
    s.discard.push(iid);
  };

  const removeFromZones = (s, iid) => {
    for (const p of s.players) {
      p.hand = p.hand.filter((x) => x !== iid);
      p.entrance = p.entrance.filter((x) => x !== iid);
      p.score = p.score.filter((x) => x.iid !== iid);
    }
    for (const z of ['roomDeck', 'spellDeck', 'heroDeck', 'discard', 'town']) s[z] = s[z].filter((x) => x !== iid);
  };
  BF.removeFromZones = removeFromZones;

  // ---------------------------------------------------------------- build door

  /** Where Room `iid` may be built by `seat`: 'new' or the top iid of a stack (RB p13 Build Phase). */
  BF.buildSlots = (s, seat, iid) => {
    const d = BF.defOf(s, iid);
    if (d.kind !== 'room' || s.eot.noBuild) return [];
    const p = s.players[seat];
    const out = [];
    if (!d.adv && p.dungeon.length < BF.MAX_ROOMS) out.push('new');
    p.dungeon.forEach((_, slot) => {
      if (!BF.slotActive(s, p, slot)) return; // never over face-down or deactivated Rooms (RB p21)
      const under = BF.defOf(s, top(p, slot));
      if (!d.adv) return out.push(top(p, slot));
      if (under.id === 'BMR018') return; // Neanderthal Cave
      if (under.treasure.some((t) => d.treasure.includes(t))) out.push(top(p, slot));
    });
    return out;
  };

  /** Puts a Room into a dungeon. The one build door; face-down builds wait for the reveal. */
  BF.buildRoom = (s, seat, iid, at, faceDown) => {
    const p = s.players[seat];
    removeFromZones(s, iid);
    if (at === 'new') p.dungeon.unshift([iid]);
    else {
      const loc = BF.findRoom(s, at);
      if (!loc || loc.seat !== seat || !loc.isTop) bug('build target is not a top Room');
      p.dungeon[loc.slot].push(iid);
    }
    if (faceDown) {
      s.fd[iid] = true;
      p.revealQ.push(iid);
    }
  };

  /** Level Up: the first time a dungeon shows five Rooms (RB p23 Level Up). */
  BF.checkLevelUp = (s, seat) => {
    const p = s.players[seat];
    if (p.leveled || BF.roomCount(s, seat) < BF.MAX_ROOMS) return false;
    p.leveled = true;
    BF.log(s, `${C(p.boss)} levels up!`, { levelUp: seat });
    next(s, { k: 'levelUp', seat });
    return true;
  };

  /** Triggers that follow a Room being built face-up (RB p20 Build). */
  BF.afterBuilt = (s, seat, iid) => {
    const steps = [];
    if (BF.abOf(s, iid).onBuild) steps.push({ k: 'onBuild', seat, iid });
    // Beast Menagerie (BMR019): once per turn when you build another Monster Room, draw a Room.
    if (BF.defOf(s, iid).sub === 'monster') {
      for (const slot of BF.activeSlots(s, seat)) {
        const m = top(s.players[seat], slot);
        if (m !== iid && BF.idOf(s, m) === 'BMR019' && !s.once[`${m}:menagerie`]) {
          s.once[`${m}:menagerie`] = true;
          steps.push({ k: 'draw', seat, type: 'room', why: m });
        }
      }
    }
    next(s, ...steps);
  };

  // ---------------------------------------------------------------- destroy and kill doors

  /**
   * Destroys the top Room of a stack (RB p21 Destroy). The Room underneath is uncovered; an empty
   * slot closes. A Hero in the destroyed Room leaves it at once (FAQ Top Five).
   */
  BF.destroyRoom = (s, iid) => {
    const at = BF.findRoom(s, iid);
    if (!at || !at.isTop) bug('destroying a Room that is not on top');
    const p = s.players[at.seat];
    p.dungeon[at.slot].pop();
    delete s.fd[iid];
    delete s.eot.deact[iid];
    s.discard.push(iid);
    const closed = p.dungeon[at.slot].length === 0;
    if (closed) p.dungeon.splice(at.slot, 1);
    BF.log(s, `${C(iid)} in ${P(at.seat)}'s dungeon is destroyed.`, { destroyed: iid });
    const adv = s.adv;
    if (adv && adv.seat === at.seat && adv.pos >= 0) {
      if (adv.pos === at.slot) {
        adv.left = true; // the Hero exits this Room now; the Room beneath does not affect it
        if (closed) adv.pos -= 1;
      } else if (closed && adv.pos > at.slot) adv.pos -= 1;
    }
    // Recycling Center (BMR031): when another Room in your dungeon is destroyed, you may draw two Rooms.
    for (const slot of BF.activeSlots(s, at.seat)) {
      const r = top(p, slot);
      if (BF.idOf(s, r) === 'BMR031' && r !== iid) next(s, { k: 'mayDraw', seat: at.seat, type: 'room', n: 2, why: r });
    }
  };

  /** A Hero dies: it goes face-down into `seat`'s scorekeeping area (RB p21 Dead). The one kill door. */
  BF.killHero = (s, seat, hero, roomIid) => {
    removeFromZones(s, hero);
    if (s.adv && s.adv.hero === hero) s.adv = null;
    s.players[seat].score.push({ iid: hero, up: false });
    s.cards[hero].dmg = 0;
    BF.log(s, roomIid ? `${C(hero)} dies in ${C(roomIid)}. ${P(seat)} gains a Soul.` : `${C(hero)} dies. ${P(seat)} gains a Soul.`, {
      soul: seat,
      hero,
    });
    if (roomIid && BF.roomIsActive(s, roomIid) && BF.abOf(s, roomIid).onDeath) {
      const key = `${roomIid}:death`;
      if (!s.once[key]) {
        s.once[key] = true; // every base-set "if a Hero dies in this room" is once per turn
        next(s, { k: 'onDeath', seat, iid: roomIid, hero });
      }
    }
  };

  /** Heal: flip a face-up Hero face-down (RB p22 Heal). */
  BF.healWound = (s, seat, hero) => {
    const x = s.players[seat].score.find((e) => e.iid === hero && e.up);
    if (!x) bug('healing a Hero that is not a Wound');
    x.up = false;
    BF.log(s, `${P(seat)} heals the Wound from ${C(hero)}.`);
  };

  BF.sendToEntrance = (s, seat, hero) => {
    removeFromZones(s, hero);
    s.cards[hero].dmg = 0;
    s.players[seat].entrance.push(hero);
  };

  BF.sendToTown = (s, hero) => {
    removeFromZones(s, hero);
    if (s.adv && s.adv.hero === hero) s.adv = null;
    s.cards[hero].dmg = 0; // RB p19: damage does not carry over
    s.town.push(hero);
  };

  // ---------------------------------------------------------------- new game

  const freshEot = () => ({ roomDmg: {}, crush: [], heroHp: {}, deact: {}, dbl: {}, noBuild: false, trepid: {}, extra: {} });

  /**
   * cfg: { players: [{ name, ai }], seed?, classic? }. Builds the decks for the player count
   * (RB p10 Set Up) without the cards listed in data/defects.js.
   */
  BF.newGame = (cfg) => {
    const n = cfg.players.length;
    if (n < 2 || n > 4) fail('Boss Monster is for 2-4 players'); // RB p4 Object
    const s = {
      v: 1,
      seed: cfg.seed ?? Math.floor(Math.random() * 2 ** 31),
      rng: 0,
      nextIid: 1,
      cfg: { n, classic: !!cfg.classic },
      turn: 0,
      phase: 'setup',
      cards: {},
      bossDeck: [],
      roomDeck: [],
      spellDeck: [],
      heroDeck: [],
      discard: [],
      removed: [],
      town: [],
      fd: {},
      players: [],
      stack: [],
      queue: [],
      pending: null,
      adv: null,
      eot: freshEot(),
      once: {},
      log: [],
      result: null,
    };
    s.rng = s.seed | 0;
    const mk = (id) => {
      const iid = s.nextIid++;
      s.cards[iid] = { iid, id };
      return iid;
    };
    const ordinary = [];
    const epic = [];
    for (const d of Object.values(BF.CARD_DATA)) {
      if (BF.DEFECTS[d.id]) continue; // CLAUDE.md regime 6
      if (d.kind === 'hero' && d.minPlayers > n) continue; // RB p10 Step 1
      for (let i = 0; i < d.qty; i++) {
        const iid = mk(d.id);
        if (d.kind === 'boss') s.bossDeck.push(iid);
        else if (d.kind === 'room') s.roomDeck.push(iid);
        else if (d.kind === 'spell') s.spellDeck.push(iid);
        else {
          s.cards[iid].dmg = 0;
          (d.epic ? epic : ordinary).push(iid);
        }
      }
    }
    BF.shuffle(s, s.bossDeck);
    BF.shuffle(s, s.roomDeck);
    BF.shuffle(s, s.spellDeck);
    // Ordinary Heroes on top of the Epic Heroes; the top of every deck is the array's end.
    s.heroDeck = [...BF.shuffle(s, epic), ...BF.shuffle(s, ordinary)];

    cfg.players.forEach((pc, seat) => {
      const p = {
        seat,
        name: pc.name,
        ai: !!pc.ai,
        boss: null,
        bossOffer: [s.bossDeck.pop(), s.bossDeck.pop()], // RB p10 Step 2
        hand: [],
        dungeon: [],
        score: [],
        entrance: [],
        revealQ: [],
        leveled: false,
        placed: 0,
      };
      s.players.push(p);
    });
    for (const p of s.players) {
      for (let i = 0; i < 5; i++) BF.draw(s, p.seat, 'room'); // RB p10 Step 3
      for (let i = 0; i < 2; i++) BF.draw(s, p.seat, 'spell');
    }
    // FAQ Seq 1: the discard pile starts with 4 random Rooms and 2 random Spells (RULING R3).
    for (let i = 0; i < 4; i++) s.discard.push(s.roomDeck.pop());
    for (let i = 0; i < 2; i++) s.discard.push(s.spellDeck.pop());
    BF.log(s, 'Each Boss receives two Boss cards, five Rooms and two Spells.');

    const steps = s.players.map((p) => ({ k: 'chooseBoss', seat: p.seat }));
    for (const p of s.players) steps.push({ k: 'mulligan', seat: p.seat });
    if (s.cfg.classic) for (const p of s.players) steps.push({ k: 'classicDiscard', seat: p.seat, left: 2 });
    steps.push({ k: 'setupBuild' });
    next(s, ...steps);
    BF.run(s);
    return s;
  };

  // ---------------------------------------------------------------- setup steps

  STEPS.chooseBoss = (s, st) => {
    const p = s.players[st.seat];
    const a = BF.ask(s, st, 'boss', {
      who: st.seat,
      kind: 'boss',
      prompt: 'Choose your Boss. The other is set aside. Higher XP acts first; Level Up happens at five Rooms.',
      opts: p.bossOffer.map((iid) => ({ v: iid, label: C(iid), iid })),
    });
    if (a === ASKED) return WAIT;
    p.boss = a;
    s.removed.push(...p.bossOffer.filter((x) => x !== a));
    BF.log(s, `${P(st.seat)} becomes ${C(a)}.`);
  };

  STEPS.mulligan = (s, st) => {
    // RB p10 Step 3: four Advanced Rooms, or four of one treasure type, allows a new hand.
    const p = s.players[st.seat];
    const rooms = p.hand.filter((iid) => kindOf(s, iid) === 'room').map((iid) => BF.defOf(s, iid));
    const adv = rooms.filter((d) => d.adv).length;
    const sameType = BF.TREASURES.some((t) => rooms.reduce((n, d) => n + d.treasure.filter((x) => x === t).length, 0) >= 4);
    if (adv < 4 && !sameType) return;
    const a = BF.ask(s, st, 'm', {
      who: st.seat,
      kind: 'mulligan',
      prompt: `Your hand has ${adv >= 4 ? 'four Advanced Rooms' : 'four Rooms of one treasure type'}. You may shuffle it back and draw a new hand.`,
      opts: [
        { v: 'keep', label: 'Keep this hand' },
        { v: 'redraw', label: 'Shuffle back and draw 5 Rooms + 2 Spells' },
      ],
    });
    if (a === ASKED) return WAIT;
    if (a === 'keep') return;
    for (const iid of p.hand) (kindOf(s, iid) === 'room' ? s.roomDeck : s.spellDeck).push(iid);
    p.hand = [];
    BF.shuffle(s, s.roomDeck);
    BF.shuffle(s, s.spellDeck);
    for (let i = 0; i < 5; i++) BF.draw(s, st.seat, 'room');
    for (let i = 0; i < 2; i++) BF.draw(s, st.seat, 'spell');
    BF.log(s, `${P(st.seat)} takes a new hand.`);
  };

  STEPS.classicDiscard = (s, st) => {
    // RB p20 Classic Mode: discard two cards of your choice.
    const p = s.players[st.seat];
    while (st.left > 0) {
      const a = BF.ask(s, st, `d${st.left}`, {
        who: st.seat,
        kind: 'discard',
        prompt: `Classic Mode: discard ${st.left} more card${st.left > 1 ? 's' : ''} from your hand.`,
        opts: p.hand.map((iid) => ({ v: iid, label: C(iid), iid })),
      });
      if (a === ASKED) return WAIT;
      BF.discardCard(s, a);
      st.left--;
    }
  };

  STEPS.setupBuild = (s) => {
    // RB p11 Step 4: in XP order each Boss may place a first Room face-down; reveal together.
    s.phase = 'build';
    BF.log(s, 'Each Boss builds a first Room.');
    next(s, ...BF.turnOrder(s).map((seat) => ({ k: 'setupPlace', seat })), { k: 'reveal' }, { k: 'beginTurn' });
  };

  STEPS.setupPlace = (s, st) => {
    const p = s.players[st.seat];
    const opts = p.hand
      .filter((iid) => BF.buildSlots(s, st.seat, iid).includes('new'))
      .map((iid) => ({ v: { place: iid, at: 'new' }, label: `Build ${C(iid)}`, iid }));
    opts.push({ v: 'none', label: 'Build nothing' });
    const a = BF.ask(s, st, 'place', {
      who: st.seat,
      kind: 'place',
      prompt: 'Choose your first Room. It is placed face-down and revealed when every Boss has chosen.',
      opts,
    });
    if (a === ASKED) return WAIT;
    if (a !== 'none') {
      BF.buildRoom(s, st.seat, a.place, 'new', true);
      BF.log(s, `${P(st.seat)} places a Room face-down.`);
    }
  };

  // ---------------------------------------------------------------- turn structure

  STEPS.beginTurn = (s) => {
    // RB p13 Beginning: reveal one Hero per player, then each player draws a Room. No Spells.
    s.turn++;
    s.phase = 'beginning';
    BF.log(s, `Turn ${s.turn}`, { turnStart: s.turn });
    for (let i = 0; i < s.players.length; i++) {
      const h = s.heroDeck.pop();
      if (h == null) break;
      s.town.push(h);
      BF.log(s, `${C(h)} arrives in town.`, { hero: h });
    }
    next(s, ...BF.turnOrder(s).map((seat) => ({ k: 'turnDraw', seat })), { k: 'buildPhase' });
  };

  STEPS.turnDraw = (s, st) => {
    // Haunted Library (BMR023): you may draw from the Spell deck instead (FAQ Haunted Library).
    const lib = BF.activeSlots(s, st.seat).some((slot) => BF.idOf(s, top(s.players[st.seat], slot)) === 'BMR023');
    let type = 'room';
    if (lib) {
      const a = BF.ask(s, st, 'lib', {
        who: st.seat,
        kind: 'draw',
        prompt: 'Haunted Library: draw your card from the Room deck or the Spell deck?',
        opts: [
          { v: 'room', label: 'Draw a Room' },
          { v: 'spell', label: 'Draw a Spell' },
        ],
      });
      if (a === ASKED) return WAIT;
      type = a;
    }
    BF.draw(s, st.seat, type);
  };

  STEPS.buildPhase = (s) => {
    s.phase = 'build';
    for (const p of s.players) p.placed = 0;
    const order = BF.turnOrder(s);
    next(
      s,
      ...order.map((seat) => ({ k: 'window', ctx: 'build', active: seat, place: true, n: 0, i: 0, passes: 0 })),
      { k: 'window', ctx: 'build', active: order[0], place: false, final: true, n: 0, i: 0, passes: 0 }, // RULING R5
      { k: 'reveal' },
      { k: 'bait' },
      { k: 'adventurePhase' },
      { k: 'endTurn' },
    );
  };

  STEPS.reveal = (s) => {
    // RB p14 Build Phase: reveal together; Level Up and build effects in XP order.
    const revealed = Object.keys(s.fd).map(Number);
    s.fd = {};
    for (const seat of BF.turnOrder(s)) {
      const p = s.players[seat];
      const mine = p.revealQ.filter((iid) => revealed.includes(iid));
      for (const iid of mine) {
        const at = BF.findRoom(s, iid);
        BF.log(s, `${P(seat)} reveals ${C(iid)}${at.slot === 0 && p.dungeon[0].length === 1 ? ' at the entrance' : ''}.`, { built: iid });
      }
    }
    next(
      s,
      ...BF.turnOrder(s).map((seat) => {
        const p = s.players[seat];
        const rooms = p.revealQ.filter((iid) => revealed.includes(iid));
        p.revealQ = [];
        return { k: 'revealTriggers', seat, rooms, lvl: false };
      }),
    );
  };

  STEPS.revealTriggers = (s, st) => {
    // RB p23 Level Up comes first, then the Rooms' build effects in the order the Boss chooses.
    if (!st.lvl) {
      st.lvl = true;
      if (BF.checkLevelUp(s, st.seat)) return STAY;
    }
    if (!st.rooms.length) return;
    const withEffects = st.rooms.filter((iid) => BF.abOf(s, iid).onBuild || BF.defOf(s, iid).sub === 'monster');
    let pick = st.rooms[0];
    if (withEffects.length > 1) {
      const a = BF.ask(s, st, `o${st.rooms.length}`, {
        who: st.seat,
        kind: 'order',
        prompt: 'Several of your Rooms have "when you build" effects. Which resolves first?',
        opts: withEffects.map((iid) => ({ v: iid, label: C(iid), iid })),
      });
      if (a === ASKED) return WAIT;
      pick = a;
    }
    st.rooms = st.rooms.filter((x) => x !== pick);
    if (BF.roomIsActive(s, pick)) BF.afterBuilt(s, st.seat, pick);
    return STAY;
  };

  STEPS.levelUp = (s, st) => {
    const ab = BF.abOf(s, s.players[st.seat].boss);
    if (!ab.levelUp) bug('Boss without a Level Up');
    ab.levelUp(s, st.seat);
  };

  STEPS.onBuild = (s, st) => {
    BF.log(s, `${C(st.iid)}: when built.`, { trigger: st.iid });
    BF.abOf(s, st.iid).onBuild(s, st.seat, st.iid);
  };

  STEPS.onDeath = (s, st) => {
    BF.abOf(s, st.iid).onDeath(s, st.seat, st.iid, st.hero);
  };

  STEPS.bait = (s) => {
    // RB p15 Bait Phase: each Hero, in order of arrival, goes to the single highest treasure.
    s.phase = 'bait';
    const stay = [];
    for (const h of s.town) {
      const d = BF.defOf(s, h);
      let value;
      let why;
      if (d.id === 'BMR080') {
        // The Fool: lured to the Boss with the fewest Souls (FAQ The Fool).
        value = (seat) => -BF.souls(s, seat);
        why = 'fewest Souls';
      } else {
        value = (seat) => BF.treasureOf(s, seat, d.treasure[0]);
        why = `${d.treasure[0]} treasure`;
      }
      const vals = s.players.map((p) => ({ seat: p.seat, v: value(p.seat) }));
      const best = Math.max(...vals.map((x) => x.v));
      const lead = vals.filter((x) => x.v === best);
      if (lead.length === 1 && (d.id === 'BMR080' || best > 0)) {
        s.players[lead[0].seat].entrance.push(h);
        BF.log(s, `${C(h)} is lured to ${P(lead[0].seat)}'s dungeon (${why}).`, { lured: h, to: lead[0].seat });
      } else {
        stay.push(h);
        BF.log(s, `${C(h)} stays in town: ${best > 0 || d.id === 'BMR080' ? 'a tie' : 'no matching treasure'}.`, { stays: h });
      }
    }
    s.town = stay;
  };

  STEPS.adventurePhase = (s) => {
    // RB p17 Adventure Phase: in XP order each Boss processes the Heroes at their entrance.
    s.phase = 'adventure';
    next(s, ...BF.turnOrder(s).map((seat) => ({ k: 'process', seat })));
  };

  STEPS.process = (s, st) => {
    const p = s.players[st.seat];
    if (!p.entrance.length) return;
    if (s.eot.trepid[st.seat]) {
      BF.log(s, `Trepidation: no Hero enters ${P(st.seat)}'s dungeon this turn.`);
      return;
    }
    const hero = p.entrance.shift();
    s.adv = { seat: st.seat, hero, pos: -1, maze: {}, left: false, teleport: false };
    BF.log(s, `${C(hero)} enters ${P(st.seat)}'s dungeon.`, { enters: hero, seat: st.seat });
    next(s, win(s, 'door', st.seat), { k: 'advance' }, { k: 'process', seat: st.seat });
  };

  const win = (s, ctx, active) => ({ k: 'window', ctx, active, place: false, n: 0, i: 0, passes: 0 });

  STEPS.advance = (s) => {
    const adv = s.adv;
    if (!adv) return; // the Hero died, fled or was moved
    if (s.eot.trepid[adv.seat] && adv.pos < 0) {
      BF.sendToEntrance(s, adv.seat, adv.hero); // Trepidation cast while it waited at the door
      s.players[adv.seat].entrance.unshift(s.players[adv.seat].entrance.pop());
      s.adv = null;
      return;
    }
    const p = s.players[adv.seat];
    adv.pos++;
    adv.left = false;
    // RULING R14: a deactivated Room is a blank space.
    while (adv.pos < p.dungeon.length && !BF.slotActive(s, p, adv.pos)) adv.pos++;
    if (adv.pos >= p.dungeon.length) {
      next(s, { k: 'reachBoss' });
      return;
    }
    next(s, { k: 'enterRoom' });
  };

  STEPS.enterRoom = (s) => {
    // FAQ Top Five: entering applies the Room's ongoing effects, then its damage; then a window.
    const adv = s.adv;
    const p = s.players[adv.seat];
    const room = top(p, adv.pos);
    if (BF.idOf(s, room) === 'BMR017' && !adv.maze[room]) {
      // Minotaur's Maze: the first time a Hero enters, send it back one Room (FAQ Minotaur's Maze).
      adv.maze[room] = true;
      if (adv.pos > 0 && BF.slotActive(s, p, adv.pos - 1)) {
        BF.log(s, `${C(room)} sends ${C(adv.hero)} back one Room.`);
        adv.pos -= 1;
        next(s, { k: 'enterRoom' });
        return;
      }
    }
    const dmg = BF.roomDamage(s, adv.seat, adv.pos);
    s.cards[adv.hero].dmg += dmg;
    BF.log(s, `${C(adv.hero)} takes ${dmg} damage in ${C(room)} (${BF.heroLeft(s, adv.hero)} Health left).`, {
      damage: dmg,
      hero: adv.hero,
      room,
    });
    adv.room = room;
    next(s, win(s, 'room', adv.seat), { k: 'exitRoom' });
  };

  STEPS.exitRoom = (s) => {
    // RB p17: a Hero leaving a Room with damage >= Health dies there.
    const adv = s.adv;
    if (!adv) return;
    if (BF.heroLeft(s, adv.hero) <= 0) {
      BF.killHero(s, adv.seat, adv.hero, BF.roomIsActive(s, adv.room) ? adv.room : null);
      return;
    }
    if (adv.teleport) {
      adv.teleport = false; // Teleportation: back to the first Room (RULING R7)
      adv.pos = -1;
      adv.maze = {};
    }
    next(s, { k: 'advance' });
  };

  STEPS.reachBoss = (s) => {
    const adv = s.adv;
    s.players[adv.seat].score.push({ iid: adv.hero, up: true }); // RB p17 Survival
    BF.log(s, `${C(adv.hero)} reaches ${C(s.players[adv.seat].boss)} and deals ${BF.heroValue(s, adv.hero) > 1 ? 'two Wounds' : 'a Wound'}!`, {
      wound: adv.seat,
      hero: adv.hero,
    });
    s.adv = null;
  };

  STEPS.endTurn = (s) => {
    // RB p19 End of Turn.
    s.phase = 'end';
    const wasDeact = Object.keys(s.eot.deact).length > 0;
    s.eot = freshEot();
    s.once = {};
    for (const p of s.players) for (const h of p.entrance) s.cards[h].dmg = 0;
    if (wasDeact) for (const seat of BF.turnOrder(s)) if (BF.checkLevelUp(s, seat)) return STAY; // FAQ Freeze
    const done = s.players.some((p) => BF.souls(s, p.seat) >= BF.WIN_SOULS || BF.wounds(s, p.seat) >= BF.MAX_WOUNDS);
    const outOfHeroes = !s.heroDeck.length && !s.town.length && s.players.every((p) => !p.entrance.length); // RULING R8
    if (done || outOfHeroes) return finish(s, outOfHeroes && !done ? 'No Heroes remain.' : null);
    next(s, { k: 'beginTurn' });
  };

  /** RB p19 / RULING R1: highest Souls minus Wounds wins; a tie goes to the highest XP. */
  const finish = (s, why) => {
    const score = (seat) => BF.souls(s, seat) - BF.wounds(s, seat);
    const ranked = [...s.players].sort((a, b) => score(b.seat) - score(a.seat) || xpOf(s, b.seat) - xpOf(s, a.seat));
    const winner = ranked[0].seat;
    s.phase = 'over';
    s.result = { winners: [winner], scores: s.players.map((p) => ({ seat: p.seat, souls: BF.souls(s, p.seat), wounds: BF.wounds(s, p.seat) })) };
    if (why) BF.log(s, why);
    BF.log(s, `${P(winner)} wins with ${score(winner)} (Souls minus Wounds).`, { winner });
  };
  BF.scoreOf = (s, seat) => BF.souls(s, seat) - BF.wounds(s, seat);

  // ---------------------------------------------------------------- generic small steps

  STEPS.draw = (s, st) => {
    for (let i = 0; i < (st.n || 1); i++) BF.draw(s, st.seat, st.type);
    BF.log(s, `${P(st.seat)} draws ${st.n > 1 ? st.n : 'a'} ${st.type === 'room' ? 'Room' : 'Spell'} card${st.n > 1 ? 's' : ''}${st.why ? ` (${C(st.why)})` : ''}.`);
  };

  STEPS.mayDraw = (s, st) => {
    const what = `${st.n > 1 ? st.n : 'a'} ${st.type === 'room' ? 'Room' : 'Spell'} card${st.n > 1 ? 's' : ''}`;
    const a = BF.ask(s, st, 'may', {
      who: st.seat,
      kind: 'may',
      src: st.why,
      prompt: `${C(st.why)}: you may draw ${what}.`,
      opts: [
        { v: true, label: `Draw ${what}` },
        { v: false, label: 'Decline' },
      ],
    });
    if (a === ASKED) return WAIT;
    if (a) next(s, { k: 'draw', seat: st.seat, type: st.type, n: st.n, why: st.why });
  };

  /** Moves chosen cards from a zone to `seat`'s hand. filter is a key of BF.FILTERS. */
  STEPS.take = (s, st) => {
    while ((st.n ?? 1) > (st.got ?? 0)) {
      const pool = BF.zoneCards(s, st.from).filter((iid) => BF.FILTERS[st.filter](s, iid));
      if (!pool.length) {
        if (!st.got) BF.log(s, `${C(st.why)}: there is nothing to take.`);
        break;
      }
      const opts = pool.map((iid) => ({ v: iid, label: C(iid), iid }));
      if (st.optional) opts.push({ v: 'stop', label: 'Take nothing' });
      const a = BF.ask(s, st, `t${st.got ?? 0}`, {
        who: st.seat,
        kind: 'take',
        src: st.why,
        prompt: st.prompt,
        info: { zone: st.from },
        opts,
      });
      if (a === ASKED) return WAIT;
      if (a === 'stop') break;
      removeFromZones(s, a);
      s.players[st.seat].hand.push(a);
      BF.log(s, `${P(st.seat)} takes ${C(a)} from the ${st.from === 'discard' ? 'discard pile' : 'Room deck'}.`);
      st.got = (st.got ?? 0) + 1;
    }
    if (st.from === 'roomDeck' && st.searched !== false) BF.shuffle(s, s.roomDeck); // RB p23 Search
  };

  BF.zoneCards = (s, zone) => {
    if (zone === 'discard') return [...s.discard];
    if (zone === 'roomDeck') return [...s.roomDeck];
    if (zone === 'roomDeckOrDiscard') return [...s.roomDeck, ...s.discard];
    bug(`unknown zone ${zone}`);
  };

  /** Chooses and discards cards from `seat`'s hand matching a filter (RB p21 Discard: discarder chooses). */
  STEPS.discardChoice = (s, st) => {
    while ((st.n ?? 1) > (st.got ?? 0)) {
      const pool = s.players[st.seat].hand.filter((iid) => BF.FILTERS[st.filter](s, iid));
      if (!pool.length) break;
      const a = BF.ask(s, st, `d${st.got ?? 0}`, {
        who: st.seat,
        kind: 'discard',
        src: st.why,
        prompt: st.prompt,
        opts: pool.map((iid) => ({ v: iid, label: C(iid), iid })),
      });
      if (a === ASKED) return WAIT;
      BF.discardCard(s, a);
      BF.log(s, `${P(st.seat)} discards ${C(a)}.`);
      st.got = (st.got ?? 0) + 1;
    }
  };

  BF.FILTERS = {
    any: () => true,
    room: (s, iid) => kindOf(s, iid) === 'room',
    spell: (s, iid) => kindOf(s, iid) === 'spell',
    monsterRoom: (s, iid) => kindOf(s, iid) === 'room' && BF.defOf(s, iid).sub === 'monster',
    advMonster: (s, iid) => kindOf(s, iid) === 'room' && BF.defOf(s, iid).adv && BF.defOf(s, iid).sub === 'monster',
    advTrap: (s, iid) => kindOf(s, iid) === 'room' && BF.defOf(s, iid).adv && BF.defOf(s, iid).sub === 'trap',
  };

  /** Ask a Boss to heal one Wound (RB p22 Heal); optional when the card says "may". */
  STEPS.heal = (s, st) => {
    const wounds = s.players[st.seat].score.filter((x) => x.up);
    if (!wounds.length) return;
    const opts = wounds.map((x) => ({ v: x.iid, label: `Heal ${C(x.iid)}`, iid: x.iid }));
    if (st.optional) opts.push({ v: 'no', label: 'Do not heal' });
    const a = BF.ask(s, st, 'h', { who: st.seat, kind: 'heal', src: st.why, prompt: `${C(st.why)}: heal one of your Wounds.`, opts });
    if (a === ASKED) return WAIT;
    if (a !== 'no') BF.healWound(s, st.seat, a);
  };

  /** A card ability's own step: BF.ABILITIES[id].steps[fn](s, st). */
  STEPS.ab = (s, st) => {
    const fn = BF.ABILITIES[st.id]?.steps?.[st.fn] || bug(`no ability step ${st.id}.${st.fn}`);
    return fn(s, st);
  };

  // ---------------------------------------------------------------- priority windows and the stack

  /** What `seat` could start in a window: Spells from hand and activated Room abilities. */
  BF.windowOptions = (s, w, seat) => {
    const opts = [];
    const p = s.players[seat];
    const phase = w.ctx === 'build' ? 'build' : 'adventure';
    for (const iid of p.hand) {
      const d = BF.defOf(s, iid);
      if (d.kind !== 'spell' || (d.phase !== 'both' && d.phase !== phase)) continue; // RB p9 Spells
      const sp = BF.abOf(s, iid).spell;
      if (!sp || (sp.can && !sp.can(s, seat, w))) continue;
      if (!targetsAvailable(s, seat, sp, iid)) continue;
      opts.push({ v: { cast: iid }, label: `Cast ${C(iid)}`, iid });
    }
    for (const slot of BF.activeSlots(s, seat)) {
      const room = top(p, slot);
      for (const [key, act] of Object.entries(BF.abOf(s, room).acts || {})) {
        if (act.once && s.once[`${room}:${key}`]) continue;
        if (act.can && !act.can(s, seat, room, w)) continue;
        if (!costPayable(s, seat, act, room) || !targetsAvailable(s, seat, act, room)) continue;
        opts.push({ v: { act: room, key }, label: `${act.verb || 'Use'} ${C(room)}`, iid: room });
      }
    }
    if (w.place && seat === w.active && canPlace(s, seat)) {
      for (const iid of p.hand) {
        for (const at of BF.buildSlots(s, seat, iid)) {
          opts.push({ v: { place: iid, at }, label: at === 'new' ? `Build ${C(iid)} at the entrance` : `Build ${C(iid)} over ${C(at)}`, iid, at });
        }
      }
    }
    return opts;
  };

  const canPlace = (s, seat) => !s.eot.noBuild && s.players[seat].placed < 1 + (s.eot.extra[seat] || 0);

  const targetsAvailable = (s, seat, spec, src) => (spec.targets || []).every((t) => BF.TARGETS[t.k](s, seat, src, t).length > 0);

  const costPayable = (s, seat, act, room) => {
    const c = act.cost;
    if (!c) return true;
    if (c.k === 'destroySelf') return true;
    if (c.k === 'destroyOther') return BF.activeSlots(s, seat).some((slot) => top(s.players[seat], slot) !== room);
    if (c.k === 'discard') return s.players[seat].hand.filter((iid) => BF.FILTERS[c.filter](s, iid)).length >= c.n;
    bug(`unknown cost ${c.k}`);
  };

  STEPS.window = (s, w) => {
    const order = [w.active, ...BF.turnOrder(s).filter((x) => x !== w.active)];
    for (;;) {
      if (w.passes >= order.length) {
        if (!s.stack.length) return; // everyone passed with nothing left to resolve
        w.passes = 0;
        w.i = 0;
        next(s, { k: 'resolveTop' });
        return STAY;
      }
      const seat = order[w.i % order.length];
      const opts = BF.windowOptions(s, w, seat);
      if (!opts.length) {
        // Not asked: a window in which the player holds nothing playable (CLAUDE.md rule 5).
        w.passes++;
        w.i++;
        continue;
      }
      opts.push({ v: 'pass', label: passLabel(s, w, seat) });
      const a = BF.ask(s, w, `w${w.n}`, { who: seat, kind: 'window', prompt: windowPrompt(s, w, seat), opts, info: { ctx: w.ctx } });
      if (a === ASKED) return WAIT;
      w.n++;
      if (a === 'pass') {
        w.passes++;
        w.i++;
        continue;
      }
      w.passes = 0;
      w.i = 0;
      if (a.place != null) next(s, { k: 'place', seat, iid: a.place, at: a.at });
      else if (a.cast != null) next(s, { k: 'declare', seat, src: a.cast, kind: 'spell', t: {}, ti: 0 });
      else next(s, { k: 'declare', seat, src: a.act, kind: 'ability', key: a.key, t: {}, ti: 0 });
      return STAY;
    }
  };

  const passLabel = (s, w, seat) => {
    if (s.stack.length) return 'Let it resolve';
    if (w.place && seat === w.active) return s.players[seat].placed ? 'End my build turn' : 'Build nothing this turn';
    if (w.ctx === 'room' || w.ctx === 'door') return 'Continue';
    return 'Pass';
  };

  const windowPrompt = (s, w, seat) => {
    if (s.stack.length) {
      const t = s.stack[s.stack.length - 1];
      return `${P(t.seat)} played ${C(t.src)}. Respond, or let it resolve.`;
    }
    if (w.ctx === 'build') {
      if (w.final) return 'Last chance for Build Spells and abilities before the Rooms are revealed.';
      if (seat === w.active) return 'Your build turn: place one Room face-down, or play Build Spells and abilities first.';
      return `${P(w.active)}'s build turn: you may play Build Spells or abilities.`;
    }
    const adv = s.adv;
    if (!adv) return 'Adventure phase.';
    if (w.ctx === 'door') return `${C(adv.hero)} is at the entrance of ${P(adv.seat)}'s dungeon.`;
    return `${C(adv.hero)} has ${BF.heroLeft(s, adv.hero)} Health left in ${C(adv.room)} (${P(adv.seat)}'s dungeon).`;
  };

  STEPS.place = (s, st) => {
    // RB p13: the Room goes face-down; it is revealed at the end of the Build phase.
    BF.buildRoom(s, st.seat, st.iid, st.at, true);
    s.players[st.seat].placed++;
    BF.log(s, `${P(st.seat)} places a Room face-down${st.at === 'new' ? ' at the entrance' : ` over ${C(st.at)}`}.`, { placed: st.seat });
  };

  /** Declaring a Spell or activated ability: targets, then cost, then onto the stack (RB p20 Cancel). */
  STEPS.declare = (s, st) => {
    const spec = st.kind === 'spell' ? BF.abOf(s, st.src).spell : BF.abOf(s, st.src).acts[st.key];
    const targets = spec.targets || [];
    while (st.ti < targets.length) {
      const t = targets[st.ti];
      const opts = BF.TARGETS[t.k](s, st.seat, st.src, t);
      if (!opts.length) bug('target vanished during declaration');
      const a = BF.ask(s, st, `t${st.ti}`, { who: st.seat, kind: 'target', src: st.src, prompt: `${C(st.src)}: ${t.prompt}`, opts });
      if (a === ASKED) return WAIT;
      st.t[t.as] = a;
      st.ti++;
    }
    const cost = spec.cost;
    if (cost && !st.paid) {
      if (cost.k === 'destroyOther') {
        const p = s.players[st.seat];
        const opts = BF.activeSlots(s, st.seat)
          .map((slot) => top(p, slot))
          .filter((r) => r !== st.src)
          .map((r) => ({ v: r, label: `Destroy ${C(r)}`, iid: r }));
        const a = BF.ask(s, st, 'cost', { who: st.seat, kind: 'cost', src: st.src, prompt: `${C(st.src)}: choose another Room in your dungeon to destroy.`, opts });
        if (a === ASKED) return WAIT;
        st.paid = true;
        BF.destroyRoom(s, a);
      } else if (cost.k === 'discard') {
        st.paid = true;
        next(s, {
          k: 'discardChoice',
          seat: st.seat,
          filter: cost.filter,
          n: cost.n,
          why: st.src,
          prompt: `${C(st.src)}: discard ${cost.n > 1 ? cost.n : 'a'} ${cost.label} to pay for it.`,
        });
        return STAY;
      } else if (cost.k === 'destroySelf') {
        st.paid = true;
        BF.destroyRoom(s, st.src);
      }
    }
    const item = { sid: s.nextIid++, kind: st.kind, src: st.src, seat: st.seat, key: st.key ?? null, t: st.t, canceled: false };
    if (st.kind === 'spell') removeFromZones(s, st.src);
    else if (spec.once) s.once[`${st.src}:${st.key}`] = true;
    s.stack.push(item);
    BF.log(s, `${P(st.seat)} ${st.kind === 'spell' ? 'casts' : 'uses'} ${C(st.src)}.`, { declared: st.src, seat: st.seat });
  };

  STEPS.resolveTop = (s) => {
    const item = s.stack.pop();
    const ab = BF.abOf(s, item.src);
    const spec = item.kind === 'spell' ? ab.spell : ab.acts[item.key];
    const ok = !item.canceled && (!spec.valid || spec.valid(s, item));
    if (item.kind === 'spell') s.discard.push(item.src);
    if (!ok) {
      BF.log(s, `${C(item.src)} is canceled.`, { canceled: item.src });
      return;
    }
    BF.log(s, `${C(item.src)} resolves.`, { resolves: item.src });
    spec.effect(s, item);
    // Liger's Den (BMR026): once per turn when you play a Spell (and it is not canceled), draw a Spell.
    if (item.kind === 'spell') {
      const p = s.players[item.seat];
      for (const slot of BF.activeSlots(s, item.seat)) {
        const r = top(p, slot);
        if (BF.idOf(s, r) === 'BMR026' && !s.once[`${r}:liger`]) {
          s.once[`${r}:liger`] = true;
          next(s, { k: 'draw', seat: item.seat, type: 'spell', why: r });
        }
      }
    }
  };

  // ---------------------------------------------------------------- targets

  /** Target lists: each returns choice options [{v, label, iid}] for `seat`. */
  BF.TARGETS = {
    heroInMyDungeon: (s, seat) => {
      const a = BF.heroInRoom(s);
      return a && a.seat === seat ? [{ v: a.hero, label: C(a.hero), iid: a.hero }] : [];
    },
    heroInOppDungeon: (s, seat) => {
      const a = BF.heroInRoom(s);
      return a && a.seat !== seat ? [{ v: a.hero, label: C(a.hero), iid: a.hero }] : [];
    },
    heroInAnyDungeon: (s) => {
      const a = BF.heroInRoom(s);
      return a ? [{ v: a.hero, label: C(a.hero), iid: a.hero }] : [];
    },
    heroInThisRoom: (s, seat, room) => {
      const a = BF.heroInRoom(s);
      return a && a.seat === seat && !a.left && BF.topOf(s.players[seat], a.pos) === room ? [{ v: a.hero, label: C(a.hero), iid: a.hero }] : [];
    },
    townHero: (s) => s.town.map((h) => ({ v: h, label: C(h), iid: h })),
    townOrdinaryHero: (s) => s.town.filter((h) => !BF.defOf(s, h).epic).map((h) => ({ v: h, label: C(h), iid: h })),
    room: (s, seat, src, t) => {
      const out = [];
      for (const p of s.players) {
        if (t.own && p.seat !== seat) continue;
        for (const slot of BF.activeSlots(s, p.seat)) {
          const r = top(p, slot);
          if (t.sub && BF.defOf(s, r).sub !== t.sub) continue;
          out.push({ v: r, label: `${C(r)} (${P(p.seat)})`, iid: r });
        }
      }
      return out;
    },
    opponent: (s, seat, src, t) =>
      BF.opponents(s, seat)
        .filter((o) => !t.soulsAhead || BF.souls(s, o) >= BF.souls(s, seat) + 2)
        .map((o) => ({ v: o, label: P(o), seat: o })),
    oppDeadHero: (s, seat) =>
      BF.opponents(s, seat).flatMap((o) =>
        s.players[o].score.filter((x) => !x.up).map((x) => ({ v: x.iid, label: `${C(x.iid)} (${P(o)})`, iid: x.iid })),
      ),
    mySoul: (s, seat) => s.players[seat].score.filter((x) => !x.up).map((x) => ({ v: x.iid, label: C(x.iid), iid: x.iid })),
    stackSpell: (s, seat, src, t) => {
      const topItem = s.stack[s.stack.length - 1];
      if (!topItem || topItem.kind !== 'spell' || topItem.canceled) return [];
      if (t.opp && topItem.seat === seat) return [];
      return [{ v: topItem.sid, label: `${C(topItem.src)} (${P(topItem.seat)})`, iid: topItem.src }];
    },
  };

  /** Re-check at resolution that a hero target is still where the card needs it (RB p20 Cancel). */
  BF.heroStillIn = (s, hero, where, seat) => {
    const a = BF.heroInRoom(s);
    if (where === 'town') return s.town.includes(hero);
    if (!a || a.hero !== hero) return false;
    if (where === 'mine') return a.seat === seat;
    if (where === 'opp') return a.seat !== seat;
    return true;
  };
})();
