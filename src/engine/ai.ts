// A simple heuristic AI. `chooseAIAction` returns the next action an AI player
// wants to take in the current state, or null if it has nothing to do.

import { getDef, getHero, getRoom } from './cards';
import {
  activePlayers,
  canCastNow,
  legalBuildSlots,
  roomDamage,
  spellChoices,
  targetableHeroes,
  treasureCount,
  turnOrder,
} from './game';
import type { Action, CardInst, GameState, HeroInst, PendingBuild, PlayerState, SpellChoice, SpellDef } from './types';

export function chooseAIAction(s: GameState, playerId: number): Action | null {
  const p = s.players[playerId];
  if (p.eliminated || !p.isAI) return null;

  switch (s.phase) {
    case 'setupDiscard':
      return p.ready ? null : { type: 'DISCARD_SETUP', playerId, cardUids: chooseDiscards(p) };
    case 'setupBuild':
      return p.ready ? null : { type: 'SUBMIT_BUILD', playerId, build: chooseBuild(s, p) };
    case 'build': {
      if (p.ready) return null;
      const cast = chooseSpell(s, p);
      return cast ?? { type: 'SUBMIT_BUILD', playerId, build: chooseBuild(s, p) };
    }
    case 'adventure':
      if (!s.adventure?.awaiting.includes(playerId)) return null;
      return chooseSpell(s, p) ?? { type: 'PASS_WINDOW', playerId };
    default:
      return null;
  }
}

function cardValue(card: CardInst): number {
  const def = getDef(card.defId);
  if (def.kind === 'spell') return 3.5;
  if (def.kind !== 'room') return 0;
  return def.damage + def.treasure.length * 0.8 + (def.text ? 0.5 : 0) - (def.advanced ? 1 : 0);
}

function chooseDiscards(p: PlayerState): string[] {
  const sorted = [...p.hand].sort((a, b) => cardValue(a) - cardValue(b));
  // Never throw away every ordinary room, or there is nothing to open the dungeon with.
  const isOrdinaryRoom = (c: CardInst) => {
    const def = getDef(c.defId);
    return def.kind === 'room' && !def.advanced;
  };
  const picks: CardInst[] = [];
  for (const card of sorted) {
    if (picks.length === 2) break;
    const remaining = p.hand.filter((c) => c !== card && !picks.includes(c));
    if (isOrdinaryRoom(card) && !remaining.some(isOrdinaryRoom)) continue;
    picks.push(card);
  }
  return picks.map((c) => c.uid);
}

/** Total damage a hero would take walking `owner`'s dungeon, honouring skipped rooms. */
export function dungeonDamage(s: GameState, owner: PlayerState, hero?: HeroInst, fromRoom = 0): number {
  let total = 0;
  let skip = hero?.skipRooms ?? 0;
  for (let i = fromRoom; i < owner.dungeon.length; i++) {
    if (skip > 0) {
      skip--;
      continue;
    }
    total += roomDamage(s, owner, i);
  }
  return total;
}

const remainingHealth = (h: HeroInst) => getHero(h.defId).health - h.damage;

/** Scores a dungeon for `p`: raw damage plus whether the heroes in Town would come here and die. */
function evaluate(s: GameState, p: PlayerState): number {
  const damage = dungeonDamage(s, p);
  let score = damage;
  for (const hero of s.town) {
    const t = getHero(hero.defId).treasure;
    const mine = treasureCount(s, p, t);
    const lured = activePlayers(s).every((o) => o.id === p.id || treasureCount(s, o, t) < mine);
    if (lured) score += damage >= remainingHealth(hero) ? 4 : -3;
  }
  return score;
}

function chooseBuild(s: GameState, p: PlayerState): PendingBuild | null {
  let best: { build: PendingBuild; score: number } | null = null;
  for (const card of p.hand) {
    for (const slot of legalBuildSlots(p, card.uid)) {
      const sim = structuredClone(s);
      const sp = sim.players[p.id];
      const placed = sp.hand.find((c) => c.uid === card.uid)!;
      if (slot === 'new') sp.dungeon.unshift({ stack: [placed] });
      else sp.dungeon[slot].stack.push(placed);
      // Opening new rooms is worth a little extra: it works toward levelling up.
      const score = evaluate(sim, sp) + (slot === 'new' ? 1.5 : 0) + (getRoom(card.defId).advanced ? 0.5 : 0);
      if (!best || score > best.score) best = { build: { cardUid: card.uid, slot }, score };
    }
  }
  if (s.phase === 'setupBuild') return best?.build ?? null;
  return best && best.score >= evaluate(s, p) ? best.build : null;
}

