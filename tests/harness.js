// A tiny test harness plus position builders. Tests play through BF.apply only and assert the side
// effect, not the resolution (LESSONS-DIGEST §2.3).
(function () {
  'use strict';
  const BF = globalThis.BF;
  const tests = [];
  const T = (BF.T = {});

  T.test = (name, fn) => tests.push({ name, fn });
  T.eq = (a, b, msg) => {
    if (!BF.same(a, b)) throw new Error(`${msg || 'not equal'}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
  };
  T.ok = (x, msg) => {
    if (!x) throw new Error(msg || 'expected truthy');
  };
  T.throws = (fn, msg) => {
    try {
      fn();
    } catch (e) {
      return;
    }
    throw new Error(msg || 'expected a throw');
  };

  T.runAll = (filter) => {
    const lines = [];
    let failed = 0;
    for (const t of tests) {
      if (filter && !t.name.includes(filter)) continue;
      try {
        t.fn();
        lines.push({ ok: true, text: `ok   ${t.name}` });
      } catch (e) {
        failed++;
        lines.push({ ok: false, text: `FAIL ${t.name}\n     ${e.message}\n${(e.stack || '').split('\n').slice(1, 3).join('\n')}` });
      }
    }
    return { lines, failed, total: lines.length };
  };

  // A step that parks the queue so tests can stop at a known point.
  BF.STEPS.halt = (s, st) => {
    const a = BF.ask(s, st, 'h', { who: 0, kind: 'halt', prompt: 'test halt', opts: [{ v: 'halt', label: 'halt' }] });
    if (a === BF.ASKED) return BF.WAIT;
  };

  const mk = (s, id) => {
    const iid = s.nextIid++;
    s.cards[iid] = { iid, id };
    if (BF.CARD_DATA[id].kind === 'hero') s.cards[iid].dmg = 0;
    return iid;
  };
  T.mk = mk;

  /**
   * A position built by hand. cfg: { n, bosses: [id], hands: [[id]], dungeons: [[id | [id, id]]] (left to
   * right; an array is a stack, bottom first), town: [id], entrances: [[id]], scores: [[{ id, up }]],
   * discard: [id] }. The decks keep their cards; nothing is queued yet.
   */
  T.board = (cfg = {}) => {
    const n = cfg.n ?? 2;
    const s = BF.newGame({ seed: cfg.seed ?? 1, players: Array.from({ length: n }, (_, i) => ({ name: `P${i}` })) });
    s.queue = [];
    s.pending = null;
    s.stack = [];
    s.adv = null;
    s.fd = {};
    s.turn = 1;
    s.phase = 'build';
    s.log = [];
    s.town = (cfg.town || []).map((id) => mk(s, id));
    s.discard = (cfg.discard || []).map((id) => mk(s, id));
    const bosses = cfg.bosses || ['BMR001', 'BMR004', 'BMR006', 'BMR008'];
    s.players.forEach((p, i) => {
      p.boss = mk(s, bosses[i]);
      p.bossOffer = [];
      p.hand = (cfg.hands?.[i] || []).map((id) => mk(s, id));
      p.dungeon = (cfg.dungeons?.[i] || []).map((x) => (Array.isArray(x) ? x : [x]).map((id) => mk(s, id)));
      p.entrance = (cfg.entrances?.[i] || []).map((id) => mk(s, id));
      p.score = (cfg.scores?.[i] || []).map((x) => ({ iid: mk(s, x.id), up: !!x.up }));
      p.revealQ = [];
      p.placed = 0;
    });
    return s;
  };

  /** Queue steps then a halt, and run until the first question. */
  T.run = (s, ...steps) => {
    s.queue = [...steps.map((x) => ({ ...x, ans: {} })), { k: 'halt', ans: {} }];
    s.pending = null;
    BF.run(s);
    return s;
  };

  T.halted = (s) => s.pending?.kind === 'halt';

  /** Answer the pending question with the option whose label or value matches `m`. */
  T.answer = (s, m) => {
    const q = s.pending;
    if (!q) throw new Error('nothing pending');
    const match = (o) => (typeof m === 'function' ? m(o) : BF.same(o.v, m) || (typeof m === 'string' && o.label.includes(m)));
    const o = q.opts.find(match);
    if (!o) throw new Error(`no option ${typeof m === 'function' ? m : JSON.stringify(m)} in "${q.prompt}": ${q.opts.map((x) => JSON.stringify(x.v)).join(' | ')}`);
    return BF.apply(s, { type: 'choose', v: o.v });
  };

  /** Answer 'pass' to every priority window until something else is asked. */
  T.passAll = (s) => {
    let guard = 0;
    while (s.pending && s.pending.kind === 'window') {
      if (++guard > 500) throw new Error('passAll did not settle');
      s = T.answer(s, 'pass');
    }
    return s;
  };

  /** The option values of the pending question. */
  T.opts = (s) => s.pending.opts.map((o) => o.v);
  T.iidOf = (s, id, where) => {
    const all = Object.values(s.cards).filter((c) => c.id === id).map((c) => c.iid);
    return where ? all.find(where) : all[all.length - 1];
  };
  T.handIds = (s, seat) => s.players[seat].hand.map((i) => s.cards[i].id);
  T.dungeonIds = (s, seat) => s.players[seat].dungeon.map((st) => st.map((i) => s.cards[i].id));
  T.top = (s, seat, slot) => BF.topOf(s.players[seat], slot);
  /** Window option that casts or uses card `id`. */
  T.castOpt = (s, id) => (o) => (o.v.cast != null && s.cards[o.v.cast].id === id) || (o.v.act != null && s.cards[o.v.act].id === id);
})();
