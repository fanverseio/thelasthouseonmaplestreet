/**
 * Dev-only character viewer: run `npm run dev`, then open http://localhost:5173/char-preview.html (not in the build).
 * Buttons cycle the characters and their states, using the real game rendering (EnemyModel, NpcModel, SmokeWraith)
 * with a fake enemy, so clips, the red eyes, the aura and the wraith can be checked without playing to each fight.
 *
 * Eye placement: press "Place left eye" (or right), then click the face. The point is stored in the Head bone's
 * space, shown below the buttons, and kept in localStorage; "Copy eyes" copies the lines for character-config.ts.
 * URL options: ?only=fox picks a character, ?state=chase pins a state, ?bright=1 lights it up.
 */
import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import type { Object3D } from 'three';
import type { Enemy, EnemyState, EnemyView } from '../game/enemies.ts';
import { ENEMY_LOOKS, HEAD_BONE, NPC_LOOKS, type CharacterLook, type EyeAnchors, type Vec3 } from '../scene/character-config.ts';
import { EnemyModel, NpcModel, WithCharacter } from '../scene/characters.tsx';
import { SmokeWraith } from '../scene/smoke-wraith.tsx';

const q = new URLSearchParams(location.search);

interface Entry {
  id: string;
  label: string;
  kind: 'enemy' | 'npc' | 'wraith';
  /** Top speed for the fake enemy (walk / run clips). */
  speed: number;
  /** Rough height, to frame the camera. */
  height: number;
}

const ENTRIES: Entry[] = [
  { id: 'briggs', label: 'Briggs', kind: 'enemy', speed: 3, height: 1.8 },
  { id: 'watcher', label: 'Watcher', kind: 'enemy', speed: 3.5, height: 1.8 },
  { id: 'shadow_decoy', label: 'Shadow decoy', kind: 'enemy', speed: 4, height: 1.8 },
  { id: 'fox', label: 'Fox', kind: 'enemy', speed: 5, height: 0.55 },
  { id: 'hound', label: 'Hound', kind: 'enemy', speed: 5, height: 0.8 },
  { id: 'cat', label: 'Cat', kind: 'enemy', speed: 6, height: 0.35 },
  { id: 'smoke_wraith', label: 'Smoke wraith', kind: 'wraith', speed: 4.5, height: 1.4 },
  { id: 'npc.hideout.gartner', label: 'Gartner', kind: 'npc', speed: 0, height: 1.35 },
  { id: 'npc.ritual.felix', label: 'Felix', kind: 'npc', speed: 0, height: 2.4 },
];

const STATES: (EnemyState | 'cycle')[] = ['cycle', 'idle', 'patrol', 'chase', 'attack', 'stunned', 'purified', 'destroyed'];
const CYCLE: { state: EnemyState; s: number }[] = [
  { state: 'idle', s: 3 },
  { state: 'patrol', s: 4 },
  { state: 'chase', s: 3 },
  { state: 'attack', s: 2.2 },
  { state: 'chase', s: 1 },
  { state: 'stunned', s: 4 },
  { state: 'purified', s: 5 },
];
const TOTAL = CYCLE.reduce((a, c) => a + c.s, 0);
const EYES_KEY = 'tlh.dev.eyes';

interface Fake {
  id: string;
  def: { id: string; speed: number; kind: string };
  x: number;
  z: number;
  state: EnemyState;
  engaged: boolean;
  tele: number | null;
  slam: boolean;
  view(): EnemyView;
}

function fake(e: Entry): Fake {
  const f: Fake = {
    id: `preview_${e.id}`, def: { id: e.id, speed: e.speed, kind: e.kind }, x: 0, z: 0, state: 'idle', engaged: false, tele: null, slam: e.id === 'briggs',
    view: () => ({ id: f.id, defId: e.id, state: f.state, x: f.x, z: f.z, hp: 1, maxHp: 1, telegraph: f.tele, staggered: false, ring: f.tele !== null && f.slam ? 3 : null, mark: null }),
  };
  return f;
}

