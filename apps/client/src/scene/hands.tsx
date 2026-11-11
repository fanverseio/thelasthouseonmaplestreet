import { useGLTF } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { AnimationMixer, LoopRepeat } from 'three';
import type { AnimationAction, AnimationClip, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  FLICK_SECONDS,
  handFingers,
  handPose,
  type FingerPose,
  type HandFingers,
  type HandPose,
  type HandTransform,
  type MagicTint,
} from '../game/hand-pose.ts';
import type { InputController } from '../game/input.ts';
import type { SpellSystem } from '../game/spells.ts';

/** Elena's skinned hands (asset_creation/blender/build_hands.py). The boxes below are the fallback. */
export const HANDS_URL = '/assets/models/hands.glb';
/** The arms pivot at the elbow, this far behind the forearm centre that the hand-pose numbers place. */
export const ELBOW_OFFSET = 0.15;
const FADE_SECONDS = 0.12;
const TINTS: Record<MagicTint, string> = { none: '#000000', bolt: '#b49cff', purify: '#ffd27a', ward: '#7fc8ff' };

interface PoseState {
  pose: HandPose;
  fingers: HandFingers;
}

/** Spell state -> hand pose, once per frame. Call it before the component's own useFrame so it runs first. */
function useHandPose(spells?: SpellSystem, input?: InputController): RefObject<PoseState | null> {
  const state = useRef<PoseState | null>(null);
  const flickAt = useRef<number | null>(null);

  // A cast Arcane Bolt starts the flick (clock time is read in the frame loop).
  useEffect(
    () =>
      spells?.on((e) => {
        if (e.type === 'cast' && e.spell === 'arcane_bolt') flickAt.current = -1; // stamped on the next frame
      }),
    [spells],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flickAt.current === -1) flickAt.current = t;
    let flick: number | null = null;
    if (flickAt.current !== null) {
      const p = (t - flickAt.current) / FLICK_SECONDS;
      if (p >= 1) flickAt.current = null;
      else flick = p;
    }
    const v = spells?.view(input?.state);
    const i = { flick, charge: v?.charging ? v.charge : 0, channeling: v?.channeling ?? false, wardUp: (v?.wardLeft ?? 0) > 0, t };
    state.current = { pose: handPose(i), fingers: handFingers(i) };
  });
  return state;
}

// ---------------------------------------------------------------------------------------------------------------
// Fallback: the placeholder boxes (while the model loads, or for good if it is missing).

function applyBox(mesh: Mesh | null, h: HandTransform): void {
  if (!mesh) return;
  mesh.position.set(h.pos[0], h.pos[1], h.pos[2]);
  mesh.rotation.set(h.rot[0], h.rot[1], h.rot[2]);
  mesh.scale.set(h.spread, 1, 1);
}

function BoxHands({ spells, input }: { spells?: SpellSystem; input?: InputController }) {
  const state = useHandPose(spells, input);
  const leftHand = useRef<Mesh>(null);
  const rightHand = useRef<Mesh>(null);
  useFrame(() => {
    if (!state.current) return;
    applyBox(leftHand.current, state.current.pose.left);
    applyBox(rightHand.current, state.current.pose.right);
  });
  return (
    <>
      <mesh ref={leftHand} position={[-0.22, 0, 0]} rotation={[0.2, 0.15, 0]}>
        <boxGeometry args={[0.09, 0.07, 0.3]} />
        <meshStandardMaterial color="#c8a58c" roughness={0.8} />
      </mesh>
      <mesh ref={rightHand} position={[0.22, 0, 0]} rotation={[0.2, -0.15, 0]}>
        <boxGeometry args={[0.09, 0.07, 0.3]} />
        <meshStandardMaterial color="#c8a58c" roughness={0.8} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The model.

interface Side {
  node: Object3D;
  mixer: AnimationMixer;
  actions: Map<string, AnimationAction>;
  skins: MeshStandardMaterial[];
  current: string;
}

function buildSide(root: Object3D, clips: AnimationClip[], s: 'L' | 'R'): Side | null {
  const node = root.getObjectByName(`hand_${s}`);
  if (!node) return null;
  const mixer = new AnimationMixer(node);
  const actions = new Map<string, AnimationAction>();
  for (const clip of clips) {
    if (!clip.name.startsWith(`${s}_`)) continue;
    const a = mixer.clipAction(clip);
    a.setLoop(LoopRepeat, Infinity);
    actions.set(clip.name.slice(2), a);
  }
  const skins: MeshStandardMaterial[] = [];
  node.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false; // skinned bounds are the bind pose; the hands are always in view anyway
    m.castShadow = false;
    m.receiveShadow = false;
    const mat = (m.material as MeshStandardMaterial).clone();
    m.material = mat;
    if (mat.name.includes('hand_skin')) {
      mat.emissiveIntensity = 0;
      skins.push(mat);
    }
  });
  node.position.set(0, 0, -ELBOW_OFFSET);
  return { node, mixer, actions, skins, current: '' };
}

