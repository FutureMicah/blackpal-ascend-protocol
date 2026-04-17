// Glossy black/grey metalloid 3D coin floating in orbit.
// Reactive to pointer hover/touch. Logo engraved on both faces.
import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useLoader, ThreeEvent } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function CoinMesh() {
  const groupRef = useRef<THREE.Group>(null!);
  const texture = useLoader(THREE.TextureLoader, "/blackpal-logo.png");
  const targetRotation = useRef({ x: 0, y: 0 });
  const isHovered = useRef(false);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Orbital float
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.25;
    groupRef.current.position.x = Math.cos(t * 0.4) * 0.15;
    // Auto-spin combined with pointer-driven tilt
    const baseSpin = isHovered.current ? 0.025 : 0.008;
    groupRef.current.rotation.y += baseSpin;
    groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * 0.08;
    groupRef.current.rotation.z += (targetRotation.current.y - groupRef.current.rotation.z) * 0.08;
  });

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    targetRotation.current.x = -e.point.y * 0.4;
    targetRotation.current.y = e.point.x * 0.4;
  };

  return (
    <group
      ref={groupRef}
      onPointerOver={() => (isHovered.current = true)}
      onPointerOut={() => {
        isHovered.current = false;
        targetRotation.current = { x: 0, y: 0 };
      }}
      onPointerMove={handleMove}
    >
      {/* Coin body — black metalloid disc */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.14, 96]} />
        <meshPhysicalMaterial
          color="#1a1a1d"
          metalness={1.0}
          roughness={0.18}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          reflectivity={1.0}
          envMapIntensity={2.8}
        />
      </mesh>

      {/* Front face logo (engraved) */}
      <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.82, 96]} />
        <meshPhysicalMaterial
          map={texture}
          metalness={0.6}
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.08}
          envMapIntensity={1.8}
          transparent
        />
      </mesh>

      {/* Back face logo */}
      <mesh position={[0, -0.072, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.82, 96]} />
        <meshPhysicalMaterial
          map={texture}
          metalness={0.6}
          roughness={0.3}
          clearcoat={0.9}
          clearcoatRoughness={0.08}
          envMapIntensity={1.8}
          transparent
        />
      </mesh>

      {/* Rim — chrome ridge */}
      <mesh>
        <torusGeometry args={[1.0, 0.075, 24, 96]} />
        <meshPhysicalMaterial
          color="#3a3a40"
          metalness={1.0}
          roughness={0.12}
          clearcoat={1.0}
          envMapIntensity={3.0}
        />
      </mesh>
    </group>
  );
}

interface MetalloidCoinProps {
  className?: string;
}

export const MetalloidCoin = ({ className = "" }: MetalloidCoinProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[4, 4, 4]} intensity={3} color="#ffffff" />
        <pointLight position={[-4, -2, 3]} intensity={2} color="#9ca3af" />
        <spotLight position={[0, 6, 2]} angle={0.4} penumbra={0.8} intensity={4} color="#ffffff" />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <CoinMesh />
        </Suspense>
      </Canvas>
    </div>
  );
};
