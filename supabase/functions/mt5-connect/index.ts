// MT5 Connect — opens a metatraderapi.cloud session from a user's MT5 login + investor password.
// The returned session_id is stored on user_prop_accounts and reused by mt5-sync for polling.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MT5_API_KEY = Deno.env.get("MT5_API_KEY") ?? Deno.env.get("METAAPI_TOKEN") ?? "";
const MT5_API_BASE = Deno.env.get("MT5_API_BASE") ?? "https://metatraderapi.cloud";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function bad(status: number, message: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  // --- Auth ---
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return bad(401, "Unauthorized");
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return bad(401, "Invalid session");
  const userId = claims.claims.sub as string;

  // --- Input ---
  let body: any;
  try { body = await req.json(); } catch { return bad(400, "Invalid JSON"); }
  const { accountId, login, investorPassword, server, broker, region } = body ?? {};
  if (!accountId || !login || !investorPassword || !server) {
    return bad(400, "accountId, login, investorPassword and server are required");
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify ownership
  const { data: acct, error: acctErr } = await admin
    .from("user_prop_accounts")
    .select("id,user_id,metaapi_account_id")
    .eq("id", accountId)
    .maybeSingle();
  if (acctErr || !acct) return bad(404, "Account not found");
  if (acct.user_id !== userId) return bad(403, "Forbidden");

  // Persist credentials (status=connecting) before talking to the provider
  const { error: credErr } = await admin.rpc("mt5_set_credentials", {
    p_account_id: accountId,
    p_login: String(login),
    p_investor_password: String(investorPassword),
    p_server: String(server),
    p_broker: broker ? String(broker) : null,
  });
  if (credErr) return bad(500, "Failed to save credentials", { detail: credErr.message });

  if (!MT5_API_KEY) {
    await admin.rpc("mt5_record_error", {
      p_account_id: accountId,
      p_error: "MT5_API_KEY not configured on server",
    });
    return bad(503, "MT5_API_KEY is not configured. Add it in Project Secrets and try again.");
  }

  try {
    // Open a metatraderapi.cloud session
    const startRes = await fetch(`${MT5_API_BASE}/api/sessions/start/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MT5_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        account_id: String(login),
        password: String(investorPassword),
        server: String(server),
      }),
    });
    const startTxt = await startRes.text();
    if (!startRes.ok) {
      await admin.rpc("mt5_record_error", {
        p_account_id: accountId,
        p_error: `Session start failed: ${startRes.status} ${startTxt.slice(0, 200)}`,
      });
      return bad(502, "MT5 provider rejected the credentials", { detail: startTxt });
    }
    const parsed = startTxt ? JSON.parse(startTxt) : {};
    const sessionId: string | undefined = parsed.session_id ?? parsed.sessionId ?? parsed.id;
    if (!sessionId) {
      await admin.rpc("mt5_record_error", {
        p_account_id: accountId,
        p_error: "Session start returned no session_id",
      });
      return bad(502, "MT5 provider returned no session_id", { raw: parsed });
    }

    // Reuse metaapi_account_id column to store the session_id (semantic: "provider remote id")
    const { error: markErr } = await admin.rpc("mt5_mark_provisioned", {
      p_account_id: accountId,
      p_metaapi_id: sessionId,
      p_region: region ?? "default",
    });
    if (markErr) return bad(500, "Saved session but DB update failed", { detail: markErr.message });

    return new Response(
      JSON.stringify({ ok: true, sessionId, status: "connected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.rpc("mt5_record_error", { p_account_id: accountId, p_error: msg });
    return bad(500, "MT5 connect failed", { detail: msg });
  }
});
