// The sound cue list: every sound effect and ambience loop the game plays from a file.
// Read by tools/gen-sound.mjs (generation) and by the client tests (ids, files, size, code usage).
// Rules for the prompts: American English, no music, no voices, no gore, nothing loud or screaming.
// Atmosphere over jump scares (.kiro/steering/canon.md): the scares are soft and eerie.

/**
 * @typedef {'sfx' | 'amb'} CueBus  sfx = short effect (mp3_44100_64, mono is enough); amb = ambience loop (mp3_44100_128)
 * @typedef {{ id: string, prompt: string, seconds: number, loop: boolean, bus: CueBus, influence?: number }} SoundCue
 */

const MIN_SECONDS = 0.5; // ElevenLabs minimum
const MAX_SECONDS = 30; // ElevenLabs maximum

/** @returns {SoundCue} */
const sfx = (id, seconds, prompt, extra = {}) => ({ id, prompt, seconds, loop: false, bus: 'sfx', ...extra });
/** @returns {SoundCue} */
const amb = (id, prompt) => ({ id, prompt: `${prompt} Seamless loop, steady, no music, no voices, no sudden loud events.`, seconds: 30, loop: true, bus: 'amb', influence: 0.35 });

const STEP_NOTE = 'One single footstep of an adult in soft shoes, close microphone, dry, no music, no voice';

const FOOTSTEP_SURFACES = {
  wood: 'on old wooden floorboards, a faint creak',
  tile: 'on hard ceramic kitchen tile, a small click and echo',
  pavement: 'on a concrete sidewalk at night',
  grass: 'on damp grass, soft and muffled',
  gravel: 'on loose gravel and dirt, a crunch',
  stone: 'on a cold stone cellar floor, a dull echo',
};

/** @type {SoundCue[]} */
const footsteps = Object.entries(FOOTSTEP_SURFACES).flatMap(([surface, text]) =>
  [1, 2, 3].map((n) => sfx(`sfx_footsteps_${surface}_${n}`, 0.8, `${STEP_NOTE}, ${text}. Variation ${n}.`)),
);

