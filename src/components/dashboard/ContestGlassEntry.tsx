import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Glass panel with a bending top edge. Links into the live contest. */
export const ContestGlassEntry = () => {
  const navigate = useNavigate();
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("contests")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .then(({ count }) => {
        if (!cancelled) setLive(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative mb-4 overflow-hidden" style={{ minHeight: 132 }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 140"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="dash-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d9fbff" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#041016" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <path
          d="M0 34
             C70 6 120 52 190 22
             C250 -2 310 40 400 14
             L400 128
             C300 140 220 112 140 128
             C70 142 30 124 0 132
             Z"
          fill="url(#dash-glass)"
          stroke="rgba(103,232,249,0.45)"
          strokeWidth="1.2"
        />
      </svg>

      <div className="relative flex items-end justify-between gap-3 px-5 pb-5 pt-9">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/80">Live floor</p>
          <h2 className="text-base sm:text-lg font-semibold text-white leading-tight">
            Trading contest
          </h2>
          <p className="text-[11px] text-white/60 mt-1">
            {live === null
              ? "Checking who is in…"
              : live === 0
              ? "No live contest right now. The next one lands here."
              : `${live} live ${live === 1 ? "contest" : "contests"}. Trade it. Climb it.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/contest")}
          className="shrink-0 h-9 px-3 text-xs font-semibold text-black bg-cyan-300 hover:bg-cyan-200 transition-colors"
          style={{
            borderRadius: "999px 999px 999px 28px",
            clipPath: "path('M8 4 C40 0 92 2 108 16 C120 28 112 36 96 38 L18 40 C6 40 0 32 2 20 C4 10 4 6 8 4 Z')",
          }}
        >
          Enter
        </button>
      </div>
    </section>
  );
};
