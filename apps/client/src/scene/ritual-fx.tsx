import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { PLACEMENTS } from '../content/world/placements.ts';
import { RITUAL_TUNING, type RitualRuntime } from '../game/ritual.ts';
import { useGame } from '../store/index.ts';

const MAX_RINGS = 6;
const MAX_POOLS = RITUAL_TUNING.pool.max + 1;

/**
 * Greybox visuals of the smoke director (task 5.10): flat ring discs that fill as they telegraph, dark hazard
 * pools, and the grey smoke shell over the north anchor. Faceless, shapeless, no models or textures; every shape is
 * pre-built and driven from `ritual.view()` in useFrame. Steady opacity only (no flashing).
 */
export function RitualFx({ ritual }: { ritual: RitualRuntime }) {
  const scene = useGame((s) => s.game.scene);
  const rings = useRef<(Mesh | null)[]>([]);
  const fills = useRef<(Mesh | null)[]>([]);
  const pools = useRef<(Mesh | null)[]>([]);
  const shell = useRef<Mesh>(null);
  const north = PLACEMENTS['anchor.ritual.north'];

  useFrame(() => {
    const v = ritual.view();
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = v.rings[i];
      const outline = rings.current[i];
      const fill = fills.current[i];
      if (outline) outline.visible = r !== undefined;
      if (fill) fill.visible = r !== undefined;
      if (!r) continue;
      outline?.position.set(r.x, 0.05, r.z);
      outline?.scale.set(r.radius, r.radius, 1);
      fill?.position.set(r.x, 0.06, r.z);
      fill?.scale.setScalar(Math.max(0.05, r.radius * r.t));
    }
    for (let i = 0; i < MAX_POOLS; i++) {
      const p = v.pools[i];
      const m = pools.current[i];
      if (m) m.visible = p !== undefined;
      if (p && m) {
        m.position.set(p.x, 0.04, p.z);
        m.scale.setScalar(p.radius);
      }
    }
    if (shell.current) shell.current.visible = v.shell !== null && !v.shell.broken;
  });

  if (scene !== 'last_house') return null;
  return (
    <>
      {Array.from({ length: MAX_RINGS }, (_, i) => (
        <group key={`ring${i}`}>
          <mesh ref={(m) => { rings.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <ringGeometry args={[0.94, 1, 48]} />
            <meshBasicMaterial color="#c0501a" transparent opacity={0.85} depthWrite={false} />
          </mesh>
          <mesh ref={(m) => { fills.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <circleGeometry args={[1, 40]} />
            <meshBasicMaterial color="#2a1008" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: MAX_POOLS }, (_, i) => (
        <mesh key={`pool${i}`} ref={(m) => { pools.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color="#0b0b10" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
      {north && (
        <mesh ref={shell} position={[north.x, RITUAL_TUNING.north.shellY, north.z]} visible={false}>
          <sphereGeometry args={[RITUAL_TUNING.north.shellRadius, 20, 14]} />
          <meshStandardMaterial color="#2a2a30" transparent opacity={0.6} roughness={1} />
        </mesh>
      )}
    </>
  );
}
