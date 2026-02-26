import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Fingerprint, ScanFace, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BiometricAuthProps {
  mode: "register" | "login";
  email?: string;
  onSuccess?: () => void;
}

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

export const BiometricAuth = ({ mode, email, onSuccess }: BiometricAuthProps) => {
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(available);
        } catch {
          setIsSupported(false);
        }
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
        description: "You can now sign in with your fingerprint or face.",
      });
      onSuccess?.();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({ title: "Cancelled", description: "Biometric registration was cancelled.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
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

      if (verifyData?.email && verifyData?.token) {
        const { error: signInError } = await supabase.auth.verifyOtp({
          email: verifyData.email,
          token: verifyData.token,
          type: 'email',
        });
        if (signInError) throw signInError;
      }

      toast({
        title: "Welcome Back",
        description: "Biometric authentication successful.",
      });
      onSuccess?.();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({ title: "Cancelled", description: "Authentication was cancelled.", variant: "destructive" });
      } else {
        toast({ title: "Authentication Failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="w-full space-y-3">
      {mode === "register" ? (
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
          Register Biometric Login
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleLogin}
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
          Sign in with Biometrics
        </Button>
      )}
    </div>
  );
};
