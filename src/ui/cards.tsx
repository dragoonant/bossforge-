import type { ReactNode } from 'react';
import { TREASURE_LABEL, getBoss, getDef, getHero } from '../engine/cards';
import type { BossDef, HeroInst, RoomDef, SpellDef, Treasure } from '../engine/types';

const TREASURE_GLYPH: Record<Treasure, string> = {
  cleric: '✚',
  fighter: '⚔',
  mage: '✦',
  thief: '◆',
};

export function TreasureIcon({ t }: { t: Treasure }) {
  return (
    <span className={`treasure treasure-${t}`} title={`${TREASURE_LABEL[t]} (lures ${t}s)`}>
      {TREASURE_GLYPH[t]}
    </span>
  );
}

interface FrameProps {
  className: string;
  selected?: boolean;
  highlight?: boolean;
  dim?: boolean;
  onClick?: () => void;
  title?: string;
  children: ReactNode;
}

function Frame({ className, selected, highlight, dim, onClick, title, children }: FrameProps) {
  const classes = ['card', className, selected && 'selected', highlight && 'highlight', dim && 'dim', onClick && 'clickable'];
  return (
    <div className={classes.filter(Boolean).join(' ')} onClick={onClick} title={title} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

type CardState = Omit<FrameProps, 'className' | 'children'>;

export function RoomCard({ def, damage, covered = 0, ...rest }: { def: RoomDef; damage?: number; covered?: number } & CardState) {
  const shown = damage ?? def.damage;
  const delta = shown - def.damage;
  return (
    <Frame className={`room room-${def.roomType}${def.advanced ? ' advanced' : ''}`} {...rest}>
      <div className="card-head">
        <span className="card-name">{def.name}</span>
      </div>
      <div className="card-type">
        {def.advanced ? 'Advanced ' : ''}
        {def.roomType === 'monster' ? 'Monster' : 'Trap'}
        {covered > 0 && (
          <span className="covered" title={`${covered} room${covered > 1 ? 's' : ''} underneath`}>
            +{covered} below
          </span>
        )}
      </div>
      <div className="room-stats">
        <span className={`damage${delta > 0 ? ' boosted' : ''}`} title="Damage dealt to each hero">
          {shown}
          <small>dmg</small>
        </span>
        <span className="treasures">
          {def.treasure.map((t, i) => (
            <TreasureIcon key={i} t={t} />
          ))}
        </span>
      </div>
      {def.text && <div className="card-text">{def.text}</div>}
    </Frame>
  );
}

const PHASE_LABEL: Record<SpellDef['phase'], string> = { build: 'Build', adventure: 'Adventure', any: 'Any phase' };

export function SpellCard({ def, ...rest }: { def: SpellDef } & CardState) {
  return (
    <Frame className={`spell spell-${def.phase}`} {...rest}>
      <div className="card-head">
        <span className="card-name">{def.name}</span>
      </div>
      <div className="card-type">Spell · {PHASE_LABEL[def.phase]}</div>
      <div className="card-text">{def.text}</div>
    </Frame>
  );
}

export function BossCard({ def, leveledUp, ...rest }: { def: BossDef; leveledUp?: boolean } & CardState) {
  return (
    <Frame className={`boss${leveledUp ? ' leveled' : ''}`} title={`Level Up (5 rooms): ${def.levelUpText}`} {...rest}>
      <div className="card-head">
        <span className="card-name">{def.name}</span>
      </div>
      <div className="card-type">
        Boss · {def.xp} XP <TreasureIcon t={def.treasure} />
      </div>
      <div className="card-text">
        <strong>{leveledUp ? 'Leveled up! ' : 'Level Up: '}</strong>
        {def.levelUpText}
      </div>
    </Frame>
  );
}

export function HandCard({ defId, ...rest }: { defId: string } & CardState) {
  const def = getDef(defId);
  if (def.kind === 'room') return <RoomCard def={def} {...rest} />;
  if (def.kind === 'spell') return <SpellCard def={def} {...rest} />;
  return null;
}

export function HeroChip({ hero, onClick, highlight, walking }: { hero: HeroInst; onClick?: () => void; highlight?: boolean; walking?: boolean }) {
  const def = getHero(hero.defId);
  const left = def.health - hero.damage;
  const classes = ['hero', def.epic && 'epic', highlight && 'highlight', onClick && 'clickable', walking && 'walking'];
  return (
    <div
      className={classes.filter(Boolean).join(' ')}
      onClick={onClick}
      title={`${def.name}: ${def.epic ? 'Epic ' : ''}${def.treasure}, ${left}/${def.health} health${hero.skipRooms ? `, skips ${hero.skipRooms} room` : ''}`}
    >
      <TreasureIcon t={def.treasure} />
      <span className="hero-name">{def.name}</span>
      <span className="hero-hp">
        <span className="hp-bar" style={{ width: `${(left / def.health) * 100}%` }} />
        <span className="hp-text">
          {left}/{def.health}
        </span>
      </span>
    </div>
  );
}

export const bossName = (bossId: string) => getBoss(bossId).name;
