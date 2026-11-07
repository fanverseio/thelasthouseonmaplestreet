import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { exteriorColliders } from '../content/world/exterior-layout.ts';
import { createGameStore } from '../store/game-store.ts';
import { moveAndSlide } from './collision.ts';
import { PLAYER_RADIUS, SIM_DT } from './player.ts';
import { createWorldRuntime } from './world-runtime.ts';

/** Post-Beat-1 state: home_done set, Elena on the porch. Real collision movement at walking speed. */
function setup() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  for (const f of ['locket_taken', 'angel_awake', 'home_done'] as ProgressFlag[]) expect(store.getState().setFlag(f).ok).toBe(true);
  const rt = createWorldRuntime({ store });
  const pos = { x: -19.5, z: 32.5 };
  const flags = () => store.getState().progress.flags;
  const tick = (s: number) => {
    for (let i = 0; i < Math.round(s / SIM_DT); i++) rt.tick(SIM_DT, { x: pos.x, z: pos.z });
  };
  const walkTo = (x: number, z: number) => {
    for (let i = 0; i < 60 * 40; i++) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) break;
      const step = Math.min(d, 4 * SIM_DT);
      const next = moveAndSlide(pos, { x: (dx / d) * step, z: (dz / d) * step }, PLAYER_RADIUS, exteriorColliders(flags()));
      const moved = Math.hypot(next.x - pos.x, next.z - pos.z);
      pos.x = next.x;
      pos.z = next.z;
      rt.tick(SIM_DT, { x: pos.x, z: pos.z });
      if (moved < 1e-6) break;
    }
    return Math.hypot(x - pos.x, z - pos.z);
  };
  return { store, rt, flags, tick, walkTo, pos };
}

describe('Beats 2-3: the street', () => {
  it('plays seq1 then seq2 to seq2_done, spell_bolt and cp_intersection', () => {
    const { store, rt, flags, tick, walkTo } = setup();

    // Movement tutorial prompts over the first seconds.
    tick(0.1);
    expect(rt.tutorial).toBe('tut_wasd');
    tick(4.5);
    expect(rt.tutorial).toBe('tut_sprint');
    tick(4.5);
    expect(rt.tutorial).toBe('tut_interact');

    // The streetlight trigger does nothing before seq1_done; the veil stops Elena short of the intersection.
    expect(rt.sequences.active).toBeNull();
    walkTo(-9, 30);
    expect(rt.sequences.active).toBe('seq1_empty_street');
    expect(rt.spoken).toContain('vo_elena_b2_01');
    expect(rt.canOpenLocket()).toBe(true);
    // Walk to the veil: the chain flickers, the window shadow appears, and the veil holds until seq1_end.
    walkTo(34, 30);
    expect(rt.lights['light.street.06']?.effect).toBe('flicker');
    expect(rt.spoken).toEqual(expect.arrayContaining(['vo_elena_b2_02', 'vo_elena_b2_03']));
    tick(15);
    expect(rt.sequences.active).toBeNull();
    expect(flags()).toContain('seq1_done');
    expect(rt.spoken).toContain('vo_elena_b2_04');
    expect(rt.present.has('prop.street.window_14' as never)).toBe(false);

    // The veil is open now: on to the streetlight.
    expect(walkTo(57, 29.5)).toBeLessThan(0.1);
    expect(rt.sequences.active).toBe('seq2_felix_streetlight');
    expect(rt.video).toEqual({ clipId: 'seq2_felix_streetlight', fallbackSeconds: 20 });
    expect(rt.canOpenLocket()).toBe(false);
    tick(20.1);
    expect(rt.video).toBeNull();
    expect(flags()).toEqual(expect.arrayContaining(['seq2_done', 'spell_bolt']));
    expect(store.getState().player.spellsUnlocked).toContain('arcane_bolt');
    expect(store.getState().game.checkpointId).toBe('cp_intersection');
    expect(rt.canOpenLocket()).toBe(true);

    // The bolt prompt, then the optional sweets bag.
    tick(0.1);
    expect(rt.tutorial).toBe('tut_bolt');
    walkTo(62, 31.5);
    expect(rt.interact({ x: 62, z: 31.5 })).toMatchObject({ status: 'done', id: 'clue.street.candy_bag' });
    expect(rt.spoken).toContain('vo_elena_b3_03');

    // The fox trigger is data only for now: stepping into it changes nothing.
    const before = [...flags()];
    walkTo(42, 28);
    expect(flags()).toEqual(before);
  });

  it('seq2: skipping at any moment equals the full run', () => {
    const outcome = (skipAt: number | null) => {
      const { store, rt, tick, walkTo } = setup();
      store.getState().setFlag('seq1_done');
      walkTo(57, 29.5);
      expect(rt.sequences.active).toBe('seq2_felix_streetlight');
      if (skipAt === null) tick(20.1);
      else {
        tick(skipAt);
        expect(rt.sequences.skip().skipped).toBe(true);
      }
      rt.tick(SIM_DT, { x: 57, z: 29.5 });
      const s = store.getState();
      return {
        flags: [...s.progress.flags].sort(),
        spells: s.player.spellsUnlocked,
        cp: s.game.checkpointId,
        active: rt.sequences.active,
        video: rt.video,
      };
    };
    const full = outcome(null);
    expect(full.flags).toEqual(expect.arrayContaining(['seq2_done', 'spell_bolt']));
    expect(full.cp).toBe('cp_intersection');
    for (const t of [0, 0.5, 5, 10, 18]) expect(outcome(t), `skip at ${t}`).toEqual(full);
  });
});
