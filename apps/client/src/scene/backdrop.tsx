import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Color, MeshBasicMaterial } from 'three';
import type { Material, Mesh } from 'three';

/**
 * 'Shadow houses' beyond the play area (asset_creation/blender/build_backdrop.py). At that distance the scene fog would
 * hide them completely, so they skip fog and are tinted as darker shades of the current fog colour: the near row
 * darker, the far row closer to the fog. A few dim windows stay warm. Unlit, no shadows, view only.
 */
export const BACKDROP_URL = '/assets/models/backdrop.glb';
/** Silhouette shade as a fraction of the fog colour, per row. */
export const BACKDROP_SHADE = { near: 0.4, far: 0.65 } as const;
const WINDOW_COLOR = '#ffb866';

type Layer = 'near' | 'far' | 'window';

function layerOf(material: Material): Layer | null {
  if (material.name.includes('backdrop_window')) return 'window';
  if (material.name.includes('backdrop_near')) return 'near';
  if (material.name.includes('backdrop_far')) return 'far';
  return null;
}

function Inner({ fogColor, windowGlow }: { fogColor: string; windowGlow: number }) {
  const { scene } = useGLTF(BACKDROP_URL, false, true);
  const { root, mats } = useMemo(() => {
    const clone = scene.clone(true);
    const byLayer: Record<Layer, MeshBasicMaterial> = {
      near: new MeshBasicMaterial({ fog: false }),
      far: new MeshBasicMaterial({ fog: false }),
      window: new MeshBasicMaterial({ fog: false, transparent: true }),
    };
    clone.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = false;
      const swap = (src: Material): Material => {
        const layer = layerOf(src);
        return layer ? byLayer[layer] : src;
      };
      m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
    });
    return { root: clone, mats: byLayer };
  }, [scene]);

  useEffect(() => {
    const fog = new Color(fogColor);
    mats.near.color.copy(fog).multiplyScalar(BACKDROP_SHADE.near);
    mats.far.color.copy(fog).multiplyScalar(BACKDROP_SHADE.far);
    mats.window.color.set(WINDOW_COLOR);
    mats.window.opacity = Math.min(1, windowGlow);
  }, [mats, fogColor, windowGlow]);

  return <primitive object={root} />;
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.warn(`Backdrop ${BACKDROP_URL} failed to load; the horizon stays empty`, error);
  }
  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export function Backdrop({ fogColor, windowGlow }: { fogColor: string; windowGlow: number }) {
  return (
    <Boundary>
      <Suspense fallback={null}>
        <Inner fogColor={fogColor} windowGlow={windowGlow} />
      </Suspense>
    </Boundary>
  );
}
