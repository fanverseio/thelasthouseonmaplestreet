import type { DialogueLine } from './types.ts';

/**
 * Lines that belong to the cinematic video clips (script/act2-3.md): Felix in the mirror (beat 8), Felix at the
 * anchor (beat 11) and the two endings. They are data and recordings only for now: no sequence says them yet,
 * and the `clip` flag keeps the locket from ever picking them.
 */
const C = true as const;

export const CLIP_LINES: readonly DialogueLine[] = [
  // Beat 8: the spirit in the mirror
  { id: 'vo_felix_b8_01', speaker: 'Felix', text: "Mom. Behind you. No, don't turn around. I'm only in here.", clip: C },
  { id: 'vo_felix_b8_02', speaker: 'Felix', text: "It's cracked. Great-grandma's lock. I made it crack. I didn't mean to, I was only playing with the light.", clip: C },
  { id: 'vo_felix_b8_03', speaker: 'Felix', text: "It wants you too. It needs you too. Don't let it...", clip: C },
  // Beat 11: cin_felix_anchor
  { id: 'vo_felix_b11_01', speaker: 'Felix', text: "Mom! It's letting go a bit. Every time you fix one, it holds me less.", clip: C },
  { id: 'vo_felix_b11_02', speaker: 'Felix', text: "You're doing it. You're really doing it. Keep going.", clip: C },
  // Ending: The Bloodline Keeper
  { id: 'vo_elena_end_k1', speaker: 'Elena', text: "Felix. Let go of it, baby. I've got it now.", clip: C },
  { id: 'vo_felix_end_k1', speaker: 'Felix', text: "Mom? It's gone heavy. Are you okay?", clip: C },
  { id: 'vo_elena_end_k2', speaker: 'Elena', text: "I'm okay. It's mine to hold now. Let's go home.", clip: C },
  { id: 'vo_angel_end_k1', speaker: 'Angel', text: 'The keeper walks out of her own house. Rosalind never managed that. Well done, Elena.', clip: C },
  // Ending: The Broken Seal
  { id: 'vo_elena_end_b1', speaker: 'Elena', text: "I don't care what it costs. Give me my son.", clip: C },
  { id: 'vo_felix_end_b1', speaker: 'Felix', text: "Mom! I'm out! ...Mom? What's that noise?", clip: C },
  { id: 'vo_smoke_end_b1', speaker: 'Smoke', text: 'Thank you.', clip: C },
  { id: 'vo_elena_end_b2', speaker: 'Elena', text: "Run, Felix. Don't look back.", clip: C },
];
