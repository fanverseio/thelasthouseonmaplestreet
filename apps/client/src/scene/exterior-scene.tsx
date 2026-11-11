import { useFrame } from '@react-three/fiber';
import { useRef, useState, useSyncExternalStore } from 'react';
import type { MeshStandardMaterial, PointLight, SpriteMaterial } from 'three';
import type { EntityId, ProgressFlag } from '@tlh/shared';
import { useSettings } from '../store/index.ts';
import { EXTERIOR_LIGHTING } from './lighting.ts';
import { Model } from './models.tsx';
import { GroundMist, Halo } from './atmosphere.tsx';
import { HouseKit, KIT_BOX_IDS, Streetlight } from './kit.tsx';
import { Backdrop } from './backdrop.tsx';
import { GroundsScene } from './grounds-scene.tsx';
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

/** The hollow greybox of No. 12: floor, walls and a front door that stays shut until its gate opens. */
function HomeGreybox({ flags }: { flags: readonly ProgressFlag[] }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(HOME_BOUNDS.minX + HOME_BOUNDS.maxX) / 2, 0.02, (HOME_BOUNDS.minZ + HOME_BOUNDS.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[HOME_BOUNDS.maxX - HOME_BOUNDS.minX, HOME_BOUNDS.maxZ - HOME_BOUNDS.minZ]} />
        <meshStandardMaterial color="#2a241f" roughness={1} />
      </mesh>
      {HOME_WALLS.map((r) => (
        <WallBox key={r.id} r={r} color="#6b5a4a" />
      ))}
      {!homeDoorOpen(flags) && <WallBox r={HOME_FRONT_DOOR} color="#4a3526" />}
    </>
  );
}
function BoxFallback({ id }: { id: string }) {
  const b = BOXES.find((x) => x.id === id);
  if (!b) return null;
  return (
    <mesh position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
      <boxGeometry args={[b.w, b.h, b.d]} />
      <meshStandardMaterial color={b.color} roughness={0.9} />
    </mesh>
  );
}

/** Greybox exterior: debug-coloured boxes, smoke veils, ground, streetlights. View only. */
const STREETLIGHTS: readonly [number, number][] = [
  [-35, 30.2], [57.2, 5], [57.2, -18], [48, -32], [10, -32], [-35, -32], [-59.8, -10], [-59.8, 15],
];

/** The poles of the sequence lights stand on the pavement (the lights' placements are in the road). Light and halo follow the pole. */
const SEQ_POLE: Partial<Record<string, readonly [number, number]>> = {
  'light.street.01': [-4, 30.05],
  'light.street.02': [6, 30.2],
  'light.street.03': [16, 30.2],
  'light.street.04': [24, 30.2],
  'light.street.05': [30, 30.2],
  'light.street.06': [46, 30.2],
  'light.street.intersection': [57.2, 27],
};

const SEQUENCE_LIGHTS = [
  ...['01', '02', '03', '04', '05', '06'].map((n) => `light.street.${n}`),
  'light.street.intersection',
] as EntityId[];
const WINDOW = 'prop.street.window_14' as EntityId;
const LIGHT_BASE = 6;

/** Greybox street light whose glow follows the sequence's light effects (flicker, on, off, burst). */
function SeqLight({ id, runtime, halo }: { id: EntityId; runtime?: WorldRuntime; halo: number }) {
  const p = PLACEMENTS[id];
  const light = useRef<PointLight>(null);
  const bulb = useRef<MeshStandardMaterial | null>(null);
  const glow = useRef<SpriteMaterial>(null);
  useFrame(() => {
    const fx = runtime?.lights[id];
    const t = runtime?.simTime ?? 0;
    let k = 1;
    if (fx?.effect === 'off' || fx?.effect === 'burst') k = 0;
    else if (fx?.effect === 'flicker' && t - fx.at < fx.seconds) k = Math.abs(Math.sin(t * 37) * Math.sin(t * 11)) > 0.35 ? 1 : 0.05;
    if (light.current) light.current.intensity = LIGHT_BASE * k;
    const mat = bulb.current;
    if (mat) mat.emissiveIntensity = ((mat.userData.baseEmissive as number | undefined) ?? 2) * k;
    if (glow.current) glow.current.opacity = halo * k;
  });
  if (!p) return null;
  return (
    <group position={[SEQ_POLE[id]?.[0] ?? p.x, 0, SEQ_POLE[id]?.[1] ?? p.z]}>
      <Streetlight bulbRef={bulb} />
      <pointLight ref={light} position={[0, 4, 0]} intensity={LIGHT_BASE} distance={14} color="#ffb35c" />
      <Halo ref={glow} position={[0, 4.1, 0]} opacity={halo} />
    </group>
  );
}

