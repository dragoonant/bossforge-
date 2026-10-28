# BossForge

**Boss Monster in the browser**: an unofficial, non-commercial reproduction of Brotherwise Games'
dungeon-building card game (Base Set), played against 1-3 AI Bosses. Build a dungeon, lure greedy
heroes with treasure, kill them for Souls, and avoid five Wounds.

> Unofficial fan project, not affiliated with, endorsed or sponsored by Brotherwise Games, LLC.
> *Boss Monster*, its card names and its text belong to Brotherwise Games. No official art, logos or
> card frames are used. See [NOTICE.md](NOTICE.md).

## Play

Open `index.html` in a browser, or serve the folder:

```
node tools/serve.mjs          # http://localhost:8241
```

No build step and no dependencies: plain browser JavaScript. Node 22+ runs the tools.

## What is in it

- **The full Base Set**: 8 Bosses, 75 Rooms, 31 Spells, 25 Heroes and 16 Epic Heroes, with every
  card's printed name and text. Every card with rules text has its own behaviour test.
- **The current official rules**: the 10th Anniversary rulebook (2023) plus Brotherwise's Advanced
  Rules Guide & FAQ. That covers XP turn order, face-down builds revealed together, Level Up at five
  Rooms, the bait phase, Heroes pausing in each Room, and a last-in-first-out stack for Spells and
  Room abilities. Every unclear point is logged in [docs/rulings.md](docs/rulings.md).
- **An AI** that builds for the Heroes in town and casts only when a Spell changes a Hero's fate.
- **An interface** where every highlight comes from the engine's legal options. It shows open
  information everywhere (discard pile, scorekeeping areas, Room stacks, town, entrances). Prompts
  say what they are about, and the log is replayed as animation.
- **Placeholder pixel art**, generated per card, until the art audition is decided (PLAN D7).

## Develop

```
node tools/gate.mjs                    # every gate, one line each
node tools/test.mjs --quiet            # 84 behaviour tests (tests.html runs them in a browser too)
node tools/sim.mjs --games 200 --policy ai   # AI games with invariants after every step
node tools/art-audition.mjs --dry-run  # the 10-direction art audition (renders on Flux Studio)
```

Start with [CLAUDE.md](CLAUDE.md) (the regime and hard rules) and [PLAN.md](PLAN.md) (every
decision). [HANDOFF.md](HANDOFF.md) says where things stand.

Built by **evilgouki**.
