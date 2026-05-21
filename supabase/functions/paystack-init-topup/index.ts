// Paystack: initialize a transaction for a Naira → BTAX wallet top-up.
// Creates a pending wallet_topup_requests row + payments row, returns hosted authorization_url.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      return json({ error: "Paystack not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const body = await req.json().catch(() => ({}));
    const naira_amount = Math.floor(Number(body?.naira_amount));
    const callback_url: string | undefined = body?.callback_url;
    if (!Number.isFinite(naira_amount) || naira_amount < 100) {
      return json({ error: "naira_amount must be at least 100" }, 400);
    }
    if (!callback_url || typeof callback_url !== "string") {
      return json({ error: "callback_url required" }, 400);
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Compute BTAX preview
    const { data: settings } = await service
      .from("academy_settings")
      .select("btax_to_naira_rate")
      .limit(1)
      .single();
    const rate = Number(settings?.btax_to_naira_rate ?? 100);
    const btax_preview = Math.round((naira_amount / rate) * 100) / 100;

    // Create pending topup request
    const { data: topup, error: topupErr } = await service
      .from("wallet_topup_requests")
      .insert({
        user_id: user.id,
        naira_amount,
        btax_preview,
        rate_at_submission: rate,
        status: "pending",
        payer_note: "Paystack hosted checkout",
      })
      .select("id")
      .single();
    if (topupErr || !topup) return json({ error: topupErr?.message || "Could not create top-up" }, 500);

    const reference = `BTX-TOP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: naira_amount * 100, // kobo
        currency: "NGN",
        reference,
        callback_url,
        metadata: {
          user_id: user.id,
          purpose: "wallet_topup",
          topup_request_id: topup.id,
          btax_preview,
        },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson?.status) {
      return json({ error: initJson?.message || "Paystack init failed" }, 400);
    }

    // Record pending payment row (so webhook handler can look it up by reference)
    await service.from("payments").insert({
      user_id: user.id,
      payment_tier: "WALLET_TOPUP",
      payment_method: "paystack",
      amount_usd: 0,
      amount_local: naira_amount,
      local_currency: "NGN",
      payment_status: "pending",
      transaction_id: reference,
    });

    return json({
      authorization_url: initJson.data.authorization_url,
      reference,
      topup_request_id: topup.id,
      btax_preview,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
