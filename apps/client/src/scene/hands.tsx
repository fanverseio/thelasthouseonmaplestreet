import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { FLICK_SECONDS, handPose, type HandTransform } from '../game/hand-pose.ts';
import type { InputController } from '../game/input.ts';
import type { SpellSystem } from '../game/spells.ts';

function apply(mesh: Mesh | null, h: HandTransform): void {
  if (!mesh) return;
  mesh.position.set(h.pos[0], h.pos[1], h.pos[2]);
  mesh.rotation.set(h.rot[0], h.rot[1], h.rot[2]);
  mesh.scale.set(h.spread, 1, 1);
}

/**
 * Placeholder first-person hands: two boxes parented to the camera. They sway gently and play a pose per spell
 * (bolt flick, Purify open palms, Ward raised forearm) from game/hand-pose.ts. Real hand models replace this later.
 */
export function Hands({ spells, input }: { spells?: SpellSystem; input?: InputController }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const group = useRef<Group>(null);
  const leftHand = useRef<Mesh>(null);
  const rightHand = useRef<Mesh>(null);
  const flickAt = useRef<number | null>(null);

  // A cast Arcane Bolt starts the flick (clock time is read in the frame loop).
  useEffect(
    () =>
      spells?.on((e) => {
        if (e.type === 'cast' && e.spell === 'arcane_bolt') flickAt.current = -1; // stamped on the next frame
      }),
    [spells],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flickAt.current === -1) flickAt.current = t;
    let flick: number | null = null;
    if (flickAt.current !== null) {
      const p = (t - flickAt.current) / FLICK_SECONDS;
      if (p >= 1) flickAt.current = null;
      else flick = p;
    }
    const v = spells?.view(input?.state);
    const pose = handPose({ flick, charge: v?.charging ? v.charge : 0, channeling: v?.channeling ?? false, wardUp: (v?.wardLeft ?? 0) > 0, t });
    apply(leftHand.current, pose.left);
    apply(rightHand.current, pose.right);
    if (group.current) group.current.position.y = -0.32;
  });

  // The camera must be in the scene graph for its children to render.
  if (camera.parent !== scene) scene.add(camera);

  return createPortal(
    <group ref={group} position={[0, -0.32, -0.55]}>
      <mesh ref={leftHand} position={[-0.22, 0, 0]} rotation={[0.2, 0.15, 0]}>
        <boxGeometry args={[0.09, 0.07, 0.3]} />
        <meshStandardMaterial color="#c8a58c" roughness={0.8} />
      </mesh>
      <mesh ref={rightHand} position={[0.22, 0, 0]} rotation={[0.2, -0.15, 0]}>
        <boxGeometry args={[0.09, 0.07, 0.3]} />
        <meshStandardMaterial color="#c8a58c" roughness={0.8} />
      </mesh>
    </group>,
    camera,
  );
}
