import type { ProgressFlag } from '@tlh/shared';
import { useSettings } from '../store/index.ts';
import { INTERIOR_LIGHTING } from './lighting.ts';
import { DOORS, doorIsOpen, SEAL_POSITION, WALL_HEIGHT, WALLS } from '../content/world/interior-layout.ts';

/** Greybox Last House: walls, doors, the central seal. Loaded lazily (see services/scene-loader.ts). */
export default function InteriorScene({ flags }: { flags: readonly ProgressFlag[] }) {
  const light = INTERIOR_LIGHTING[useSettings((s) => s.testBrightness)];
  return (
    <>
      <color attach="background" args={[light.background]} />
      <fogExp2 attach="fog" args={[light.fogColor, light.fogDensity]} />
      <ambientLight intensity={light.ambient} />
      <pointLight position={[0, 2.8, 14]} intensity={9} distance={18} color="#ffb35c" />
      <pointLight position={[0, 2.8, 0]} intensity={7} distance={16} color="#ffb35c" />
      <pointLight position={[0, 2.8, -18]} intensity={10} distance={22} color="#7fa0ff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 100]} />
        <meshStandardMaterial color="#1a1614" roughness={1} />
      </mesh>

      {WALLS.map((w) => (
        <mesh
          key={w.id}
          position={[(w.minX + w.maxX) / 2, WALL_HEIGHT / 2, (w.minZ + w.maxZ) / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w.maxX - w.minX, WALL_HEIGHT, w.maxZ - w.minZ]} />
          <meshStandardMaterial color="#3b332d" roughness={0.95} />
        </mesh>
      ))}

      {DOORS.filter((d) => !doorIsOpen(d, flags)).map((d) => (
        <mesh key={d.gate} position={[(d.minX + d.maxX) / 2, 1.5, (d.minZ + d.maxZ) / 2]}>
          <boxGeometry args={[d.maxX - d.minX, 3, d.maxZ - d.minZ]} />
          <meshStandardMaterial color="#5a3a24" roughness={0.8} />
        </mesh>
      ))}

      <mesh position={[SEAL_POSITION.x, 0.6, SEAL_POSITION.z]}>
        <cylinderGeometry args={[1.5, 1.5, 1.2, 24]} />
        <meshStandardMaterial color="#2a2a3a" emissive="#3b2a66" emissiveIntensity={0.6} />
      </mesh>
    </>
  );
}
