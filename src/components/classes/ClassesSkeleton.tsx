import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, GraduationCap } from "lucide-react";

export const ClassesSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 max-w-6xl space-y-5">
    <div className="rounded-3xl border border-primary/20 bg-card/40 p-5 sm:p-8">
      <Skeleton className="h-3 w-32 mb-3" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-3 w-64" />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card/40 overflow-hidden">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const LoadErrorState = ({ onRetry, message }: { onRetry: () => void; message?: string }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
    <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
      <AlertCircle className="w-7 h-7 text-destructive" />
    </div>
    <div>
      <p className="font-semibold text-foreground flex items-center justify-center gap-2">
        <GraduationCap className="w-4 h-4" /> Couldn't load classes
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        {message || "Check your connection and try again. Your enrollment data is safe."}
      </p>
    </div>
    <Button onClick={onRetry} size="lg" className="min-h-11 px-6">
      <RefreshCw className="w-4 h-4 mr-2" /> Retry
    </Button>
  </div>
);
