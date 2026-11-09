/**
 * The sound cue ids the client knows (mirrors tools/sound-cues.mjs, the generation list; a test keeps the two equal).
 * Sound effects live in /assets/audio/sfx/<id>.mp3, ambience loops in /assets/audio/amb/<id>.mp3.
 */
export const SURFACES = ['wood', 'tile', 'pavement', 'grass', 'gravel', 'stone'] as const;
export type Surface = (typeof SURFACES)[number];
export const FOOTSTEP_VARIATIONS = 3;

export const footstepCue = (surface: Surface, variation: number): string => `sfx_footsteps_${surface}_${(((variation % FOOTSTEP_VARIATIONS) + FOOTSTEP_VARIATIONS) % FOOTSTEP_VARIATIONS) + 1}`;

export const AMB_CUE_IDS = ['amb_home', 'amb_street', 'amb_garden', 'amb_house66', 'amb_lane', 'amb_grounds', 'amb_interior', 'amb_ritual'] as const;

const FOOTSTEP_CUE_IDS = SURFACES.flatMap((s) => Array.from({ length: FOOTSTEP_VARIATIONS }, (_, i) => footstepCue(s, i)));

export const SFX_CUE_IDS: readonly string[] = [
  ...FOOTSTEP_CUE_IDS,
  // world
  'sfx_door_open',
  'sfx_gate_creak',
  'sfx_veil_recede',
  'sfx_light_flicker',
  'sfx_bulb_burst',
  'sfx_drawer_open',
  'sfx_padlock_click',
  'sfx_padlock_rattle',
  'sfx_padlock_open',
  'sfx_planchette_slide',
  'sfx_fuse_snap',
  'sfx_mirror_crack',
  'sfx_anchor_restore',
  'sfx_seal_hum',
  'sfx_seal_choice_boom',
  // spells
  'sfx_spell_bolt',
  'sfx_spell_charge',
  'sfx_spell_charged_release',
  'sfx_hit',
  'sfx_spell_purify',
  'sfx_spell_purify_loop',
  'sfx_purify_done',
  'sfx_spell_ward',
  'sfx_ward_hit',
  // creatures
  'sfx_fox',
  'sfx_hound',
  'sfx_cat',
  'sfx_briggs_effort',
  'sfx_watcher_effort',
  'sfx_wraith_hiss',
  'sfx_smoke_breathing',
  'sfx_decoy_vanish',
  'sfx_teleport',
  'sfx_slam',
  'sfx_destroy',
  'sfx_purify_relief',
  'sfx_hurt',
  'sfx_stun',
  // scares
  'sfx_scare_door_slam',
  'sfx_scare_whispers',
  'sfx_scare_chandelier_sway',
  'sfx_scare_cold_breath',
  'sfx_scare_piano_note',
  'sfx_scare_shadow_pass',
  'sfx_whisper_1',
  'sfx_whisper_2',
  'sfx_whisper_3',
  'sfx_whisper_4',
  'sfx_whisper_5',
  'sfx_whisper_6',
  'sfx_footsteps_behind',
  // ui
  'sfx_ui_click',
  'sfx_locket_open',
  'sfx_locket_close',
  'sfx_hint_chime',
];

export const WHISPER_CUES: readonly string[] = SFX_CUE_IDS.filter((id) => id.startsWith('sfx_whisper_'));

/** Cues the code may use that are control signals, not files. */
export const CONTROL_CUE_IDS = ['amb_street_duck'] as const;

const SFX_SET = new Set<string>(SFX_CUE_IDS);
const AMB_SET = new Set<string>(AMB_CUE_IDS);

export const isSfxCue = (id: string): boolean => SFX_SET.has(id);
export const isAmbCue = (id: string): boolean => AMB_SET.has(id);
export const isFileCue = (id: string): boolean => SFX_SET.has(id) || AMB_SET.has(id);
export const isControlCue = (id: string): boolean => (CONTROL_CUE_IDS as readonly string[]).includes(id);

export const AUDIO_BASE_PATH = '/assets/audio';

/** Where the file for a cue is served from. */
export function cueUrl(id: string): string {
  return `${AUDIO_BASE_PATH}/${id.startsWith('amb_') ? 'amb' : 'sfx'}/${id}.mp3`;
}
