/**
 * Resilient single-profile fetch helpers for the self-dashboard.
 *
 * The live report was Safari's opaque "TypeError: Load failed" (a fetch that
 * rejected before any HTTP response). Retrying transient network failures
 * with a short backoff turns that one-shot dead-end into a recovery, and
 * mapping the error to plain words stops the raw engine message reaching
 * the user.
 */

export interface ProfileError {
  message: string;
  code: string;
}

const NETWORK_HINTS = [
  "load failed",
  "failed to fetch",
  "networkerror",
  "network request failed",
  "typeerror",
];

export function isTransientProfileError(error: unknown): boolean {
  // Our own timeout is always retryable. Compare by name: the class is
  // declared further down, so an instanceof check here would not work.
  if ((error as { name?: unknown })?.name === "ProfileLoadTimeout") return true;
  const message = String((error as { message?: unknown })?.message ?? error ?? "").toLowerCase();
  if (NETWORK_HINTS.some((hint) => message.includes(hint))) return true;
  const code = String((error as { code?: unknown })?.code ?? "");
  // Supabase/PostgREST transient codes: timeout, connection reset, 5xx are
  // surfaced as PostgrestError with these codes in practice.
  return code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ECONNRESET";
}

export function friendlyProfileError(error: unknown): ProfileError {
  const raw = String((error as { message?: unknown })?.message ?? error ?? "Unknown error");
  const code = String((error as { code?: unknown })?.code ?? "");
  const lower = raw.toLowerCase();

  if (code === "PGRST116" || lower.includes("0 rows")) {
    return {
      code: "PROFILE_NOT_FOUND",
      message: "Profile not found. If you just signed up, give it a few seconds and try again.",
    };
  }
  if (code === "PGRST301" || lower.includes("jwt") || lower.includes("not authenticated")) {
    return {
      code: "SESSION_EXPIRED",
      message: "Your session expired. Please sign in again.",
    };
  }
  if (
    (error as { name?: unknown })?.name === "ProfileLoadTimeout" ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return {
      code: "TIMEOUT",
      message: "Loading your profile is taking too long. Check your connection and try again.",
    };
  }
  if (isTransientProfileError(error)) {
    return {
      code: "CONNECTION",
      message: "Connection hiccup while loading your profile. Check your connection and try again.",
    };
  }
  return { code: "GENERIC", message: raw || "Failed to load profile. Please try again." };
}

export class ProfileLoadTimeout extends Error {
  constructor() {
    super("Profile request timed out");
    this.name = "ProfileLoadTimeout";
  }
}

/** Race a promise against a timeout so a hung request never spins forever. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new ProfileLoadTimeout()), ms);
  });
  // Promise.race alone leaves the losing promise's late rejection unhandled
  // (a console error / potential crash in strict runtimes). Attach no-op
  // handlers so whichever side loses is swallowed quietly.
  const guarded = Promise.resolve(promise);
  guarded.catch(() => {});
  timeout.catch(() => {});
  return Promise.race([guarded, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying transient failures with exponential backoff.
 * Non-transient errors (e.g. a missing row) throw immediately.
 */
export async function retryTransient<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseDelayMs = opts.baseDelayMs ?? 600;
  const sleep = opts.sleep ?? defaultSleep;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = attempt === attempts - 1;
      if (isLast || !isTransientProfileError(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
