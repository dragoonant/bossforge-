import { describe, expect, it } from 'vitest';
import { runAI } from './ai';
import { ROOMS, SPELLS, SPELL_COUNTS, roomCount } from './cards';
import { applyAction, createGame, legalBuildSlots, roomDamage, soulTotal, treasureCount, woundTotal } from './game';
import type { Action, GameState, HeroInst } from './types';

let uid = 10_000;
const card = (defId: string) => ({ uid: `t${uid++}`, defId });
const hero = (defId: string, damage = 0): HeroInst => ({ ...card(defId), damage, skipRooms: 0 });

function newGame(seed = 1, ai = [false, false]) {
  return createGame({ seed, players: ai.map((isAI, i) => ({ name: `P${i}`, isAI })) });
}

/** A game already in the build phase of turn 1, with empty dungeons and a clean Town. */
function buildPhase(): GameState {
  const s = newGame();
  s.phase = 'build';
  s.turn = 1;
  s.town = [];
  for (const p of s.players) {
    p.hand = [];
    p.dungeon = [];
  }
  return s;
}

const dungeon = (...ids: string[]) => ids.map((id) => ({ stack: [card(id)] }));

function play(s: GameState, ...actions: Action[]) {
  return actions.reduce(applyAction, s);
}

/** Advances an adventure until the turn ends (both players pass every window). */
function finishAdventure(s: GameState) {
  for (let i = 0; i < 200 && s.phase === 'adventure'; i++) {
    const waiting = s.adventure!.awaiting[0];
    s = applyAction(s, waiting !== undefined ? { type: 'PASS_WINDOW', playerId: waiting } : { type: 'ADVANCE' });
  }
  return s;
}

describe('setup', () => {
  it('deals 5 rooms and 2 spells to each player', () => {
    const s = newGame();
    expect(s.phase).toBe('setupDiscard');
    for (const p of s.players) expect(p.hand).toHaveLength(7);
    expect(new Set(s.players.map((p) => p.bossId)).size).toBe(2);
  });

  it('moves to the first build once everyone discards 2', () => {
    let s = newGame();
    s = play(s, { type: 'DISCARD_SETUP', playerId: 0, cardUids: s.players[0].hand.slice(0, 2).map((c) => c.uid) });
    expect(s.phase).toBe('setupDiscard');
    s = play(s, { type: 'DISCARD_SETUP', playerId: 1, cardUids: s.players[1].hand.slice(0, 2).map((c) => c.uid) });
    expect(s.phase).toBe('setupBuild');
    expect(s.players[0].hand).toHaveLength(5);
  });

  it('rejects discarding the wrong number of cards', () => {
    const s = newGame();
    expect(() => play(s, { type: 'DISCARD_SETUP', playerId: 0, cardUids: [s.players[0].hand[0].uid] })).toThrow();
  });
});

describe('building', () => {
  it('only allows advanced rooms over an ordinary room with a matching treasure', () => {
    const s = buildPhase();
    const p = s.players[0];
    p.dungeon = dungeon('orc_barracks', 'witch_kitchen');
    const lava = card('lava_moat');
    p.hand = [lava];
    expect(legalBuildSlots(p, lava.uid)).toEqual([0]);
  });

  it('caps a dungeon at 5 rooms', () => {
    const s = buildPhase();
    const p = s.players[0];
    p.dungeon = dungeon('orc_barracks', 'orc_barracks', 'orc_barracks', 'orc_barracks', 'orc_barracks');
    const room = card('ogre_larder');
    p.hand = [room];
    expect(legalBuildSlots(p, room.uid)).not.toContain('new');
  });

  it('reveals builds together and opens new rooms at the entrance', () => {
    let s = buildPhase();
    s.players[0].dungeon = dungeon('orc_barracks');
    const ogre = card('ogre_larder');
    s.players[0].hand = [ogre];
    s = play(
      s,
      { type: 'SUBMIT_BUILD', playerId: 0, build: { cardUid: ogre.uid, slot: 'new' } },
      { type: 'SUBMIT_BUILD', playerId: 1, build: null },
    );
    expect(s.players[0].dungeon.map((r) => r.stack.at(-1)!.defId)).toEqual(['ogre_larder', 'orc_barracks']);
  });

  it('levels up the boss when the fifth room is built', () => {
    let s = buildPhase();
    const p = s.players[0];
    p.bossId = 'grimjaw';
    p.dungeon = dungeon('orc_barracks', 'orc_barracks', 'orc_barracks', 'orc_barracks');
    const room = card('ogre_larder');
    p.hand = [room];
    s = play(
      s,
      { type: 'SUBMIT_BUILD', playerId: 0, build: { cardUid: room.uid, slot: 'new' } },
      { type: 'SUBMIT_BUILD', playerId: 1, build: null },
    );
    expect(s.players[0].leveledUp).toBe(true);
    expect(s.players[0].hand).toHaveLength(2); // Grimjaw draws 2 spells
  });
});