function chooseSpell(s: GameState, p: PlayerState): Action | null {
  for (const card of p.hand) {
    const def = getDef(card.defId);
    if (def.kind !== 'spell' || !canCastNow(s, p, def)) continue;
    const choice = pickSpellTarget(s, p, def);
    if (choice) return { type: 'CAST_SPELL', playerId: p.id, cardUid: card.uid, choice };
  }
  return null;
}

/** Returns a target worth casting `def` on, or null to hold the spell. */
function pickSpellTarget(s: GameState, p: PlayerState, def: SpellDef): SpellChoice | null {
  const choices = spellChoices(s, p, def);
  if (choices.length === 0) return null;
  const opponents = activePlayers(s).filter((o) => o.id !== p.id);
  const active = s.adventure?.active;

  switch (def.id) {
    case 'excavate':
    case 'dark_insight':
    case 'iron_will':
      return choices[0];

    case 'cave_in': {
      // Knock out the strongest opposing room, if it is worth a card.
      let best: { choice: SpellChoice; dmg: number } | null = null;
      for (const o of opponents) {
        o.dungeon.forEach((_, slot) => {
          const dmg = roomDamage(s, o, slot);
          if (dmg >= 3 && (!best || dmg > best.dmg)) best = { choice: { kind: 'room', playerId: o.id, slot }, dmg };
        });
      }
      return best ? (best as { choice: SpellChoice }).choice : null;
    }

    case 'treasure_lure': {
      // Pull a hero from Town that this dungeon can kill.
      const damage = dungeonDamage(s, p);
      for (const hero of s.town) {
        const t = getHero(hero.defId).treasure;
        const rival = Math.max(...opponents.map((o) => treasureCount(s, o, t)));
        const mine = treasureCount(s, p, t);
        if (mine <= rival && mine + 2 > rival && damage >= remainingHealth(hero)) return { kind: 'treasure', treasure: t };
      }
      return null;
    }

    case 'fireball': {
      // Finish off a hero that would otherwise survive this dungeon.
      for (const { hero } of targetableHeroes(s, (id) => id === p.id)) {
        const left = remainingHealth(hero);
        const dmg = dungeonDamage(s, p, hero);
        if (dmg < left && dmg + 3 >= left) return { kind: 'hero', heroUid: hero.uid };
      }
      return null;
    }

    case 'enrage': {
      if (!active?.atDoor || active.ownerId !== p.id || p.dungeon.length === 0) return null;
      const left = remainingHealth(active.hero);
      const dmg = dungeonDamage(s, p, active.hero);
      if (dmg >= left || dmg + 3 < left) return null;
      // Enrage the last room so a skipped entrance can't waste it.
      return { kind: 'room', playerId: p.id, slot: p.dungeon.length - 1 };
    }

    case 'teleport': {
      const myDamage = dungeonDamage(s, p);
      for (const { hero } of targetableHeroes(s, (id) => id !== p.id)) {
        if (myDamage >= remainingHealth(hero)) return { kind: 'hero', heroUid: hero.uid };
      }
      return null;
    }

    case 'fog': {
      // Save a hero from an opponent's dungeon if skipping one room lets it survive.
      if (!active?.atDoor || active.ownerId === p.id) return null;
      const owner = s.players[active.ownerId];
      const left = remainingHealth(active.hero);
      const now = dungeonDamage(s, owner, active.hero);
      const fogged = dungeonDamage(s, owner, { ...active.hero, skipRooms: active.hero.skipRooms + 1 });
      return now >= left && fogged < left ? { kind: 'hero', heroUid: active.hero.uid } : null;
    }
  }
  return null;
}

/** Runs every AI decision available right now, returning the resulting state. */
export function runAI(s: GameState, apply: (s: GameState, a: Action) => GameState): GameState {
  for (let guard = 0; guard < 100; guard++) {
    const actor = turnOrder(s).find((p) => p.isAI && chooseAIAction(s, p.id));
    if (!actor) return s;
    s = apply(s, chooseAIAction(s, actor.id)!);
  }
  return s;
}
