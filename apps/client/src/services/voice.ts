/**
 * Voice-over playback by line ID. Plays `/assets/vo/<id>.mp3` when it exists; otherwise the line is
 * subtitle-only and `done` resolves after a timed duration. Never throws.
 */
import { getLine } from '../content/dialogue/index.ts';
import { settingsStore } from '../store/index.ts';
import { ensureAudioContext } from './audio-engine.ts';

export const VO_BASE_PATH = '/assets/vo';
export const MIN_SUBTITLE_MS = 1800;
const MS_PER_CHAR = 65;

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
  /** Linear gain 0..1; defaults to master x voice from settings. */
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
  const subtitle = text ?? getLine(id)?.text ?? '';
  const fallbackMs = fallbackDurationMs(subtitle);

  let stopped = false;
  let source: AudioBufferSourceNode | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let finish: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    finish = resolve;
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
      const gain = ctx.createGain();
      gain.gain.value = getVolume();
      gain.connect(ctx.destination);
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.onended = () => finish();
      source.start();
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
        source?.stop();
      } catch {
        // already stopped
      }
      finish();
    },
  };
}
