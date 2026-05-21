// Paystack webhook: handles charge.success, charge.failed, refund.processed, charge.dispute.create.
// HMAC-SHA512 signature verified via PAYSTACK_SECRET_KEY. Public endpoint (verify_jwt = false).
// Every event is recorded in paystack_webhook_events. Replays are idempotent.
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
  if (!PAYSTACK_SECRET_KEY) return new Response("Not configured", { status: 500, headers: corsHeaders });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  const sigValid = signature === expected;

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!sigValid) {
    await service.from("paystack_webhook_events").insert({
      event_type: "signature.invalid", signature_valid: false,
      raw: safeParse(raw), error: "Bad HMAC",
    });
    await service.from("admin_alerts").insert({
      alert_type: "webhook_signature_invalid",
      severity: "critical",
      message: "Paystack webhook with invalid HMAC received",
      metadata: { ip: req.headers.get("x-forwarded-for") },
    });
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try { event = JSON.parse(raw); }
  catch {
    await service.from("paystack_webhook_events").insert({
      event_type: "json.invalid", signature_valid: true, error: "Invalid JSON",
    });
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const evtType: string = event?.event || "unknown";
  const reference: string | undefined =
    event?.data?.reference || event?.data?.transaction?.reference;
  const metaUserId: string | undefined =
    event?.data?.metadata?.user_id || event?.data?.transaction?.metadata?.user_id;

  // Find local payment row
  let row: any = null;
  if (reference) {
    const { data } = await service
      .from("payments")
      .select("id, user_id, payment_status, amount_local, local_currency")
      .eq("transaction_id", reference)
      .maybeSingle();
    row = data;
  }

  const priorStatus = row?.payment_status ?? null;
  let newStatus: string | null = priorStatus;
  let errorMsg: string | null = null;

  try {
    if (!row) {
      errorMsg = "unknown reference";
    } else if (metaUserId && metaUserId !== row.user_id) {
      errorMsg = "user mismatch";
    } else {
      switch (evtType) {
        case "charge.success": {
          if (row.payment_status !== "completed") {
            const { data: updated } = await service.from("payments")
              .update({ payment_status: "completed", completed_at: new Date().toISOString() })
              .eq("transaction_id", reference)
              .eq("payment_status", "pending")
              .select("id, amount_local, local_currency, payment_tier");
            if (updated && updated.length > 0) {
              newStatus = "completed";
              const tier = (updated[0] as any).payment_tier;
              const purpose: string | undefined =
                event?.data?.metadata?.purpose ||
                event?.data?.transaction?.metadata?.purpose;
              const topupRequestId: string | undefined =
                event?.data?.metadata?.topup_request_id ||
                event?.data?.transaction?.metadata?.topup_request_id;

              if (purpose === "wallet_topup" || tier === "WALLET_TOPUP") {
                // Auto-credit BTAX wallet
                if (topupRequestId) {
                  await service.rpc("system_approve_wallet_topup", {
                    p_request_id: topupRequestId,
                    p_reference: reference,
                  });
                }
              } else {
                // Standard activation fee path
                await service.from("profiles")
                  .update({ payment_completed: true })
                  .eq("id", row.user_id);
              }
              try {
                await service.functions.invoke("send-payment-receipt", {
                  body: {
                    user_id: row.user_id, reference,
                    amount_local: updated[0].amount_local,
                    local_currency: updated[0].local_currency,
                  },
                });
              } catch (_) { /* non-fatal */ }
            }
          }
          break;
        }
        case "charge.failed":
        case "transaction.failed": {
          if (row.payment_status === "pending") {
            await service.from("payments")
              .update({ payment_status: "failed" })
              .eq("transaction_id", reference)
              .eq("payment_status", "pending");
            newStatus = "failed";
          }
          // Repeated-failure alerting
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count } = await service
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", row.user_id)
            .eq("payment_status", "failed")
            .gte("created_at", since);
          if ((count ?? 0) >= 3) {
            await service.from("admin_alerts").insert({
              alert_type: "repeated_payment_failures",
              severity: "warning",
              user_id: row.user_id, reference,
              message: `User has ${count} failed payments in 24h`,
              metadata: { count },
            });
          }
          break;
        }
        case "refund.processed":
        case "refund.processing": {
          // Only act on previously-completed payments
          if (row.payment_status === "completed") {
            await service.from("payments")
              .update({ payment_status: "refunded" })
              .eq("transaction_id", reference)
              .eq("payment_status", "completed");
            newStatus = "refunded";
            await service.from("profiles")
              .update({ payment_completed: false })
              .eq("id", row.user_id);
            await service.from("admin_alerts").insert({
              alert_type: "payment_refunded",
              severity: "warning",
              user_id: row.user_id, reference,
              message: `Payment ${reference} refunded`,
              metadata: { amount: event?.data?.amount },
            });
          }
          break;
        }
        case "charge.dispute.create":
        case "charge.dispute.remind": {
          if (row.payment_status === "completed") {
            await service.from("payments")
              .update({ payment_status: "disputed" })
              .eq("transaction_id", reference)
              .eq("payment_status", "completed");
            newStatus = "disputed";
          }
          await service.from("admin_alerts").insert({
            alert_type: "payment_disputed",
            severity: "critical",
            user_id: row.user_id, reference,
            message: `Chargeback opened for ${reference}`,
            metadata: { dispute: event?.data },
          });
          break;
        }
        default:
          // Other events recorded for audit only
          break;
      }
    }
  } catch (e: any) {
    errorMsg = e?.message ?? String(e);
  }

  await service.from("paystack_webhook_events").insert({
    reference: reference ?? null, event_type: evtType,
    signature_valid: true, prior_status: priorStatus, new_status: newStatus,
    amount_minor: event?.data?.amount ?? null,
    currency: event?.data?.currency ?? null, raw: event, error: errorMsg,
  });

  return new Response("ok", { headers: corsHeaders });
});

function safeParse(s: string) { try { return JSON.parse(s); } catch { return { raw: s.slice(0, 500) }; } }
