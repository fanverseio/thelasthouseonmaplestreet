import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three';
import type { Group, MeshStandardMaterial, PointLight } from 'three';
import type { EntityId, ProgressFlag } from '@tlh/shared';
import {
  HOUSE66_DOOR,
  LAST_HOUSE_DOOR,
  PADLOCK,
  PORTRAIT,
  SHED,
  lastHouseDoorAjar,
  shedDoorOpen,
} from '../content/world/story-props-layout.ts';
import { outbuildingDoorOpen } from '../content/world/exterior-layout.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { entityNodeName, registerModelNodes } from './model-nodes.ts';

/** View only (notes 8, 11, 15, 18, 19). Everything follows flags and runtime state; nothing here writes state. */

const BULB = 'light.hideout.shed_bulb' as EntityId;
const PADLOCK_ID = 'puzzle.grounds.padlock' as EntityId;
const PORTRAIT_ID = 'clue.grounds.portrait' as EntityId;

/** Hides the entity's grey marker box: the real model below replaces it (interactables.tsx). */
function useReplacesMarker(id: string): void {
  useEffect(() => registerModelNodes([entityNodeName(id)]), [id]);
}

function useRuntime(runtime?: WorldRuntime): void {
  useSyncExternalStore(runtime?.subscribe ?? (() => () => {}), () => runtime?.version ?? 0);
}

