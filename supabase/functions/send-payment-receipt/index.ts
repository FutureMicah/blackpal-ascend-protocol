// Sends an email receipt to a user after their Paystack payment is completed.
// Uses Resend directly (RESEND_API_KEY). Invoked from paystack-verify and paystack-webhook
// with the service role, so no JWT is required from the caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, reference, amount_local, local_currency } = await req.json();
    if (!user_id || !reference) {
      return new Response(JSON.stringify({ error: "user_id and reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await service
      .from("profiles")
      .select("email, display_name")
      .eq("id", user_id)
      .maybeSingle();

    const email = profile?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "User has no email" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = profile?.display_name || "there";
    const currencySymbol = (local_currency || "NGN") === "NGN" ? "₦" : "";
    const amountStr = amount_local ? `${currencySymbol}${Number(amount_local).toLocaleString()}` : "—";

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0b0b14;color:#f5f5f5;padding:32px;border-radius:16px;">
        <h1 style="font-size:22px;margin:0 0 8px;color:#a855f7;">Payment received ✅</h1>
        <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 16px;">We've received your activation payment. Your BlackPal account is now fully unlocked.</p>
        <table style="width:100%;border-collapse:collapse;background:#15152a;border-radius:12px;overflow:hidden;margin:16px 0;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #2a2a40;color:#aaa;">Amount</td><td style="padding:12px 16px;border-bottom:1px solid #2a2a40;text-align:right;font-weight:600;">${amountStr}</td></tr>
          <tr><td style="padding:12px 16px;color:#aaa;">Reference</td><td style="padding:12px 16px;text-align:right;font-family:monospace;">${escapeHtml(reference)}</td></tr>
        </table>
        <p style="font-size:12px;color:#888;margin-top:24px;">If you didn't make this payment, reply to this email immediately.</p>
        <p style="font-size:12px;color:#888;">— The BlackPal team</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BlackPal <onboarding@resend.dev>",
        to: [email],
        subject: `Your BlackPal activation receipt (${reference})`,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "Resend failed", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
