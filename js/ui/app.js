// The app: title screen, the match loop (AI pacing, smart stops), clicks, modals, hover preview,
// the log drawer and the results panel. View state lives here and never enters the game state.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;
  const esc = ui.esc;
  const ME = 0;

  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(`bossforge:${k}`);
        return v == null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(`bossforge:${k}`, JSON.stringify(v));
      } catch {
        /* private mode: settings just do not persist */
      }
    },
  };

  const app = (ui.app = {
    s: null,
    view: { sel: null, drawer: false, peek: false, modal: null },
    settings: { speed: store.get('speed', 'normal'), stops: store.get('stops', 'smart'), name: store.get('name', '') },
    busy: false,
    aff: null,
  });

  const root = () => document.getElementById('app');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- title screen

  function title() {
    app.s = null;
    root().innerHTML = `<div class="title">
      <div class="title-inner">
        <h1 class="logo">BossForge</h1>
        <p class="tagline">Build the dungeon. Lure the heroes. Claim their souls.</p>
        <p class="sub">A browser reproduction of <b>Boss Monster</b> (Base Set), you against AI Bosses.</p>
        <div class="setup">
          <label>Your name <input id="name" maxlength="18" placeholder="Player" value="${esc(app.settings.name)}"></label>
          <div class="seg-label">AI Bosses
            <div class="seg" id="opps">${[1, 2, 3].map((n) => `<button data-n="${n}" class="${n === 1 ? 'on' : ''}">${n}</button>`).join('')}</div>
          </div>
          <label class="check"><input type="checkbox" id="classic"> Classic Mode (draw 5 Rooms + 2 Spells, then discard 2)</label>
        </div>
        <div class="title-buttons">
          <button class="big" id="start">Enter the Dungeon</button>
          <button class="ghost" id="howto">How to play</button>
        </div>
        <p class="notice">Unofficial, non-commercial fan project. Not affiliated with, endorsed or sponsored by Brotherwise Games, LLC.
          <i>Boss Monster</i> and its card names and text belong to Brotherwise Games. No official art is used: card pictures are placeholder pixel sprites.
          Rules: <a href="https://brotherwisegames.com/bossmonster" target="_blank" rel="noopener">brotherwisegames.com/bossmonster</a>.</p>
      </div>
    </div>`;
    let n = 1;
    root().querySelectorAll('#opps button').forEach((b) =>
      b.addEventListener('click', () => {
        n = Number(b.dataset.n);
        root().querySelectorAll('#opps button').forEach((x) => x.classList.toggle('on', x === b));
      }),
    );
    document.getElementById('howto').addEventListener('click', howTo);
    document.getElementById('start').addEventListener('click', () => {
      const name = document.getElementById('name').value.trim() || 'Player';
      app.settings.name = name === 'Player' ? '' : name;
      store.set('name', app.settings.name);
      const ai = ['Lord of Gloom', 'The Rot King', 'Mistress Vex'];
      start({
        seed: Math.floor(Math.random() * 2 ** 31),
        classic: document.getElementById('classic').checked,
        players: [{ name, ai: false }, ...ai.slice(0, n).map((x) => ({ name: x, ai: true }))],
      });
    });
  }

  // ---------------------------------------------------------------- the match loop

  function start(cfg) {
    app.view = { sel: null, drawer: false, peek: false, modal: null };
    app.s = BF.newGame(cfg);
    render();
    loop();
  }

  /** Whether a priority window can pass for the human without asking (UI-level stop, never engine). */
  function autoPass(s) {
    const q = s.pending;
    if (q.kind !== 'window' || app.settings.stops === 'always') return false;
    const w = s.queue[0];
    const top = s.stack[s.stack.length - 1];
    if (top && top.seat !== ME) return false; // something to respond to
    if (top) return true; // our own effect on top: let it resolve
    if (w.ctx === 'build') return !(w.place && w.active === ME) && !w.final;
    const adv = s.adv;
    if (adv && adv.seat === ME) return false; // our dungeon
    // An opponent's Hero: stop only if we hold a Spell that can touch it.
    return !q.opts.some((o) => o.v.cast != null && ['BMR041', 'BMR045'].includes(BF.idOf(s, o.v.cast)));
  }

  async function step(action) {
    const prev = app.s;
    let next;
    try {
      next = BF.apply(prev, action);
    } catch (e) {
      if (e instanceof BF.RuleError) return toast(e.message);
      throw e;
    }
    app.busy = true;
    await ui.present(prev, next, ME, app.settings.speed);
    app.s = next;
    app.view.sel = null;
    app.view.peek = false;
    app.busy = false;
  }

  async function loop() {
    if (app.looping) return;
    app.looping = true;
    try {
      for (;;) {
        const s = app.s;
        if (!s || BF.isTerminal(s)) break;
        const who = BF.whoActs(s);
        if (s.players[who].ai) {
          render();
          await sleep(app.settings.speed === 'instant' ? 0 : app.settings.speed === 'fast' ? 120 : 420);
          if (app.s !== s) break;
          await step(BF.ai.choose(s, who));
          continue;
        }
        if (autoPass(s)) {
          await step({ type: 'choose', v: 'pass' });
          continue;
        }
        break;
      }
    } finally {
      app.looping = false;
    }
    render();
    if (app.s && BF.isTerminal(app.s)) results();
  }

  async function act(v) {
    if (app.busy || !app.s || app.s.pending?.who !== ME) return;
    await step({ type: 'choose', v });
    render();
    loop();
  }

  // ---------------------------------------------------------------- rendering

  app.render = () => render();
  function render() {
    const s = app.s;
    if (!s) return;
    const { aff, html } = ui.renderBoard(s, ME, app.view);
    app.aff = aff;
    const drawer = drawerHtml(s);
    const modal = aff.modal ? choiceModal(s, aff.modal) : '';
    root().innerHTML = `${html}${drawer}${modal}`;
  }

  function choiceModal(s, opts) {
    const q = s.pending;
    const cards = opts.filter((o) => o.iid != null);
    const btns = opts.filter((o) => o.iid == null);
    const src = q.src != null ? `<div class="modal-src">${ui.cardFor(s, q.src, { size: 'small' })}</div>` : '';
    return `<div class="choice ${app.view.peek ? 'peeked' : ''}">
      <div class="choice-panel">
        <div class="choice-head">${src}<p>${ui.rich(s, q.prompt, ME)}</p></div>
        <div class="choice-cards">${cards
          .map((o) => {
            const i = q.opts.indexOf(o);
            return `<div class="choice-card" data-opt="${i}">${ui.cardFor(s, o.iid, { size: 'hand', roles: ['target'] })}<span>${ui.rich(s, o.label, ME)}</span></div>`;
          })
          .join('')}</div>
        <div class="choice-buttons">${btns.map((o) => `<button class="opt" data-opt="${q.opts.indexOf(o)}">${ui.rich(s, o.label, ME)}</button>`).join('')}
          <button class="ghost" data-peek="1">Hide — check the board</button></div>
      </div>
      <button class="peek-pill" data-peek="1">Show the choice</button>
    </div>`;
  }

  function drawerHtml(s) {
    const lines = s.log
      .slice(-80)
      .reverse()
      .map((l) => (l.d.turnStart ? `<p class="log-turn">Turn ${l.d.turnStart}</p>` : `<p>${ui.rich(s, l.msg, ME)}</p>`))
      .join('');
    const opt = (k, v, label) => `<button class="${app.settings[k] === v ? 'on' : ''}" data-set="${k}" data-val="${v}">${label}</button>`;
    return `<aside class="drawer ${app.view.drawer ? 'open' : ''}">
      <div class="drawer-head">
        <b>Chronicle</b>
        <button class="ghost icon" data-ui="drawer">✕</button>
      </div>
      <div class="settings">
        <div>Speed <span class="seg">${opt('speed', 'normal', 'Normal')}${opt('speed', 'fast', 'Fast')}${opt('speed', 'instant', 'Instant')}</span></div>
        <div title="Smart: you are only asked when a Spell could matter (your build turn, Heroes in your dungeon, opponents' Spells). Always: every window.">Spell stops <span class="seg">${opt('stops', 'smart', 'Smart')}${opt('stops', 'always', 'Always')}</span></div>
        <div class="drawer-buttons"><button class="ghost" data-ui="howto">How to play</button><button class="ghost" data-ui="quit">New game</button></div>
        <div class="seed">Seed ${s.seed}</div>
      </div>
      <div class="log">${lines}</div>
    </aside>`;
  }

  function results() {
    const s = app.s;
    const w = s.result.winners[0];
    const rows = [...s.players]
      .sort((a, b) => BF.scoreOf(s, b.seat) - BF.scoreOf(s, a.seat))
      .map((p) => `<tr class="${p.seat === w ? 'win' : ''}"><td>${p.seat === ME ? 'You' : esc(p.name)}</td><td>${ui.cardRef(s, p.boss)}</td><td>☠ ${BF.souls(s, p.seat)}</td><td>♥ ${BF.wounds(s, p.seat)}</td><td>${BF.scoreOf(s, p.seat)}</td></tr>`)
      .join('');
    const div = document.createElement('div');
    div.className = 'overlay';
    div.innerHTML = `<div class="panel results"><h2>${w === ME ? 'Victory!' : 'Defeat'}</h2>
      <p>${w === ME ? 'Your dungeon reigns supreme.' : `${esc(s.players[w].name)} is the ultimate Boss Monster.`} After ${s.turn} turns.</p>
      <table><thead><tr><th></th><th>Boss</th><th>Souls</th><th>Wounds</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="title-buttons"><button class="big" data-ui="quit">New game</button><button class="ghost" data-ui="close">Look at the board</button></div></div>`;
    document.body.appendChild(div);
  }

  function howTo() {
    const div = document.createElement('div');
    div.className = 'overlay';
    div.innerHTML = `<div class="panel howto"><h2>How to play</h2>
      <p>You are a Boss Monster. Heroes come to town each turn; lure them into your dungeon with treasure and kill them for <b>Souls</b>. Heroes who survive deal <b>Wounds</b>.</p>
      <ol>
        <li><b>Beginning:</b> one Hero per Boss arrives in town; everyone draws a Room.</li>
        <li><b>Build:</b> in XP order, each Boss places one Room face-down: next to the entrance (up to five Rooms) or on top of a Room. Advanced Rooms (gold) must go on a Room sharing a treasure icon. Build Spells (🔨) can be cast now. Rooms are revealed together.</li>
        <li><b>Bait:</b> each Hero goes to the dungeon with the most of its treasure type (✚ Cleric, ⚔ Fighter, ✦ Mage, ◆ Thief); your Boss counts. Ties stay in town.</li>
        <li><b>Adventure:</b> Heroes walk from the entrance toward your Boss, taking each Room's damage. After each Room, Adventure Spells (⚔️) and Room abilities can be used. A Hero whose damage reaches its Health dies there: a Soul. A Hero who reaches your Boss: a Wound.</li>
        <li><b>End:</b> when any Boss has 10 Souls or 5 Wounds at the end of a turn, the highest Souls minus Wounds wins.</li>
      </ol>
      <p>Your Boss <b>levels up</b> the first time your dungeon shows five Rooms. Spells and abilities resolve last-in, first-out, so anyone can respond.</p>
      <p class="small">Hover any card to read it. Click the discard pile or a scorekeeping area to look through it. The official rulebook is at <a href="https://brotherwisegames.com/bossmonster" target="_blank" rel="noopener">brotherwisegames.com/bossmonster</a>.</p>
      <div class="title-buttons"><button class="big" data-ui="close">Got it</button></div></div>`;
    document.body.appendChild(div);
  }

  function browse(kind, seat) {
    const s = app.s;
    let title;
    let cards;
    if (kind === 'discard') {
      title = `Discard pile (${s.discard.length}), newest first`;
      cards = [...s.discard].reverse().map((iid) => ui.cardFor(s, iid, { size: 'hand' }));
    } else if (kind === 'score') {
      const p = s.players[seat];
      title = `${seat === ME ? 'Your' : `${esc(p.name)}’s`} scorekeeping area: ${BF.souls(s, seat)} Souls, ${BF.wounds(s, seat)} Wounds`;
      cards = p.score.map((x) => `<div class="scored ${x.up ? 'wound' : 'soul'}">${ui.cardFor(s, x.iid, { size: 'hand' })}<span>${x.up ? '♥ Wound' : '☠ Soul'}</span></div>`);
    } else if (kind === 'stack') {
      const at = BF.findRoom(s, seat);
      const st = s.players[at.seat].dungeon[at.slot];
      title = 'Room stack, bottom to top (only the top Room is active)';
      cards = st.map((iid) => ui.cardFor(s, iid, { size: 'hand' }));
    }
    const div = document.createElement('div');
    div.className = 'overlay';
    div.innerHTML = `<div class="panel browse"><h2>${title}</h2><div class="browse-cards">${cards.join('') || '<p>Empty.</p>'}</div>
      <div class="title-buttons"><button class="big" data-ui="close">Close</button></div></div>`;
    document.body.appendChild(div);
  }

  function inspect(iid, id) {
    const s = app.s;
    const why = s && iid != null && s.players[ME].hand.includes(iid) ? BF.whyNot(s, ME, iid) : null;
    const div = document.createElement('div');
    div.className = 'overlay';
    div.innerHTML = `<div class="panel inspect">${ui.card(iid, id, { s, size: 'preview' })}${why ? `<p class="why">Can’t play it now: ${esc(why)}</p>` : ''}
      <div class="title-buttons"><button class="big" data-ui="close">Close</button></div></div>`;
    document.body.appendChild(div);
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ---------------------------------------------------------------- one delegated listener for clicks

  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('#fxlock')) return ui.skipPresentation();
    const uiBtn = t.closest('[data-ui]');
    if (uiBtn) {
      const k = uiBtn.dataset.ui;
      if (k === 'drawer') {
        app.view.drawer = !app.view.drawer;
        document.querySelector('.drawer')?.classList.toggle('open', app.view.drawer);
      } else if (k === 'close') uiBtn.closest('.overlay')?.remove();
      else if (k === 'howto') howTo();
      else if (k === 'quit') {
        document.querySelectorAll('.overlay').forEach((o) => o.remove());
        title();
      }
      return;
    }
    const set = t.closest('[data-set]');
    if (set) {
      app.settings[set.dataset.set] = set.dataset.val;
      store.set(set.dataset.set, set.dataset.val);
      render();
      if (!app.busy) loop();
      return;
    }
    if (t.closest('.overlay')) {
      if (t.classList.contains('overlay')) t.remove();
      return;
    }
    const s = app.s;
    if (!s) return;
    if (t.closest('[data-peek]')) {
      app.view.peek = !app.view.peek;
      document.querySelector('.choice')?.classList.toggle('peeked', app.view.peek);
      return;
    }
    const browseBtn = t.closest('[data-browse]');
    if (browseBtn) return browse(browseBtn.dataset.browse, Number(browseBtn.dataset.seat));
    if (t.closest('[data-unselect]')) {
      app.view.sel = null;
      return render();
    }
    const optBtn = t.closest('[data-opt]');
    if (optBtn && s.pending) return act(s.pending.opts[Number(optBtn.dataset.opt)].v);
    if (t.closest('[data-new]') && app.aff?.slotNew) return act(app.aff.slotNew.v);
    if (t.closest('.ref')) return;
    const cardEl = t.closest('[data-iid]');
    const aff = app.aff;
    if (cardEl && aff) {
      const iid = Number(cardEl.dataset.iid);
      if (aff.target.has(iid)) return act(aff.target.get(iid).v);
      if (aff.actable.has(iid)) return act(aff.actable.get(iid).v);
      if (aff.selectable.has(iid)) {
        app.view.sel = app.view.sel === iid ? null : iid;
        return render();
      }
      const slot = cardEl.closest('.slot[data-stack]');
      if (slot && slot.dataset.stack.includes(',')) return browse('stack', Number(slot.dataset.stack.split(',').pop()));
      if (cardEl.dataset.card) return inspect(iid, cardEl.dataset.card);
    }
    const rowEl = t.closest('.prow.seat-target');
    if (rowEl && aff?.seats.has(Number(rowEl.dataset.seat))) return act(aff.seats.get(Number(rowEl.dataset.seat)).v);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      const o = document.querySelector('.overlay');
      if (o) return o.remove();
      if (document.querySelector('.choice')) {
        app.view.peek = !app.view.peek;
        document.querySelector('.choice').classList.toggle('peeked', app.view.peek);
      }
    }
  });

  // ---------------------------------------------------------------- hover preview: one delegated listener

  let hoverTimer = null;
  let hovered = null;
  const preview = () => document.getElementById('preview');
  document.addEventListener('mouseover', (ev) => {
    if (matchMedia('(hover: none)').matches) return;
    const el = ev.target.closest('[data-card]');
    if (el === hovered) return;
    hovered = el;
    clearTimeout(hoverTimer);
    preview().classList.remove('show');
    if (!el || el.closest('.fx-spot, #preview')) return;
    hoverTimer = setTimeout(() => {
      const s = app.s;
      const iid = el.dataset.iid != null ? Number(el.dataset.iid) : null;
      const id = el.dataset.card;
      const slot = el.closest('.slot[data-slot]');
      const seat = el.closest('.prow')?.dataset.seat;
      const opts = { s, size: 'preview' };
      if (slot && seat != null) Object.assign(opts, { seat: Number(seat), slot: Number(slot.dataset.slot) });
      const why = s && iid != null && s.players[ME].hand.includes(iid) && s.pending?.who === ME && !app.aff?.actable.has(iid) && !app.aff?.selectable.has(iid) ? BF.whyNot(s, ME, iid) : null;
      const p = preview();
      p.innerHTML = ui.card(iid, id, opts) + (why ? `<p class="why">${esc(why)}</p>` : '');
      const r = el.getBoundingClientRect();
      const pw = 300;
      const ph = Math.min(innerHeight - 24, 480);
      let x = r.right + 12;
      if (x + pw > innerWidth - 12) x = r.left - pw - 12;
      if (x < 12) x = 12;
      let y = r.top + r.height / 2 - ph / 2;
      y = Math.max(12, Math.min(innerHeight - ph - 12, y));
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.classList.add('show');
    }, 300);
  });

  // Boot.
  window.addEventListener('DOMContentLoaded', title);
})();
