import { describe, it, expect } from "vitest";
import { formatTimeLeft, parseEndsAt } from "@/components/contest/ContestCountdown";

describe("formatTimeLeft", () => {
  it("formats seconds, minutes, hours and days", () => {
    expect(formatTimeLeft(5_000)).toBe("5s left");
    expect(formatTimeLeft(65_000)).toBe("1m 05s left");
    expect(formatTimeLeft(3_661_000)).toBe("1h 1m 01s left");
    expect(formatTimeLeft(90_061_000)).toBe("1d 1h 1m left");
  });
  it("clamps negative values to zero", () => {
    expect(formatTimeLeft(-1_000)).toBe("0s left");
  });
});

describe("parseEndsAt", () => {
  it("returns null for missing or invalid dates", () => {
    expect(parseEndsAt(null)).toBeNull();
    expect(parseEndsAt(undefined)).toBeNull();
    expect(parseEndsAt("not-a-date")).toBeNull();
  });
  it("parses an ISO UTC timestamp to the same instant", () => {
    expect(parseEndsAt("2026-11-30T12:00:00.000Z")?.toISOString()).toBe("2026-11-30T12:00:00.000Z");
  });
});
