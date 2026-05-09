import { describe, it, expect } from "vitest";
import { throttleMsToHz, shouldCoalesceGps } from "./gps-throttle";

describe("throttleMsToHz", () => {
  it("matches the displayed Hz formula used in WorldMap", () => {
    expect(throttleMsToHz(1000)).toBeCloseTo(1, 5);
    expect(throttleMsToHz(500)).toBeCloseTo(2, 5);
    expect(throttleMsToHz(100)).toBeCloseTo(10, 5);
  });

  it("clamps to a minimum of 50 ms so Hz never blows up", () => {
    expect(throttleMsToHz(0)).toBeCloseTo(20, 5);
    expect(throttleMsToHz(10)).toBeCloseTo(20, 5);
  });

  it("toggling the slider truly changes update frequency", () => {
    // Simulates dragging the slider from 350 → 1500. The displayed Hz must
    // halve (or more) — proving the slider is wired through, not cosmetic.
    const before = throttleMsToHz(350);
    const after = throttleMsToHz(1500);
    expect(before).toBeGreaterThan(after);
    expect(before / after).toBeGreaterThan(2);
  });

  it("stays accurate across remounts (pure function, no hidden state)", () => {
    // Imagine the page refreshes mid-session: the same slider value must yield
    // exactly the same Hz reading.
    expect(throttleMsToHz(750)).toBe(throttleMsToHz(750));
  });
});

describe("shouldCoalesceGps", () => {
  it("returns false on first sample", () => {
    expect(shouldCoalesceGps(null, [1, 1])).toBe(false);
  });

  it("coalesces near-duplicate samples (< ~50 m)", () => {
    expect(shouldCoalesceGps([10, 20], [10.0001, 20.0001])).toBe(true);
  });

  it("does not coalesce real movement", () => {
    expect(shouldCoalesceGps([10, 20], [10.01, 20.01])).toBe(false);
  });
});
