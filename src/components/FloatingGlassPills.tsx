// FloatingGlassCoins — flat glass disc/coin shapes tumbling in zero gravity
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

interface PillData {
  position: [number, number, number];
  rotation: [number, number, number];
  rotationSpeed: [number, number, number];
  floatSpeed: number;
  floatOffset: number;
  scale: number;
  color: string;
}

function GlassPill({ data }: { data: PillData }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const initialPos = useRef(data.position);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow tumble rotation
    meshRef.current.rotation.x += data.rotationSpeed[0];
    meshRef.current.rotation.y += data.rotationSpeed[1];
    meshRef.current.rotation.z += data.rotationSpeed[2];

    // Gentle zero-gravity float
    meshRef.current.position.y =
      initialPos.current[1] +
      Math.sin(t * data.floatSpeed + data.floatOffset) * 0.35;
    meshRef.current.position.x =
      initialPos.current[0] +
      Math.cos(t * data.floatSpeed * 0.7 + data.floatOffset) * 0.15;
  });

  return (
    <mesh ref={meshRef} position={data.position} scale={data.scale}>
      {/* Cylinder geometry — flat coin/disc shape */}
      <cylinderGeometry args={[0.7, 0.7, 0.18, 64]} />
      <meshPhysicalMaterial
        color={data.color}
        metalness={0.08}
        roughness={0.0}
        transmission={0.88}
        thickness={0.4}
        ior={1.7}
        reflectivity={0.95}
        transparent
        opacity={0.85}
        envMapIntensity={3.0}
        clearcoat={1}
        clearcoatRoughness={0.02}
        attenuationColor={data.color}
        attenuationDistance={0.3}
      />
    </mesh>
  );
}

function PillsScene() {
  const pills = useMemo<PillData[]>(() => {
    const colors = [
      "#5b4fff", // deep violet
      "#7c6fff", // soft purple
      "#4a3fd4", // indigo
      "#6655ee", // violet
      "#8870ff", // lavender purple
      "#3d35b8", // dark blue-violet
      "#9080ff", // light purple
      "#5545cc", // medium violet
    ];

    const positions: [number, number, number][] = [
      [-2.8, 1.2, -1.0],
      [-1.5, -0.8, 0.5],
      [-0.2, 1.8, -0.5],
      [1.3, 0.3, 1.0],
      [2.6, 1.5, -0.8],
      [2.0, -1.2, 0.3],
      [-2.0, -1.8, -0.5],
      [0.5, -1.5, -1.2],
      [-3.2, 0.0, 0.8],
      [3.2, -0.5, -0.5],
      [0.8, 2.5, 0.8],
      [-1.0, 2.2, 1.2],
    ];

    return positions.map((pos, i) => ({
      position: pos,
      rotation: [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ],
      rotationSpeed: [
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.005,
      ],
      floatSpeed: 0.3 + Math.random() * 0.4,
      floatOffset: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.6,
      color: colors[i % colors.length],
    }));
  }, []);

  return (
    <>
      {pills.map((pill, i) => (
        <GlassPill key={i} data={pill} />
      ))}
    </>
  );
}

interface FloatingGlassPillsProps {
  className?: string;
}

export const FloatingGlassPills = ({ className = "" }: FloatingGlassPillsProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={3} color="#8870ff" />
        <pointLight position={[-5, -3, 3]} intensity={2} color="#4a90d9" />
        <pointLight position={[0, 6, -4]} intensity={1.5} color="#ffffff" />
        <spotLight
          position={[0, 8, 0]}
          angle={0.4}
          penumbra={0.8}
          intensity={4}
          color="#a090ff"
        />
        <Environment preset="studio" />
        <PillsScene />
      </Canvas>
    </div>
  );
};
