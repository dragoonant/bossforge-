// Draws the table from a state, and maps the pending question onto it. Every highlight is a filter
// over the open question's options: the UI cannot invent a rule (CLAUDE.md rule 2).
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const esc = ui.esc;

  /** Cards the board draws, so options naming them can be clicked in place. */
  const onBoard = (s, me, iid) => {
    if (s.players[me].hand.includes(iid) || s.town.includes(iid)) return true;
    if (s.adv && s.adv.hero === iid) return true;
    if (s.stack.some((x) => x.src === iid)) return true;
    for (const p of s.players) {
      if (p.boss === iid || p.entrance.includes(iid)) return true;
      if (p.dungeon.some((st) => st[st.length - 1] === iid && !s.fd[iid])) return true;
    }
    return false;
  };

  /**
   * How the pending question shows up on the board for viewer `me`:
   * actable cards (cast/use/select), targets, seat targets, buttons, or a modal of card faces.
   */
  ui.afford = (s, me, view) => {
    const a = { actable: new Map(), target: new Map(), seats: new Map(), buttons: [], modal: null, slotNew: null, selectable: new Set() };
    const q = s.pending;
    if (!q || q.who !== me) return a;
    const placing = q.opts.filter((o) => o.v && o.v.place != null);
    for (const o of q.opts) {
      const v = o.v;
      if (v && v.cast != null) a.actable.set(v.cast, o);
      else if (v && v.act != null) a.actable.set(v.act, o);
      else if (v && v.place != null) {
        a.selectable.add(v.place);
        if (view.sel === v.place) {
          if (v.at === 'new') a.slotNew = o;
          else a.target.set(v.at, o);
        }
      }
    }
    if (q.kind === 'window' || q.kind === 'place') {
      for (const o of q.opts) if (!o.v || (o.v.cast == null && o.v.act == null && o.v.place == null)) a.buttons.push(o);
      if (placing.length && view.sel != null && !a.selectable.has(view.sel)) view.sel = null;
      return a;
    }
    const cardOpts = q.opts.filter((o) => o.iid != null);
    const offBoard = cardOpts.some((o) => !onBoard(s, me, o.iid)) || ['take', 'heal'].includes(q.kind);
    if (offBoard) {
      a.modal = q.opts;
      return a;
    }
    for (const o of q.opts) {
      if (o.iid != null) a.target.set(o.iid, o);
      else if (o.seat != null) {
        a.seats.set(o.seat, o);
        a.buttons.push(o);
      } else a.buttons.push(o);
    }
    return a;
  };

  const roleFor = (aff, iid, view) => {
    const r = [];
    if (aff.actable.has(iid)) r.push('actable');
    if (aff.selectable.has(iid)) r.push(view.sel === iid ? 'selected' : 'actable');
    if (aff.target.has(iid)) r.push('target');
    return r;
  };

  const meters = (s, seat) => {
    const souls = BF.souls(s, seat);
    const wounds = BF.wounds(s, seat);
    return `<span class="meter souls" title="Souls: 10 ends the game">☠ ${souls}<small>/10</small></span><span class="meter wounds ${wounds >= 3 ? 'danger' : ''}" title="Wounds: 5 ends the game">♥ ${wounds}<small>/5</small></span><span class="meter net" title="Souls minus Wounds decides the winner (RB p19)">${BF.scoreOf(s, seat) >= 0 ? '+' : ''}${BF.scoreOf(s, seat)}</span>`;
  };

  /** One Boss's row: entrance → five Room slots → Boss → scorekeeping. */
  const row = (s, seat, me, aff, view) => {
    const p = s.players[seat];
    const mine = seat === me;
    const size = mine ? 'board' : 'small';
    const order = BF.turnOrder(s).indexOf(seat) + 1;
    const rooms = p.hand.filter((i) => BF.FILTERS.room(s, i)).length;
    const spells = p.hand.length - rooms;
    const status = [];
    if (s.phase === 'build' && p.placed) status.push(`placed ${p.placed} Room${p.placed > 1 ? 's' : ''} face-down`);
    if (p.leveled) status.push('levelled up');
    if (s.eot.trepid[seat]) status.push('Trepidation');
    const head = `<div class="phead">
      <span class="pname">${mine ? 'You' : esc(p.name)}</span>
      ${p.boss != null ? `<span class="pboss">${ui.cardRef(s, p.boss)}</span>` : ''}
      <span class="order" title="XP order: who builds and adventures first">#${order}</span>
      ${meters(s, seat)}
      ${mine ? '' : `<span class="hand-count" title="Cards in hand (Room and Spell backs differ, so the split is public)">🂠 ${rooms}R · ${spells}S</span>`}
      ${status.length ? `<span class="pstatus">${status.join(' · ')}</span>` : ''}
    </div>`;

    const entrance = p.entrance.map((h) => ui.cardFor(s, h, { size: 'mini', roles: roleFor(aff, h, view) })).join('');
    const adv = s.adv && s.adv.seat === seat ? s.adv : null;
    const doorHero = adv && adv.pos < 0 ? ui.cardFor(s, adv.hero, { size: 'mini', roles: ['walking', ...roleFor(aff, adv.hero, view)] }) : '';

    const slots = [];
    const empty = BF.MAX_ROOMS - p.dungeon.length;
    for (let i = 0; i < empty; i++) {
      const isNew = mine && aff.slotNew && i === empty - 1;
      slots.push(
        isNew
          ? `<div class="slot empty new-target" data-new="1"><span>Build here</span></div>`
          : `<div class="slot empty"></div>`,
      );
    }
    p.dungeon.forEach((stack, i) => {
      const iid = stack[stack.length - 1];
      const fd = !!s.fd[iid];
      const deact = !!s.eot.deact[iid];
      let walker = '';
      if (adv && adv.pos === i && !fd) walker = `<div class="walker">${ui.cardFor(s, adv.hero, { size: 'mini', roles: ['walking', ...roleFor(aff, adv.hero, view)] })}</div>`;
      const card = fd
        ? ui.card(mine ? iid : null, null, { back: true, size, roles: ['facedown'] }) + (mine ? `<span class="fd-peek">${ui.cardRef(s, iid)}</span>` : '')
        : ui.cardFor(s, iid, { size, seat, slot: i, covered: stack.length - 1, roles: [...roleFor(aff, iid, view), deact ? 'deactivated' : ''] });
      slots.push(`<div class="slot" data-slot="${i}" data-stack="${stack.join(',')}">${card}${walker}</div>`);
    });

    const boss = p.boss != null ? ui.cardFor(s, p.boss, { size, roles: [p.leveled ? 'leveled' : '', ...roleFor(aff, p.boss, view)] }) : ui.card(null, null, { back: true, size });
    const soulsN = p.score.filter((x) => !x.up).length;
    const woundsN = p.score.filter((x) => x.up).length;
    const score = `<button class="scorezone" data-browse="score" data-seat="${seat}" title="Scorekeeping area: Souls face-down, Wounds face-up. Click to look.">
        <span class="pile souls-pile">${soulsN ? ui.card(null, null, { back: true, size: 'mini' }) : '<span class="pile-empty"></span>'}<b>${soulsN}</b><em>Souls</em></span>
        <span class="pile wounds-pile">${woundsN ? ui.cardFor(s, p.score.filter((x) => x.up).pop().iid, { size: 'mini' }) : '<span class="pile-empty"></span>'}<b>${woundsN}</b><em>Wounds</em></span>
      </button>`;

    return `<section class="prow ${mine ? 'mine' : 'opp'} ${aff.seats.has(seat) ? 'seat-target' : ''} ${s.pending?.who === seat ? 'deciding' : ''}" data-seat="${seat}">
      ${head}
      <div class="lane">
        <div class="entrance" title="Dungeon entrance: Heroes wait here, then walk right toward the Boss">${doorHero}${entrance}<span class="zone-label">Entrance</span></div>
        <div class="slots">${slots.join('')}</div>
        <div class="bosszone">${boss}</div>
        ${score}
      </div>
    </section>`;
  };

  const middle = (s, me, aff, view) => {
    const town = s.town.map((h) => ui.cardFor(s, h, { size: 'small', roles: roleFor(aff, h, view) })).join('') || '<span class="zone-empty">No Heroes waiting</span>';
    const epics = s.heroDeck.filter((h) => BF.defOf(s, h).epic).length;
    const topDiscard = s.discard.length ? ui.cardFor(s, s.discard[s.discard.length - 1], { size: 'mini' }) : '<span class="pile-empty"></span>';
    const stack = s.stack.length
      ? `<div class="stackzone"><span class="zone-label">Resolving (last in, first out)</span>${[...s.stack]
          .reverse()
          .map((it) => `<div class="stack-item ${it.canceled ? 'canceled' : ''}">${ui.cardFor(s, it.src, { size: 'mini', roles: roleFor(aff, it.src, view) })}<span>${ui.rich(s, `[p:${it.seat}]`, me)}</span></div>`)
          .join('')}</div>`
      : '';
    return `<section class="middle">
      <div class="town"><span class="zone-label">Town (Heroes in arrival order)</span><div class="town-cards">${town}</div></div>
      ${stack}
      <div class="piles">
        <div class="pile deck" title="Hero deck: ordinary Heroes first, then Epic Heroes">${ui.card(null, null, { back: true, size: 'mini' })}<b>${s.heroDeck.length}</b><em>Heroes${epics ? ` (${epics} Epic)` : ''}</em></div>
        <div class="pile deck" title="Room deck">${ui.card(null, null, { back: true, size: 'mini' })}<b>${s.roomDeck.length}</b><em>Rooms</em></div>
        <div class="pile deck" title="Spell deck">${ui.card(null, null, { back: true, size: 'mini' })}<b>${s.spellDeck.length}</b><em>Spells</em></div>
        <button class="pile discard" data-browse="discard" title="Discard pile: click to look through it">${topDiscard}<b>${s.discard.length}</b><em>Discard</em></button>
      </div>
    </section>`;
  };

  const PHASE = { setup: 'Setup', beginning: 'Beginning of Turn', build: 'Build Phase', bait: 'Bait Phase', adventure: 'Adventure Phase', end: 'End of Turn', over: 'Game Over' };

  /** The whole match screen. */
  ui.renderBoard = (s, me, view) => {
    const aff = ui.afford(s, me, view);
    const opps = BF.turnOrder(s).filter((x) => x !== me);
    const q = s.pending;
    const myTurn = q && q.who === me;
    const prompt = q
      ? myTurn
        ? ui.rich(s, q.prompt, me) + (aff.selectable.size && view.sel == null ? ' <em>Pick a Room from your hand to place it.</em>' : '') + (view.sel != null ? ' <em>Now click a highlighted spot.</em>' : '')
        : `<span class="waiting">${esc(s.players[q.who].name)} is deciding…</span>`
      : '';
    const buttons = myTurn && !aff.modal ? aff.buttons.map((o, i) => `<button class="opt" data-opt="${i}">${ui.rich(s, o.label, me)}</button>`).join('') : '';
    const hand = s.players[me].hand
      .map((iid, i, arr) => {
        const roles = roleFor(aff, iid, view);
        const playable = roles.length > 0;
        return ui.cardFor(s, iid, { size: 'hand', roles: playable ? roles : ['idle'], extra: '' }).replace('class="card', `style="--z:${i + 10}" class="card`);
      })
      .join('');
    return {
      aff,
      html: `<div class="board ${myTurn ? 'my-turn' : ''}">
        <div class="opps n${opps.length}">${opps.map((seat) => row(s, seat, me, aff, view)).join('')}</div>
        ${middle(s, me, aff, view)}
        ${row(s, me, me, aff, view)}
        <div class="handbar"><div class="hand" style="--n:${Math.max(1, s.players[me].hand.length)}">${hand || '<span class="zone-empty">Your hand is empty</span>'}</div></div>
        <div class="turnbar">
          <span class="phase-pill">${s.turn ? `Turn ${s.turn} · ` : ''}${PHASE[s.phase] || s.phase}</span>
          <span class="prompt">${prompt}</span>
          <span class="buttons">${view.sel != null ? '<button class="opt ghost" data-unselect="1">Choose another card</button>' : ''}${buttons}</span>
          <button class="ghost icon" data-ui="drawer" title="Log and settings">☰</button>
        </div>
      </div>`,
    };
  };
})();
