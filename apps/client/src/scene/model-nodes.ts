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
