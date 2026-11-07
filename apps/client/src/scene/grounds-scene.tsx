import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useSyncExternalStore } from 'react';
import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, type Camera, type Object3D, type Scene, type WebGLRenderer } from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import type { EntityId, ProgressFlag } from '@tlh/shared';
import {
  MIRROR_PLANE,
  OUTBUILDING_BOUNDS,
  OUTBUILDING_DOOR,
  OUTBUILDING_WALL_HEIGHT,
  OUTBUILDING_WALLS,
} from '../content/world/grounds-layout.ts';
import { outbuildingDoorOpen } from '../content/world/exterior-layout.ts';
import type { WallRect } from '../content/world/home-layout.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { useGame } from '../store/index.ts';

const RUNES = ['rune.grounds.r1', 'rune.grounds.r2', 'rune.grounds.r3'] as const;
/** Each rune is drawn flat on the inside wall nearest its spot: [x, z, rotation about Y]. */
const RUNE_WALL: Record<(typeof RUNES)[number], { x: number; z: number; ry: number }> = {
  'rune.grounds.r1': { x: -54.5, z: 27.42, ry: 0 },
  'rune.grounds.r2': { x: -49.5, z: 27.42, ry: 0 },
  'rune.grounds.r3': { x: -48.42, z: 31.5, ry: -Math.PI / 2 },
};
const RUNE_Y = 1.5;

