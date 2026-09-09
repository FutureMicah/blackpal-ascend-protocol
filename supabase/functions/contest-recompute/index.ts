import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Identify the caller with their own JWT
    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await asUser.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    const { data: isSuper } = await admin.rpc("has_role", { _user_id: uid, _role: "super_admin" });
    if (!isAdmin && !isSuper) {
      return new Response(JSON.stringify({ error: "Admins only" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contestId = body?.contest_id as string | undefined;

    if (contestId) {
      const { error } = await admin.rpc("rerank_contest", { p_contest_id: contestId });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, scope: "contest", contest_id: contestId }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.rpc("recompute_active_contests");
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, scope: "all", entries: data ?? 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("contest-recompute error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
