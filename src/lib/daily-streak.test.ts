import { describe, expect, it } from "vitest";
import { calculateDailyStreakUpdate } from "./daily-streak";

describe("calculateDailyStreakUpdate", () => {
  it("does not change or rewrite a streak on another visit the same UTC day", () => {
    expect(
      calculateDailyStreakUpdate(
        "2026-11-17T01:00:00.000Z",
        6,
        8,
        "2026-11-17T23:00:00.000Z",
      ),
    ).toEqual({ currentStreak: 6, bestStreak: 8, shouldWrite: false });
  });

  it("increments once after a consecutive UTC day", () => {
    expect(
      calculateDailyStreakUpdate(
        "2026-11-16T23:59:00.000Z",
        6,
        8,
        "2026-11-17T00:01:00.000Z",
      ),
    ).toEqual({ currentStreak: 7, bestStreak: 8, shouldWrite: true });
  });

  it("resets after a missed UTC day", () => {
    expect(
      calculateDailyStreakUpdate(
        "2026-11-15T12:00:00.000Z",
        6,
        8,
        "2026-11-17T12:00:00.000Z",
      ),
    ).toEqual({ currentStreak: 1, bestStreak: 8, shouldWrite: true });
  });

  it("starts the first login at day one", () => {
    expect(
      calculateDailyStreakUpdate(null, 0, 0, "2026-11-17T12:00:00.000Z"),
    ).toEqual({ currentStreak: 1, bestStreak: 1, shouldWrite: true });
  });

  it("treats a future last_login_at (clock skew) as already counted today", () => {
    expect(
      calculateDailyStreakUpdate(
        "2026-11-18T00:00:00.000Z",
        6,
        8,
        "2026-11-17T12:00:00.000Z",
      ),
    ).toEqual({ currentStreak: 6, bestStreak: 8, shouldWrite: false });
  });

  it("never drops best streak for stale or negative stored values", () => {
    expect(
      calculateDailyStreakUpdate(null, 0, -5, "2026-11-17T12:00:00.000Z"),
    ).toEqual({ currentStreak: 1, bestStreak: 1, shouldWrite: true });
  });
});
