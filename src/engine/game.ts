// The BossForge rules engine. `applyAction` is a pure function: it never
// mutates its input, it returns a new state or throws a RuleError.
//
// Turn structure:
//   Setup:     everyone draws 5 Rooms + 2 Spells, discards 2, then builds a first room.
//   Beginning: reveal one hero per player into Town; everyone draws a Room.
//   Build:     everyone secretly picks a room to build (and may cast Build spells);
//              builds are revealed in Boss XP order, highest first.
//   Bait:      each hero in Town goes to the dungeon with the most of its treasure
//              (ties keep it in Town).
//   Adventure: heroes walk each dungeon from the entrance to the Boss. A hero that
//              runs out of health becomes a Soul; one that reaches the Boss deals a Wound.
//   End:       5 wounds eliminates a Boss; 10 souls wins.

import {
  BOSSES,
  HEROES,
  MAX_ROOMS,
  MAX_WOUNDS,
  ROOMS,
  SPELLS,
  SPELL_COUNTS,
  WIN_SOULS,
  getBoss,
  getDef,
  getHero,
  getRoom,
  roomCount,
} from './cards';
import { nextRandom } from './rng';
import type {
  Action,
  CardInst,
  GameConfig,
  GameState,
  HeroInst,
  PendingBuild,
  PlayerState,
  RoomDef,
  SpellChoice,
  SpellDef,
  Treasure,
} from './types';

export class RuleError extends Error {}

const fail = (msg: string): never => {
  throw new RuleError(msg);
};

// ---------------------------------------------------------------------------
// Setup

export function createGame(config: GameConfig): GameState {
  if (config.players.length < 2 || config.players.length > 4) fail('BossForge needs 2-4 players');

  const s: GameState = {
    rng: config.seed ?? Math.floor(Math.random() * 2 ** 31),
    nextUid: 1,
    turn: 0,
    phase: 'setupDiscard',
    players: [],
    roomDeck: [],
    roomDiscard: [],
    spellDeck: [],
    spellDiscard: [],
    heroDeck: [],
    epicDeck: [],
    town: [],
    queues: {},
    adventure: null,
    mods: { roomBonus: {}, treasureBonus: {} },
    log: [],
    luredThisTurn: 0,
    winners: [],
  };

  for (const def of ROOMS) for (let i = 0; i < roomCount(def); i++) s.roomDeck.push(makeCard(s, def.id));
  for (const def of SPELLS) for (let i = 0; i < SPELL_COUNTS[def.id]; i++) s.spellDeck.push(makeCard(s, def.id));
  for (const def of HEROES) (def.epic ? s.epicDeck : s.heroDeck).push({ ...makeCard(s, def.id), damage: 0, skipRooms: 0 });
  shuffle(s, s.roomDeck);
  shuffle(s, s.spellDeck);
  shuffle(s, s.heroDeck);
  shuffle(s, s.epicDeck);

  const unclaimed = shuffle(
    s,
    BOSSES.map((b) => b.id).filter((id) => !config.players.some((p) => p.bossId === id)),
  );
  config.players.forEach((p, id) => {
    const player: PlayerState = {
      id,
      name: p.name,
      isAI: p.isAI,
      bossId: p.bossId ?? unclaimed.pop()!,
      hand: [],
      dungeon: [],
      souls: [],
      wounds: [],
      leveledUp: false,
      eliminated: false,
      ready: false,
      pendingBuild: null,
    };
    s.players.push(player);
    s.queues[id] = [];
    for (let i = 0; i < 5; i++) drawRoom(s, player);
    for (let i = 0; i < 2; i++) drawSpell(s, player);
  });

  log(s, 'Each Boss draws 5 Rooms and 2 Spells, then discards 2.');
  return s;
}

function makeCard(s: GameState, defId: string): CardInst {
  return { uid: `c${s.nextUid++}`, defId };
}

function random(s: GameState): number {
  const [value, next] = nextRandom(s.rng);
  s.rng = next;
  return value;
}

function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function log(s: GameState, text: string) {
  s.log.push({ turn: s.turn, text });
}

function drawFrom(s: GameState, deck: CardInst[], discard: CardInst[]): CardInst | undefined {
  if (deck.length === 0 && discard.length > 0) {
    deck.push(...shuffle(s, discard.splice(0)));
  }
  return deck.pop();
}

