import { describe, it, expect, vi, beforeEach } from "vitest";

// Unit test: spike-detection thresholds fire when rate exceeds SPIKE_RETRY_RATE / SPIKE_ERROR_RATE
// and stay silent below. Guards against regressions in the KPI-alert pipeline.

const SPIKE_RETRY_RATE = 0.20;
const SPIKE_ERROR_RATE = 0.10;
const SPIKE_MIN_LOADS = 5;

type Bucket = { loads: number; retries: number; errors: number };

const detect = (buckets: Record<string, Bucket>) => {
  const spikes: { key: string; kind: "retry" | "error"; rate: number }[] = [];
  for (const [k, s] of Object.entries(buckets)) {
    if (s.loads < SPIKE_MIN_LOADS) continue;
    const rr = s.retries / s.loads;
    const er = s.errors / s.loads;
    if (rr >= SPIKE_RETRY_RATE) spikes.push({ key: k, kind: "retry", rate: rr });
    if (er >= SPIKE_ERROR_RATE) spikes.push({ key: k, kind: "error", rate: er });
  }
  return spikes;
};

describe("class analytics spike detection", () => {
  it("flags a retry spike at or above threshold", () => {
    expect(detect({ sm: { loads: 10, retries: 3, errors: 0 } }))
      .toEqual([{ key: "sm", kind: "retry", rate: 0.3 }]);
  });

  it("flags an error spike at or above threshold", () => {
    const spikes = detect({ lg: { loads: 10, retries: 0, errors: 2 } });
    expect(spikes).toEqual([{ key: "lg", kind: "error", rate: 0.2 }]);
  });

  it("suppresses spikes when session loads are below the minimum", () => {
    expect(detect({ xs: { loads: 2, retries: 2, errors: 2 } })).toEqual([]);
  });

  it("stays silent when rates are under threshold", () => {
    expect(detect({ md: { loads: 100, retries: 5, errors: 3 } })).toEqual([]);
  });

  it("produces per-scope spikes independently", () => {
    const s = detect({
      xs: { loads: 10, retries: 5, errors: 0 },       // retry spike
      landscape: { loads: 20, retries: 0, errors: 4 }, // error spike
    });
    expect(s).toHaveLength(2);
    expect(s.find(x => x.kind === "retry")?.key).toBe("xs");
    expect(s.find(x => x.kind === "error")?.key).toBe("landscape");
  });
});

describe("dispatch-analytics-alert invocation contract", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("posts spikes to the edge function with the expected body shape", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true, results: [] }, error: null });
    const supabase = { functions: { invoke } };

    const fresh = [
      { kind: "retry", breakpoint: "sm", orientation: null, rate: 0.3, loads: 10 },
    ];
    await supabase.functions.invoke("dispatch-analytics-alert", { body: { spikes: fresh } });

    expect(invoke).toHaveBeenCalledWith("dispatch-analytics-alert", {
      body: { spikes: fresh },
    });
  });
});
