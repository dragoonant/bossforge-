# BossForge: Boss Monster in the browser

An unofficial, non-commercial browser reproduction of Brotherwise Games' **Boss Monster**
(base set, 2-4 Bosses, you against AI Bosses). Built on the card-game series' plain-JS
skeleton. Read `PLAN.md` first (every decision lives there), then `docs/lessons/LESSONS-DIGEST.md`.

## The regime: decided, not to be re-litigated

**This is a reproduction, and fidelity is the product.** A divergence from printed behaviour is
a defect to fix, never a design choice.

1. **Brotherwise owns the rules.** `docs/rules.md` is a citation index into the 10th Anniversary
   rulebook (RB, by page and heading) and the Advanced Rules Guide & FAQ (FAQ, by heading); both
   PDFs live in gitignored `scratch/rules/`. Every engine rule names its source in a comment:
   `// RB p13 Build Phase`, `// FAQ Minotaur's Maze`. When the RB and FAQ disagree, the RB (2023)
   wins and the call is logged in `docs/rulings.md`.
2. **Brotherwise owns balance.** There is no `BALANCE.md`. Printed numbers are never tuned.
3. **Printed text on the face, verbatim**, from the generated `data/printed.js`. The `own` gist in
   `js/abilities.js` (our words) is the fallback face and the auditor's describer, never the face.
4. **Real names are the default** (PLAN D2). `BF.names` reads `data/printed.js` at render time; if
   that file is absent the game runs on our own words. Deleting it is the withdrawal lever.
5. **2-4 players**, as printed (RB p4).
6. **Nothing playable contains content that does not work correctly.** A card listed in
   `data/defects.js` is removed from the decks at setup. Deleting the entry restores it.

## Hard rules

1. **No build step, no dependencies.** Plain browser JS, every file an IIFE on `globalThis.BF`.
   `index.html`'s script list is the load order, with a `<!-- ui -->` marker between engine and
   interface. Runs from `file://` and from `node tools/serve.mjs` (port **8241**).
2. **Engine surface is exactly `BF.newGame` / `BF.legalActions(s)` / `BF.apply(s, a)` (deep-copies,
   never mutates) / `BF.isTerminal(s)` / `BF.whoActs(s)`.** Every UI affordance derives from
   `legalActions`; every number the UI shows comes from an engine function (`BF.roomDamage`,
   `BF.treasureOf`, `BF.heroHealth`, `BF.score`, `BF.whyNot`).
3. **One resolution queue is the whole control flow.** The queue head that asks owns the game;
   only its options are legal; `legalActions` throws on an asking head with no options.
4. **Spells and activated abilities go on one LIFO stack** (RB p9). Priority windows are queue
   steps; the active player acts first (FAQ Sequence 2a, 4a).
5. **Never assume a choice.** The choice door (`ask`) has no auto-take path: one option or fifty,
   the player is asked. Not asked: indistinguishable objects, random picks the rules make random,
   and a priority window in which the player holds nothing playable.
6. **One door per rule**: damage (`roomDamage`), treasure (`treasureOf`), health (`heroHealth`),
   draw (`draw`), discard (`discardCard`), destroy (`destroyRoom`), build (`buildRoom`), kill
   (`killHero`), log (`log`). Never write to those fields outside the door. `tools/check-pages.mjs`
   greps for the bypasses.
7. **Cards are data; abilities are data keyed by card id** in `js/abilities.js`. A card whose
   ability is not implemented is `{ unimplemented: 'why' }` and validation refuses it from the
   decks unless it is in `data/defects.js`.
8. **No silent fallbacks.** Neither `if (!BF.x)` nor `BF.x || {}` in UI code. A missing module
   throws on the first frame.
9. **Seeded RNG; every shuffle and random pick happens inside `apply`.** Same seed, same game.
10. **Structured log.** `log(s, msg, data)` only; never `s.log.push`. Every line names its cards by
    id so the UI can make them hover targets.
11. **Two entry points, one script list** (`index.html`, `tests.html`), asserted by
    `tools/check-pages.mjs`.
12. **Verify in the real browser.** Every UI commit message ends with what was checked on the real
    page. Green tests plus a broken page is this series' most common failure.
13. **Commit messages describe the mechanism by card id (BMR###) or rule source**, never a printed
    sentence.
14. **Never put the owner's real name or home path in any file**; credit **evilgouki**.
15. Before committing a document, `ls` every path it claims exists.

## Registers: four files, each saying it is not the others

| File | Holds |
|---|---|
| `PLAN.md` | every decision (dated), cut order, dated Status. No other file states a decision. |
| `DEVIATIONS.md` | rules the engine does not yet keep: standing bugs, each naming its source |
| `TODO.md` | wanted improvements to things that already work |
| `data/defects.js` | cards that do not behave as printed; hidden from the decks |
| `docs/rulings.md` | how we read an unclear rule (RULING log) |

## Commands

```
node tools/serve.mjs                 # http://localhost:8241 (no-store cache)
node tools/test.mjs --quiet          # headless tests (tests.html's script list under node:vm)
node tools/sim.mjs --games 200       # AI-vs-AI games with invariants after every step
node tools/gate.mjs                  # every gate, one line each
node tools/build-printed.mjs         # regenerate data/cards.js + data/printed.js from scratch/wiki
node tools/fetch-sources.mjs         # refetch rule PDFs and the card wiki dump into scratch/
node tools/art-audition.mjs --dry-run  # the 10-direction art audition (runs on Flux Studio)
node tools/stamp-assets.mjs          # re-stamp ?v= hashes before every deploy commit
```

## Layout

```
index.html / tests.html    entry points, one script list
styles.css
js/                        ns, rng, cards, engine, abilities, ai, then ui/*
data/cards.js              GENERATED mechanical card data (never hand-edit)
data/printed.js            GENERATED printed names and rules text (the withdrawal lever)
data/defects.js            the gate
tests/*.js                 behaviour tests, named for the rule or the card
tools/*.mjs                zero-dependency Node tools
docs/                      rules.md, rulings.md, rights.md, sources.md, takedown.md, lessons/
scratch/                   gitignored: rule PDFs, wiki dump
```