function drawRoom(s: GameState, p: PlayerState) {
  const card = drawFrom(s, s.roomDeck, s.roomDiscard);
  if (card) p.hand.push(card);
}

function drawSpell(s: GameState, p: PlayerState) {
  const card = drawFrom(s, s.spellDeck, s.spellDiscard);
  if (card) p.hand.push(card);
}

function discardCard(s: GameState, card: CardInst) {
  (getDef(card.defId).kind === 'spell' ? s.spellDiscard : s.roomDiscard).push(card);
}

// ---------------------------------------------------------------------------
// Selectors (also used by the UI and AI)

export const activePlayers = (s: GameState) => s.players.filter((p) => !p.eliminated);

/** Active players sorted by Boss XP, highest first. */
export const turnOrder = (s: GameState) =>
  [...activePlayers(s)].sort((a, b) => getBoss(b.bossId).xp - getBoss(a.bossId).xp);

export const topRoom = (p: PlayerState, slot: number): CardInst | undefined => p.dungeon[slot]?.stack.at(-1);

const topRoomDef = (p: PlayerState, slot: number): RoomDef | undefined => {
  const card = topRoom(p, slot);
  return card ? getRoom(card.defId) : undefined;
};

/** Damage the room at `slot` currently deals, including all bonuses. */
export function roomDamage(s: GameState, p: PlayerState, slot: number): number {
  const def = topRoomDef(p, slot);
  if (!def) return 0;
  const neighbours = [topRoomDef(p, slot - 1), topRoomDef(p, slot + 1)].filter((d): d is RoomDef => !!d);
  let dmg = def.damage;

  switch (def.id) {
    case 'kobold_warren':
      dmg += neighbours.filter((n) => n.roomType === 'monster').length;
      break;
    case 'arcane_glyph':
      dmg += neighbours.filter((n) => n.roomType === 'trap').length;
      break;
    case 'gargoyle_gate':
      if (slot === p.dungeon.length - 1) dmg += 2;
      break;
    case 'spike_corridor':
      if (slot === 0) dmg += 2;
      break;
    case 'minotaur_maze':
      dmg += p.dungeon.filter((_, i) => i !== slot && topRoomDef(p, i)?.roomType === 'monster').length;
      break;
  }
  if (def.roomType === 'trap') dmg += neighbours.filter((n) => n.id === 'dimensional_rift').length;

  if (p.leveledUp) {
    if (p.bossId === 'brakka' && def.roomType === 'monster') dmg += 1;
    if (p.bossId === 'vexa' && def.roomType === 'trap') dmg += 1;
    if (p.bossId === 'zarnak' && slot === 0) dmg += 2;
  }
  return dmg + (s.mods.roomBonus[topRoom(p, slot)!.uid] ?? 0);
}

export function treasureCount(s: GameState, p: PlayerState, t: Treasure): number {
  let total = getBoss(p.bossId).treasure === t ? 1 : 0;
  p.dungeon.forEach((_, i) => {
    total += topRoomDef(p, i)!.treasure.filter((x) => x === t).length;
  });
  if (p.leveledUp && p.bossId === 'matron') total += 1;
  return total + (s.mods.treasureBonus[p.id]?.[t] ?? 0);
}

/** Souls and wounds are worth 2 for epic heroes, 1 otherwise. */
export const heroValue = (h: HeroInst) => (getHero(h.defId).epic ? 2 : 1);
export const soulTotal = (p: PlayerState) => p.souls.reduce((n, h) => n + heroValue(h), 0);
export const woundTotal = (p: PlayerState) => p.wounds.reduce((n, h) => n + heroValue(h), 0);

/** Where `cardUid` may legally be built by player `p`. */
export function legalBuildSlots(p: PlayerState, cardUid: string): PendingBuild['slot'][] {
  const card = p.hand.find((c) => c.uid === cardUid);
  if (!card) return [];
  const def = getDef(card.defId);
  if (def.kind !== 'room') return [];
  const slots: PendingBuild['slot'][] = [];
  if (!def.advanced && p.dungeon.length < MAX_ROOMS) slots.push('new');
  p.dungeon.forEach((_, i) => {
    const under = topRoomDef(p, i)!;
    if (!def.advanced || (!under.advanced && under.treasure.some((t) => def.treasure.includes(t)))) slots.push(i);
  });
  return slots;
}

