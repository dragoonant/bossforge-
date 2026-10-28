# Sources

Everything raw lives in gitignored `scratch/`. `node tools/fetch-sources.mjs` refetches it.

## Rules

| Tag | File (in `scratch/rules/`) | URL | Fetched | Bytes |
|---|---|---|---|---|
| RB | `BossMonsterRules10thAnniversary.pdf` (24 pp., "10th Anniversary Ed., 2nd Printing", 2023) | https://brotherwisegames.com/s/BossMonsterRules10thAnniversary.pdf | 2026-10-28 | 2,901,455 |
| FAQ | `AdvancedRulesGuideandFAQ.pdf` (Advanced Rules Guide & FAQ, covers Base, Tools of Hero-Kind, The Next Level) | https://brotherwisegames.com/s/AdvancedRulesGuideandFAQ.pdf | 2026-10-28 | 872,987 |
| UOG | `BM_v12_unofficiallyofficialguide.pdf` (fan guide linked from Brotherwise's page; consulted, never cited over RB/FAQ) | https://brotherwisegames.com/s/BM_v12_unofficiallyofficialguide.pdf | 2026-10-28 | 3,210,266 |

Text extractions (`rules10.txt`, `faq.txt`, `guide.txt`) are made with `pdftotext`.

## Cards

| What | Where | Fetched | Notes |
|---|---|---|---|
| Base Set card table (BMR001-BMR096: number, name, subtitle, XP/damage/health/phase, treasure, type, text, minimum players, quantity) | https://bossmonster.fandom.com/api.php?action=parse&page=List_of_Cards&prop=wikitext&format=json → `scratch/wiki/list.json` (156,032 bytes) | 2026-10-28 | Fan source (CC BY-SA wiki text). Only mechanical fields and the printed card text cross into `data/`. |

Cross-checks made against the RB:
- Deck sizes: 8 Bosses, 75 Rooms, 31 Spells, 25 ordinary Heroes, 16 Epic Heroes = 155 (the wiki
  quantities sum to exactly these).
- Hero setup by player count (RB p10): Heroes with the 2-player icon = 13 ordinary + 8 Epic; with
  3 players 17 + 12; with 4 players 25 + 16. The wiki's minimum-players column gives exactly these.
- RB p13-15 examples name Dracolich Lair, Dark Altar, Torture Chamber, Golem Factory, Neanderthal
  Cave, Bottomless Pit and Heroes BMR056/062/068/075 with the same numbers as the wiki.

Not yet sourced: the 10th Anniversary edition's revised and new cards (DEVIATIONS X1).
