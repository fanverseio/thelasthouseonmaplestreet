import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial } from 'three';
import { FEEDBACK_TUNING, type CombatFeedback, type FxKind } from '../game/combat-feedback.ts';

const POOL = FEEDBACK_TUNING.maxFx;
const LOOK: Record<FxKind, { color: string; size: number }> = {
  spark: { color: '#bcd6ff', size: 0.05 },
  mote: { color: '#c8f0c0', size: 0.06 },
  smoke: { color: '#1c1c22', size: 0.28 },
};

/**
 * Greybox effects (task 5.11): bolt impact sparks, Purify motes and the dissolve of a destroyed enemy into faceless
 * smoke. A fixed pool of small spheres driven from `feedback.fx` in useFrame; no models, no textures. Motion is slow
 * and steady (no strobing), so it is safe with reduce flashing too.
 */
export function CombatFx({ feedback }: { feedback: CombatFeedback }) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const mats = useRef<(MeshBasicMaterial | null)[]>([]);

  useFrame(() => {
    for (let i = 0; i < POOL; i++) {
      const m = meshes.current[i];
      const f = feedback.fx[i];
      if (!m) continue;
      m.visible = f !== undefined;
      if (!f) continue;
      const k = 1 - f.age / f.life;
      const look = LOOK[f.kind];
      m.position.set(f.x, f.y, f.z);
      m.scale.setScalar(look.size * (f.kind === 'smoke' ? 1 + (1 - k) * 1.5 : 0.5 + k));
      const mat = mats.current[i];
      if (mat) {
        mat.color.set(look.color);
        mat.opacity = f.kind === 'smoke' ? 0.5 * k : k;
      }
    }
  });

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh key={i} ref={(m) => { meshes.current[i] = m; }} visible={false}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial ref={(m) => { mats.current[i] = m; }} transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