describe('room damage', () => {
  it('applies adjacency and position bonuses', () => {
    const s = buildPhase();
    const p = s.players[0];
    p.dungeon = dungeon('spike_corridor', 'kobold_warren', 'orc_barracks', 'gargoyle_gate');
    expect(roomDamage(s, p, 0)).toBe(3); // spike corridor at the entrance
    expect(roomDamage(s, p, 1)).toBe(2); // kobold next to one monster room
    expect(roomDamage(s, p, 3)).toBe(3); // gargoyle gate beside the boss
  });
});

describe('bait and adventure', () => {
  it('sends a hero to the dungeon with the most of its treasure, and ties stay in town', () => {
    let s = buildPhase();
    s.players[0].bossId = 'grimjaw'; // thief treasure
    s.players[1].bossId = 'brakka'; // fighter treasure
    s.players[0].dungeon = dungeon('orc_barracks');
    s.players[1].dungeon = dungeon('orc_barracks');
    s.town = [hero('pickpocket_fen'), hero('squire_pell'), hero('acolyte_wren')];
    expect(treasureCount(s, s.players[1], 'fighter')).toBe(2);
    s = play(s, { type: 'SUBMIT_BUILD', playerId: 0, build: null }, { type: 'SUBMIT_BUILD', playerId: 1, build: null });
    expect(s.phase).toBe('adventure');
    const queued = [s.adventure!.active!.hero, ...s.queues[0], ...s.queues[1]].map((h) => h.defId);
    expect(queued.sort()).toEqual(['pickpocket_fen', 'squire_pell']);
    expect(s.town.map((h) => h.defId)).toEqual(['acolyte_wren']);
  });

  it('turns a slain hero into a soul and a surviving hero into a wound', () => {
    let s = buildPhase();
    s.players[0].bossId = 'grimjaw';
    s.players[1].bossId = 'brakka';
    s.players[0].dungeon = dungeon('rolling_boulder'); // 3 damage, thief
    s.players[1].dungeon = dungeon('orc_barracks'); // 3 damage, fighter
    s.town = [hero('pickpocket_fen'), hero('sir_halvard')]; // health 4 and 8
    s.players[0].dungeon[0].stack.push(card('dragon_hoard')); // 4 damage, kills Fen
    s = play(s, { type: 'SUBMIT_BUILD', playerId: 0, build: null }, { type: 'SUBMIT_BUILD', playerId: 1, build: null });
    s = finishAdventure(s);
    expect(soulTotal(s.players[0])).toBe(1);
    expect(woundTotal(s.players[1])).toBe(1);
    expect(s.turn).toBe(2);
  });

  it('lets Fireball kill a hero before it enters', () => {
    let s = buildPhase();
    s.players[0].bossId = 'grimjaw';
    s.players[1].bossId = 'brakka';
    s.players[0].dungeon = dungeon('gilded_vault');
    const fireball = card('fireball');
    s.players[0].hand = [fireball];
    s.town = [hero('pickpocket_fen', 1)];
    s = play(s, { type: 'SUBMIT_BUILD', playerId: 0, build: null }, { type: 'SUBMIT_BUILD', playerId: 1, build: null });
    const target = s.adventure!.active!.hero.uid;
    s = play(s, { type: 'CAST_SPELL', playerId: 0, cardUid: fireball.uid, choice: { kind: 'hero', heroUid: target } });
    expect(soulTotal(s.players[0])).toBe(1);
    expect(s.adventure!.active).toBeNull();
  });
});

describe('full games', () => {
  const totalRooms = ROOMS.reduce((n, r) => n + roomCount(r), 0);
  const totalSpells = SPELLS.reduce((n, sp) => n + SPELL_COUNTS[sp.id], 0);

  function countCards(s: GameState) {
    const all = [
      ...s.roomDeck,
      ...s.roomDiscard,
      ...s.spellDeck,
      ...s.spellDiscard,
      ...s.players.flatMap((p) => [...p.hand, ...p.dungeon.flatMap((r) => r.stack)]),
    ];
    const spellIds = new Set(SPELLS.map((sp) => sp.id));
    return { spells: all.filter((c) => spellIds.has(c.defId)).length, rooms: all.filter((c) => !spellIds.has(c.defId)).length };
  }

  for (const players of [2, 3, 4]) {
    it(`AI-only ${players}-player games always finish and conserve cards`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        let s = newGame(seed, Array(players).fill(true));
        let steps = 0;
        while (s.phase !== 'gameOver') {
          if (++steps > 5000) throw new Error(`seed ${seed} did not finish`);
          s = runAI(s, applyAction);
          if (s.phase === 'adventure' && s.adventure!.awaiting.length === 0) s = applyAction(s, { type: 'ADVANCE' });
          expect(countCards(s)).toEqual({ rooms: totalRooms, spells: totalSpells });
        }
        expect(s.winners.length).toBeGreaterThan(0);
      }
    });
  }
});
