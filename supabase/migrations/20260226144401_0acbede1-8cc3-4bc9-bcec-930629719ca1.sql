
-- Table to store WebAuthn credentials
CREATE TABLE public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  transports text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials"
ON public.webauthn_credentials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can register credentials"
ON public.webauthn_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
ON public.webauthn_credentials FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
ON public.webauthn_credentials FOR DELETE
USING (auth.uid() = user_id);
