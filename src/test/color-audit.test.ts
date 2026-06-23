/**
 * CI guardrail: cap the number of color-token violations so the app
 * cannot drift further away from the purple design system.
 */
import { describe, it, expect } from "vitest";
import findings from "../../scripts/color-audit.mjs";

describe("color audit", () => {
  it("does not exceed the agreed drift ceiling", () => {
    // Capture today's number; lower it as we clean up.
    const CEILING = 810;
    expect((findings as any[]).length).toBeLessThanOrEqual(CEILING);
  });
});
