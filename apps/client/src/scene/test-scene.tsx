import { Canvas } from '@react-three/fiber';

/**
 * Minimal foggy scene proving that WebGL, React Three Fiber and Three.js work.
 * Replaced by the greybox exterior in tasks.md task 2.6.
 */
export function TestScene() {
  return (
    <Canvas camera={{ position: [4, 2.2, 6], fov: 55 }} dpr={[1, 2]}>
      <color attach="background" args={['#07080c']} />
      <fogExp2 attach="fog" args={['#0b0d14', 0.12]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[-6, 8, 4]} intensity={0.6} color="#9fb4d8" />
      <pointLight position={[1.5, 2.5, 1]} intensity={8} distance={8} color="#ffb35c" />
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#4a4038" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#14161c" roughness={1} />
      </mesh>
    </Canvas>
  );
}
