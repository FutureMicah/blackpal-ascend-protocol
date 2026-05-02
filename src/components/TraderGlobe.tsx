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
  // Daylight blue-marble texture (Snap Map vibe: bright continents, blue oceans)
  const earthTex = useLoader(
    THREE.TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg"
  );
  // Subtle bump for terrain definition
  const bumpTex = useLoader(
    THREE.TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png"
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
        <meshStandardMaterial
          map={earthTex}
          bumpMap={bumpTex}
          bumpScale={0.04}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>
      {/* Soft cyan atmosphere — Snap Map daylight feel */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
      {pins.map((p) => (
        <group key={p.user_id} position={p.pos}>
          <mesh>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export const TraderGlobe = ({ traders }: { traders: Trader[] }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 50 }}
      style={{
        background: "linear-gradient(180deg, #bae6fd 0%, #e0f2fe 60%, #fef3c7 100%)",
      }}
    >
      {/* Bright daylight: stronger ambient + warm sun */}
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} color="#fff7ed" />
      <directionalLight position={[-5, -2, -3]} intensity={0.4} color="#bae6fd" />
      <Suspense fallback={null}>
        <Globe traders={traders} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={5} autoRotate={false} />
    </Canvas>
  );
};
