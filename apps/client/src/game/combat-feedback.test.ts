import { describe, expect, it } from 'vitest';
import { FOX, SMOKE_WRAITH } from '../content/enemies/index.ts';
import { cueForEnemyEvent, CUE_TABLE } from '../services/sfx.ts';
import { createGameStore } from '../store/game-store.ts';
import { CombatFeedback, deathFadeOpacity, FEEDBACK_TUNING, hurtVignetteOpacity } from './combat-feedback.ts';
import { createEncounterWorld } from './encounter-runtime.ts';
import { FLICK_SECONDS, handFingers, handPose } from './hand-pose.ts';
import { SIM_DT } from './player.ts';
import { createCombat, injectSpellHit } from './test-helpers.ts';
import type { EnemyEvent } from './enemies.ts';

function rig(reduceFlashing = false) {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  store.getState().setPhase('playing');
  const combat = createCombat(store);
  const player = { x: 0, z: 0 };
  const feedback = new CombatFeedback({ ...combat, player: () => player, reduceFlashing: () => reduceFlashing });
  const fox = combat.enemies.spawn(FOX, { x: 0, z: -6 }, { held: true });
  const step = (s: number) => {
    for (let i = 0; i < Math.round(s / SIM_DT); i++) feedback.step(SIM_DT);
  };
  return { store, ...combat, feedback, fox, step, player };
}

describe('enemy hit reaction: a brief colour flash and a small knockback', () => {
  it('flashes for 0.15 s and is pushed away from Elena, as a visual offset only', () => {
    const r = rig();
    const z0 = r.fox.z;
    expect(r.feedback.hitFx(r.fox.id)).toEqual({ flash: 0, offX: 0, offZ: 0 });
    injectSpellHit(r.spells, { targetId: r.fox.id, damage: 20 });
    const hit = r.feedback.hitFx(r.fox.id);
    expect(hit.flash).toBeCloseTo(1, 5);
    expect(hit.offZ).toBeLessThan(0); // Elena is at z 0, the fox at z -6: pushed further away
    expect(Math.hypot(hit.offX, hit.offZ)).toBeLessThanOrEqual(FEEDBACK_TUNING.knockbackM + 1e-9);
    expect(Math.hypot(hit.offX, hit.offZ)).toBeGreaterThan(0.1);
    expect(r.fox.z).toBe(z0); // the FSM position is untouched
    r.step(FEEDBACK_TUNING.hitFlashS / 2);
    expect(r.feedback.hitFx(r.fox.id).flash).toBeGreaterThan(0.3);
    expect(r.feedback.hitFx(r.fox.id).flash).toBeLessThan(0.7);
    r.step(0.3);
    expect(r.feedback.hitFx(r.fox.id)).toEqual({ flash: 0, offX: 0, offZ: 0 });
  });
});

describe('Elena hurt: a red vignette that respects reduce flashing', () => {
  it('a damage event raises the level to 1 and it fades', () => {
    const r = rig();
    expect(r.feedback.hurt).toBe(0);
    r.enemies.damagePlayer(10, 'test');
    expect(r.feedback.hurt).toBe(1);
    r.step(0.3);
    expect(r.feedback.hurt).toBeGreaterThan(0.3);
    expect(r.feedback.hurt).toBeLessThan(0.7);
    r.step(0.4);
    expect(r.feedback.hurt).toBe(0);
  });

  it('a blocked hit does not hurt', () => {
    const r = rig();
    r.store.setState((s) => ({ player: { ...s.player, hp: 100 } }));
    r.enemies.damagePlayer(0, 'test');
    expect(r.feedback.hurt).toBe(0);
  });

  it('reduce flashing: softer peak, slower fade, never a hard flash', () => {
    expect(hurtVignetteOpacity(1, false)).toBeCloseTo(FEEDBACK_TUNING.hurtPeak, 5);
    expect(hurtVignetteOpacity(1, true)).toBeCloseTo(FEEDBACK_TUNING.hurtSoftPeak, 5);
    expect(hurtVignetteOpacity(1, true)).toBeLessThan(hurtVignetteOpacity(1, false) / 2);
    expect(hurtVignetteOpacity(5, true)).toBeLessThanOrEqual(FEEDBACK_TUNING.hurtSoftPeak);
    expect(hurtVignetteOpacity(-1, false)).toBe(0);
    const normal = rig(false);
    const soft = rig(true);
    normal.enemies.damagePlayer(10, 'x');
    soft.enemies.damagePlayer(10, 'x');
    normal.step(0.5);
    soft.step(0.5);
    expect(soft.feedback.hurt).toBeGreaterThan(normal.feedback.hurt); // lingers instead of snapping away
  });
});