/** Whether `p` may cast a spell of this definition right now (ignoring targets). */
export function canCastNow(s: GameState, p: PlayerState, def: SpellDef): boolean {
  if (p.eliminated) return false;
  if (s.phase === 'build') return !p.ready && def.phase !== 'adventure';
  if (s.phase === 'adventure') return !!s.adventure?.awaiting.includes(p.id) && def.phase !== 'build';
  return false;
}

/** Heroes a spell may target: the hero at the door, plus heroes still waiting in line. */
export function targetableHeroes(s: GameState, ownerFilter: (ownerId: number) => boolean) {
  const result: { hero: HeroInst; ownerId: number }[] = [];
  const active = s.adventure?.active;
  if (active?.atDoor && ownerFilter(active.ownerId)) result.push({ hero: active.hero, ownerId: active.ownerId });
  for (const p of activePlayers(s)) {
    if (ownerFilter(p.id)) for (const hero of s.queues[p.id]) result.push({ hero, ownerId: p.id });
  }
  return result;
}

/** All legal choices for casting `def` as player `p` (empty when there are none). */
export function spellChoices(s: GameState, p: PlayerState, def: SpellDef): SpellChoice[] {
  switch (def.target) {
    case 'none':
      if (def.id === 'iron_will' && p.wounds.length === 0) return [];
      return [{ kind: 'none' }];
    case 'treasure':
      return (['cleric', 'fighter', 'mage', 'thief'] as Treasure[]).map((treasure) => ({ kind: 'treasure', treasure }));
    case 'anyRoom':
      return activePlayers(s).flatMap((o) => o.dungeon.map((_, slot) => ({ kind: 'room' as const, playerId: o.id, slot })));
    case 'ownRoom':
      return p.dungeon.map((_, slot) => ({ kind: 'room' as const, playerId: p.id, slot }));
    case 'ownHero':
      return targetableHeroes(s, (id) => id === p.id).map(({ hero }) => ({ kind: 'hero' as const, heroUid: hero.uid }));
    case 'opponentHero':
      return targetableHeroes(s, (id) => id !== p.id).map(({ hero }) => ({ kind: 'hero' as const, heroUid: hero.uid }));
  }
}

const sameChoice = (a: SpellChoice, b: SpellChoice) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------
// Actions

export function applyAction(state: GameState, action: Action): GameState {
  const s = structuredClone(state);
  if (s.phase === 'gameOver') fail('The game is over');

  switch (action.type) {
    case 'DISCARD_SETUP':
      discardSetup(s, player(s, action.playerId), action.cardUids);
      break;
    case 'SUBMIT_BUILD':
      submitBuild(s, player(s, action.playerId), action.build);
      break;
    case 'CAST_SPELL':
      castSpell(s, player(s, action.playerId), action.cardUid, action.choice);
      break;
    case 'PASS_WINDOW': {
      const adv = s.adventure;
      if (s.phase !== 'adventure' || !adv?.awaiting.includes(action.playerId)) fail('Nothing to pass');
      adv!.awaiting = adv!.awaiting.filter((id) => id !== action.playerId);
      break;
    }
    case 'ADVANCE':
      advance(s);
      break;
  }
  return s;
}

function player(s: GameState, id: number): PlayerState {
  const p = s.players[id] ?? fail(`No player ${id}`);
  if (p.eliminated) fail(`${p.name} has been eliminated`);
  return p;
}

function discardSetup(s: GameState, p: PlayerState, uids: string[]) {
  if (s.phase !== 'setupDiscard') fail('Not the setup discard step');
  if (p.ready) fail('Already discarded');
  if (uids.length !== 2 || new Set(uids).size !== 2) fail('Discard exactly 2 cards');
  for (const uid of uids) {
    const idx = p.hand.findIndex((c) => c.uid === uid);
    if (idx < 0) fail('Card not in hand');
    discardCard(s, p.hand.splice(idx, 1)[0]);
  }
  p.ready = true;
  if (activePlayers(s).every((x) => x.ready)) {
    for (const x of s.players) x.ready = false;
    s.phase = 'setupBuild';
    log(s, 'Each Boss builds a first room.');
  }
}

function submitBuild(s: GameState, p: PlayerState, build: PendingBuild | null) {
  if (s.phase !== 'build' && s.phase !== 'setupBuild') fail('Not the build phase');
  if (p.ready) fail('Already submitted a build');
  if (build && !legalBuildSlots(p, build.cardUid).includes(build.slot)) fail('Illegal build');
  p.pendingBuild = build;
  p.ready = true;
  if (activePlayers(s).every((x) => x.ready)) revealBuilds(s);
}

