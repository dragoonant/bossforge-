import { useCallback, useEffect, useRef, useState } from 'react';
import { runAI } from '../engine/ai';
import { RuleError, applyAction, createGame } from '../engine/game';
import type { Action, GameConfig, GameState } from '../engine/types';

const step = (s: GameState) => runAI(s, applyAction);

/** Owns the game state for the UI: applies human actions, runs the AI and paces the adventure. */
export function useGame(config: GameConfig) {
  const [state, setState] = useState(() => step(createGame(config)));
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const ref = useRef(state);

  const dispatch = useCallback((action: Action) => {
    try {
      const next = step(applyAction(ref.current, action));
      ref.current = next;
      setState(next);
      setError(null);
    } catch (e) {
      if (e instanceof RuleError) setError(e.message);
      else throw e;
    }
  }, []);

  // Walk heroes through dungeons one step at a time whenever nobody is deciding.
  useEffect(() => {
    if (paused || state.phase !== 'adventure' || state.adventure!.awaiting.length > 0) return;
    const timer = setTimeout(() => dispatch({ type: 'ADVANCE' }), fast ? 250 : 800);
    return () => clearTimeout(timer);
  }, [state, paused, fast, dispatch]);

  return { state, dispatch, error, clearError: () => setError(null), paused, setPaused, fast, setFast };
}