describe('death: a 1.5 s fade, then the respawn', () => {
  function deathRig() {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    store.getState().setPhase('playing');
    const combat = createCombat(store);
    let respawned = 0;
    const { world, encounters } = createEncounterWorld({ store, enemies: combat.enemies, spells: combat.spells, deathFadeS: 1.5, onRespawn: () => respawned++ });
    const pos = { x: 0, z: 0 };
    const tick = (s: number) => {
      for (let i = 0; i < Math.round(s / SIM_DT); i++) world.tick(SIM_DT, { x: pos.x, z: pos.z });
    };
    return { store, encounters, tick, respawned: () => respawned };
  }

  it('Elena stays at 0 HP while the screen fades, then respawns with full HP', () => {
    const t = deathRig();
    t.store.setState((s) => ({ player: { ...s.player, hp: 0 } }));
    expect(t.encounters.deathProgress()).toBe(0);
    t.tick(0.75);
    expect(t.store.getState().player.hp).toBe(0);
    expect(t.encounters.deathProgress()).toBeGreaterThan(0.4);
    expect(t.encounters.deathProgress()).toBeLessThan(0.6);
    expect(t.respawned()).toBe(0);
    t.tick(0.6);
    expect(t.store.getState().player.hp).toBe(0);
    expect(t.encounters.deathProgress()).toBeGreaterThan(0.85);
    t.tick(0.3);
    expect(t.store.getState().player.hp).toBe(100);
    expect(t.encounters.deathProgress()).toBe(0);
    expect(t.respawned()).toBe(1);
  });

  it('the fade overlay goes to black while dying and back to clear after the respawn', () => {
    expect(deathFadeOpacity(0, 1)).toBe(0);
    expect(deathFadeOpacity(0.5, 1)).toBe(0.5);
    expect(deathFadeOpacity(1, 1)).toBe(1);
    expect(deathFadeOpacity(0, 0)).toBe(1);
    expect(deathFadeOpacity(0, 0.5)).toBe(0.5);
  });

  it('feedback fades back in after a respawn', () => {
    const r = rig();
    r.feedback.noteRespawn();
    expect(r.feedback.wakeProgress).toBe(0);
    r.step(FEEDBACK_TUNING.wakeFadeS + 0.1);
    expect(r.feedback.wakeProgress).toBe(1);
  });
});

describe('visual effects and resolved enemies', () => {
  it('a bolt hit sparks at the target and the sparks age out', () => {
    const r = rig();
    injectSpellHit(r.spells, { targetId: r.fox.id, damage: 20 });
    expect(r.feedback.fx.filter((f) => f.kind === 'spark').length).toBeGreaterThanOrEqual(5);
    r.step(FEEDBACK_TUNING.sparkS + 0.1);
    expect(r.feedback.fx.filter((f) => f.kind === 'spark')).toHaveLength(0);
  });

  it('destroyed: only a dark coat that fades over 1.5 s, with smoke; no other remains', () => {
    const r = rig();
    const wraith = r.enemies.spawn(SMOKE_WRAITH, { x: 2, z: -4 }, { held: true });
    expect(r.feedback.coatOpacity(wraith.id)).toBe(1);
    injectSpellHit(r.spells, { targetId: wraith.id, damage: 20 });
    expect(wraith.state).toBe('destroyed');
    expect(r.feedback.resolved(wraith.id)).toMatchObject({ outcome: 'destroy' });
    expect(r.feedback.fx.some((f) => f.kind === 'smoke')).toBe(true);
    r.step(0.75);
    expect(r.feedback.coatOpacity(wraith.id)).toBeCloseTo(0.5, 1);
    r.step(1);
    expect(r.feedback.coatOpacity(wraith.id)).toBe(0);
    expect(r.feedback.fx.filter((f) => f.kind === 'smoke')).toHaveLength(0);
  });

  it('purified: calm motes, and the figure stays (its coat never fades)', () => {
    const r = rig();
    r.enemies.forceResolve(r.fox.id, 'purify');
    expect(r.feedback.resolved(r.fox.id)).toMatchObject({ outcome: 'purify' });
    expect(r.feedback.fx.some((f) => f.kind === 'mote')).toBe(true);
    expect(r.feedback.fx.some((f) => f.kind === 'smoke')).toBe(false);
    r.step(5);
    expect(r.feedback.coatOpacity(r.fox.id)).toBe(1);
  });

  it('the effect pool is capped', () => {
    const r = rig();
    for (let i = 0; i < 40; i++) injectSpellHit(r.spells, { targetId: r.fox.id, damage: 20, charged: true });
    expect(r.feedback.fx.length).toBeLessThanOrEqual(FEEDBACK_TUNING.maxFx);
  });
});

