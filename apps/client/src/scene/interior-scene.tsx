import type { ProgressFlag } from '@tlh/shared';
import { useSettings } from '../store/index.ts';
import { INTERIOR_LIGHTING } from './lighting.ts';
import {
  DOORS,
  doorIsOpen,
  HALL_FURNITURE,
  SEAL_POSITION,
  STAIR_STEPS,
  WALL_HEIGHT,
  WALLS,
} from '../content/world/interior-layout.ts';

/**
 * Greybox Last House: floors per room, walls, the cellar steps, doors, the central seal. Loaded lazily
 * (see services/scene-loader.ts). Readability aids: warm lights in the hall, a cold light over the seal whose
 * rune ring brightens with the story (board solved: dim, Sequence 6 done: bright). View only.
 */
export default function InteriorScene({ flags }: { flags: readonly ProgressFlag[] }) {
  const light = INTERIOR_LIGHTING[useSettings((s) => s.testBrightness)];
  const runeGlow = flags.includes('seq6_done') ? 2.2 : flags.includes('board_solved') ? 0.9 : 0.25;
  return (
    <>
      <color attach="background" args={[light.background]} />
      <fogExp2 attach="fog" args={[light.fogColor, light.fogDensity]} />
      <ambientLight intensity={light.ambient} />
      <pointLight position={[0, 2.8, 18]} intensity={9} distance={18} color="#ffb35c" />
      <pointLight position={[0, 2.8, 8]} intensity={9} distance={18} color="#ffb35c" />
      <pointLight position={[0, 2.8, -2]} intensity={6} distance={12} color="#ffb35c" />
      <pointLight position={[0, 2.8, -18]} intensity={10} distance={22} color="#7fa0ff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 100]} />
        <meshStandardMaterial color="#1a1614" roughness={1} />
      </mesh>

      {/* Room floors, slightly lighter than the void so the rooms read */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 9]}>
        <planeGeometry args={[16, 30]} />
        <meshStandardMaterial color="#2c2520" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -18]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#25252f" roughness={1} />
      </mesh>

      {HALL_FURNITURE.map((f) => (
        <mesh key={f.id} position={[f.x, f.h / 2 + 0.02, f.z]} castShadow receiveShadow>
          <boxGeometry args={[f.w, f.h, f.d]} />
          <meshStandardMaterial color={f.color} roughness={0.9} />
        </mesh>
      ))}

      {/* Chandelier over the hall (the board's scare sways it in the overlay; here it is a lit shape) */}
      <mesh position={[0, 2.9, 8]}>
        <sphereGeometry args={[0.35, 12, 8]} />
        <meshStandardMaterial color="#ffcf8a" emissive="#ffb35c" emissiveIntensity={1.4} />
      </mesh>

      {/* Cellar steps leading down to the ritual door */}
      {STAIR_STEPS.map((s) => (
        <mesh key={s.z} position={[0, 0.06, s.z]} receiveShadow>
          <boxGeometry args={[5.6, 0.12, 0.7]} />
          <meshStandardMaterial color={s.shade} roughness={1} />
        </mesh>
      ))}

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SEAL_POSITION.x, 0.03, SEAL_POSITION.z]}>
        <ringGeometry args={[2.0, 2.3, 48]} />
        <meshStandardMaterial color="#6a5acd" emissive="#8a7aff" emissiveIntensity={runeGlow} />
      </mesh>
    </>
  );
}
