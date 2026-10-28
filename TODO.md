# TODO: improvements to things that already work

Not DEVIATIONS.md (rules not kept) and not `data/defects.js` (cards hidden). Format: what exists
today / constraints / done when.

- **T1 Art.** Exists: procedural pixel placeholders seeded from the card id. Constraints: PLAN D7;
  renders run on the owner's Flux Studio. Done when: the owner picks an audition direction and
  every card has a QC'd plate.
- **T2 Hot-seat and AI-vs-AI spectate.** Exists: you vs 1-3 AI. Done when: the title screen offers
  both and the trace records the seat setup.
- **T3 Sound.** Exists: none. Constraints: local Audio Studio; say "not verified by ear" until the
  owner listens. Done when: a cue per logged event kind, rate-limited.
- **T4 Bug-report black box.** Exists: the seed is shown. Done when: a "Flag a bug" button saves a
  trace and `tools/replay-report.mjs --selftest` is in the gate.
- **T5 Expansions.** Done when: Tools of Hero-Kind compiles in full behind its own set toggle.
- **T6 Phone layout.** Exists: playable at 390px wide with horizontally scrolling lanes; the hand
  overlaps tightly. Done when: hand cards are readable without hovering at 390px.
- **T7 Build-reveal and destroy animations.** Exists: hero walks, damage, deaths, wounds, spell
  spotlight and banners. Done when: revealed Rooms flip and destroyed Rooms crumble on the old board.