function revealBuilds(s: GameState) {
  for (const p of turnOrder(s)) {
    const build = p.pendingBuild;
    p.pendingBuild = null;
    p.ready = false;
    if (!build) {
      log(s, `${p.name} builds nothing.`);
      continue;
    }
    // A Cave-In cast after this build was chosen may have changed the dungeon.
    const legal = legalBuildSlots(p, build.cardUid);
    const slot = legal.includes(build.slot) ? build.slot : legal.includes('new') ? 'new' : null;
    if (slot === null) {
      log(s, `${p.name}'s build fizzles.`);
      continue;
    }
    const card = p.hand.splice(
      p.hand.findIndex((c) => c.uid === build.cardUid),
      1,
    )[0];
    const def = getRoom(card.defId);
    if (slot === 'new') {
      p.dungeon.unshift({ stack: [card] });
      log(s, `${p.name} builds ${def.name} at the entrance.`);
    } else {
      const under = getRoom(topRoom(p, slot)!.defId);
      p.dungeon[slot].stack.push(card);
      log(s, `${p.name} builds ${def.name} over ${under.name}.`);
    }
    if (def.id === 'bat_roost') drawSpell(s, p);
    if (def.id === 'poison_darts') drawRoom(s, p);
    checkLevelUp(s, p);
  }

  if (s.phase === 'setupBuild') beginTurn(s);
  else {
    bait(s);
    startAdventure(s);
  }
}

function checkLevelUp(s: GameState, p: PlayerState) {
  if (p.leveledUp || p.dungeon.length < MAX_ROOMS) return;
  p.leveledUp = true;
  const boss = getBoss(p.bossId);
  log(s, `${boss.name} levels up! ${boss.levelUpText}`);
  switch (boss.id) {
    case 'grimjaw':
      drawSpell(s, p);
      drawSpell(s, p);
      break;
    case 'mordrake':
      healWound(s, p);
      healWound(s, p);
      break;
    case 'sylith':
      for (let i = 0; i < 3; i++) drawRoom(s, p);
      break;
    case 'korrgath':
      for (const o of activePlayers(s)) {
        if (o.id === p.id) continue;
        const spells = o.hand.filter((c) => getDef(c.defId).kind === 'spell');
        if (spells.length === 0) continue;
        const victim = spells[Math.floor(random(s) * spells.length)];
        o.hand = o.hand.filter((c) => c !== victim);
        discardCard(s, victim);
        log(s, `${o.name} discards ${getDef(victim.defId).name}.`);
      }
      break;
  }
}

function healWound(s: GameState, p: PlayerState) {
  const healed = p.wounds.pop();
  if (healed) log(s, `${p.name} heals the wound from ${getHero(healed.defId).name}.`);
}

function beginTurn(s: GameState) {
  s.turn++;
  s.phase = 'build';
  s.mods = { roomBonus: {}, treasureBonus: {} };
  s.luredThisTurn = 0;
  log(s, `— Turn ${s.turn} —`);
  for (let i = 0; i < activePlayers(s).length; i++) {
    const hero = s.heroDeck.pop() ?? s.epicDeck.pop();
    if (!hero) break;
    s.town.push(hero);
    log(s, `${getHero(hero.defId).name} arrives in Town.`);
  }
  for (const p of activePlayers(s)) drawRoom(s, p);
}

function bait(s: GameState) {
  const stay: HeroInst[] = [];
  for (const hero of s.town) {
    const def = getHero(hero.defId);
    const counts = activePlayers(s).map((p) => ({ p, n: treasureCount(s, p, def.treasure) }));
    const best = Math.max(...counts.map((c) => c.n));
    const leaders = counts.filter((c) => c.n === best);
    if (best > 0 && leaders.length === 1) {
      s.queues[leaders[0].p.id].push(hero);
      s.luredThisTurn++;
      log(s, `${def.name} is lured to ${leaders[0].p.name}'s dungeon.`);
    } else {
      stay.push(hero);
      log(s, `${def.name} can't decide and stays in Town.`);
    }
  }
  s.town = stay;
}

function startAdventure(s: GameState) {
  s.phase = 'adventure';
  s.adventure = { active: null, awaiting: [] };
  nextHero(s);
}

