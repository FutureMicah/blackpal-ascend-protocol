import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, Download, History, Loader2, Minus } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ScoreHistorySkeleton } from "./ContestSkeletons";
import { toast } from "sonner";

interface LogRow {
  id: string;
  change_kind: string;
  source: string;
  old_score: number | null;
  new_score: number | null;
  old_rank: number | null;
  new_rank: number | null;
  new_status: string | null;
  created_at: string;
}

const PAGE_SIZE = 25;
const ROW_HEIGHT = 22;

const download = (content: string, filename: string, type: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

/**
 * Per-user audit trail of every server-side rescore for this contest.
 * Paginated + virtualized so long histories never stall the Contest page.
 */
export function ContestScoreHistory({ contestId, userId }: { contestId: string; userId: string }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (from: number) => {
      const { data } = await supabase
        .from("contest_recompute_log")
        .select(
          "id, change_kind, source, old_score, new_score, old_rank, new_rank, new_status, created_at",
        )
        .eq("contest_id", contestId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      return (data as LogRow[]) ?? [];
    },
    [contestId, userId],
  );

  const loadFirst = useCallback(async () => {
    const page = await fetchPage(0);
    setRows(page);
    setHasMore(page.length === PAGE_SIZE);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const page = await fetchPage(0);
      if (cancelled) return;
      setRows(page);
      setHasMore(page.length === PAGE_SIZE);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`contest-log-${contestId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contest_recompute_log",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as LogRow & { contest_id?: string };
          if (next?.contest_id && next.contest_id !== contestId) return;
          setRows((prev) => (prev.some((r) => r.id === next.id) ? prev : [next, ...prev]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [contestId, userId, fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    const page = await fetchPage(rows.length);
    setRows((prev) => [...prev, ...page.filter((p) => !prev.some((r) => r.id === p.id))]);
    setHasMore(page.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const exportAll = async (fmt: "csv" | "json") => {
    setExporting(true);
    const { data, error } = await supabase
      .from("contest_recompute_log")
      .select("*")
      .eq("contest_id", contestId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5000);
    setExporting(false);
    if (error || !data?.length) {
      toast.error("Nothing to export yet");
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (fmt === "json") {
      download(JSON.stringify(data, null, 2), `contest-audit-${stamp}.json`, "application/json");
    } else {
      const cols = Object.keys(data[0] as Record<string, unknown>);
      const esc = (v: unknown) =>
        v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
      const csv = [
        cols.join(","),
        ...data.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(",")),
      ].join("\n");
      download(csv, `contest-audit-${stamp}.csv`, "text/csv;charset=utf-8");
    }
    toast.success(`Exported ${data.length} audit events`);
  };

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (loading) return <ScoreHistorySkeleton />;

  return (
    <Card className="p-3 space-y-2 tilt-3d">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold neon-text">Score history</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" disabled={exporting}>
              {exporting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Download className="w-3 h-3 mr-1" />
              )}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs" onClick={() => exportAll("csv")}>
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={() => exportAll("json")}>
              Download JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rows.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No rescores logged yet. The engine scores your run when trades close.
        </p>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="max-h-[220px] overflow-y-auto overscroll-contain"
            style={{ contain: "strict" }}
          >
            <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const r = rows[vi.index];
                const delta = Number(r.new_score ?? 0) - Number(r.old_score ?? 0);
                const Arrow = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
                const tone =
                  delta > 0 ? "text-emerald-500" : delta < 0 ? "text-destructive" : "text-muted-foreground";
                return (
                  <div
                    key={r.id}
                    ref={virtualizer.measureElement}
                    data-index={vi.index}
                    className="absolute left-0 w-full flex items-center justify-between gap-2 text-[10px] py-0.5"
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <Arrow className={`w-3 h-3 shrink-0 ${tone}`} />
                      <span className="tabular-nums font-medium">
                        {Number(r.new_score ?? 0).toFixed(1)}
                      </span>
                      <span className={`tabular-nums ${tone}`}>
                        ({delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)})
                      </span>
                      {r.new_rank != null && (
                        <span className="text-muted-foreground truncate">· rank #{r.new_rank}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {r.new_status && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          {r.new_status.replace("_", " ")}
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(r.created_at))} ago
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-muted-foreground">{rows.length} events loaded</span>
            {hasMore && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : "Load more"}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
