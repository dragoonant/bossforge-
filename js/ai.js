// The AI Boss. It answers every question through BF.legalActions (never inventing a move) and reads
// only public information plus its own hand. Weights carry the reason they exist; a weight without
// a reason is not changed (LESSONS-DIGEST §3).
(function () {
  'use strict';
  const BF = globalThis.BF;

  const W = {
    lureKill: 4, // a Hero we will lure and can kill is a Soul next Adventure
    lureSurvive: -3, // a Hero we lure but cannot kill is a Wound: worse than luring nothing
    perRoom: 1.5, // every Room counts toward the Level Up at five
    levelUp: 3, // the Level Up itself is a one-off power spike
    leadType: 0.5, // leading a treasure type wins future Heroes of that type
  };

  const top = BF.topOf;
  const ai = (BF.ai = {});

  /** Value of a card in hand, used for discards and takes. */
  ai.cardValue = (s, iid) => {
    const d = BF.defOf(s, iid);
    if (d.kind === 'spell') return 3.5;
    if (d.kind === 'room') return (d.dmg ?? 2) + 0.8 * d.treasure.length + (BF.ABILITIES[d.id]?.passive ? 0.3 : 0.6) - (d.adv ? 0.5 : 0);
    if (d.kind === 'hero') return d.health;
    return 0;
  };

  /** Damage a Hero would still take from slot `from` onward in `seat`'s dungeon. */
  ai.remaining = (s, seat, from) => {
    let n = 0;
    for (const slot of BF.activeSlots(s, seat)) if (slot >= from) n += BF.roomDamage(s, seat, slot);
    return n;
  };

  /** How good `seat`'s dungeon is right now (higher is better). */
  ai.evaluate = (s, seat) => {
    const dmg = ai.remaining(s, seat, 0);
    const rooms = BF.roomCount(s, seat);
    let score = dmg + W.perRoom * Math.min(rooms, BF.MAX_ROOMS);
    if (rooms >= BF.MAX_ROOMS && !s.players[seat].leveled) score += W.levelUp;
    const others = BF.opponents(s, seat);
    for (const h of s.town) {
      const d = BF.defOf(s, h);
      if (d.id === 'BMR080') continue;
      const t = d.treasure[0];
      const mine = BF.treasureOf(s, seat, t);
      if (mine > 0 && others.every((o) => BF.treasureOf(s, o, t) < mine)) {
        score += dmg >= BF.heroLeft(s, h) ? W.lureKill * BF.heroValue(s, h) : W.lureSurvive * BF.heroValue(s, h);
      }
    }
    for (const t of BF.TREASURES) {
      const mine = BF.treasureOf(s, seat, t);
      if (mine > 0 && others.every((o) => BF.treasureOf(s, o, t) < mine)) score += W.leadType;
    }
    return score;
  };

  /** Score of a dungeon after building `iid` at `at`, face-up, on a scratch copy. */
  ai.scoreBuild = (s, seat, iid, at) => {
    const t = BF.clone(s);
    BF.buildRoom(t, seat, iid, at, false);
    return ai.evaluate(t, seat);
  };

  const bestPlace = (s, seat, opts) => {
    let best = null;
    for (const o of opts) {
      if (!o.v || o.v.place == null) continue;
      const v = ai.scoreBuild(s, seat, o.v.place, o.v.at) - (o.v.at === 'new' ? 0 : 0.2 * ai.cardValue(s, o.v.at));
      if (!best || v > best.v) best = { o, v };
    }
    return best;
  };

  const pick = (s, v) => ({ type: 'choose', v });
  const find = (opts, f) => opts.find(f);
  const lowest = (s, opts, f = (o) => ai.cardValue(s, o.v)) => opts.reduce((a, b) => (f(b) < f(a) ? b : a));
  const highest = (s, opts, f = (o) => ai.cardValue(s, o.v)) => opts.reduce((a, b) => (f(b) > f(a) ? b : a));
  const leader = (s, seats) => seats.reduce((a, b) => (BF.scoreOf(s, b) > BF.scoreOf(s, a) ? b : a));

  ai.choose = (s, seat) => {
    const q = s.pending;
    if (!q || q.who !== seat) throw new Error('the AI was asked out of turn');
    const opts = q.opts;
    const a = decide(s, seat, q, opts);
    const chosen = a ?? opts[0].v;
    if (!opts.some((o) => BF.same(o.v, chosen))) throw new Error(`AI chose an illegal option for ${q.kind}`);
    return pick(s, chosen);
  };

  function decide(s, seat, q, opts) {
    switch (q.kind) {
      case 'boss':
        return highest(s, opts, (o) => BF.defOf(s, o.v).xp).v;
      case 'mulligan':
        return 'redraw';
      case 'discard':
      case 'cost': {
        if (q.kind === 'cost') return costRoom(s, seat, opts);
        return lowest(s, opts).v;
      }
      case 'place': {
        const best = bestPlace(s, seat, opts);
        const pass = find(opts, (o) => o.v === 'none' || o.v === 'no');
        if (!best) return pass?.v;
        return best.v >= ai.evaluate(s, seat) - 0.5 || !pass ? best.o.v : pass.v;
      }
      case 'build': {
        const keep = find(opts, (o) => o.v === 'keep');
        const cands = opts.filter((o) => o.v !== 'keep');
        const card = s.players[seat].hand.find((iid) => cands.length && BF.buildSlots(s, seat, iid).includes(cands[0].v));
        if (card == null) return keep?.v;
        const best = highest(s, cands, (o) => ai.scoreBuild(s, seat, card, o.v));
        return ai.scoreBuild(s, seat, card, best.v) >= ai.evaluate(s, seat) ? best.v : keep.v;
      }
      case 'order':
        return opts[0].v;
      case 'draw': {
        const rooms = s.players[seat].hand.filter((iid) => BF.FILTERS.room(s, iid)).length;
        return rooms >= 3 ? 'spell' : 'room';
      }
      case 'take': {
        const real = opts.filter((o) => o.v !== 'stop' && o.v !== 'none');
        if (!real.length) return opts[0].v;
        if (q.info?.zone === 'heroes') {
          // Seducia: the weakest Hero our dungeon can kill.
          const dmg = ai.remaining(s, seat, 0);
          const killable = real.filter((o) => BF.heroLeft(s, o.v) <= dmg);
          if (!killable.length) return find(opts, (o) => o.v === 'none')?.v ?? real[0].v;
          return highest(s, killable, (o) => BF.heroValue(s, o.v) * 10 - BF.heroLeft(s, o.v)).v;
        }
        return highest(s, real).v;
      }
      case 'opponent':
        return leader(s, opts.map((o) => o.v));
      case 'mode':
        return find(opts, (o) => o.v === 'spell')?.v ?? opts[0].v;
      case 'destroy':
        return lowest(s, opts).v;
      case 'heal':
        return highest(s, opts.filter((o) => o.v !== 'no'), (o) => BF.heroValue(s, o.v)).v;
      case 'may':
        if (opts.some((o) => o.v === true)) return true; // optional draws are always worth it
        return find(opts, (o) => o.v === 'no')?.v ?? opts[opts.length - 1].v; // Centipede Tunnel: do not swap
      case 'target':
        return target(s, seat, q, opts);
      case 'window':
        return windowChoice(s, seat, q, opts);
      default:
        return opts[0].v;
    }
  }

  /** Paying "destroy another Room": prefer a Room the Hero has already passed, then the weakest. */
  function costRoom(s, seat, opts) {
    const adv = BF.heroInRoom(s);
    const at = (iid) => BF.findRoom(s, iid);
    const behind = adv && adv.seat === seat ? opts.filter((o) => at(o.v).slot < adv.pos) : [];
    return lowest(s, behind.length ? behind : opts, (o) => BF.roomDamage(s, seat, at(o.v).slot)).v;
  }

  function target(s, seat, q, opts) {
    const id = BF.idOf(s, q.src);
    const adv = BF.heroInRoom(s);
    const slotOf = (iid) => BF.findRoom(s, iid)?.slot ?? -1;
    if ((id === 'BMR047' || id === 'BMR040') && adv && adv.seat === seat) {
      // Give the bonus to a Room still ahead of the Hero in our dungeon.
      const ahead = opts.filter((o) => BF.findRoom(s, o.v)?.seat === seat && slotOf(o.v) > adv.pos);
      if (ahead.length) return ahead[0].v;
    }
    if (id === 'BMR042' && adv) return find(opts, (o) => slotOf(o.v) === adv.pos)?.v ?? opts[0].v;
    if (id === 'BMR046') return highest(s, opts.filter((o) => BF.findRoom(s, o.v).seat !== seat), (o) => BF.roomDamage(s, BF.findRoom(s, o.v).seat, slotOf(o.v)))?.v ?? opts[0].v;
    if (id === 'BMR051') return hopefulHero(s, seat, opts) ?? opts[0].v;
    if (id === 'BMR054' || id === 'BMR038') return leader(s, opts.map((o) => o.v));
    return opts[0].v;
  }

  /** The Hero in `opts` our dungeon kills that is worth the most. */
  function hopefulHero(s, seat, opts) {
    const dmg = ai.remaining(s, seat, 0);
    const ok = opts.filter((o) => BF.heroLeft(s, o.v) <= dmg);
    return ok.length ? highest(s, ok, (o) => BF.heroValue(s, o.v)).v : null;
  }

  function windowChoice(s, seat, q, opts) {
    const passV = 'pass';
    const topItem = s.stack[s.stack.length - 1];
    if (topItem && topItem.seat === seat) return passV; // let our own effect resolve first
    const castOf = (id) => find(opts, (o) => o.v.cast != null && BF.idOf(s, o.v.cast) === id);
    const actOf = (id) => find(opts, (o) => o.v.act != null && BF.idOf(s, o.v.act) === id);

    // Respond to an opponent's Spell that hurts us.
    if (topItem && topItem.seat !== seat && topItem.kind === 'spell' && hurtsMe(s, seat, topItem)) {
      const c = castOf('BMR043') || actOf('BMR025');
      if (c) return c.v;
    }
    if (topItem) return passV;

    const adv = BF.heroInRoom(s);
    if (q.info?.ctx === 'room' && adv) {
      const left = BF.heroLeft(s, adv.hero);
      if (adv.seat === seat) {
        const ahead = ai.remaining(s, seat, adv.pos + 1);
        if (ahead >= left) return passV; // it dies anyway
        const value = BF.heroValue(s, adv.hero);
        const tries = [
          actOf('BMR027'),
          ahead + 5 >= left ? actOf('BMR028') : null,
          ahead + 3 >= left && hasAhead(s, seat, adv.pos, 'monster') ? castOf('BMR047') : null,
          ahead + 3 >= left && hasAhead(s, seat, adv.pos, 'trap') ? castOf('BMR040') : null,
          ahead + BF.roomCount(s, seat) >= left ? castOf('BMR044') : null,
          ahead + 2 * Math.max(0, BF.roomCount(s, seat) - 2) >= left && BF.roomCount(s, seat) >= 3 ? actOf('BMR032') : null,
          ahead + ai.remaining(s, seat, 0) >= left ? castOf('BMR053') : null,
          value > 1 || BF.wounds(s, seat) >= 2 ? castOf('BMR042') : null,
          castOf('BMR045'), // no kill in reach: send it home rather than take the Wound
        ].filter(Boolean);
        if (tries.length) return tries[0].v;
      } else {
        const ahead = ai.remaining(s, adv.seat, adv.pos + 1);
        if (ahead >= left) {
          if (ahead < left + 3 && castOf('BMR041')) return castOf('BMR041').v; // Assassin turns their Soul into their Wound
          if (adv.seat === leader(s, BF.opponents(s, seat)) && castOf('BMR045')) return castOf('BMR045').v;
        }
      }
      return passV;
    }

    if (q.info?.ctx === 'build') {
      const placing = opts.filter((o) => o.v.place != null);
      const p = s.players[seat];
      // Before placing: spells that make the build turn better.
      const mot = castOf('BMR050');
      if (mot && placing.length && p.placed === 0 && p.hand.filter((iid) => BF.FILTERS.room(s, iid)).length >= 2) return mot.v;
      const princess = castOf('BMR051');
      if (princess && hopefulHero(s, seat, s.town.map((h) => ({ v: h }))) != null) return princess.v;
      const kitchen = actOf('BMR024');
      if (kitchen && p.hand.filter((iid) => BF.FILTERS.room(s, iid)).length >= 3) return kitchen.v;
      const zombie = castOf('BMR055');
      if (zombie) {
        const lead = leader(s, BF.opponents(s, seat));
        const theirs = s.players[lead].score.filter((x) => !x.up);
        if (theirs.some((x) => BF.heroHealth(s, x.iid) + 2 > ai.remaining(s, lead, 0))) return zombie.v;
      }
      if (placing.length) {
        const best = bestPlace(s, seat, placing);
        if (best && (best.v >= ai.evaluate(s, seat) - 0.5 || p.placed === 0)) return best.o.v;
      }
    }
    return passV;
  }

  function hasAhead(s, seat, pos, sub) {
    const p = s.players[seat];
    return BF.activeSlots(s, seat).some((slot) => slot > pos && BF.defOf(s, top(p, slot)).sub === sub);
  }

  /** Whether an opponent's Spell on the stack works against us. */
  function hurtsMe(s, seat, item) {
    const id = BF.idOf(s, item.src);
    const adv = BF.heroInRoom(s);
    const t = item.t || {};
    if (t.room != null && BF.findRoom(s, t.room)?.seat === seat) return true; // Freeze, Cave-In on our Rooms
    if (t.hero != null && adv && adv.hero === t.hero && adv.seat === seat) return true; // Assassin, Fear on our Hero
    if (t.hero != null && s.players[seat].score.some((x) => x.iid === t.hero)) return true; // Zombie Attack on our Soul
    if (t.opp === seat) return true; // Trepidation
    return id === 'BMR049' || id === 'BMR048'; // Kobold Strike, Jeopardy
  }
})();
