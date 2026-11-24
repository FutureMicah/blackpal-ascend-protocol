import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { TrophyCupArena } from "./TrophyCupArena";

async function renderArena(props: { className?: string; label?: string } = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<TrophyCupArena {...props} />);
  });
  return { host, root };
}

describe("TrophyCupArena (contest hero)", () => {
  it("renders a trophy cup with className passthrough", async () => {
    const { host } = await renderArena({ className: "arena--contest" });
    const arena = host.querySelector(".arena");
    expect(arena).toBeTruthy();
    expect(arena?.classList.contains("arena--contest")).toBe(true);
    expect(host.querySelector(".trophy__cup")).toBeTruthy();
    expect(host.querySelector(".trophy__spark")).toBeTruthy();
    expect(host.querySelector(".arena__stage")).toBeTruthy();
    expect(host.querySelector('[aria-label="Contest trophy cup"]')).toBeTruthy();
  });

  it("contains no bull or bear references", async () => {
    const { host } = await renderArena();
    expect(host.innerHTML.toLowerCase()).not.toContain("bull");
    expect(host.innerHTML.toLowerCase()).not.toContain("bear");
  });

  it("celebrate button toggles charge state on click", async () => {
    const { host } = await renderArena();
    const button = host.querySelector<HTMLButtonElement>("button");
    expect(button).toBeTruthy();
    await act(async () => {
      button?.click();
    });
    expect(host.querySelector(".arena")?.getAttribute("data-charge")).toBe("trophy");
  });
});
