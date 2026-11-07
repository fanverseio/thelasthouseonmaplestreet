import { useEffect, useState } from 'react';
import { useGame, gameStore, settingsStore } from './store/index.ts';
import { BootCheck } from './ui/boot-check.tsx';
import { GameView } from './ui/game-view.tsx';
import { CreditsScreen, MainMenu, NewGameScreen, SettingsScreen, WarningScreen, type MenuView } from './ui/screens.tsx';

const IN_GAME = new Set(['playing', 'paused', 'locket', 'overlay', 'sequence']);

/** Routes by game phase: boot -> warning -> menu -> game. `?bootcheck` shows the developer check page. */
export function App() {
  const phase = useGame((s) => s.game.phase);
  const [view, setView] = useState<MenuView>('main');
  const developerPage = new URLSearchParams(window.location.search).has('bootcheck');

  useEffect(() => {
    if (phase !== 'boot') return;
    const next = settingsStore.getState().warningAcknowledged ? 'menu' : 'warning';
    gameStore.getState().setPhase(next);
  }, [phase]);

  useEffect(() => {
    if (IN_GAME.has(phase)) setView('main'); // returning from a game lands on the main menu
  }, [phase]);

  if (developerPage) return <BootCheck />;
  if (IN_GAME.has(phase)) return <GameView />;
  if (phase === 'warning') return <WarningScreen />;
  if (phase === 'menu') {
    if (view === 'new_game') return <NewGameScreen onBack={() => setView('main')} />;
    if (view === 'settings') return <SettingsScreen onBack={() => setView('main')} />;
    if (view === 'credits') return <CreditsScreen onBack={() => setView('main')} />;
    return <MainMenu onView={setView} />;
  }
  return null;
}
