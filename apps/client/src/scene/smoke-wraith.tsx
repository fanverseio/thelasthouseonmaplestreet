import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, CanvasTexture, Color, Group, Sprite, SpriteMaterial, type Mesh, type MeshBasicMaterial, type Texture } from 'three';
import type { CombatFeedback } from '../game/combat-feedback.ts';
import type { Enemy } from '../game/enemies.ts';
import { headingOf, turnDelta } from './character-config.ts';
import { dissolve, WRAITH, wraithPuffs } from './smoke-wraith-layout.ts';

/*
 * The smoke wraith, built in three.js with no model: billboard smoke puffs that swirl round a hooded column, a tail
 * that trails behind its movement, and two faint ember points. A wind-up warms the embers; a hit lightens the smoke;
 * destroyed, it breaks up and fades. View only: all state comes from the EnemySystem.
 */

const SMOKE = new Color('#0a090d');
const HIT = new Color('#77707a');
const WARM = new Color('#3a140a');
const EMBER = new Color('#ff5a1e');
const TRAIL = 24;

let smokeTex: Texture | null = null;
/** A soft, lumpy smoke blob (a few overlapping radial gradients on a canvas). */
function smokeTexture(): Texture {
  if (smokeTex) return smokeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const blobs: [number, number, number][] = [[64, 64, 60], [44, 56, 34], [84, 52, 32], [60, 84, 36], [80, 80, 28]];
  for (const [x, y, r] of blobs) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  smokeTex = new CanvasTexture(c);
  return smokeTex;
}

let emberTex: Texture | null = null;
function emberTexture(): Texture {
  if (emberTex) return emberTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,140,80,0.8)');
  grad.addColorStop(1, 'rgba(255,40,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  emberTex = new CanvasTexture(c);
  return emberTex;
}

export function SmokeWraith({ enemy, feedback }: { enemy: Enemy; feedback?: CombatFeedback | undefined }) {
  const group = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const built = useMemo(() => {
    const root = new Group();
    const puffs = wraithPuffs().map((p) => {
      const mat = new SpriteMaterial({ map: smokeTexture(), color: SMOKE.clone(), transparent: true, depthWrite: false, opacity: p.opacity });
      const sprite = new Sprite(mat);
      sprite.scale.setScalar(p.size);
      root.add(sprite);
      return { p, sprite, mat };
    });
    const embers = [-1, 1].map(() => {
      const mat = new SpriteMaterial({ map: emberTexture(), color: EMBER, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 });
      const sprite = new Sprite(mat);
      sprite.scale.setScalar(WRAITH.ember.size);
      sprite.renderOrder = 2;
      root.add(sprite);
      return { sprite, mat };
    });
    // Ring buffer of past positions: the tail follows where the hood was a moment ago.
    const trail = new Float32Array(TRAIL * 2);
    for (let i = 0; i < TRAIL; i++) {
      trail[i * 2] = enemy.x;
      trail[i * 2 + 1] = enemy.z;
    }
    return { root, puffs, embers, trail, head: 0, yaw: 0, deadFor: 0 };
  }, [enemy]);

  useFrame(({ camera, clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1);
    const t = clock.elapsedTime;
    const b = built;
    const v = enemy.view();

    // Trail sample for this frame.
    b.head = (b.head + 1) % TRAIL;
    b.trail[b.head * 2] = enemy.x;
    b.trail[b.head * 2 + 1] = enemy.z;
    const lagFrames = Math.max(1, Math.min(TRAIL - 1, Math.round(WRAITH.tailLagS / Math.max(dt, 1 / 120))));

    // Face Elena.
    if (enemy.state !== 'destroyed') b.yaw += turnDelta(b.yaw, headingOf(camera.position.x - enemy.x, camera.position.z - enemy.z)) * Math.min(1, dt * 6);
    const sin = Math.sin(b.yaw);
    const cos = Math.cos(b.yaw);

    // Dissolve progress once destroyed.
    if (enemy.state === 'destroyed') b.deadFor += dt;
    else b.deadFor = 0;
    const fade = enemy.state === 'destroyed' ? (feedback ? 1 - feedback.coatOpacity(enemy.id) : b.deadFor / WRAITH.dissolveS) : 0;
    const d = dissolve(fade);
    const hit = feedback?.hitFx(enemy.id);
    const flash = hit ? hit.flash : 0;
    const warm = v.telegraph ?? 0;
    const bob = Math.sin(t * 1.7) * WRAITH.hoverBob;

    g.position.set(enemy.x + (hit?.offX ?? 0), 0, enemy.z + (hit?.offZ ?? 0));
    for (const { p, sprite, mat } of b.puffs) {
      // Lower puffs sit where the hood was a little earlier, relative to where it is now.
      const k = (b.head - Math.round(p.u * p.u * lagFrames) + TRAIL) % TRAIL;
      const lx = b.trail[k * 2]! - enemy.x;
      const lz = b.trail[k * 2 + 1]! - enemy.z;
      const a = p.angle + t * p.swirl;
      const r = p.radius * d.spread * (1 + 0.15 * Math.sin(t * 1.3 + p.phase));
      sprite.position.set(lx + Math.cos(a) * r, p.y + bob * (1 - p.u) + Math.sin(t * 0.9 + p.phase) * 0.04 + d.rise * (0.4 + p.u), lz + Math.sin(a) * r);
      mat.rotation = p.phase + t * 0.25 * Math.sign(p.swirl);
      mat.color.copy(SMOKE).lerp(WARM, warm * (1 - p.u) * 0.8).lerp(HIT, flash * 0.6);
      mat.opacity = p.opacity * d.alpha;
    }
    // Embers: in front of the hood, facing Elena; brighter while it winds up a claw.
    const flicker = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 5.1);
    for (let i = 0; i < b.embers.length; i++) {
      const e = b.embers[i]!;
      const side = (i === 0 ? -1 : 1) * WRAITH.ember.half;
      e.sprite.position.set(cos * side + sin * WRAITH.ember.forward, WRAITH.ember.y + bob, -sin * side + cos * WRAITH.ember.forward);
      e.sprite.scale.setScalar(WRAITH.ember.size * (1 + 0.8 * warm));
      e.mat.opacity = (0.35 + 0.6 * warm) * flicker * d.alpha;
    }
    if (shadow.current) {
      (shadow.current.material as MeshBasicMaterial).opacity = 0.3 * d.alpha;
    }
    g.visible = d.alpha > 0.01;
  });

  return (
    <group ref={group} position={[enemy.x, 0, enemy.z]}>
      <primitive object={built.root} />
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.35, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}
