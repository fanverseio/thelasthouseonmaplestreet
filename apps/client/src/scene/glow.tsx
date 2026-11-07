import { useFrame } from '@react-three/fiber';
import { useRef, useSyncExternalStore } from 'react';
import { AdditiveBlending, type Group, type MeshBasicMaterial } from 'three';
import type { EntityId } from '@tlh/shared';
import { PLACEMENTS } from '../content/world/placements.ts';
import { sceneOfEntity } from '../content/world/scene-of.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { useGame, useSettings } from '../store/index.ts';
import type { InteractGlow } from '../store/settings-store.ts';

/**
 * Testing aid: a soft pulsing glow on things the player can use, plus pale "lead" glows on windows
 * and lights worth looking at. The setting `interactGlow` turns it off or makes it subtle, so the final
 * game can keep some things plain. View only.
 */
const LEADS: readonly EntityId[] = ['light.home.felix_window', 'prop.street.window_14', 'light.street.intersection'] as EntityId[];

const USABLE = '#ffd27a';
const LEAD = '#9fc4ff';

const STRENGTH: Record<Exclude<InteractGlow, 'off'>, { base: number; swing: number }> = {
  subtle: { base: 0.05, swing: 0.04 },
  bright: { base: 0.2, swing: 0.12 },
};

interface Beacon {
  id: EntityId;
  x: number;
  z: number;
  r: number;
  color: string;
  tall: boolean;
}

function Beacon({ b, mode }: { b: Beacon; mode: Exclude<InteractGlow, 'off'> }) {
  const group = useRef<Group>(null);
  const height = b.tall ? 2.4 : 1.3;
  const radius = Math.max(0.35, b.r + 0.25);
  useFrame(({ clock }) => {
    const { base, swing } = STRENGTH[mode];
    const pulse = base + (Math.sin(clock.elapsedTime * 2.2 + b.x) * 0.5 + 0.5) * swing;
    group.current?.children.forEach((child, i) => {
      const mat = (child as unknown as { material: MeshBasicMaterial }).material;
      mat.opacity = i === 0 ? pulse : pulse * 1.6;
    });
  });
  return (
    <group ref={group} position={[b.x, 0, b.z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 16, 1, true]} />
        <meshBasicMaterial color={b.color} transparent opacity={0.2} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[radius * 0.8, radius * 1.15, 24]} />
        <meshBasicMaterial color={b.color} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function PointGlow({ runtime }: { runtime: WorldRuntime }) {
  useSyncExternalStore(runtime.subscribe, () => runtime.version);
  const mode = useSettings((s) => s.interactGlow);
  const scene = useGame((s) => s.game.scene);
  if (mode === 'off') return null;

  const usable: Beacon[] = runtime
    .visibleEntities()
    .filter((e) => !e.id.startsWith('enemy.') && !e.id.startsWith('trg.'))
    .map((e) => ({ id: e.id, x: e.x, z: e.z, r: e.r, color: USABLE, tall: e.id.startsWith('door.') || e.id.startsWith('seal.') }));
  const taken = new Set(usable.map((u) => u.id));
  const leads: Beacon[] = LEADS.flatMap((id) => {
    const p = PLACEMENTS[id];
    return p && !taken.has(id) && sceneOfEntity(id) === scene ? [{ id, x: p.x, z: p.z, r: p.r, color: LEAD, tall: false }] : [];
  });
  return (
    <>
      {[...usable, ...leads].map((b) => (
        <Beacon key={b.id} b={b} mode={mode} />
      ))}
    </>
  );
}
