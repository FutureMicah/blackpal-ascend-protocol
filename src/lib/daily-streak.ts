export interface DailyStreakUpdate {
  currentStreak: number;
  bestStreak: number;
  shouldWrite: boolean;
}

/** Returns YYYY-MM-DD in UTC so day boundaries are consistent across timezones. */
export function toUTCDateString(date: Date | string): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return parsed.toISOString().slice(0, 10);
}

/** Difference in whole UTC calendar days. Positive means `a` is after `b`. */
export function daysBetweenUTC(a: Date | string, b: Date | string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dateA = new Date(`${toUTCDateString(a)}T00:00:00.000Z`);
  const dateB = new Date(`${toUTCDateString(b)}T00:00:00.000Z`);
  return Math.round((dateA.getTime() - dateB.getTime()) / msPerDay);
}

export function calculateDailyStreakUpdate(
  lastLoginAt: Date | string | null,
  previousStreak: number,
  previousBest: number,
  now: Date | string,
): DailyStreakUpdate {
  const safeStreak = Math.max(0, Math.floor(previousStreak) || 0);
  const safeBest = Math.max(0, Math.floor(previousBest) || 0);
  let currentStreak: number;
  let shouldWrite: boolean;

  if (!lastLoginAt) {
    currentStreak = 1;
    shouldWrite = true;
  } else {
    const gap = daysBetweenUTC(now, lastLoginAt);
    // A last_login_at in the future (clock skew / bad data) must not be
    // punished: treat it as "already counted today", never as a break.
    if (gap < 0) {
      currentStreak = Math.max(safeStreak, 1);
      shouldWrite = false;
      return { currentStreak, bestStreak: Math.max(safeBest, currentStreak), shouldWrite };
    }
    if (gap === 0) {
      currentStreak = Math.max(safeStreak, 1);
      shouldWrite = false;
    } else if (gap === 1) {
      currentStreak = safeStreak + 1;
      shouldWrite = true;
    } else {
      currentStreak = 1;
      shouldWrite = true;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(safeBest, currentStreak),
    shouldWrite,
  };
}