/** Moves the fake enemy through the chosen state (or the whole cycle) and writes the state shown on screen. */
function Driver({ enemy, pinned, onState }: { enemy: Fake; pinned: EnemyState | 'cycle'; onState: (s: string) => void }) {
  const last = useRef('');
  useFrame(({ clock }) => {
    let t = clock.elapsedTime % TOTAL;
    let phase = CYCLE[0]!;
    let into = 0;
    for (const c of CYCLE) {
      if (t < c.s) {
        phase = c;
        into = t / c.s;
        break;
      }
      t -= c.s;
    }
    const state = pinned === 'cycle' ? phase.state : pinned;
    if (pinned !== 'cycle') into = (clock.elapsedTime % 2.2) / 2.2;
    enemy.state = state;
    enemy.engaged = state === 'chase' || state === 'attack';
    enemy.tele = state === 'attack' && into < 0.62 ? Math.min(1, into * 1.6) : null;
    // Walk a small circle while patrolling or chasing so the walk and run clips show.
    const v = state === 'patrol' ? 0.35 * enemy.def.speed : state === 'chase' ? enemy.def.speed * 0.9 : 0;
    const a = clock.elapsedTime * (v / 1.2);
    enemy.x = v ? Math.sin(a) * 1.2 : 0;
    enemy.z = v ? Math.cos(a) * 1.2 - 1.2 : 0;
    if (state !== last.current) {
      last.current = state;
      onState(state);
    }
  });
  return null;
}

/** Puts the camera in front of the character whenever the character changes. */
function Framer({ entry }: { entry: Entry }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    const h = entry.height;
    const dist = Math.max(1.4, h * 2.1);
    camera.position.set(0, h * 0.75, dist);
    const c = controls as unknown as { target: { set(x: number, y: number, z: number): void }; update(): void } | null;
    c?.target.set(0, h * 0.6, 0);
    c?.update();
  }, [entry, camera, controls]);
  return null;
}

function findHead(o: Object3D): Object3D | undefined {
  let n: Object3D | null = o;
  while (n) {
    const head = n.getObjectByName(HEAD_BONE);
    if (head) return head;
    n = n.parent;
  }
  return undefined;
}

const round = (v: number): number => Math.round(v * 10000) / 10000;

function Scene({ entry, pinned, eyes, placing, onPlace, onState }: {
  entry: Entry;
  pinned: EnemyState | 'cycle';
  eyes: EyeAnchors | undefined;
  placing: 'l' | 'r' | null;
  onPlace: (side: 'l' | 'r', p: Vec3) => void;
  onState: (s: string) => void;
}) {
  const enemy = useMemo(() => fake(entry), [entry]);
  // A fresh look object when the eyes change, so the rig rebuilds with the new anchors.
  const look = useMemo<CharacterLook | undefined>(() => {
    const base = ENEMY_LOOKS[entry.id] ?? NPC_LOOKS[entry.id];
    return base && eyes ? { ...base, eyes } : base;
  }, [entry, eyes]);
  const click = (e: ThreeEvent<PointerEvent>) => {
    if (!placing) return;
    e.stopPropagation();
    const head = findHead(e.object);
    if (!head) return;
    const p = head.worldToLocal(e.point.clone());
    onPlace(placing, [round(p.x), round(p.y), round(p.z)]);
  };
  return (
    <>
      <color attach="background" args={['#0c0f17']} />
      <fogExp2 attach="fog" args={['#0c0f17', 0.03]} />
      <ambientLight intensity={q.get('bright') ? 2.5 : 0.6} />
      <directionalLight position={[-6, 10, 6]} intensity={1.2} color="#9fb4d8" />
      <pointLight position={[0, 3, 4]} intensity={20} distance={18} color="#ffb35c" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a1c22" roughness={1} />
      </mesh>
      <Framer entry={entry} />
      {entry.kind !== 'npc' && <Driver enemy={enemy} pinned={pinned} onState={onState} />}
      <group onPointerDown={click}>
        {entry.kind === 'wraith' && <SmokeWraith key={entry.id} enemy={enemy as unknown as Enemy} />}
        {entry.kind === 'enemy' && look && (
          <WithCharacter key={entry.id} url={look.url} fallback={null}>
            <EnemyModel enemy={enemy as unknown as Enemy} look={look} />
          </WithCharacter>
        )}
        {entry.kind === 'npc' && look && (
          <WithCharacter key={entry.id} url={look.url} fallback={null}>
            <NpcModel id={entry.id} look={NPC_LOOKS[entry.id]!} at={{ x: 0, z: 0 }} />
          </WithCharacter>
        )}
      </group>
      <OrbitControls makeDefault target={[0, 0.8, 0]} />
    </>
  );
}

function loadEyes(): Record<string, EyeAnchors> {
  try {
    return JSON.parse(localStorage.getItem(EYES_KEY) ?? '{}') as Record<string, EyeAnchors>;
  } catch {
    return {};
  }
}

