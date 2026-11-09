import type { DialogueLine } from './types.ts';

/** Beats 7-8: the back lane, the hounds, the outbuilding and the mirror (script/act2-3.md). */
export const BEAT7_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b7_01', speaker: 'Elena', text: "That's our house. That's Felix's window." },
  { id: 'vo_rosalind_j3', speaker: 'Rosalind', text: 'October thirty-first, nineteen sixty-six. The night I closed it. I used the oldest words and the last of my courage. Let it sleep until there is no one left of us to wake it.' },
  { id: 'vo_angel_b7_02', speaker: 'Angel', text: 'Hounds. The smoke has run out of neighbors.' },
  { id: 'vo_elena_b7_02', speaker: 'Elena', text: "Grandma's old carriage house. Locked." },
  // P4 mirror runes hints (docs/puzzles.md, script/act2-3.md)
  { id: 'vo_felix_p4_h1', speaker: 'Felix', text: 'Look where I was.' },
  { id: 'vo_angel_p4_h2', speaker: 'Angel', text: "The glass sees what you can't. Use it." },
  { id: 'vo_angel_p4_h3', speaker: 'Angel', text: 'There. By your shoulder. Can you feel it?' },
];
