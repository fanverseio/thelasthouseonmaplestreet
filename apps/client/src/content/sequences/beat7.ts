import type { SequenceDef } from '../../game/sequences.ts';

/**
 * Beat 7 atmosphere event (beat-sheet.md): passing Elena's back garden, Felix's bedroom light comes on for
 * about 5 s (a small silhouette is drawn by the view while it is on), then goes dark. Control stays full, so
 * it cannot be skipped and costs no forced seconds. Fired by trg.lane.home_window.
 */
export const ATM_HOME_WINDOW: SequenceDef = {
  id: 'atm_home_window',
  kind: 'atmosphere',
  trigger: { entity: 'trg.lane.home_window' },
  requires: [],
  owns: ['light.home.felix_window'],
  policy: { locket: 'allowed', angelActions: 'allowed', control: 'full' },
  maxForcedSeconds: 0,
  skippable: false,
  setsOnComplete: [],
  steps: [
    { t: 'light', target: 'light.home.felix_window', effect: 'on' },
    { t: 'line', lineId: 'vo_elena_b7_01' },
    { t: 'wait', seconds: 5 },
    { t: 'light', target: 'light.home.felix_window', effect: 'off' },
  ],
};

export const BEAT7_SEQUENCES: readonly SequenceDef[] = [ATM_HOME_WINDOW];
