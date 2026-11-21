import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  ExtrudeGeometry,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import type { EntityId, ProgressFlag } from '@tlh/shared';
import {
  OUTBUILDING_BOUNDS,
  OUTBUILDING_DOOR,
  OUTBUILDING_WALL_HEIGHT,
  OUTBUILDING_WALLS,
  PAINTING,
  PAINTING_TEXTURE,
  RUNE_WALL,
  RUNE_Y,
} from '../content/world/grounds-layout.ts';
import { outbuildingDoorOpen } from '../content/world/exterior-layout.ts';
import type { WallRect } from '../content/world/home-layout.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { RUNE_IDS, runeSensed, runeState, type RuneId } from '../game/runes.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { gameStore, useGame } from '../store/index.ts';
import { entityNodeName, registerModelNodes } from './model-nodes.ts';
import { RUNE_GLYPHS, paintGlyph } from './rune-glyphs.ts';

const PAINTING_ID = 'clue.grounds.painting' as EntityId;

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

// ---------------------------------------------------------------------------------------------------------------
// Note 18: the family painting of Rosalind, Elena and baby Felix, where the mirror was.

/** A warm, dark canvas with soft brush texture: shown until the author's painting file exists (or if it fails). */
function paintPlaceholder(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 256;
  const g = c.getContext('2d')!;
  const bg = g.createRadialGradient(192, 110, 20, 192, 128, 230);
  bg.addColorStop(0, '#5a3d24');
  bg.addColorStop(0.55, '#2e1f14');
  bg.addColorStop(1, '#120c08');
  g.fillStyle = bg;
  g.fillRect(0, 0, 384, 256);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // brush strokes: short warm and dark dabs, varnish crackle
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 384;
    const y = rnd() * 256;
    const warm = rnd() > 0.5;
    g.strokeStyle = warm ? `rgba(150, 100, 55, ${0.03 + rnd() * 0.05})` : `rgba(10, 6, 3, ${0.05 + rnd() * 0.08})`;
    g.lineWidth = 1 + rnd() * 3;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + rnd() * 10 - 5, y + rnd() * 6 - 3, x + rnd() * 18 - 9, y + rnd() * 8 - 4);
    g.stroke();
  }
  g.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  g.lineWidth = 0.5;
  for (let i = 0; i < 60; i++) {
    let x = rnd() * 384;
    let y = rnd() * 256;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += rnd() * 16 - 8;
      y += rnd() * 16 - 8;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The author's canvas if it loads, else the placeholder. A missing file is expected for now (no error). */
function usePaintingTexture(): Texture {
  const placeholder = useMemo(paintPlaceholder, []);
  const [tex, setTex] = useState<Texture>(placeholder);
  useEffect(() => {
    let live = true;
    new TextureLoader().load(
      PAINTING_TEXTURE,
      (t) => {
        if (!live) return;
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 4;
        setTex(t);
      },
      undefined,
      () => {}, // keep the placeholder
    );
    return () => {
      live = false;
    };
  }, []);
  return tex;
}

/** A soft gilt finish: gold with darker hollows, for the frame's mouldings. */
function paintGilt(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, '#6e5222');
  grad.addColorStop(0.3, '#d2ad5c');
  grad.addColorStop(0.5, '#a07a33');
  grad.addColorStop(0.75, '#e0c27a');
  grad.addColorStop(1, '#5a421b');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  // tarnish and worn leaf
  let seed = 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 160; i++) {
    g.fillStyle = rnd() > 0.5 ? `rgba(40, 26, 8, ${0.15 + rnd() * 0.2})` : `rgba(255, 230, 160, ${0.08 + rnd() * 0.1})`;
    g.fillRect(rnd() * 64, rnd() * 256, 1 + rnd() * 3, 2 + rnd() * 10);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/**
 * One mitred frame side, as two stacked bevelled trapezoids (outer edge len + 2w, inner edge len): a broad gilt flat and
 * a raised bead along the sight edge, which reads as a carved moulding at room distance.
 */
function frameSide(len: number, w: number): ExtrudeGeometry[] {
  const trap = (a: number, b: number) => {
    // a..b: distance from the outer edge (0) toward the inner edge (w)
    const t = new Shape();
    t.moveTo(-len / 2 - w + a, a);
    t.lineTo(len / 2 + w - a, a);
    t.lineTo(len / 2 + w - b, b);
    t.lineTo(-len / 2 - w + b, b);
    t.closePath();
    return t;
  };
  return [
    new ExtrudeGeometry(trap(0, w), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 1 }),
    new ExtrudeGeometry(trap(w * 0.62, w * 0.86), { depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 1 }),
  ];
}

