import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for a contest card while the list streams in. */
export function ContestCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <Skeleton className="h-28 w-full rounded-lg" />
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </Card>
  );
}

/** Placeholder rows for the per-user score history audit trail. */
export function ScoreHistorySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="p-3 space-y-2">
      <Skeleton className="h-3 w-24" />
      <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
