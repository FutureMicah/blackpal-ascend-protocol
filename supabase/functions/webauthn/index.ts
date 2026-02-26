import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// In-memory challenge store (short-lived, per-invocation validated via timing)
const challenges = new Map<string, { challenge: string; timestamp: number }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const { action, ...body } = await req.json();

    if (action === 'register-options') {
      // User must be authenticated to register a passkey
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const challenge = generateChallenge();
      // Store challenge temporarily
      challenges.set(user.id, { challenge, timestamp: Date.now() });

      // Get existing credentials for exclusion
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: existingCreds } = await adminClient
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('user_id', user.id);

      const options = {
        challenge,
        rp: { name: 'BlackPal', id: new URL(req.headers.get('origin') || supabaseUrl).hostname },
        user: {
          id: btoa(user.id),
          name: user.email || user.id,
          displayName: user.user_metadata?.name || user.email || 'User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        excludeCredentials: (existingCreds || []).map(c => ({
          id: c.credential_id,
          type: 'public-key',
        })),
        attestation: 'none',
      };

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'register-verify') {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { credentialId, publicKey, deviceName, transports } = body;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { error: insertError } = await adminClient
        .from('webauthn_credentials')
        .insert({
          user_id: user.id,
          credential_id: credentialId,
          public_key: publicKey,
          device_name: deviceName || 'My Device',
          transports: transports || [],
          counter: 0,
        });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'auth-options') {
      // Generate challenge for authentication (no auth needed)
      const challenge = generateChallenge();
      const sessionId = crypto.randomUUID();
      challenges.set(sessionId, { challenge, timestamp: Date.now() });

      const { email } = body;
      let allowCredentials: any[] = [];

      if (email) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        // Look up user by email
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const targetUser = users?.find(u => u.email === email);

        if (targetUser) {
          const { data: creds } = await adminClient
            .from('webauthn_credentials')
            .select('credential_id, transports')
            .eq('user_id', targetUser.id);

          allowCredentials = (creds || []).map(c => ({
            id: c.credential_id,
            type: 'public-key',
            transports: c.transports || [],
          }));
        }
      }

      const options = {
        challenge,
        sessionId,
        rpId: new URL(req.headers.get('origin') || supabaseUrl).hostname,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials,
      };

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'auth-verify') {
      const { credentialId, authenticatorData, signature, clientDataJSON } = body;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Find credential
      const { data: cred, error: credError } = await adminClient
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .single();

      if (credError || !cred) {
        return new Response(JSON.stringify({ error: 'Credential not found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update last used and counter
      await adminClient
        .from('webauthn_credentials')
        .update({ 
          last_used_at: new Date().toISOString(),
          counter: cred.counter + 1
        })
        .eq('id', cred.id);

      // Get user email to generate a sign-in link
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const targetUser = users?.find(u => u.id === cred.user_id);

      if (!targetUser?.email) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate a magic link token for the user
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: targetUser.email,
      });

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        token: linkData.properties?.hashed_token,
        email: targetUser.email,
        userId: cred.user_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
