// Glowing wireframe 3D shapes — neon purple holographic aesthetic
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function GlowingWireframeSphere({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * speed * 0.3;
    meshRef.current.rotation.y = t * speed * 0.5;
    meshRef.current.position.y = position[1] + Math.sin(t * speed * 0.4) * 0.3;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.7} />
    </mesh>
  );
}

function GlowingWireframeTorus({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = t * speed * 0.2;
    meshRef.current.rotation.z = t * speed * 0.3;
    meshRef.current.position.y = position[1] + Math.sin(t * speed * 0.5 + 1) * 0.25;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusGeometry args={[1, 0.35, 8, 16]} />
      <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.6} />
    </mesh>
  );
}

function GlowingWireframeHand() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.4 + 0.1;
    groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.15 - 0.3;
    groupRef.current.rotation.z = Math.sin(t * 0.08) * 0.1;
  });

  // Build a stylized wireframe hand from cylinders and spheres
  const fingerData = useMemo(() => [
    // Palm base (not rendered as finger)
    { pos: [0, 0, 0] as [number,number,number], rot: [0, 0, 0] as [number,number,number], length: 1.2, radius: 0.6 },
    // Thumb
    { pos: [-0.7, 0.2, 0.2] as [number,number,number], rot: [0, 0, 0.8] as [number,number,number], length: 0.8, radius: 0.12 },
    // Index
    { pos: [-0.3, 1.0, 0] as [number,number,number], rot: [0, 0, 0.05] as [number,number,number], length: 0.9, radius: 0.1 },
    // Middle
    { pos: [0, 1.1, 0] as [number,number,number], rot: [0, 0, 0] as [number,number,number], length: 1.0, radius: 0.1 },
    // Ring
    { pos: [0.25, 1.0, 0] as [number,number,number], rot: [0, 0, -0.05] as [number,number,number], length: 0.85, radius: 0.09 },
    // Pinky
    { pos: [0.5, 0.85, 0] as [number,number,number], rot: [0, 0, -0.1] as [number,number,number], length: 0.65, radius: 0.08 },
  ], []);

  return (
    <group ref={groupRef} position={[0, -0.8, 0]} scale={2.0}>
      {/* Palm — wireframe box */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.3, 1.2, 0.4, 3, 3, 2]} />
        <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Fingers */}
      {fingerData.slice(1).map((finger, i) => (
        <group key={i} position={finger.pos} rotation={finger.rot}>
          {/* Finger segment 1 */}
          <mesh position={[0, finger.length * 0.3, 0]}>
            <cylinderGeometry args={[finger.radius, finger.radius * 1.1, finger.length * 0.6, 6]} />
            <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.65} />
          </mesh>
          {/* Joint */}
          <mesh position={[0, finger.length * 0.6, 0]}>
            <sphereGeometry args={[finger.radius * 1.2, 6, 4]} />
            <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.8} />
          </mesh>
          {/* Finger segment 2 */}
          <mesh position={[0, finger.length * 0.85, 0]}>
            <cylinderGeometry args={[finger.radius * 0.8, finger.radius, finger.length * 0.5, 6]} />
            <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.65} />
          </mesh>
          {/* Fingertip */}
          <mesh position={[0, finger.length * 1.1, 0]}>
            <sphereGeometry args={[finger.radius * 0.9, 6, 4]} />
            <meshBasicMaterial color="#c4b5fd" wireframe transparent opacity={0.9} />
          </mesh>
        </group>
      ))}

      {/* Glowing energy orb in palm */}
      <mesh position={[0, 0.5, 0.3]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ddd6fe" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0.3]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, count } = useMemo(() => {
    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return { positions, count };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#a78bfa" size={0.03} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function WireframeScene() {
  return (
    <>
      <GlowingWireframeHand />
      <GlowingWireframeSphere position={[-2.5, 1.5, -1]} scale={0.5} speed={0.6} />
      <GlowingWireframeSphere position={[2.8, -1.2, -0.5]} scale={0.35} speed={0.8} />
      <GlowingWireframeTorus position={[2.2, 1.8, -1.5]} scale={0.4} speed={0.5} />
      <GlowingWireframeTorus position={[-2.0, -1.5, -0.8]} scale={0.3} speed={0.7} />
      <FloatingParticles />
    </>
  );
}

interface WireframeGlowProps {
  className?: string;
}

export const WireframeGlow = ({ className = "" }: WireframeGlowProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <WireframeScene />
      </Canvas>
    </div>
  );
};
