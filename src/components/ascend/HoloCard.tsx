import { useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

export type Rarity = "initiate" | "operator" | "apex" | "sovereign";

interface Props {
  rarity?: Rarity;
  className?: string;
  children: ReactNode;
  /** Max tilt in degrees. */
  tilt?: number;
}

/**
 * Holographic NFT-style panel: cursor-following light reflection + 3D tilt.
 * Driven by CSS custom properties so React never re-renders on mouse move.
 */
export function HoloCard({ rarity = "initiate", className, children, tilt = 9 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--rx", `${((0.5 - py) * tilt * 2).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * tilt * 2).toFixed(2)}deg`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-rarity={rarity}
      className={cn("holo-card", className)}
    >
      <div className="holo-card__sheen" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
