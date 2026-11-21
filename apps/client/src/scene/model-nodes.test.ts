import { describe, expect, it } from 'vitest';
import { propNodeVisible } from './model-nodes.ts';

describe('propNodeVisible (note 3)', () => {
  it('keeps the drawer, pumpkin jar and drawing in the room after their interaction ends', () => {
    const offered = new Set<string>();
    for (const id of ['socket.home.drawer', 'prop.home.pumpkin_jar', 'clue.home.drawing']) {
      expect(propNodeVisible(id, offered), id).toBe(true);
    }
  });

  it('still hides other props once they are used up', () => {
    expect(propNodeVisible('pickup.home.drawer_key', new Set())).toBe(false);
    expect(propNodeVisible('pickup.home.drawer_key', new Set(['pickup.home.drawer_key']))).toBe(true);
  });
});
