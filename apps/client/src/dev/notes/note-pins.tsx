/**
 * Playtest note pins (DEV ONLY): a small numbered marker, coloured by tag, over each spot where a note was made
 * in the scene on screen. Also measures fps for the note context. Lazy-loaded only when notes are on.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { CanvasTexture, SpriteMaterial, type Texture } from 'three';
import { useGame } from '../../store/index.ts';
import { pinsForScene, TAG_COLOR, type Note } from './note-model.ts';
import { fpsMeter, notes } from './notes-store.ts';
/** Pin height above the floor (metres): about chest height, so it is easy to spot. */
const PIN_Y = 1.1;

function pinTexture(id: number, color: string): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#111';
  g.stroke();
  g.fillStyle = '#111';
  g.font = 'bold 28px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(id), 32, 34);
  return new CanvasTexture(c);
}

function Pin({ note }: { note: Note }) {
  const material = useMemo(
    () => new SpriteMaterial({ map: pinTexture(note.id, TAG_COLOR[note.tag]), depthTest: false, transparent: true, opacity: 0.9 }),
    [note.id, note.tag],
  );
  useEffect(() => () => {
    material.map?.dispose();
    material.dispose();
  }, [material]);
  return <sprite material={material} position={[note.context.pos[0], PIN_Y, note.context.pos[2]]} scale={[0.35, 0.35, 0.35]} renderOrder={10} raycast={() => {}} />;
}

export default function NotePins() {
  const book = useSyncExternalStore(notes.subscribe, notes.get);
  const scene = useGame((s) => s.game.scene);
  useFrame((_, delta) => {
    if (delta > 0) fpsMeter.value += (1 / delta - fpsMeter.value) * 0.05;
  });
  return (
    <>
      {pinsForScene(book, scene).map((n) => (
        <Pin key={n.id} note={n} />
      ))}
    </>
  );
}
