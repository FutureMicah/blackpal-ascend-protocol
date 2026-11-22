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

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function consumeChallenge(key: string): string | null {
  const entry = challenges.get(key);
  if (!entry) return null;
  challenges.delete(key);
  if (Date.now() - entry.timestamp > CHALLENGE_TTL_MS) return null;
  return entry.challenge;
}
function derToRawEcdsa(sig: Uint8Array, size: number): Uint8Array {
  let offset = 0;
  if (sig[offset++] !== 0x30) throw new Error("invalid DER signature");
  const lenByte = sig[offset++];
  if (lenByte & 0x80) offset += (lenByte & 0x7f);
  if (sig[offset++] !== 0x02) throw new Error("invalid DER signature");
  const rLen = sig[offset++];
  const r = sig.slice(offset, offset + rLen); offset += rLen;
  if (sig[offset++] !== 0x02) throw new Error("invalid DER signature");
  const sLen = sig[offset++];
  const sBytes = sig.slice(offset, offset + sLen);
  const pad = (v: Uint8Array) => {
    const stripped = v.length > size && v[0] === 0 ? v.slice(1) : v;
    const out = new Uint8Array(size);
    out.set(stripped.slice(Math.max(0, stripped.length - size)), size - Math.min(size, stripped.length));
    return out;
  };
  const raw = new Uint8Array(size * 2);
  raw.set(pad(r), 0); raw.set(pad(sBytes), size);
  return raw;
}
async function verifyAssertion(cred: any, challenge: string, expectedOrigin: string, expectedRpId: string, authDataB64: string, sigB64: string, clientDataB64: string): Promise<number> {
  const authData = b64urlDecode(authDataB64);
  const signature = b64urlDecode(sigB64);
  const clientDataJSON = b64urlDecode(clientDataB64);
  if (authData.length < 37) throw new Error("authenticatorData too short");
  const flags = authData[32];
  if (!(flags & 0x01)) throw new Error("user presence not verified");
  if (!(flags & 0x04)) throw new Error("user verification not verified");
  const rpHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(expectedRpId)));
  if (!rpHash.every((b, i) => b === authData[i])) throw new Error("rpIdHash mismatch");
  const signCount = new DataView(authData.buffer, authData.byteOffset, authData.byteLength).getUint32(33);
  if (signCount !== 0 && signCount <= (cred.counter ?? 0)) throw new Error("signature counter did not increase");
  const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
  if (clientData.type !== "webauthn.get") throw new Error("unexpected clientData type");
  if (clientData.challenge !== challenge) throw new Error("challenge mismatch");
  if (clientData.origin !== expectedOrigin) throw new Error("origin mismatch");
  if (clientData.crossOrigin) throw new Error("cross-origin assertion rejected");
  const signed = new Uint8Array(authData.length + clientDataJSON.length);
  signed.set(authData, 0); signed.set(clientDataJSON, authData.length);
  const pubBytes = b64urlDecode(cred.public_key);
  const tryVerify = async (key: CryptoKey, alg: string, sig: Uint8Array) => {
    const params = alg === "ECDSA" ? { name: "ECDSA", hash: "SHA-256" } : { name: "RSASSA-PKCS1-v1_5" };
    return crypto.subtle.verify(params, key, sig, signed);
  };
  if (pubBytes.length === 65) {
    const withPrefix = pubBytes[0] === 0x04 ? pubBytes : (() => { const a = new Uint8Array(65); a[0] = 0x04; a.set(pubBytes, 1); return a; })();
    const ecKey = await crypto.subtle.importKey("raw", withPrefix, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    if (await tryVerify(ecKey, "ECDSA", derToRawEcdsa(signature, 32))) return signCount;
  } else {
    let key: CryptoKey;
    try { key = await crypto.subtle.importKey("spki", pubBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]); }
    catch { key = await crypto.subtle.importKey("jwk", { kty: "RSA", n: b64urlEncode(pubBytes), e: "AQAB" }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]); }
    if (await tryVerify(key, "RSASSA-PKCS1-v1_5", signature)) return signCount;
  }
  throw new Error("signature verification failed");
}
function rpIdForOrigin(req: Request, fallbackUrl: string): { origin: string; rpId: string } {
  const rawOrigin = req.headers.get("origin");
  if (rawOrigin) { try { const u = new URL(rawOrigin); return { origin: u.origin, rpId: u.hostname }; } catch { } }
  const u = new URL(fallbackUrl);
  return { origin: u.origin, rpId: u.hostname };
}


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
        rp: { name: 'BlackPal', id: rpIdForOrigin(req, supabaseUrl).rpId },
        sessionId: user.id,
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

      const { credentialId, publicKey, deviceName, transports, attestation, sessionId } = body;
      if (sessionId && sessionId !== user.id) {
        return new Response(JSON.stringify({ error: 'session mismatch' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!consumeChallenge(user.id)) {
        return new Response(JSON.stringify({ error: 'challenge expired or already used; request new options' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // NOTE: strict attestation (CBOR + attestation signature) verification is not
      // implemented here; accepting an attestation payload we cannot validate would
      // fail open, so enrollment is rejected until that check exists.
      if (attestation) {
        return new Response(JSON.stringify({ error: 'attestation verification not configured on server; enrollment disabled until verified' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

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
        rpId: rpIdForOrigin(req, supabaseUrl).rpId,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials,
      };

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'auth-verify') {
      const { credentialId, authenticatorData, signature, clientDataJSON, sessionId } = body;
      if (!sessionId || !credentialId || !authenticatorData || !signature || !clientDataJSON) {
        return new Response(JSON.stringify({ error: 'missing assertion fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const challenge = consumeChallenge(sessionId);
      if (!challenge) {
        return new Response(JSON.stringify({ error: 'challenge expired or already used' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

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

      const { origin: expectedOrigin, rpId: expectedRpId } = rpIdForOrigin(req, supabaseUrl);
      let newCounter: number;
      try {
        newCounter = await verifyAssertion(cred, challenge, expectedOrigin, expectedRpId, authenticatorData, signature, clientDataJSON);
      } catch (e) {
        return new Response(JSON.stringify({ error: `verification failed: ${(e as Error)?.message || e}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await adminClient
        .from('webauthn_credentials')
        .update({ last_used_at: new Date().toISOString(), counter: newCounter })
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