/** Puts the next waiting hero at a dungeon door and opens a spell window. */
function nextHero(s: GameState) {
  const adv = s.adventure!;
  const owner = turnOrder(s).find((p) => s.queues[p.id].length > 0);
  if (!owner) {
    adv.active = null;
    adv.awaiting = [];
    return;
  }
  const hero = s.queues[owner.id].shift()!;
  adv.active = { hero, ownerId: owner.id, roomIndex: 0, atDoor: true };
  adv.awaiting = turnOrder(s)
    .filter((p) => p.hand.some((c) => {
      const def = getDef(c.defId);
      return def.kind === 'spell' && def.phase !== 'build';
    }))
    .map((p) => p.id);
}

function advance(s: GameState) {
  if (s.phase !== 'adventure') fail('Nothing to advance');
  const adv = s.adventure!;
  if (adv.awaiting.length > 0) fail('Waiting for players to cast or pass');

  const active = adv.active;
  if (!active) {
    if (activePlayers(s).some((p) => s.queues[p.id].length > 0)) nextHero(s);
    else endTurn(s);
    return;
  }

  const owner = s.players[active.ownerId];
  const heroDef = getHero(active.hero.defId);
  active.atDoor = false;

  if (active.roomIndex >= owner.dungeon.length) {
    owner.wounds.push(active.hero);
    log(s, `${heroDef.name} reaches ${getBoss(owner.bossId).name} and deals a wound!`);
    adv.active = null;
    return;
  }

  const slot = active.roomIndex++;
  const roomName = getRoom(topRoom(owner, slot)!.defId).name;
  if (active.hero.skipRooms > 0) {
    active.hero.skipRooms--;
    log(s, `${heroDef.name} slips past ${roomName}.`);
    return;
  }
  const dmg = roomDamage(s, owner, slot);
  active.hero.damage += dmg;
  if (active.hero.damage >= heroDef.health) {
    killHero(s, owner, active.hero, slot);
    adv.active = null;
  } else {
    log(s, `${heroDef.name} takes ${dmg} in ${roomName} (${heroDef.health - active.hero.damage} health left).`);
  }
}

function killHero(s: GameState, owner: PlayerState, hero: HeroInst, slot: number | null) {
  const heroDef = getHero(hero.defId);
  owner.souls.push(hero);
  if (slot === null) {
    log(s, `${heroDef.name} is slain before entering! ${owner.name} claims a soul.`);
    return;
  }
  const room = getRoom(topRoom(owner, slot)!.defId);
  log(s, `${heroDef.name} dies in ${room.name}. ${owner.name} claims a soul.`);
  switch (room.id) {
    case 'skeleton_crypt':
      drawRoom(s, owner);
      break;
    case 'witch_kitchen':
    case 'dragon_hoard':
      drawSpell(s, owner);
      break;
    case 'lich_sanctum':
      drawRoom(s, owner);
      drawSpell(s, owner);
      break;
    case 'pit_of_penance':
      healWound(s, owner);
      break;
  }
}

