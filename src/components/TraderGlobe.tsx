// 3D globe view of trader locations using Three.js. Pins glow per active trader.
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
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
        {/* Use a near-flat material so the entire globe is lit evenly
            (no harsh terminator / dark hemisphere). */}
        <meshPhongMaterial
          map={earthTex}
          bumpMap={bumpTex}
          bumpScale={0.04}
          shininess={6}
          specular={new THREE.Color("#1a2540")}
          emissive={new THREE.Color("#0a1530")}
          emissiveIntensity={0.18}
        />
      </mesh>
      {/* Subtle cloud layer */}
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={cloudTex} transparent opacity={0.22} depthWrite={false} />
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

function GlobeFallback() {
  return (
    <Html center>
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 px-3 py-1.5 text-[10px] text-white/90"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        Loading globe…
      </div>
    </Html>
  );
}

export const TraderGlobe = ({ traders }: { traders: Trader[] }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 50 }}
      style={{ background: "transparent" }}
      shadows={false}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D globe showing live trader locations"
    >
      {/* Even, shadow-free lighting so no dark hemisphere appears on the globe. */}
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#bfdbfe", "#0b1024", 0.7]} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} color="#ffffff" castShadow={false} />
      <Suspense fallback={<GlobeFallback />}>
        <Globe traders={traders} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={5} autoRotate={false} enableDamping />
    </Canvas>
  );
};
