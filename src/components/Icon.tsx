/**
 * Single source of truth for icon styling across the app.
 *
 * Use:  <Icon as={Home} />  or  <Icon as={Home} size={14} />
 *
 * Defaults are enforced by the global CSS rule on `svg.lucide` in index.css
 * (purple primary color + 1.5 stroke). This wrapper makes the intent explicit
 * for new code and gives us a uniform default size.
 *
 * For status colors (P/L, success/error), wrap with className="icon-keep-color".
 */
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends Omit<LucideProps, "ref"> {
  as: LucideIcon;
}

export const Icon = ({ as: Component, size = 16, strokeWidth = 1.5, className, ...rest }: Props) => (
  <Component
    size={size}
    strokeWidth={strokeWidth}
    className={cn("lucide", className)}
    {...rest}
  />
);
