import { useEffect, useMemo, useRef, useState } from 'react';
import { TREASURE_LABEL, getBoss, getDef, getHero, getRoom } from '../engine/cards';
import { canCastNow, legalBuildSlots, soulTotal, spellChoices, turnOrder, woundTotal } from '../engine/game';
import type { GameConfig, SpellChoice, SpellDef, Treasure } from '../engine/types';
import { HandCard, HeroChip, TreasureIcon } from './cards';
import { PlayerArea } from './PlayerArea';
import { useGame } from './useGame';

const ME = 0;

type Mode = { kind: 'idle' } | { kind: 'build'; cardUid: string } | { kind: 'cast'; cardUid: string };

const PHASE_NAME = {
  setupDiscard: 'Setup',
  setupBuild: 'Setup',
  build: 'Build',
  adventure: 'Adventure',
  gameOver: 'Game Over',
};

export function GameScreen({ config, onQuit }: { config: GameConfig; onQuit: () => void }) {
  const { state, dispatch, error, clearError, paused, setPaused, fast, setFast } = useGame(config);
  const me = state.players[ME];
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [discards, setDiscards] = useState<string[]>([]);

  // Drop any half-finished selection once the card leaves the hand or the phase moves on.
  const modeCard = mode.kind === 'idle' ? null : me.hand.find((c) => c.uid === mode.cardUid);
  useEffect(() => {
    if (mode.kind !== 'idle' && !modeCard) setMode({ kind: 'idle' });
  }, [mode, modeCard]);
  useEffect(() => {
    setMode({ kind: 'idle' });
  }, [state.phase]);

  const castDef = mode.kind === 'cast' && modeCard ? (getDef(modeCard.defId) as SpellDef) : null;
  const choices: SpellChoice[] = useMemo(
    () => (castDef && canCastNow(state, me, castDef) ? spellChoices(state, me, castDef) : []),
    [state, me, castDef],
  );
  const buildSlots = mode.kind === 'build' ? legalBuildSlots(me, mode.cardUid) : [];

  const cast = (choice: SpellChoice) => {
    if (mode.kind !== 'cast') return;
    dispatch({ type: 'CAST_SPELL', playerId: ME, cardUid: mode.cardUid, choice });
    setMode({ kind: 'idle' });
  };
  const build = (slot: number | 'new') => {
    if (mode.kind !== 'build') return;
    dispatch({ type: 'SUBMIT_BUILD', playerId: ME, build: { cardUid: mode.cardUid, slot } });
    setMode({ kind: 'idle' });
  };

  const roomTargetsFor = (playerId: number) => {
    const set = new Set<number>();
    if (playerId === ME) buildSlots.forEach((slot) => typeof slot === 'number' && set.add(slot));
    for (const c of choices) if (c.kind === 'room' && c.playerId === playerId) set.add(c.slot);
    return set;
  };
  const heroTargets = new Set(choices.flatMap((c) => (c.kind === 'hero' ? [c.heroUid] : [])));

  const building = state.phase === 'build' || state.phase === 'setupBuild';
  const onHandClick = (uid: string, defId: string) => {
    const def = getDef(defId);
    if (state.phase === 'setupDiscard' && !me.ready) {
      setDiscards((d) => (d.includes(uid) ? d.filter((x) => x !== uid) : d.length < 2 ? [...d, uid] : d));
    } else if (def.kind === 'room' && building && !me.ready) {
      setMode(mode.kind === 'build' && mode.cardUid === uid ? { kind: 'idle' } : { kind: 'build', cardUid: uid });
    } else if (def.kind === 'spell' && canCastNow(state, me, def)) {
      setMode(mode.kind === 'cast' && mode.cardUid === uid ? { kind: 'idle' } : { kind: 'cast', cardUid: uid });
    }
  };
  const isPlayable = (uid: string, defId: string) => {
    const def = getDef(defId);
    if (state.phase === 'setupDiscard') return !me.ready;
    if (def.kind === 'room') return building && !me.ready && legalBuildSlots(me, uid).length > 0;
    return def.kind === 'spell' && canCastNow(state, me, def);
  };

  const opponents = state.players.filter((p) => p.id !== ME);
  const order = turnOrder(state);

  return (
    <div className="game">
      <header className="topbar">
        <h1>BossForge</h1>
        <div className="phase">
          <span className="turn">Turn {state.turn}</span>
          <span className={`phase-pill phase-${state.phase}`}>{PHASE_NAME[state.phase]}</span>
        </div>
        <div className="decks" title="Cards left in each deck">
          Rooms {state.roomDeck.length} · Spells {state.spellDeck.length} · Heroes {state.heroDeck.length}
          {state.epicDeck.length > 0 && ` (+${state.epicDeck.length} epic)`}
        </div>
        <div className="order" title="Turn order (highest XP first)">
          Order: {order.map((p) => p.name).join(' → ')}
        </div>
        <button className="ghost" onClick={onQuit}>
          Quit
        </button>
      </header>

      <main className="board">
        <div className="table">
          {opponents.map((p) => (
            <PlayerArea
              key={p.id}
              state={state}
              player={p}
              isMe={false}
              roomTargets={roomTargetsFor(p.id)}
              canBuildNew={false}
              heroTargets={heroTargets}
              onRoomClick={(slot) => cast({ kind: 'room', playerId: p.id, slot })}
              onNewClick={() => {}}
              onHeroClick={(heroUid) => cast({ kind: 'hero', heroUid })}
            />
          ))}

          <section className="town">
            <h2>Town</h2>
            <div className="town-heroes">
              {state.town.length === 0 && <span className="muted">No heroes waiting.</span>}
              {state.town.map((h) => (
                <HeroChip key={h.uid} hero={h} />
              ))}
            </div>
            <p className="muted small">
              Heroes go to the dungeon with the most of their treasure (<TreasureIcon t="cleric" /> cleric{' '}
              <TreasureIcon t="fighter" /> fighter <TreasureIcon t="mage" /> mage <TreasureIcon t="thief" /> thief). Ties stay
              in Town.
            </p>
          </section>

          <PlayerArea
            state={state}
            player={me}
            isMe
            roomTargets={roomTargetsFor(ME)}
            canBuildNew={buildSlots.includes('new')}
            heroTargets={heroTargets}
            onRoomClick={(slot) => (mode.kind === 'build' ? build(slot) : cast({ kind: 'room', playerId: ME, slot }))}
            onNewClick={() => build('new')}
            onHeroClick={(heroUid) => cast({ kind: 'hero', heroUid })}
          />

          <div className="prompt">
            {renderPrompt()}
            {error && (
              <div className="error" onClick={clearError}>
                {error}
              </div>
            )}
          </div>

          <section className="hand">
            {me.hand.map((c) => (
              <HandCard
                key={c.uid}
                defId={c.defId}
                selected={discards.includes(c.uid) || (mode.kind !== 'idle' && mode.cardUid === c.uid)}
                dim={!isPlayable(c.uid, c.defId)}
                onClick={() => onHandClick(c.uid, c.defId)}
              />
            ))}
            {me.hand.length === 0 && <span className="muted">Your hand is empty.</span>}
          </section>
        </div>

        <Log entries={state.log} />
      </main>

      {state.phase === 'gameOver' && (
        <div className="overlay">
          <div className="modal">
            <h2>{state.winners.includes(ME) ? 'Victory!' : 'Defeat'}</h2>
            <p>{state.log.at(-1)?.text}</p>
            <table className="scores">
              <tbody>
                {state.players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{getBoss(p.bossId).name}</td>
                    <td>☠ {soulTotal(p)}</td>
                    <td>♥ {woundTotal(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={onQuit}>New game</button>
          </div>
        </div>
      )}
    </div>
  );

  function renderPrompt() {
    if (state.phase === 'gameOver') return null;

    if (mode.kind === 'build' && modeCard) {
      return (
        <div className="prompt-row">
          <span>
            Build <strong>{getRoom(modeCard.defId).name}</strong>: pick a highlighted spot in your dungeon.
            {getRoom(modeCard.defId).advanced && ' Advanced rooms go over an ordinary room with a matching treasure.'}
          </span>
          <button className="ghost" onClick={() => setMode({ kind: 'idle' })}>
            Cancel
          </button>
        </div>
      );
    }

    if (castDef) {
      const needs: Record<SpellDef['target'], string> = {
        none: '',
        anyRoom: 'Choose a room in any dungeon.',
        ownRoom: 'Choose a room in your dungeon.',
        ownHero: 'Choose a hero heading into your dungeon.',
        opponentHero: "Choose a hero heading into an opponent's dungeon.",
        treasure: 'Choose a treasure type.',
      };
      return (
        <div className="prompt-row">
          <span>
            <strong>{castDef.name}</strong>: {castDef.text} {choices.length === 0 ? 'There are no valid targets.' : needs[castDef.target]}
          </span>
          {castDef.target === 'none' && choices.length > 0 && <button onClick={() => cast({ kind: 'none' })}>Cast</button>}
          {castDef.target === 'treasure' &&
            (Object.keys(TREASURE_LABEL) as Treasure[]).map((t) => (
              <button key={t} onClick={() => cast({ kind: 'treasure', treasure: t })}>
                <TreasureIcon t={t} /> {t}
              </button>
            ))}
          <button className="ghost" onClick={() => setMode({ kind: 'idle' })}>
            Cancel
          </button>
        </div>
      );
    }

    switch (state.phase) {
      case 'setupDiscard':
        return (
          <div className="prompt-row">
            <span>Choose 2 cards to discard ({discards.length}/2). Keep at least one ordinary room to open your dungeon.</span>
            <button
              disabled={discards.length !== 2}
              onClick={() => {
                dispatch({ type: 'DISCARD_SETUP', playerId: ME, cardUids: discards });
                setDiscards([]);
              }}
            >
              Discard
            </button>
          </div>
        );
      case 'setupBuild':
        return <div className="prompt-row">Choose a room from your hand to build as your first room.</div>;
      case 'build':
        return (
          <div className="prompt-row">
            <span>Choose a room to build (built rooms are revealed together), or cast a Build spell first.</span>
            <button className="ghost" onClick={() => dispatch({ type: 'SUBMIT_BUILD', playerId: ME, build: null })}>
              Build nothing
            </button>
          </div>
        );
      case 'adventure': {
        const active = state.adventure?.active;
        const waitingOnMe = state.adventure?.awaiting.includes(ME);
        if (waitingOnMe && active) {
          const owner = state.players[active.ownerId];
          return (
            <div className="prompt-row">
              <span>
                <strong>{getHero(active.hero.defId).name}</strong> is at the entrance of {owner.id === ME ? 'your' : `${owner.name}'s`} dungeon.
                Cast an Adventure spell, or let them in.
              </span>
              <button onClick={() => dispatch({ type: 'PASS_WINDOW', playerId: ME })}>Let them in</button>
            </div>
          );
        }
        return (
          <div className="prompt-row">
            <span>Heroes are adventuring…</span>
            <button className="ghost" onClick={() => setPaused(!paused)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            {paused && <button onClick={() => dispatch({ type: 'ADVANCE' })}>Step</button>}
            <label className="toggle">
              <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast
            </label>
          </div>
        );
      }
    }
  }
}

function Log({ entries }: { entries: { turn: number; text: string }[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);
  return (
    <aside className="log">
      <h2>Chronicle</h2>
      <div className="log-entries">
        {entries.map((e, i) => (
          <p key={i} className={e.text.startsWith('—') ? 'log-turn' : undefined}>
            {e.text}
          </p>
        ))}
        <div ref={end} />
      </div>
    </aside>
  );
}
