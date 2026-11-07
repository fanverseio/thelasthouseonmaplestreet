import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { exteriorColliders, HOME_SPAWN } from '../content/world/exterior-layout.ts';
import { getCheckpoint } from '../game/checkpoints.ts';
import { INTERIOR_SPAWN, interiorColliders } from '../content/world/interior-layout.ts';
import type { InputController } from '../game/input.ts';
import { createPlayerBody, EYE_HEIGHT, FixedStepper, MOUSE_SENSITIVITY, stepPlayer } from '../game/player.ts';
import type { SkipHold } from '../game/skip-hold.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { preloadLastHouse } from '../services/scene-loader.ts';
import { gameStore, settingsStore } from '../store/index.ts';

/**
 * Runs the fixed 60 Hz player step from useFrame and moves the camera. View only:
 * the movement rules live in game/player.ts. The simulation (player, world runtime timers, sequences)
 * halts unless the phase is `playing`, so it freezes while the locket or an overlay is open.
 */
function startBody() {
  const cp = getCheckpoint(gameStore.getState().game.checkpointId);
  const at = cp.spawn; // every checkpoint has its own spawn, in its own scene's coordinates
  return createPlayerBody(at.x, at.z, at.yaw);
}

export function PlayerRig({ input, runtime, onOpenLocket, skipHold }: { input: InputController; runtime: WorldRuntime; onOpenLocket: () => void; skipHold?: SkipHold }) {
  // Start at the current checkpoint's spawn (New Game: the home start; dev shortcuts: later ones).
  const body = useRef(startBody());
  const stepper = useMemo(() => new FixedStepper(), []);
  const camera = useThree((s) => s.camera);
  const lastScene = useRef(gameStore.getState().game.scene);

  useFrame((_, delta) => {
    const { phase, scene } = gameStore.getState().game;
    if (scene !== lastScene.current) {
      // Entering another scene puts Elena at its spawn point.
      lastScene.current = scene;
      const spawn = scene === 'last_house' ? INTERIOR_SPAWN : HOME_SPAWN;
      body.current = createPlayerBody(spawn.x, spawn.z, spawn.yaw);
    }
    if (scene === 'exterior' && body.current.x < -50) void preloadLastHouse(); // beat 7: preload in the lane
    const settings = settingsStore.getState();
    const cam = camera as PerspectiveCamera;
    if (cam.fov !== settings.fieldOfView) {
      cam.fov = settings.fieldOfView;
      cam.updateProjectionMatrix();
    }
    if (phase === 'playing') {
      const flags = gameStore.getState().progress.flags;
      const colliders = scene === 'last_house' ? interiorColliders(flags) : exteriorColliders(flags);
      const sensitivity = MOUSE_SENSITIVITY * settings.mouseSensitivity * (settings.invertY ? -1 : 1);
      // E and T are one-frame edges: handle them once per frame, before the fixed steps.
      const pose = () => ({ x: body.current.x, z: body.current.z, yaw: body.current.yaw });
      if (input.state.cyclePressed) runtime.cycleAction();
      runtime.setHeld(input.state.interactDown); // hold-E interactions (the ritual anchors) read this
      if (input.state.interactPressed) runtime.interact(pose());
      const opening = input.state.locketPressed && runtime.canOpenLocket();
      if (opening) onOpenLocket(); // the phase changes now, so this frame runs no steps
      // Look deltas are applied by the first step of a frame only; edges clear after any step ran.
      let steps = 0;
      stepper.advance(opening ? 0 : delta, (dt) => {
        input.tick(dt * 1000);
        runtime.setHeld(input.state.interactDown);
        skipHold?.feed(input.state.interactHeldMs); // hold E 1 s skips a skippable cinematic
        // A playing cinematic clip holds the player in place; the world still ticks.
        if (!runtime.video && runtime.sequences.policy.control !== 'limited') stepPlayer(body.current, input.state, dt, { colliders, sensitivity });
        runtime.tick(dt, pose());
        input.state.lookDX = 0;
        input.state.lookDY = 0;
        steps++;
      });
      if (steps > 0) input.endFrame();
    } else {
      stepper.reset();
      input.endFrame();
    }
    const b = body.current;
    cam.position.set(b.x, EYE_HEIGHT, b.z);
    cam.rotation.set(b.pitch, b.yaw, 0, 'YXZ');
    const p = gameStore.getState().player;
    if (p.pos[0] !== b.x || p.pos[2] !== b.z) {
      gameStore.setState({ player: { ...p, pos: [b.x, 0, b.z], yaw: b.yaw } });
    }
  });

  return null;
}
