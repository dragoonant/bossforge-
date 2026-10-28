# BossForge

A digital dungeon-building card game in the style of *Boss Monster*. You play a Boss: build a
dungeon of monster and trap rooms, lure greedy heroes in with treasure, and collect their souls
before they wound you.

BossForge is an original fan project. It borrows the general rules structure of dungeon-building
card games, but every card name, card text and ability here is original.

## Running it

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # rules engine tests, including AI-vs-AI full-game simulations
npm run build      # typecheck + production build into dist/
```

## How to play

1. **Setup:** draw 5 Rooms and 2 Spells, discard 2, then build your first room.
2. **Beginning of each turn:** one hero per Boss arrives in Town, and everyone draws a Room.
3. **Build:** everyone secretly picks one room. It either opens a new room at the entrance (up to
   5 rooms) or goes on top of an existing room. *Advanced* rooms must cover an ordinary room that
   shares a treasure type. Builds are revealed together in Boss XP order. Build spells are cast here.
4. **Bait:** each hero goes to the dungeon with the most of its treasure type. Your Boss's own
   treasure counts too. Ties stay in Town.
5. **Adventure:** heroes walk from the entrance to the Boss, taking each room's damage. Before
   each hero enters, players may cast Adventure spells.
6. A slain hero becomes a **Soul**. A hero that reaches the Boss deals a **Wound**. Epic heroes
   count double. **10 souls wins; 5 wounds and you are out.**

When a dungeon reaches 5 rooms for the first time, its Boss **levels up** and gains its ability.

## Project layout

```
src/engine/   Pure, framework-free rules engine (no DOM, fully deterministic from a seed)
  types.ts      Game state, card definitions, actions
  cards.ts      The card set: 23 rooms, 9 spells, 8 bosses, 24 heroes
  game.ts       createGame / applyAction (pure reducer) and rule selectors
  ai.ts         Heuristic AI opponent
  rng.ts        Seeded PRNG
src/ui/       React front end
  App.tsx         Start screen (boss pick, number of AI opponents)
  GameScreen.tsx  The table: dungeons, Town, hand, prompts, chronicle log
  useGame.ts      Wires the engine to React, runs the AI, paces the adventure
```

The UI only ever calls `applyAction(state, action)`. Because of that, the same engine can later
drive online multiplayer (send actions over the wire), replays and save games.
