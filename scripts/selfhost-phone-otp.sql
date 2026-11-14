-- Additive migration for required WhatsApp phone verification.
CREATE TABLE IF NOT EXISTS public.phone_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS phone_otp_user_created_idx ON public.phone_otp_challenges(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_otp_phone_created_idx ON public.phone_otp_challenges(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS phone_otp_active_user_idx ON public.phone_otp_challenges(user_id, created_at DESC) WHERE consumed_at IS NULL;
