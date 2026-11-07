import { useFrame } from '@react-three/fiber';
import { useRef, useSyncExternalStore } from 'react';
import type { Mesh, MeshStandardMaterial } from 'three';
import type { ProgressFlag } from '@tlh/shared';
import type { VisibleEntity, WorldRuntime } from '../game/world-runtime.ts';

const COLORS: Record<string, string> = {
  clue: '#8a7a3a',
  prop: '#b86a1c',
  socket: '#6a4a2a',
  door: '#4a3526',
};

function GreyProp({ e }: { e: VisibleEntity }) {
  const mesh = useRef<Mesh>(null);
  const kind = e.id.split('.')[0] ?? '';
  const size = Math.max(0.3, e.r * 2);
  const height = kind === 'socket' ? 0.9 : kind === 'prop' ? 0.7 : 0.5;
  useFrame(({ clock }) => {
    const mat = mesh.current?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    // Subtle highlight for hints: a slow pulse, not a flash.
    mat.emissiveIntensity = e.highlighted ? 0.5 + Math.sin(clock.elapsedTime * 2) * 0.25 : 0;
  });
  return (
    <mesh ref={mesh} position={[e.x, height / 2, e.z]} castShadow>
      <boxGeometry args={[size, height, size]} />
      <meshStandardMaterial color={COLORS[kind] ?? '#777'} emissive="#ffd27a" emissiveIntensity={0} roughness={0.8} />
    </mesh>
  );
}

/** Greybox boxes for the interactable entities that are present right now. Door visuals live in the scene. */
export function Interactables({ runtime }: { runtime: WorldRuntime; flags: readonly ProgressFlag[] }) {
  // Re-render on flag changes (prop) and on runtime changes (hint highlight).
  useSyncExternalStore(runtime.subscribe, () => runtime.version);
  return (
    <>
      {runtime
        .visibleEntities()
        .filter((e) => !e.id.startsWith('door.'))
        .map((e) => (
          <GreyProp key={e.id} e={e} />
        ))}
    </>
  );
}
