// MT5 Connect — provisions a MetaApi account from a user's MT5 login + investor password
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const METAAPI_TOKEN = Deno.env.get("METAAPI_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REGION_HOST: Record<string, string> = {
  "new-york": "mt-provisioning-api-v1.new-york.agiliumtrade.ai",
  "london": "mt-provisioning-api-v1.london.agiliumtrade.ai",
  "singapore": "mt-provisioning-api-v1.singapore.agiliumtrade.ai",
};

function bad(status: number, message: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  // --- Auth: verify user JWT ---
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
  const targetRegion = region && REGION_HOST[region] ? region : "new-york";

  // --- Service role client for trusted writes ---
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify the account belongs to this user
  const { data: acct, error: acctErr } = await admin
    .from("user_prop_accounts")
    .select("id,user_id,metaapi_account_id,metaapi_region")
    .eq("id", accountId)
    .maybeSingle();
  if (acctErr || !acct) return bad(404, "Account not found");
  if (acct.user_id !== userId) return bad(403, "Forbidden");

  // Persist credentials (status=connecting). Uses an RPC so RLS-locked columns are written safely.
  const { error: credErr } = await admin.rpc("mt5_set_credentials", {
    p_account_id: accountId,
    p_login: String(login),
    p_investor_password: String(investorPassword),
    p_server: String(server),
    p_broker: broker ? String(broker) : null,
  });
  if (credErr) return bad(500, "Failed to save credentials", { detail: credErr.message });

  if (!METAAPI_TOKEN) {
    // Allow saving credentials before key exists, but report status clearly
    await admin.rpc("mt5_record_error", {
      p_account_id: accountId,
      p_error: "METAAPI_TOKEN not configured on server",
    });
    return bad(503, "METAAPI_TOKEN is not configured. Add it in Project Secrets and try again.");
  }

  const host = REGION_HOST[targetRegion];

  try {
    let metaapiId = acct.metaapi_account_id as string | null;

    if (!metaapiId) {
      // Create MetaApi account (investor access — read-only)
      const createRes = await fetch(`https://${host}/users/current/accounts`, {
        method: "POST",
        headers: {
          "auth-token": METAAPI_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `prop-${accountId.slice(0, 8)}`,
          type: "cloud",
          login: String(login),
          password: String(investorPassword),
          server: String(server),
          platform: "mt5",
          magic: 0,
          application: "MetaApi",
          region: targetRegion,
          accessType: "investor",
          // 5 minutes idle disconnect on the cheapest tier; keep small to limit cost
          reliability: "regular",
        }),
      });
      const createTxt = await createRes.text();
      if (!createRes.ok) {
        await admin.rpc("mt5_record_error", { p_account_id: accountId, p_error: `Create failed: ${createRes.status} ${createTxt.slice(0, 200)}` });
        return bad(502, "MetaApi rejected the credentials", { detail: createTxt });
      }
      const created = JSON.parse(createTxt);
      metaapiId = created.id as string;
    }

    // Deploy the account so MetaApi starts streaming
    const deployRes = await fetch(`https://${host}/users/current/accounts/${metaapiId}/deploy`, {
      method: "POST",
      headers: { "auth-token": METAAPI_TOKEN },
    });
    if (!deployRes.ok && deployRes.status !== 204) {
      const t = await deployRes.text();
      await admin.rpc("mt5_record_error", { p_account_id: accountId, p_error: `Deploy failed: ${deployRes.status} ${t.slice(0, 200)}` });
      return bad(502, "Failed to deploy MetaApi account", { detail: t });
    } else {
      await deployRes.text().catch(() => {});
    }

    // Mark account as provisioned + sync enabled
    const { error: markErr } = await admin.rpc("mt5_mark_provisioned", {
      p_account_id: accountId,
      p_metaapi_id: metaapiId,
      p_region: targetRegion,
    });
    if (markErr) return bad(500, "Saved on MetaApi but DB update failed", { detail: markErr.message });

    return new Response(
      JSON.stringify({ ok: true, metaapiAccountId: metaapiId, region: targetRegion, status: "connected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.rpc("mt5_record_error", { p_account_id: accountId, p_error: msg });
    return bad(500, "MT5 connect failed", { detail: msg });
  }
});
