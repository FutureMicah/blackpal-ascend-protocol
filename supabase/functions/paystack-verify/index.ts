// Paystack: verify a transaction reference server-side and activate the user.
// Idempotent: same reference can never mark a payment completed more than once.
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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const { reference } = await req.json().catch(() => ({}));
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Idempotency guard: if already completed for this user, return success.
    const { data: existing } = await service
      .from("payments")
      .select("id, user_id, payment_status, amount_local, local_currency")
      .eq("transaction_id", reference)
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Reference does not belong to user" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Bind reference to this user
    if (verifyJson?.data?.metadata?.user_id && verifyJson.data.metadata.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Reference does not belong to user" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the verify attempt as a webhook-event entry too (for full audit)
    await service.from("paystack_webhook_events").insert({
      reference, event_type: ok ? "verify.success" : "verify.failed",
      signature_valid: true, prior_status: existing?.payment_status ?? null,
      new_status: ok ? "completed" : "failed",
      amount_minor: verifyJson?.data?.amount ?? null,
      currency: verifyJson?.data?.currency ?? null, raw: verifyJson,
    });

    if (!ok) {
      await service.from("payments")
        .update({ payment_status: "failed" })
        .eq("transaction_id", reference)
        .eq("user_id", user.id)
        .eq("payment_status", "pending");

      // Track repeated failures
      await trackFailure(service, user.id, reference);

      return new Response(
        JSON.stringify({ verified: false, message: verifyJson?.data?.gateway_response || "Not successful" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotent completion: only flip rows still pending.
    const { data: updated } = await service.from("payments")
      .update({ payment_status: "completed", completed_at: new Date().toISOString() })
      .eq("transaction_id", reference)
      .eq("user_id", user.id)
      .eq("payment_status", "pending")
      .select("id, amount_local, local_currency");

    const wasUpdated = updated && updated.length > 0;
    if (wasUpdated) {
      await service.from("profiles").update({ payment_completed: true }).eq("id", user.id);

      // Fire-and-forget receipt email
      try {
        await service.functions.invoke("send-payment-receipt", {
          body: {
            user_id: user.id,
            reference,
            amount_local: updated![0].amount_local,
            local_currency: updated![0].local_currency,
          },
        });
      } catch (_) { /* non-fatal */ }
    }

    return new Response(JSON.stringify({ verified: true, idempotent: !wasUpdated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function trackFailure(service: any, userId: string, reference: string) {
  // Count failed payments for this user in the last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await service
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("payment_status", "failed")
    .gte("created_at", since);

  if ((count ?? 0) >= 3) {
    await service.from("admin_alerts").insert({
      alert_type: "repeated_payment_failures",
      severity: "warning",
      user_id: userId,
      reference,
      message: `User has ${count} failed payments in 24h (latest ref: ${reference})`,
      metadata: { count, reference },
    });
  }
}
