import type { EntityId, ItemId } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { findNearest, MAX_CARRIED, pickUp, promptFor, showCarriedRow, useSocket, type Interactable } from './interaction.ts';

const t = (id: string, x: number, z: number, enabled = true): Interactable => ({
  id: id as EntityId,
  x,
  z,
  prompt: `Use ${id}`,
  enabled,
});

describe('findNearest', () => {
  it('returns the closest enabled target in range', () => {
    const hit = findNearest(0, 0, [t('a', 2, 0), t('b', 1, 0), t('c', 0.5, 0, false)]);
    expect(hit?.target.id).toBe('b');
  });

  it('ignores targets out of range', () => {
    expect(findNearest(0, 0, [t('a', 2.6, 0)])).toBeNull();
    expect(findNearest(0, 0, [t('a', 2.5, 0)])?.target.id).toBe('a');
  });

  it('ignores targets behind the player when yaw is given', () => {
    // yaw 0 faces -Z
    expect(findNearest(0, 0, [t('behind', 0, 2)], 2.5, 0)).toBeNull();
    expect(findNearest(0, 0, [t('ahead', 0, -2)], 2.5, 0)?.target.id).toBe('ahead');
  });

  it('breaks ties by ID', () => {
    expect(findNearest(0, 0, [t('b', 1, 0), t('a', -1, 0)])?.target.id).toBe('a');
  });

  it('builds the prompt', () => {
    expect(promptFor(findNearest(0, 0, [t('a', 1, 0)]))).toBe('E  Use a');
    expect(promptFor(null)).toBeNull();
  });
});

describe('carried items', () => {
  it('picks up, rejects duplicates and caps at 4', () => {
    let c: ItemId[] = [];
    const items: ItemId[] = ['drawer_key', 'fuse', 'fence_key', 'toy_rabbit'];
    for (const i of items) {
      const r = pickUp(c, i);
      expect(r.ok).toBe(true);
      if (r.ok) c = r.carried;
    }
    expect(c).toHaveLength(MAX_CARRIED);
    expect(pickUp(c, 'photo')).toEqual({ ok: false, reason: 'full' });
    expect(pickUp(['fuse'], 'fuse')).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('consumes an item only in the socket that accepts it', () => {
    const socket = { id: 'socket.house66.fuse_box' as EntityId, accepts: 'fuse' as const };
    expect(useSocket(['drawer_key'], socket)).toEqual({ ok: false, reason: 'missing_item' });
    const r = useSocket(['drawer_key', 'fuse'], socket);
    expect(r).toEqual({ ok: true, carried: ['drawer_key'], consumed: 'fuse' });
  });

  it('shows the HUD row only while carrying', () => {
    expect(showCarriedRow([])).toBe(false);
    expect(showCarriedRow(['fuse'])).toBe(true);
  });
});
