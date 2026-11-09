import type { DialogueLine } from './types.ts';

/** Beat 3: Sequence 2, Felix beneath the streetlight, plus the skippable street encounter (script/act1.md). */
export const BEAT3_LINES: readonly DialogueLine[] = [
  { id: 'vo_felix_b3_01', speaker: 'Felix', text: 'Mom. You came.' },
  { id: 'vo_elena_b3_01', speaker: 'Elena', text: 'Felix! Baby, come here, come here...' },
  {
    id: 'vo_felix_b3_02',
    speaker: 'Felix',
    text: "I can't. I'm not really here. It's counting, Mom. Don't let it count to two.",
  },
  { id: 'vo_felix_b3_03', speaker: 'Felix', text: "Mr. Briggs' yard. It's inside him now. Please be careful." },
  { id: 'vo_elena_b3_02', speaker: 'Elena', text: "My hands... what's happening to my hands?" },
  {
    id: 'vo_angel_b3_01',
    speaker: 'Angel',
    text: "That isn't my doing. That light is yours. Rosalind's blood, waking up at last.",
  },
  { id: 'vo_angel_b3_02', speaker: 'Angel', text: 'Point. Will it. Let it go.' },
  { id: 'vo_elena_b3_03', speaker: 'Elena', text: 'His candy bag. He never puts this down.' },
  {
    id: 'vo_angel_b3_c1',
    speaker: 'Angel',
    text: 'The boy\'s spirit walks without his body. His body is somewhere else, and alive. Hold on to that.',
  },
  {
    id: 'vo_angel_b3_c2',
    speaker: 'Angel',
    text: 'Your gift has teeth now. Use it on what the smoke has taken, not on the frightened.',
  },
  {
    id: 'vo_angel_fox_c1',
    speaker: 'Angel',
    text: 'A fox, wearing the smoke like a collar. You could pass it by. Or you could make it rest.',
  },
  { id: 'vo_elena_fox_01', speaker: 'Elena', text: "It's just lying there. Shaking." },
  {
    id: 'vo_angel_fox_c2',
    speaker: 'Angel',
    text: "You can't cleanse it yet. Leave it, end it, or come back when you're more than you are now.",
  },
];
