// The presentation director: plays the log entries an action produced on the OLD board, then the
// caller redraws (LESSONS-DIGEST §5). Every wait is bounded; a click skips the rest.
(function () {
  'use strict';
  const BF = globalThis.BF;
  const ui = BF.ui;

  const SPEED = { normal: 1, fast: 0.45, instant: 0 };
  let skip = false;

  const sleep = (ms) =>
    new Promise((res) => {
      if (skip || ms <= 0) return res();
      const t = setTimeout(res, ms);
      ui._skipWaiters.push(() => {
        clearTimeout(t);
        res();
      });
    });
  ui._skipWaiters = [];
  ui.skipPresentation = () => {
    skip = true;
    for (const f of ui._skipWaiters.splice(0)) f();
  };

  const layer = () => document.getElementById('fx');
  const rectOf = (sel) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
  const roomRect = (iid) => rectOf(`.slot [data-iid="${iid}"]`) ?? rectOf(`[data-stack*=",${iid}"]`) ?? rectOf(`[data-stack="${iid}"]`);
  const rowRect = (seat, part) => rectOf(`.prow[data-seat="${seat}"] ${part}`);

  const place = (el, r) => {
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + r.height / 2}px`;
  };

  const float = (text, r, cls) => {
    if (!r) return;
    const el = document.createElement('div');
    el.className = `fx-float ${cls}`;
    el.textContent = text;
    place(el, r);
    layer().appendChild(el);
    setTimeout(() => el.remove(), 1400);
  };

  const banner = async (main, sub, ms) => {
    const el = document.createElement('div');
    el.className = 'fx-banner';
    el.innerHTML = `<b>${main}</b>${sub ? `<small>${sub}</small>` : ''}`;
    layer().appendChild(el);
    await sleep(ms);
    el.remove();
  };

  /** Plays the entries between prev and next. `me` is the viewer seat. */
  ui.present = async (prev, next, me, speedName) => {
    const k = SPEED[speedName] ?? 1;
    const entries = next.log.slice(prev.log.length);
    if (!k || !entries.length) return;
    skip = false;
    const lock = document.getElementById('fxlock');
    lock.classList.add('on');
    const tokens = new Map(); // hero iid -> floating element
    const token = (hero, r) => {
      let el = tokens.get(hero);
      if (!el) {
        el = document.createElement('div');
        el.className = 'fx-token';
        el.innerHTML = ui.cardFor(next, hero, { size: 'mini' });
        layer().appendChild(el);
        tokens.set(hero, el);
      }
      if (r) place(el, r);
      return el;
    };
    try {
      for (const e of entries) {
        if (skip) break;
        const d = e.d || {};
        if (d.turnStart) await banner(`Turn ${d.turnStart}`, 'Heroes arrive in town', 1100 * k);
        else if (d.levelUp != null) await banner(`${ui.plain(next, `[c:${next.players[d.levelUp].boss}]`, me)} levels up!`, 'Five Rooms', 1500 * k);
        else if (d.enters != null) {
          token(d.enters, rowRect(d.seat, '.entrance'));
          await sleep(380 * k);
        } else if (d.damage != null) {
          const t = token(d.hero, d.room != null ? roomRect(d.room) : null);
          t.classList.add('hit');
          setTimeout(() => t.classList.remove('hit'), 300);
          float(`-${d.damage}`, t.getBoundingClientRect(), 'dmg');
          await sleep(560 * k);
        } else if (d.soul != null) {
          const t = tokens.get(d.hero);
          float('☠ Soul', t ? t.getBoundingClientRect() : rowRect(d.soul, '.scorezone'), 'soul');
          if (t) t.classList.add('dying');
          await sleep(700 * k);
          if (t) t.remove();
          tokens.delete(d.hero);
        } else if (d.wound != null) {
          const t = token(d.hero, rowRect(d.wound, '.bosszone'));
          t.classList.add('wounding');
          float(next.cards[d.hero] && BF.CARD_DATA[next.cards[d.hero].id].epic ? '♥♥ 2 Wounds' : '♥ Wound', rowRect(d.wound, '.bosszone'), 'wound');
          await sleep(720 * k);
          t.remove();
          tokens.delete(d.hero);
        } else if (d.declared != null) {
          const el = document.createElement('div');
          el.className = 'fx-spot';
          el.innerHTML = `${ui.cardFor(next, d.declared, { size: 'preview' })}<div class="fx-caption">${ui.rich(next, e.msg, me)}</div>`;
          layer().appendChild(el);
          void el.getBoundingClientRect(); // flush the start state; rAF does not fire in background tabs
          el.classList.add('in');
          await sleep(1300 * k);
          el.remove();
        } else if (d.canceled != null) {
          float('Canceled!', rectOf('.stackzone') ?? rectOf('.middle'), 'cancel');
          await sleep(500 * k);
        } else if (d.destroyed != null) {
          const r = roomRect(d.destroyed);
          float('Destroyed', r, 'cancel');
          await sleep(450 * k);
        } else if (d.built != null || d.placed != null) {
          await sleep(160 * k);
        } else if (d.lured != null) {
          float('→', rectOf(`.town [data-iid="${d.lured}"]`), 'lure');
          await sleep(260 * k);
        }
      }
    } finally {
      for (const el of tokens.values()) el.remove();
      lock.classList.remove('on');
    }
  };
})();
