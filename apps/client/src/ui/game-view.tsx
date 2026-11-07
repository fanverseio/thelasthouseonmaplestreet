import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { InputController } from '../game/input.ts';
import { attachRuntime } from '../game/save.ts';
import { TUTORIAL_TEXT } from '../content/interactions/beat2.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { createEncounterWorld } from '../game/encounter-runtime.ts';
import { createSkipHold } from '../game/skip-hold.ts';
import { EncounterEnemies } from '../scene/encounter-enemies.tsx';
import { Interactables } from '../scene/interactables.tsx';
import { PointGlow } from '../scene/glow.tsx';
import { Hands } from '../scene/hands.tsx';
import { ExteriorScene } from '../scene/exterior-scene.tsx';
import { PlayerRig } from '../scene/player-rig.tsx';
import { loadedLastHouse, preloadLastHouse } from '../services/scene-loader.ts';
import { bindInput } from '../services/input-bindings.ts';
import { doorCueForFlags, sfx } from '../services/sfx.ts';
import { GATES } from '../content/world/gates.ts';
import { gameStore, useGame } from '../store/index.ts';
import { DialogueChoicePanel } from './dialogue-choice.tsx';
import { EncounterPanel } from './encounter-stub.tsx';
import { Hud } from './hud.tsx';
import { Locket } from './locket.tsx';
import { PuzzleOverlay } from './puzzle-overlay.tsx';
import { SettingsScreen } from './screens.tsx';
import { SkipRing } from './skip-ring.tsx';
import { Subtitles, type SubtitleLine } from './subtitles.tsx';
import { VideoPlaceholder } from './video-placeholder.tsx';

/**
 * The playable view: canvas, input wiring and the "Click to resume" overlay.
 * Pointer lock is requested only from a click. Losing it pauses the game.
 */
