import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { getCheckpoint } from '../game/checkpoints.ts';
import { InputController, SPELL_FOR_KEY } from '../game/input.ts';
import { createPlayerBody } from '../game/player.ts';
import { createGameStore } from './game-store.ts';

const UP_TO_SPELLS: ProgressFlag[] = [
  'bed_seen', 'drawing_seen', 'drawer_key_taken', 'locket_taken', 'angel_awake', 'home_done', 'seq1_done', 'seq2_done',
  'spell_bolt', 'seq3_started', 'spell_ward', 'spell_purify',
];

function started() {
  const store = createGameStore();
  store.getState().startNewGame('classic');
  return store;
}

describe('spell selection (keys 1/2/3)', () => {
  it('keys map to arcane_bolt, purify, ward and the input controller reports them', () => {
    expect(SPELL_FOR_KEY).toEqual({ 1: 'arcane_bolt', 2: 'purify', 3: 'ward' });
    const input = new InputController();
    input.keyDown('Digit2');
    expect(input.state.spellPressed).toBe(2);
  });

  it('only unlocked spells can be selected', () => {
    const store = started();
    expect(store.getState().selectSpell('purify')).toBe(false);
    expect(store.getState().player.selectedSpell).toBe('arcane_bolt');
  });

  it('spell flags unlock bolt, ward and purify in spellsUnlocked, and each can then be selected', () => {
    const store = started();
    for (const f of UP_TO_SPELLS) expect(store.getState().setFlag(f).ok, f).toBe(true);
    expect(store.getState().player.spellsUnlocked.sort()).toEqual(['arcane_bolt', 'purify', 'ward']);
    expect(store.getState().selectSpell(SPELL_FOR_KEY[2])).toBe(true);
    expect(store.getState().player.selectedSpell).toBe('purify');
    expect(store.getState().selectSpell(SPELL_FOR_KEY[3])).toBe(true);
    expect(store.getState().player.selectedSpell).toBe('ward');
    expect(store.getState().selectSpell(SPELL_FOR_KEY[3])).toBe(false);
    expect(store.getState().selectSpell(SPELL_FOR_KEY[1])).toBe(true);
    expect(store.getState().player.selectedSpell).toBe('arcane_bolt');
  });

  it('does not duplicate an already unlocked spell', () => {
    const store = started();
    store.setState((s) => ({ player: { ...s.player, spellsUnlocked: ['arcane_bolt'] } }));
    for (const f of UP_TO_SPELLS) store.getState().setFlag(f);
    expect(store.getState().player.spellsUnlocked.filter((s) => s === 'arcane_bolt')).toHaveLength(1);
  });
});

describe('respawn moves the body', () => {
  it('each death bumps the respawn counter and puts the player at the checkpoint spawn', () => {
    const store = started();
    for (const f of UP_TO_SPELLS) store.getState().setFlag(f);
    const before = store.getState().player.respawns;
    store.setState((s) => ({ player: { ...s.player, hp: 0, pos: [10, 0, 10] } }));
    store.getState().respawn();
    const { player, game } = store.getState();
    const spawn = getCheckpoint(game.checkpointId).spawn;
    expect(player.respawns).toBe(before + 1);
    expect(player.pos).toEqual([spawn.x, 0, spawn.z]);
    // the view builds the body from exactly this spawn
    const body = createPlayerBody(spawn.x, spawn.z, spawn.yaw);
    expect([body.x, body.z]).toEqual([spawn.x, spawn.z]);
    store.getState().respawn();
    expect(store.getState().player.respawns).toBe(before + 2);
  });
});