function castSpell(s: GameState, p: PlayerState, cardUid: string, choice: SpellChoice) {
  const idx = p.hand.findIndex((c) => c.uid === cardUid);
  if (idx < 0) fail('Card not in hand');
  const def = getDef(p.hand[idx].defId);
  if (def.kind !== 'spell') fail('That is not a spell');
  const spell = def as SpellDef;
  if (!canCastNow(s, p, spell)) fail(`${spell.name} can't be cast right now`);
  if (!spellChoices(s, p, spell).some((c) => sameChoice(c, choice))) fail('Invalid target');

  discardCard(s, p.hand.splice(idx, 1)[0]);
  log(s, `${p.name} casts ${spell.name}.`);

  switch (spell.id) {
    case 'excavate':
      drawRoom(s, p);
      drawRoom(s, p);
      break;
    case 'dark_insight':
      drawRoom(s, p);
      drawSpell(s, p);
      break;
    case 'iron_will':
      healWound(s, p);
      break;
    case 'treasure_lure': {
      const t = (choice as Extract<SpellChoice, { kind: 'treasure' }>).treasure;
      const bonus = (s.mods.treasureBonus[p.id] ??= {});
      bonus[t] = (bonus[t] ?? 0) + 2;
      break;
    }
    case 'cave_in': {
      const { playerId, slot } = choice as Extract<SpellChoice, { kind: 'room' }>;
      const target = s.players[playerId];
      const destroyed = target.dungeon[slot].stack.pop()!;
      discardCard(s, destroyed);
      if (target.dungeon[slot].stack.length === 0) target.dungeon.splice(slot, 1);
      log(s, `${getRoom(destroyed.defId).name} in ${target.name}'s dungeon is destroyed.`);
      break;
    }
    case 'enrage': {
      const { slot } = choice as Extract<SpellChoice, { kind: 'room' }>;
      const uid = topRoom(p, slot)!.uid;
      s.mods.roomBonus[uid] = (s.mods.roomBonus[uid] ?? 0) + 3;
      break;
    }
    case 'fireball': {
      const { heroUid } = choice as Extract<SpellChoice, { kind: 'hero' }>;
      const hero = takeHeroIfDead(s, heroUid, 3);
      if (hero) killHero(s, p, hero, null);
      break;
    }
    case 'fog': {
      const { heroUid } = choice as Extract<SpellChoice, { kind: 'hero' }>;
      findHero(s, heroUid).skipRooms++;
      break;
    }
    case 'teleport': {
      const { heroUid } = choice as Extract<SpellChoice, { kind: 'hero' }>;
      s.queues[p.id].push(removeHero(s, heroUid));
      log(s, `${getHero(s.queues[p.id].at(-1)!.defId).name} is pulled into ${p.name}'s dungeon.`);
      break;
    }
  }
}

function findHero(s: GameState, uid: string): HeroInst {
  const active = s.adventure?.active;
  if (active?.hero.uid === uid) return active.hero;
  for (const q of Object.values(s.queues)) {
    const hero = q.find((h) => h.uid === uid);
    if (hero) return hero;
  }
  return fail('Hero not found');
}

/** Removes a hero from the door or its queue; clears the window if it was at the door. */
function removeHero(s: GameState, uid: string): HeroInst {
  const adv = s.adventure!;
  if (adv.active?.hero.uid === uid) {
    const hero = adv.active.hero;
    adv.active = null;
    adv.awaiting = [];
    return hero;
  }
  for (const q of Object.values(s.queues)) {
    const idx = q.findIndex((h) => h.uid === uid);
    if (idx >= 0) return q.splice(idx, 1)[0];
  }
  return fail('Hero not found');
}

/** Deals spell damage to a hero, removing and returning it if that kills it. */
function takeHeroIfDead(s: GameState, uid: string, dmg: number): HeroInst | null {
  const hero = findHero(s, uid);
  hero.damage += dmg;
  log(s, `${getHero(hero.defId).name} takes ${dmg} damage.`);
  return hero.damage >= getHero(hero.defId).health ? removeHero(s, uid) : null;
}

function endTurn(s: GameState) {
  s.adventure = null;
  for (const p of activePlayers(s)) {
    if (woundTotal(p) >= MAX_WOUNDS) {
      p.eliminated = true;
      log(s, `${getBoss(p.bossId).name} has taken ${MAX_WOUNDS} wounds and is defeated!`);
    }
  }
  // Heroes don't carry damage between turns.
  for (const h of s.town) h.damage = 0;

  const alive = activePlayers(s);
  const soulWinners = alive.filter((p) => soulTotal(p) >= WIN_SOULS);
  // With the decks empty, heroes stuck in Town on a tie could otherwise stall the game.
  const outOfHeroes = s.heroDeck.length === 0 && s.epicDeck.length === 0 && (s.town.length === 0 || s.luredThisTurn === 0);

  if (soulWinners.length > 0) finish(s, soulWinners);
  else if (alive.length <= 1) finish(s, alive.length === 1 ? alive : s.players);
  else if (outOfHeroes) {
    log(s, 'No heroes remain. The Boss with the most souls wins.');
    finish(s, alive);
  } else beginTurn(s);
}

/** Ends the game; among candidates, most souls wins and fewest wounds breaks ties. */
function finish(s: GameState, candidates: PlayerState[]) {
  const score = (p: PlayerState) => soulTotal(p) * 100 - woundTotal(p);
  const best = Math.max(...candidates.map(score));
  s.winners = candidates.filter((p) => score(p) === best).map((p) => p.id);
  s.phase = 'gameOver';
  log(s, `Victory: ${s.winners.map((id) => s.players[id].name).join(' & ')}!`);
}
