import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the admin user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const adminUser = users.users.find((u: any) => u.email === "futuremicah4@gmail.com");
    if (!adminUser) {
      return new Response(JSON.stringify({ error: "Admin user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(adminUser.id, {
      password: "Admin@4303",
    });
    if (updateError) throw updateError;

    // Ensure super_admin role exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminUser.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: adminUser.id, role: "super_admin" });
    }

    return new Response(JSON.stringify({ success: true, message: "Admin password reset and role verified" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
