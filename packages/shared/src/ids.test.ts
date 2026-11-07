import { describe, expect, it } from 'vitest';
import { EntityIdSchema, isEntityId } from './ids.ts';

describe('entity IDs', () => {
  it.each(['door.home.front', 'light.street.01', 'gate.house66.lane', 'anchor.ritual.north'])(
    'accepts %s',
    (id) => {
      expect(isEntityId(id)).toBe(true);
    },
  );

  it.each([
    'Door.home.front',
    'door.home',
    'door..front',
    'door.home.front.extra',
    '__proto__',
    'constructor',
    'door.home.front!',
    '',
  ])('rejects %s', (id) => {
    expect(isEntityId(id)).toBe(false);
  });

  it('rejects IDs longer than 64 characters', () => {
    const long = `door.home.${'a'.repeat(60)}`;
    expect(EntityIdSchema.safeParse(long).success).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isEntityId(42)).toBe(false);
    expect(isEntityId({ id: 'door.home.front' })).toBe(false);
  });
});
