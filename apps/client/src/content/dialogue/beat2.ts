import type { DialogueLine } from './types.ts';

/** Beat 2: Sequence 1, the empty street (script/act1.md). */
export const BEAT2_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b2_01', speaker: 'Elena', text: 'Where is everyone? It\'s Halloween. There should be kids. Noise.' },
  { id: 'vo_elena_b2_02', speaker: 'Elena', text: 'Hello? Is someone there?' },
  { id: 'vo_elena_b2_03', speaker: 'Elena', text: "The Parkers are away. So who's in their house?" },
  { id: 'vo_elena_b2_04', speaker: 'Elena', text: "That smoke's moving against the wind." },
  {
    id: 'vo_angel_b2_c1',
    speaker: 'Angel',
    text: 'Listen. No dogs, no doors, no children. Silence like this is made, not found.',
  },
  {
    id: 'vo_angel_b2_c2',
    speaker: 'Angel',
    text: 'Walk towards the light at the corner. Whatever wants you, wants you there. So, it seems, do I.',
  },
  {
    id: 'vo_angel_b2_h1',
    speaker: 'Angel',
    text: 'The street only goes one way tonight, Elena. Follow the lights.',
  },
];
