/**
 * Which entity nodes the loaded GLB models provide. The greybox props (interactables.tsx) hide themselves for
 * every entity that has a real model node, so a missing or failed GLB falls back to the greybox automatically.
 * Node names are entity ids with dots turned into underscores (`door.home.front` -> `door_home_front`).
 */
const counts = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;

export function entityNodeName(id: string): string {
  return id.replaceAll('.', '_');
}

function bump(): void {
  version += 1;
  for (const l of listeners) l();
}

export function registerModelNodes(names: readonly string[]): () => void {
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  bump();
  return () => {
    for (const n of names) {
      const c = (counts.get(n) ?? 0) - 1;
      if (c <= 0) counts.delete(n);
      else counts.set(n, c);
    }
    bump();
  };
}

/** True when a loaded model has a mesh node for this entity id. */
export function hasModelNode(id: string): boolean {
  return counts.has(entityNodeName(id));
}

export function subscribeModelNodes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function modelNodesVersion(): number {
  return version;
}

/**
 * Furniture whose interaction ends (the drawer after the locket is taken, the pumpkin jar after the key, the drawing
 * after it is read) but whose model must stay in the room. Only the interaction hides; the model does not.
 */
export const STAY_VISIBLE_ENTITIES: ReadonlySet<string> = new Set([
  'socket.home.drawer',
  'prop.home.pumpkin_jar',
  'clue.home.drawing',
]);

/** Whether a prop model node is shown: while its entity is offered, or always for furniture that stays. */
export function propNodeVisible(id: string, offered: ReadonlySet<string>): boolean {
  return offered.has(id) || STAY_VISIBLE_ENTITIES.has(id);
}

/**
 * Kinds the scene always draws itself, so they never get a grey marker box: doors, enemies, the seal, the runes and
 * lights (a light with an E prompt, like Felix's window, is part of the house model; note 2).
 */
const NO_MARKER = ['door.', 'enemy.', 'seal.', 'rune.', 'light.'];

/** True when an entity gets a grey marker box: the scene does not draw it and no model node replaces it. */
export function needsMarker(id: string, hasNode: boolean): boolean {
  return !hasNode && !NO_MARKER.some((p) => id.startsWith(p));
}
