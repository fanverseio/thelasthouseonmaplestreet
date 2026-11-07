import type { ProgressFlag } from '@tlh/shared';
import type { InteractionContent, InteractionDef } from './types.ts';

/** The Watcher has not been resolved yet. */
const UNRESOLVED: readonly ProgressFlag[] = ['watcher_purified', 'watcher_destroyed'];

/** The key drops when the Watcher falls, whichever way the choice went; it is picked up, then used on the lane gate. */
const fenceKey = (outcome: 'watcher_purified' | 'watcher_destroyed'): InteractionDef => ({
  id: 'pickup.house66.fence_key',
  prompt: 'Take the fence key',
  show: { flags: [outcome], notFlags: ['fence_key_taken'] },
  actions: [
    { do: 'pickUp', item: 'fence_key' },
    { do: 'setFlag', flag: 'fence_key_taken' },
    { do: 'say', line: 'vo_elena_b6_04' },
  ],
});

/**
 * Beat 6: House 66 and the Watcher (beat-sheet.md, puzzles.md P2). The fight is game/encounter-runtime.ts
 * (WATCHER_BINDING). The fuse (pickup.garden.fuse) is one item that cannot be dropped; the socket takes only it.
 * cp_watcher is written by the fuse_placed checkpoint rule, cp_lane by lane_open.
 */
export const BEAT6: InteractionContent = {
  interactions: [
    {
      id: 'socket.house66.fusebox',
      prompt: 'Place the fuse',
      lockedPrompt: 'Look at the fuse box',
      show: { notFlags: ['fuse_placed'] },
      requires: { carried: ['fuse'] },
      onRefuse: [{ do: 'say', line: 'vo_elena_b6_01' }],
      actions: [
        { do: 'setFlag', flag: 'fuse_placed' },
        { do: 'useSocket', item: 'fuse' },
        { do: 'say', line: 'vo_elena_b6_02' },
        { do: 'say', line: 'vo_watcher_b6_01', after: 3 },
      ],
    },
    // Engages him, then weakens him (the encounter runtime decides which); the panel offers purify or destroy.
    {
      id: 'enemy.house66.watcher',
      prompt: 'Face the Watcher',
      show: { flags: ['fuse_placed'], notFlags: UNRESOLVED },
      actions: [{ do: 'encounter', op: 'interact', id: 'watcher' }],
    },
    fenceKey('watcher_purified'),
    fenceKey('watcher_destroyed'),
    {
      id: 'gate.house66.lane',
      prompt: 'Unlock the lane gate',
      lockedPrompt: 'The lane gate is locked',
      show: { notFlags: ['lane_open'] },
      requires: { carried: ['fence_key'] },
      actions: [
        { do: 'setFlag', flag: 'lane_open' },
        { do: 'useSocket', item: 'fence_key' },
      ],
    },
  ],
  triggers: [],
  hints: [
    {
      id: 'p2_fuse',
      puzzle: 'p2_fuse',
      near: { entity: 'socket.house66.fusebox', radius: 22 },
      startFlag: 'seq4_done',
      cancelFlag: 'fuse_taken',
      steps: [
        { atSeconds: 60, say: 'vo_angel_b6_hint1' },
        { atSeconds: 120, flicker: 'light.garden.porch' },
      ],
    },
  ],
};
