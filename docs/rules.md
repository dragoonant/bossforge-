# Rules citation index

Sources (see `docs/sources.md`): **RB** = 10th Anniversary rulebook (cited `RB p<page> <heading>`);
**FAQ** = Advanced Rules Guide & FAQ (cited `FAQ <heading>` or `FAQ Seq <step>` for its "full
sequence of play"). Summaries are in our own words; the PDFs in `scratch/rules/` are the authority.
Engine comments cite these tags; `tools/gate.mjs` checks every cited tag appears below.

| Tag | Rule (summary) | Engine |
|---|---|---|
| RB p4 Object | 2-4 players. Game ends after a turn in which anyone has 10+ Souls or 5+ Wounds. | `endOfTurn` |
| RB p5 Gameplay | Boss at the right; Rooms build out to the left; max five visible Rooms; first time you reach five, Level Up. | `buildRoom`, `checkLevelUp` |
| RB p6 Bosses | Boss has treasure (counts toward the dungeon), XP (turn order, highest first), Level Up (once, at end of Build when five visible Rooms first reached). Boss is not a Room: no damage, cannot be deactivated or destroyed. | `turnOrder`, `treasureOf` |
| RB p7 Rooms | Ordinary Rooms go at the end of the dungeon or over any Room; Advanced Rooms only over a Room sharing a treasure icon. Damage dealt each time a Hero enters. Ability active while visible. | `buildSlots`, `roomDamage` |
| RB p8 Heroes | Ordinary (silver) and Epic (gold). Epic Heroes only after all ordinary are claimed. Ordinary survivor = 1 Wound, Epic = 2; Soul value 1 / 2. Player icon selects cards by player count. | `heroValue`, `buildHeroDeck` |
| RB p9 Spells | Draw Spells only when told. Any number per turn, only in Build and Adventure phases, by phase icon. Discard after playing. | `castable` |
| RB p9 Priority | Spells and Room abilities resolve last-in-first-out; any player may interrupt; no limit. | `stack`, `window` |
| RB p10 Set Up | Hero deck by player count (2p 13+8, 3p 17+12, 4p 25+16); ordinary shuffled on top of shuffled Epics; remove higher-count icons. Deal 2 Bosses each, keep 1. Starting hand 5 Rooms + 2 Spells. Mulligan if four Advanced Rooms or four of one treasure type. | `newGame` |
| RB p10 Step | Set Up steps: Step 1 Hero decks by player count; Step 2 deal two Bosses, keep one; Step 3 starting hand and mulligan. | `newGame`, `mulligan` |
| RB p11 Step | Step 4: build your first Room (see RB p11 First Room). | `setupBuild` |
| RB p11 First Room | Before turn one, each player builds one Room face-down in XP order; reveal together; resolve build effects in XP order. | `setupBuild` |
| RB p12 Sequence | Beginning (reveal one Hero per player, each draws a Room) → Build → Bait → Adventure → End. | `queue` |
| RB p12 XP | Highest XP acts first in Build and Adventure. Active Player = the one building or processing Heroes. | `turnOrder` |
| RB p13 Beginning | No Spells or abilities during Beginning of Turn. All ordinary Heroes before any Epic. | `beginTurn` |
| RB p13 Build Phase | In XP order each player places one Room face-down: left of the leftmost card, or on top of a Room (Advanced only on a matching treasure). Choice cannot change once no longer active. | `buildTurn` |
| RB p14 Build Phase | Build Spells and abilities usable during Build. At end of Build, reveal simultaneously; Level Up and "when you build" resolve in XP order; no Spells/abilities during reveal or Bait. | `reveal` |
| RB p15 Bait Phase | For each Hero (in reveal order): dungeon with the single highest matching treasure lures it to its entrance; zero or a tie keeps it in town. Heroes arrive in the order revealed. | `bait` |
| RB p17 Adventure Phase | In XP order each player processes the Heroes at their entrance one at a time: entering a Room applies its ability then its damage; then Adventure Spells/abilities may be played; a Hero leaving a Room with damage ≥ Health dies (Soul, face-down); a survivor of the last Room reaches the Boss (Wound, face-up). | `adventure` |
| RB p17 Survival | A Hero that is not killed before reaching the Boss goes face-up under the Boss as a Wound. | `reachBoss` |
| RB p19 End of Turn | "Until end of turn" effects end; deactivated Rooms turn upright. Game ends if anyone has 10+ Souls or 5+ Wounds: highest Souls minus Wounds wins; tie → highest XP. Damage on a Hero returned to town or an entrance does not carry over. | `endOfTurn` |
| RB p20 Classic Mode | Variant: draw 5 Rooms + 2 Spells then discard 2. | `newGame({classic})` |
| RB p20 Activated Ability | Abilities needing a declaration or cost (e.g. "destroy this Room") are usable whenever you could play a Spell. Ongoing and "when you build" abilities are not activated. | `abilities` |
| RB p20 Build | "When you build this Room" triggers only when built. One Room per turn; no rearranging; never build over face-down Rooms; max five visible. | `buildRoom` |
| RB p20 Cancel | A canceled Spell is not cast and goes to the discard pile; a Spell whose target is gone is canceled; targets cannot change once declared. | `resolveTop` |
| RB p21 Deactivate | Room turned sideways until end of turn: no damage, treasure or abilities; not counted as a Room; cannot be built over or destroyed; breaks adjacency. | `isActive` |
| RB p21 Dead | Heroes die by damage, Spells or Room effects; the Room where Health hits zero is where it dies. | `killHero` |
| RB p21 Destroy | Destroyed Room → discard pile; Room underneath is uncovered; a hole closes by sliding Rooms right (toward the Boss). Only when a card allows. | `destroyRoom` |
| RB p21 Discard | Discard is the discarder's choice; "at random" means randomly chosen. | `discardCard` |
| RB p21 Entrance | Area left of the leftmost Room; Heroes enter in arrival order. | `entrance` |
| RB p21 Face-Down | Face-down Rooms cannot be built over or destroyed. | `buildSlots` |
| RB p22 Hand | Hidden; no hand-size limit. | `view` |
| RB p22 Heal | Flip one face-up Hero in your scorekeeping area face-down (Wound becomes Soul). | `heal` |
| RB p22 Hero | "Hero" means ordinary or Epic unless specified. | `abilities` |
| RB p23 Level Up | Triggers the first time the dungeon reaches five Rooms, during end of Build when the fifth is revealed, before that Room's build effects. | `checkLevelUp` |
| RB p23 Room Stack | Moving a Room moves its whole stack; destroy removes the top Room; only the top Room is visible and counts. | `dungeon` |
| RB p23 Search | Shuffle the searched deck afterwards. | `search` |
| FAQ Top Five | Advanced needs matching treasure (subtype irrelevant); destroyed Rooms uncover (no build trigger); a Hero in a destroyed Room exits immediately and moves on; no Spells after reveal; Heroes pause in each Room (abilities → ongoing → damage, then a window, then exit). | throughout |
| FAQ Seq 1 | Setup: discard pile starts with 4 random Rooms and 2 random Spells face up. | `newGame` (RULING R3) |
| FAQ Seq 2a | Build: each player in XP order is active; active and non-active players may play Build Spells/abilities. | `buildTurn` |
| FAQ Seq 2b | Reveal: you choose the order of your own Level Up and build effects. | `reveal` |
| FAQ Seq 4a | Windows: before a Hero enters the dungeon, after a Room damages it, before it enters the next Room. | `adventure` |
| FAQ Seq 5c | End-of-game check (superseded by RB p19, RULING R1). | — |
| FAQ <card name> | Per-card clarifications, cited at each card in `js/abilities.js`. | `abilities` |
