/**
 * Manifest of the generated cinematic clips (author decision: cinematics are video clips, not built in code).
 * One row per `video` step in content/sequences/. The clips do not exist yet: today each plays as a black
 * placeholder panel for `targetSeconds`. This file is the input for generating them later with a
 * text-to-video API, so every `prompt` is a self-contained visual brief.
 *
 * Canon rules every prompt follows (.kiro/steering/canon.md):
 * - No gore, no blood, no visible injury. Atmosphere and unease, not shock.
 * - Felix (8, in a half-finished ghost costume) is NEVER harmed on screen. As a spirit he is soft and sad.
 * - The smoke is faceless and shapeless: swirling black smoke, never a face, eyes or mouth.
 * - Elena (adult mother, dark coat, the silver Whispering Locket on a chain) is frightened and determined.
 * Audio and dialogue are NOT part of the prompt: voices are added from `voiceLines` (pre-generated lines).
 *
 * game/classic-playthrough.test.ts checks this file: every `video` clipId in the sequences must be listed here,
 * and `targetSeconds` must equal the sequence's `fallbackSeconds`.
 */

export interface VideoClipDef {
  /** Equals the sequence id and the `clipId` of its `video` step. */
  id: string;
  /** Beat number (docs/beat-sheet.md). Both endings are beat 12. */
  beat: number;
  /** What the clip does for the story, in one sentence. */
  purpose: string;
  /** Length to generate, in seconds. Equals the placeholder length (`fallbackSeconds`). */
  targetSeconds: number;
  /** Hard limit from docs/cinematic-controller.md (forced-control budget). */
  maxSeconds: number;
  /** Aspect ratio and frame rate to request. */
  format: { aspect: '16:9'; fps: 24 };
  /** Text-to-video prompt: short, visual, canon-safe. */
  prompt: string;
  /** Things the generator must not produce. */
  negativePrompt: string;
  /** Voice lines the clip is cut to (ids in docs/script/). They are added in audio, not drawn. */
  voiceLines: readonly string[];
}

const NEGATIVE =
  'gore, blood, wounds, injury, corpse, violence against a child, jump scare, text, subtitles, logo, watermark, ' +
  'a face in the smoke, eyes or mouth in the smoke, monster with a face, cartoon style';

