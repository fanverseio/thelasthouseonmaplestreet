import { useFrame } from '@react-three/fiber';
import { useRef, useSyncExternalStore } from 'react';
import { AdditiveBlending, type MeshBasicMaterial } from 'three';
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

/** Ring on the floor, plus (bright only) a faint low column. Kept quiet so it guides without shouting. */
const STRENGTH: Record<Exclude<InteractGlow, 'off'>, { ring: number; swing: number; column: number }> = {
  subtle: { ring: 0.06, swing: 0.04, column: 0 },
  bright: { ring: 0.14, swing: 0.08, column: 0.035 },
};
const COLUMN_HEIGHT = 0.5;

interface Beacon {
  id: EntityId;
  x: number;
  z: number;
  r: number;
  color: string;
  tall: boolean;
}

function Beacon({ b, mode }: { b: Beacon; mode: Exclude<InteractGlow, 'off'> }) {
  const ring = useRef<MeshBasicMaterial>(null);
  const column = useRef<MeshBasicMaterial>(null);
  const radius = Math.max(0.3, b.r + 0.15);
  const { column: columnBase } = STRENGTH[mode];
  useFrame(({ clock }) => {
    const s = STRENGTH[mode];
    const wave = Math.sin(clock.elapsedTime * 1.6 + b.x) * 0.5 + 0.5;
    if (ring.current) ring.current.opacity = s.ring + wave * s.swing;
    if (column.current) column.current.opacity = s.column * (0.6 + 0.4 * wave);
  });
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[radius * 0.85, radius * 1.05, 32]} />
        <meshBasicMaterial ref={ring} color={b.color} transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {columnBase > 0 && (
        <mesh position={[0, COLUMN_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[radius, radius * 0.9, COLUMN_HEIGHT, 24, 1, true]} />
          <meshBasicMaterial ref={column} color={b.color} transparent opacity={0.03} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
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
