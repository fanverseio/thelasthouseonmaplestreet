/** Which on-screen panel shows a spoken line: the Angel's own panel, or the normal bottom-centre subtitles. */
export type SpeechPanel = 'angel' | 'subtitles';

export const ANGEL_SPEAKER = 'Angel';

export function panelFor(speaker: string): SpeechPanel {
  return speaker === ANGEL_SPEAKER ? 'angel' : 'subtitles';
}

export interface SpeechLine {
  speaker: string;
  text: string;
}

/** Splits the runtime's current line between the two panels (at most one of them is non-null). */
export function routeLine<T extends SpeechLine>(line: T | null): { angel: T | null; subtitle: T | null } {
  if (!line) return { angel: null, subtitle: null };
  return panelFor(line.speaker) === 'angel' ? { angel: line, subtitle: null } : { angel: null, subtitle: line };
}
