import { useState } from 'react';
import { BootCheck } from './ui/boot-check.tsx';
import { GameView } from './ui/game-view.tsx';

/**
 * Temporary shell: boot check, plus a button into the greybox. The warning screen and the real
 * menus replace this in tasks.md task 2.9.
 */
export function App() {
  const [playing, setPlaying] = useState(false);
  if (playing) return <GameView />;
  return (
    <>
      <BootCheck />
      <button type="button" className="greybox-start" onClick={() => setPlaying(true)}>
        Walk the greybox
      </button>
    </>
  );
}