function Painting({ runtime }: { runtime?: WorldRuntime }) {
  useEffect(() => registerModelNodes([entityNodeName(PAINTING_ID)]), []);
  const canvas = usePaintingTexture();
  const gilt = useMemo(paintGilt, []);
  const glow = useRef<MeshStandardMaterial[]>([]);
  const { x, y, z, width, height, frame } = PAINTING;
  const sides = useMemo(
    () => [
      { geo: frameSide(width, frame), pos: [0, -height / 2, 0] as const, rot: 0 },
      { geo: frameSide(width, frame), pos: [0, height / 2, 0] as const, rot: Math.PI },
      { geo: frameSide(height, frame), pos: [-width / 2, 0, 0] as const, rot: -Math.PI / 2 },
      { geo: frameSide(height, frame), pos: [width / 2, 0, 0] as const, rot: Math.PI / 2 },
    ],
    [width, height, frame],
  );
  useFrame(({ clock }) => {
    const on = runtime?.highlights.includes(PAINTING_ID) === true;
    for (const m of glow.current) if (m) m.emissiveIntensity = on ? 0.35 + Math.sin(clock.elapsedTime * 2) * 0.2 : 0;
  });
  const corners: [number, number][] = [
    [-width / 2 - frame / 2, -height / 2 - frame / 2],
    [width / 2 + frame / 2, -height / 2 - frame / 2],
    [-width / 2 - frame / 2, height / 2 + frame / 2],
    [width / 2 + frame / 2, height / 2 + frame / 2],
  ];
  return (
    // Hangs on the south wall's inner face, facing north (-z) into the room.
    <group position={[x, y, z - 0.005]} rotation={[0, Math.PI, 0]}>
      {/* The canvas, set a little into the frame. */}
      <mesh position={[0, 0, 0.03]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={canvas} roughness={0.85} />
      </mesh>
      {/* A dark slip between canvas and gilt. */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[width + 0.06, height + 0.06]} />
        <meshStandardMaterial color="#1a120a" roughness={0.9} />
      </mesh>
      {sides.map((s, i) => (
        <group key={i} position={[s.pos[0], s.pos[1], 0]} rotation={[0, 0, s.rot]}>
          {s.geo.map((g, k) => (
            <mesh key={k} geometry={g} position={[0, -frame, 0]} castShadow={k === 0}>
              <meshStandardMaterial
                ref={(m) => {
                  if (m) glow.current[i * 2 + k] = m;
                }}
                map={gilt}
                color={k === 0 ? '#d9b46a' : '#f0d08a'}
                metalness={0}
                roughness={k === 0 ? 0.42 : 0.3}
                emissive="#ffd27a"
                emissiveIntensity={0}
              />
            </mesh>
          ))}
        </group>
      ))}
      {/* Carved corner cartouches: a rosette with four leaves. */}
      {corners.map(([cx, cy], i) => (
        <group key={i} position={[cx, cy, 0.11]}>
          <mesh>
            <sphereGeometry args={[0.05, 12, 8]} />
            <meshStandardMaterial map={gilt} color="#e6c27a" metalness={0} roughness={0.32} />
          </mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2 + Math.PI / 4]} position={[Math.cos((k * Math.PI) / 2 + Math.PI / 4) * 0.08, Math.sin((k * Math.PI) / 2 + Math.PI / 4) * 0.08, -0.01]} scale={[1.8, 0.7, 0.5]}>
              <sphereGeometry args={[0.04, 10, 6]} />
              <meshStandardMaterial map={gilt} color="#d9b46a" metalness={0} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* A crest at the top centre and a small title plate below. */}
      <group position={[0, height / 2 + frame * 0.6, 0.11]}>
        <mesh scale={[1.6, 1, 0.5]}>
          <sphereGeometry args={[0.09, 14, 8]} />
          <meshStandardMaterial map={gilt} color="#e6c27a" metalness={0} roughness={0.33} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, -0.02, -0.01]} rotation={[0, 0, s * 0.5]} scale={[2.6, 0.6, 0.45]}>
            <sphereGeometry args={[0.05, 10, 6]} />
            <meshStandardMaterial map={gilt} color="#d9b46a" metalness={0} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, -height / 2 - frame / 2, 0.115]}>
        <boxGeometry args={[0.36, 0.08, 0.01]} />
        <meshStandardMaterial color="#b08a3e" metalness={0} roughness={0.35} />
      </mesh>
      {/* Brass picture light above the frame, and its warm wash on the canvas. */}
      <mesh position={[0, height / 2 + frame + 0.12, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 10]} />
        <meshStandardMaterial color="#b08a3e" metalness={0} roughness={0.35} emissive="#ffb35c" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, height / 2 + frame + 0.06, 0.08]}>
        <boxGeometry args={[0.04, 0.14, 0.04]} />
        <meshStandardMaterial color="#b08a3e" metalness={0} roughness={0.35} />
      </mesh>
      <pointLight position={[0, height / 2 + frame, 0.7]} intensity={3.2} distance={4.5} color="#ffcf8a" />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Note 17: three hidden runes, flowing glowing paint, woken by Purify (game/runes.ts).

