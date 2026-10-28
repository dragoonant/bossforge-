// Every Base Set card's behaviour, keyed by card id (CLAUDE.md rule 7). `own` is the gist in our
// own words: the fallback face when data/printed.js is absent, and the auditor's describer.
// Hooks: levelUp(s, seat) | onBuild(s, seat, iid) | onDeath(s, seat, iid, hero) |
// acts: { key: { verb, once, cost, targets, can, valid, effect } } | spell: { targets, can, valid, effect } |
// steps: { fn(s, st) } for multi-question work queued as { k: 'ab', id, fn, ... }.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const { WAIT, ASKED } = BF;
  const { P, C } = BF;
  const next = (s, ...steps) => BF.next(s, ...steps);
  const ab = (id, fn, extra) => ({ k: 'ab', id, fn, ...extra });

  const randomFromHand = (s, seat, filter) => {
    const pool = s.players[seat].hand.filter((iid) => BF.FILTERS[filter](s, iid));
    return pool.length ? BF.pickRandom(s, pool) : null;
  };

  /** "Choose an opponent" asked as a question even with one opponent (RULING R15). */
  const askOpponent = (s, st, why, prompt, label = (o) => P(o)) => {
    if (st.opp != null) return st.opp;
    const a = BF.ask(s, st, 'opp', {
      who: st.seat,
      kind: 'opponent',
      src: why,
      prompt,
      opts: BF.opponents(s, st.seat).map((o) => ({ v: o, label: label(o), seat: o })),
    });
    if (a === ASKED) return ASKED;
    st.opp = a;
    return a;
  };

  /** King Croak and Cleopatra: search for an Advanced Room, then optionally build it at once. */
  const searchAndBuild = (id, filter, kindLabel) => ({
    levelUp(s, seat) {
      next(s, ab(id, 'go', { seat }));
    },
    steps: {
      go(s, st) {
        const boss = s.players[st.seat].boss;
        const pool = BF.zoneCards(s, 'roomDeckOrDiscard').filter((iid) => BF.FILTERS[filter](s, iid));
        if (st.got == null) {
          if (!pool.length) {
            BF.log(s, `${C(boss)}: there is no ${kindLabel} in the Room deck or discard pile (FAQ ${id === 'BMR003' ? 'King Croak' : 'Cleopatra'}).`);
            BF.shuffle(s, s.roomDeck);
            return;
          }
          const opts = pool.map((iid) => ({ v: iid, label: `${C(iid)} (${s.discard.includes(iid) ? 'discard pile' : 'Room deck'})`, iid }));
          opts.push({ v: 'none', label: 'Do not search' });
          const a = BF.ask(s, st, 'pick', { who: st.seat, kind: 'take', src: boss, prompt: `${C(boss)}: you may take an ${kindLabel} from the Room deck or discard pile.`, opts, info: { zone: 'roomDeckOrDiscard' } });
          if (a === ASKED) return WAIT;
          BF.shuffle(s, s.roomDeck); // RB p23 Search
          if (a === 'none') return;
          BF.removeFromZones(s, a);
          s.players[st.seat].hand.push(a);
          BF.log(s, `${P(st.seat)} takes ${C(a)}.`);
          st.got = a;
        }
        const slots = BF.buildSlots(s, st.seat, st.got);
        if (!slots.length) return; // FAQ: with no matching Room you keep it in hand
        const opts = slots.map((at) => ({ v: at, label: `Build over ${C(at)}`, iid: at }));
        opts.push({ v: 'keep', label: 'Keep it in hand' });
        const b = BF.ask(s, st, 'build', { who: st.seat, kind: 'build', src: boss, prompt: `${C(boss)}: you may build ${C(st.got)} now, over a Room with a matching treasure.`, opts });
        if (b === ASKED) return WAIT;
        if (b === 'keep') return;
        BF.buildRoom(s, st.seat, st.got, b, false);
        BF.log(s, `${P(st.seat)} builds ${C(st.got)} over ${C(b)}.`, { built: st.got });
        BF.afterBuilt(s, st.seat, st.got);
      },
    },
  });

  const destroySelf = { k: 'destroySelf' };
  const destroyOther = { k: 'destroyOther' };

  BF.ABILITIES = {
    // ------------------------------------------------------------------ Bosses (Level Up)
    BMR001: {
      own: 'Level Up: look at one opponent’s hand and take a card from it.',
      levelUp(s, seat) {
        next(s, ab('BMR001', 'go', { seat }));
      },
      steps: {
        go(s, st) {
          const boss = s.players[st.seat].boss;
          const o = askOpponent(s, st, boss, `${C(boss)}: choose an opponent to reveal their hand.`, (x) => `${P(x)} (${s.players[x].hand.length} cards)`);
          if (o === ASKED) return WAIT;
          const hand = s.players[o].hand;
          if (!hand.length) return BF.log(s, `${P(o)}'s hand is empty.`);
          if (!st.shown) {
            st.shown = true;
            BF.log(s, `${P(o)} reveals: ${hand.map(C).join(', ')}.`, { revealed: [...hand] });
          }
          const a = BF.ask(s, st, 'take', {
            who: st.seat,
            kind: 'take',
            src: boss,
            prompt: `${C(boss)}: ${P(o)} reveals their hand. Take one card.`,
            opts: hand.map((iid) => ({ v: iid, label: C(iid), iid })),
            info: { zone: 'hand', seat: o },
          });
          if (a === ASKED) return WAIT;
          BF.removeFromZones(s, a);
          s.players[st.seat].hand.push(a);
          BF.log(s, `${P(st.seat)} takes ${C(a)} from ${P(o)}.`);
        },
      },
    },
    BMR002: {
      own: 'Level Up: take two cards from the discard pile.',
      levelUp(s, seat) {
        const boss = s.players[seat].boss;
        next(s, { k: 'take', seat, from: 'discard', filter: 'any', n: 2, why: boss, prompt: `${C(boss)}: choose a card from the discard pile to put into your hand.` });
      },
    },
    BMR003: { own: 'Level Up: you may take an Advanced Monster Room from the Room deck or discard pile and may build it at once.', ...searchAndBuild('BMR003', 'advMonster', 'Advanced Monster Room') },
    BMR004: {
      own: 'Level Up: every opponent destroys one Room of their choice in their own dungeon.',
      levelUp(s, seat) {
        next(s, ...BF.turnOrder(s).filter((o) => o !== seat).map((o) => ab('BMR004', 'go', { seat: o, by: s.players[seat].boss })));
      },
      steps: {
        go(s, st) {
          const p = s.players[st.seat];
          const rooms = BF.activeSlots(s, st.seat).map((slot) => BF.topOf(p, slot));
          if (!rooms.length) return;
          const a = BF.ask(s, st, 'r', {
            who: st.seat,
            kind: 'destroy',
            src: st.by,
            prompt: `${C(st.by)} levelled up: choose one Room in your dungeon to destroy.`,
            opts: rooms.map((r) => ({ v: r, label: `Destroy ${C(r)}`, iid: r })),
          });
          if (a === ASKED) return WAIT;
          BF.destroyRoom(s, a); // FAQ Robobo: no "destroy this Room" ability triggers
        },
      },
    },
    BMR005: {
      own: 'Level Up: you may draw three Spells, then discard a Spell.',
      levelUp(s, seat) {
        next(s, ab('BMR005', 'go', { seat }));
      },
      steps: {
        go(s, st) {
          const boss = s.players[st.seat].boss;
          const a = BF.ask(s, st, 'may', {
            who: st.seat,
            kind: 'may',
            src: boss,
            prompt: `${C(boss)}: you may draw three Spell cards, then discard a Spell card.`,
            opts: [
              { v: true, label: 'Draw three Spells, then discard one' },
              { v: false, label: 'Decline' },
            ],
          });
          if (a === ASKED) return WAIT;
          if (!a) return;
          next(s, { k: 'draw', seat: st.seat, type: 'spell', n: 3, why: boss }, { k: 'discardChoice', seat: st.seat, filter: 'spell', n: 1, why: boss, prompt: `${C(boss)}: discard a Spell card.` });
        },
      },
    },
    BMR006: {
      own: 'Level Up: you may take any Hero from town or the Hero deck and put it at your dungeon entrance.',
      levelUp(s, seat) {
        next(s, ab('BMR006', 'go', { seat }));
      },
      steps: {
        go(s, st) {
          const boss = s.players[st.seat].boss;
          const pool = [...s.town, ...s.heroDeck];
          if (!pool.length) return BF.log(s, `${C(boss)}: no Heroes remain (FAQ Seducia).`);
          const opts = pool.map((h) => ({ v: h, label: `${C(h)} (${s.town.includes(h) ? 'town' : 'Hero deck'})`, iid: h }));
          opts.push({ v: 'none', label: 'Do not search' });
          const a = BF.ask(s, st, 'h', { who: st.seat, kind: 'take', src: boss, prompt: `${C(boss)}: you may put any Hero from town or the Hero deck at your entrance.`, opts, info: { zone: 'heroes' } });
          if (a === ASKED) return WAIT;
          if (a !== 'none') {
            const fromDeck = s.heroDeck.includes(a);
            BF.sendToEntrance(s, st.seat, a);
            BF.log(s, `${P(st.seat)} puts ${C(a)} at their entrance.`);
            if (!fromDeck) return;
          }
          // RULING R9: reshuffle the ordinary and Epic parts separately.
          const ord = s.heroDeck.filter((h) => !BF.defOf(s, h).epic);
          const epic = s.heroDeck.filter((h) => BF.defOf(s, h).epic);
          s.heroDeck = [...BF.shuffle(s, epic), ...BF.shuffle(s, ord)];
        },
      },
    },
    BMR007: { own: 'Level Up: you may take an Advanced Trap Room from the Room deck or discard pile and may build it at once.', ...searchAndBuild('BMR007', 'advTrap', 'Advanced Trap Room') },
    BMR008: {
      own: 'Level Up: choose a Hero in town; it dies and becomes one of your Souls.',
      levelUp(s, seat) {
        next(s, ab('BMR008', 'go', { seat }));
      },
      steps: {
        go(s, st) {
          const boss = s.players[st.seat].boss;
          if (!s.town.length) return BF.log(s, `${C(boss)}: there is no Hero in town (FAQ Gorgona).`);
          const a = BF.ask(s, st, 'h', { who: st.seat, kind: 'target', src: boss, prompt: `${C(boss)}: choose a Hero in town to turn to stone.`, opts: s.town.map((h) => ({ v: h, label: C(h), iid: h })) });
          if (a === ASKED) return WAIT;
          BF.killHero(s, st.seat, a, null);
        },
      },
    },

    // ------------------------------------------------------------------ Rooms
    BMR009: {
      own: 'Destroy this Room: take any card from the discard pile.',
      acts: {
        altar: {
          verb: 'Destroy',
          cost: destroySelf,
          effect(s, it) {
            next(s, { k: 'take', seat: it.seat, from: 'discard', filter: 'any', n: 1, why: it.src, prompt: `${C(it.src)}: choose a card from the discard pile.` });
          },
        },
      },
    },
    BMR010: {
      own: 'Once per turn, when a Hero dies here: take a Room card from the discard pile.',
      onDeath(s, seat, iid) {
        next(s, { k: 'take', seat, from: 'discard', filter: 'room', n: 1, why: iid, prompt: `${C(iid)}: choose a Room card from the discard pile.` });
      },
    },
    BMR011: {
      own: 'When built: an opponent you choose discards a random Spell.',
      onBuild(s, seat, iid) {
        next(s, ab('BMR011', 'go', { seat, iid }));
      },
      steps: {
        go(s, st) {
          const o = askOpponent(s, st, st.iid, `${C(st.iid)}: choose an opponent to discard a random Spell card.`, (x) => `${P(x)} (${s.players[x].hand.filter((h) => BF.FILTERS.spell(s, h)).length} Spells)`);
          if (o === ASKED) return WAIT;
          const card = randomFromHand(s, o, 'spell'); // RULING R13
          if (card == null) return BF.log(s, `${P(o)} has no Spell card.`);
          BF.discardCard(s, card);
          BF.log(s, `${P(o)} discards ${C(card)} at random.`);
        },
      },
    },
    BMR012: {
      own: 'Once per turn, when a Hero dies here: take a random Room or Spell (your pick of type) from an opponent’s hand.',
      onDeath(s, seat, iid) {
        next(s, ab('BMR012', 'go', { seat, iid }));
      },
      steps: {
        go(s, st) {
          const count = (o, f) => s.players[o].hand.filter((h) => BF.FILTERS[f](s, h)).length;
          const o = askOpponent(s, st, st.iid, `${C(st.iid)}: choose an opponent to take a card from.`, (x) => `${P(x)} (${count(x, 'room')} Rooms, ${count(x, 'spell')} Spells)`);
          if (o === ASKED) return WAIT;
          const types = ['room', 'spell'].filter((f) => count(o, f) > 0);
          if (!types.length) return BF.log(s, `${P(o)} has no cards.`);
          const t = BF.ask(s, st, 'type', {
            who: st.seat,
            kind: 'mode',
            src: st.iid,
            prompt: `${C(st.iid)}: take a random Room card or a random Spell card from ${P(o)}?`,
            opts: types.map((f) => ({ v: f, label: f === 'room' ? `A random Room (${count(o, 'room')})` : `A random Spell (${count(o, 'spell')})` })),
          });
          if (t === ASKED) return WAIT;
          const card = randomFromHand(s, o, t);
          BF.removeFromZones(s, card);
          s.players[st.seat].hand.push(card);
          BF.log(s, `${P(st.seat)} takes a random ${t === 'room' ? 'Room' : 'Spell'} card from ${P(o)}.`);
        },
      },
    },
    BMR013: {
      own: 'Once per turn: discard two Room cards to take a Room card from the discard pile.',
      acts: {
        lair: {
          verb: 'Use',
          once: true,
          cost: { k: 'discard', filter: 'room', n: 2, label: 'Room cards' },
          effect(s, it) {
            next(s, { k: 'take', seat: it.seat, from: 'discard', filter: 'room', n: 1, why: it.src, prompt: `${C(it.src)}: choose a Room card from the discard pile.` });
          },
        },
      },
    },
    BMR014: {
      own: 'Once per turn, when a Hero dies here: you may heal one Wound.',
      onDeath(s, seat, iid) {
        next(s, { k: 'heal', seat, optional: true, why: iid });
      },
    },
    BMR015: { own: 'Monster Rooms next to this one deal +1 damage.', passive: true },
    BMR016: {
      own: 'Once per turn, when a Hero dies here: draw a Room card.',
      onDeath(s, seat, iid) {
        next(s, { k: 'draw', seat, type: 'room', why: iid });
      },
    },
    BMR017: { own: 'The first time a Hero enters, it is sent back to the previous Room.', passive: true },
    BMR018: { own: 'Advanced Rooms cannot be built on this Room.', passive: true },
    BMR019: { own: 'Once per turn, when you build another Monster Room, draw a Room card.', passive: true },
    BMR020: { own: 'Damage equals the number of Monster Rooms in your dungeon.', passive: true },
    BMR021: {
      own: 'Once per turn, when a Hero dies here: you may draw a Spell card.',
      onDeath(s, seat, iid) {
        next(s, { k: 'mayDraw', seat, type: 'spell', n: 1, why: iid });
      },
    },
    BMR022: {
      own: 'When built: draw two Spells, then discard a Spell.',
      onBuild(s, seat, iid) {
        next(s, { k: 'draw', seat, type: 'spell', n: 2, why: iid }, { k: 'discardChoice', seat, filter: 'spell', n: 1, why: iid, prompt: `${C(iid)}: discard a Spell card.` });
      },
    },
    BMR023: { own: 'At the start of your turn you may draw from the Spell deck instead of the Room deck.', passive: true },
    BMR024: {
      own: 'Once per turn: discard a Monster Room card to draw a Spell.',
      acts: {
        kitchen: {
          verb: 'Use',
          once: true,
          cost: { k: 'discard', filter: 'monsterRoom', n: 1, label: 'Monster Room card' },
          effect(s, it) {
            next(s, { k: 'draw', seat: it.seat, type: 'spell', why: it.src });
          },
        },
      },
    },
    BMR025: {
      own: 'Once per turn, when an opponent plays a Spell: discard a Spell to cancel it.',
      acts: {
        eye: {
          verb: 'Cancel with',
          once: true,
          cost: { k: 'discard', filter: 'spell', n: 1, label: 'Spell card' },
          targets: [{ k: 'stackSpell', opp: true, as: 'sid', prompt: 'the opponent’s Spell to cancel.' }],
          effect(s, it) {
            cancel(s, it.t.sid);
          },
        },
      },
    },
    BMR026: { own: 'Once per turn, when you play a Spell: draw a Spell card.', passive: true },
    BMR027: {
      own: 'Destroy this Room: kill a Hero in this Room.',
      acts: {
        pit: {
          verb: 'Destroy',
          cost: destroySelf,
          targets: [{ k: 'heroInThisRoom', as: 'hero', prompt: 'the Hero in this Room to kill.' }],
          valid: (s, it) => s.adv?.hero === it.t.hero,
          effect(s, it) {
            BF.killHero(s, it.seat, it.t.hero, null); // FAQ Bottomless Pit: the uncovered Room gets no death trigger
          },
        },
      },
    },
    BMR028: {
      own: 'Destroy another Room in your dungeon: deal 5 damage to a Hero in this Room.',
      acts: {
        ramp: {
          verb: 'Use',
          cost: destroyOther,
          targets: [{ k: 'heroInThisRoom', as: 'hero', prompt: 'the Hero in this Room.' }],
          valid: (s, it) => s.adv?.hero === it.t.hero,
          effect(s, it) {
            s.cards[it.t.hero].dmg += 5;
            BF.log(s, `${C(it.t.hero)} takes 5 damage (${BF.heroLeft(s, it.t.hero)} Health left).`, { damage: 5, hero: it.t.hero });
          },
        },
      },
    },
    BMR029: { own: 'If the next Room is a Trap Room, it deals +2 damage.', passive: true },
    BMR030: {
      own: 'Destroy this Room: until end of turn your Rooms’ treasure is doubled.',
      acts: {
        stash: {
          verb: 'Destroy',
          cost: destroySelf,
          effect(s, it) {
            s.eot.dbl[it.seat] = true;
          },
        },
      },
    },
    BMR031: { own: 'When another Room in your dungeon is destroyed, you may draw two Room cards.', passive: true },
    BMR032: {
      own: 'Once per turn: destroy another Room in your dungeon to give your other Rooms +2 damage until end of turn.',
      acts: {
        crush: {
          verb: 'Use',
          once: true,
          cost: destroyOther,
          effect(s, it) {
            s.eot.crush.push({ seat: it.seat, src: it.src });
          },
        },
      },
    },
    BMR033: {
      own: 'When built: you may swap two Rooms (with their stacks) in any one dungeon.',
      onBuild(s, seat, iid) {
        next(s, ab('BMR033', 'go', { seat, iid }));
      },
      steps: {
        go(s, st) {
          const dungeons = s.players.filter((p) => p.dungeon.length >= 2);
          if (!dungeons.length) return;
          const d = BF.ask(s, st, 'd', {
            who: st.seat,
            kind: 'may',
            src: st.iid,
            prompt: `${C(st.iid)}: you may swap the placement of two Rooms in one dungeon.`,
            opts: [...dungeons.map((p) => ({ v: p.seat, label: `Swap in ${P(p.seat)}'s dungeon`, seat: p.seat })), { v: 'no', label: 'Do not swap' }],
          });
          if (d === ASKED) return WAIT;
          if (d === 'no') return;
          const p = s.players[d];
          const slotOpts = (skip) =>
            p.dungeon.map((stack, i) => ({ v: i, label: BF.isFaceDown(s, stack[stack.length - 1]) ? `Slot ${i + 1} (face-down)` : C(stack[stack.length - 1]), iid: stack[stack.length - 1] })).filter((o) => o.v !== skip);
          const a = BF.ask(s, st, 'a', { who: st.seat, kind: 'target', src: st.iid, prompt: `${C(st.iid)}: choose the first Room to move.`, opts: slotOpts(-1) });
          if (a === ASKED) return WAIT;
          const b = BF.ask(s, st, 'b', { who: st.seat, kind: 'target', src: st.iid, prompt: `${C(st.iid)}: choose the Room to swap it with.`, opts: slotOpts(a) });
          if (b === ASKED) return WAIT;
          [p.dungeon[a], p.dungeon[b]] = [p.dungeon[b], p.dungeon[a]]; // FAQ Centipede Tunnel: stacks move together
          BF.log(s, `${P(st.seat)} swaps two Rooms in ${P(d)}'s dungeon.`);
        },
      },
    },
    BMR034: {
      own: 'When built: you may build one more Room at once.',
      onBuild(s, seat, iid) {
        next(s, ab('BMR034', 'go', { seat, iid }));
      },
      steps: {
        go(s, st) {
          const p = s.players[st.seat];
          const opts = [];
          for (const c of p.hand) {
            for (const at of BF.buildSlots(s, st.seat, c)) {
              opts.push({ v: { place: c, at }, label: at === 'new' ? `Build ${C(c)} at the entrance` : `Build ${C(c)} over ${C(at)}`, iid: c, at });
            }
          }
          if (!opts.length) return; // nothing could be built (no Room, or Kobold Strike)
          opts.push({ v: 'no', label: 'Do not build' });
          const a = BF.ask(s, st, 'b', { who: st.seat, kind: 'place', src: st.iid, prompt: `${C(st.iid)}: you may build an additional Room right now.`, opts });
          if (a === ASKED) return WAIT;
          if (a === 'no') return;
          BF.buildRoom(s, st.seat, a.place, a.at, false); // FAQ Construction Zone: built face-up after the reveal
          BF.log(s, `${P(st.seat)} builds ${C(a.place)}${a.at === 'new' ? ' at the entrance' : ` over ${C(a.at)}`}.`, { built: a.place });
          BF.afterBuilt(s, st.seat, a.place);
          BF.checkLevelUp(s, st.seat);
        },
      },
    },
    BMR035: { own: 'This Room has all four treasure types.', passive: true },
    BMR036: {
      own: 'When built: put an ordinary Hero from town at your entrance.',
      onBuild(s, seat, iid) {
        next(s, ab('BMR036', 'go', { seat, iid }));
      },
      steps: {
        go(s, st) {
          const pool = s.town.filter((h) => !BF.defOf(s, h).epic);
          if (!pool.length) return; // FAQ Mimic Vault: mandatory only when a Hero is in town
          const a = BF.ask(s, st, 'h', { who: st.seat, kind: 'target', src: st.iid, prompt: `${C(st.iid)}: choose an ordinary Hero in town to place at your entrance.`, opts: pool.map((h) => ({ v: h, label: C(h), iid: h })) });
          if (a === ASKED) return WAIT;
          BF.sendToEntrance(s, st.seat, a);
          BF.log(s, `${C(a)} is moved to ${P(st.seat)}'s entrance.`);
        },
      },
    },
    BMR037: {
      own: 'When built: take a Monster Room card from the discard pile.',
      onBuild(s, seat, iid) {
        next(s, { k: 'take', seat, from: 'discard', filter: 'monsterRoom', n: 1, why: iid, prompt: `${C(iid)}: choose a Monster Room card from the discard pile.` });
      },
    },
    BMR038: {
      own: 'Destroy this Room: an opponent you choose discards a random Room card.',
      acts: {
        torture: {
          verb: 'Destroy',
          cost: destroySelf,
          targets: [{ k: 'opponent', as: 'opp', prompt: 'the opponent who discards a random Room card.' }],
          effect(s, it) {
            const card = randomFromHand(s, it.t.opp, 'room'); // RULING R13
            if (card == null) return BF.log(s, `${P(it.t.opp)} has no Room card.`);
            BF.discardCard(s, card);
            BF.log(s, `${P(it.t.opp)} discards ${C(card)} at random.`);
          },
        },
      },
    },
    BMR039: {
      own: 'Destroy this Room: a Soul in an opponent’s scorekeeping area returns to that opponent’s entrance.',
      acts: {
        prison: {
          verb: 'Destroy',
          cost: destroySelf,
          targets: [{ k: 'oppDeadHero', as: 'hero', prompt: 'a dead Hero in an opponent’s scorekeeping area.' }],
          valid: (s, it) => ownerOfSoul(s, it.t.hero) != null,
          effect(s, it) {
            const o = ownerOfSoul(s, it.t.hero);
            BF.sendToEntrance(s, o, it.t.hero);
            BF.log(s, `${C(it.t.hero)} returns to ${P(o)}'s entrance.`);
          },
        },
      },
    },

    // ------------------------------------------------------------------ Spells
    BMR040: {
      own: 'Adventure: a Trap Room gets +3 damage until end of turn.',
      spell: {
        targets: [{ k: 'room', sub: 'trap', as: 'room', prompt: 'a Trap Room to get +3 damage.' }],
        valid: (s, it) => BF.roomIsActive(s, it.t.room),
        effect(s, it) {
          s.eot.roomDmg[it.t.room] = (s.eot.roomDmg[it.t.room] || 0) + 3;
        },
      },
    },
    BMR041: {
      own: 'Adventure: a Hero in an opponent’s dungeon gets +3 Health until end of turn.',
      spell: {
        targets: [{ k: 'heroInOppDungeon', as: 'hero', prompt: 'a Hero in an opponent’s dungeon.' }],
        valid: (s, it) => BF.heroStillIn(s, it.t.hero, 'any'),
        effect(s, it) {
          s.eot.heroHp[it.t.hero] = (s.eot.heroHp[it.t.hero] || 0) + 3;
        },
      },
    },
    BMR042: {
      own: 'Adventure: destroy a Room in your dungeon and kill any Hero in it.',
      spell: {
        targets: [{ k: 'room', own: true, as: 'room', prompt: 'a Room in your dungeon to destroy.' }],
        valid: (s, it) => BF.roomIsActive(s, it.t.room),
        effect(s, it) {
          const a = BF.heroInRoom(s);
          const victim = a && a.seat === it.seat && !a.left && BF.topOf(s.players[it.seat], a.pos) === it.t.room ? a.hero : null;
          BF.destroyRoom(s, it.t.room); // FAQ Cave-In: no "destroy this Room" effect
          if (victim != null) BF.killHero(s, it.seat, victim, null);
        },
      },
    },
    BMR043: {
      own: 'Build or Adventure: cancel a Spell that was just played.',
      spell: {
        targets: [{ k: 'stackSpell', as: 'sid', prompt: 'the Spell to cancel.' }],
        valid: (s, it) => s.stack.some((x) => x.sid === it.t.sid),
        effect(s, it) {
          cancel(s, it.t.sid);
        },
      },
    },
    BMR044: {
      own: 'Adventure: deal damage equal to your number of Rooms to a Hero in your dungeon.',
      spell: {
        targets: [{ k: 'heroInMyDungeon', as: 'hero', prompt: 'a Hero in your dungeon.' }],
        valid: (s, it) => BF.heroStillIn(s, it.t.hero, 'mine', it.seat),
        effect(s, it) {
          const x = BF.roomCount(s, it.seat);
          s.cards[it.t.hero].dmg += x;
          BF.log(s, `${C(it.t.hero)} takes ${x} damage (${BF.heroLeft(s, it.t.hero)} Health left).`, { damage: x, hero: it.t.hero });
        },
      },
    },
    BMR045: {
      own: 'Adventure: send a Hero in any dungeon back to town.',
      spell: {
        targets: [{ k: 'heroInAnyDungeon', as: 'hero', prompt: 'a Hero in a dungeon to send back to town.' }],
        valid: (s, it) => BF.heroStillIn(s, it.t.hero, 'any'),
        effect(s, it) {
          BF.sendToTown(s, it.t.hero);
          BF.log(s, `${C(it.t.hero)} flees back to town.`);
        },
      },
    },
    BMR046: {
      own: 'Build or Adventure: deactivate a Room in any dungeon until end of turn.',
      spell: {
        targets: [{ k: 'room', as: 'room', prompt: 'a Room to deactivate until end of turn.' }],
        valid: (s, it) => BF.roomIsActive(s, it.t.room),
        effect(s, it) {
          s.eot.deact[it.t.room] = true;
        },
      },
    },
    BMR047: {
      own: 'Adventure: a Monster Room gets +3 damage until end of turn.',
      spell: {
        targets: [{ k: 'room', sub: 'monster', as: 'room', prompt: 'a Monster Room to get +3 damage.' }],
        valid: (s, it) => BF.roomIsActive(s, it.t.room),
        effect(s, it) {
          s.eot.roomDmg[it.t.room] = (s.eot.roomDmg[it.t.room] || 0) + 3;
        },
      },
    },
    BMR048: {
      own: 'Build or Adventure: every player discards their hand, then draws one Spell and two Rooms.',
      spell: {
        effect(s) {
          for (const seat of BF.turnOrder(s)) {
            for (const iid of [...s.players[seat].hand]) BF.discardCard(s, iid);
            BF.draw(s, seat, 'spell');
            BF.draw(s, seat, 'room');
            BF.draw(s, seat, 'room');
          }
          BF.log(s, 'Every Boss discards their hand and draws one Spell and two Rooms.');
        },
      },
    },
    BMR049: {
      own: 'Build: no Rooms can be built this turn; face-down Rooms return to their owners’ hands.',
      spell: {
        effect(s) {
          s.eot.noBuild = true;
          for (const p of s.players) {
            for (const iid of p.revealQ) {
              if (!s.fd[iid]) continue;
              const at = BF.findRoom(s, iid);
              p.dungeon[at.slot].pop();
              if (!p.dungeon[at.slot].length) p.dungeon.splice(at.slot, 1);
              delete s.fd[iid];
              p.hand.push(iid);
            }
            p.revealQ = p.revealQ.filter((iid) => s.fd[iid]);
          }
          BF.log(s, 'No Rooms can be built this turn; face-down Rooms go back to their owners’ hands.');
        },
      },
    },
    BMR050: {
      own: 'Build: if you have fewer Rooms than an opponent, you may build an extra Room this turn.',
      spell: {
        can: (s, seat) => BF.opponents(s, seat).some((o) => BF.roomCount(s, o) > BF.roomCount(s, seat)),
        effect(s, it) {
          s.eot.extra[it.seat] = (s.eot.extra[it.seat] || 0) + 1; // RULING R10
        },
      },
    },
    BMR051: {
      own: 'Build: put a Hero from town at your entrance.',
      spell: {
        targets: [{ k: 'townHero', as: 'hero', prompt: 'a Hero in town to place at your entrance.' }],
        valid: (s, it) => s.town.includes(it.t.hero), // FAQ Princess in Peril
        effect(s, it) {
          BF.sendToEntrance(s, it.seat, it.t.hero);
          BF.log(s, `${C(it.t.hero)} is moved to ${P(it.seat)}'s entrance.`);
        },
      },
    },
    BMR052: {
      own: 'Build or Adventure: remove one of your Souls from the game to draw two Spells.',
      spell: {
        targets: [{ k: 'mySoul', as: 'hero', prompt: 'one of your Souls to remove from the game.' }],
        valid: (s, it) => s.players[it.seat].score.some((x) => x.iid === it.t.hero && !x.up),
        effect(s, it) {
          BF.removeFromZones(s, it.t.hero);
          s.removed.push(it.t.hero);
          BF.draw(s, it.seat, 'spell');
          BF.draw(s, it.seat, 'spell');
          BF.log(s, `${P(it.seat)} removes ${C(it.t.hero)} from the game and draws two Spells.`);
        },
      },
    },
    BMR053: {
      own: 'Adventure: a Hero in your dungeon goes back to the first Room and continues.',
      spell: {
        targets: [{ k: 'heroInMyDungeon', as: 'hero', prompt: 'a Hero in your dungeon.' }],
        valid: (s, it) => BF.heroStillIn(s, it.t.hero, 'mine', it.seat),
        effect(s) {
          s.adv.teleport = true; // RULING R7
        },
      },
    },
    BMR054: {
      own: 'Adventure: choose a player with at least two more Souls than you; no Hero enters their dungeon this turn.',
      spell: {
        targets: [{ k: 'opponent', soulsAhead: true, as: 'opp', prompt: 'a player with at least two more Souls than you.' }],
        effect(s, it) {
          s.eot.trepid[it.t.opp] = true;
        },
      },
    },
    BMR055: {
      own: 'Build: a Soul in an opponent’s scorekeeping area returns to that opponent’s entrance with +2 Health this turn.',
      spell: {
        targets: [{ k: 'oppDeadHero', as: 'hero', prompt: 'a dead Hero in an opponent’s scorekeeping area.' }],
        valid: (s, it) => ownerOfSoul(s, it.t.hero) != null,
        effect(s, it) {
          const o = ownerOfSoul(s, it.t.hero);
          BF.sendToEntrance(s, o, it.t.hero);
          s.eot.heroHp[it.t.hero] = (s.eot.heroHp[it.t.hero] || 0) + 2;
          BF.log(s, `${C(it.t.hero)} rises and returns to ${P(o)}'s entrance with +2 Health.`);
        },
      },
    },

    // ------------------------------------------------------------------ Heroes with rules text
    BMR080: { own: 'Lured to the Boss with the fewest Souls; a tie keeps it in town.', passive: true },
  };

  function cancel(s, sid) {
    const item = s.stack.find((x) => x.sid === sid);
    if (item) item.canceled = true;
  }

  function ownerOfSoul(s, hero) {
    const p = s.players.find((x) => x.score.some((e) => e.iid === hero && !e.up));
    return p ? p.seat : null;
  }
})();