function Box({ p, s, color, rough = 0.9 }: { p: [number, number, number]; s: [number, number, number]; color: string; rough?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Note 8: Gartner's shed. A hollow-looking shed (solid collider) whose door swings open when Elena knocks.

const WALL = 0.3;

function Shed({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  useRuntime(runtime);
  const door = useRef<Group>(null);
  const lamp = useRef<PointLight>(null);
  const bulb = useRef<MeshStandardMaterial>(null);
  const open = shedDoorOpen(flags, runtime?.sequences.active ?? null);
  const angle = useRef(open ? -1.75 : 0);
  const s = SHED;
  const w = s.maxX - s.minX;
  const d = s.maxZ - s.minZ;
  const cx = (s.minX + s.maxX) / 2;
  const cz = (s.minZ + s.maxZ) / 2;
  const wood = '#5a4f3a';
  useFrame((_, dt) => {
    angle.current += ((open ? -1.75 : 0) - angle.current) * Math.min(1, dt * 4);
    if (door.current) door.current.rotation.y = angle.current;
    const on = runtime?.lights[BULB]?.effect === 'on';
    if (lamp.current) lamp.current.intensity = on ? 3 : open ? 0.6 : 0;
    if (bulb.current) bulb.current.emissiveIntensity = on ? 2 : 0.1;
  });
  return (
    <group>
      {/* Walls, with the doorway on the +z (street) face. */}
      <Box p={[cx, s.height / 2, s.minZ + WALL / 2]} s={[w, s.height, WALL]} color={wood} />
      <Box p={[s.minX + WALL / 2, s.height / 2, cz]} s={[WALL, s.height, d]} color={wood} />
      <Box p={[s.maxX - WALL / 2, s.height / 2, cz]} s={[WALL, s.height, d]} color={wood} />
      <Box p={[(s.minX + s.doorMinX) / 2, s.height / 2, s.maxZ - WALL / 2]} s={[s.doorMinX - s.minX, s.height, WALL]} color={wood} />
      <Box p={[(s.doorMaxX + s.maxX) / 2, s.height / 2, s.maxZ - WALL / 2]} s={[s.maxX - s.doorMaxX, s.height, WALL]} color={wood} />
      <Box p={[(s.doorMinX + s.doorMaxX) / 2, (s.doorHeight + s.height) / 2, s.maxZ - WALL / 2]} s={[s.doorMaxX - s.doorMinX, s.height - s.doorHeight, WALL]} color={wood} />
      <Box p={[cx, s.height + 0.06, cz]} s={[w + 0.4, 0.12, d + 0.4]} color="#2f2a22" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.04, cz]} receiveShadow>
        <planeGeometry args={[w - 2 * WALL, d - 2 * WALL]} />
        <meshStandardMaterial color="#3a2f22" roughness={1} />
      </mesh>
      {/* A few props: a shelf with tins, a crate, a blanket on the floor. */}
      <Box p={[cx, 1.1, s.minZ + WALL + 0.2]} s={[2.3, 0.07, 0.4]} color="#6b5a3a" />
      <Box p={[cx - 0.6, 1.25, s.minZ + WALL + 0.2]} s={[0.18, 0.22, 0.18]} color="#8a6a3a" />
      <Box p={[cx + 0.2, 1.22, s.minZ + WALL + 0.2]} s={[0.22, 0.16, 0.22]} color="#4a6a5a" />
      <Box p={[s.maxX - WALL - 0.4, 0.3, s.minZ + WALL + 0.45]} s={[0.6, 0.6, 0.6]} color="#7a6040" />
      <Box p={[s.minX + WALL + 0.55, 0.08, s.minZ + WALL + 0.7]} s={[0.9, 0.12, 0.55]} color="#7a3a3a" />
      <mesh position={[SHED.bulb.x, SHED.bulb.y, SHED.bulb.z]}>
        <sphereGeometry args={[0.07]} />
        <meshStandardMaterial ref={bulb} color="#ffe2a8" emissive="#ffcf8a" emissiveIntensity={0.1} />
      </mesh>
      <pointLight ref={lamp} position={[SHED.bulb.x, SHED.bulb.y - 0.15, SHED.bulb.z]} intensity={0} distance={6} color="#ffcf8a" />
      {/* The door leaf, hinged on the west jamb; it swings out toward the street. */}
      <group ref={door} position={[s.doorMinX, 0, s.maxZ - WALL / 2]}>
        <Box p={[(s.doorMaxX - s.doorMinX) / 2, s.doorHeight / 2, 0]} s={[s.doorMaxX - s.doorMinX - 0.04, s.doorHeight, 0.07]} color="#4a3a28" />
        <Box p={[0.85, 1, 0.07]} s={[0.1, 0.1, 0.06]} color="#c9a227" rough={0.4} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Note 11: the number "66" on House 66's front door.

function paintNumber(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1c1612';
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#c9a227';
  g.lineWidth = 8;
  g.strokeRect(6, 6, 244, 148);
  g.fillStyle = '#e8d9a0';
  g.font = 'bold 120px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('66', 128, 86);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function House66Door() {
  const tex = useMemo(paintNumber, []);
  const { x, z, width, height, plaqueY } = HOUSE66_DOOR;
  return (
    <group position={[x, 0, z + 0.04]}>
      <Box p={[0, height / 2, 0]} s={[width + 0.24, height + 0.12, 0.08]} color="#2a2018" />
      <Box p={[0, height / 2, 0.05]} s={[width, height, 0.06]} color="#5a2a2a" />
      <mesh position={[0, plaqueY, 0.1]}>
        <planeGeometry args={[0.9, 0.56]} />
        <meshBasicMaterial map={tex} toneMapped={false} fog={false} />
      </mesh>
      <pointLight position={[0, plaqueY + 0.3, 0.8]} intensity={1.5} distance={5} color="#ffcf8a" />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Note 15: a padlock with a body, a shackle, a hasp and a keyhole.

function Padlock({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  useReplacesMarker(PADLOCK_ID);
  useRuntime(runtime);
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.emissiveIntensity = runtime?.highlights.includes(PADLOCK_ID) ? 0.5 + Math.sin(clock.elapsedTime * 2) * 0.25 : 0;
  });
  if (flags.includes('padlock_open')) return null;
  return (
    <group position={[PADLOCK.x, PADLOCK.y, PADLOCK.z]}>
      {/* Hasp plate on the door, then the lock hanging from it. */}
      <Box p={[0, 0.3, 0.05]} s={[0.1, 0.3, 0.03]} color="#2b2b2b" rough={0.5} />
      <mesh position={[0, 0.03, -0.02]} castShadow>
        <boxGeometry args={[0.26, 0.22, 0.1]} />
        <meshStandardMaterial ref={mat} color="#b08a2e" metalness={0.8} roughness={0.35} emissive="#ffd27a" emissiveIntensity={0} />
      </mesh>
      {/* Shackle: a half ring, with two small posts into the body. */}
      <mesh position={[0, 0.14, -0.02]} castShadow>
        <torusGeometry args={[0.07, 0.016, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.07, 0.125, -0.02]}>
        <cylinderGeometry args={[0.016, 0.016, 0.03, 8]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[-0.07, 0.125, -0.02]}>
        <cylinderGeometry args={[0.016, 0.016, 0.03, 8]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Keyhole. */}
      <mesh position={[0, 0.04, -0.074]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.022, 12]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
      <Box p={[0, -0.01, -0.073]} s={[0.012, 0.05, 0.004]} color="#050505" />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Note 18: Rosalind with baby Felix, painted behind the mirror's runes: the portrait hints at what to do.

function paintPortrait(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 220;
  c.height = 280;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3a2f22';
  g.fillRect(0, 0, 220, 280);
  // A mirror painted behind them, with three glyphs in it.
  g.strokeStyle = '#c9a227';
  g.lineWidth = 5;
  g.strokeRect(120, 24, 80, 120);
  g.strokeStyle = '#e08cff';
  g.lineWidth = 3;
  for (const [x, y] of [[140, 56], [180, 56], [160, 112]] as const) {
    g.beginPath();
    g.arc(x, y, 9, 0, Math.PI * 2);
    g.moveTo(x - 9, y);
    g.lineTo(x + 9, y);
    g.moveTo(x, y - 9);
    g.lineTo(x, y + 9);
    g.stroke();
  }
  // Rosalind (dark dress, grey hair in a bun) holding the baby (pale bundle).
  g.fillStyle = '#1e1a1e';
  g.beginPath();
  g.ellipse(80, 250, 62, 80, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#d8c0a0';
  g.beginPath();
  g.arc(80, 118, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#9a9a9a';
  g.beginPath();
  g.arc(80, 98, 24, Math.PI, 0);
  g.arc(80, 76, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#efe6d2';
  g.beginPath();
  g.ellipse(88, 205, 34, 24, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#e0c4a4';
  g.beginPath();
  g.arc(112, 190, 14, 0, Math.PI * 2);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function Portrait({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  useReplacesMarker(PORTRAIT_ID);
  useRuntime(runtime);
  const tex = useMemo(paintPortrait, []);
  const glow = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = runtime?.highlights.includes(PORTRAIT_ID) ? 0.6 + Math.sin(clock.elapsedTime * 2) * 0.3 : 0;
  });
  if (!outbuildingDoorOpen(flags)) return null;
  const { x, y, z, width, height } = PORTRAIT;
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[width + 0.16, height + 0.16, 0.06]} />
        <meshStandardMaterial ref={glow} color="#5a4a2a" roughness={0.6} emissive="#ffd27a" emissiveIntensity={0} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Note 19: once runes_done opens the gate, the Last House front door stands ajar and light spills from the crack.

function LastHouseDoor({ flags }: { flags: readonly ProgressFlag[] }) {
  const ajar = lastHouseDoorAjar(flags);
  const light = useRef<PointLight>(null);
  const spill = useRef<MeshStandardMaterial>(null);
  const leaf = useRef<Group>(null);
  const angle = useRef(0);
  useFrame(({ clock }, dt) => {
    angle.current += ((ajar ? LAST_HOUSE_DOOR.ajarRad : 0) - angle.current) * Math.min(1, dt * 2);
    if (leaf.current) leaf.current.rotation.y = angle.current;
    const t = clock.elapsedTime;
    const k = ajar ? 0.8 + Math.sin(t * 1.7) * 0.12 + Math.sin(t * 5.3) * 0.06 : 0;
    if (light.current) light.current.intensity = 5 * k;
    if (spill.current) spill.current.opacity = 0.55 * k;
  });
  const { z, width, height, hingeX } = LAST_HOUSE_DOOR;
  if (!ajar) return null;
  const jambX = hingeX + width - 0.05;
  return (
    <group>
      {/* The dark gap, with a glowing strip in it. */}
      <mesh position={[jambX, height / 2, z - 0.03]}>
        <planeGeometry args={[0.3, height - 0.1]} />
        <meshBasicMaterial color="#cfe6ff" toneMapped={false} fog={false} />
      </mesh>
      {/* The door leaf, hinged on the west side, pushed out toward the grounds. */}
      <group ref={leaf} position={[hingeX, 0, z - 0.05]}>
        <Box p={[width / 2, height / 2, 0]} s={[width, height, 0.08]} color="#241a1c" />
      </group>
      {/* Aura: a cone of light on the ground and a glow on the facade. */}
      <pointLight ref={light} position={[jambX, 1.2, z - 0.8]} intensity={0} distance={9} color="#9fd0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[jambX, 0.05, z - 1.4]}>
        <planeGeometry args={[1.6, 2.6]} />
        <meshStandardMaterial ref={spill} color="#9fd0ff" emissive="#9fd0ff" emissiveIntensity={1} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

export function StoryProps({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  return (
    <>
      <Shed flags={flags} runtime={runtime} />
      <House66Door />
      <Padlock flags={flags} runtime={runtime} />
      <Portrait flags={flags} runtime={runtime} />
      <LastHouseDoor flags={flags} />
    </>
  );
}
