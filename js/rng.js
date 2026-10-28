// Seeded RNG (mulberry32). The state lives in the game state, so every shuffle and random pick
// happens inside apply() and the same seed always replays the same game (CLAUDE.md rule 9).
(function () {
  'use strict';
  const BF = globalThis.BF;

  BF.random = (s) => {
    s.rng = (s.rng + 0x6d2b79f5) | 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  BF.shuffle = (s, arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(BF.random(s) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  BF.pickRandom = (s, arr) => arr[Math.floor(BF.random(s) * arr.length)];
})();