const RUNE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * The glyph texture: alpha = the stroke, green = how far along the strokes that pixel is (0..1), so the paint can flow
 * in along the strokes when the rune wakes, and light can run along them afterwards. The halo is a few blurred taps.
 */
const RUNE_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uTime;
uniform float uReveal;
uniform float uPurified;
uniform float uSense;
uniform vec3 uColor;
uniform vec3 uPure;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec4 t = texture2D(map, vUv);
  float core = t.a;
  float prog = t.g;
  float halo = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 o = vec2(cos(a), sin(a));
    halo += texture2D(map, vUv + o * 0.018).a + texture2D(map, vUv + o * 0.04).a * 0.6;
  }
  halo /= 12.8;
  // Paint flows in along the strokes as uReveal goes 0 -> 1, with a ragged wet edge.
  float edge = uReveal * 1.15 - prog + (noise(vUv * 18.0 + uTime * 0.4) - 0.5) * 0.08;
  float shown = smoothstep(0.0, 0.06, edge);
  float wet = smoothstep(0.12, 0.0, abs(edge - 0.03)) * step(0.001, uReveal) * (1.0 - uPurified);
  // Light runs along the strokes; a slow breath over the whole glyph.
  float run = 0.55 + 0.45 * sin(prog * 18.0 - uTime * 2.4);
  float breath = 0.8 + 0.2 * sin(uTime * 1.3);
  float shimmer = uSense * (0.12 + 0.1 * sin(uTime * 4.0 + prog * 25.0)) * (0.6 + 0.4 * noise(vUv * 40.0 + uTime));
  vec3 col = mix(uColor, uPure, uPurified);
  float a = core * (shown * run * breath + wet * 1.5 + shimmer) + halo * (shown * 0.55 * breath + shimmer * 0.5);
  gl_FragColor = vec4(col * (1.0 + wet * 0.8), clamp(a, 0.0, 1.0));
}`;

function Rune({ id, runtime }: { id: RuneId; runtime?: WorldRuntime }) {
  const entities = useGame((s) => s.world.entities);
  const flags = useGame((s) => s.progress.flags);
  const state = flags.includes('runes_done') ? 'purified' : runeState(entities, id);
  const tex = useMemo(() => paintGlyph(RUNE_GLYPHS[id]), [id]);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: RUNE_VERT,
        fragmentShader: RUNE_FRAG,
        uniforms: {
          map: { value: tex },
          uTime: { value: 0 },
          uReveal: { value: state === 'hidden' ? 0 : 1 },
          uPurified: { value: state === 'purified' ? 1 : 0 },
          uSense: { value: 0 },
          uColor: { value: [0.78, 0.45, 1.0] },
          uPure: { value: [1.0, 0.86, 0.55] },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    // The material lives as long as the rune; state changes animate its uniforms in useFrame.
    [tex],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const seq5 = flags.includes('seq5_done');
  useFrame(({ clock }, dt) => {
    const u = mat.uniforms;
    u.uTime!.value = clock.elapsedTime;
    const targetReveal = state === 'hidden' ? 0 : 1;
    // the paint takes about 1.6 s to flow in
    u.uReveal!.value += Math.sign(targetReveal - u.uReveal!.value) * Math.min(Math.abs(targetReveal - u.uReveal!.value), dt / 1.6);
    u.uPurified!.value += ((state === 'purified' ? 1 : 0) - u.uPurified!.value) * Math.min(1, dt * 1.5);
    const p = gameStore.getState().player;
    const sensed = seq5 && state === 'hidden' && runeSensed(p.selectedSpell, { x: p.pos[0], z: p.pos[2] }, id);
    const hinted = seq5 && state === 'hidden' && runtime?.highlights.includes(id) === true;
    const want = sensed ? 1 : hinted ? 0.6 : 0;
    u.uSense!.value += (want - u.uSense!.value) * Math.min(1, dt * 3);
  });
  const w = RUNE_WALL[id];
  return (
    <mesh position={[w.x, RUNE_Y, w.z]} rotation={[0, w.ry, 0]} material={mat}>
      <planeGeometry args={[1.25, 1.25]} />
    </mesh>
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

/** Grounds (Beats 7-8): the hollow outbuilding with its door, Rosalind's painting, the hidden runes, Felix's window. View only. */
export function GroundsScene({ flags, runtime }: { flags: readonly ProgressFlag[]; runtime?: WorldRuntime }) {
  useSyncExternalStore(runtime?.subscribe ?? (() => () => {}), () => runtime?.version ?? 0);
  const b = OUTBUILDING_BOUNDS;
  const open = outbuildingDoorOpen(flags);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(b.minX + b.maxX) / 2, 0.02, (b.minZ + b.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ]} />
        <meshStandardMaterial color="#2a2820" roughness={1} />
      </mesh>
      {OUTBUILDING_WALLS.map((r) => (
        <Wall key={r.id} r={r} color="#4a4636" />
      ))}
      {!open && <Wall r={OUTBUILDING_DOOR} color="#3a2a1a" />}
      <mesh position={[(b.minX + b.maxX) / 2, OUTBUILDING_WALL_HEIGHT + 0.1, (b.minZ + b.maxZ) / 2]}>
        <boxGeometry args={[b.maxX - b.minX + 0.4, 0.2, b.maxZ - b.minZ + 0.4]} />
        <meshStandardMaterial color="#2a2a22" roughness={1} />
      </mesh>
      <pointLight position={[-52, 2.6, 29.5]} intensity={2.2} distance={10} color="#9fb0d0" />
      {open && <Painting runtime={runtime} />}
      {open && flags.includes('seq5_done') && RUNE_IDS.map((id) => <Rune key={id} id={id} runtime={runtime} />)}
      <FelixWindow runtime={runtime} />
    </>
  );
}
