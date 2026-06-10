// MT5 Sync — polls MetaApi REST for every connected account and applies an atomic snapshot.
// Designed to run every 30s via pg_cron + pg_net (see scheduling SQL in app code).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const METAAPI_TOKEN = Deno.env.get("METAAPI_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REGION_CLIENT: Record<string, string> = {
  "new-york": "mt-client-api-v1.new-york.agiliumtrade.ai",
  "london": "mt-client-api-v1.london.agiliumtrade.ai",
  "singapore": "mt-client-api-v1.singapore.agiliumtrade.ai",
};

interface Account {
  id: string;
  user_id: string;
  metaapi_account_id: string;
  metaapi_region: string;
}

interface Deal {
  ticket: string | number;
  symbol: string;
  type: string;
  lots: number;
  openPrice: number;
  closePrice?: number;
  profit: number;
  commission?: number;
  swap?: number;
  openedAt: string;
  closedAt: string;
  magic?: number;
  comment?: string;
}

async function metaapiJson(host: string, path: string): Promise<any> {
  const res = await fetch(`https://${host}${path}`, {
    headers: { "auth-token": METAAPI_TOKEN, "Accept": "application/json" },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path} — ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : null;
}

async function syncOne(admin: ReturnType<typeof createClient>, acct: Account, sinceISO: string) {
  const host = REGION_CLIENT[acct.metaapi_region] ?? REGION_CLIENT["new-york"];
  const base = `/users/current/accounts/${acct.metaapi_account_id}`;

  // 1) Account information (balance, equity, margin)
  const info = await metaapiJson(host, `${base}/accountInformation`);
  // 2) Currently open positions (count + floating P/L is already in equity)
  const positions = await metaapiJson(host, `${base}/positions`);
  // 3) Recently closed deals for this account
  const nowISO = new Date().toISOString();
  const deals = await metaapiJson(
    host,
    `${base}/history-deals/time/${encodeURIComponent(sinceISO)}/${encodeURIComponent(nowISO)}`,
  );

  // Normalize MetaApi deals -> snapshot deals (only DEAL_TYPE_BUY/SELL closed entries with profit)
  const closedDeals: Deal[] = [];
  if (Array.isArray(deals)) {
    for (const d of deals) {
      // MetaApi deal entry types: DEAL_ENTRY_OUT closes a position, DEAL_ENTRY_INOUT reverses
      if (d.entryType !== "DEAL_ENTRY_OUT" && d.entryType !== "DEAL_ENTRY_INOUT") continue;
      closedDeals.push({
        ticket: d.id ?? d.orderId ?? d.positionId,
        symbol: d.symbol ?? "?",
        type: (d.type === "DEAL_TYPE_BUY" ? "SELL" : "BUY"), // closing side is opposite of opening
        lots: Number(d.volume ?? 0),
        openPrice: Number(d.openPrice ?? 0),
        closePrice: Number(d.price ?? 0),
        profit: Number(d.profit ?? 0),
        commission: Number(d.commission ?? 0),
        swap: Number(d.swap ?? 0),
        openedAt: d.openTime ?? d.time ?? nowISO,
        closedAt: d.time ?? nowISO,
        magic: d.magic ?? 0,
        comment: d.comment ?? "",
      });
    }
  }

  const snapshot = {
    balance: Number(info?.balance ?? 0),
    equity: Number(info?.equity ?? 0),
    margin: Number(info?.margin ?? 0),
    freeMargin: Number(info?.freeMargin ?? 0),
    openPositions: Array.isArray(positions) ? positions.length : 0,
    closedDeals,
  };

  const { error } = await admin.rpc("apply_mt5_snapshot", {
    p_account_id: acct.id,
    p_snapshot: snapshot,
  });
  if (error) throw new Error(`apply_mt5_snapshot: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!METAAPI_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "METAAPI_TOKEN not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: accounts, error: listErr } = await admin.rpc("mt5_accounts_to_sync");
  if (listErr) {
    return new Response(JSON.stringify({ ok: false, error: listErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look back 10 minutes for closed deals — apply_mt5_snapshot is idempotent per (account, ticket)
  const sinceISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  // Sequential to keep request count and resource usage modest; switch to Promise.allSettled if needed
  for (const acct of (accounts as Account[]) ?? []) {
    try {
      await syncOne(admin, acct, sinceISO);
      results.push({ id: acct.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.rpc("mt5_record_error", { p_account_id: acct.id, p_error: msg });
      results.push({ id: acct.id, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
