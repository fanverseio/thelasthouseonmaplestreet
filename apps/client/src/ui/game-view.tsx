import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { InputController } from '../game/input.ts';
import { devKillPlayer } from '../game/dev-start.ts';
import { attachRuntime } from '../game/save.ts';
import { TUTORIAL_TEXT } from '../content/interactions/beat2.ts';
import { ALL_SEQUENCES } from '../content/sequences/index.ts';
import { createEncounterWorld } from '../game/encounter-runtime.ts';
import { shouldSpawnTraining, spawnTrainingEnemy, trainingSpawnFor } from '../game/dev-training.ts';
import { EnemySystem } from '../game/enemies.ts';
import type { Collider } from '../game/collision.ts';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { interiorColliders } from '../content/world/interior-layout.ts';
import { createSkipHold } from '../game/skip-hold.ts';
import { SpellSystem, type SpellContext } from '../game/spells.ts';
import { CombatFeedback, FEEDBACK_TUNING } from '../game/combat-feedback.ts';
import { CombatFx } from '../scene/combat-fx.tsx';
import { EncounterEnemies } from '../scene/encounter-enemies.tsx';
import { FsmEnemies } from '../scene/fsm-enemies.tsx';
import { Interactables } from '../scene/interactables.tsx';
import { PointGlow } from '../scene/glow.tsx';
import { Hands } from '../scene/hands.tsx';
import { RitualFx } from '../scene/ritual-fx.tsx';
import { SpellFx } from '../scene/spell-fx.tsx';
import { ExteriorScene } from '../scene/exterior-scene.tsx';
import { PlayerRig } from '../scene/player-rig.tsx';
import { loadedLastHouse, loadSceneHook, preloadLastHouse } from '../services/scene-loader.ts';
import { bindInput } from '../services/input-bindings.ts';
import { cuesForEnemyEvent, cuesForRitualEvent, cuesForSpellEvent } from '../services/audio-cues.ts';
import { duckForEffect, sfx } from '../services/sfx.ts';
import { duckAmbienceFor, startSoundDirector, type SoundDirector } from '../services/sound-director.ts';
import { createVoicePlayer } from '../services/voice-player.ts';
import { zoneAt } from '../game/world-runtime.ts';
import { GATES } from '../content/world/gates.ts';
import { gameStore, saveStorage, settingsStore, useGame } from '../store/index.ts';
import { DialogueChoicePanel } from './dialogue-choice.tsx';
import { EndingChoicePanel } from './ending-choice.tsx';
import { EncounterPanel } from './encounter-stub.tsx';
import { CombatOverlays } from './combat-overlays.tsx';
import { routeLine } from '../game/speech-target.ts';
import { AngelPanel } from './angel-panel.tsx';
import { Hud } from './hud.tsx';
import { PositionReadout } from './position-readout.tsx';
import { Locket } from './locket.tsx';
import { PuzzleOverlay } from './puzzle-overlay.tsx';
import { AnchorHud, HoldBar, SmokeStrike } from './ritual-hud.tsx';
import { SettingsScreen } from './screens.tsx';
import { SkipRing } from './skip-ring.tsx';
import { SmokePuffOverlay } from './smoke-puff.tsx';
import { SpellHud } from './spell-hud.tsx';
import { Subtitles, type SubtitleLine } from './subtitles.tsx';
import { VideoPlaceholder } from './video-placeholder.tsx';

/**
 * The playable view: canvas, input wiring and the "Click to resume" overlay.
 * Pointer lock is requested only from a click. Losing it pauses the game.
 */
