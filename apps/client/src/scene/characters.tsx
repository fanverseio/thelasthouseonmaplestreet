import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import {
  AdditiveBlending,
  AnimationMixer,
  BackSide,
  CanvasTexture,
  Color,
  LoopOnce,
  LoopRepeat,
  MeshBasicMaterial,
  Object3D,
  SkinnedMesh,
  Sprite,
  SpriteMaterial,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PLACEMENTS } from '../content/world/placements.ts';
import { sceneOfEntity } from '../content/world/scene-of.ts';
import type { CombatFeedback } from '../game/combat-feedback.ts';
import type { Enemy } from '../game/enemies.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { useGame } from '../store/index.ts';
import { CLIP_FALLBACK, enemyClip, HEAD_BONE, headingOf, NPC_LOOKS, turnDelta, type CharacterLook, type ClipName, type NpcLook } from './character-config.ts';
import { entityNodeName, registerModelNodes } from './model-nodes.ts';

/*
 * Animated characters: the auto-rigged GLBs with their clips, plus the corruption look (red eye glow on the
 * eye_L / eye_R nodes and two dark shells around the skinned mesh). View only: all state comes from the
 * EnemySystem / WorldRuntime, exactly like the greybox boxes these replace.
 */

const FADE_S = 0.25;
const RED = new Color('#ff2a12');
const WHITE = new Color('#ffffff');
const TELEGRAPH = new Color('#ff5a10');
const tmp = new Vector3();
const tmp2 = new Vector3();

// ---------------------------------------------------------------------------------------------------------------
// Shared resources.

let glowTex: Texture | null = null;
function glowTexture(): Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,150,120,0.95)');
  grad.addColorStop(0.45, 'rgba(255,40,10,0.35)');
  grad.addColorStop(1, 'rgba(255,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowTex = new CanvasTexture(c);
  return glowTex;
}

interface AuraUniforms {
  uTime: { value: number };
  uFade: { value: number };
}

/** Back-face shell pushed out along the skinned normals, wobbling a little like smoke. */
function auraMaterial(thickness: number, color: string, opacity: number, u: AuraUniforms): MeshBasicMaterial {
  const m = new MeshBasicMaterial({ color, transparent: true, opacity, side: BackSide, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms['uTime'] = u.uTime;
    sh.uniforms['uFade'] = u.uFade;
    sh.uniforms['uThick'] = { value: thickness };
    sh.vertexShader = `uniform float uTime;\nuniform float uThick;\n${sh.vertexShader}`.replace(
      '#include <skinning_vertex>',
      `#include <skinning_vertex>
      float tlhN = sin(position.x * 37.0 + uTime * 2.3) * sin(position.y * 29.0 - uTime * 1.7) * sin(position.z * 41.0 + uTime * 1.3);
      transformed += normalize(objectNormal) * uThick * (1.0 + 0.7 * tlhN);`,
    );
    sh.fragmentShader = `uniform float uFade;\n${sh.fragmentShader}`.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n  gl_FragColor.a *= uFade;',
    );
  };
  m.customProgramCacheKey = () => 'tlh-aura';
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// One character instance.

interface Eye {
  node: Object3D;
  core: Sprite;
  halo: Sprite;
}

export interface CharacterRig {
  root: Object3D;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction>;
  mats: MeshStandardMaterial[];
  eyes: Eye[];
  aura: AuraUniforms | null;
  current: string;
  /** Corruption strength 0..1 (eyes + aura); eased towards its target each frame. */
  corruption: number;
}

function buildRig(scene: Object3D, clips: AnimationClip[], look: CharacterLook): CharacterRig {
  const root = cloneSkinned(scene);
  const mats: MeshStandardMaterial[] = [];
  const skinned: SkinnedMesh[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false; // skinned bounds are the bind pose; a crouching or lunging pose would pop out
    const mat = (m.material as MeshStandardMaterial).clone();
    if (look.ghost) {
      mat.transparent = true;
      mat.opacity = 0.55;
      mat.depthWrite = false;
      mat.emissive.set('#8fb0e0');
      mat.emissiveIntensity = 0.45;
      m.castShadow = false;
    }
    if (look.shadow) {
      mat.color.set('#060609');
      mat.map = null;
      mat.roughness = 1;
      mat.transparent = true;
      mat.opacity = 0.8;
    }
    m.material = mat;
    mats.push(mat);
    if ((m as SkinnedMesh).isSkinnedMesh) skinned.push(m as SkinnedMesh);
  });

  let aura: AuraUniforms | null = null;
  if (look.corrupted && look.aura > 0) {
    aura = { uTime: { value: 0 }, uFade: { value: 1 } };
    for (const src of skinned) {
      const layers: [number, string, number][] = [
        [look.aura, '#050308', 0.72],
        [look.aura * 2.6, '#160a22', 0.28],
      ];
      for (const [t, color, opacity] of layers) {
        const shell = new SkinnedMesh(src.geometry, auraMaterial(t, color, opacity, aura));
        shell.bind(src.skeleton, src.bindMatrix);
        shell.position.copy(src.position);
        shell.quaternion.copy(src.quaternion);
        shell.scale.copy(src.scale);
        shell.frustumCulled = false;
        shell.castShadow = false;
        shell.renderOrder = 1;
        src.parent?.add(shell);
      }
    }
  }

  const eyes: Eye[] = [];
  if (look.corrupted) {
    for (const node of eyeAnchors(root, look)) {
      const mk = (size: number, opacity: number): Sprite => {
        const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: RED, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity }));
        s.scale.setScalar(size);
        s.renderOrder = 3;
        s.raycast = () => {}; // clicks go through the glow to the face (dev preview eye placement)
        node.add(s);
        return s;
      };
      eyes.push({ node, core: mk(look.eye * 0.35, 1), halo: mk(look.eye, 0.55) });
    }
  }

  const mixer = new AnimationMixer(root);
  const actions = new Map<string, AnimationAction>();
  for (const clip of clips) actions.set(clip.name, mixer.clipAction(clip));
  return { root, mixer, actions, mats, eyes, aura, current: '', corruption: look.corrupted ? 1 : 0 };
}

