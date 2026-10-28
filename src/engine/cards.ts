// The BossForge card set. All names and text are original to this project;
// only the general game structure is inspired by dungeon-building card games.

import type { BossDef, CardDef, HeroDef, RoomDef, SpellDef, Treasure } from './types';

const room = (
  id: string,
  name: string,
  roomType: RoomDef['roomType'],
  damage: number,
  treasure: Treasure[],
  text?: string,
  advanced = false,
): RoomDef => ({ id, kind: 'room', name, roomType, damage, treasure, text, advanced });

export const ROOMS: RoomDef[] = [
  // Ordinary monster rooms
  room('kobold_warren', 'Kobold Warren', 'monster', 1, ['fighter'], '+1 damage for each adjacent Monster room.'),
  room('skeleton_crypt', 'Skeleton Crypt', 'monster', 2, ['cleric'], 'When a hero dies here, draw a Room card.'),
  room('witch_kitchen', "Witch's Kitchen", 'monster', 2, ['mage'], 'When a hero dies here, draw a Spell card.'),
  room('bat_roost', 'Bat Roost', 'monster', 1, ['thief'], 'When you build this room, draw a Spell card.'),
  room('orc_barracks', 'Orc Barracks', 'monster', 3, ['fighter']),
  room('ogre_larder', 'Ogre Larder', 'monster', 3, ['thief']),
  room('jelly_hall', 'Jelly Hall', 'monster', 1, ['cleric', 'mage']),
  room('gargoyle_gate', 'Gargoyle Gate', 'monster', 1, ['cleric'], '+2 damage if this is the last room before your Boss.'),
  // Ordinary trap rooms
  room('spike_corridor', 'Spike Corridor', 'trap', 1, ['fighter'], '+2 damage if this is the dungeon entrance.'),
  room('rolling_boulder', 'Rolling Boulder', 'trap', 3, ['thief']),
  room('poison_darts', 'Poison Darts', 'trap', 2, ['thief'], 'When you build this room, draw a Room card.'),
  room('arcane_glyph', 'Arcane Glyph', 'trap', 2, ['mage'], '+1 damage for each adjacent Trap room.'),
  room('collapsing_ceiling', 'Collapsing Ceiling', 'trap', 2, ['cleric']),
  room('gilded_vault', 'Gilded Vault', 'trap', 1, ['thief', 'thief']),
  room('cursed_library', 'Cursed Library', 'trap', 1, ['mage', 'mage']),
  room('profane_altar', 'Profane Altar', 'trap', 1, ['cleric', 'cleric']),
  room('weapon_rack', 'Weapon Rack', 'trap', 1, ['fighter', 'fighter']),
  // Advanced rooms: must be built over an ordinary room sharing a treasure type
  room('dragon_hoard', "Dragon's Hoard", 'monster', 4, ['thief'], 'When a hero dies here, draw a Spell card.', true),
  room('lich_sanctum', 'Lich Sanctum', 'monster', 3, ['mage', 'cleric'], 'When a hero dies here, draw a Room card and a Spell card.', true),
  room('minotaur_maze', 'Minotaur Maze', 'monster', 2, ['fighter'], '+1 damage for each other Monster room in your dungeon.', true),
  room('lava_moat', 'Lava Moat', 'trap', 4, ['fighter'], undefined, true),
  room('dimensional_rift', 'Dimensional Rift', 'trap', 2, ['mage'], 'Adjacent Trap rooms deal +1 damage.', true),
  room('pit_of_penance', 'Pit of Penance', 'trap', 3, ['cleric'], 'When a hero dies here, heal 1 wound from your Boss.', true),
];

const spell = (id: string, name: string, phase: SpellDef['phase'], target: SpellDef['target'], text: string): SpellDef => ({
  id,
  kind: 'spell',
  name,
  phase,
  target,
  text,
});

export const SPELLS: SpellDef[] = [
  spell('excavate', 'Excavate', 'build', 'none', 'Draw 2 Room cards.'),
  spell('cave_in', 'Cave-In', 'build', 'anyRoom', 'Destroy a room in any dungeon. The room beneath it, if any, becomes active.'),
  spell('treasure_lure', 'Treasure Lure', 'build', 'treasure', 'Choose a treasure type. Your dungeon has +2 of it this turn.'),
  spell('dark_insight', 'Dark Insight', 'any', 'none', 'Draw a Room card and a Spell card.'),
  spell('fireball', 'Fireball', 'adventure', 'ownHero', 'Deal 3 damage to a hero heading into your dungeon.'),
  spell('enrage', 'Enrage', 'adventure', 'ownRoom', 'A room in your dungeon deals +3 damage this turn.'),
  spell('teleport', 'Teleport Trap', 'adventure', 'opponentHero', "Steal a hero heading into an opponent's dungeon. It joins the back of your line."),
  spell('fog', 'Fog of War', 'adventure', 'opponentHero', "A hero heading into an opponent's dungeon skips the first room."),
  spell('iron_will', 'Iron Will', 'any', 'none', 'Heal 1 wound from your Boss.'),
];

