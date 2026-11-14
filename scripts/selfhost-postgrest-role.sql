-- Run only against the Passflow self-hosted staging database.
-- psql variable pgrst_password must be a randomly generated URL-safe password.
SELECT format(
  'CREATE ROLE passflow_api_authenticator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
  :'pgrst_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'passflow_api_authenticator')
\gexec
SELECT format(
  'ALTER ROLE passflow_api_authenticator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
  :'pgrst_password'
)
\gexec
GRANT anon, authenticated, service_role TO passflow_api_authenticator;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public, auth, storage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, auth, storage TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public, auth, storage TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth, storage TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, storage GRANT EXECUTE ON FUNCTIONS TO service_role;
