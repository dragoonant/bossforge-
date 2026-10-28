// The BossForge namespace and the few primitives every other file uses.
(function () {
  'use strict';
  const BF = (globalThis.BF = globalThis.BF || {});

  /** A rules violation: the action asked for is not legal. */
  class RuleError extends Error {}
  BF.RuleError = RuleError;
  BF.fail = (msg) => {
    throw new RuleError(msg);
  };
  /** An engine invariant broke: a bug, never a player mistake. */
  BF.bug = (msg) => {
    throw new Error(`BossForge engine bug: ${msg}`);
  };

  BF.clone = (x) => JSON.parse(JSON.stringify(x));
  BF.same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  BF.TREASURES = ['cleric', 'fighter', 'mage', 'thief'];
  BF.WIN_SOULS = 10; // RB p4 Object
  BF.MAX_WOUNDS = 5; // RB p4 Object
  BF.MAX_ROOMS = 5; // RB p5 Gameplay

  // Step-handler return values for the resolution queue (js/engine.js run()).
  BF.WAIT = 'wait'; // the step asked a question; stop until it is answered
  BF.STAY = 'stay'; // the step queued work ahead of itself; run that, then this step again
  BF.DONE = undefined;
})();
