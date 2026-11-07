import type { DialogueLine } from './types.ts';

/** Beat 4: Sequence 3, the cursed neighbour (script/act1.md). */
export const BEAT4_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b4_01', speaker: 'Elena', text: 'Mr Briggs? Have you seen Felix? Mr Briggs?' },
  { id: 'vo_briggs_b4_01', speaker: 'Briggs', text: "Lovely night. Lovely... night. It said you'd come." },
  { id: 'vo_briggs_b4_02', speaker: 'Briggs', text: "It's warm in here, Elena. Come inside." },
  { id: 'vo_angel_b4_01', speaker: 'Angel', text: 'Raise your arm! Like a door closing. Now!' },
  { id: 'vo_briggs_b4_03', speaker: 'Briggs', text: 'It wants the boy\'s mother. It wants...' },
  {
    id: 'vo_angel_b4_02',
    speaker: 'Angel',
    text: "There. He's weakened. You can cleanse the man inside, or finish what the smoke started. Choose, Elena. I'll be watching.",
  },
  { id: 'vo_elena_b4_02', speaker: 'Elena', text: 'Come back, Harold. Come back.' },
  {
    id: 'vo_briggs_b4_04',
    speaker: 'Briggs',
    text: "The boy... Gartner's boy came running past. Crying. I think I frightened him.",
  },
  { id: 'vo_elena_b4_03', speaker: 'Elena', text: "I'm sorry. I'm so sorry." },
  {
    id: 'vo_gartner_b4_01',
    speaker: 'Gartner',
    text: "Felix? Felix, are you there? Please answer. I'm in the shed. Number forty. I'm not coming out.",
  },
  { id: 'vo_elena_b4_04', speaker: 'Elena', text: "Gartner. He's at forty." },
  {
    id: 'vo_angel_b4_kind_c1',
    speaker: 'Angel',
    text: 'You gave him back to himself. Rosalind would have done the same. I find I\'m glad.',
  },
  {
    id: 'vo_angel_b4_kind_c2',
    speaker: 'Angel',
    text: 'Mercy costs more than it looks, dear heart. You paid it anyway.',
  },
  {
    id: 'vo_angel_b4_neutral_c1',
    speaker: 'Angel',
    text: 'Curious. You hesitated before you chose. I like to know what people do when it matters.',
  },
  {
    id: 'vo_angel_b4_neutral_c2',
    speaker: 'Angel',
    text: 'The boy on the walkie is frightened, not wicked. Number forty, he said.',
  },
  {
    id: 'vo_angel_b4_dark_c1',
    speaker: 'Angel',
    text: "Efficient. The smoke will think twice. I confess I didn't think you had it in you.",
  },
  {
    id: 'vo_angel_b4_dark_c2',
    speaker: 'Angel',
    text: 'Forty. Go and get your answers from the child. Quickly.',
  },
  // Placeholder: the script has no Classic line for the garden before the fight is resolved.
  {
    id: 'vo_angel_b4_c0',
    speaker: 'Angel',
    text: 'Be careful, child. The man you knew may still be in there, somewhere beneath the smoke.',
    placeholder: true,
  },
];
