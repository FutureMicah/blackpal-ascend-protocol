import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Spike = {
  kind: "retry" | "error";
  breakpoint?: string | null;
  orientation?: string | null;
  rate: number;
  loads: number;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND = Deno.env.get("RESEND_API_KEY");

    // AuthN: require caller JWT, then verify admin role with service role client
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", userRes.user.id);
    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const spikes: Spike[] = Array.isArray(body?.spikes) ? body.spikes : [];
    if (!spikes.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("class_analytics_alert_config").select("*").eq("id", true).maybeSingle();
    if (!cfg) {
      return new Response(JSON.stringify({ ok: true, sent: 0, skipped: spikes.length, reason: "no_config" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const debounceMin = Number(cfg.debounce_minutes) || 30;
    const cutoff = new Date(Date.now() - debounceMin * 60_000).toISOString();

    const result: { signature: string; channels: string[]; deduped?: boolean; errors?: string[] }[] = [];

    for (const sp of spikes) {
      const sig = `${sp.kind}|${sp.breakpoint || ""}|${sp.orientation || ""}|${Math.round((sp.rate || 0) * 100)}`;

      // Debounce check
      const { data: prev } = await admin
        .from("class_analytics_alerts_sent")
        .select("id").eq("signature", sig).gte("sent_at", cutoff).limit(1);
      if (prev && prev.length) {
        result.push({ signature: sig, channels: [], deduped: true });
        continue;
      }

      const channels: string[] = [];
      const errors: string[] = [];
      const title = `⚠️ Class analytics spike: ${sp.kind.toUpperCase()} ${(sp.rate * 100).toFixed(0)}%`;
      const context = `${sp.breakpoint ? `breakpoint=${sp.breakpoint}` : ""}${sp.orientation ? ` orientation=${sp.orientation}` : ""}`.trim();
      const line = `${title} · ${context || "global"} · ${sp.loads} session loads · ${new Date().toISOString()}`;

      // Slack
      if (cfg.slack_enabled && cfg.slack_webhook_url) {
        try {
          const r = await fetch(cfg.slack_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: line,
              blocks: [
                { type: "header", text: { type: "plain_text", text: title } },
                { type: "section", fields: [
                  { type: "mrkdwn", text: `*Scope:*\n${context || "global"}` },
                  { type: "mrkdwn", text: `*Rate:*\n${(sp.rate * 100).toFixed(1)}%` },
                  { type: "mrkdwn", text: `*Session loads:*\n${sp.loads}` },
                  { type: "mrkdwn", text: `*Debounce:*\n${debounceMin} min` },
                ]},
              ],
            }),
          });
          if (!r.ok) errors.push(`slack:${r.status}`); else channels.push("slack");
        } catch (e) { errors.push(`slack:${(e as Error).message}`); }
      }

      // Email via Resend (direct)
      if (cfg.email_enabled && RESEND && Array.isArray(cfg.email_recipients) && cfg.email_recipients.length) {
        try {
          const html = `
            <div style="font-family:sans-serif;padding:20px;background:#0a0a0a;color:#fff">
              <h2 style="color:#d4af37;margin:0 0 12px">${escapeHtml(title)}</h2>
              <p style="margin:4px 0"><strong>Scope:</strong> ${escapeHtml(context || "global")}</p>
              <p style="margin:4px 0"><strong>Rate:</strong> ${(sp.rate * 100).toFixed(1)}%</p>
              <p style="margin:4px 0"><strong>Session loads:</strong> ${sp.loads}</p>
              <p style="margin:12px 0 0;color:#888;font-size:12px">Sent by BlackPal analytics. Debounce ${debounceMin} min.</p>
            </div>`;
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "BlackPal Alerts <alerts@resend.dev>",
              to: cfg.email_recipients,
              subject: title,
              html,
            }),
          });
          if (!r.ok) errors.push(`email:${r.status}`); else channels.push("email");
        } catch (e) { errors.push(`email:${(e as Error).message}`); }
      }

      if (channels.length) {
        await admin.from("class_analytics_alerts_sent").insert({
          signature: sig, kind: sp.kind, breakpoint: sp.breakpoint || null,
          orientation: sp.orientation || null, rate: sp.rate, loads: sp.loads, channels,
        });
      }
      result.push({ signature: sig, channels, errors: errors.length ? errors : undefined });
    }

    return new Response(JSON.stringify({ ok: true, results: result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch-analytics-alert error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