export function GameView() {
  const container = useRef<HTMLDivElement>(null);
  const input = useMemo(() => new InputController(), []);
  // One world runtime per game view: New Game mounts a fresh view, so timers and fired triggers start clean.
  const { world: runtime, encounters, choices } = useMemo(() => createEncounterWorld({ store: gameStore, onEffect: (e) => sfx.handleEffect(e) }), []);
  useSyncExternalStore(runtime.subscribe, () => runtime.version);
  const skipHold = useMemo(() => createSkipHold(runtime.sequences, ALL_SEQUENCES), [runtime]);
  useEffect(() => attachRuntime(runtime), [runtime]); // autosave reads / Continue restores the runtime state
  const phase = useGame((s) => s.game.phase);
  const flags = useGame((s) => s.progress.flags);
  const scene = useGame((s) => s.game.scene);
  const [showSettings, setShowSettings] = useState(false);
  const [, setLoadTick] = useState(0);
  const [locket, setLocket] = useState<{ line: SubtitleLine; hasNext: boolean } | null>(null);
  const Interior = loadedLastHouse();
  const loadingHouse = scene === 'last_house' && !Interior;

  // Entering the Last House waits for the (usually already preloaded) scene module.
  useEffect(() => {
    if (scene === 'last_house' && !loadedLastHouse()) void preloadLastHouse().then(() => setLoadTick((n) => n + 1));
  }, [scene]);

  // Developer shortcut: ?scene=last_house jumps to the interior greybox in dev builds only.
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('scene') === 'last_house') {
      gameStore.getState().setScene('last_house');
    }
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    return bindInput({
      element: el,
      input,
      isActive: () => gameStore.getState().game.phase === 'playing',
      onLockChange: (state, pause) => {
        const s = gameStore.getState();
        if (state === 'locked') {
          if (s.game.phase !== 'locket' && s.game.phase !== 'overlay') s.setPhase('playing'); // a click inside the locket must not resume play
        } else if (pause && s.game.phase === 'playing') s.setPhase('paused');
      },
    });
  }, [input]);

  // Placeholder sounds the runtime does not emit: a door-opening flag (creak) and the Arcane Bolt (LMB).
  useEffect(() => {
    const doorFlags = GATES.filter((g) => g.id.startsWith('door.') && g.opensOn).map((g) => g.opensOn as string);
    let prev = gameStore.getState().progress.flags;
    const unsub = gameStore.subscribe((s) => {
      const next = s.progress.flags;
      if (next === prev) return;
      const cue = doorCueForFlags(prev, next, doorFlags);
      prev = next;
      if (cue) sfx.play(cue);
    });
    const el = container.current;
    const down = (e: MouseEvent) => {
      const s = gameStore.getState();
      if (e.button === 0 && s.game.phase === 'playing' && s.progress.flags.includes('spell_bolt')) sfx.play('sfx_spell_bolt');
    };
    el?.addEventListener('mousedown', down);
    return () => {
      unsub();
      el?.removeEventListener('mousedown', down);
    };
  }, []);

  const openLocket = useCallback(() => {
    const next = runtime.locketLine();
    if (!next) return;
    setLocket(next);
    gameStore.getState().setPhase('locket'); // freezes the sim; the rig only ticks while playing
    if (document.pointerLockElement) document.exitPointerLock();
  }, [runtime]);
  const closeLocket = useCallback(() => {
    setLocket(null);
    gameStore.getState().setPhase('paused'); // shows "Click to resume"
  }, []);
  const nextLocket = useCallback(() => {
    const next = runtime.locketLine();
    if (next) setLocket(next);
  }, [runtime]);
  // An overlay puzzle freezes the sim and releases pointer lock (Esc/close then shows "Click to resume").
  useEffect(() => {
    if (phase === 'overlay' && document.pointerLockElement) document.exitPointerLock();
  }, [phase]);
  const closeOverlay = useCallback(() => runtime.closeOverlay(), [runtime]);
  const sayLine = useCallback((id: string) => runtime.say(id), [runtime]);
  const videoEnded = useCallback((clipId: string) => runtime.signal({ videoEnded: clipId }), [runtime]);

  return (
    <div ref={container} className="game-view" data-testid="game-view" data-phase={phase}>
      <Canvas shadows camera={{ fov: 80, near: 0.1, far: 200, position: [0, 1.65, 0] }} dpr={[1, 2]}>
        {scene === 'last_house' && Interior ? <Interior flags={flags} /> : <ExteriorScene flags={flags} runtime={runtime} />}
        {scene === 'exterior' && <Interactables runtime={runtime} flags={flags} />}
        {scene === 'exterior' && <EncounterEnemies encounters={encounters} />}
        <PointGlow runtime={runtime} />
        <PlayerRig input={input} runtime={runtime} onOpenLocket={openLocket} skipHold={skipHold} />
        <Hands />
      </Canvas>
      {phase === 'playing' && <Hud actions={runtime.actions} tutorial={runtime.tutorial ? (TUTORIAL_TEXT[runtime.tutorial] ?? null) : null} />}
      {phase === 'playing' && <div className="crosshair" aria-hidden="true" />}
      {phase === 'playing' && <Subtitles line={runtime.subtitle} />}
      {phase === 'playing' && <EncounterPanel encounters={encounters} />}
      {phase === 'playing' && <DialogueChoicePanel choices={choices} />}
      {phase === 'playing' && <SkipRing skip={skipHold} />}
      {runtime.video && (
        <VideoPlaceholder key={runtime.video.clipId} clipId={runtime.video.clipId} fallbackSeconds={runtime.video.fallbackSeconds} onEnded={videoEnded} />
      )}
      {phase === 'locket' && locket && (
        <Locket line={locket.line} hasNext={locket.hasNext} onNext={nextLocket} onClose={closeLocket} />
      )}
      {phase === 'overlay' && runtime.overlay && <PuzzleOverlay puzzle={runtime.overlay.puzzle} say={sayLine} onClose={closeOverlay} />}
      {loadingHouse && (
        <div className="loading-screen" role="status">
          <p>Opening the Last House…</p>
        </div>
      )}
      {phase !== 'playing' && phase !== 'locket' && phase !== 'overlay' && !showSettings && (
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