export const VIDEO_CLIPS: readonly VideoClipDef[] = [
  {
    id: 'seq2_felix_streetlight',
    beat: 3,
    purpose: "Felix's spirit appears beneath the failing streetlight, warns Elena and points to No. 31; the bulb bursts and her hands glow.",
    targetSeconds: 20,
    maxSeconds: 25,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, night, an empty suburban street on Halloween, thick low fog, one old streetlight flickering and then ' +
      'steadying to a pale warm glow. Beneath it stands the translucent spirit of an eight-year-old boy in a ' +
      'half-finished homemade ghost costume, soft and sad, faintly glowing, feet not touching the ground. A woman in a ' +
      'dark coat with a silver locket on a chain runs towards him with her arms out and stops short. The boy looks at ' +
      'her gently, lifts one small hand and points down the street towards a darkened house with a garden. He fades ' +
      'into the fog. The bulb bursts into harmless sparks and the woman looks down at her hands, which glow with a soft ' +
      'blue light. Slow handheld camera, shallow depth of field, muted teal and amber colour grade.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_felix_b3_01', 'vo_elena_b3_01', 'vo_felix_b3_02', 'vo_felix_b3_03'],
  },
  {
    id: 'seq5_felix_mirror',
    beat: 8,
    purpose: "Elena's reflection lags, Felix appears behind the reflection only and warns that the seal is cracked; the mirror cracks.",
    targetSeconds: 25,
    maxSeconds: 30,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, dim old stone carriage house at night, one tall antique mirror leaning on the wall, dust in the air. ' +
      'A woman in a dark coat with a silver locket stands facing the mirror, seen from behind her shoulder. Her ' +
      'reflection moves a moment late, slightly wrong. Behind the reflection, only inside the glass, a translucent ' +
      'eight-year-old boy in a half-finished ghost costume stands very still and speaks to her with a worried face. ' +
      'The real room behind the woman is empty. Faint wisps of faceless, shapeless pale smoke drift in the glass. A single fine crack ' +
      'runs across the mirror and the boy fades. Slow push-in, cold blue light, deep shadows, restrained and quiet.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_b8_01', 'vo_felix_b8_01', 'vo_felix_b8_02', 'vo_felix_b8_03', 'vo_elena_b8_02'],
  },
  {
    id: 'seq6_two_keys',
    beat: 10,
    purpose: 'Runes ignite; the faceless smoke rises and speaks; Felix is seen asleep inside the seal light, unharmed; the two Living Keys are revealed.',
    targetSeconds: 40,
    maxSeconds: 45,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, a circular stone cellar chamber with a carved seal in the floor. Ancient runes in the floor and walls ' +
      'ignite one by one with a cold violet light. Thick black smoke, faceless and shapeless, with no eyes and no mouth, ' +
      'rises slowly from the seal in the centre and coils through the air like slow ink in water. A woman in a dark ' +
      'coat with a silver locket stands at the edge of the light, frightened but holding her ground. Inside the glowing ' +
      'light above the seal, a boy of eight in a half-finished ghost costume floats asleep, peaceful, unharmed, ' +
      'surrounded by gentle light. The smoke leans towards the woman, then towards the boy, then gathers above the seal. ' +
      'Slow orbiting camera, dark palette with violet and pale gold accents, ominous but calm.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_smoke_b10_01', 'vo_smoke_b10_02', 'vo_elena_b10_01', 'vo_smoke_b10_03', 'vo_smoke_b10_04'],
  },
  {
    id: 'cin_felix_anchor',
    beat: 11,
    purpose: "Felix's third and last appearance: he stands beside the seal, encourages Elena and says each anchor loosens the evil's hold on him.",
    targetSeconds: 15,
    maxSeconds: 20,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, the same circular stone chamber, one carved anchor stone now glowing a steady warm gold while black ' +
      'smoke, faceless and shapeless, thins and pulls back from it. Beside the central seal stands the translucent ' +
      'spirit of an eight-year-old boy in a half-finished ghost costume, brighter and calmer than before, smiling ' +
      'with tired hope and nodding to the woman in the dark coat with a silver locket. She kneels and reaches for him ' +
      'and her hand passes through gentle light. He holds up a thumbs-up and fades into sparks of warm light. ' +
      'Soft slow camera, warm gold against cold blue shadows, hopeful and tender.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_felix_b11_01', 'vo_felix_b11_02'],
  },
  {
    id: 'cin_ending_keeper',
    beat: 12,
    purpose: 'Ending A, The Bloodline Keeper: Elena takes the seal on herself, Felix is released and they walk out of the house into dawn.',
    targetSeconds: 25,
    maxSeconds: 30,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, the stone chamber. A woman in a dark coat places both hands on the glowing seal and a river of soft ' +
      'golden light flows from a sleeping eight-year-old boy in a half-finished ghost costume into her arms. The smoke, ' +
      'faceless and shapeless, is pressed back down into the seal and the runes go calm. The boy wakes, solid and ' +
      'warm, unharmed, and she lifts him into her arms. Cut to the old front door opening on a quiet dawn street, pale ' +
      'orange sky, thin mist; the mother and son walk out together, his small hand in hers, and the door closes ' +
      'behind them. Gentle camera, bittersweet and hopeful, warm sunrise colour grade.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_end_k1', 'vo_felix_end_k1', 'vo_elena_end_k2', 'vo_angel_end_k1'],
  },
  {
    id: 'cin_ending_broken',
    beat: 12,
    purpose: 'Ending B, The Broken Seal: Elena breaks the seal, Felix is freed, the smoke escapes and spreads down Maple Street.',
    targetSeconds: 25,
    maxSeconds: 30,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, the stone chamber. A woman in a dark coat raises a heavy iron rod and brings it down on the glowing ' +
      'seal; the seal splits in a flash of white light and a sleeping eight-year-old boy in a half-finished ghost ' +
      'costume drops safely into her arms, awake, unharmed and clinging to her. Black smoke, faceless and shapeless, ' +
      'pours out of the broken seal past them and up through the house. Cut to Maple Street at night: the mother and ' +
      'son run hand in hand down the middle of the road while the smoke rolls out behind them and the streetlights ' +
      'go out one by one. Fast tracking camera, cold desaturated colours, urgent and ominous, no violence.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_end_b1', 'vo_felix_end_b1', 'vo_smoke_end_b1', 'vo_elena_end_b2'],
  },
];

export function getVideoClip(id: string): VideoClipDef | undefined {
  return VIDEO_CLIPS.find((c) => c.id === id);
}
