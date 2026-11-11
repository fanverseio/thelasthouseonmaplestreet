import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type MutableRefObject, type ReactNode } from 'react';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { BOXES } from '../content/world/exterior-layout.ts';

/**
 * Street houses and props from shared kits (asset_creation/blender/build_house_kit.py, build_props.py).
 * House variants face +Z (south) in the GLB; each instance gets a position and a Y rotation. Footprints match the greybox
 * boxes in exterior-layout.ts, so colliders stay valid. While loading, or if a GLB fails, the greybox boxes are drawn.
 */
export const KIT_URL = '/assets/models/house_kit.glb';
export const PROPS_URL = '/assets/models/props.glb';

export interface KitHouse {
  /** The greybox box this house replaces (exterior-layout.ts). */
  boxId: string;
  variant: 'a' | 'b' | 'c' | 'd';
  x: number;
  z: number;
  /** 0 = front faces south (+Z), PI = front faces north (-Z, the south arc), -PI/2 = front faces west (-X, No. 31). */
  rotY: number;
}

export const KIT_HOUSES: readonly KitHouse[] = [
  { boxId: 'house.south_a', variant: 'a', x: 5, z: 41, rotY: Math.PI }, // No. 14: the upper middle window is prop.street.window_14
  { boxId: 'house.south_b', variant: 'b', x: 30, z: 41, rotY: Math.PI },
  { boxId: 'house.north_a', variant: 'b', x: 20, z: -41, rotY: 0 },
  { boxId: 'house.no40', variant: 'c', x: 50, z: -41, rotY: 0 },
  { boxId: 'house.no31', variant: 'd', x: 66, z: 2, rotY: -Math.PI / 2 }, // Mr Briggs; garage and yard are house_31.glb
];
export const KIT_BOX_IDS: ReadonlySet<string> = new Set(KIT_HOUSES.map((h) => h.boxId));

class Boundary extends Component<{ fallback: ReactNode; label: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.warn(`${this.props.label} failed to load; using the greybox`, error);
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GreyHouses() {
  return (
    <>
      {BOXES.filter((b) => KIT_BOX_IDS.has(b.id)).map((b) => (
        <mesh key={b.id} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

function HousesInner() {
  const { scene } = useGLTF(KIT_URL, false, true);
  const clones = useMemo(
    () =>
      KIT_HOUSES.map((h) => {
        const src = scene.getObjectByName(`kit_house_${h.variant}`);
        if (!src) return null;
        const c = src.clone(true);
        c.position.set(h.x, 0, h.z);
        c.rotation.set(0, h.rotY, 0);
        c.traverse((o) => {
          const m = o as Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        return c;
      }),
    [scene],
  );
  return (
    <>
      {clones.map((c, i) => (c ? <primitive key={KIT_HOUSES[i]!.boxId} object={c} /> : null))}
    </>
  );
}

/** The kit houses at their street positions (greybox until the GLB is there). */
export function HouseKit() {
  return (
    <Boundary fallback={<GreyHouses />} label={KIT_URL}>
      <Suspense fallback={<GreyHouses />}>
        <HousesInner />
      </Suspense>
    </Boundary>
  );
}

function GreyStreetlight({ bulbRef }: { bulbRef?: MutableRefObject<MeshStandardMaterial | null> }) {
  return (
    <>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshStandardMaterial
          ref={(m) => {
            if (bulbRef) bulbRef.current = m;
          }}
          color="#ffb35c"
          emissive="#ffb35c"
          emissiveIntensity={2}
        />
      </mesh>
    </>
  );
}

function StreetlightInner({ bulbRef }: { bulbRef?: MutableRefObject<MeshStandardMaterial | null> }) {
  const { scene } = useGLTF(PROPS_URL, false, true);
  const root = useMemo<Object3D | null>(() => {
    const src = scene.getObjectByName('prop_streetlight');
    if (!src) return null;
    const c = src.clone(true);
    c.position.set(0, 0, 0);
    c.rotation.set(0, 0, 0);
    c.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      if (m.name === 'prop_streetlight_bulb') {
        const own = (m.material as MeshStandardMaterial).clone();
        own.userData.baseEmissive = own.emissiveIntensity;
        m.material = own;
        m.castShadow = false;
        if (bulbRef) bulbRef.current = own;
      }
    });
    return c;
  }, [scene, bulbRef]);
  return root ? <primitive object={root} /> : <GreyStreetlight bulbRef={bulbRef} />;
}

/** One cast-iron streetlight standing at its parent group's origin. bulbRef receives the bulb's own material (flicker, burst). */
export function Streetlight({ bulbRef }: { bulbRef?: MutableRefObject<MeshStandardMaterial | null> }) {
  return (
    <Boundary fallback={<GreyStreetlight bulbRef={bulbRef} />} label={PROPS_URL}>
      <Suspense fallback={<GreyStreetlight bulbRef={bulbRef} />}>
        <StreetlightInner bulbRef={bulbRef} />
      </Suspense>
    </Boundary>
  );
}
