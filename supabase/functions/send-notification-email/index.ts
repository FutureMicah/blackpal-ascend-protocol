import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


function esc(v: string): string {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
async function requireUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callerId = await requireUser(req);
    if (!callerId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { type, to_user_id, data } = await req.json();
    // Sender is always the authenticated caller; any client-supplied from_user_id is ignored.
    const from_user_id = callerId;

    
    console.log('Notification request:', { type, to_user_id, from_user_id, data });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: toUser, error: toUserError } = await supabase.auth.admin.getUserById(to_user_id);
    if (toUserError || !toUser?.user?.email) {
      console.error('Could not find recipient email:', toUserError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let fromProfile = null;
    if (from_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', from_user_id)
        .single();
      fromProfile = profile;
    }

    let subject = '';
    let html = '';

    switch (type) {
      case 'friend_request':
        subject = `${esc(fromProfile?.display_name || 'Someone')} sent you a friend request on BlackPal`;
        html = `<div style="font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #fff;"><h2 style="color: #d4af37;">New Friend Request!</h2><p>${esc(fromProfile?.display_name || 'A user')} wants to connect with you.</p></div>`;
        break;
      case 'achievement_unlocked':
        subject = `🏆 Achievement Unlocked: ${esc(data?.achievement_name || 'New Achievement')}`;
        html = `<div style="font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #fff;"><h2 style="color: #d4af37;">Achievement Unlocked!</h2><p>${esc(data?.achievement_name || 'New Achievement')}</p></div>`;
        break;
      case 'new_message':
        subject = `💬 New message from ${esc(fromProfile?.display_name || 'Someone')}`;
        html = `<div style="font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #fff;"><h2 style="color: #d4af37;">New Message!</h2><p>${esc(fromProfile?.display_name || 'A user')} sent you a message.</p></div>`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BlackPal <notifications@resend.dev>',
        to: [toUser.user.email],
        subject,
        html,
      }),
    });

    const emailData = await emailResponse.json();
    console.log('Email sent:', emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
