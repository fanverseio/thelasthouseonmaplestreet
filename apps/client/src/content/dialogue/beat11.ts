import type { DialogueLine } from './types.ts';

/**
 * Beats 11-12: the final ritual and the choice (script/act2-3.md). The Felix and ending lines belong to the
 * generated video clips (cin_felix_anchor, cin_ending_*), so only the lines spoken in the world are here.
 * The Angel's final line is authored per morality band; the id suffix is the band name.
 */
export const BEAT11_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b11_01', speaker: 'Elena', text: 'Three anchors. Gran, show me how.' },
  { id: 'vo_angel_b11_01', speaker: 'Angel', text: 'North wants force. East wants patience. West wants mercy. Go.' },
  { id: 'vo_smoke_b11_01', speaker: 'Smoke', text: 'Little keeper. Little lock.' },
  { id: 'vo_smoke_b11_02', speaker: 'Smoke', text: 'Open. Open.' },
  { id: 'vo_angel_p6_h_north', speaker: 'Angel', text: 'Break the shell. Your bolt, Elena.' },
  { id: 'vo_angel_p6_h_east', speaker: 'Angel', text: 'Hold it, and shield yourself while you do.' },
  { id: 'vo_angel_p6_h_west', speaker: 'Angel', text: 'Purify it. The light that saves.' },
  { id: 'vo_elena_b11_02', speaker: 'Elena', text: "It's quiet. It's stopped." },
];

/** Beat 12: the Angel's last word before the choice, one authored line per band. */
export const BEAT12_LINES: readonly DialogueLine[] = [
  {
    id: 'vo_angel_b12_kind',
    speaker: 'Angel',
    text: "She chose to keep it. You can too, and still walk out with him. It's a long duty. You won't carry it alone. I'll be in your pocket, complaining.",
  },
  {
    id: 'vo_angel_b12_neutral',
    speaker: 'Angel',
    text: "This part is yours. I could argue either side beautifully. I won't. Choose.",
  },
  {
    id: 'vo_angel_b12_dark',
    speaker: 'Angel',
    text: "Break it. He's right there. Why should you pay for her bargain? Let the smoke have Maple Street. It never loved you.",
  },
];
