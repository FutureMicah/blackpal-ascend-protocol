import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, type LucideIcon } from "lucide-react";

interface Props {
  title: string;
  icon?: LucideIcon;
  /** Number of underlying data rows (used to decide empty state). If undefined, no empty check. */
  dataCount?: number;
  /** Override loading state. When undefined, a brief auto-skeleton (~600ms) is shown on mount. */
  loading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard wrapper for Admin → Settings tab panels.
 * Guarantees:
 *   • A visible loading skeleton on first render so the panel never looks blank.
 *   • A friendly "no data" empty state when dataCount === 0.
 */
export function AdminSettingsPanelShell({
  title,
  icon: Icon,
  dataCount,
  loading,
  emptyMessage = "No data yet. This panel will fill in as activity happens.",
  children,
  className,
}: Props) {
  const [autoLoading, setAutoLoading] = useState(loading ?? true);

  useEffect(() => {
    if (loading !== undefined) return;
    const t = window.setTimeout(() => setAutoLoading(false), 500);
    return () => window.clearTimeout(t);
  }, [loading]);

  const isLoading = loading ?? autoLoading;
  const isEmpty = !isLoading && dataCount === 0;

  return (
    <Card className={`border-border bg-card/80 ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {Icon && <Icon className="w-4 h-4 text-primary" />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-live="polite">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-32" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground gap-2">
            <Inbox className="w-8 h-8 opacity-50" />
            <p className="text-xs">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
