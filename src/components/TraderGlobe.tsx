// 3D globe view of trader locations using Three.js. Pins glow per active trader.
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
  // Photoreal earth-from-space (dark side visible) — matches deep-space aesthetic of ref image 1
  const earthTex = useLoader(
    THREE.TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg"
  );
  const bumpTex = useLoader(
    THREE.TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png"
  );
  const cloudTex = useLoader(
    THREE.TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png"
  );
  const cloudsRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0009;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0014;
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
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          map={earthTex}
          bumpMap={bumpTex}
          bumpScale={0.05}
          roughness={0.85}
          metalness={0.1}
          emissive={new THREE.Color("#0a1530")}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Subtle cloud layer */}
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={cloudTex} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Outer atmosphere glow */}
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {pins.map((p) => (
        <group key={p.user_id} position={p.pos}>
          <mesh>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial color="#fcd34d" transparent opacity={0.45} />
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
      style={{ background: "transparent" }}
    >
      {/* Deep-space lighting: warm sun + cool fill */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} color="#fff7ed" />
      <directionalLight position={[-5, -2, -3]} intensity={0.25} color="#7dd3fc" />
      <Suspense fallback={null}>
        <Globe traders={traders} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={5} autoRotate={false} />
    </Canvas>
  );
};
