/**
 * Voice-over playback by line ID. Plays `/assets/audio/vo/<id>.mp3` when it exists; otherwise the line is
 * subtitle-only and `done` resolves after a timed duration. Never throws.
 */
import { getLine } from '../content/dialogue/index.ts';
import { settingsStore } from '../store/index.ts';
import { audioEngine, ensureAudioContext, getBuses, VOICE_DUCK_LEVEL } from './audio-engine.ts';

export const VO_BASE_PATH = '/assets/audio/vo';
export const MIN_SUBTITLE_MS = 1800;
const MS_PER_CHAR = 65;
/** Every voice line fades in and out over this long (author: 0.25 s). */
export const VOICE_FADE_S = 0.25;

export function voiceUrl(id: string): string {
  return `${VO_BASE_PATH}/${id}.mp3`;
}

/** How long a subtitle-only line stays up: reading speed, with a floor. */
export function fallbackDurationMs(text: string): number {
  return Math.max(MIN_SUBTITLE_MS, Math.round(text.length * MS_PER_CHAR));
}

export interface VoicePlayback {
  /** True when an audio file is playing; false for subtitle-only. Settles before `done`. */
  readonly started: Promise<boolean>;
  /** Resolves when the line ends (audio finished, or the timed fallback elapsed), or after `stop`. */
  readonly done: Promise<void>;
  stop(): void;
}

export interface VoiceDeps {
  fetchFn?: typeof fetch;
  getContext?: () => AudioContext | null;
  /** Linear gain 0..1 when there is no mixer (a custom context); the default path uses the voice bus. */
  getVolume?: () => number;
}

function settingsVolume(): number {
  const v = settingsStore.getState().volume;
  return Math.min(1, Math.max(0, v.master * v.voice));
}

export function playVoiceLine(id: string, text?: string, deps: VoiceDeps = {}): VoicePlayback {
  const fetchFn = deps.fetchFn ?? (typeof fetch === 'function' ? fetch : undefined);
  const getContext = deps.getContext ?? ensureAudioContext;
  const getVolume = deps.getVolume ?? settingsVolume;
  const custom = deps.getContext !== undefined; // a test context has no mixer: play straight to its destination
  const subtitle = text ?? getLine(id)?.text ?? '';
  const fallbackMs = fallbackDurationMs(subtitle);

  let stopped = false;
  let source: AudioBufferSourceNode | null = null;
  let fadeOut: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let finish: () => void = () => undefined;
  // The ambience sits lower while a line is spoken.
  let ducked = false;
  const unduck = () => {
    if (!ducked) return;
    ducked = false;
    audioEngine.duck('voice', null);
  };
  const done = new Promise<void>((resolve) => {
    finish = () => {
      unduck();
      resolve();
    };
  });

  const waitFallback = () => {
    if (stopped) return finish();
    timer = setTimeout(finish, fallbackMs);
  };

  const started = (async (): Promise<boolean> => {
    try {
      const ctx = getContext();
      if (!ctx || !fetchFn) {
        waitFallback();
        return false;
      }
      const res = await fetchFn(voiceUrl(id));
      const type = res.headers?.get('content-type') ?? '';
      // Dev servers answer unknown paths with index.html, so check the type as well as the status.
      if (!res.ok || type.includes('text/html')) {
        waitFallback();
        return false;
      }
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      if (stopped) {
        finish();
        return false;
      }
      const buses = custom ? null : getBuses(ctx);
      const gain = ctx.createGain();
      const level = buses ? 1 : getVolume();
      // Fade in and out so lines never start or end with a click.
      const t0 = ctx.currentTime;
      const fade = Math.min(VOICE_FADE_S, buffer.duration / 2);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(level, t0 + fade);
      gain.gain.setValueAtTime(level, t0 + buffer.duration - fade);
      gain.gain.linearRampToValueAtTime(0, t0 + buffer.duration);
      gain.connect(buses?.voice ?? ctx.destination);
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.onended = () => finish();
      source.start(t0);
      fadeOut = () => {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + VOICE_FADE_S);
        source?.stop(now + VOICE_FADE_S);
      };
      if (buses) {
        ducked = true;
        audioEngine.duck('voice', VOICE_DUCK_LEVEL);
      }
      return true;
    } catch {
      waitFallback();
      return false;
    }
  })();

  return {
    started,
    done,
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      try {
        // A line cut short fades out instead of stopping dead.
        if (fadeOut) fadeOut();
        else source?.stop();
      } catch {
        // already stopped
      }
      finish();
    },
  };
}
