import type { SequenceDef } from '../../game/sequences.ts';
import type { EntityId, ProgressFlag, SequenceId } from '@tlh/shared';

const WATCHER = 'enemy.house66.watcher' as EntityId;

/**
 * Beat 6 clips (no horror sequence: the fight is the encounter runtime). Each is one skippable `video` step with
 * its lines spoken in the video: the appear clip is started by the fuse box, the outcome clips by onFlag rules
 * (content/interactions/beat6.ts). They set no flags: the fight and the fence key stay with the encounter and
 * the pickup.
 */
const clip = (id: SequenceId, flag: ProgressFlag, seconds: number): SequenceDef => ({
  id,
  kind: 'cinematic',
  trigger: { flag },
  requires: [flag],
  owns: [WATCHER],
  policy: { locket: 'blocked', angelActions: 'blocked', control: 'locked' },
  maxForcedSeconds: seconds,
  skippable: true,
  setsOnComplete: [],
  steps: [{ t: 'video', clipId: id, fallbackSeconds: seconds }],
});

/** The porch light snaps on and the Watcher turns and names Felix (vo_elena_b6_02, vo_watcher_b6_01). */
export const CIN_WATCHER_APPEAR = clip('cin_watcher_appear', 'fuse_placed', 13);
/** The smoke leaves him; he points to the gate (vo_watcher_b6_06). */
export const CIN_WATCHER_PURIFIED = clip('cin_watcher_purified', 'watcher_purified', 14);
/** He gives way to smoke; his coat and the key remain (vo_elena_b6_03). */
export const CIN_WATCHER_DESTROYED = clip('cin_watcher_destroyed', 'watcher_destroyed', 8);

export const BEAT6_SEQUENCES: readonly SequenceDef[] = [CIN_WATCHER_APPEAR, CIN_WATCHER_PURIFIED, CIN_WATCHER_DESTROYED];
