import { describe, expect, it } from 'vitest';
import { emptyActionLedger } from './angel-actions.ts';
import { SaveFileV1Schema, type SaveFileV1 } from './save.ts';

function sampleSave(): SaveFileV1 {
  return {
    version: 1,
    createdAt: '2026-11-06T20:00:00.000Z',
    updatedAt: '2026-11-06T20:05:00.000Z',
    finished: false,
    preferredMode: 'classic',
    checkpointId: 'cp_intersection',
    progress: {
      flags: ['bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done', 'spell_bolt'],
      morality: { value: 0, history: [] },
      carried: [],
      puzzles: { p1_drawer: { solved: true, hintLevel: 1, data: {} } },
    },
    player: { hp: 100, magic: 100, spellsUnlocked: ['arcane_bolt'], pos: [12, 0, -4], yaw: 1.2 },
    world: { 'door.home.front': { open: true } },
    angel: {
      summary: 'Elena found the locket and saw Felix beneath the streetlight.',
      recent: [],
      eventLog: [{ t: 'flag', at: 42, flag: 'locket_taken' }],
      actionLedger: emptyActionLedger(),
      sideQuests: [],
      sideQuestsOffered: 0,
      glitchesUsed: 0,
      simTime: 300,
    },
  };
}

describe('SaveFileV1Schema', () => {
  it('accepts a valid save and round-trips through JSON unchanged', () => {
    const save = sampleSave();
    const once = SaveFileV1Schema.parse(JSON.parse(JSON.stringify(save)));
    const twice = SaveFileV1Schema.parse(JSON.parse(JSON.stringify(once)));
    expect(once).toEqual(save);
    expect(twice).toEqual(once);
  });

  it('rejects other versions', () => {
    expect(SaveFileV1Schema.safeParse({ ...sampleSave(), version: 2 }).success).toBe(false);
  });

  it('rejects out-of-range morality and too many carried items', () => {
    const save = sampleSave();
    save.progress.morality.value = 150;
    expect(SaveFileV1Schema.safeParse(save).success).toBe(false);

    const crowded = sampleSave();
    crowded.progress.carried = ['drawer_key', 'fuse', 'fence_key', 'toy_rabbit', 'photo'];
    expect(SaveFileV1Schema.safeParse(crowded).success).toBe(false);
  });

  it('strips stray fields such as provider settings', () => {
    const tampered = { ...sampleSave(), apiKey: 'should-not-survive', provider: { baseUrl: 'https://example.com' } };
    const parsed = SaveFileV1Schema.parse(tampered);
    expect(parsed).not.toHaveProperty('apiKey');
    expect(parsed).not.toHaveProperty('provider');
  });

  it('rejects malformed world entity IDs', () => {
    expect(SaveFileV1Schema.safeParse({ ...sampleSave(), world: { 'Not An Id': {} } }).success).toBe(false);
  });
});
