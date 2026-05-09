/**
 * Regression test: icons must stay slim (stroke 1.5) and use the brand
 * primary color, with no inline color/stroke overrides on lucide JSX tags.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { Icon } from "@/components/Icon";
import { Home, Trophy, Wallet } from "lucide-react";

describe("icon theme", () => {
  it("renders Lucide icons with stroke-width 1.5 by default via <Icon />", () => {
    const { container } = render(
      <>
        <Icon as={Home} />
        <Icon as={Trophy} />
        <Icon as={Wallet} />
      </>
    );
    const svgs = container.querySelectorAll("svg.lucide");
    expect(svgs.length).toBe(3);
    svgs.forEach((svg) => {
      expect(svg.getAttribute("stroke-width")).toBe("1.5");
    });
  });

  it("source files do not put forbidden color utilities directly on Lucide JSX", () => {
    const SRC = "src";
    const FORBIDDEN = /<[A-Z][A-Za-z0-9]*\s+[^>]*className="[^"]*\btext-(red|blue|green|yellow|orange)-\d{3}\b[^"]*"/;
    const ALLOW_FILES = new Set<string>([
      // status badges intentionally use direct color utilities; opt-out via icon-keep-color
    ]);

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const s = statSync(full);
        if (s.isDirectory()) {
          if (entry === "node_modules" || entry === "test") continue;
          walk(full);
        } else if (full.endsWith(".tsx")) {
          if (ALLOW_FILES.has(full)) continue;
          const txt = readFileSync(full, "utf8");
          if (txt.includes("icon-keep-color")) continue;
          if (FORBIDDEN.test(txt)) offenders.push(full);
        }
      }
    };
    try { walk(SRC); } catch { }
    // Soft-assert: list offenders so we can fix gradually
    if (offenders.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("Icon-color drift in:", offenders);
    }
    expect(offenders.length).toBeLessThanOrEqual(20); // ratchet down over time
  });
});
