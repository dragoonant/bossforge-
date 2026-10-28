# PLAN: every BossForge decision lives here

No other file states a decision; they point at a row here. When a decision moves, grep the repo
for every file restating it.

## Decisions

| # | Date | Decision | By |
|---|---|---|---|
| D1 | 2026-10-28 | **Plain-JS card-game skeleton** (no build step, IIFEs on `globalThis.BF`), replacing the TypeScript/React/Vite first pass. Series rule: Vite/TS is for the 3D games (CROSS-PROJECT-LESSONS §1). | owner ("use the knowledge bases") |
| D2 | 2026-10-28 | **Reproduction posture**: real Boss Monster card names and printed rules text on the face, from the generated `data/printed.js`; original art only; no official images, logos or frames. | owner |
| D3 | 2026-10-28 | **Card pool: the Base Set (BMR001-BMR096, 155 cards)** first. Expansions after the base plays exactly right. | owner |
| D4 | 2026-10-28 | **Rules: the 10th Anniversary rulebook (2023)** plus Brotherwise's Advanced Rules Guide & FAQ. Where they conflict the rulebook wins (it is newer); each conflict is a RULING. | default |
| D5 | 2026-10-28 | **Card data source: the Boss Monster Fandom wiki "List of Cards", Base Set table** (fan source; numbers checked against the rulebook's deck counts and player-count table). The 10th Anniversary card revisions (4 new Bosses, updated Rooms/Spells) are not sourced yet: DEVIATIONS X1. Where the wiki gives a "Revised" text we use it. | default |
| D6 | 2026-10-28 | **Public GitHub Pages deployment**, after the rights findings are recorded and the concern stated once (NOTICE.md, docs/rights.md). | owner |
| D7 | 2026-10-28 | **Art direction: an audition first.** Owner asked for MGSD proportions in an original 16-bit pixel-art style, and "10 different proofs" to pick one. `tools/art-audition.mjs` renders one card in 10 directions on the local Flux Studio. Until a pick, cards use a procedural pixel placeholder. **Do not re-litigate once picked.** | owner |
| D8 | 2026-10-28 | Modes: you vs 1-3 AI Bosses first. Hot-seat and AI-vs-AI spectate later (TODO). | default |
| D9 | 2026-10-28 | **Never assume a choice** (single-option asks included), tested with a single-target case. | series rule |
| D10 | 2026-10-28 | Setup per RB p10: deal 2 Bosses, keep 1; 5 Rooms + 2 Spells; the RB p10 mulligan offered when it applies. Classic Mode (discard 2) is a menu option, off by default. The FAQ's starting discard pile (4 Rooms + 2 Spells face up) is used: RULING R3. | default |
| D11 | 2026-10-28 | First playable milestone: a full base-set game vs one AI Boss in the real browser, with self-explaining prompts, open-information viewers (discard pile, scorekeeping areas, town, entrances), a how-to-play panel and a score tracker from the first build. | series rule |
| D12 | 2026-10-28 | Single agent by default; helpers only for disjoint files. | series rule |
| D13 | 2026-10-28 | Dev server port **8241**. | default |

## Cut order if time runs short

Cut first → last: AI-vs-AI spectate mode → hot-seat → animation beyond hero walk and spotlight →
hand fanning → sound. **Never cut**: per-card behaviour tests, the defects gate, open-information
viewers, the log, self-explaining prompts.

## Status

### 2026-10-28 (session 1, cloud)
- Knowledge base read (LESSONS-DIGEST, CROSS-PROJECT-LESSONS); kickoff questions answered (D2, D3,
  D6, D7).
- Rights research recorded (`docs/rights.md`): no Brotherwise fan or digital policy published.
- Rule PDFs and the wiki card table fetched into `scratch/`; `docs/rules.md` index written.
- In progress: engine on the plain-JS skeleton with the full Base Set, AI, UI, gates, art
  audition tool, Pages deploy.
