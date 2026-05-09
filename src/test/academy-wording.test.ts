/**
 * Wording guardrail: this is an academy, not an investment platform.
 * Fails when banned investment-style copy is reintroduced into user-facing UI.
 *
 * The list is conservative — adjust the ceiling as the codebase is cleaned up.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

const BANNED = [
  /\binvestor(s)?\b/gi,
  /\binvestment(s)?\b/gi,
  /\bROI\b/g,
  /\bportfolio value\b/gi,
  /\bfund manager\b/gi,
  /\bprofit target\b/gi,
];

const ALLOW_FILES = new Set([
  "src/test/academy-wording.test.ts",
  "src/lib/academy-copy.ts",
]);

const offenders: string[] = [];
const walk = (dir: string) => {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    const s = statSync(f);
    if (s.isDirectory()) {
      if (e === "node_modules") continue;
      walk(f);
    } else if (/\.(tsx?|md)$/.test(f) && !ALLOW_FILES.has(f)) {
      const txt = readFileSync(f, "utf8");
      if (BANNED.some((re) => re.test(txt))) offenders.push(f);
    }
  }
};
walk("src");

describe("academy wording", () => {
  it("does not exceed the investment-language drift ceiling", () => {
    const CEILING = 60;
    if (offenders.length) {
      // eslint-disable-next-line no-console
      console.warn("Investment-style wording in:", offenders.slice(0, 30));
    }
    expect(offenders.length).toBeLessThanOrEqual(CEILING);
  });
});
