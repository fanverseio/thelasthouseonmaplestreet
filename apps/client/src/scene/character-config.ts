/**
 * Which animated character model each enemy definition and NPC entity uses, and which clip plays for an FSM state.
 * Models come from scripts/pipeline/animate_characters.py (auto-rigged Meshy meshes, 30 fps clips, eye_L/eye_R
 * nodes on the corrupted ones). Pure data and functions; characters.tsx draws them.
 */
import type { EnemyState } from '../game/enemies.ts';

export type ClipName = 'idle' | 'walk' | 'run' | 'windup' | 'strike' | 'slam_windup' | 'slam' | 'stagger' | 'stunned' | 'purified';

export interface CharacterLook {
  url: string;
  /** Glowing red eyes and a dark aura while corrupted (they fade once purified). */
  corrupted: boolean;
  /** Aura shell thickness in metres (scaled to the body). */
  aura: number;
  /** Eye glow sprite size in metres. */
  eye: number;
  /** Normal walking pace (m/s) the walk clip was keyed for; the playback speed follows the real speed. */
  walkSpeed: number;
  /** Uses the run clip above this share of its top speed; bipeds never run (Briggs shambles, the Watcher steps). */
  runsAbove: number | null;
  /** All-black silhouette (the Watcher's shadow decoys). */
  shadow?: boolean;
  /** Translucent spirit (Felix). */
  ghost?: boolean;
  /**
   * Where the red eye glow sits, in the Head bone's local space (metres). Overrides the GLB's eye_L / eye_R nodes,
   * which the auto-rig placed too close together on the humans and on the cheek of the turned animal heads.
   * Placed by clicking the face in the dev preview (char-preview.html).
   */
  eyes?: EyeAnchors;
}

export type Vec3 = readonly [number, number, number];
export interface EyeAnchors {
  l: Vec3;
  r: Vec3;
}

/** The bone the eye anchors hang from (all the auto-rigged skeletons use this name). */
export const HEAD_BONE = 'Head';

const M = '/assets/models/';
// First guess: the rig's eye nodes pushed apart to a human eye spacing (~6.4 cm), centred on the dark lenses.
const BRIGGS: CharacterLook = {
  url: `${M}briggs.glb`, corrupted: true, aura: 0.016, eye: 0.06, walkSpeed: 1.3, runsAbove: null,
  eyes: { l: [0.032, 0.072, 0.108], r: [-0.032, 0.072, 0.108] },
};
const WATCHER: CharacterLook = {
  url: `${M}watcher.glb`, corrupted: true, aura: 0.016, eye: 0.06, walkSpeed: 1.2, runsAbove: null,
  eyes: { l: [0.031, 0.034, 0.09], r: [-0.031, 0.034, 0.09] },
};
const HOUND: CharacterLook = { url: `${M}hound.glb`, corrupted: true, aura: 0.01, eye: 0.055, walkSpeed: 1.2, runsAbove: 0.5 };

/** Enemy definition id -> look. Enemies without a row (the smoke wraith) keep their greybox. */
export const ENEMY_LOOKS: Readonly<Record<string, CharacterLook>> = {
  briggs: BRIGGS,
  watcher: WATCHER,
  shadow_decoy: { ...WATCHER, shadow: true, aura: 0.022 },
  fox: { url: `${M}fox.glb`, corrupted: true, aura: 0.008, eye: 0.055, walkSpeed: 0.9, runsAbove: 0.45 },
  cat: { url: `${M}cat.glb`, corrupted: true, aura: 0.006, eye: 0.045, walkSpeed: 0.6, runsAbove: 0.4 },
  hound: HOUND,
  training_hound: HOUND,
};

export interface NpcLook extends CharacterLook {
  /** Clip that loops while the NPC waits, and the one while Elena is close (talking). */
  idleClip: string;
  nearClip: string;
  /** Height above the floor (Felix floats in the light over the seal). */
  lift: number;
  /** Entity whose placement the NPC stands on (Felix has none of his own: he sleeps above the central seal). */
  at: string;
}

/** NPC entity id -> look. */
export const NPC_LOOKS: Readonly<Record<string, NpcLook>> = {
  'npc.hideout.gartner': {
    url: `${M}gartner.glb`, corrupted: false, aura: 0, eye: 0, walkSpeed: 1, runsAbove: null,
    idleClip: 'idle_scared', nearClip: 'talk', lift: 0, at: 'npc.hideout.gartner',
  },
  'npc.ritual.felix': {
    url: `${M}felix.glb`, corrupted: false, aura: 0, eye: 0, walkSpeed: 1, runsAbove: null, ghost: true,
    idleClip: 'asleep_float', nearClip: 'asleep_float', lift: 1.1, at: 'seal.ritual.central',
  },
};

export const CHARACTER_URLS: readonly string[] = [...new Set([...Object.values(ENEMY_LOOKS), ...Object.values(NPC_LOOKS)].map((l) => l.url))];

export interface ClipInput {
  state: EnemyState;
  /** 0..1 wind-up progress, null when not winding up. */
  telegraph: number | null;
  /** Slam ring radius during a slam wind-up, else null. */
  ring: number | null;
  staggered: boolean;
  /** Measured ground speed, m/s. */
  speed: number;
  /** The definition's top speed. */
  maxSpeed: number;
  /** A strike that has just been released and is still playing. */
  striking: 'strike' | 'slam' | null;
}

export interface ClipChoice {
  clip: ClipName;
  /** Hold the clip at this 0..1 point instead of playing it (wind-ups follow the telegraph). */
  scrub?: number;
}

/** The clip for one enemy right now. Reactions win over movement; a wind-up tracks the telegraph exactly. */
export function enemyClip(i: ClipInput, look: Pick<CharacterLook, 'runsAbove'>): ClipChoice {
  if (i.state === 'stunned' || i.state === 'destroyed') return { clip: 'stunned' };
  if (i.state === 'purified') return { clip: 'purified' };
  if (i.staggered) return { clip: 'stagger' };
  if (i.telegraph !== null) return { clip: i.ring !== null ? 'slam_windup' : 'windup', scrub: i.telegraph };
  if (i.striking) return { clip: i.striking };
  if (look.runsAbove !== null && i.speed > look.runsAbove * i.maxSpeed) return { clip: 'run' };
  if (i.speed > 0.15) return { clip: 'walk' };
  return { clip: 'idle' };
}

/** Clips a model may lack and what to use instead (quadrupeds have no slam). */
export const CLIP_FALLBACK: Readonly<Partial<Record<ClipName, ClipName>>> = { slam_windup: 'windup', slam: 'strike', run: 'walk' };

/** Shortest signed turn from `from` to `to` (radians). */
export function turnDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Heading (rotation.y) that points a +Z-facing model along (dx, dz). */
export function headingOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}
