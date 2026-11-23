// Pure helpers for the progression / XP system.
// Keep the DB trigger logic and the client display in sync by deriving
// both from these constants. All values are also written into
// supabase/migrations/20261123230500_progression_xp_login_contest_win_streak.sql
// and supabase/functions/award-achievement/index.ts.

export const XP = {
  // Daily login claim (claim_daily_login RPC). BTAX side is 100 BTAX.
  dailyLogin: 2,
  // Login streak milestones (client -> award-achievement edge function ->
  // award_xp_once per milestone, idempotent).
  loginStreak: {
    7: 10,
    30: 30,
    100: 50,
    365: 100,
  } as Record<number, number>,
  // Contest participation: once per contest per user (xp_ledger unique
  // index on (user_id, source, source_id) with source_id = entry id).
  contestParticipation: 20,
  // Contest pass ("win"): flat reward on the in_progress -> passed
  // transition, once per contest entry.
  contestPass: 100,
  // Winning streak (consecutive contest passes) milestones: the largest
  // awards in the system, escalating.
  winStreak: {
    2: 150,
    3: 300,
    5: 500,
    10: 1000,
  } as Record<number, number>,
} as const;

/** Level curve in XPReactor: floor(xp / 1000) + 1. One level = 1000 XP. */
export const XP_PER_LEVEL = 1000;

/** XP required to reach a given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return Math.max(0, (level - 1) * XP_PER_LEVEL);
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

/**
 * What a win streak of `streak` consecutive contest passes is worth in
 * total milestone XP (cumulative across milestones hit so far).
 *
 * Example: 3 consecutive passes earned 150 (at 2) + 300 (at 3) = 450 XP
 * of win-streak milestones, plus 3 x 100 XP of flat pass rewards.
 */
export function winStreakMilestoneXp(streak: number): number {
  return Object.entries(XP.winStreak)
    .filter(([days]) => Number(days) <= streak)
    .reduce((sum, [, xp]) => sum + xp, 0);
}

/** Flat XP from `streak` consecutive contest passes (pass reward only). */
export function contestPassXp(passes: number): number {
  return Math.max(0, passes) * XP.contestPass;
}
