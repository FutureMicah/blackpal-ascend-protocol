import { describe, expect, it } from "vitest";
import {
  XP,
  XP_PER_LEVEL,
  contestPassXp,
  levelForXp,
  winStreakMilestoneXp,
  xpForLevel,
} from "./progression";

describe("progression XP curve", () => {
  it("keeps the ordering: win streak > pass > participation > login", () => {
    const loginMax = Math.max(...Object.values(XP.loginStreak));
    const winMax =
      Math.max(...Object.values(XP.winStreak)) +
      contestPassXp(Math.max(...Object.keys(XP.winStreak).map(Number)));

    expect(XP.dailyLogin).toBe(2);
    expect(XP.contestParticipation).toBeGreaterThan(XP.dailyLogin);
    expect(XP.contestPass).toBeGreaterThan(XP.contestParticipation);
    expect(Math.max(...Object.values(XP.winStreak))).toBeGreaterThan(XP.contestPass);
    expect(loginMax).toBeLessThan(winMax);
    // participation (20) sits between the daily claim (2) and a pass (100)
    expect(XP.contestParticipation).toBeGreaterThan(loginMax / 10);
  });

  it("matches the XPReactor level curve: 1000 XP per level", () => {
    expect(XP_PER_LEVEL).toBe(1000);
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(1000);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(999)).toBe(1);
    expect(levelForXp(1000)).toBe(2);
    expect(levelForXp(1499)).toBe(2);
  });

  it("cumulative win-streak milestone XP escalates", () => {
    expect(winStreakMilestoneXp(0)).toBe(0);
    expect(winStreakMilestoneXp(1)).toBe(0);
    expect(winStreakMilestoneXp(2)).toBe(150);
    expect(winStreakMilestoneXp(3)).toBe(450);
    expect(winStreakMilestoneXp(4)).toBe(450);
    expect(winStreakMilestoneXp(5)).toBe(950);
    expect(winStreakMilestoneXp(10)).toBe(1950);
  });

  it("flat pass rewards scale linearly", () => {
    expect(contestPassXp(0)).toBe(0);
    expect(contestPassXp(1)).toBe(100);
    expect(contestPassXp(10)).toBe(1000);
  });

  it("keeps XP meaningfully hard: one level needs real effort", () => {
    // 1000 XP (one level) at the daily rate (2 XP) is 500 logins.
    expect(XP_PER_LEVEL / XP.dailyLogin).toBe(500);
    // at participation rate (20 XP/contest) it is 50 contested joins.
    expect(XP_PER_LEVEL / XP.contestParticipation).toBe(50);
    // at pass rate (100 XP) it is 10 contest passes; a 10-win streak
    // (1000 flat + 1950 milestone = 2950) is about 3 levels, hard-earned.
    expect(XP_PER_LEVEL / XP.contestPass).toBe(10);
    expect(contestPassXp(10) + winStreakMilestoneXp(10)).toBe(2950);
  });
});
