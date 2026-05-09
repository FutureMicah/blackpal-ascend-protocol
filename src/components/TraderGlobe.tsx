// 3D globe view of trader locations.
// - meshBasicMaterial on the earth → no terminator / dark hemisphere on any device.
// - Texture failures fall back to a flat-shaded blue sphere with an ARIA error.
// - Pins are memoized by user_id+coords to prevent flicker on view toggles or
//   unrelated parent re-renders.
import { Component, memo, useEffect, useMemo, useRef, useState, Suspense } from "react";
import type { ReactNode } from "react";
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

const EARTH_TEX = "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg";
const CLOUD_TEX = "https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png";

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Stable signature so memoized children only re-render when meaningful data changes.
function tradersSignature(traders: Trader[]) {
  return traders
    .filter((t) => t.latitude != null && t.longitude != null)
    .map((t) => `${t.user_id}:${t.latitude!.toFixed(3)},${t.longitude!.toFixed(3)}`)
    .join("|");
}

const Pins = memo(
  ({ traders }: { traders: Trader[] }) => {
    const pins = useMemo(
      () =>
        traders
          .filter((t) => t.latitude != null && t.longitude != null)
          .map((t) => ({
            id: t.user_id,
            pos: latLngToVec3(t.latitude!, t.longitude!, 1.02),
          })),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [tradersSignature(traders)]
    );
    return (
      <group>
        {pins.map((p) => (
          <group key={p.id} position={p.pos}>
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
  },
  (prev, next) => tradersSignature(prev.traders) === tradersSignature(next.traders)
);
Pins.displayName = "Pins";

function GlobeMesh({ traders }: { traders: Trader[] }) {
  const ref = useRef<THREE.Group>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const earthTex = useLoader(THREE.TextureLoader, EARTH_TEX);
  const cloudTex = useLoader(THREE.TextureLoader, CLOUD_TEX);

  // Make textures color-correct & non-aliased.
  useMemo(() => {
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthTex.anisotropy = 8;
    cloudTex.colorSpace = THREE.SRGBColorSpace;
  }, [earthTex, cloudTex]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        {/* Basic material → flat illumination, no terminator regardless of light setup. */}
        <meshBasicMaterial map={earthTex} toneMapped={false} />
      </mesh>
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={cloudTex} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      <Pins traders={traders} />
    </group>
  );
}

// Flat fallback sphere if textures can't load (e.g. CDN blocked, offline).
function FallbackGlobe({ traders }: { traders: Trader[] }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#1d4ed8" />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
      <Pins traders={traders} />
    </group>
  );
}

class TextureBoundary extends Component<
  { onError: () => void; fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function LoadingPill() {
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

interface TraderGlobeProps {
  traders: Trader[];
}

const TraderGlobeInner = ({ traders }: TraderGlobeProps) => {
  const [textureError, setTextureError] = useState(false);
  // Reset error state if user changes anything meaningful (e.g. after retry remount).
  const [reloadKey, setReloadKey] = useState(0);

  // Announce error to screen readers.
  useEffect(() => {
    if (textureError) {
      // no-op; the live region below handles the announcement.
    }
  }, [textureError]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 50 }}
        style={{ background: "transparent" }}
        shadows={false}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        aria-label="3D globe showing live trader locations"
        frameloop="always"
      >
        {/* Lighting kept minimal & neutral; meshBasicMaterial ignores it but
            keeps cloud/atmosphere readable. */}
        <ambientLight intensity={1} />
        <Suspense fallback={<LoadingPill />}>
          {textureError ? (
            <FallbackGlobe traders={traders} />
          ) : (
            <TextureBoundary
              key={reloadKey}
              onError={() => setTextureError(true)}
              fallback={<FallbackGlobe traders={traders} />}
            >
              <GlobeMesh traders={traders} />
            </TextureBoundary>
          )}
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={5}
          autoRotate={false}
          enableDamping
        />
      </Canvas>

      {/* ARIA-announced error + accessible retry overlay. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {textureError
          ? "High-resolution globe textures failed to load. Showing simplified globe."
          : ""}
      </div>
      {textureError && (
        <div
          role="alert"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-xl border border-white/15 px-3 py-1.5 text-[10px] text-white/90"
        >
          <span>Globe textures unavailable — showing simplified view.</span>
          <button
            type="button"
            onClick={() => {
              setTextureError(false);
              setReloadKey((k) => k + 1);
            }}
            className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Retry loading globe textures"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

// Memoize the whole globe so view toggles or unrelated parent state changes
// don't tear down the canvas.
export const TraderGlobe = memo(
  TraderGlobeInner,
  (prev, next) => tradersSignature(prev.traders) === tradersSignature(next.traders)
);
