/**
 * WebAudio entry point. The AudioContext is created only after the first user click
 * (the warning screen's Continue), so browsers never block it. Mixing arrives with the audio tasks.
 */
let context: AudioContext | null = null;

export function ensureAudioContext(): AudioContext | null {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return context;
  }
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

export function audioReady(): boolean {
  return context !== null;
}
