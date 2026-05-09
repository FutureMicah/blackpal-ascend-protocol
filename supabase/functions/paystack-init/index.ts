// Paystack: initialize a transaction for the gate-pass fee.
// Returns the hosted authorization_url for redirect-based checkout.
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
      return new Response(JSON.stringify({ error: "Paystack not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const body = await req.json().catch(() => ({}));
    const callback_url: string | undefined = body?.callback_url;
    if (!callback_url || typeof callback_url !== "string") {
      return new Response(JSON.stringify({ error: "callback_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute amount from academy_settings (server-side, never trust client)
    const service = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: settings } = await service
      .from("academy_settings")
      .select("gate_pass_usd, usd_to_ngn_rate")
      .limit(1)
      .single();

    const usd = Number(settings?.gate_pass_usd ?? 2);
    const rate = Number(settings?.usd_to_ngn_rate ?? 1500);
    const naira = Math.round(usd * rate);
    const kobo = naira * 100;

    const reference = `BTA-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: kobo,
        currency: "NGN",
        reference,
        callback_url,
        metadata: { user_id: user.id, purpose: "gate_pass" },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson?.status) {
      return new Response(JSON.stringify({ error: initJson?.message || "Init failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record pending payment
    await service.from("payments").insert({
      user_id: user.id,
      payment_tier: "NIGERIA",
      payment_method: "paystack",
      amount_usd: usd,
      amount_local: naira,
      local_currency: "NGN",
      payment_status: "pending",
      transaction_id: reference,
    });

    return new Response(
      JSON.stringify({
        authorization_url: initJson.data.authorization_url,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
