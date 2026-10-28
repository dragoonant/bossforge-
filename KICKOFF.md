# Kickoff record (2026-10-28)

The owner asked to "use the knowledge bases from all of our card games to kick start dev". The
knowledge base came from the sibling repos (`lorecannae/kb/`, the CARD-GAME-LESSONS series in
`fabforge`, `grandline`, `MythosForge`, `BreachForge`, `starbound-legions`, and
`mancermundo/docs/knowledge-base/local-ai-studios.md`). The parts that shape this project are
copied into `docs/lessons/`.

## What the knowledge base changed

| Lesson | Effect here |
|---|---|
| Card games use the plain-JS family; Vite/TS is for 3D | First pass (TS/React/Vite) replaced: PLAN D1 |
| Reproduction posture: printed text, real names behind a pack | PLAN D2, `data/printed.js` |
| Rights research before engine code | `docs/rights.md`, `docs/sources.md` |
| `legalActions`/`apply`/`isTerminal`/`whoActs`, one queue, one door per rule | CLAUDE.md hard rules 2-6 |
| Never assume a choice | PLAN D9 |
| Open information is a rule; prompts say what they are about | PLAN D11 |
| The AI's pass must be scored against the do-nothing baseline; measure empty turns | `js/ai.js`, `tools/sim.mjs` counters |
| Art: audition, one STYLE constant, prompt lint, dry run, sample three | PLAN D7, `tools/art-audition.mjs` |
| Registers and a RULING log | `PLAN.md`, `DEVIATIONS.md`, `TODO.md`, `data/defects.js`, `docs/rulings.md` |

## Questions asked and answers

1. Card names and text: **real cards** (reproduction posture).
2. Card pool: **base game first**.
3. Deployment: **public GitHub Pages**.
4. Art: **"Mgsd style with original 16 bit art style. Give me 10 different proofs for me to pick
   one forward to go with."** → the audition in `tools/art-audition.mjs` (PLAN D7).

Everything else is a stated default in PLAN.md, correctable in one word.

## Note on the art proofs

The series renders art on the owner's local Flux Studio (FLUX.2 klein, port 7880). This session
ran in a cloud container that cannot reach that GPU, so the audition is delivered as a one-command
tool: `node tools/art-audition.mjs` (add `--dry-run` first to see the 10 prompts). It writes the 10
plates and a labelled contact sheet to `art/audition/out/`.