/** The two nodes the eye glow hangs from: anchors on the Head bone from the look, else the GLB's eye_L / eye_R. */
function eyeAnchors(root: Object3D, look: CharacterLook): Object3D[] {
  const head = look.eyes ? root.getObjectByName(HEAD_BONE) : undefined;
  if (look.eyes && head) {
    return [look.eyes.l, look.eyes.r].map((p, i) => {
      const o = new Object3D();
      o.name = i === 0 ? 'eye_anchor_L' : 'eye_anchor_R';
      o.position.set(p[0], p[1], p[2]);
      head.add(o);
      return o;
    });
  }
  return ['eye_L', 'eye_R'].map((n) => root.getObjectByName(n)).filter((o): o is Object3D => o !== undefined);
}

function useRig(look: CharacterLook): CharacterRig {
  const { scene, animations } = useGLTF(look.url, false, true);
  const rig = useMemo(() => buildRig(scene, animations, look), [scene, animations, look]);
  useEffect(() => () => {
    rig.mixer.stopAllAction();
    rig.mixer.uncacheRoot(rig.root);
  }, [rig]);
  return rig;
}

const ONE_SHOT = new Set(['strike', 'slam', 'stagger']);

/** Cross-fade to a clip (or its fallback). `scrub` holds it at a 0..1 point. Returns the clip actually used. */
function play(rig: CharacterRig, want: ClipName | string, scrub?: number): AnimationAction | null {
  let name = want;
  if (!rig.actions.has(name)) name = CLIP_FALLBACK[want as ClipName] ?? 'idle';
  const next = rig.actions.get(name);
  if (!next) return null;
  if (rig.current !== name) {
    const prev = rig.actions.get(rig.current);
    next.reset();
    next.setLoop(ONE_SHOT.has(name) || scrub !== undefined ? LoopOnce : LoopRepeat, Infinity);
    next.clampWhenFinished = true;
    next.paused = false;
    next.fadeIn(FADE_S).play();
    prev?.fadeOut(FADE_S);
    rig.current = name;
  }
  if (scrub !== undefined) {
    next.paused = true;
    next.time = Math.min(0.999, Math.max(0, scrub)) * next.getClip().duration;
  }
  return next;
}

/** Eyes and aura follow the corruption level; the eye glow is pulled towards the camera so it never sinks into the head. */
function updateCorruption(rig: CharacterRig, target: number, dt: number, time: number, camera: Object3D, look: CharacterLook, dim = 1): void {
  rig.corruption += (target - rig.corruption) * Math.min(1, dt * 1.5);
  if (rig.aura) {
    rig.aura.uTime.value = time;
    rig.aura.uFade.value = rig.corruption;
  }
  if (rig.eyes.length === 0) return;
  // Hide the glow when the camera is well behind the character (body facing, so turned heads still work).
  const [a, b] = rig.eyes;
  let front = true;
  if (a && b) {
    const mid = a.node.getWorldPosition(tmp).add(b.node.getWorldPosition(tmp2)).multiplyScalar(0.5);
    const fwd = rig.root.getWorldDirection(new Vector3());
    const toCam = camera.position.clone().sub(mid);
    front = toCam.dot(fwd) > -0.35 * toCam.length();
  }
  const flicker = 0.85 + 0.15 * Math.sin(time * 17.0) * Math.sin(time * 7.3);
  const k = rig.corruption * flicker * dim;
  for (const e of rig.eyes) {
    const vis = front && k > 0.02;
    e.core.visible = vis;
    e.halo.visible = vis;
    if (!vis) continue;
    // Pull the sprites a little towards the camera (in the eye node's space) so the surface never hides them.
    const w = e.node.getWorldPosition(new Vector3());
    const toCam = camera.position.clone().sub(w).normalize().multiplyScalar(look.eye * 0.5);
    const local = e.node.worldToLocal(w.add(toCam));
    e.core.position.copy(local);
    e.halo.position.copy(local);
    (e.core.material as SpriteMaterial).opacity = k;
    (e.halo.material as SpriteMaterial).opacity = 0.55 * k;
  }
}

