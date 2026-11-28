/**
 * Manifest of the cinematic clips (author decision: cinematics are video clips, not built in code).
 * One row per `video` step in content/sequences/. The final files are `public/assets/video/<id>.mp4`
 * (H.264 + AAC, 1280x720, faststart; the voices are inside the video). `targetSeconds` is the real clip length
 * rounded up, and is also the placeholder length (`fallbackSeconds`) used when a file is missing or fails.
 * `prompt` is the visual brief the clip was made from (kept for redos).
 *
 * Canon rules every prompt follows (.kiro/steering/canon.md):
 * - No gore, no blood, no visible injury. Atmosphere and unease, not shock.
 * - Felix (8, in a half-finished ghost costume) is NEVER harmed on screen. As a spirit he is soft and sad.
 * - The smoke is faceless and shapeless: swirling black smoke, never a face, eyes or mouth.
 * - Elena (adult mother, dark coat, the silver Whispering Locket on a chain) is frightened and determined.
 * Audio and dialogue: the final clips carry their own speech; `voiceLines` lists the script lines inside each clip.
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
    id: 'cin_angel_intro',
    beat: 1,
    purpose: 'The locket opens itself in the hall, the Angel wakes and a sepia memory shows Rosalind sealing the evil.',
    targetSeconds: 27,
    maxSeconds: 30,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A dim house hallway at night, warm lamp light and cool moonlight. Close on the hands of a woman in a dark navy ' +
      'knit cardigan holding a small antique oval silver locket. It clicks open by itself and a cluster of small floating ' +
      'violet and silver lights rises and orbits her hand. The lights spread over the wall into a sepia memory: a tall woman ' +
      'with a long silver braid closes a leather journal and presses her palm to a glowing seal in a stone floor. The memory ' +
      'fades; the lights settle into a calm halo above the locket and the woman looks up, startled. Slow push-in.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_angel_b1_01', 'vo_elena_b1_07', 'vo_angel_b1_02'],
  },
  {
    id: 'cin_home_door_felix',
    beat: 1,
    purpose: "Elena opens the front door and sees Felix's spirit at the end of the foggy path; he turns and fades.",
    targetSeconds: 10,
    maxSeconds: 12,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'The front door of a suburban house on Halloween night. A woman in a dark navy knit cardigan opens the door; low fog ' +
      'drifts in, jack-o-lanterns glow on the porch and the porch bulb flickers. At the end of the garden path stands a small ' +
      'translucent eight-year-old boy in a half-finished bedsheet ghost costume, softly glowing, calm and sad, facing away. ' +
      'He turns his head a little toward her, then dissolves gently into the fog. Close on her worried, determined face.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_felix_b1_01', 'vo_elena_b1_08'],
  },
  {
    id: 'seq2_felix_streetlight',
    beat: 3,
    purpose: "Felix's spirit appears beneath the failing streetlight, warns Elena and points to No. 31; the bulb bursts and her hands glow.",
    targetSeconds: 28,
    maxSeconds: 30,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, night, an empty suburban street on Halloween, thick low fog, one old streetlight flickering and then ' +
      'steadying to a pale warm glow. Beneath it stands the translucent spirit of an eight-year-old boy in a ' +
      'half-finished homemade ghost costume, soft and sad, faintly glowing, feet not touching the ground. A woman in a ' +
      'dark coat with a silver locket on a chain runs toward him with her arms out and stops short. The boy looks at ' +
      'her gently, lifts one small hand and points down the street toward a darkened house with a yard. He fades ' +
      'into the fog. The bulb bursts into harmless sparks and the woman looks down at her hands, which glow with a soft ' +
      'blue light. Slow handheld camera, shallow depth of field, muted teal and amber color grade.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_felix_b3_01', 'vo_elena_b3_01', 'vo_felix_b3_02', 'vo_felix_b3_03'],
  },
  {
    id: 'cin_briggs_purified',
    beat: 4,
    purpose: 'Purify outcome: the smoke lifts off Mr Briggs, he sits dazed on his step and says Gartner ran past.',
    targetSeconds: 15,
    maxSeconds: 15,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A garden at night in front of a suburban house. A broad older man in a brown cable-knit cardigan kneels while thin ' +
      'ribbons of black smoke, faceless and shapeless, lift off him and dissolve into the fog. Pale-gold light from a ' +
      "woman's glowing hand falls across him. He sits down dazed on his porch step, a kind, tired, confused face with reading " +
      'glasses on a cord. A woman in a dark navy cardigan kneels beside him. Gentle push-in, warm gold against cool blue, mercy.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_b4_02', 'vo_briggs_b4_04'],
  },
  {
    id: 'cin_briggs_destroyed',
    beat: 4,
    purpose: 'Destroy outcome: the corrupted Mr Briggs comes apart into smoke and only his empty cardigan is left.',
    targetSeconds: 9,
    maxSeconds: 10,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A garden at night in front of a suburban house. A tall thin smoke-corrupted figure in a brown cardigan is struck by a ' +
      'soft bolt of pale-gold light and comes apart into thick black smoke, faceless and shapeless, which rolls away over the ' +
      'rooftops into the fog. Low angle: a brown cable-knit cardigan lies empty and crumpled on the grass. A woman in a dark ' +
      'navy cardigan stands over it, shaken and sorry, slowly lowering her glowing hand. Cold blue light, quiet sadness.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_b4_03'],
  },
  {
    id: 'cin_gartner_confession',
    beat: 5,
    purpose: 'Gartner tells how the voice on the walkie sent them down the back lane and the Last House door shut on Felix.',
    targetSeconds: 22,
    maxSeconds: 25,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Flashback look, slightly desaturated, soft vignette. A narrow foggy back lane behind old houses at night. Two small ' +
      'boys walk side by side: a nine-year-old in an oversized faded red hoodie with a cardboard sword and a walkie-talkie, and ' +
      'an eight-year-old in a half-finished bedsheet ghost costume carrying a small lantern. The smaller boy walks in through ' +
      'the open door of a tall dark old house and the door swings shut by itself. The older boy bangs on it, then backs away, ' +
      'frightened. Cut to the present: the same boy in a garden shed under one weak bulb, holding the walkie, guilty and scared.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_gartner_b5_03', 'vo_gartner_b5_04'],
  },
  {
    id: 'cin_watcher_appear',
    beat: 6,
    purpose: 'The porch light of House 66 snaps on; the Watcher turns from the house and names Felix.',
    targetSeconds: 13,
    maxSeconds: 15,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A neglected suburban front yard at night. A porch light snaps on with a pale yellow glow. In the yard stands a very ' +
      'tall, thin old man with long white hair, a long charcoal wool overcoat and brass binoculars on a strap, his back to us. ' +
      'A thin curl of black smoke, faceless and shapeless, wraps his shoes. Slow push-in. He turns his head, then his whole ' +
      'body, and looks toward the camera with pale deep-set eyes. Eerie and frail, a corrupted lookout, not a monster.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_b6_02', 'vo_watcher_b6_01'],
  },
  {
    id: 'cin_watcher_purified',
    beat: 6,
    purpose: 'Purify outcome: the smoke leaves the Watcher, he points Elena to the lane gate and the fence key glints.',
    targetSeconds: 14,
    maxSeconds: 15,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A neglected suburban front yard at night. A very tall thin old man in a long charcoal coat kneels on the lawn, brass ' +
      'binoculars hanging from his neck. Black smoke, faceless and shapeless, lifts off him in a long soft ribbon and ' +
      'dissolves into the fog. His gaunt face softens into tired relief. He looks up at a woman in a dark navy cardigan, lifts a ' +
      'trembling hand toward a side gate, then lowers it. A small brass key glints in the grass beside him. Warm gold light.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_watcher_b6_06'],
  },
  {
    id: 'cin_watcher_destroyed',
    beat: 6,
    purpose: 'Destroy outcome: the Watcher gives way to smoke; his empty coat, binoculars and the fence key remain.',
    targetSeconds: 8,
    maxSeconds: 10,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A neglected suburban front yard at night. A very tall thin old man in a long charcoal coat is struck by a soft bolt of ' +
      'pale-gold light and gives way to black smoke, faceless and shapeless, which streams across the yard into the night ' +
      'sky. Low angle: his empty charcoal overcoat lies folded on the grass with the brass binoculars and a small old brass ' +
      "key on top. A woman's shadow falls across them. Cold blue light, quiet and sorrowful, slow camera.",
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_b6_03'],
  },
  {
    id: 'seq5_felix_mirror',
    beat: 8,
    purpose: "Elena's reflection lags, Felix appears behind the reflection only and warns that the seal is cracked; the mirror cracks.",
    targetSeconds: 29,
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
    id: 'cin_last_house_enter',
    beat: 9,
    purpose: 'Elena pushes the glowing front door of the Last House open and steps into the dusty hall.',
    targetSeconds: 12,
    maxSeconds: 12,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A tall old wooden front door of a large abandoned house at night, slightly ajar, warm gold light spilling through the ' +
      'crack across a decayed porch. A woman in a dark navy knit cardigan with a silver locket pushes it open slowly. Reveal: ' +
      'a grand dusty entrance hall with a sweeping staircase, furniture under white sheets, old family portraits and dust ' +
      'floating in shafts of gold light. She steps inside and looks up, awestruck and uneasy. Slow dolly-in from behind.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_b9_01'],
  },
  {
    id: 'cin_ritual_enter',
    beat: 10,
    purpose: 'Elena walks down the cellar stair into the ritual chamber, where smoke curls above the great seal.',
    targetSeconds: 8,
    maxSeconds: 10,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'A cellar door opens onto a long narrow stone stair going down, cold violet light pulsing from below. A woman in a dark ' +
      'navy knit cardigan walks slowly down, seen from behind. Reveal of a circular stone ritual chamber with a great carved ' +
      'seal in the floor, faint violet runes, three arched doorways, and thin black smoke, shapeless and faceless, curling ' +
      'above the seal. She stops on the last step. Wide low angle, slow dolly forward, awe and dread, calm.',
    negativePrompt: NEGATIVE,
    // No lines: the clip has ambience only.
    voiceLines: [],
  },
  {
    id: 'seq6_two_keys',
    beat: 10,
    purpose: 'Runes ignite; the faceless smoke rises and speaks; Felix is seen asleep inside the seal light, unharmed; the two Living Keys are revealed.',
    targetSeconds: 32,
    maxSeconds: 45,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, a circular stone cellar chamber with a carved seal in the floor. Ancient runes in the floor and walls ' +
      'ignite one by one with a cold violet light. Thick black smoke, faceless and shapeless, with no eyes and no mouth, ' +
      'rises slowly from the seal in the center and coils through the air like slow ink in water. A woman in a dark ' +
      'coat with a silver locket stands at the edge of the light, frightened but holding her ground. Inside the glowing ' +
      'light above the seal, a boy of eight in a half-finished ghost costume floats asleep, peaceful, unharmed, ' +
      'surrounded by gentle light. The smoke leans toward the woman, then toward the boy, then gathers above the seal. ' +
      'Slow orbiting camera, dark palette with violet and pale gold accents, ominous but calm.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_smoke_b10_01', 'vo_smoke_b10_02', 'vo_elena_b10_01', 'vo_smoke_b10_03', 'vo_smoke_b10_04'],
  },
  {
    id: 'cin_felix_anchor',
    beat: 11,
    purpose: "Felix's third and last appearance: he stands beside the seal, encourages Elena and says each anchor loosens the evil's hold on him.",
    targetSeconds: 16,
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
    targetSeconds: 29,
    maxSeconds: 30,
    format: { aspect: '16:9', fps: 24 },
    prompt:
      'Cinematic, the stone chamber. A woman in a dark coat places both hands on the glowing seal and a river of soft ' +
      'golden light flows from a sleeping eight-year-old boy in a half-finished ghost costume into her arms. The smoke, ' +
      'faceless and shapeless, is pressed back down into the seal and the runes go calm. The boy wakes, solid and ' +
      'warm, unharmed, and she lifts him into her arms. Cut to the old front door opening on a quiet dawn street, pale ' +
      'orange sky, thin mist; the mother and son walk out together, his small hand in hers, and the door closes ' +
      'behind them. Gentle camera, bittersweet and hopeful, warm sunrise color grade.',
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
      'go out one by one. Fast tracking camera, cold desaturated colors, urgent and ominous, no violence.',
    negativePrompt: NEGATIVE,
    voiceLines: ['vo_elena_end_b1', 'vo_felix_end_b1', 'vo_smoke_end_b1', 'vo_elena_end_b2'],
  },
];

export function getVideoClip(id: string): VideoClipDef | undefined {
  return VIDEO_CLIPS.find((c) => c.id === id);
}