function Wall({ r, color }: { r: WallRect; color: string }) {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  return (
    <mesh position={[r.minX + w / 2, OUTBUILDING_WALL_HEIGHT / 2, r.minZ + d / 2]} castShadow receiveShadow>
      <boxGeometry args={[w, OUTBUILDING_WALL_HEIGHT, d]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/** A flat greybox glyph: a ring and a cross. */
function Glyph({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <group>
      <mesh>
        <ringGeometry args={[0.28, 0.36, 24]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.08, 0.6]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.6, 0.08]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

type BeforeRender = (renderer: WebGLRenderer, scene: Scene, camera: Camera, geometry: unknown, material: unknown, group: unknown) => void;

/**
 * The antique mirror (task 4.6). A three.js Reflector renders the room from the mirrored camera into a
 * small render target on the mirror plane. The rune glyphs live in `runesInMirror`, which is hidden in the
 * normal pass and switched on only while the Reflector renders its own pass: they exist only in the reflection.
 */
function Mirror({ showRunes, purified }: { showRunes: boolean; purified: ReadonlySet<string> }) {
  const runesInMirror = useRef<Group>(null);
  const reflector = useMemo(() => {
    const r = new Reflector(new PlaneGeometry(MIRROR_PLANE.width, MIRROR_PLANE.height), {
      textureWidth: 512,
      textureHeight: 512,
      clipBias: 0.003,
      color: 0x9aa6b4,
      multisample: 0,
    });
    const inner = r.onBeforeRender as unknown as BeforeRender;
    r.onBeforeRender = ((renderer, scene, camera, geometry, material, group) => {
      const g = runesInMirror.current;
      if (g) g.visible = true;
      inner.call(r, renderer, scene, camera, geometry, material, group);
      if (g) g.visible = false;
    }) as BeforeRender as Object3D['onBeforeRender'];
    return r;
  }, []);
  const y = MIRROR_PLANE.bottom + MIRROR_PLANE.height / 2;
  return (
    <>
      {/* Faces north (into the room), a hair off the south wall. */}
      <primitive object={reflector} position={[MIRROR_PLANE.x, y, MIRROR_PLANE.z]} rotation={[0, Math.PI, 0]} />
      <mesh position={[MIRROR_PLANE.x, y, MIRROR_PLANE.z + 0.03]}>
        <boxGeometry args={[MIRROR_PLANE.width + 0.2, MIRROR_PLANE.height + 0.2, 0.04]} />
        <meshStandardMaterial color="#5a4a2a" roughness={0.8} />
      </mesh>
      <group ref={runesInMirror} visible={false}>
        {showRunes &&
          RUNES.map((id) => {
            const w = RUNE_WALL[id];
            return (
              <group key={id} position={[w.x, RUNE_Y, w.z]} rotation={[0, w.ry, 0]}>
                <Glyph color={purified.has(id) ? '#9fe8ff' : '#b04adf'} />
              </group>
            );
          })}
      </group>
    </>
  );
}

/** A purified rune stays lit in the real room; a hinted one pulses faintly there (hint at 90 s). */
function RealRunes({ purified, runtime }: { purified: ReadonlySet<string>; runtime?: WorldRuntime }) {
  const mats = useRef<Record<string, MeshBasicMaterial | null>>({});
  useFrame(({ clock }) => {
    for (const id of RUNES) {
      const m = mats.current[id];
      if (!m) continue;
      const hinted = runtime?.highlights.includes(id) === true && !purified.has(id);
      m.opacity = purified.has(id) ? 0.9 : hinted ? 0.15 + Math.sin(clock.elapsedTime * 2) * 0.1 : 0;
    }
  });
  return (
    <>
      {RUNES.map((id) => {
        const w = RUNE_WALL[id];
        return (
          <group key={id} position={[w.x, RUNE_Y, w.z]} rotation={[0, w.ry, 0]}>
            <mesh>
              <ringGeometry args={[0.28, 0.36, 24]} />
              <meshBasicMaterial
                ref={(m) => {
                  mats.current[id] = m;
                }}
                color="#9fe8ff"
                transparent
                opacity={0}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

const WINDOW = 'light.home.felix_window' as EntityId;

/** Felix's bedroom window seen from the back lane: lit while atm_home_window has it on, with a small silhouette. */
function FelixWindow({ runtime }: { runtime?: WorldRuntime }) {
  const glass = useRef<MeshStandardMaterial>(null);
  const light = useRef<Mesh>(null);
  useFrame(() => {
    const on = runtime?.lights[WINDOW]?.effect === 'on';
    if (glass.current) glass.current.emissiveIntensity = on ? 1.4 : 0;
    if (light.current) light.current.visible = on;
  });
  const p = PLACEMENTS[WINDOW];
  if (!p) return null;
  return (
    <group position={[-27.04, 2, p.z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[1.2, 1.4]} />
        <meshStandardMaterial ref={glass} color="#1a1a22" emissive="#ffcf8a" emissiveIntensity={0} />
      </mesh>
      <mesh ref={light} position={[0, -0.15, 0.01]} visible={false}>
        <planeGeometry args={[0.32, 0.9]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

/** Grounds greybox (Beats 7-8): the hollow outbuilding with its door, the mirror with its runes, Felix's window. View only. */
export function GroundsScene({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  useSyncExternalStore(runtime?.subscribe ?? (() => () => {}), () => runtime?.version ?? 0);
  const entities = useGame((s) => s.world.entities);
  const purified = useMemo(() => new Set(RUNES.filter((id) => entities[id]?.['purified'] === true || flags.includes('runes_done'))), [entities, flags]);
  const b = OUTBUILDING_BOUNDS;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(b.minX + b.maxX) / 2, 0.02, (b.minZ + b.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ]} />
        <meshStandardMaterial color="#2a2820" roughness={1} />
      </mesh>
      {OUTBUILDING_WALLS.map((r) => (
        <Wall key={r.id} r={r} color="#4a4636" />
      ))}
      {!outbuildingDoorOpen(flags) && <Wall r={OUTBUILDING_DOOR} color="#3a2a1a" />}
      <mesh position={[(b.minX + b.maxX) / 2, OUTBUILDING_WALL_HEIGHT + 0.1, (b.minZ + b.maxZ) / 2]}>
        <boxGeometry args={[b.maxX - b.minX + 0.4, 0.2, b.maxZ - b.minZ + 0.4]} />
        <meshStandardMaterial color="#2a2a22" roughness={1} />
      </mesh>
      <pointLight position={[-52, 2.6, 30]} intensity={3} distance={10} color="#9fb0d0" />
      {outbuildingDoorOpen(flags) && <Mirror showRunes={flags.includes('seq5_done')} purified={purified} />}
      <RealRunes purified={purified} runtime={runtime} />
      <FelixWindow runtime={runtime} />
    </>
  );
}
