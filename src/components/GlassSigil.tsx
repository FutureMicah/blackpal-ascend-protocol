import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface GlassSigilProps {
  size?: number;
  className?: string;
}

/** Thick glass form. Outline is one flowing curve, not a rounded box. */
export const GlassSigil = ({ size = 176, className }: GlassSigilProps) => {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const fill = `sigil-fill-${uid}`;
  const rim = `sigil-rim-${uid}`;
  const sheen = `sigil-sheen-${uid}`;
  const glass = `sigil-glass-${uid}`;
  const lens = `sigil-lens-${uid}`;

  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: size,
        perspective: 900,
        transformStyle: "preserve-3d",
      }}
      animate={reduce ? undefined : { rotateX: [7, 3, 7], rotateY: [-10, -4, -10] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        role="img"
        aria-label="BlackPAL"
        style={{ overflow: "visible", filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.45))" }}
      >
        <defs>
          <linearGradient id={fill} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#d9fbff" stopOpacity="0.22" />
            <stop offset="42%" stopColor="#22d3ee" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#041016" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4feff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#67e8f9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id={glass} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="6"
              specularConstant="0.9"
              specularExponent="22"
              lightingColor="#ffffff"
              result="spec"
            >
              <fePointLight x="-30" y="-80" z="120" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="specIn" />
            </feMerge>
          </filter>
          <clipPath id={lens}>
            <path d="M102 18 C146 10 176 36 186 72 C198 114 184 150 156 170 C128 190 156 188 118 186 C78 184 36 168 22 132 C8 96 16 52 52 28 C68 18 82 22 102 18 Z" />
          </clipPath>
        </defs>

        {/* Curved glass body. Every join is a bend, not a corner. */}
        <path
          d="M102 14
             C150 6 180 32 190 70
             C202 114 186 152 156 174
             C126 196 160 192 116 190
             C72 188 30 170 16 132
             C2 94 12 46 50 22
             C68 12 84 18 102 14 Z"
          fill={`url(#${fill})`}
          stroke={`url(#${rim})`}
          strokeWidth="1.6"
          filter={`url(#${glass})`}
        />

        {/* Inner thickness line, offset along the same curve */}
        <path
          d="M104 28
             C142 22 166 42 174 72
             C184 108 170 140 146 158
             C122 176 148 174 114 172
             C80 170 48 156 36 126
             C24 96 32 58 62 38
             C76 30 88 32 104 28 Z"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="0.8"
        />

        <image
          href="/blackpal-logo.png"
          x="34"
          y="42"
          width="132"
          height="112"
          clipPath={`url(#${lens})`}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Sweeping highlight, follows the curve */}
        {!reduce && (
          <motion.ellipse
            cx="78"
            cy="48"
            rx="46"
            ry="16"
            fill={`url(#${sheen})`}
            opacity="0.35"
            transform="rotate(-28 78 48)"
            clipPath={`url(#${lens})`}
            animate={{ opacity: [0.15, 0.45, 0.15], x: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </svg>
    </motion.div>
  );
};
