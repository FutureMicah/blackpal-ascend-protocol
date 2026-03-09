// FloatingGlassCoins — realistic 3D metallic coins with BlackPal logo engraved
import { useRef, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

interface CoinData {
  position: [number, number, number];
  rotation: [number, number, number];
  rotationSpeed: [number, number, number];
  floatSpeed: number;
  floatOffset: number;
  scale: number;
  metalColor: string;
}

function GlassCoin({ data, logoTexture }: { data: CoinData; logoTexture: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const rimRef = useRef<THREE.Mesh>(null!);
  const initialPos = useRef(data.position);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow tumble
    meshRef.current.rotation.x += data.rotationSpeed[0];
    meshRef.current.rotation.y += data.rotationSpeed[1];
    meshRef.current.rotation.z += data.rotationSpeed[2];

    // Gentle float
    meshRef.current.position.y =
      initialPos.current[1] +
      Math.sin(t * data.floatSpeed + data.floatOffset) * 0.35;
    meshRef.current.position.x =
      initialPos.current[0] +
      Math.cos(t * data.floatSpeed * 0.7 + data.floatOffset) * 0.15;

    if (rimRef.current) {
      rimRef.current.rotation.copy(meshRef.current.rotation);
      rimRef.current.position.copy(meshRef.current.position);
    }
  });

  return (
    <group>
      {/* Main coin body — metallic disc */}
      <mesh ref={meshRef} position={data.position} scale={data.scale}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 64]} />
        <meshPhysicalMaterial
          color={data.metalColor}
          metalness={0.95}
          roughness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          reflectivity={1.0}
          envMapIntensity={2.5}
        />
      </mesh>

      {/* Front face — logo */}
      <mesh
        position={data.position}
        scale={data.scale}
        rotation={[0, 0, 0]}
      >
        <cylinderGeometry args={[0.6, 0.6, 0.001, 64]} />
        <meshPhysicalMaterial
          map={logoTexture}
          metalness={0.7}
          roughness={0.25}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rim edge — gold/chrome ring */}
      <mesh ref={rimRef} position={data.position} scale={data.scale}>
        <torusGeometry args={[0.7, 0.055, 16, 64]} />
        <meshPhysicalMaterial
          color="#d4af37"
          metalness={1.0}
          roughness={0.08}
          clearcoat={1.0}
          clearcoatRoughness={0.02}
          envMapIntensity={3.0}
        />
      </mesh>
    </group>
  );
}

function CoinsScene() {
  const logoTexture = useLoader(THREE.TextureLoader, "/blackpal-logo.png");

  // Configure texture for crisp circular mapping
  useMemo(() => {
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    logoTexture.minFilter = THREE.LinearFilter;
    logoTexture.magFilter = THREE.LinearFilter;
    logoTexture.wrapS = THREE.ClampToEdgeWrapping;
    logoTexture.wrapT = THREE.ClampToEdgeWrapping;
  }, [logoTexture]);

  const coins = useMemo<CoinData[]>(() => {
    const metalColors = [
      "#d4af37", // gold
      "#c0c0c0", // silver
      "#d4af37", // gold
      "#b87333", // copper/bronze
      "#d4af37", // gold
      "#c0c0c0", // silver
      "#d4af37", // gold
      "#e8d5b0", // pale gold
      "#b87333", // bronze
      "#d4af37", // gold
      "#c0c0c0", // silver
      "#d4af37", // gold
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
      ] as [number, number, number],
      rotationSpeed: [
        (Math.random() - 0.5) * 0.008,
        (Math.random() - 0.5) * 0.006,
        (Math.random() - 0.5) * 0.005,
      ] as [number, number, number],
      floatSpeed: 0.3 + Math.random() * 0.4,
      floatOffset: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.6,
      metalColor: metalColors[i % metalColors.length],
    }));
  }, []);

  return (
    <>
      {coins.map((coin, i) => (
        <GlassCoin key={i} data={coin} logoTexture={logoTexture} />
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
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.4,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={4} color="#d4af37" />
        <pointLight position={[-5, -3, 3]} intensity={2.5} color="#ffffff" />
        <pointLight position={[0, 6, -4]} intensity={2} color="#ffd700" />
        <spotLight
          position={[0, 8, 2]}
          angle={0.4}
          penumbra={0.8}
          intensity={5}
          color="#fff5cc"
        />
        <spotLight
          position={[-3, -5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={3}
          color="#c0c0c0"
        />
        <Environment preset="studio" />
        <CoinsScene />
      </Canvas>
    </div>
  );
};