export function GameView() {
  const container = useRef<HTMLDivElement>(null);
  const input = useMemo(() => new InputController(), []);
  // Spells: one headless system per game view. Enemies (5.3) register with it as targets and read its hit events.
  const spells = useMemo(() => new SpellSystem({ store: gameStore }), []);
  // Enemy FSM system (5.3): bindings with mode: 'fsm' and the dev training hound run on it. Colliders are cached per scene and flags.
  const enemies = useMemo(() => {
    let key: unknown = null;
    let sceneKey = '';
    let cached: readonly Collider[] = [];
    return new EnemySystem({
      store: gameStore,
      spells,
      colliders: () => {
        const { scene } = gameStore.getState().game;
        const flags = gameStore.getState().progress.flags;
        if (flags !== key || scene !== sceneKey) {
          key = flags;
          sceneKey = scene;
          cached = scene === 'last_house' ? interiorColliders(flags) : exteriorColliders(flags);
        }
        return cached;
      },
    });
  }, [spells]);
  // Combat feedback (5.11): hit flashes and knockback, the hurt vignette, sparks / motes / dissolve. Headless state, stepped in sim time.
  const feedback = useMemo(
    () => new CombatFeedback({ enemies, spells, player: () => ({ x: gameStore.getState().player.pos[0], z: gameStore.getState().player.pos[2] }), reduceFlashing: () => settingsStore.getState().reduceFlashing }),
    [enemies, spells],
  );
  // Voice-over: one line at a time, started by the runtime's onLine with the subtitle.
  const voice = useMemo(() => createVoicePlayer(), []);
  // One world runtime per game view: New Game mounts a fresh view, so timers and fired triggers start clean.
  const { world: runtime, encounters, choices, ritual, ending } = useMemo(
    () =>
      createEncounterWorld({
        store: gameStore,
        storage: saveStorage,
        enemies,
        spells,
        deathFadeS: FEEDBACK_TUNING.deathFadeS, // 1.5 s fade to black, then the respawn
        onRespawn: () => feedback.noteRespawn(),
        onTick: (dt) => feedback.step(dt),
        loadScene: loadSceneHook,
        onLine: (line) => voice.speak(line), // voice-over plays with every subtitle and locket line
        onEffect: (e) => {
          sfx.handleEffect(e);
          const duck = duckForEffect(e);
          if (duck) duckAmbienceFor(duck.level, duck.seconds);
        },
      }),
    [enemies, spells, feedback, voice],
  );
  useEffect(() => () => voice.stop(), [voice]); // leaving the game stops any line still playing
  // Sound: ambience by zone, footsteps, flag cues (the director), and the event streams below.
  const director = useRef<SoundDirector | null>(null);
  const playAll = useCallback((requests: Parameters<SoundDirector['playAll']>[0]) => director.current?.playAll(requests), []);
  useEffect(() => {
    sfx.preload();
    const doorFlags = GATES.filter((g) => g.id.startsWith('door.') && g.opensOn).map((g) => g.opensOn as string);
    director.current = startSoundDirector({ store: gameStore, zoneAt, doorFlags });
    return () => {
      director.current?.dispose();
      director.current = null;
    };
  }, []);
  useEffect(() => enemies.on((e) => playAll(cuesForEnemyEvent(e))), [enemies, playAll]);
  useEffect(() => ritual.on((e) => playAll(cuesForRitualEvent(e))), [ritual, playAll]);
  useSyncExternalStore(runtime.subscribe, () => runtime.version);
  const speech = routeLine(runtime.subtitle); // Angel lines go to the Angel panel, everyone else to the subtitles
  const skipHold = useMemo(() => createSkipHold(runtime.sequences, ALL_SEQUENCES), [runtime]);
  const spellContext = useCallback((): SpellContext => {
    const f = gameStore.getState().progress.flags;
    return { hostileActive: encounters.hostileActive(), ritualActive: f.includes('ritual_active') && !f.includes('anchors_all') };
  }, [encounters]);
  // Spell sounds: the cast / block cues, plus two loops (the bolt charge and the Purify channel).
  useEffect(() => {
    let purifyLoop: { stop(): void } | null = null;
    const stopPurify = () => {
      purifyLoop?.stop();
      purifyLoop = null;
    };
    const off = spells.on((e) => {
      playAll(cuesForSpellEvent(e));
      if (e.type === 'cast' && e.spell === 'ward') {
        encounters.castWard({ free: true }); // the telegraphed first attack counts a real Ward (magic already paid)
      } else if (e.type === 'purify_started') {
        stopPurify();
        purifyLoop = sfx.loop('sfx_spell_purify_loop');
      } else if (e.type === 'purify_cancelled') stopPurify();
    });
    const offEnemies = enemies.on((e) => {
      if (e.type === 'resolved') stopPurify();
    });
    return () => {
      off();
      offEnemies();
      stopPurify();
    };
  }, [spells, enemies, encounters, playAll]);
  // The bolt charge hums while LMB is held (a loop, stopped on release).
  useEffect(() => {
    let loop: { stop(): void } | null = null;
    const timer = setInterval(() => {
      const charging = gameStore.getState().game.phase === 'playing' && spells.view(input.state).charging;
      if (charging && !loop) loop = sfx.loop('sfx_spell_charge');
      else if (!charging && loop) {
        loop.stop();
        loop = null;
      }
    }, 100);
    return () => {
      clearInterval(timer);
      loop?.stop();
    };
  }, [spells, input]);
  // Dev only: a practice hound off the route near the garden start (?start=garden, or ?start=training for all spells and a closer hound). It changes no progress.
  useEffect(() => {
    if (shouldSpawnTraining(import.meta.env.DEV, window.location.search)) spawnTrainingEnemy(enemies, trainingSpawnFor(window.location.search));
  }, [enemies]);
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

  // Developer shortcut (dev builds only): F9 sets health to 0 to test death and respawn.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F9' && gameStore.getState().game.phase === 'playing') {
        e.preventDefault();
        devKillPlayer(gameStore);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const openLocket = useCallback(() => {
    // Classic: T asks for the next line and the Angel panel shows it. Play never pauses, pointer lock stays.
    // (Each press plays the next line, if any.)
    if (gameStore.getState().game.activeMode !== 'ai') {
      if (runtime.locketLine()) sfx.play('sfx_locket_open');
      return;
    }
    // Later AI mode: the full locket overlay, which pauses the game only while the player types.
    const next = runtime.locketLine();
    if (!next) return;
    setLocket(next);
    sfx.play('sfx_locket_open');
    gameStore.getState().setPhase('locket'); // freezes the sim; the rig only ticks while playing
    if (document.pointerLockElement) document.exitPointerLock();
  }, [runtime]);
  const closeLocket = useCallback(() => {
    sfx.play('sfx_locket_close');
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
        <Interactables runtime={runtime} flags={flags} />
        <EncounterEnemies encounters={encounters} />
        <FsmEnemies enemies={enemies} feedback={feedback} />
        <CombatFx feedback={feedback} />
        <RitualFx ritual={ritual} />
        <PointGlow runtime={runtime} />
        <PlayerRig input={input} runtime={runtime} onOpenLocket={openLocket} skipHold={skipHold} spells={spells} spellContext={spellContext} />
        <SpellFx spells={spells} input={input} />
        <Hands spells={spells} input={input} />
      </Canvas>
      {phase === 'playing' && <CombatOverlays feedback={feedback} encounters={encounters} />}
      {phase === 'playing' && <Hud actions={runtime.actions} tutorial={runtime.tutorial ? (TUTORIAL_TEXT[runtime.tutorial] ?? null) : null} />}
      {phase === 'playing' && <div className="crosshair" aria-hidden="true" />}
      {phase === 'playing' && <SpellHud spells={spells} input={input} />}
      {phase === 'playing' && <PositionReadout />}
      {phase === 'playing' && <AngelPanel line={speech.angel} />}
      {phase === 'playing' && <Subtitles line={speech.subtitle} />}
      {phase === 'playing' && <EncounterPanel encounters={encounters} />}
      {phase === 'playing' && <SmokePuffOverlay enemies={enemies} />}
      {phase === 'playing' && <DialogueChoicePanel choices={choices} />}
      {phase === 'playing' && <HoldBar runtime={runtime} />}
      {phase === 'playing' && <SmokeStrike ritual={ritual} />}
      {phase === 'playing' && <AnchorHud ritual={ritual} />}
      {phase === 'overlay' && <EndingChoicePanel ending={ending} />}
      {phase === 'playing' && <SkipRing skip={skipHold} />}
      {runtime.video && (
        <VideoPlaceholder key={runtime.video.clipId} clipId={runtime.video.clipId} fallbackSeconds={runtime.video.fallbackSeconds} onEnded={videoEnded} />
      )}
      {phase === 'locket' && locket && (
        <Locket line={locket.line} hasNext={locket.hasNext} onNext={nextLocket} onClose={closeLocket} />
      )}
      {phase === 'overlay' && runtime.overlay && <PuzzleOverlay puzzle={runtime.overlay.puzzle} say={sayLine} onClose={closeOverlay} />}
      {(loadingHouse || runtime.sceneLoading) && (
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
