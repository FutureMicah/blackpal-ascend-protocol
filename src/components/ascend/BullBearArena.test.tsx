/**
 * Contest hero — Bull vs Bear arena replacing the old
 * "Drop your Lottie animation here" placeholder.
 *
 * Lightweight inline SVG/CSS only: no Lottie dependency, no remote asset,
 * no canvas, no animation library. Motion is transform/opacity only and the
 * pointer handlers write CSS custom properties instead of re-rendering.
 * prefers-reduced-motion renders the static poster state.
 *
 * Uses react-dom directly because @testing-library/dom is not installed in
 * this repo (the other component tests fail the same way on main).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setReducedMotion = (reduced: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduced,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
};

async function renderArena(props: { bullPct?: number; className?: string }) {
  vi.resetModules();
  const { BullBearArena } = await import("./BullBearArena");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<BullBearArena {...props} />);
  });
  return { host, root };
}

afterEach(async () => {
  setReducedMotion(false);
  document.body.innerHTML = "";
});

describe("BullBearArena (contest hero)", () => {
  it("renders the bull-vs-bear scene with an accessible pressure label", async () => {
    const { host } = await renderArena({ bullPct: 50, className: "arena--contest" });

    const arena = host.querySelector(".arena");
    expect(arena).not.toBeNull();
    expect(arena?.getAttribute("aria-label")).toMatch(/Bull versus bear pressure: bulls 50%, bears 50%/);
    expect(arena?.classList.contains("arena--contest")).toBe(true);

    // both fighters + clash point are present in the inline SVG
    expect(host.querySelectorAll("svg.arena__stage")).toHaveLength(1);
    expect(host.querySelector(".arena__fighter--bull")).not.toBeNull();
    expect(host.querySelector(".arena__fighter--bear")).not.toBeNull();
    expect(host.querySelector(".arena__clash")).not.toBeNull();
    expect(host.querySelector(".arena__horn")).not.toBeNull();
    expect(host.querySelector(".arena__claw")).not.toBeNull();

    // trading-contest energy, kept to the HUD pressure bar
    expect(host.querySelector(".arena__hud")).not.toBeNull();
    expect(host.textContent).toContain("Bulls 50%");
    expect(host.textContent).toContain("Bears 50%");

    // no placeholder copy, no Lottie, no remote assets
    expect(host.textContent).not.toContain("Drop your Lottie animation here");
    expect(host.querySelectorAll("img, video, canvas")).toHaveLength(0);
    expect(host.querySelectorAll("svg image")).toHaveLength(0);
  });

  it("clamps the bull percentage and mirrors the bear share", async () => {
    const { host } = await renderArena({ bullPct: 130 });
    expect(host.querySelector(".arena")?.getAttribute("aria-label")).toContain("bulls 100%, bears 0%");
  });

  it("adds the static class under prefers-reduced-motion", async () => {
    setReducedMotion(true);
    const { host } = await renderArena({ bullPct: 60 });

    const arena = host.querySelector(".arena");
    expect(arena?.classList.contains("arena--static")).toBe(true);
    // static poster state: same scoreboard, frozen fighters
    expect(arena?.getAttribute("aria-label")).toContain("bulls 60%, bears 40%");
  });
});