/** @type {SoundCue[]} */
export const SOUND_CUES = [
  // ---- Ambience: one 30 s loop per zone (hideout shares the street loop) ----
  amb('amb_home', 'Quiet suburban house interior at night: a slow wall clock ticking, a refrigerator hum, faint wind at the windows.'),
  amb('amb_street', 'A quiet suburban street on a cold autumn night: low wind, distant nothing, a faint streetlight electrical hum, dry leaves moving.'),
  amb('amb_garden', 'An overgrown garden at night: leaves rustling, soft wind in hedges, a few crickets, a faint creaking branch.'),
  amb('amb_house66', 'Outside an old abandoned house at night: slow wooden creaks, a loose shutter tapping gently, low wind, a distant dripping.'),
  amb('amb_lane', 'A narrow back lane at night: insects, an occasional gravel shuffle in the wind, dry weeds, distant owl hoot.'),
  amb('amb_grounds', 'Wide old grounds around a large house at night: crows in the distance, steady wind through bare trees, a distant gate creaking.'),
  amb('amb_interior', 'Inside a big old empty house at night: the building settling, faint beams groaning, low air draft, a distant slow drip, hollow rooms.'),
  amb('amb_ritual', 'A low deep ominous drone in an underground stone chamber: slowly pulsing sub bass, faint resonant hum, cold air. Not music, no melody.'),

  // ---- Footsteps: 6 surfaces x 3 variations ----
  ...footsteps,

  // ---- World ----
  sfx('sfx_door_open', 2, 'A heavy old wooden door slowly opening with a long low creak, then a soft thud against the wall.'),
  sfx('sfx_gate_creak', 2.5, 'A rusty iron garden gate swinging open with a long drawn creak and a small metallic clank.'),
  sfx('sfx_veil_recede', 3, 'A soft magical shimmer as a veil of dark mist pulls away, airy whoosh with faint glassy sparkles dissolving.'),
  sfx('sfx_light_flicker', 1.5, 'An old street light flickering: electrical buzz stuttering on and off, a few quick clicks of a failing bulb.'),
  sfx('sfx_bulb_burst', 1, 'A single light bulb bursting with a short pop and a few tiny glass pieces tinkling. Not too loud.'),
  sfx('sfx_drawer_open', 1.2, 'An old wooden drawer sliding open with a dry scrape and a small rattle of papers inside.'),
  sfx('sfx_padlock_click', 0.5, 'One small crisp click of a brass combination padlock dial turning one notch.'),
  sfx('sfx_padlock_rattle', 1.2, 'A heavy padlock rattling against a metal hasp as it is tugged, a short metallic jangle.'),
  sfx('sfx_padlock_open', 1, 'A brass padlock shackle popping open with a solid click and a soft metallic slide.'),
  sfx('sfx_planchette_slide', 1.5, 'A wooden planchette sliding slowly across a polished wooden board, a smooth dry scrape with a faint knock at the end.'),
  sfx('sfx_fuse_snap', 0.8, 'A ceramic fuse snapping into a metal fuse box with a firm click, a short electric hum starting right after.'),
  sfx('sfx_mirror_crack', 2, 'An old glass mirror cracking: a sharp spreading crackle with a few small glass ticks, a faint resonant ring. Not a smash.'),
  sfx('sfx_anchor_restore', 3, 'A warm magical resonance as a magic anchor is restored: a soft rising chime swell with a gentle low pulse and a bright shimmer that settles.'),
  sfx('sfx_seal_hum', 5, 'A deep mystical seal humming to life: a low resonant drone with slow pulsing sub bass and faint ringing overtones. Not music.'),
  sfx('sfx_seal_choice_boom', 3, 'A single deep heavy boom with a long low reverberating tail, like a great stone door closing far below ground. Not violent.'),

  // ---- Spells ----
  sfx('sfx_spell_bolt', 0.8, 'A short magic bolt cast: a quick bright whoosh with a crackling spark trail, then it flies away.'),
  sfx('sfx_spell_charge', 2, 'Magic energy charging up in a loop: a rising shimmering hum with gentle crackle, steady, no music.', { loop: true }),
  sfx('sfx_spell_charged_release', 1.2, 'A strong charged magic bolt released: a deep whoomp followed by a bright searing whoosh and a lingering sparkle.'),
  sfx('sfx_hit', 0.7, 'A magic bolt impact on a dark creature: a dull thump with a burst of crackling energy and a soft smoky puff.'),
  sfx('sfx_spell_purify', 1.5, 'A gentle purifying light spell cast: a soft breathy whoosh with warm glassy sparkles rising.'),
  sfx('sfx_spell_purify_loop', 3, 'A calm purifying light channeled in a loop: a soft warm shimmering hum with tiny rising bell-like sparkles, steady.', { loop: true }),
  sfx('sfx_purify_done', 2, 'A purification completing: a warm bright swell with a clear rising chime and a gentle sparkling release.'),
  sfx('sfx_spell_ward', 1.2, 'A magical ward shield rising: a smooth airy hum blooming outward with a soft glassy shimmer.'),
  sfx('sfx_ward_hit', 0.8, 'A magical shield absorbing a blow: a glassy thud with a short bright ring and a ripple of shimmer.'),

  // ---- Creatures (victims of the smoke: eerie, never gory) ----
  sfx('sfx_fox', 1.5, 'A fox yelping and snarling in a hoarse unsettling way, short and wild, a little distorted by echo.'),
  sfx('sfx_hound', 2, 'A large dog growling low and menacing, then a short throaty bark. No whimpering, no gore.'),
  sfx('sfx_cat', 1.5, 'A cat letting out a long eerie drawn-out yowl, hissing slightly, slightly unnatural.'),
  sfx('sfx_briggs_effort', 1, 'An older man making a strained, heavy effortful grunt as he swings his arm. No words.'),
  sfx('sfx_watcher_effort', 1, 'A tall man making a low rasping effort breath and grunt as he lunges. No words.'),
  sfx('sfx_wraith_hiss', 1.5, 'A hissing, whispery rasp of dark smoke taking a shape, airy and sinister, no words.'),
  sfx('sfx_smoke_breathing', 3, 'Slow heavy breathing of a formless dark smoke: a deep airy exhale and inhale, hollow and sinister, no words.'),
  sfx('sfx_decoy_vanish', 1.2, 'A shadowy decoy figure vanishing: a quick airy whoosh dissolving into faint whispery crackle.'),
  sfx('sfx_teleport', 1, 'A dark magical teleport: a quick sucking whoosh and a low pop with a swirl of airy smoke.'),
  sfx('sfx_slam', 1, 'A heavy ground slam: a deep thud with a rumbling low boom and a short burst of dust and debris. Not extremely loud.'),
  sfx('sfx_destroy', 1.5, 'A dark creature dissolving into smoke: a crumbling airy hiss with a fading dull rumble.'),
  sfx('sfx_purify_relief', 2, 'A soft relieved chime: gentle high bells with a warm sigh-like air swell, peaceful and gentle.'),
  sfx('sfx_hurt', 0.8, 'A short breathy gasp of an adult woman being struck, with a dull body thud. Brief and not graphic.'),
  sfx('sfx_stun', 0.8, 'A dizzy ringing sound that fades: a high thin ring with a wobbling low pulse.'),

  // ---- Scares (soft, eerie, quiet; never loud screams, no child in pain) ----
  sfx('sfx_scare_door_slam', 1.5, 'A heavy door closing with a dull boom somewhere far away in a large house, muffled and distant, not startling.'),
  sfx('sfx_scare_whispers', 3, 'Many soft indistinct whispers crawling past close to the ear, airy and quiet, no clear words.'),
  sfx('sfx_scare_chandelier_sway', 3, 'A crystal chandelier swaying slowly: a delicate tinkling of glass pendants and a faint chain creak.'),
  sfx('sfx_scare_cold_breath', 2.5, 'A slow cold exhale of air passing by, a soft hollow breath with a faint chill shimmer. No voice.'),
  sfx('sfx_scare_piano_note', 4, 'A single soft piano note played in an empty room, slightly out of tune, with a long fading echo.'),
  sfx('sfx_scare_shadow_pass', 2.5, 'A soft cloth-like whoosh of something drifting past behind you, with a faint low rumble. Quiet and subtle.'),
  ...[
    'A single quiet whisper of a breathy hoarse voice saying nothing clear, very close, soft and eerie.',
    'A faint raspy whisper trailing off into air, as if from another room. Unintelligible.',
    'Two soft overlapping whispers that fade out slowly, airy and quiet, unintelligible.',
    'A low breathy whispering murmur that rises slightly and falls, unintelligible and quiet.',
    'A hushed hissing whisper moving from left to right, unintelligible, quiet.',
    'A very soft exhaled whisper with faint echo, ghostly and gentle, unintelligible.',
  ].map((text, i) => sfx(`sfx_whisper_${i + 1}`, 2.5, text)),
  sfx('sfx_footsteps_behind', 3.5, 'Three slow soft footsteps on a wooden floor behind you, heavy and deliberate, spaced about one second apart, muffled and quiet.'),

  // ---- UI ----
  sfx('sfx_ui_click', 0.5, 'A soft subtle menu click, like a small wooden tick. Very short and quiet.'),
  sfx('sfx_locket_open', 1, 'A small silver locket clicking open with a tiny hinge click and a soft shimmer of magic.'),
  sfx('sfx_locket_close', 1, 'A small silver locket snapping shut with a gentle click and a tiny fading shimmer.'),
  sfx('sfx_hint_chime', 1.5, 'A soft glassy chime of two gentle notes, a quiet helpful magical hint. Not music.'),
];

/**
 * Cues the code uses that are control signals, not files: the engine reacts to them instead of playing a sound.
 * amb_street_duck (a horror sequence) lowers the ambience for a few seconds.
 */
export const CONTROL_CUES = ['amb_street_duck'];

export const CREDITS_PER_SECOND = 40;
export { MIN_SECONDS, MAX_SECONDS };

/** Folder under audio/ for a cue: ambience loops go to amb, everything else to sfx. */
export const cueFolder = (cue) => (cue.bus === 'amb' ? 'amb' : 'sfx');
