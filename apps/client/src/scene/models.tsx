import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { Material, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { PLACEMENTS } from '../content/world/placements.ts';
import type { WorldRuntime } from '../game/world-runtime.ts';
import { entityNodeName, registerModelNodes } from './model-nodes.ts';

/** Entity kinds the greybox draws as props; their model nodes follow the runtime's visible set. */
const PROP_KINDS = new Set(['clue', 'prop', 'socket', 'pickup', 'puzzle']);
const NO_PULSE = 0;

/** node name -> entity id, for every placed entity. */
const NODE_TO_ID = new Map<string, string>(Object.keys(PLACEMENTS).map((id) => [entityNodeName(id), id]));

class Boundary extends Component<{ fallback: ReactNode; url: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.warn(`Model ${this.props.url} failed to load, using the greybox`, error);
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface ModelProps {
  url: string;
  /** Greybox shown while loading, and for good when the file is missing or broken. */
  fallback: ReactNode;
  runtime?: WorldRuntime;
  /** Node names to hide (for example `door_home_front` once its gate opens). */
  hidden?: readonly string[];
  /** Only receive shadows (for flat ground pieces). */
  receiveOnly?: boolean;
}

function Loaded({ url, runtime, hidden, receiveOnly }: Omit<ModelProps, 'fallback'>) {
  const { scene } = useGLTF(url, false, true);
  // Re-render when the runtime changes (flags, hint highlight) so props follow their entities.
  useSyncExternalStore(runtime?.subscribe ?? (() => () => {}), () => runtime?.version ?? 0);
  const entityNodes = useRef(new Map<string, { node: Object3D; id: string; mats: MeshStandardMaterial[] }>());

  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = !receiveOnly;
        m.receiveShadow = true;
      }
    });
    return clone;
  }, [scene, receiveOnly]);

  // Find the entity nodes that carry geometry; give them their own materials so the hint highlight stays local.
  const names = useMemo(() => {
    const found = new Map<string, { node: Object3D; id: string; mats: MeshStandardMaterial[] }>();
    root.traverse((o) => {
      const id = NODE_TO_ID.get(o.name);
      if (!id) return;
      const mats: MeshStandardMaterial[] = [];
      let hasMesh = false;
      o.traverse((c) => {
        const m = c as Mesh;
        if (!m.isMesh) return;
        hasMesh = true;
        const own = (Array.isArray(m.material) ? m.material : [m.material]).map((x: Material) => x.clone());
        m.material = Array.isArray(m.material) ? own : own[0]!;
        for (const x of own) mats.push(x as MeshStandardMaterial);
      });
      if (hasMesh) found.set(o.name, { node: o, id, mats });
    });
    entityNodes.current = found;
    return [...found.keys()];
  }, [root]);

  useEffect(() => registerModelNodes(names), [names]);

  const visible = new Set(runtime?.visibleEntities().map((e) => e.id as string));
  const highlighted = new Set(runtime?.visibleEntities().filter((e) => e.highlighted).map((e) => e.id as string));
  const hiddenSet = new Set(hidden);
  for (const [name, entry] of entityNodes.current) {
    const kind = entry.id.split('.')[0] ?? '';
    if (hiddenSet.has(name)) entry.node.visible = false;
    else if (PROP_KINDS.has(kind) && runtime) entry.node.visible = visible.has(entry.id);
    else entry.node.visible = true;
  }

  useFrame(({ clock }) => {
    for (const entry of entityNodes.current.values()) {
      const on = highlighted.has(entry.id) && entry.node.visible;
      const k = on ? 0.5 + Math.sin(clock.elapsedTime * 2) * 0.25 : NO_PULSE;
      for (const m of entry.mats) {
        m.emissive.set('#ffd27a');
        m.emissiveIntensity = k;
      }
    }
  });

  return <primitive object={root} />;
}

/** A GLB scene with graceful fallback: Suspense while loading, the greybox if it fails. */
export function Model({ fallback, ...rest }: ModelProps) {
  return (
    <Boundary fallback={fallback} url={rest.url}>
      <Suspense fallback={fallback}>
        <Loaded {...rest} />
      </Suspense>
    </Boundary>
  );
}
