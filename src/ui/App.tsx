import { useState } from 'react';
import { BOSSES, MAX_WOUNDS, WIN_SOULS } from '../engine/cards';
import type { GameConfig } from '../engine/types';
import { BossCard } from './cards';
import { GameScreen } from './GameScreen';

const AI_NAMES = ['The Gloom Court', 'Hollowdeep', 'Rustfang Pits'];

export function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameId, setGameId] = useState(0);
  if (config) return <GameScreen key={gameId} config={config} onQuit={() => setConfig(null)} />;
  return (
    <StartScreen
      onStart={(c) => {
        setGameId((n) => n + 1);
        setConfig(c);
      }}
    />
  );
}

function StartScreen({ onStart }: { onStart: (c: GameConfig) => void }) {
  const [name, setName] = useState('');
  const [opponents, setOpponents] = useState(1);
  const [bossId, setBossId] = useState<string | undefined>(undefined);

  return (
    <div className="start">
      <h1 className="logo">BossForge</h1>
      <p className="tagline">Build a deadly dungeon. Lure greedy heroes. Harvest their souls.</p>

      <div className="setup-panel">
        <label>
          Your name
          <input value={name} placeholder="Player" onChange={(e) => setName(e.target.value)} maxLength={20} />
        </label>
        <label>
          AI opponents
          <div className="seg">
            {[1, 2, 3].map((n) => (
              <button key={n} className={n === opponents ? 'on' : 'ghost'} onClick={() => setOpponents(n)}>
                {n}
              </button>
            ))}
          </div>
        </label>
      </div>

      <h2>Choose your Boss</h2>
      <p className="muted small">Higher XP builds first. Each Boss levels up once its dungeon has 5 rooms.</p>
      <div className="boss-pick">
        <button className={`random-boss${bossId ? '' : ' on'}`} onClick={() => setBossId(undefined)}>
          ? <span>Random</span>
        </button>
        {BOSSES.map((b) => (
          <BossCard key={b.id} def={b} selected={b.id === bossId} onClick={() => setBossId(b.id)} />
        ))}
      </div>

      <button
        className="start-btn"
        onClick={() =>
          onStart({
            players: [
              { name: name.trim() || 'Player', isAI: false, bossId },
              ...AI_NAMES.slice(0, opponents).map((n) => ({ name: n, isAI: true })),
            ],
          })
        }
      >
        Enter the Dungeon
      </button>

      <details className="rules">
        <summary>How to play</summary>
        <ol>
          <li>
            <strong>Setup:</strong> draw 5 Rooms and 2 Spells, discard 2, then build your first room.
          </li>
          <li>
            <strong>Each turn</strong> one hero per Boss arrives in Town, and everyone draws a Room.
          </li>
          <li>
            <strong>Build:</strong> secretly choose one room to build: a new room at your entrance (max 5), or a room on top of an
            existing one. Advanced rooms must cover an ordinary room that shares a treasure type. Build spells can be cast now.
          </li>
          <li>
            <strong>Bait:</strong> each hero goes to the dungeon showing the most of their treasure (your Boss counts too). Ties stay
            in Town.
          </li>
          <li>
            <strong>Adventure:</strong> heroes walk from your entrance to your Boss, taking each room's damage. Before each hero
            enters, Adventure spells can be cast.
          </li>
          <li>
            A slain hero becomes a <strong>Soul</strong>; one that reaches your Boss deals a <strong>Wound</strong>. Epic heroes count
            double. Reach {WIN_SOULS} souls to win. Take {MAX_WOUNDS} wounds and you are defeated.
          </li>
        </ol>
      </details>
      <p className="muted small fineprint">
        BossForge is an original fan project inspired by dungeon-building card games. All card names and text are original.
      </p>
    </div>
  );
}
