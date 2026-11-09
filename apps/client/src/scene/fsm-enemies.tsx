import { useFrame } from '@react-three/fiber';
import { useRef, useSyncExternalStore } from 'react';
import type { Group, MeshStandardMaterial } from 'three';
import type { Enemy, EnemyState, EnemySystem } from '../game/enemies.ts';
import { useGame } from '../store/index.ts';

/** Greybox colours: hostile red, winding up bright orange, stunned blue-grey, purified green, destroyed a dark coat. */
const COLOR: Record<EnemyState, string> = {
  idle: '#6a5a4a',
  patrol: '#6a5a4a',
  chase: '#b01818',
  attack: '#b01818',
  stunned: '#5a6a9a',
  purified: '#5a8a5a',
  destroyed: '#2a2a2a',
};

function size(e: Enemy): { h: number; w: number } {
  if (e.state === 'destroyed') return { h: 0.25, w: 0.8 };
  const base = e.def.kind === 'animal' ? { h: 0.9, w: 0.7 } : { h: 1.9, w: 0.9 };
  return e.state === 'stunned' || e.state === 'purified' ? { h: base.h * 0.6, w: base.w } : base;
}

function EnemyBox({ enemy }: { enemy: Enemy }) {
  const group = useRef<Group>(null);
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    const g = group.current;
    const m = material.current;
    if (!g || !m) return;
    const { h } = size(enemy);
    g.position.set(enemy.x, h / 2, enemy.z);
    g.scale.y = 1;
    const v = enemy.view();
    m.color.set(v.telegraph !== null ? '#ff7a18' : COLOR[enemy.state]);
    m.emissive.set(v.telegraph !== null ? '#ff4a00' : enemy.state === 'stunned' ? '#2a3a6a' : '#000000');
    m.emissiveIntensity = v.telegraph !== null ? 0.4 + v.telegraph : enemy.state === 'stunned' ? 0.6 : 0;
  });
  const s = size(enemy);
  return (
    <group ref={group} position={[enemy.x, s.h / 2, enemy.z]}>
      <mesh castShadow>
        <boxGeometry args={[s.w, s.h, s.w]} />
        <meshStandardMaterial ref={material} color={COLOR[enemy.state]} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** One box per live FSM enemy of the scene on screen. View only: all state comes from the EnemySystem. */
export function FsmEnemies({ enemies }: { enemies: EnemySystem }) {
  useSyncExternalStore(enemies.subscribe, () => enemies.version);
  const scene = useGame((s) => s.game.scene);
  return (
    <>
      {enemies.all().map((e) => (e.scene && e.scene !== scene ? null : <EnemyBox key={`${e.id}:${e.state}`} enemy={e} />))}
    </>
  );
}
