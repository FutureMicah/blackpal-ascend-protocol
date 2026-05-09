import { describe, it, expect } from "vitest";
import { buildRealtimeReport } from "./realtime-report";

describe("buildRealtimeReport", () => {
  it("produces a stable timestamped header", () => {
    const r = buildRealtimeReport([]);
    expect(r).toMatch(/^# BlackPal — Realtime Verification Log/);
    expect(r).toMatch(/Generated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(r).toContain("Entries: 0");
    expect(r).toContain("(no events captured)");
  });

  it("renders ordered, indexed events with channel + summary", () => {
    const r = buildRealtimeReport([
      { at: "2026-05-09T12:00:00.000Z", channel: "rate", summary: "1 BTAX = ₦100 · live" },
      { at: "2026-05-09T12:00:01.000Z", channel: "atlas", summary: "enriched 3 profile(s)" },
    ]);
    expect(r).toContain("001. 2026-05-09T12:00:00.000Z [rate] 1 BTAX = ₦100 · live");
    expect(r).toContain("002. 2026-05-09T12:00:01.000Z [atlas] enriched 3 profile(s)");
    expect(r).toContain("- rate: 1");
    expect(r).toContain("- atlas: 1");
  });

  it("uses the same format across sessions (deterministic given inputs)", () => {
    const entries = [
      { at: "2026-05-09T12:00:00.000Z", channel: "rate", summary: "x" },
    ];
    const a = buildRealtimeReport(entries).split("\n").slice(5).join("\n");
    const b = buildRealtimeReport(entries).split("\n").slice(5).join("\n");
    expect(a).toBe(b);
  });
});
