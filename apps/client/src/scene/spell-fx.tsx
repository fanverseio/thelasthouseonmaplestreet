import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { BackSide, type Group, type Mesh, Vector3 } from 'three';
import type { InputController } from '../game/input.ts';
import { PROJECTILE_POOL_SIZE, type SpellSystem } from '../game/spells.ts';

const UP = new Vector3(0, 1, 0);
const tmpA = new Vector3();
const tmpB = new Vector3();

/**
 * Greybox spell visuals (task 5.1/5.2): glowing spheres for the pooled projectiles, a charge orb, a Purify
 * beam and a Ward shell. Everything is pre-built and updated from useFrame; no models or textures.
 */
export function SpellFx({ spells, input }: { spells: SpellSystem; input: InputController }) {
  const camera = useThree((s) => s.camera);
  const bolts = useRef<(Mesh | null)[]>([]);
  const orb = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const ward = useRef<Group>(null);

  useFrame(() => {
    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const m = bolts.current[i];
      const p = spells.projectiles[i];
      if (!m || !p) continue;
      m.visible = p.active;
      if (p.active) {
        m.position.set(p.x, p.y, p.z);
        m.scale.setScalar(p.charged ? 1.8 : 1);
      }
    }
    const v = spells.view(input.state);
    if (orb.current) {
      orb.current.visible = v.charging;
      if (v.charging) {
        tmpA.set(0.15, -0.2, -0.7).applyQuaternion(camera.quaternion).add(camera.position);
        orb.current.position.copy(tmpA);
        orb.current.scale.setScalar(0.3 + 0.7 * v.charge);
      }
    }
    if (ward.current) {
      ward.current.visible = v.wardLeft > 0;
      ward.current.position.copy(camera.position);
      ward.current.position.y -= 0.7;
    }
    if (beam.current) {
      const target = v.channelTargetId ? spells.targetPosition(v.channelTargetId) : null;
      beam.current.visible = target !== null;
      if (target) {
        tmpA.set(0.15, -0.2, -0.5).applyQuaternion(camera.quaternion).add(camera.position);
        tmpB.set(target.x, target.y, target.z);
        const len = tmpA.distanceTo(tmpB);
        beam.current.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
        beam.current.scale.set(0.5 + 0.5 * v.channel, len, 0.5 + 0.5 * v.channel);
        beam.current.quaternion.setFromUnitVectors(UP, tmpB.sub(tmpA).normalize());
      }
    }
  });

  return (
    <>
      {Array.from({ length: PROJECTILE_POOL_SIZE }, (_, i) => (
        <mesh key={i} ref={(m) => { bolts.current[i] = m; }} visible={false}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#9fc4ff" />
        </mesh>
      ))}
      <mesh ref={orb} visible={false}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#c9dcff" />
      </mesh>
      <mesh ref={beam} visible={false}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshBasicMaterial color="#fff2b0" />
      </mesh>
      <group ref={ward} visible={false}>
        <mesh>
          <sphereGeometry args={[1.4, 16, 12]} />
          <meshBasicMaterial color="#ffd98a" transparent opacity={0.18} side={BackSide} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}
