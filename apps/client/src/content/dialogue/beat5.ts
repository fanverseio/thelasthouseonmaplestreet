import type { DialogueLine } from './types.ts';

/**
 * Beat 5: Gartner's confession (script/act1.md). Gartner is deceived, frightened and guilty-feeling;
 * he never knowingly helps the evil, whichever way the choice goes (canon.md). Every Gartner line is listed
 * in the task report for the canon review.
 */
export const BEAT5_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b5_01', speaker: 'Elena', text: "Gartner? It's Elena. Felix's mom. You're safe. Open the door." },
  { id: 'vo_gartner_b5_01', speaker: 'Gartner', text: 'Is it really you? It does voices. It did Felix\'s voice.' },
  { id: 'vo_elena_b5_02', speaker: 'Elena', text: "It's me. Look at me. Where's Felix?" },
  {
    id: 'vo_gartner_b5_02',
    speaker: 'Gartner',
    text: "There was a voice on the walkies. A nice voice. It said Felix's great-grandma left him treasure. A game, just for him.",
  },
  {
    id: 'vo_gartner_b5_03',
    speaker: 'Gartner',
    text: "It said I could help, 'cause I know the way. We go down the back lane behind sixty-six. Nobody sees you there.",
  },
  {
    id: 'vo_gartner_b5_04',
    speaker: 'Gartner',
    text: "The door of the old house was open, and Felix went in, and it shut. And the voice laughed. It wasn't nice anymore.",
  },
  { id: 'vo_gartner_b5_05', speaker: 'Gartner', text: "I banged on it. I did. Then I ran. I'm sorry. I didn't know." },
  {
    id: 'vo_elena_b5_c1',
    speaker: 'Elena',
    text: "Hey. Hey. You didn't do this. Something used you, and it lied to you. That's not your fault.",
  },
  { id: 'vo_gartner_b5_06a', speaker: 'Gartner', text: '...Okay.' },
  { id: 'vo_elena_b5_p1', speaker: 'Elena', text: "Why didn't you get help? Why didn't you come to me?" },
  { id: 'vo_gartner_b5_06b', speaker: 'Gartner', text: "I was scared it would hear me. I'm still scared." },
  {
    id: 'vo_gartner_b5_07',
    speaker: 'Gartner',
    text: "Felix found this in the lane. He said it was a treasure map. It's not a map.",
  },
  {
    id: 'vo_gartner_b5_08',
    speaker: 'Gartner',
    text: "The lane gate's locked now. Mr. Corwin at sixty-six has the key. He took the fuses out of all his lights. He says the dark lets him see.",
  },
  { id: 'vo_gartner_b5_09', speaker: 'Gartner', text: 'Mr. Briggs had tons of fuses. For his Halloween lights.' },
  { id: 'vo_elena_b5_03', speaker: 'Elena', text: "Stay here. Lock the door. I'll bring him back." },
  { id: 'vo_gartner_b5_10', speaker: 'Gartner', text: "Tell him I'm sorry." },
];
