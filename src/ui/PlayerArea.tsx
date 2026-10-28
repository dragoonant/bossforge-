import { MAX_WOUNDS, WIN_SOULS, getBoss, getDef, getRoom } from '../engine/cards';
import { roomDamage, soulTotal, topRoom, woundTotal } from '../engine/game';
import type { GameState, PlayerState } from '../engine/types';
import { BossCard, HeroChip, RoomCard } from './cards';

interface Props {
  state: GameState;
  player: PlayerState;
  isMe: boolean;
  /** Slots that are valid targets for the current build or spell. */
  roomTargets: Set<number>;
  canBuildNew: boolean;
  heroTargets: Set<string>;
  onRoomClick: (slot: number) => void;
  onNewClick: () => void;
  onHeroClick: (uid: string) => void;
}

export function PlayerArea({ state, player, isMe, roomTargets, canBuildNew, heroTargets, onRoomClick, onNewClick, onHeroClick }: Props) {
  const boss = getBoss(player.bossId);
  const active = state.adventure?.active?.ownerId === player.id ? state.adventure.active : null;
  const queue = state.queues[player.id] ?? [];
  const souls = soulTotal(player);
  const wounds = woundTotal(player);
  const spellsInHand = player.hand.filter((c) => getDef(c.defId).kind === 'spell').length;

  const heroChip = (hero = active!.hero) => (
    <HeroChip
      hero={hero}
      walking={active?.hero.uid === hero.uid}
      highlight={heroTargets.has(hero.uid)}
      onClick={heroTargets.has(hero.uid) ? () => onHeroClick(hero.uid) : undefined}
    />
  );

  return (
    <section className={`player-area${isMe ? ' me' : ''}${player.eliminated ? ' eliminated' : ''}`}>
      <header className="player-head">
        <h2>
          {player.name}
          {player.eliminated && <span className="tag danger">Defeated</span>}
          {state.phase === 'build' && player.ready && <span className="tag">Ready</span>}
        </h2>
        <div className="meters">
          <span className="meter souls" title={`Souls: win at ${WIN_SOULS}`}>
            ☠ {souls}/{WIN_SOULS}
          </span>
          <span className="meter wounds" title={`Wounds: defeated at ${MAX_WOUNDS}`}>
            ♥ {wounds}/{MAX_WOUNDS}
          </span>
          {!isMe && (
            <span className="meter" title="Cards in hand (rooms / spells)">
              🂠 {player.hand.length - spellsInHand}R · {spellsInHand}S
            </span>
          )}
        </div>
      </header>

      <div className="dungeon-row">
        <div className="door">
          <span className="door-label">Entrance</span>
          {active?.atDoor && heroChip()}
          {queue.length > 0 && (
            <div className="queue" title="Heroes waiting to enter">
              {queue.map((h) => (
                <div key={h.uid}>{heroChip(h)}</div>
              ))}
            </div>
          )}
        </div>

        {canBuildNew && (
          <button className="slot-new" onClick={onNewClick}>
            + Build here
          </button>
        )}

        {player.dungeon.map((slot, i) => {
          const card = topRoom(player, i)!;
          const heroHere = active && !active.atDoor && active.roomIndex - 1 === i;
          return (
            <div className="slot" key={card.uid}>
              <div className="hero-spot">{heroHere && heroChip()}</div>
              <RoomCard
                def={getRoom(card.defId)}
                damage={roomDamage(state, player, i)}
                covered={slot.stack.length - 1}
                highlight={roomTargets.has(i)}
                onClick={roomTargets.has(i) ? () => onRoomClick(i) : undefined}
              />
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 5 - player.dungeon.length - (canBuildNew ? 1 : 0)) }, (_, i) => (
          <div className="slot empty" key={`empty${i}`} />
        ))}

        <div className="arrow">→</div>
        <BossCard def={boss} leveledUp={player.leveledUp} />
      </div>
    </section>
  );
}