function play(side: Side, name: FingerPose): void {
  if (side.current === name) return;
  const next = side.actions.get(name) ?? side.actions.get('idle');
  const prev = side.actions.get(side.current);
  if (next) next.reset().fadeIn(FADE_SECONDS).play();
  if (prev && prev !== next) prev.fadeOut(FADE_SECONDS);
  side.current = name;
}

/**
 * Place an arm: the group sits at the elbow and turns there. Pose convention (hand-pose.ts): a negative pitch raises
 * the fingers, so the pitch is negated for the model, whose fingers point down -Z.
 */
function placeArm(group: Group | null, h: HandTransform): void {
  if (!group) return;
  group.position.set(h.pos[0], h.pos[1], h.pos[2] + ELBOW_OFFSET);
  group.rotation.set(-h.rot[0], h.rot[1], h.rot[2]);
}

function updateSide(side: Side | null, finger: FingerPose, glow: number, tint: MagicTint, delta: number): void {
  if (!side) return;
  play(side, finger);
  side.mixer.update(delta);
  const k = Math.min(1, delta * 10);
  for (const m of side.skins) {
    if (tint !== 'none') m.emissive.set(TINTS[tint]);
    m.emissiveIntensity += (glow - m.emissiveIntensity) * k;
  }
}

function ModelHands({ spells, input }: { spells?: SpellSystem; input?: InputController }) {
  const state = useHandPose(spells, input);
  const { scene, animations } = useGLTF(HANDS_URL, false, true);
  const rig = useMemo(() => {
    const root = cloneSkinned(scene);
    return { left: buildSide(root, animations, 'L'), right: buildSide(root, animations, 'R') };
  }, [scene, animations]);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);

  useEffect(
    () => () => {
      rig.left?.mixer.stopAllAction();
      rig.right?.mixer.stopAllAction();
    },
    [rig],
  );

  useFrame((_, delta) => {
    const s = state.current;
    if (!s) return;
    placeArm(leftArm.current, s.pose.left);
    placeArm(rightArm.current, s.pose.right);
    updateSide(rig.left, s.fingers.left, s.fingers.glowLeft, s.fingers.tintLeft, delta);
    updateSide(rig.right, s.fingers.right, s.fingers.glowRight, s.fingers.tintRight, delta);
  });

  return (
    <>
      <group ref={leftArm}>{rig.left && <primitive object={rig.left.node} />}</group>
      <group ref={rightArm}>{rig.right && <primitive object={rig.right.node} />}</group>
    </>
  );
}

class HandsBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.warn(`Hands model ${HANDS_URL} failed to load, using the placeholder boxes`, error);
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * First-person hands parented to the camera: Elena's skinned forearms (coat sleeves, knit cuffs, wedding ring) with
 * finger poses and glowing veins per spell. Placement comes from game/hand-pose.ts; the boxes are the fallback.
 */
export function Hands({ spells, input }: { spells?: SpellSystem; input?: InputController }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  // The camera must be in the scene graph for its children to render.
  if (camera.parent !== scene) scene.add(camera);

  const boxes = <BoxHands spells={spells} input={input} />;
  return createPortal(
    <group position={[0, -0.32, -0.55]}>
      <HandsBoundary fallback={boxes}>
        <Suspense fallback={boxes}>
          <ModelHands spells={spells} input={input} />
        </Suspense>
      </HandsBoundary>
    </group>,
    camera,
  );
}
