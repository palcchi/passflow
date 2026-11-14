-- Additive staging table for phone-first signup; never stores a plaintext password or OTP.
CREATE TABLE IF NOT EXISTS auth.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  username text NOT NULL,
  phone text NOT NULL,
  encrypted_password text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  send_count integer NOT NULL DEFAULT 1 CHECK (send_count >= 1),
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS pending_signups_email_created_idx ON auth.pending_signups (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS pending_signups_phone_created_idx ON auth.pending_signups (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS pending_signups_active_idx ON auth.pending_signups (expires_at) WHERE consumed_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.pending_signups TO service_role;