describe('hand animation per spell (placeholder hands)', () => {
  const idle = { flick: null, charge: 0, channeling: false, wardUp: false, t: 0 };

  it('bolt flick: the right hand pitches up and forward and comes back', () => {
    const rest = handPose(idle).right;
    const mid = handPose({ ...idle, flick: 0.5 }).right;
    const end = handPose({ ...idle, flick: 1 }).right;
    expect(mid.rot[0]).toBeLessThan(rest.rot[0] - 0.5);
    expect(mid.pos[2]).toBeLessThan(rest.pos[2]);
    expect(end.rot[0]).toBeCloseTo(rest.rot[0], 3);
    expect(handPose({ ...idle, flick: 0.5 }).left).toEqual(handPose(idle).left);
    expect(FLICK_SECONDS).toBeGreaterThan(0.1);
  });

  it('purify: both palms open (spread) and turned forward', () => {
    const p = handPose({ ...idle, channeling: true });
    for (const hand of [p.left, p.right]) {
      expect(hand.spread).toBeGreaterThan(1.3);
      expect(hand.rot[0]).toBeLessThan(-1);
    }
    expect(p.left.pos[0]).toBeLessThan(0);
    expect(p.right.pos[0]).toBeGreaterThan(0);
  });

  it('ward: the left forearm is raised, the right hand stays at rest', () => {
    const rest = handPose(idle);
    const w = handPose({ ...idle, wardUp: true });
    expect(w.left.pos[1]).toBeGreaterThan(rest.left.pos[1] + 0.1);
    expect(w.left.rot[0]).toBeLessThan(-1.2);
    expect(w.right.rot).toEqual(rest.right.rot);
  });

  it('a held charge draws the right hand back', () => {
    const rest = handPose(idle).right;
    expect(handPose({ ...idle, charge: 1 }).right.pos[2]).toBeGreaterThan(rest.pos[2]);
  });

  it('finger poses and vein glow follow the spell state (model hands)', () => {
    expect(handFingers(idle)).toEqual({ left: 'idle', right: 'idle', glowLeft: 0, glowRight: 0, tintLeft: 'none', tintRight: 'none' });
    const charge = handFingers({ ...idle, charge: 0.5 });
    expect([charge.right, charge.tintRight, charge.left]).toEqual(['claw', 'bolt', 'idle']);
    expect(handFingers({ ...idle, charge: 1 }).glowRight).toBeGreaterThan(charge.glowRight);
    const flick = handFingers({ ...idle, charge: 1, flick: 0.1 });
    expect(flick.right).toBe('flick');
    expect(handFingers({ ...idle, flick: 0.9 }).glowRight).toBeLessThan(flick.glowRight);
    const purify = handFingers({ ...idle, channeling: true });
    expect([purify.left, purify.right, purify.tintLeft, purify.tintRight]).toEqual(['spread', 'spread', 'purify', 'purify']);
    const ward = handFingers({ ...idle, channeling: true, wardUp: true });
    expect([ward.left, ward.tintLeft, ward.right]).toEqual(['open', 'ward', 'spread']);
  });
});

describe('sfx hooks', () => {
  const at = (e: Partial<EnemyEvent> & { type: EnemyEvent['type'] }) => cueForEnemyEvent(e as EnemyEvent);

  it('maps hit, hurt, stun, purify complete, destroy, slam and teleport to known synthesised cues', () => {
    expect(at({ type: 'hit' })).toBe('sfx_hit');
    expect(at({ type: 'player_damaged', amount: 8 } as never)).toBe('sfx_hurt');
    expect(at({ type: 'player_damaged', amount: 0 } as never)).toBeNull();
    expect(at({ type: 'stunned' })).toBe('sfx_stun');
    expect(at({ type: 'resolved', outcome: 'purify' } as never)).toBe('sfx_purify_done');
    expect(at({ type: 'resolved', outcome: 'destroy' } as never)).toBe('sfx_destroy');
    expect(at({ type: 'attack', ability: 'groundSlam', hit: true } as never)).toBe('sfx_slam');
    expect(at({ type: 'attack', ability: 'groundSlam', hit: false } as never)).toBeNull();
    expect(at({ type: 'attack', ability: 'claw', hit: true } as never)).toBeNull();
    expect(at({ type: 'teleported' })).toBe('sfx_teleport');
    expect(at({ type: 'telegraph' })).toBeNull();
    for (const cue of ['sfx_hit', 'sfx_hurt', 'sfx_stun', 'sfx_purify_done', 'sfx_destroy', 'sfx_slam', 'sfx_teleport']) {
      expect(CUE_TABLE[cue], cue).toBeDefined();
      expect(CUE_TABLE[cue]!.length, cue).toBeGreaterThan(0);
    }
  });
});
