import { useFrame } from '@react-three/fiber';
import { useRef, useSyncExternalStore } from 'react';
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import type { CombatFeedback } from '../game/combat-feedback.ts';
import type { Enemy, EnemyState, EnemySystem } from '../game/enemies.ts';
import { useGame } from '../store/index.ts';

/**
 * Greybox colours: hostile red, winding up bright orange, stunned blue-grey. A purified being stands up calm in a soft
 * green; a destroyed one leaves only a dark coat that fades away (no gore, task 5.11).
 */
const WHITE = new Color('#ffffff');
const COLOR: Record<EnemyState, string> = {
  idle: '#6a5a4a',
  patrol: '#6a5a4a',
  chase: '#b01818',
  attack: '#b01818',
  stunned: '#5a6a9a',
  purified: '#86b386',
  destroyed: '#2a2a2a',
};

function size(e: Enemy): { h: number; w: number } {
  if (e.state === 'destroyed') return { h: 0.25, w: 0.8 };
  const base = e.def.kind === 'animal' ? { h: 0.9, w: 0.7 } : { h: 1.9, w: 0.9 };
  return e.state === 'stunned' ? { h: base.h * 0.6, w: base.w } : base; // kneeling when stunned, upright and calm once purified
}

function EnemyBox({ enemy, feedback }: { enemy: Enemy; feedback?: CombatFeedback | undefined }) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const ring = useRef<Mesh>(null);
  const mark = useRef<Mesh>(null);
  useFrame(() => {
    const g = group.current;
    const m = material.current;
    if (!g || !m) return;
    const { h } = size(enemy);
    const hit = feedback?.hitFx(enemy.id);
    g.position.set(enemy.x + (hit?.offX ?? 0), h / 2, enemy.z + (hit?.offZ ?? 0));
    g.scale.y = 1;
    const v = enemy.view();
    // Greybox telegraphs: the slam's ground ring (grows to its radius) and the Watcher's destination mark.
    if (ring.current) {
      ring.current.visible = v.ring !== null;
      if (v.ring !== null) {
        const r = v.ring * (0.4 + 0.6 * (v.telegraph ?? 1));
        ring.current.scale.set(r, r, 1);
        ring.current.position.set(0, 0.06 - h / 2, 0);
      }
    }
    if (mark.current) {
      mark.current.visible = v.mark !== null;
      if (v.mark !== null) {
        mark.current.position.set(v.mark.x - enemy.x, 0.6 - h / 2, v.mark.z - enemy.z);
        mark.current.scale.setScalar(0.3 + 0.7 * v.mark.t);
      }
    }
    m.color.set(v.telegraph !== null ? '#ff7a18' : COLOR[enemy.state]);
    m.emissive.set(v.telegraph !== null ? '#ff4a00' : enemy.state === 'stunned' ? '#2a3a6a' : '#000000');
    m.emissiveIntensity = v.telegraph !== null ? 0.4 + v.telegraph : enemy.state === 'stunned' ? 0.6 : enemy.state === 'purified' ? 0.35 : 0;
    if (enemy.state === 'purified') m.emissive.set('#9fd89f');
    // Hit reaction: a brief flash towards white.
    if (hit && hit.flash > 0) {
      m.color.lerp(WHITE, hit.flash * 0.7);
      m.emissive.set('#ffffff');
      m.emissiveIntensity = Math.max(m.emissiveIntensity, hit.flash * 0.8);
    }
    // A destroyed enemy leaves a dark coat that dissolves into smoke, then is gone.
    if (enemy.state === 'destroyed') {
      const o = feedback ? feedback.coatOpacity(enemy.id) : 1;
      m.transparent = true;
      m.opacity = o;
      g.visible = o > 0;
    }
  });
  const s = size(enemy);
  return (
    <group ref={group} position={[enemy.x, s.h / 2, enemy.z]}>
      <mesh castShadow>
        <boxGeometry args={[s.w, s.h, s.w]} />
        <meshStandardMaterial ref={material} color={COLOR[enemy.state]} roughness={0.8} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
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

/** One box per live FSM enemy of the scene on screen. View only: all state comes from the EnemySystem. */
export function FsmEnemies({ enemies, feedback }: { enemies: EnemySystem; feedback?: CombatFeedback }) {
  useSyncExternalStore(enemies.subscribe, () => enemies.version);
  const scene = useGame((s) => s.game.scene);
  return (
    <>
      {enemies.all().map((e) => (e.scene && e.scene !== scene ? null : <EnemyBox key={`${e.id}:${e.state}`} enemy={e} feedback={feedback} />))}
    </>
  );
}
