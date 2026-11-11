import { useFrame } from '@react-three/fiber';
import { forwardRef, useMemo, useRef } from 'react';
import { AdditiveBlending, CanvasTexture, NormalBlending, SRGBColorSpace } from 'three';
import type { BufferAttribute, Points, SpriteMaterial } from 'three';
import { useSettings } from '../store/index.ts';
import { MIST_COUNT, mistPuffs } from './mist-layout.ts';

/**
 * Exterior atmosphere (mood target: asset_creation/blender/prev_pov_*.png, EEVEE volumetric renders):
 * drifting ground-mist puffs and soft halos around lamps. The scene's exp2 fog does the distance haze.
 * Textures are drawn on a canvas at runtime, so there are no files to ship.
 */

let mistTexture: CanvasTexture | null = null;
let glowTexture: CanvasTexture | null = null;

/** Soft cloud: a few overlapping radial blobs on transparent black. */
function getMistTexture(): CanvasTexture {
  if (mistTexture) return mistTexture;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const blobs: [number, number, number, number][] = [
    [0.5, 0.52, 0.42, 0.55], [0.36, 0.45, 0.26, 0.4], [0.64, 0.56, 0.28, 0.4], [0.5, 0.38, 0.22, 0.3], [0.45, 0.62, 0.2, 0.3],
  ];
  for (const [x, y, r, a] of blobs) {
    const grad = g.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  mistTexture = new CanvasTexture(c);
  mistTexture.colorSpace = SRGBColorSpace;
  return mistTexture;
}

/** Radial glow for lamp halos. */
export function getGlowTexture(): CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowTexture = new CanvasTexture(c);
  glowTexture.colorSpace = SRGBColorSpace;
  return glowTexture;
}

const WANDER = 1.0; // metres; less than the layout's clearance so puffs never drift indoors
const PUFF_SIZE = 7;

/** Ground mist: seeded puffs (scene/mist-layout.ts) that wander slowly around their spots. */
export function GroundMist({ opacity, color }: { opacity: number; color: string }) {
  const preset = useSettings((s) => s.graphicsPreset);
  const points = useRef<Points>(null);
  const { base, positions, phase } = useMemo(() => {
    const puffs = mistPuffs(MIST_COUNT[preset]);
    const b = new Float32Array(puffs.length * 3);
    puffs.forEach((p, i) => b.set([p.x, p.y, p.z], i * 3));
    const ph = new Float32Array(puffs.length);
    for (let i = 0; i < ph.length; i++) ph[i] = (i * 2.399) % (Math.PI * 2);
    return { base: b, positions: b.slice(), phase: ph };
  }, [preset]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.12;
    const attr = points.current?.geometry.getAttribute('position') as BufferAttribute | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < phase.length; i++) {
      const p = phase[i]!;
      arr[i * 3] = base[i * 3]! + Math.sin(t + p) * WANDER;
      arr[i * 3 + 1] = base[i * 3 + 1]! + Math.sin(t * 1.7 + p * 2) * 0.12;
      arr[i * 3 + 2] = base[i * 3 + 2]! + Math.cos(t * 0.8 + p) * WANDER;
    }
    attr.needsUpdate = true;
  });

  if (opacity <= 0) return null;
  return (
    <points ref={points} frustumCulled={false} renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={getMistTexture()}
        color={color}
        size={PUFF_SIZE}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={NormalBlending}
        fog
      />
    </points>
  );
}

/** Soft halo sprite around a lamp. Pass a ref to drive its opacity (flicker, off). */
export const Halo = forwardRef<SpriteMaterial, { position: [number, number, number]; size?: number; color?: string; opacity: number }>(
  function Halo({ position, size = 2.6, color = '#ffb35c', opacity }, ref) {
    return (
      <sprite position={position} scale={[size, size, size]} renderOrder={3}>
        <spriteMaterial
          ref={ref}
          map={getGlowTexture()}
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={AdditiveBlending}
          fog
        />
      </sprite>
    );
  },
);
