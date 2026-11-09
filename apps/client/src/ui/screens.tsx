import type { Mode } from '@tlh/shared';
import { useMemo, useState } from 'react';
import { applyDevStart, isDevStart } from '../game/dev-start.ts';
import { ENDING_TEXT, type EndingChoice } from '../game/ending.ts';
import { ensureAudioContext } from '../services/audio-engine.ts';
import { FOV_MAX, FOV_MIN } from '../store/settings-store.ts';
import { applySave, canContinue, needsOverwriteConfirm, saveNotice } from '../game/save.ts';
import { gameStore, saveStorage, settingsStore, useSettings } from '../store/index.ts';

/** Full-screen menu screens: warning, main menu, new game, settings, credits. */

export function WarningScreen() {
  return (
    <main className="screen" data-testid="warning-screen">
      <h1>Before you play</h1>
      <p>
        This game contains flashing lights, sudden sounds and horror themes: a missing child and supernatural
        threat. There is no gore.
      </p>
      <p>Headphones are recommended. Subtitles are always on.</p>
      <p>Reduce flashing will be switched on for you. You can change it in Settings.</p>
      <button
        type="button"
        onClick={() => {
          ensureAudioContext();
          settingsStore.getState().updateSettings({ warningAcknowledged: true });
          gameStore.getState().setPhase('menu');
        }}
      >
        Continue
      </button>
    </main>
  );
}

export type MenuView = 'main' | 'new_game' | 'settings' | 'credits';

export function MainMenu({ onView }: { onView: (view: MenuView) => void }) {
  const saved = useMemo(() => saveStorage.load(), []);
  const notice = saveNotice(saved);
  const resume = () => {
    if (saved.status !== 'ok') return;
    applySave(gameStore, saved.save); // sets phase 'paused'; the game view asks for pointer lock
  };
  return (
    <main className="screen" data-testid="main-menu">
      <h1>The Last House on Maple Street</h1>
      {notice && (
        <p className="note" role="alert" data-testid="save-notice">
          {notice}
        </p>
      )}
      <nav className="menu-list" aria-label="Main menu">
        {canContinue(saved) && (
          <button type="button" onClick={resume}>
            Continue
          </button>
        )}
        <button type="button" onClick={() => onView('new_game')}>
          New Game
        </button>
        <button type="button" onClick={() => onView('settings')}>
          Settings
        </button>
        <button type="button" onClick={() => onView('credits')}>
          Credits
        </button>
      </nav>
    </main>
  );
}

