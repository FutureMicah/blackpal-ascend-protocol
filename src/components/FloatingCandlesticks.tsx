import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect, lazy, Suspense } from 'react';
import * as THREE from 'three';

interface CandlestickProps {
  position: [number, number, number];
  type: 'bullish' | 'bearish';
  scale: number;
  speed: number;
}

const Candlestick = ({ position, type, scale, speed }: CandlestickProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const bodyColor = type === 'bullish' ? '#22c55e' : '#ff6b4a';
  const wickColor = type === 'bullish' ? '#16a34a' : '#ff4500';

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
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
        <meshStandardMaterial color={wickColor} metalness={0.1} roughness={0.3} />
      </mesh>
      
      {/* Body - cylindrical for that toy-like look */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, type === 'bullish' ? 0.7 : 0.5, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.2} />
      </mesh>
      
      {/* Lower wick */}
      <mesh position={[0, type === 'bullish' ? -0.5 : -0.4, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, type === 'bullish' ? 0.4 : 0.6, 8]} />
        <meshStandardMaterial color={wickColor} metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  );
};

const Scene = ({ isMobile }: { isMobile: boolean }) => {
  const candlesticks = useMemo(() => {
    const sticks = [];
    const types: ('bullish' | 'bearish')[] = ['bullish', 'bearish'];
    // Fewer candlesticks on mobile for performance
    const count = isMobile ? 6 : 12;
    
    for (let i = 0; i < count; i++) {
      sticks.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ] as [number, number, number],
        type: types[Math.floor(Math.random() * types.length)],
        scale: 0.5 + Math.random() * 1,
        speed: 0.3 + Math.random() * 0.5
      });
    }
    
    return sticks;
  }, [isMobile]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#22c55e" />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color="#ff6b4a" />
      
      {candlesticks.map((props, i) => (
        <Candlestick key={i} {...props} />
      ))}
    </>
  );
};

export const FloatingCandlesticks = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if mobile
    setIsMobile(window.innerWidth < 768);
    
    // Delay mounting for better initial load performance
    const timer = setTimeout(() => setIsVisible(true), 500);
    
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'transparent' }}
        dpr={isMobile ? 1 : [1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: !isMobile, powerPreference: 'high-performance' }}
      >
        <Scene isMobile={isMobile} />
      </Canvas>
    </div>
  );
};
