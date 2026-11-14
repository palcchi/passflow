-- Compatibility primitives needed to evaluate the project's existing schema on plain PostgreSQL.
-- This is not an authentication implementation; the application must replace Supabase Auth separately.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_super_admin boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
    NULLIF((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')::uuid
  )
$$;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  owner uuid,
  public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN name IS NULL OR name = '' THEN ARRAY[]::text[] ELSE (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1)-1,0)] END $$;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth, storage TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, storage GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, storage GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth, storage TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, storage GRANT EXECUTE ON FUNCTIONS TO service_role;
