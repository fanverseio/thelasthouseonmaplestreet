import { useSyncExternalStore } from 'react';
import type { EncounterRuntime, EncounterView } from '../game/encounter-runtime.ts';
import { PLACEMENTS } from '../content/world/placements.ts';

/** Greybox colours: hostile red, stunned blue-grey, purified green, destroyed leaves only a dark coat. */
function look(v: EncounterView): { color: string; height: number; width: number } {
  if (v.state === 'resolved') return v.outcome === 'purify' ? { color: '#5a8a5a', height: 1, width: 0.7 } : { color: '#2a2a2a', height: 0.25, width: 0.8 };
  if (v.state === 'stunned') return { color: '#5a6a9a', height: 1.1, width: 0.8 };
  if (v.hostile) return { color: '#b01818', height: 2.2, width: 0.9 };
  return { color: '#6a5a4a', height: 1.8, width: 0.7 };
}

/** One box per encounter enemy. View only: the state comes from the encounter runtime. */
export function EncounterEnemies({ encounters }: { encounters: EncounterRuntime }) {
  useSyncExternalStore(encounters.subscribe, () => encounters.version);
  return (
    <>
      {encounters.bindings.map((b) => {
        const p = PLACEMENTS[b.entity];
        if (!p) return null;
        const l = look(encounters.view(b.id));
        return (
          <mesh key={b.id} position={[p.x, l.height / 2, p.z]} castShadow>
            <boxGeometry args={[l.width, l.height, l.width]} />
            <meshStandardMaterial color={l.color} roughness={0.8} />
          </mesh>
        );
      })}
    </>
  );
}
