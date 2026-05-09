// Paystack webhook: confirms payment status asynchronously and securely.
// Signed with HMAC-SHA512 using the Paystack secret key, header `x-paystack-signature`.
// Public endpoint — must NOT require JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PAYSTACK_SECRET_KEY) {
    return new Response("Not configured", { status: 500, headers: corsHeaders });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const reference: string | undefined = event?.data?.reference;
  const metaUserId: string | undefined = event?.data?.metadata?.user_id;
  if (!reference) {
    return new Response("ok", { headers: corsHeaders });
  }

  // Find the local payment row (created at init time)
  const { data: row } = await service
    .from("payments")
    .select("id, user_id, payment_status")
    .eq("transaction_id", reference)
    .maybeSingle();

  if (!row) {
    // Unknown reference — still ack so Paystack stops retrying.
    return new Response("ok", { headers: corsHeaders });
  }

  // If metadata user does not match local row, refuse to mutate.
  if (metaUserId && metaUserId !== row.user_id) {
    return new Response("user mismatch", { status: 403, headers: corsHeaders });
  }

  if (event?.event === "charge.success") {
    if (row.payment_status !== "completed") {
      const { data: updated } = await service
        .from("payments")
        .update({
          payment_status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("transaction_id", reference)
        .eq("payment_status", "pending")
        .select("id");

      if (updated && updated.length > 0) {
        await service
          .from("profiles")
          .update({ payment_completed: true })
          .eq("id", row.user_id);
      }
    }
  } else if (
    event?.event === "charge.failed" ||
    event?.event === "transaction.failed"
  ) {
    if (row.payment_status === "pending") {
      await service
        .from("payments")
        .update({ payment_status: "failed" })
        .eq("transaction_id", reference)
        .eq("payment_status", "pending");
    }
  }

  return new Response("ok", { headers: corsHeaders });
});
