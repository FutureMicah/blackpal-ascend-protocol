import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface CandlestickProps {
  position: [number, number, number];
  type: 'bullish' | 'bearish';
  scale: number;
  speed: number;
}

const Candlestick = ({ position, type, scale, speed }: CandlestickProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const bodyColor = type === 'bullish' ? '#00ffe7' : '#ff4444';
  const wickColor = type === 'bullish' ? '#00ffe7' : '#ff4444';

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.5;
      meshRef.current.rotation.y += 0.01 * speed;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.2;
    }
  });

  return (
    <group ref={meshRef} position={position} scale={scale}>
      {/* Upper wick */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial 
          color={wickColor} 
          emissive={bodyColor} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.15, type === 'bullish' ? 0.5 : 0.3, 0.15]} />
        <meshStandardMaterial 
          color={bodyColor} 
          emissive={bodyColor} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Lower wick */}
      <mesh position={[0, type === 'bullish' ? -0.4 : -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, type === 'bullish' ? 0.3 : 0.5, 8]} />
        <meshStandardMaterial 
          color={wickColor} 
          emissive={bodyColor} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
};

const Scene = () => {
  const candlesticks = useMemo(() => {
    const sticks = [];
    const types: ('bullish' | 'bearish')[] = ['bullish', 'bearish'];
    
    for (let i = 0; i < 15; i++) {
      sticks.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ] as [number, number, number],
        type: types[Math.floor(Math.random() * types.length)],
        scale: 0.5 + Math.random() * 1,
        speed: 0.3 + Math.random() * 0.7
      });
    }
    
    return sticks;
  }, []);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#00ffe7" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4299e1" />
      
      {candlesticks.map((props, i) => (
        <Candlestick key={i} {...props} />
      ))}
    </>
  );
};

export const FloatingCandlesticks = () => {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
