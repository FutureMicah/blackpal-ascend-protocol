/**
 * BiometricAuth - Portable WebAuthn/Passkey Security Component
 * 
 * Supports Face ID, Fingerprint, and platform authenticators.
 * Can be used for login, payment verification, or any sensitive action.
 * 
 * Usage:
 *   <BiometricAuth mode="login" onSuccess={() => {}} />
 *   <BiometricAuth mode="register" onSuccess={() => {}} />
 *   <BiometricAuth mode="verify" onSuccess={() => {}} onCancel={() => {}} />
 * 
 * Dependencies:
 *   - Supabase client at @/integrations/supabase/client
 *   - Edge function: supabase/functions/webauthn/index.ts
 *   - DB table: webauthn_credentials
 *   - UI: @/components/ui/button, @/hooks/use-toast
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Fingerprint, ScanFace, Shield, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface BiometricAuthProps {
  /** "register" = enroll device, "login" = sign in, "verify" = confirm identity for sensitive actions */
  mode: "register" | "login" | "verify";
  email?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Custom label for the button */
  label?: string;
  /** Custom class for the wrapper */
  className?: string;
}

// ─── Base64url helpers ───────────────────────────────────────────────

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── Component ───────────────────────────────────────────────────────

export const BiometricAuth = ({
  mode,
  email,
  onSuccess,
  onCancel,
  label,
  className = "",
}: BiometricAuthProps) => {
  const [loading, setLoading] = useState(false);
  const [supportStatus, setSupportStatus] = useState<"checking" | "supported" | "unsupported">("checking");
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      if (!window.PublicKeyCredential) {
        setSupportStatus("unsupported");
        return;
      }
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setSupportStatus(available ? "supported" : "unsupported");
      } catch {
        setSupportStatus("unsupported");
      }
    };
    check();
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const { data: optionsData, error: optError } = await supabase.functions.invoke('webauthn', {
        body: { action: 'register-options' },
      });
      if (optError) throw new Error(optError.message);

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        ...optionsData,
        challenge: base64urlToBuffer(optionsData.challenge),
        user: {
          ...optionsData.user,
          id: base64urlToBuffer(optionsData.user.id),
        },
        excludeCredentials: (optionsData.excludeCredentials || []).map((c: any) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })),
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) throw new Error('No credential created');

      const response = credential.response as AuthenticatorAttestationResponse;

      const { error: verifyError } = await supabase.functions.invoke('webauthn', {
        body: {
          action: 'register-verify',
          credentialId: bufferToBase64url(credential.rawId),
          publicKey: bufferToBase64url(response.getPublicKey()!),
          deviceName: navigator.platform || 'Device',
          transports: response.getTransports?.() || [],
        },
      });

      if (verifyError) throw new Error(verifyError.message);

      toast({
        title: "Biometric Registered",
        description: "You can now verify with your fingerprint or face.",
      });
      onSuccess?.();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({ title: "Cancelled", description: "Biometric registration was cancelled.", variant: "destructive" });
        onCancel?.();
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    try {
      const { data: optionsData, error: optError } = await supabase.functions.invoke('webauthn', {
        body: { action: 'auth-options', email },
      });
      if (optError) throw new Error(optError.message);

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64urlToBuffer(optionsData.challenge),
        rpId: optionsData.rpId,
        timeout: optionsData.timeout,
        userVerification: optionsData.userVerification as UserVerificationRequirement,
        allowCredentials: (optionsData.allowCredentials || []).map((c: any) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })),
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!assertion) throw new Error('Authentication failed');

      const response = assertion.response as AuthenticatorAssertionResponse;

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('webauthn', {
        body: {
          action: 'auth-verify',
          credentialId: bufferToBase64url(assertion.rawId),
          authenticatorData: bufferToBase64url(response.authenticatorData),
          signature: bufferToBase64url(response.signature),
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
        },
      });

      if (verifyError) throw new Error(verifyError.message);

      // For login mode, complete the auth session
      if (mode === "login" && verifyData?.email && verifyData?.token) {
        const { error: signInError } = await supabase.auth.verifyOtp({
          email: verifyData.email,
          token: verifyData.token,
          type: 'email',
        });
        if (signInError) throw signInError;
      }

      toast({
        title: mode === "verify" ? "Identity Verified" : "Welcome Back",
        description: mode === "verify" 
          ? "Biometric verification successful. Proceeding..." 
          : "Biometric authentication successful.",
      });
      const { triggerAccessGranted } = await import("@/components/AccessGrantedSeal");
      triggerAccessGranted({
        label: mode === "verify" ? "BIOMETRIC VERIFIED" : "WELCOME BACK",
        sublabel: "Identity confirmed",
      });
      onSuccess?.();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({ title: "Cancelled", description: "Verification was cancelled.", variant: "destructive" });
        onCancel?.();
      } else {
        toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Unsupported device fallback ─────────────────────────────────

  if (supportStatus === "checking") {
    return (
      <div className={`w-full ${className}`}>
        <Button disabled className="w-full h-12 gap-3 opacity-60">
          <Loader2 className="w-5 h-5 animate-spin" />
          Checking biometric support...
        </Button>
      </div>
    );
  }

  if (supportStatus === "unsupported") {
    return (
      <div className={`w-full ${className}`}>
        <Button
          disabled
          variant="outline"
          className="w-full h-12 gap-3 opacity-50 border-destructive/30"
        >
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Biometrics not available on this device
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Use a device with Face ID or fingerprint sensor to enable biometric security.
        </p>
      </div>
    );
  }

  // ─── Render buttons ──────────────────────────────────────────────

  if (mode === "register") {
    return (
      <div className={`w-full space-y-3 ${className}`}>
        <Button
          type="button"
          variant="outline"
          onClick={handleRegister}
          disabled={loading}
          className="w-full h-12 border-primary/30 hover:bg-primary/10 gap-3"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Shield className="w-5 h-5 text-primary" />
          )}
          {label || "Register Biometric Security"}
        </Button>
      </div>
    );
  }

  // login or verify mode
  return (
    <div className={`w-full space-y-3 ${className}`}>
      <Button
        type="button"
        onClick={handleAuthenticate}
        disabled={loading}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary/80 to-primary gap-3 hover:opacity-90 transition-all"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Fingerprint className="w-6 h-6" />
            <ScanFace className="w-6 h-6" />
          </>
        )}
        {label || (mode === "verify" ? "Verify Identity" : "Sign in with Biometrics")}
      </Button>
    </div>
  );
};