export const SPELL_COUNTS: Record<string, number> = {
  excavate: 2,
  cave_in: 2,
  treasure_lure: 2,
  dark_insight: 2,
  fireball: 2,
  enrage: 2,
  teleport: 2,
  fog: 2,
  iron_will: 1,
};

const boss = (id: string, name: string, xp: number, treasure: Treasure, levelUpText: string): BossDef => ({
  id,
  kind: 'boss',
  name,
  xp,
  treasure,
  levelUpText,
});

export const BOSSES: BossDef[] = [
  boss('grimjaw', 'Grimjaw the Hoarder', 300, 'thief', 'Draw 2 Spell cards.'),
  boss('vexa', 'Vexa, Queen of Webs', 340, 'mage', 'Your Trap rooms deal +1 damage for the rest of the game.'),
  boss('mordrake', 'Mordrake the Undying', 380, 'cleric', 'Heal up to 2 wounds.'),
  boss('brakka', 'Brakka Ironhide', 420, 'fighter', 'Your Monster rooms deal +1 damage for the rest of the game.'),
  boss('sylith', 'Sylith the Whisper', 460, 'mage', 'Draw 3 Room cards.'),
  boss('korrgath', "Korr'gath, Pit Tyrant", 500, 'fighter', 'Each opponent discards a random Spell card.'),
  boss('matron', 'The Hollow Matron', 540, 'cleric', 'Your dungeon has +1 of every treasure type for the rest of the game.'),
  boss('zarnak', 'Zarnak the Gold-Eater', 580, 'thief', 'Your entrance room deals +2 damage for the rest of the game.'),
];

const hero = (id: string, name: string, treasure: Treasure, health: number, epic = false): HeroDef => ({
  id,
  kind: 'hero',
  name,
  treasure,
  health,
  epic,
});

export const HEROES: HeroDef[] = [
  hero('acolyte_wren', 'Acolyte Wren', 'cleric', 4),
  hero('brother_tobias', 'Brother Tobias', 'cleric', 6),
  hero('sister_maela', 'Sister Maela', 'cleric', 6),
  hero('priest_oren', 'High Priest Oren', 'cleric', 8),
  hero('squire_pell', 'Squire Pell', 'fighter', 4),
  hero('sellsword_dagna', 'Sellsword Dagna', 'fighter', 6),
  hero('captain_rourke', 'Captain Rourke', 'fighter', 6),
  hero('sir_halvard', 'Sir Halvard', 'fighter', 8),
  hero('apprentice_lio', 'Apprentice Lio', 'mage', 4),
  hero('hedge_witch_mora', 'Hedge Witch Mora', 'mage', 6),
  hero('pyromancer_zed', 'Pyromancer Zed', 'mage', 6),
  hero('archmage_quill', 'Archmage Quill', 'mage', 8),
  hero('pickpocket_fen', 'Pickpocket Fen', 'thief', 4),
  hero('cutpurse_nyx', 'Cutpurse Nyx', 'thief', 6),
  hero('burglar_tamsin', 'Burglar Tamsin', 'thief', 6),
  hero('shadow_ivo', 'Shadow Ivo', 'thief', 8),
  // Epic heroes arrive once the ordinary heroes run out
  hero('saint_aurelia', 'Saint Aurelia', 'cleric', 11, true),
  hero('paladin_garrick', 'Paladin Garrick', 'cleric', 13, true),
  hero('warlord_brenna', 'Warlord Brenna', 'fighter', 11, true),
  hero('dragonslayer_kael', 'Dragonslayer Kael', 'fighter', 13, true),
  hero('grand_magus_elowen', 'Grand Magus Elowen', 'mage', 11, true),
  hero('archon_vesper', 'Archon Vesper', 'mage', 13, true),
  hero('guildmaster_sable', 'Guildmaster Sable', 'thief', 11, true),
  hero('phantom_rook', 'Phantom Rook', 'thief', 13, true),
];

/** Ordinary rooms appear twice in the deck, advanced rooms once. */
export const roomCount = (def: RoomDef) => (def.advanced ? 1 : 2);

const ALL: CardDef[] = [...ROOMS, ...SPELLS, ...BOSSES, ...HEROES];
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function getDef(id: string): CardDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown card id: ${id}`);
  return def;
}

export const getRoom = (id: string) => getDef(id) as RoomDef;
export const getSpell = (id: string) => getDef(id) as SpellDef;
export const getBoss = (id: string) => getDef(id) as BossDef;
export const getHero = (id: string) => getDef(id) as HeroDef;

export const TREASURE_LABEL: Record<Treasure, string> = {
  cleric: 'Relic',
  fighter: 'Blade',
  mage: 'Tome',
  thief: 'Gold',
};

export const WIN_SOULS = 10;
export const MAX_WOUNDS = 5;
export const MAX_ROOMS = 5;
