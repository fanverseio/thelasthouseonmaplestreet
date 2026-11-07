import type { ProgressFlag } from '@tlh/shared';
import { BOXES, homeDoorOpen, MAP_HALF_X, MAP_HALF_Z, VEILS, veilIsOpen } from '../content/world/exterior-layout.ts';
import { HOME_BOUNDS, HOME_FRONT_DOOR, HOME_WALL_HEIGHT, HOME_WALLS, type WallRect } from '../content/world/home-layout.ts';

function WallBox({ r, color }: { r: WallRect; color: string }) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  return (
    <mesh position={[r.minX + w / 2, HOME_WALL_HEIGHT / 2, r.minZ + d / 2]} castShadow receiveShadow>
      <boxGeometry args={[w, HOME_WALL_HEIGHT, d]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/** Greybox exterior: debug-coloured boxes, smoke veils, ground, streetlights. View only. */
const STREETLIGHTS: readonly [number, number][] = [
  [-35, 28], [-5, 28], [20, 28], [48, 28], [60, 5], [60, -18], [48, -28], [10, -28], [-35, -28], [-56, -10], [-56, 15],
];

export function ExteriorScene({ flags }: { flags: readonly ProgressFlag[] }) {
  return (
    <>
      <color attach="background" args={['#07080c']} />
      <fogExp2 attach="fog" args={['#0b0d14', 0.045]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[-30, 50, 20]}
        intensity={0.7}
        color="#9fb4d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_HALF_X * 2 + 40, MAP_HALF_Z * 2 + 40]} />
        <meshStandardMaterial color="#14161c" roughness={1} />
      </mesh>

      {BOXES.map((b) => (
        <mesh key={b.id} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.9} />
        </mesh>
      ))}

      {/* No. 12: hollow greybox with a floor, a hall light and a front door that stays shut until its gate opens. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(HOME_BOUNDS.minX + HOME_BOUNDS.maxX) / 2, 0.02, (HOME_BOUNDS.minZ + HOME_BOUNDS.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[HOME_BOUNDS.maxX - HOME_BOUNDS.minX, HOME_BOUNDS.maxZ - HOME_BOUNDS.minZ]} />
        <meshStandardMaterial color="#2a241f" roughness={1} />
      </mesh>
      {HOME_WALLS.map((r) => (
        <WallBox key={r.id} r={r} color="#6b5a4a" />
      ))}
      {!homeDoorOpen(flags) && <WallBox r={HOME_FRONT_DOOR} color="#4a3526" />}
      <pointLight position={[-20, 2.8, 38]} intensity={4} distance={14} color="#ffcf8a" />

      {VEILS.filter((v) => !veilIsOpen(v, flags)).map((v) => (
        <mesh key={v.gate} position={[v.x, 2.5, v.z]}>
          <boxGeometry args={[v.w, 5, v.d]} />
          <meshStandardMaterial
            color={v.opensOn === null ? '#3a3a42' : '#000000'}
            transparent
            opacity={v.opensOn === null ? 0.6 : 0.92}
          />
        </mesh>
      ))}

      {STREETLIGHTS.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 4]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <pointLight position={[0, 4, 0]} intensity={6} distance={14} color="#ffb35c" />
        </group>
      ))}
    </>
  );
}
