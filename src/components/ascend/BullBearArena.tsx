import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

interface Props {
  /** 0–100 share of bullish pressure. Drives which side dominates. */
  bullPct?: number;
  className?: string;
  label?: string;
}

/**
 * Signature Contest hero — Bull vs Bear locked in a wrestle.
 * Pure SVG + CSS transforms (no animation library, no canvas).
 * Pointer position feeds CSS custom properties, so nothing re-renders per frame.
 */
export function BullBearArena({ bullPct = 50, className, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [favor, setFavor] = useState<"bull" | "bear" | null>(null);
  const [charge, setCharge] = useState<"bull" | "bear" | null>(null);

  const bull = Math.max(0, Math.min(100, bullPct));
  const bear = 100 - bull;

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
      setFavor(px < 0.45 ? "bull" : px > 0.55 ? "bear" : null);
    },
    [reduced],
  );

  const reset = () => {
    const el = ref.current;
    el?.style.setProperty("--px", "0");
    el?.style.setProperty("--py", "0");
    setFavor(null);
  };

  const strike = (side: "bull" | "bear") => {
    setCharge(side);
    window.setTimeout(() => setCharge(null), 700);
  };

  return (
    <div
      ref={ref}
      className={cn("arena", reduced && "arena--static", className)}
      data-favor={favor ?? "none"}
      data-charge={charge ?? "none"}
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) onMove(t.clientX, t.clientY);
      }}
      onTouchEnd={reset}
      role="img"
      aria-label={`Bull versus bear pressure: bulls ${bull}%, bears ${bear}%`}
    >
      <div className="arena__floor" aria-hidden="true" />
      <div className="arena__glow arena__glow--bull" aria-hidden="true" />
      <div className="arena__glow arena__glow--bear" aria-hidden="true" />

      <svg className="arena__stage" viewBox="0 0 640 300" aria-hidden="true">
        {/* candlestick silhouettes */}
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

        {/* BULL */}
        <g className="arena__fighter arena__fighter--bull">
          <path
            d="M110 210 L150 130 L196 108 L246 128 L268 168 L250 214 L200 232 L146 228 Z"
            className="arena__body arena__body--bull"
          />
          <path d="M196 108 L176 66 L206 84 M246 128 L272 82 L256 118" className="arena__horn" />
          <circle cx="228" cy="146" r="6" className="arena__eye arena__eye--bull" />
          <path d="M120 232 L150 250 M186 236 L192 258 M232 232 L246 254" className="arena__limb" />
        </g>

        {/* BEAR */}
        <g className="arena__fighter arena__fighter--bear">
          <path
            d="M530 210 L490 126 L440 104 L390 128 L370 170 L390 216 L442 234 L494 228 Z"
            className="arena__body arena__body--bear"
          />
          <path d="M440 104 L432 74 L458 92 M400 118 L388 82 L414 100" className="arena__claw" />
          <circle cx="412" cy="148" r="6" className="arena__eye arena__eye--bear" />
          <path d="M520 232 L492 252 M452 238 L446 260 M406 232 L392 254" className="arena__limb" />
        </g>

        {/* clash point */}
        <g className="arena__clash">
          <circle cx="320" cy="160" r="30" className="arena__clash-core" />
          <path
            d="M320 118 L326 152 L358 158 L326 168 L320 202 L314 168 L282 158 L314 152 Z"
            className="arena__spark"
          />
        </g>
      </svg>

      {/* touch/hover zones */}
      <button
        type="button"
        className="arena__zone arena__zone--left"
        onClick={() => strike("bull")}
        aria-label="Back the bulls"
      />
      <button
        type="button"
        className="arena__zone arena__zone--right"
        onClick={() => strike("bear")}
        aria-label="Back the bears"
      />

      {/* pressure bars */}
      <div className="arena__hud">
        <span className="arena__hud-label arena__hud-label--bull">Bulls {bull.toFixed(0)}%</span>
        <div className="arena__bar">
          <div className="arena__bar-fill" style={{ width: `${bull}%` }} />
        </div>
        <span className="arena__hud-label arena__hud-label--bear">Bears {bear.toFixed(0)}%</span>
      </div>
      {label && <p className="arena__caption">{label}</p>}
    </div>
  );
}
