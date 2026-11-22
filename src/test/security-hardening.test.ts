/**
 * Source-level guarantees for the 2026-11-23 security hardening branch.
 * These are static regression tests: they fail if the vulnerable patterns
 * reappear (unsigned passkey login, client-owned is_host, client balance
 * self-writes, unauthenticated paid AI endpoints, ungated MT5 sync).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("webauthn edge function", () => {
  const src = read("supabase/functions/webauthn/index.ts");
  it("verifies the assertion signature server-side before issuing a token", () => {
    expect(src).toContain("verifyAssertion");
    expect(src).toContain("signature verification failed");
    expect(src).toContain("crypto.subtle.verify");
  });
  it("binds the assertion to a one-time, expiring challenge", () => {
    expect(src).toContain("consumeChallenge");
    expect(src).toContain("challenge expired or already used");
    expect(src).toContain("challenge mismatch");
  });
  it("checks rpIdHash, origin, UP/UV flags and counter", () => {
    expect(src).toContain("rpIdHash mismatch");
    expect(src).toContain("origin mismatch");
    expect(src).toContain("user verification not verified");
    expect(src).toContain("signature counter did not increase");
  });
  it("does not advance the counter or mint a link on the pre-verification path", () => {
    const idx = src.indexOf("verifyAssertion(cred");
    const mintIdx = src.indexOf("generateLink");
    expect(idx).toBeGreaterThan(-1);
    expect(mintIdx).toBeGreaterThan(idx);
    expect(src).not.toContain("counter: cred.counter + 1");
  });
});

describe("client passkey flow", () => {
  const src = read("src/components/BiometricAuth.tsx");
  it("sends the server-issued sessionId with register and auth verify calls", () => {
    expect(src).toContain("sessionId: optionsData.sessionId");
    expect(src).toContain("attestation: response.attestation");
  });
});

describe("meeting host control", () => {
  const src = read("supabase/functions/create-daily-room/index.ts");
  it("derives is_owner server-side and ignores client is_host", () => {
    expect(src).toContain("Host claim is derived server-side");
    expect(src).not.toContain("!!body.is_host");
    expect(src).toContain("class_live_sessions");
    expect(src).toContain("has_role");
  });
});

describe("privileged sync / paid AI endpoints", () => {
  it("mt5-sync requires CRON_SECRET", () => {
    const src = read("supabase/functions/mt5-sync/index.ts");
    expect(src).toContain("CRON_SECRET");
    expect(src).toContain("x-cron-secret");
  });
  it("enhance-image requires an authenticated user and https URL", () => {
    const src = read("supabase/functions/enhance-image/index.ts");
    expect(src).toContain("requireUser");
    expect(src).toContain("validHttpsUrl");
    expect(src).toContain("Unauthorized");
  });
  it("stylize-avatar-3d requires an authenticated user and https URL", () => {
    const src = read("supabase/functions/stylize-avatar-3d/index.ts");
    expect(src).toContain("requireUser");
    expect(src).toContain("validHttpsUrl");
  });
  it("send-notification-email requires auth and takes sender from the token", () => {
    const src = read("supabase/functions/send-notification-email/index.ts");
    expect(src).toContain("requireUser");
    expect(src).toContain("const from_user_id = callerId");
    expect(src).toContain("function esc(");
  });
});

describe("client balance / payment self-writes removed", () => {
  it("BlackCoin no longer updates virtual_currency directly", () => {
    const src = read("src/pages/BlackCoin.tsx");
    expect(src).not.toContain("update({ virtual_currency:");
    expect(src).toContain("credited only after verified payment");
  });
  it("PaymentGateway no longer sets payment_completed from the client", () => {
    const src = read("src/pages/PaymentGateway.tsx");
    expect(src).not.toContain("update({ payment_completed:");
    expect(src).not.toContain("payment_status: 'completed'");
    expect(src).toContain("Payment submitted for review");
  });
});

describe("pending RLS migration present (not applied)", () => {
  it("authors the server-owned columns trigger and lessons policy", () => {
    const src = read("supabase/migrations/20261123000000_security_server_owned_balances.sql");
    expect(src).toContain("protect_profiles_sensitive_columns");
    expect(src).toContain("lessons enrolled read");
    expect(src).toContain("class_enrollments");
  });
});
