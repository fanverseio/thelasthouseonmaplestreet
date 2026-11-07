import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

/**
 * Placeholder first-person hands: two boxes parented to the camera, with a gentle idle sway.
 * Real hand models and spell animations replace this later (asset manifest).
 */
export function Hands() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = -0.32 + Math.sin(clock.elapsedTime * 1.6) * 0.004;
  });

  // The camera must be in the scene graph for its children to render.
  if (camera.parent !== scene) scene.add(camera);

  return createPortal(
    <group ref={group} position={[0, -0.32, -0.55]}>
      <mesh position={[-0.22, 0, 0]} rotation={[0.2, 0.15, 0]}>
        <boxGeometry args={[0.09, 0.07, 0.3]} />
        <meshStandardMaterial color="#c8a58c" roughness={0.8} />
      </mesh>
      <mesh position={[0.22, 0, 0]} rotation={[0.2, -0.15, 0]}>
        <boxGeometry args={[0.09, 0.07, 0.3]} />
        <meshStandardMaterial color="#c8a58c" roughness={0.8} />
      </mesh>
    </group>,
    camera,
  );
}