export function NewGameScreen({ onBack }: { onBack: () => void }) {
  const existing = useMemo(() => saveStorage.load(), []);
  const [confirmed, setConfirmed] = useState(!needsOverwriteConfirm(existing));
  const start = (mode: Mode) => {
    const g = gameStore.getState();
    g.startNewGame(mode);
    // Developer test shortcut (dev builds only): ?start=street or ?start=garden.
    const devStart = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('start') : null;
    if (isDevStart(devStart)) applyDevStart(gameStore, devStart);
    g.setPhase('paused'); // the game view asks for pointer lock; the first click resumes
  };
  if (!confirmed) {
    return (
      <main className="screen" data-testid="new-game-confirm">
        <h1>New Game</h1>
        <p>Starting a new game will overwrite your saved progress. This cannot be undone.</p>
        <button type="button" onClick={() => setConfirmed(true)}>
          Overwrite and continue
        </button>
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
      </main>
    );
  }
  return (
    <main className="screen" data-testid="new-game-screen">
      <h1>New Game</h1>
      <button type="button" onClick={() => start('classic')}>
        Classic Story Mode
      </button>
      <p className="note">The fully authored story. No network, no AI.</p>
      <button type="button" disabled aria-describedby="ai-note">
        AI-Enhanced Mode
      </button>
      <p className="note" id="ai-note">
        Not available yet. It arrives with the Angel chat.
      </p>
      <button type="button" className="secondary" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const s = useSettings((x) => x);
  const [confirmReset, setConfirmReset] = useState(false);
  const update = settingsStore.getState().updateSettings;
  const slider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void) => (
    <label className="row">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );
  return (
    <main className="screen" data-testid="settings-screen">
      <h1>Settings</h1>
      {slider('Master volume', s.volume.master, 0, 1, 0.05, (v) => update({ volume: { master: v } }))}
      {slider('Music', s.volume.music, 0, 1, 0.05, (v) => update({ volume: { music: v } }))}
      {slider('Effects', s.volume.sfx, 0, 1, 0.05, (v) => update({ volume: { sfx: v } }))}
      {slider('Ambience', s.volume.ambience, 0, 1, 0.05, (v) => update({ volume: { ambience: v } }))}
      {slider('Voice', s.volume.voice, 0, 1, 0.05, (v) => update({ volume: { voice: v } }))}
      {slider('Mouse sensitivity', s.mouseSensitivity, 0.2, 3, 0.1, (v) => update({ mouseSensitivity: v }))}
      {slider('Field of view', s.fieldOfView, FOV_MIN, FOV_MAX, 1, (v) => update({ fieldOfView: v }))}
      <label className="row">
        <input type="checkbox" checked={s.invertY} onChange={(e) => update({ invertY: e.target.checked })} />
        Invert Y
      </label>
      <label className="row">
        <input type="checkbox" checked={s.reduceFlashing} onChange={(e) => update({ reduceFlashing: e.target.checked })} />
        Reduce flashing
      </label>
      <label className="row">
        <input type="checkbox" checked={s.headBob} onChange={(e) => update({ headBob: e.target.checked })} />
        Head bob
      </label>
      <label className="row">
        <input type="checkbox" checked={s.showPosition} onChange={(e) => update({ showPosition: e.target.checked })} />
        Show position (testing)
      </label>
      <label className="row">
        Scene brightness
        <select value={s.testBrightness} onChange={(e) => update({ testBrightness: e.target.value as typeof s.testBrightness })}>
          <option value="bright">Bright (testing)</option>
          <option value="normal">Normal (dark)</option>
        </select>
      </label>
      <label className="row">
        Highlight interactive things
        <select value={s.interactGlow} onChange={(e) => update({ interactGlow: e.target.value as typeof s.interactGlow })}>
          <option value="bright">Bright (testing)</option>
          <option value="subtle">Subtle</option>
          <option value="off">Off</option>
        </select>
      </label>
      <label className="row">
        Graphics
        <select value={s.graphicsPreset} onChange={(e) => update({ graphicsPreset: e.target.value as typeof s.graphicsPreset })}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="row">
        Subtitles
        <select value={s.subtitleSize} onChange={(e) => update({ subtitleSize: e.target.value as typeof s.subtitleSize })}>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
        </select>
      </label>
      {confirmReset ? (
        <p>
          Erase saved progress?{' '}
          <button
            type="button"
            onClick={() => {
              saveStorage.clear();
              setConfirmReset(false);
            }}
          >
            Erase
          </button>{' '}
          <button type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
        </p>
      ) : (
        <button type="button" className="secondary" onClick={() => setConfirmReset(true)}>
          Reset progress
        </button>
      )}
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

/** `ending` is set when the credits follow an ending: the end card shows and Back returns to the main menu. */
export function CreditsScreen({ onBack, ending = null }: { onBack: () => void; ending?: EndingChoice | null }) {
  const card = ending ? ENDING_TEXT.endCards[ending] : null;
  return (
    <main className="screen" data-testid="credits-screen">
      {card && (
        <section data-testid="end-card" aria-label="The ending">
          <h2>{card.title}</h2>
          <p>{card.text}</p>
        </section>
      )}
      <h1>Credits</h1>
      <p>The Last House on Maple Street. A Kiroween 2026 entry.</p>
      <button type="button" onClick={onBack}>
        {ending ? 'Main menu' : 'Back'}
      </button>
    </main>
  );
}