const btn = (on: boolean): CSSProperties => ({
  padding: '6px 10px', margin: '0 6px 6px 0', border: '1px solid #3a4152', borderRadius: 4, cursor: 'pointer',
  background: on ? '#ffb35c' : '#1a1e29', color: on ? '#111' : '#dde', font: '13px sans-serif',
});

function App() {
  const start = Math.max(0, ENTRIES.findIndex((e) => e.id === q.get('only')));
  const [index, setIndex] = useState(start);
  const [pinned, setPinned] = useState<EnemyState | 'cycle'>((q.get('state') as EnemyState | null) ?? 'cycle');
  const [shown, setShown] = useState('');
  const [placing, setPlacing] = useState<'l' | 'r' | null>(null);
  const [edits, setEdits] = useState<Record<string, EyeAnchors>>(loadEyes);
  const [copied, setCopied] = useState(false);
  const entry = ENTRIES[index]!;
  const look = ENEMY_LOOKS[entry.id];
  const eyes = edits[entry.id] ?? look?.eyes;
  const step = (d: number) => {
    setIndex((i) => (i + d + ENTRIES.length) % ENTRIES.length);
    setPlacing(null);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const place = (side: 'l' | 'r', p: Vec3) => {
    const cur = eyes ?? { l: p, r: p };
    const next = { ...edits, [entry.id]: { ...cur, [side]: p } };
    setEdits(next);
    localStorage.setItem(EYES_KEY, JSON.stringify(next));
    setPlacing(side === 'l' ? 'r' : null); // left, then straight on to the right
  };
  const resetEyes = () => {
    const next = { ...edits };
    delete next[entry.id];
    setEdits(next);
    localStorage.setItem(EYES_KEY, JSON.stringify(next));
  };
  const snippet = Object.entries(edits)
    .map(([id, e]) => `${id}: eyes: { l: [${e.l.join(', ')}], r: [${e.r.join(', ')}] },`)
    .join('\n');
  const copy = () => {
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <Canvas camera={{ position: [0, 1.4, 3.6], fov: 45 }} style={{ cursor: placing ? 'crosshair' : 'grab' }}>
        <Suspense fallback={null}>
          <Scene entry={entry} pinned={pinned} eyes={eyes} placing={placing} onPlace={place} onState={setShown} />
        </Suspense>
      </Canvas>
      <div style={{ position: 'fixed', left: 10, top: 10, right: 10, color: '#dde', font: '13px sans-serif' }}>
        <div>
          <button type="button" style={btn(false)} onClick={() => step(-1)} aria-label="Previous character">◀ Prev</button>
          {ENTRIES.map((e, i) => (
            <button type="button" key={e.id} style={btn(i === index)} onClick={() => { setIndex(i); setPlacing(null); }} aria-pressed={i === index}>
              {e.label}
            </button>
          ))}
          <button type="button" style={btn(false)} onClick={() => step(1)} aria-label="Next character">Next ▶</button>
        </div>
        {entry.kind !== 'npc' && (
          <div>
            {STATES.map((s) => (
              <button type="button" key={s} style={btn(pinned === s)} onClick={() => setPinned(s)} aria-pressed={pinned === s}>
                {s}
              </button>
            ))}
          </div>
        )}
        {look?.corrupted && (
          <div>
            <button type="button" style={btn(placing === 'l')} onClick={() => setPlacing(placing === 'l' ? null : 'l')}>Place left eye</button>
            <button type="button" style={btn(placing === 'r')} onClick={() => setPlacing(placing === 'r' ? null : 'r')}>Place right eye</button>
            <button type="button" style={btn(false)} onClick={resetEyes} disabled={!edits[entry.id]}>Reset eyes</button>
            <button type="button" style={btn(copied)} onClick={copy} disabled={!snippet}>{copied ? 'Copied' : 'Copy eyes'}</button>
          </div>
        )}
        <div style={{ marginTop: 4, textShadow: '0 1px 2px #000' }}>
          <b>{entry.label}</b>
          {entry.kind !== 'npc' && <> · state: {shown || pinned}</>}
          {placing && <> · click the {placing === 'l' ? 'left' : 'right'} eye (the character's own {placing === 'l' ? 'left' : 'right'})</>}
          {eyes && look?.corrupted && <> · eyes L [{eyes.l.join(', ')}] R [{eyes.r.join(', ')}]{edits[entry.id] ? ' (edited)' : ''}</>}
          <div style={{ opacity: 0.7 }}>Drag to orbit, scroll to zoom. Arrow keys change character.</div>
        </div>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
