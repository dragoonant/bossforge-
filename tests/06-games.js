(function () {
  'use strict';
  const BF = globalThis.BF;
  const { test, eq, ok } = BF.T;

  const play = (n, seed) => {
    let s = BF.newGame({ seed, players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, ai: true })) });
    let guard = 0;
    while (!BF.isTerminal(s)) {
      if (++guard > 20000) throw new Error(`seed ${seed} stalled`);
      s = BF.apply(s, BF.ai.choose(s, BF.whoActs(s)));
    }
    return s;
  };

  test('AI games finish for 2, 3 and 4 players', () => {
    for (const n of [2, 3, 4]) for (let seed = 1; seed <= 4; seed++) ok(play(n, seed * 13 + n).result);
  });

  test('Every logged event names its cards with tokens the UI can resolve', () => {
    const s = play(2, 99);
    for (const l of s.log) {
      for (const m of l.msg.matchAll(/\[c:(\d+)\]/g)) ok(s.cards[m[1]], `unknown card token in "${l.msg}"`);
      for (const m of l.msg.matchAll(/\[p:(\d+)\]/g)) ok(s.players[m[1]], `unknown player token in "${l.msg}"`);
    }
  });

  test('RB p19: the winner has the highest Souls minus Wounds', () => {
    const s = play(3, 7);
    const best = Math.max(...s.players.map((p) => BF.scoreOf(s, p.seat)));
    eq(BF.scoreOf(s, s.result.winners[0]), best);
  });
})();
