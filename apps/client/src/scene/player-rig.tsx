import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { exteriorColliders, HOME_SPAWN } from '../content/world/exterior-layout.ts';
import { INTERIOR_SPAWN, interiorColliders } from '../content/world/interior-layout.ts';
import type { InputController } from '../game/input.ts';
import { createPlayerBody, EYE_HEIGHT, FixedStepper, MOUSE_SENSITIVITY, stepPlayer } from '../game/player.ts';
import { preloadLastHouse } from '../services/scene-loader.ts';
import { gameStore, settingsStore } from '../store/index.ts';

/**
 * Runs the fixed 60 Hz player step from useFrame and moves the camera. View only:
 * the movement rules live in game/player.ts. The simulation halts unless the phase is `playing`.
 */
export function PlayerRig({ input }: { input: InputController }) {
  const body = useRef(createPlayerBody(HOME_SPAWN.x, HOME_SPAWN.z, HOME_SPAWN.yaw));
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
      // Look deltas are applied by the first step of a frame only; edges clear after any step ran.
      let steps = 0;
      stepper.advance(delta, (dt) => {
        input.tick(dt * 1000);
        stepPlayer(body.current, input.state, dt, { colliders, sensitivity });
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
