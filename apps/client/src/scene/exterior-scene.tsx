import { useFrame } from '@react-three/fiber';
import { useRef, useState, useSyncExternalStore } from 'react';
import type { MeshStandardMaterial, Mesh, PointLight } from 'three';
import type { EntityId, ProgressFlag } from '@tlh/shared';
import { veilOpacity } from '../game/gates.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { BOXES, homeDoorOpen, MAP_HALF_X, MAP_HALF_Z, VEILS, veilIsOpen, type Veil } from '../content/world/exterior-layout.ts';
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
  [-35, 28], [60, 5], [60, -18], [48, -28], [10, -28], [-35, -28], [-56, -10], [-56, 15],
];

const SEQUENCE_LIGHTS = [
  ...['01', '02', '03', '04', '05', '06'].map((n) => `light.street.${n}`),
  'light.street.intersection',
] as EntityId[];
const WINDOW = 'prop.street.window_14' as EntityId;
const LIGHT_BASE = 6;

/** Greybox street light whose glow follows the sequence's light effects (flicker, on, off, burst). */
function SeqLight({ id, runtime }: { id: EntityId; runtime?: WorldRuntime }) {
  const p = PLACEMENTS[id];
  const light = useRef<PointLight>(null);
  const bulb = useRef<Mesh>(null);
  useFrame(() => {
    const fx = runtime?.lights[id];
    const t = runtime?.simTime ?? 0;
    let k = 1;
    if (fx?.effect === 'off' || fx?.effect === 'burst') k = 0;
    else if (fx?.effect === 'flicker' && t - fx.at < fx.seconds) k = Math.abs(Math.sin(t * 37) * Math.sin(t * 11)) > 0.35 ? 1 : 0.05;
    if (light.current) light.current.intensity = LIGHT_BASE * k;
    const mat = bulb.current?.material as MeshStandardMaterial | undefined;
    if (mat) mat.emissiveIntensity = 2 * k;
  });
  if (!p) return null;
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={bulb} position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshStandardMaterial color="#ffb35c" emissive="#ffb35c" emissiveIntensity={2} />
      </mesh>
      <pointLight ref={light} position={[0, 4, 0]} intensity={LIGHT_BASE} distance={14} color="#ffb35c" />
    </group>
  );
}

/** Upstairs window of the Parkers' house: a shadow crosses it while the sequence has it spawned. */
function WindowShadow({ runtime }: { runtime?: WorldRuntime }) {
  useSyncExternalStore(runtime?.subscribe ?? (() => () => {}), () => runtime?.version ?? 0);
  const p = PLACEMENTS[WINDOW];
  if (!p) return null;
  return (
    <group position={[p.x, 4, p.z - 0.85]} rotation={[0, Math.PI, 0]}>
      <mesh>
        <planeGeometry args={[1.2, 1.6]} />
        <meshStandardMaterial color="#ffcf8a" emissive="#ffcf8a" emissiveIntensity={0.6} />
      </mesh>
      {runtime?.present.has(WINDOW) && (
        <mesh position={[0, -0.1, 0.01]}>
          <planeGeometry args={[0.45, 1.3]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}
    </group>
  );
}

/** A smoke veil. When its flag opens it fades out (game/gates.ts veilOpacity), then goes. */
function VeilWall({ v, open }: { v: Veil; open: boolean }) {
  const openedAt = useRef<number | null>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const [gone, setGone] = useState(open); // already open when the scene mounts: no fade
  useFrame(({ clock }) => {
    if (!open || gone) return;
    openedAt.current ??= clock.elapsedTime;
    const o = veilOpacity(clock.elapsedTime - openedAt.current);
    if (mat.current) mat.current.opacity = o;
    if (o <= 0) setGone(true);
  });
  if (gone) return null;
  return (
    <mesh position={[v.x, 2.5, v.z]}>
      <boxGeometry args={[v.w, 5, v.d]} />
      <meshStandardMaterial ref={mat} color={v.opensOn === null ? '#3a3a42' : '#000000'} transparent opacity={v.opensOn === null ? 0.6 : 0.92} />
    </mesh>
  );
}

export function ExteriorScene({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
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

      {VEILS.map((v) => (
        <VeilWall key={v.gate} v={v} open={veilIsOpen(v, flags)} />
      ))}

      {SEQUENCE_LIGHTS.map((id) => (
        <SeqLight key={id} id={id} runtime={runtime} />
      ))}
      <WindowShadow runtime={runtime} />

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
