import type { EntityId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import { findAllInRange, type Interactable } from './interaction.ts';
import { SIM_DT } from './player.ts';
import { createWorldRuntime } from './world-runtime.ts';

const item = (id: string, x: number, z: number): Interactable => ({ id: id as EntityId, x, z, prompt: id, enabled: true });

describe('findAllInRange', () => {
  it('lists every enabled target in range, nearest first, ties by ID', () => {
    const hits = findAllInRange(0, 0, [item('c', 2, 0), item('b', 1, 0), item('a', -1, 0), { ...item('d', 0.5, 0), enabled: false }, item('far', 9, 0)]);
    expect(hits.map((h) => h.target.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('side panel actions', () => {
  // Standing between the hall drawer (-17.8, 37) and the front door (-19.5, 34.8) at the start of the game.
  function start() {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const rt = createWorldRuntime({ store });
    const pose = { x: -18.7, z: 36 } as { x: number; z: number; yaw: number };
    rt.tick(SIM_DT, pose);
    return { rt, pose };
  }

  it('lists the actions in range and marks the one E will use', () => {
    const { rt } = start();
    const ids = rt.actions.map((a) => a.id);
    expect(ids).toContain('socket.home.drawer');
    expect(ids).toContain('door.home.front');
    expect(rt.actions.filter((a) => a.selected)).toHaveLength(1);
    expect(rt.actions[0]!.selected).toBe(true);
  });

  it('Q cycles the selection and E uses the selected action', () => {
    const { rt, pose } = start();
    const first = rt.actions.find((a) => a.selected)!.id;
    rt.cycleAction();
    const second = rt.actions.find((a) => a.selected)!.id;
    expect(second).not.toBe(first);
    const result = rt.interact(pose);
    expect(result).toMatchObject({ status: 'refused', id: second }); // neither works yet: no key, no locket
    rt.cycleAction();
    expect(rt.actions.find((a) => a.selected)!.id).toBe(first);
  });

  it('is empty when nothing is in range', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    const rt = createWorldRuntime({ store });
    rt.tick(SIM_DT, { x: 50, z: -30, yaw: 0 });
    expect(rt.actions).toEqual([]);
  });
});
