import { describe, it, expect } from "vitest";
import {
  isAnnouncementVisible,
  describeAnnouncementWindow,
} from "./announcement-targeting";

// E2E parity: this predicate is the same logic the admin preview surfaces and
// the same logic the publish RLS rule applies. If these tests pass, what the
// admin sees in "Preview · simulated targeting" matches what users will see.
describe("isAnnouncementVisible", () => {
  const NOW = new Date("2026-05-09T12:00:00Z");

  it("is visible to everyone when no window and no roles", () => {
    expect(isAnnouncementVisible({}, NOW, [])).toBe(true);
    expect(isAnnouncementVisible({}, NOW, ["student"])).toBe(true);
  });

  it("respects starts_at — future window is hidden", () => {
    expect(
      isAnnouncementVisible(
        { starts_at: "2026-05-10T00:00:00Z" },
        NOW,
        ["student"],
      ),
    ).toBe(false);
  });

  it("respects ends_at — expired window is hidden", () => {
    expect(
      isAnnouncementVisible(
        { ends_at: "2026-05-09T11:00:00Z" },
        NOW,
        ["student"],
      ),
    ).toBe(false);
  });

  it("is visible exactly at starts_at boundary", () => {
    expect(
      isAnnouncementVisible({ starts_at: NOW.toISOString() }, NOW, []),
    ).toBe(true);
  });

  it("is hidden exactly at ends_at boundary (half-open interval)", () => {
    expect(
      isAnnouncementVisible({ ends_at: NOW.toISOString() }, NOW, []),
    ).toBe(false);
  });

  it("targets a specific role only", () => {
    const ann = { target_roles: ["admin"] };
    expect(isAnnouncementVisible(ann, NOW, ["student"])).toBe(false);
    expect(isAnnouncementVisible(ann, NOW, ["admin"])).toBe(true);
    expect(isAnnouncementVisible(ann, NOW, ["student", "admin"])).toBe(true);
  });

  it("combines window + roles", () => {
    const ann = {
      starts_at: "2026-05-09T10:00:00Z",
      ends_at: "2026-05-09T13:00:00Z",
      target_roles: ["sponsor"],
    };
    expect(isAnnouncementVisible(ann, NOW, ["sponsor"])).toBe(true);
    expect(isAnnouncementVisible(ann, NOW, ["student"])).toBe(false);
    // Outside window
    expect(
      isAnnouncementVisible(ann, new Date("2026-05-09T14:00:00Z"), ["sponsor"]),
    ).toBe(false);
  });
});

describe("describeAnnouncementWindow", () => {
  it("labels indefinite windows as VISIBLE NOW", () => {
    const s = describeAnnouncementWindow({});
    expect(s).toContain("VISIBLE NOW");
    expect(s).toContain("indefinite");
  });

  it("labels expired windows as scheduled / expired", () => {
    const s = describeAnnouncementWindow({
      ends_at: "2020-01-01T00:00:00Z",
    });
    expect(s).toContain("scheduled / expired");
  });
});
