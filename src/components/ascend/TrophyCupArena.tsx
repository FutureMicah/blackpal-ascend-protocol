import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

interface Props {
  className?: string;
  label?: string;
}

/**
 * Contest hero — thin-line trophy cup, floating with sparkle bursts.
 * Pure SVG + CSS transforms (no animation library, no canvas, no remote asset),
 * same arena shell and pointer parallax as the previous hero, so the footprint
 * on the Contest page is unchanged. Pointer position feeds CSS custom
 * properties, so nothing re-renders per frame.
 */
export function TrophyCupArena({ className, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [charge, setCharge] = useState(false);

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width;
      const py = (clientY - r.top) / r.height;
      el.style.setProperty("--px", ((px - 0.5) * 2).toFixed(3));
      el.style.setProperty("--py", ((py - 0.5) * 2).toFixed(3));
    },
    [reduced],
  );

  const reset = () => {
    const el = ref.current;
    el?.style.setProperty("--px", "0");
    el?.style.setProperty("--py", "0");
  };

  const celebrate = () => {
    setCharge(true);
    window.setTimeout(() => setCharge(false), 700);
  };

  return (
    <div
      ref={ref}
      className={cn("arena trophy-arena", reduced && "arena--static", className)}
      data-charge={charge ? "trophy" : "none"}
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) onMove(t.clientX, t.clientY);
      }}
      onTouchEnd={reset}
      role="img"
      aria-label="Contest trophy cup"
    >
      <div className="arena__floor" aria-hidden="true" />
      <div className="arena__glow trophy-arena__glow" aria-hidden="true" />

      <svg className="arena__stage" viewBox="0 0 640 300" aria-hidden="true">
        {/* candlestick silhouettes, kept from the previous hero backdrop */}
        <g className="arena__candles">
          {Array.from({ length: 18 }).map((_, i) => {
            const h = 20 + ((i * 37) % 110);
            return (
              <rect
                key={i}
                x={12 + i * 35}
                y={230 - h}
                width="10"
                height={h}
                rx="2"
                fill={i % 3 === 0 ? "hsl(186 100% 50% / .12)" : "hsl(258 90% 66% / .12)"}
              />
            );
          })}
        </g>

        {/* halo ring behind the cup */}
        <circle cx="320" cy="160" r="96" className="trophy__ring" />
        <circle cx="320" cy="160" r="118" className="trophy__ring trophy__ring--outer" />

        {/* TROPHY CUP — thin outline, same stroke weight family as the heading icon */}
        <g className="trophy__cup">
          {/* handles */}
          <path d="M244 108 C 202 104 196 152 242 168" className="trophy__line" />
          <path d="M396 108 C 438 104 444 152 398 168" className="trophy__line" />
          {/* bowl */}
          <path
            d="M244 88 H 396 V 148 C 396 194 362 220 320 220 C 278 220 244 194 244 148 Z"
            className="trophy__bowl"
          />
          {/* rim */}
          <path d="M244 88 H 396" className="trophy__line" />
          {/* stem + base */}
          <path d="M320 220 V 248" className="trophy__line" />
          <path d="M292 248 H 348" className="trophy__line" />
          <path d="M282 262 H 358" className="trophy__line" />
          {/* shine */}
          <path d="M268 104 C 264 132 268 166 282 188" className="trophy__shine" />
          {/* star on the bowl */}
          <path
            d="M320 128 L 326 146 L 345 152 L 326 158 L 320 176 L 314 158 L 295 152 L 314 146 Z"
            className="trophy__star"
          />
        </g>

        {/* sparkles orbiting the cup */}
        <g className="trophy__sparks">
          <path d="M196 96 L 200 108 L 212 112 L 200 116 L 196 128 L 192 116 L 180 112 L 192 108 Z" className="trophy__spark" />
          <path d="M444 88 L 448 100 L 460 104 L 448 108 L 444 120 L 440 108 L 428 104 L 440 100 Z" className="trophy__spark trophy__spark--d1" />
          <path d="M200 208 L 203 216 L 211 219 L 203 222 L 200 230 L 197 222 L 189 219 L 197 216 Z" className="trophy__spark trophy__spark--d2" />
          <path d="M440 200 L 443 208 L 451 211 L 443 214 L 440 222 L 437 214 L 429 211 L 437 208 Z" className="trophy__spark trophy__spark--d3" />
          <circle cx="230" cy="70" r="3" className="trophy__dot trophy__dot--d1" />
          <circle cx="414" cy="66" r="3" className="trophy__dot trophy__dot--d2" />
          <circle cx="168" cy="164" r="3" className="trophy__dot trophy__dot--d3" />
          <circle cx="472" cy="158" r="3" className="trophy__dot trophy__dot--d1" />
        </g>
      </svg>

      <button
        type="button"
        className="arena__zone trophy-arena__zone"
        onClick={celebrate}
        aria-label="Celebrate the trophy"
      />
      {label && <p className="arena__caption">{label}</p>}
    </div>
  );
}
