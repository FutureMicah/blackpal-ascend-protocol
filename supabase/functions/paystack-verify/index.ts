// Paystack: verify a transaction reference server-side and activate the user.
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
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const { reference } = await req.json().catch(() => ({}));
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const verifyJson = await verifyRes.json();
    const ok = verifyRes.ok && verifyJson?.data?.status === "success";

    const service = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency guard: if this reference is already completed for this user, return success.
    const { data: existing } = await service
      .from("payments")
      .select("id, user_id, payment_status")
      .eq("transaction_id", reference)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Reference does not belong to user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existing?.payment_status === "completed") {
      return new Response(JSON.stringify({ verified: true, idempotent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const verifyJson = await verifyRes.json();
    const ok = verifyRes.ok && verifyJson?.data?.status === "success";

    // Bind reference to this user (defense against replay across accounts)
    if (verifyJson?.data?.metadata?.user_id && verifyJson.data.metadata.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Reference does not belong to user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ok) {
      await service
        .from("payments")
        .update({ payment_status: "failed" })
        .eq("transaction_id", reference)
        .eq("user_id", user.id)
        .eq("payment_status", "pending");
      return new Response(
        JSON.stringify({ verified: false, message: verifyJson?.data?.gateway_response || "Not successful" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotent completion: only flip rows still pending. Race-safe with webhook.
    const { data: updated } = await service
      .from("payments")
      .update({
        payment_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("transaction_id", reference)
      .eq("user_id", user.id)
      .eq("payment_status", "pending")
      .select("id");

    if (updated && updated.length > 0) {
      await service
        .from("profiles")
        .update({ payment_completed: true })
        .eq("id", user.id);
    }

    return new Response(JSON.stringify({ verified: true, idempotent: !updated || updated.length === 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