function setOpacity(rig: CharacterRig, o: number, look: CharacterLook): void {
  const base = look.ghost ? 0.55 : look.shadow ? 0.8 : 1;
  for (const m of rig.mats) {
    m.transparent = o < 1 || base < 1;
    m.opacity = base * o;
  }
  if (rig.aura) rig.aura.uFade.value *= o;
}

// ---------------------------------------------------------------------------------------------------------------
// Error boundary: a missing or broken GLB keeps the greybox.

class Fallback extends Component<{ fallback: ReactNode; url: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.warn(`Character ${this.props.url} failed to load, using the greybox`, error);
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WithCharacter({ url, fallback, children }: { url: string; fallback: ReactNode; children: ReactNode }) {
  return (
    <Fallback fallback={fallback} url={url}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </Fallback>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Enemies.

/** An FSM enemy drawn with its animated model. Telegraph ring and Watcher mark stay as before. */
export function EnemyModel({ enemy, look, feedback }: { enemy: Enemy; look: CharacterLook; feedback?: CombatFeedback | undefined }) {
  const rig = useRig(look);
  const outer = useRef<Group>(null);
  const body = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const mark = useRef<Mesh>(null);
  const motion = useRef({ x: enemy.x, z: enemy.z, speed: 0, yaw: 0, telegraph: null as number | null, striking: null as 'strike' | 'slam' | null, strikeLeft: 0, wasStaggered: false });

  useFrame(({ camera, clock }, delta) => {
    const g = outer.current;
    const b = body.current;
    if (!g || !b) return;
    const dt = Math.min(delta, 0.1);
    const s = motion.current;
    const v = enemy.view();

    // Speed and heading from the movement itself.
    const dx = enemy.x - s.x;
    const dz = enemy.z - s.z;
    const inst = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
    s.speed += (inst - s.speed) * Math.min(1, dt * 8);
    let want: number | null = null;
    if (inst > 0.2) want = headingOf(dx, dz);
    else if (enemy.engaged || v.telegraph !== null || enemy.state === 'attack' || enemy.state === 'chase') want = headingOf(camera.position.x - enemy.x, camera.position.z - enemy.z);
    if (want !== null && enemy.state !== 'stunned' && enemy.state !== 'destroyed') s.yaw += turnDelta(s.yaw, want) * Math.min(1, dt * 8);
    s.x = enemy.x;
    s.z = enemy.z;

    // A wind-up that just ended releases its strike.
    if (s.telegraph !== null && v.telegraph === null && (enemy.state === 'attack' || enemy.state === 'chase')) {
      s.striking = v.ring !== null || rig.current === 'slam_windup' ? 'slam' : 'strike';
      s.strikeLeft = 0.7;
    }
    s.telegraph = v.telegraph;
    if (s.striking) {
      s.strikeLeft -= dt;
      if (s.strikeLeft <= 0) s.striking = null;
    }
    const choice = enemyClip({ state: enemy.state, telegraph: v.telegraph, ring: v.ring, staggered: v.staggered, speed: s.speed, maxSpeed: enemy.def.speed, striking: s.striking }, look);
    if (v.staggered && !s.wasStaggered) rig.current = ''; // restart the stagger on every new hit
    s.wasStaggered = v.staggered;
    const action = play(rig, choice.clip, choice.scrub);
    if (action && (choice.clip === 'walk' || choice.clip === 'run')) {
      const ref = choice.clip === 'run' ? enemy.def.speed : look.walkSpeed;
      action.timeScale = Math.min(1.8, Math.max(0.6, s.speed / ref));
    } else if (action) action.timeScale = 1;
    rig.mixer.update(dt);

    // Place it (with the hit knock-back), turn the body only.
    const hit = feedback?.hitFx(enemy.id);
    g.position.set(enemy.x + (hit?.offX ?? 0), 0, enemy.z + (hit?.offZ ?? 0));
    b.rotation.y = s.yaw;

    // Corruption: full while hostile, dimmer when stunned, gone once purified.
    const target = enemy.state === 'purified' ? 0 : 1;
    updateCorruption(rig, target, dt, clock.elapsedTime, camera, look, enemy.state === 'stunned' ? 0.45 : 1);

    // Readability tints: wind-up glow, hit flash; a destroyed one dissolves.
    for (const m of rig.mats) {
      if (look.ghost) continue;
      if (v.telegraph !== null) {
        m.emissive.copy(TELEGRAPH);
        m.emissiveIntensity = 0.15 + 0.35 * v.telegraph;
      } else {
        m.emissive.set('#000000');
        m.emissiveIntensity = 0;
      }
      if (hit && hit.flash > 0) {
        m.emissive.copy(WHITE);
        m.emissiveIntensity = Math.max(m.emissiveIntensity, hit.flash * 0.8);
      }
    }
    const o = enemy.state === 'destroyed' && feedback ? feedback.coatOpacity(enemy.id) : 1;
    setOpacity(rig, o, look);
    g.visible = o > 0;

    if (ring.current) {
      ring.current.visible = v.ring !== null;
      if (v.ring !== null) {
        const r = v.ring * (0.4 + 0.6 * (v.telegraph ?? 1));
        ring.current.scale.set(r, r, 1);
      }
    }
    if (mark.current) {
      mark.current.visible = v.mark !== null;
      if (v.mark !== null) {
        mark.current.position.set(v.mark.x - enemy.x, 0.6, v.mark.z - enemy.z);
        mark.current.scale.setScalar(0.3 + 0.7 * v.mark.t);
      }
    }
  });

  return (
    <group ref={outer} position={[enemy.x, 0, enemy.z]}>
      <group ref={body}>
        <primitive object={rig.root} />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} visible={false}>
        <ringGeometry args={[0.92, 1, 48]} />
        <meshBasicMaterial color="#ff4a00" transparent opacity={0.7} />
      </mesh>
      <mesh ref={mark} visible={false}>
        <sphereGeometry args={[0.6, 12, 8]} />
        <meshBasicMaterial color="#1a1a22" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// NPCs: Gartner in the shed, Felix asleep in the light above the ritual seal.

/** `at` overrides the placement (dev preview). */
export function NpcModel({ id, look, at }: { id: string; look: NpcLook; at?: { x: number; z: number } }) {
  const rig = useRig(look);
  const group = useRef<Group>(null);
  const yaw = useRef(0);
  const p = at ?? PLACEMENTS[look.at]!;
  // The model replaces the entity's greybox marker (interactables.tsx).
  useEffect(() => registerModelNodes([entityNodeName(id)]), [id]);
  useFrame(({ camera, clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1);
    const dist = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
    play(rig, dist < 3.5 ? look.nearClip : look.idleClip);
    rig.mixer.update(dt);
    if (dist < 8) yaw.current += turnDelta(yaw.current, headingOf(camera.position.x - p.x, camera.position.z - p.z)) * Math.min(1, dt * 3);
    g.rotation.y = look.ghost ? yaw.current + Math.sin(clock.elapsedTime * 0.3) * 0.3 : yaw.current;
    g.position.set(p.x, look.lift + (look.ghost ? Math.sin(clock.elapsedTime * 0.8) * 0.08 : 0), p.z);
    if (look.ghost) for (const m of rig.mats) m.emissiveIntensity = 0.4 + 0.15 * Math.sin(clock.elapsedTime * 1.3);
  });
  return (
    <group ref={group} position={[p.x, look.lift, p.z]}>
      <primitive object={rig.root} />
      {look.ghost && <pointLight position={[0, 0.7, 0]} intensity={2.5} distance={5} color="#9fc0ff" />}
    </group>
  );
}

/** The NPCs of the scene on screen: Gartner while his entity is present, Felix whenever the Last House is loaded. */
export function Npcs({ runtime }: { runtime: WorldRuntime }) {
  useSyncExternalStore(runtime.subscribe, () => runtime.version);
  const scene = useGame((s) => s.game.scene);
  const visible = new Set(runtime.visibleEntities().map((e) => e.id as string));
  return (
    <>
      {Object.entries(NPC_LOOKS).map(([id, look]) => {
        if (!PLACEMENTS[look.at] || sceneOfEntity(look.at) !== scene) return null;
        if (look.at === id && !visible.has(id)) return null; // placed NPCs follow the runtime (sequences own them)
        return (
          <WithCharacter key={id} url={look.url} fallback={null}>
            <NpcModel id={id} look={look} />
          </WithCharacter>
        );
      })}
    </>
  );
}
