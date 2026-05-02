/**
 * Verifies that the BTAX wallet RPCs cannot be invoked anonymously.
 * The functions are SECURITY DEFINER but EXECUTE has been revoked from
 * `anon` and `PUBLIC`, and the function bodies also enforce role checks.
 *
 * These tests use the project's anon Supabase client (no session).
 * Every call MUST fail and surface a meaningful error.
 */
import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

describe("BTAX wallet RPCs — anonymous access", () => {
  it("ensures we are unauthenticated for these tests", async () => {
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });

  it("rejects fund_wallet for anonymous callers", async () => {
    const { data, error } = await supabase.rpc("fund_wallet", {
      p_user_id: "00000000-0000-0000-0000-000000000000",
      p_naira_amount: 1000,
      p_reference: "test",
      p_description: "anon test",
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    // Either Postgres EXECUTE-denied or our role-check exception
    expect(
      /permission denied|Not authorized|not authenticated/i.test(error?.message ?? "")
    ).toBe(true);
  });

  it("rejects spend_wallet for anonymous callers", async () => {
    const { data, error } = await supabase.rpc("spend_wallet", {
      p_btax_amount: 10,
      p_reference: "test",
      p_description: "anon test",
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(
      /permission denied|Not authenticated|Not authorized/i.test(error?.message ?? "")
    ).toBe(true);
  });

  it("rejects reward_user for anonymous callers", async () => {
    const { data, error } = await supabase.rpc("reward_user", {
      p_user_id: "00000000-0000-0000-0000-000000000000",
      p_btax_amount: 10,
      p_reward_type: "general",
      p_note: "anon test",
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(
      /permission denied|Not authorized|not authenticated/i.test(error?.message ?? "")
    ).toBe(true);
  });

  it("rejects allocate_sponsor_btax for anonymous callers", async () => {
    const { data, error } = await supabase.rpc("allocate_sponsor_btax", {
      p_student_user_id: "00000000-0000-0000-0000-000000000000",
      p_btax_amount: 10,
      p_note: "anon test",
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(
      /permission denied|Not authorized|not authenticated/i.test(error?.message ?? "")
    ).toBe(true);
  });
});
