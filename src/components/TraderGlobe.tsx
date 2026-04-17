// 3D globe view of trader locations using Three.js. Pins glow per active trader.
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

interface Trader {
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
}

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Globe({ traders }: { traders: Trader[] }) {
  const ref = useRef<THREE.Group>(null!);
  const earthTex = useLoader(
    THREE.TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg"
  );

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0008;
  });

  const pins = useMemo(
    () =>
      traders
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => ({
          ...t,
          pos: latLngToVec3(t.latitude!, t.longitude!, 1.02),
        })),
    [traders]
  );

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={earthTex} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Atmosphere */}
      <mesh scale={1.05}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      {pins.map((p) => (
        <group key={p.user_id} position={p.pos}>
          <mesh>
            <sphereGeometry args={[0.012, 12, 12]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export const TraderGlobe = ({ traders }: { traders: Trader[] }) => {
  return (
    <Canvas camera={{ position: [0, 0, 2.6], fov: 50 }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <Stars radius={50} depth={20} count={2000} factor={2} fade />
        <Globe traders={traders} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={5} autoRotate={false} />
    </Canvas>
  );
};
