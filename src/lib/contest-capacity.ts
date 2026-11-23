/**
 * Per-contest capacity helpers.
 *
 * max_entries = null means unlimited (existing contests stay unlimited
 * until an admin sets a cap, so no arbitrary restrictive default).
 * A cap below the current entrant count never deletes anyone: the
 * contest reads as full / over capacity and new joins are blocked
 * until the entrant count drops under the cap again.
 */

export type CapacityStatus = "unlimited" | "open" | "full" | "over_capacity";

export interface CapacityInfo {
  status: CapacityStatus;
  /** null when unlimited */
  max: number | null;
  entrants: number;
  /** null when unlimited */
  spotsRemaining: number | null;
  isFull: boolean;
}

const toCount = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** Normalise a stored max_entries value: null/undefined/empty/invalid => unlimited. */
export function normalizeMaxEntries(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  return int >= 1 ? int : null;
}

export interface MaxEntriesParse {
  value: number | null;
  error: string | null;
}

/**
 * Parse an admin-entered max-contestants value.
 * Empty means unlimited. Otherwise it must be a whole number >= 1.
 * (0 is rejected: to close a contest, deactivate it instead.)
 */
export function parseMaxEntriesInput(raw: string | number | null | undefined): MaxEntriesParse {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { value: null, error: null };
  }
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    return { value: null, error: "Max contestants must be a whole number of at least 1 (leave empty for unlimited)" };
  }
  if (n > 1_000_000) {
    return { value: null, error: "Max contestants must be at most 1,000,000" };
  }
  return { value: n, error: null };
}

export function capacityInfo(entrantCount: unknown, maxEntries: unknown): CapacityInfo {
  const entrants = toCount(entrantCount);
  const max = normalizeMaxEntries(maxEntries);
  if (max === null) {
    return { status: "unlimited", max: null, entrants, spotsRemaining: null, isFull: false };
  }
  const spotsRemaining = Math.max(0, max - entrants);
  const status: CapacityStatus =
    entrants > max ? "over_capacity" : entrants >= max ? "full" : "open";
  return { status, max, entrants, spotsRemaining, isFull: status !== "open" };
}

export function isContestFull(entrantCount: unknown, maxEntries: unknown): boolean {
  return capacityInfo(entrantCount, maxEntries).isFull;
}

/** True when this user may join: not already in, not ended, and not full. */
export function canJoinContest(opts: {
  entrantCount: unknown;
  maxEntries: unknown;
  alreadyJoined?: boolean;
  ended?: boolean;
}): boolean {
  if (opts.alreadyJoined || opts.ended) return false;
  return !isContestFull(opts.entrantCount, opts.maxEntries);
}

export function formatCapacity(entrantCount: unknown, maxEntries: unknown): string {
  const info = capacityInfo(entrantCount, maxEntries);
  if (info.max === null) return `${info.entrants} entered · unlimited spots`;
  return `${info.entrants} / ${info.max} entered`;
}

export function isContestEntryCapacityError(
  error: unknown,
): boolean {
  if (!error) return false;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String((error as { message?: string }).message ?? "");
  const val = msg.toLowerCase();
  return (
    val.includes("contest is full") ||
    val.includes("contest is over capacity") ||
    val.includes("contest_full") ||
    val.includes("contest_over_capacity") ||
    val.includes("maximum number of contestants") ||
    ((error as { code?: string }).code === "P0001" && val.includes("contest"))
  );
}

/** Back-compat alias used by Contest.tsx. */
export const isCapacityError = isContestEntryCapacityError;