/** Upstairs window of the Parkers' house: a shadow crosses it while the sequence has it spawned. */
function WindowShadow({ runtime }: { runtime?: WorldRuntime }) {
  useSyncExternalStore(runtime?.subscribe ?? (() => () => {}), () => runtime?.version ?? 0);
  const p = PLACEMENTS[WINDOW];
  if (!p) return null;
  return (
    <group position={[p.x, 4, p.z + 1.06]} rotation={[0, Math.PI, 0]}>
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
  const light = EXTERIOR_LIGHTING[useSettings((s) => s.testBrightness)];
  return (
    <>
      <color attach="background" args={[light.background]} />
      <fogExp2 attach="fog" args={[light.fogColor, light.fogDensity]} />
      <ambientLight intensity={light.ambient} />
      <directionalLight
        position={[-30, 50, 20]}
        intensity={light.sun}
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

      {BOXES.filter((b) => !KIT_BOX_IDS.has(b.id) && b.id !== 'house.last' && b.id !== 'garage.no31').map((b) => (
        <mesh key={b.id} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.9} />
        </mesh>
      ))}

      {/* No. 12 and its front street: GLBs when present, the hollow greybox otherwise. Colliders are data (home-layout.ts). */}
      <Model
        url="/assets/models/home_elena.glb"
        runtime={runtime}
        lightmapGain={light.lightmap}
        hidden={homeDoorOpen(flags) ? ['door_home_front'] : []}
        fallback={<HomeGreybox flags={flags} />}
      />
      <HouseKit />
      {/* Story items on the ground: nodes are named after their entities, so they replace the greybox markers and follow the runtime. */}
      <Model url="/assets/models/items.glb" runtime={runtime} fallback={null} />
      {/* No. 31: the house is a kit variant; the garage and the yard are house_31.glb (the garage box stays as collider and fallback). */}
      <Model url="/assets/models/house_31.glb" runtime={runtime} fallback={<BoxFallback id="garage.no31" />} />
      {/* The Last House from outside: hero GLB (silhouette, tower, iron fence and gate at x -46); the greybox box is its collider and fallback. */}
      <Model url="/assets/models/last_house_ext.glb" runtime={runtime} fallback={<BoxFallback id="house.last" />} />
      <pointLight position={[-62, 7.4, 34.6]} intensity={3} distance={9} color="#ffb866" />
      <Halo position={[-62, 7.4, 35.5]} size={1.6} opacity={light.halo * 0.7} />
      <Model url="/assets/models/terrain.glb" runtime={runtime} fallback={null} />
      <Model url="/assets/models/street_front.glb" runtime={runtime} fallback={null} />
      <pointLight position={[-20, 2.8, 38]} intensity={4} distance={14} color="#ffcf8a" />
      {/* Porch lantern and the streetlight in front of No. 12 (lights stay in code, not in the GLBs). */}
      <pointLight position={[-17.6, 2.0, 33.2]} intensity={3} distance={8} color="#ffb35c" />
      <pointLight position={[-14.5, 4.1, 29.15]} intensity={6} distance={14} color="#ffb35c" />
      <Halo position={[-17.6, 2.0, 33.85]} size={1.1} opacity={light.halo * 0.8} />
      <Halo position={[-14.5, 4.05, 29.15]} opacity={light.halo} />
      <GroundMist opacity={light.mist} color={light.mistColor} />
      <Backdrop fogColor={light.fogColor} windowGlow={light.halo} />

      {VEILS.map((v) => (
        <VeilWall key={v.gate} v={v} open={veilIsOpen(v, flags)} />
      ))}

      {SEQUENCE_LIGHTS.map((id) => (
        <SeqLight key={id} id={id} runtime={runtime} halo={light.halo} />
      ))}
      <WindowShadow runtime={runtime} />
      <GroundsScene flags={flags} runtime={runtime} />

      {STREETLIGHTS.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <Streetlight />
          <pointLight position={[0, 4, 0]} intensity={6} distance={14} color="#ffb35c" />
          <Halo position={[0, 4.05, 0]} opacity={light.halo} />
        </group>
      ))}
    </>
  );
}
