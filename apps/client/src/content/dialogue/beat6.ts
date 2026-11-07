import type { DialogueLine } from './types.ts';

/** Beat 6: House 66 and the Watcher (script/act2-3.md), plus the P2 fuse hint (docs/puzzles.md). */
export const BEAT6_LINES: readonly DialogueLine[] = [
  { id: 'vo_elena_b6_01', speaker: 'Elena', text: 'Empty. He really did take them all.' },
  { id: 'vo_elena_b6_02', speaker: 'Elena', text: "Let's see you, then." },
  { id: 'vo_watcher_b6_01', speaker: 'Watcher', text: 'Felix. Felix went by. Little feet, little lantern. I watched.' },
  { id: 'vo_watcher_b6_02', speaker: 'Watcher', text: 'I watch for it. I watch for it. Sixty years I watch.' },
  { id: 'vo_watcher_b6_03', speaker: 'Watcher', text: 'Fe-lix.' },
  { id: 'vo_watcher_b6_04', speaker: 'Watcher', text: "Mother of Felix. It's waiting for you." },
  { id: 'vo_watcher_b6_05', speaker: 'Watcher', text: 'Let me watch. Let me watch!' },
  {
    id: 'vo_angel_b6_01',
    speaker: 'Angel',
    text: 'The watcher, unwatched at last. Mercy or ending, Elena. The key falls either way.',
  },
  {
    id: 'vo_watcher_b6_06',
    speaker: 'Watcher',
    text: 'I was meant to watch the house. Somewhere along the way I started watching for it. The key. Go.',
    placeholder: true, // lore line pending author approval (script/act2-3.md)
  },
  { id: 'vo_elena_b6_03', speaker: 'Elena', text: 'Rest now.' },
  { id: 'vo_elena_b6_04', speaker: 'Elena', text: 'The lane gate.' },
  // P2 hint (docs/puzzles.md gives the text, the script table has no line id).
  {
    id: 'vo_angel_b6_hint1',
    speaker: 'Angel',
    text: 'Your neighbour with the garish lights, perhaps?',
    placeholder: true,
  },
];
