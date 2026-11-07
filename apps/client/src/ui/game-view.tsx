import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InputController } from '../game/input.ts';
import { Hands } from '../scene/hands.tsx';
import { ExteriorScene } from '../scene/exterior-scene.tsx';
import { PlayerRig } from '../scene/player-rig.tsx';
import { bindInput } from '../services/input-bindings.ts';
import { gameStore, useGame } from '../store/index.ts';
import { Hud } from './hud.tsx';
import { SettingsScreen } from './screens.tsx';

/**
 * The playable view: canvas, input wiring and the "Click to resume" overlay.
 * Pointer lock is requested only from a click. Losing it pauses the game.
 */
export function GameView() {
  const container = useRef<HTMLDivElement>(null);
  const input = useMemo(() => new InputController(), []);
  const phase = useGame((s) => s.game.phase);
  const flags = useGame((s) => s.progress.flags);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    return bindInput({
      element: el,
      input,
      isActive: () => gameStore.getState().game.phase === 'playing',
      onLockChange: (state, pause) => {
        const s = gameStore.getState();
        if (state === 'locked') s.setPhase('playing');
        else if (pause && s.game.phase === 'playing') s.setPhase('paused');
      },
    });
  }, [input]);

  return (
    <div ref={container} className="game-view" data-testid="game-view" data-phase={phase}>
      <Canvas shadows camera={{ fov: 80, near: 0.1, far: 200, position: [0, 1.65, 0] }} dpr={[1, 2]}>
        <ExteriorScene flags={flags} />
        <PlayerRig input={input} />
        <Hands />
      </Canvas>
      {phase === 'playing' && <Hud />}
      {phase !== 'playing' && !showSettings && (
        <div className="resume-overlay" role="dialog" aria-label="Paused">
          <p>Click to resume</p>
          <small>WASD move · Shift sprint · mouse look · Esc pause</small>
          <div className="menu-list">
            <button type="button" onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}>
              Settings
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); gameStore.getState().setPhase('menu'); }}>
              Quit to menu
            </button>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="resume-overlay" onClick={(e) => e.stopPropagation()}>
          <SettingsScreen onBack={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}
