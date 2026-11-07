/**
 * Current objective line for the HUD, derived only from progression flags.
 * First matching rule wins; rules are ordered from the end of the story backwards.
 */
import type { ProgressFlag } from '@tlh/shared';

interface Rule {
  when: ProgressFlag;
  text: string;
}

const RULES: readonly Rule[] = [
  { when: 'anchors_all', text: 'Make your choice at the seal.' },
  { when: 'ritual_active', text: 'Restore the three anchors.' },
  { when: 'seq6_done', text: 'Activate the seal.' },
  { when: 'board_solved', text: 'Approach the seal.' },
  { when: 'runes_done', text: 'Enter the Last House.' },
  { when: 'padlock_open', text: 'Look into the mirror.' },
  { when: 'lane_open', text: 'Follow the back lane to the Last House.' },
  { when: 'fuse_placed', text: 'Face the Watcher.' },
  { when: 'seq4_done', text: 'Find a fuse for House 66.' },
  { when: 'walkie_found', text: 'Find Gartner at No. 40.' },
  { when: 'seq2_done', text: 'Search the garden at No. 31.' },
  { when: 'seq1_done', text: 'Go to the streetlight.' },
  { when: 'home_done', text: 'Follow Felix\'s voice down Maple Street.' },
  { when: 'locket_taken', text: 'Leave the house.' },
  { when: 'drawer_key_taken', text: 'Open the drawer by the front door.' },
  { when: 'drawing_seen', text: 'Find the key Felix drew.' },
  { when: 'bed_seen', text: 'Look for clues about Felix.' },
];

export const FIRST_OBJECTIVE = 'Find Felix.';

export function objectiveFor(flags: readonly ProgressFlag[]): string {
  const set = new Set(flags);
  for (const r of RULES) if (set.has(r.when)) return r.text;
  return FIRST_OBJECTIVE;
}
