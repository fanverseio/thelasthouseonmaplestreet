import type { DialogueLine } from './types.ts';

/**
 * Beats 9 and 10 (script/act2-3.md): the Last House interior and Sequence 6. The Smoke lines are part of the
 * generated clip `seq6_two_keys` and are listed here for subtitles and the content checks. The Angel's
 * authored reactions (by band) and the band lines for the locket are wired by task 4.11.
 */
export const BEAT9_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b9_01', speaker: 'Elena', text: "Grandma's house. I was here once, when I was little. I don't remember this hall." },
  {
    id: 'vo_rosalind_j4',
    speaker: 'Rosalind',
    text: 'This house does not need a lock. It needs a... A lock can be broken. What I am can only be handed on, and only by choice.',
  },
  { id: 'vo_angel_b9_01', speaker: 'Angel', text: 'A cat. The smoke has a sense of humor.' },
  { id: 'vo_elena_b9_02', speaker: 'Elena', text: 'A talking board. Six letters.' },
  { id: 'vo_elena_b9_03', speaker: 'Elena', text: 'Keeper.' },
  { id: 'vo_angel_b9_kind_c1', speaker: 'Angel', text: "She kept roses by that window. I'd forgotten. Thank you for bringing me back here." },
  { id: 'vo_angel_b9_neutral_c1', speaker: 'Angel', text: 'Her house, her rules. Everything here was a lock once.' },
  { id: 'vo_angel_b9_dark_c1', speaker: 'Angel', text: 'So many locks for one old woman. What was she so afraid of losing?' },
];

export const BEAT10_LINES: readonly DialogueLine[] = [
  { id: 'vo_smoke_b10_01', speaker: 'Smoke', text: 'Daughter of her daughter.' },
  { id: 'vo_smoke_b10_02', speaker: 'Smoke', text: 'Two keys of her blood. The boy opened the door a crack.' },
  { id: 'vo_elena_b10_01', speaker: 'Elena', text: "Felix! He's asleep. He's inside the light." },
  {
    id: 'vo_smoke_b10_03',
    speaker: 'Smoke',
    text: 'I called him with her voice. I called you with his. Every road on this street led here.',
  },
  { id: 'vo_smoke_b10_04', speaker: 'Smoke', text: 'You will open it wide.' },
  {
    id: 'vo_angel_b10_kind',
    speaker: 'Angel',
    text: 'Elena. Listen to me, not to it. Your grandmother built this, which means it can be mended.',
  },
  {
    id: 'vo_angel_b10_neutral',
    speaker: 'Angel',
    text: 'Well. Now we both know what you are. A key. Quite a lot rides on what you open.',
  },
  {
    id: 'vo_angel_b10_dark',
    speaker: 'Angel',
    text: 'Two keys. You and the boy. You could walk out of here with him in a minute. Only a minute. Think about it.',
  },
  {
    id: 'vo_rosalind_j5',
    speaker: 'Rosalind',
    text: "If you are reading this, my blood has come back to the house. Two of us can open it. One of us can carry it. Mend the anchors, and then choose what I chose, or don't.",
  },
];
