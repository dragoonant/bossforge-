// Core data model for the BossForge rules engine. Everything here is plain,
// serialisable data so game states can be cloned, saved and replayed.

export type Treasure = 'cleric' | 'fighter' | 'mage' | 'thief';
export const TREASURES: Treasure[] = ['cleric', 'fighter', 'mage', 'thief'];

export type RoomType = 'monster' | 'trap';
export type SpellPhase = 'build' | 'adventure' | 'any';

/** What a spell needs the caster to pick when it is cast. */
export type SpellTarget =
  | 'none'
  | 'anyRoom' // a room in any dungeon
  | 'ownRoom' // a room in the caster's dungeon
  | 'ownHero' // a hero queued for the caster's dungeon
  | 'opponentHero' // a hero queued for an opponent's dungeon
  | 'treasure'; // a treasure type

export interface RoomDef {
  id: string;
  kind: 'room';
  name: string;
  roomType: RoomType;
  advanced: boolean;
  damage: number;
  treasure: Treasure[];
  text?: string;
}

export interface SpellDef {
  id: string;
  kind: 'spell';
  name: string;
  phase: SpellPhase;
  target: SpellTarget;
  text: string;
}

export interface BossDef {
  id: string;
  kind: 'boss';
  name: string;
  xp: number;
  treasure: Treasure;
  levelUpText: string;
}

export interface HeroDef {
  id: string;
  kind: 'hero';
  name: string;
  treasure: Treasure;
  health: number;
  epic: boolean;
}

export type CardDef = RoomDef | SpellDef | BossDef | HeroDef;

/** A physical card in play; `defId` points at its definition. */
export interface CardInst {
  uid: string;
  defId: string;
}

export interface HeroInst extends CardInst {
  damage: number;
  /** Rooms the hero will bypass on its next trip through a dungeon. */
  skipRooms: number;
}

/** One slot in a dungeon. Rooms built on top of others stack; the last entry is active. */
export interface RoomSlot {
  stack: CardInst[];
}

export interface PlayerState {
  id: number;
  name: string;
  isAI: boolean;
  bossId: string;
  hand: CardInst[];
  /** Index 0 is the entrance; the boss sits after the last slot. */
  dungeon: RoomSlot[];
  souls: HeroInst[];
  wounds: HeroInst[];
  leveledUp: boolean;
  eliminated: boolean;
  /** Set once the player has finished the current simultaneous step. */
  ready: boolean;
  pendingBuild: PendingBuild | null;
}

export interface PendingBuild {
  cardUid: string;
  /** Slot index to build over, or 'new' to open a new room at the entrance. */
  slot: number | 'new';
}

export type Phase =
  | 'setupDiscard'
  | 'setupBuild'
  | 'build'
  | 'adventure'
  | 'gameOver';

export interface ActiveHero {
  hero: HeroInst;
  ownerId: number;
  /** Next room index the hero will enter; equals dungeon length when at the boss. */
  roomIndex: number;
  /** True until the hero has stepped into the first room. */
  atDoor: boolean;
}

export interface AdventureState {
  /** The hero currently at a dungeon door or walking through it. */
  active: ActiveHero | null;
  /** Players still deciding whether to cast spells before the active hero enters. */
  awaiting: number[];
}

export interface TurnModifiers {
  /** Extra damage on a specific room (by top card uid) for this turn. */
  roomBonus: Record<string, number>;
  /** Extra treasure per player for this turn. */
  treasureBonus: Record<number, Partial<Record<Treasure, number>>>;
}

export interface GameState {
  rng: number;
  nextUid: number;
  turn: number;
  phase: Phase;
  players: PlayerState[];
  roomDeck: CardInst[];
  roomDiscard: CardInst[];
  spellDeck: CardInst[];
  spellDiscard: CardInst[];
  heroDeck: HeroInst[];
  epicDeck: HeroInst[];
  town: HeroInst[];
  /** Heroes lured to each player's dungeon, waiting to adventure. */
  queues: Record<number, HeroInst[]>;
  adventure: AdventureState | null;
  mods: TurnModifiers;
  log: LogEntry[];
  /** Heroes that left Town this turn; used to end a game stuck on tied heroes. */
  luredThisTurn: number;
  winners: number[];
}

export interface LogEntry {
  turn: number;
  text: string;
}

export type SpellChoice =
  | { kind: 'none' }
  | { kind: 'room'; playerId: number; slot: number }
  | { kind: 'hero'; heroUid: string }
  | { kind: 'treasure'; treasure: Treasure };

export type Action =
  | { type: 'DISCARD_SETUP'; playerId: number; cardUids: string[] }
  | { type: 'SUBMIT_BUILD'; playerId: number; build: PendingBuild | null }
  | { type: 'CAST_SPELL'; playerId: number; cardUid: string; choice: SpellChoice }
  | { type: 'PASS_WINDOW'; playerId: number }
  | { type: 'ADVANCE' };

export interface GameConfig {
  players: { name: string; isAI: boolean; bossId?: string }[];
  seed?: number;
}
