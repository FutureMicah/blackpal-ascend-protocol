// MT5 Sync — polls metatraderapi.cloud for every connected account every 30s
// and atomically updates account health + prop_trades via apply_mt5_snapshot.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MT5_API_KEY = Deno.env.get("MT5_API_KEY") ?? Deno.env.get("METAAPI_TOKEN") ?? "";
const MT5_API_BASE = Deno.env.get("MT5_API_BASE") ?? "https://metatraderapi.cloud";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Account {
  id: string;
  user_id: string;
  metaapi_account_id: string; // stores the metatraderapi.cloud session_id
  metaapi_region: string;
  mt5_login: string;
  mt5_server: string;
  mt5_investor_password: string;
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

const authHeaders = () => ({
  "Authorization": `Bearer ${MT5_API_KEY}`,
  "Accept": "application/json",
});

async function jsonFetch(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url} — ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : null;
}

// Re-open a session if expired and persist the new id.
async function refreshSession(admin: ReturnType<typeof createClient>, acct: Account): Promise<string> {
  const startRes = await fetch(`${MT5_API_BASE}/api/sessions/start/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: acct.mt5_login,
      password: acct.mt5_investor_password,
      server: acct.mt5_server,
    }),
  });
  const txt = await startRes.text();
  if (!startRes.ok) throw new Error(`refresh session ${startRes.status}: ${txt.slice(0, 200)}`);
  const parsed = txt ? JSON.parse(txt) : {};
  const sid: string | undefined = parsed.session_id ?? parsed.sessionId ?? parsed.id;
  if (!sid) throw new Error("refresh session: no session_id");
  await admin.rpc("mt5_mark_provisioned", {
    p_account_id: acct.id,
    p_metaapi_id: sid,
    p_region: acct.metaapi_region ?? "default",
  });
  return sid;
}

async function fetchSnapshot(sessionId: string, sinceISO: string) {
  const base = `${MT5_API_BASE}/api/sessions/${encodeURIComponent(sessionId)}`;
  // Account information (balance, equity, margin, free margin)
  const info = await jsonFetch(`${base}/account-info/`, { headers: authHeaders() });

  // Open positions — endpoint name follows the provider's convention
  let positions: any[] = [];
  try {
    const p = await jsonFetch(`${base}/positions/`, { headers: authHeaders() });
    positions = Array.isArray(p) ? p : (p?.positions ?? []);
  } catch (_e) { /* provider may 404 if none */ }

  // Closed trade history since last sync window
  let history: any[] = [];
  try {
    const url = `${base}/history/?from=${encodeURIComponent(sinceISO)}`;
    const h = await jsonFetch(url, { headers: authHeaders() });
    history = Array.isArray(h) ? h : (h?.deals ?? h?.trades ?? []);
  } catch (_e) { /* tolerate empty history endpoint */ }

  const closedDeals: Deal[] = [];
  for (const d of history) {
    const ticket = d.ticket ?? d.id ?? d.deal_id ?? d.position_id;
    if (ticket == null) continue;
    // skip non-close entries when the provider returns mixed entries
    if (d.entry && d.entry !== "out" && d.entry !== "inout") continue;
    closedDeals.push({
      ticket,
      symbol: d.symbol ?? "?",
      type: String(d.trade_type ?? d.type ?? "BUY").toUpperCase(),
      lots: Number(d.volume ?? d.lots ?? 0),
      openPrice: Number(d.open_price ?? d.openPrice ?? d.price_open ?? 0),
      closePrice: Number(d.close_price ?? d.closePrice ?? d.price_close ?? d.price ?? 0),
      profit: Number(d.profit ?? 0),
      commission: Number(d.commission ?? 0),
      swap: Number(d.swap ?? 0),
      openedAt: d.open_time ?? d.openedAt ?? d.time ?? new Date().toISOString(),
      closedAt: d.close_time ?? d.closedAt ?? d.time ?? new Date().toISOString(),
      magic: d.magic ?? d.magic_number ?? 0,
      comment: d.comment ?? "",
    });
  }

  return {
    balance: Number(info?.balance ?? 0),
    equity: Number(info?.equity ?? info?.balance ?? 0),
    margin: Number(info?.margin ?? 0),
    freeMargin: Number(info?.free_margin ?? info?.freeMargin ?? 0),
    openPositions: positions.length,
    closedDeals,
  };
}

async function syncOne(admin: ReturnType<typeof createClient>, acct: Account, sinceISO: string) {
  let sessionId = acct.metaapi_account_id;
  let snapshot;
  try {
    snapshot = await fetchSnapshot(sessionId, sinceISO);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Session likely expired — re-open once and retry
    if (/401|403|404|expired|invalid/i.test(msg)) {
      sessionId = await refreshSession(admin, acct);
      snapshot = await fetchSnapshot(sessionId, sinceISO);
    } else {
      throw e;
    }
  }

  const { error } = await admin.rpc("apply_mt5_snapshot", {
    p_account_id: acct.id,
    p_snapshot: snapshot,
  });
  if (error) throw new Error(`apply_mt5_snapshot: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!MT5_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "MT5_API_KEY not configured" }), {
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

  // Look back 10 minutes; apply_mt5_snapshot is idempotent per (account, ticket)
  const sinceISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  // Parallel with a small concurrency cap to keep things fast yet safe
  const list = (accounts as Account[]) ?? [];
  const CONCURRENCY = 5;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((a) => syncOne(admin, a, sinceISO)));
    settled.forEach((r, idx) => {
      const acct = batch[idx];
      if (r.status === "fulfilled") {
        results.push({ id: acct.id, ok: true });
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        admin.rpc("mt5_record_error", { p_account_id: acct.id, p_error: msg });
        results.push({ id: acct.id, ok: false, error: msg });
      }
    });
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
