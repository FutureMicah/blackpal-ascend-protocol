import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function GlobePoints() {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, colors } = useMemo(() => {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const radius = 2.2;

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution for even spread
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color variation: cyan to blue to purple
      const t = i / count;
      if (t < 0.33) {
        // Electric cyan
        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      } else if (t < 0.66) {
        // Voltage blue
        colors[i * 3] = 0.1 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.3;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Gold/amber accent
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.1;
      }
    }

    return { positions, colors };
  }, []);

  // Orbit rings data
  const orbitLines = useMemo(() => {
    const rings = [];
    const ringCounts = [200, 150, 180];
    const ringRadii = [2.5, 2.8, 2.35];
    const ringTilts = [0.4, -0.7, 1.1];

    for (let r = 0; r < 3; r++) {
      const count = ringCounts[r];
      const rPos = new Float32Array(count * 3);
      const radius = ringRadii[r];
      const tilt = ringTilts[r];

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        rPos[i * 3] = radius * Math.cos(angle);
        rPos[i * 3 + 1] = radius * Math.sin(angle) * Math.cos(tilt);
        rPos[i * 3 + 2] = radius * Math.sin(angle) * Math.sin(tilt);
      }
      rings.push(rPos);
    }
    return rings;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.18;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
    }
  });

  return (
    <group>
      {/* Main globe particle cloud */}
      <Points ref={pointsRef} positions={positions} colors={colors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.018}
          sizeAttenuation
          depthWrite={false}
          opacity={0.85}
        />
      </Points>

      {/* Orbit rings */}
      {orbitLines.map((ringPos, i) => (
        <OrbitRing key={i} positions={ringPos} index={i} />
      ))}

      {/* Core glow sphere */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function OrbitRing({ positions, index }: { positions: Float32Array; index: number }) {
  const ringRef = useRef<THREE.Points>(null!);
  const speeds = [0.3, -0.22, 0.18];
  const axes: Array<[number, number, number]> = [[0, 1, 0.4], [0.7, 0, 1], [1, 0.5, 0]];

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.elapsedTime;
      ringRef.current.rotation.x = t * speeds[index] + axes[index][0];
      ringRef.current.rotation.y = t * speeds[index] * 0.7 + axes[index][1];
      ringRef.current.rotation.z = axes[index][2];
    }
  });

  const colors = useMemo(() => {
    const count = positions.length / 3;
    const c = new Float32Array(count * 3);
    const ringColors = [
      [0.0, 0.9, 1.0],  // cyan
      [1.0, 0.75, 0.1], // gold
      [0.5, 0.2, 1.0],  // purple
    ];
    const [r, g, b] = ringColors[index % ringColors.length];
    for (let i = 0; i < count; i++) {
      c[i * 3] = r;
      c[i * 3 + 1] = g;
      c[i * 3 + 2] = b;
    }
    return c;
  }, [positions, index]);

  return (
    <Points ref={ringRef} positions={positions} colors={colors} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.022}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function AmbientParticles() {
  const meshRef = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const count = 600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.04;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <Points ref={meshRef} positions={positions}>
      <PointMaterial
        transparent
        color="#00e5ff"
        size={0.012}
        sizeAttenuation
        depthWrite={false}
        opacity={0.25}
      />
    </Points>
  );
}

interface ParticleGlobeProps {
  className?: string;
}

export const ParticleGlobe = ({ className = "" }: ParticleGlobeProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00e5ff" />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
        <GlobePoints />
        <AmbientParticles />
      </Canvas>
    </div>
  );
};

// Standalone page/section version with full layout
export const ParticleGlobeSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-background to-background pointer-events-none" />
      
      {/* Globe canvas */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] max-w-[90vw] max-h-[90vw]">
          <ParticleGlobe />
        </div>
      </div>

      {/* Overlay content */}
      <div className="relative z-10 text-center px-4 pointer-events-none">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-4">
          <span className="gradient-text-cyber">BLACKPAL</span>
        </h1>
        <p className="text-xl text-muted-foreground tracking-widest uppercase">
          Ascend Protocol
        </p>
      </div>
    </section>
  );
};
