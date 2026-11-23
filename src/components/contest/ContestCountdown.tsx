import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/**
 * Ticking "time left" for a contest. `endsAt` is an ISO timestamp from the
 * server (UTC); the remaining time is derived from the client's clock so it
 * respects the absolute end instant regardless of the viewer's timezone.
 * Rendered server dates are also shown in the viewer's local timezone.
 */
export function parseEndsAt(endsAt: string | null | undefined): Date | null {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTimeLeft(msLeft: number): string {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h ${mins}m ${pad(secs)}s left`;
  if (mins > 0) return `${mins}m ${pad(secs)}s left`;
  return `${secs}s left`;
}

export function useTimeLeft(endsAt: string | null | undefined, tickMs = 1000) {
  const endMs = parseEndsAt(endsAt)?.getTime() ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endMs == null) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [endMs, tickMs]);
  if (endMs == null) return { ended: false, msLeft: 0 };
  const msLeft = endMs - now;
  return { ended: msLeft <= 0, msLeft };
}

export function ContestCountdown({ endsAt }: { endsAt: string | null | undefined }) {
  const end = parseEndsAt(endsAt);
  const { ended, msLeft } = useTimeLeft(endsAt);
  if (!end) return null;
  if (ended) {
    return (
      <span className="text-muted-foreground flex items-center gap-1">
        <Timer className="w-3 h-3" /> Ended {end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        <span className="sr-only">local time {end.toLocaleString()}</span>
      </span>
    );
  }
  const local = end.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return (
    <span
      className="text-muted-foreground flex items-center gap-1 tabular-nums"
      title={`Ends ${local}`}
      aria-label={`Time left: ${formatTimeLeft(msLeft)}. Ends ${local}`}
      aria-live="off"
    >
      <Timer className="w-3 h-3" />
      <span data-testid="contest-time-left">{formatTimeLeft(msLeft)}</span>
      <span className="opacity-70">({local})</span>
    </span>
  );
}
