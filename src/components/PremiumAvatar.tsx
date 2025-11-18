import { useState } from "react";
import { motion } from "framer-motion";

interface PremiumAvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

export const PremiumAvatar = ({ 
  src, 
  alt = "Avatar", 
  size = 160,
  className = ""
}: PremiumAvatarProps) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateX = (e.clientY - centerY) / 10;
    const rotateY = (centerX - e.clientX) / 10;
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Outer glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          width: size + 40,
          height: size + 40,
          left: -20,
          top: -20,
        }}
        animate={{
          boxShadow: [
            "0 0 40px 10px rgba(168, 85, 247, 0.4), 0 0 80px 20px rgba(59, 130, 246, 0.2)",
            "0 0 60px 15px rgba(59, 130, 246, 0.4), 0 0 100px 25px rgba(168, 85, 247, 0.2)",
            "0 0 40px 10px rgba(168, 85, 247, 0.4), 0 0 80px 20px rgba(59, 130, 246, 0.2)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Rotating gradient border */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          width: size + 20,
          height: size + 20,
          left: -10,
          top: -10,
          background: "conic-gradient(from 0deg, #8b5cf6, #3b82f6, #06b6d4, #8b5cf6)",
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Inner frame */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 backdrop-blur-sm"
        style={{
          width: size + 16,
          height: size + 16,
          left: -8,
          top: -8,
          border: "2px solid rgba(255, 255, 255, 0.2)",
        }}
      />

      {/* Main avatar container with 3D effect */}
      <motion.div
        className="relative overflow-hidden rounded-full bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900"
        style={{
          width: size,
          height: size,
          perspective: 1000,
        }}
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Holographic overlay effect */}
        <motion.div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, transparent 20%, rgba(255, 255, 255, 0.4) 40%, transparent 60%)",
          }}
          animate={{
            x: [-200, 200],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Avatar image */}
        {src ? (
          <motion.img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            style={{
              filter: "contrast(1.1) brightness(1.05) saturate(1.2)",
            }}
            whileHover={{
              scale: 1.05,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/50 via-blue-500/50 to-cyan-500/50">
            <span className="text-6xl">👤</span>
          </div>
        )}

        {/* Inner glow overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, transparent 40%, rgba(168, 85, 247, 0.2) 100%)",
          }}
        />

        {/* Corner accents */}
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-400/60 rounded-tr-sm" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-sm" />
      </motion.div>

      {/* Shimmer particles */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          width: size,
          height: size,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>

      {/* NFT badge */}
      <motion.div
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        ✨ PREMIUM
      </motion.div>
    </div>
  );
};
