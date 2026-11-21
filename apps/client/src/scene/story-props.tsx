import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { AdditiveBlending, CanvasTexture, DoubleSide, ExtrudeGeometry, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace } from 'three';
import type { Group, MeshStandardMaterial, PointLight } from 'three';
import type { EntityId, ProgressFlag } from '@tlh/shared';
import {
  HOUSE66_DOOR,
  LAST_HOUSE_DOOR,
  PADLOCK,
  SHED,
  lastHouseDoorAjar,
  lastHouseDoorOutline,
  shedDoorOpen,
} from '../content/world/story-props-layout.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { entityNodeName, registerModelNodes } from './model-nodes.ts';

/** View only (notes 8, 11, 15, 19). Everything follows flags and runtime state; nothing here writes state. */

const BULB = 'light.hideout.shed_bulb' as EntityId;
const PADLOCK_ID = 'puzzle.grounds.padlock' as EntityId;

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
// Note 19: the Last House front door. A plank door in the pointed stone surround of last_house_ext.glb: vertical
// boards with grain, two ledges, three iron strap hinges with studs, a ring knocker. Once runes_done opens the gate it
// swings ajar and a cold light spills out of the house.

/** Vertical oak boards with grain and dark joints, drawn once (the whole leaf, 1.2 x 3.16 m). */
function paintBoards(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 640;
  const g = c.getContext('2d')!;
  const boards = 5;
  const bw = c.width / boards;
  let seed = 31;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < boards; i++) {
    const shade = 40 + Math.floor(rnd() * 14);
    g.fillStyle = `rgb(${shade + 22}, ${shade + 6}, ${shade - 8})`;
    g.fillRect(i * bw, 0, bw, c.height);
    // grain: long wavy lines and a knot or two
    for (let k = 0; k < 14; k++) {
      const x0 = i * bw + 3 + rnd() * (bw - 6);
      g.strokeStyle = `rgba(20, 10, 4, ${0.18 + rnd() * 0.22})`;
      g.lineWidth = 0.6 + rnd() * 1.4;
      g.beginPath();
      g.moveTo(x0, 0);
      for (let y = 0; y <= c.height; y += 32) g.lineTo(x0 + Math.sin(y * 0.013 + k) * (1.5 + rnd() * 2.5), y);
      g.stroke();
    }
    if (rnd() > 0.4) {
      const kx = i * bw + bw * (0.3 + rnd() * 0.4);
      const ky = 80 + rnd() * 480;
      g.fillStyle = 'rgba(18, 9, 3, 0.55)';
      g.beginPath();
      g.ellipse(kx, ky, 3 + rnd() * 3, 7 + rnd() * 5, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(6, 3, 1, 0.85)';
    g.fillRect(i * bw, 0, 2, c.height); // the joint between boards
  }
  // weathering: lighter along the bottom, darker toward the head
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(120, 110, 90, 0.18)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  // ExtrudeGeometry's UVs are in metres: one copy of the canvas over the whole leaf.
  t.repeat.set(1 / LAST_HOUSE_DOOR.width, 1 / LAST_HOUSE_DOOR.height);
  return t;
}

function doorShape(inset = 0): Shape {
  const pts = lastHouseDoorOutline();
  const cx = LAST_HOUSE_DOOR.width / 2;
  const cy = LAST_HOUSE_DOOR.height * 0.45;
  const s = new Shape();
  pts.forEach(([x, y], i) => {
    // pull each point toward the centre to make a slightly smaller copy (the glow opening, the leaf fits inside)
    const k = inset === 0 ? 1 : 1 - inset;
    const px = cx + (x - cx) * k;
    const py = y === 0 ? y : cy + (y - cy) * k;
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  });
  s.closePath();
  return s;
}

const IRON = { color: '#2a2c33', metalness: 1, roughness: 0.5 } as const;

/** One iron strap hinge running from the hinge side across the boards, with studs and a split scroll end. */
function Strap({ y, len }: { y: number; len: number }) {
  const studs = Math.max(3, Math.round(len / 0.18));
  return (
    <group position={[0, y, -0.042]}>
      <mesh position={[len / 2, 0, 0]} castShadow>
        <boxGeometry args={[len, 0.07, 0.012]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {Array.from({ length: studs }, (_, i) => (
        <mesh key={i} position={[0.08 + (i * (len - 0.16)) / (studs - 1), 0, -0.008]}>
          <sphereGeometry args={[0.014, 6, 4]} />
          <meshStandardMaterial {...IRON} roughness={0.35} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={s} position={[len + 0.03, s * 0.03, 0]} rotation={[0, 0, s * 0.6]}>
          <torusGeometry args={[0.035, 0.008, 4, 10, Math.PI * 1.3]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
      ))}
      {/* the knuckle on the hinge side */}
      <mesh position={[0.005, 0, 0.03]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
    </group>
  );
}

function DoorLeaf() {
  const { width } = LAST_HOUSE_DOOR;
  const tex = useMemo(paintBoards, []);
  const geo = useMemo(() => {
    const g = new ExtrudeGeometry(doorShape(), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 1 });
    g.translate(0, 0, -0.03);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={tex} color="#9a7a62" roughness={0.78} />
      </mesh>
      {/* Two ledges across the back show as raised rails on the face. */}
      {[0.45, 1.75].map((y) => (
        <mesh key={y} position={[width / 2, y, -0.04]} castShadow>
          <boxGeometry args={[width - 0.08, 0.11, 0.02]} />
          <meshStandardMaterial map={tex} color="#7a5e4a" roughness={0.8} />
        </mesh>
      ))}
      <Strap y={0.3} len={width * 0.8} />
      <Strap y={1.35} len={width * 0.7} />
      <Strap y={2.3} len={width * 0.55} />
      {/* Ring knocker on a round plate, and a keyhole escutcheon below it. */}
      <group position={[width - 0.24, 1.25, -0.045]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.012, 12]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
        <mesh position={[0, -0.08, -0.012]}>
          <torusGeometry args={[0.075, 0.011, 6, 16]} />
          <meshStandardMaterial {...IRON} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[0.06, 0.13, 0.01]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
        <mesh position={[0, -0.32, -0.006]}>
          <boxGeometry args={[0.012, 0.045, 0.004]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
      </group>
    </group>
  );
}

function LastHouseDoor({ flags }: { flags: readonly ProgressFlag[] }) {
  const ajar = lastHouseDoorAjar(flags);
  const light = useRef<PointLight>(null);
  const spill = useRef<MeshStandardMaterial>(null);
  const glow = useRef<MeshStandardMaterial>(null);
  const leaf = useRef<Group>(null);
  const angle = useRef(ajar ? LAST_HOUSE_DOOR.ajarRad : 0);
  const opening = useMemo(() => new ShapeGeometry(doorShape(0.02)), []);
  useFrame(({ clock }, dt) => {
    angle.current += ((ajar ? LAST_HOUSE_DOOR.ajarRad : 0) - angle.current) * Math.min(1, dt * 2);
    if (leaf.current) leaf.current.rotation.y = angle.current;
    const t = clock.elapsedTime;
    const k = ajar ? 0.8 + Math.sin(t * 1.7) * 0.12 + Math.sin(t * 5.3) * 0.06 : 0;
    if (light.current) light.current.intensity = 5 * k;
    if (spill.current) spill.current.opacity = 0.5 * k;
    if (glow.current) glow.current.emissiveIntensity = 2.2 * k;
  });
  const { z, sill, hingeX } = LAST_HOUSE_DOOR;
  return (
    <group position={[0, sill, 0]}>
      {/* The opening behind the leaf: dark while shut, a cold glow once the door stands ajar. */}
      <mesh geometry={opening} position={[hingeX, 0, z - 0.03]}>
        <meshStandardMaterial ref={glow} color="#06080c" emissive="#bfdcff" emissiveIntensity={0} roughness={1} toneMapped={false} side={DoubleSide} />
      </mesh>
      {/* The leaf, hinged on the west jamb; it swings out toward the grounds. */}
      <group ref={leaf} position={[hingeX, 0, z - 0.07]}>
        <DoorLeaf />
      </group>
      {ajar && (
        <>
          <pointLight ref={light} position={[hingeX + 0.9, 1.1, z - 0.9]} intensity={0} distance={9} color="#9fd0ff" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[hingeX + 0.75, 0.01, z - 1.3]}>
            <planeGeometry args={[1.5, 2.4]} />
            <meshStandardMaterial ref={spill} color="#9fd0ff" emissive="#9fd0ff" emissiveIntensity={1} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function StoryProps({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  return (
    <>
      <Shed flags={flags} runtime={runtime} />
      <House66Door />
      <Padlock flags={flags} runtime={runtime} />
      <LastHouseDoor flags={flags} />
    </>
  );
}
