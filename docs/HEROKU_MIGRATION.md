# Heroku Migration Runbook

Status: preparation only. This document does not authorize deployment, production configuration changes, DNS changes, or database changes.

## Target architecture

- Heroku runs the existing Next.js application as a Node.js server.
- Supabase remains the database, authentication, and storage provider.
- Cloudflare remains the DNS provider.
- Keep the current Vercel production deployment available as rollback until the Heroku staging and production cutover are explicitly approved.

## Runtime

The application uses `npm run build` and `npm run start`. Heroku should use the Node.js buildpack and the `PORT` provided by the platform. Do not convert this application to static export: API routes, Server Actions, server rendering, and server-only integrations require a server runtime.

The project currently targets Node.js 22.x to match the existing CI workflow. Re-run CI and build checks before considering a runtime upgrade.

## Environment configuration

Set values through Heroku Config Vars, not committed files. Configure only what the application actually uses:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback if the project still uses it)
- `NEXT_PUBLIC_APP_URL` (must be the staging origin on the staging app)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose with a `NEXT_PUBLIC_` prefix)
- `FIGMA_CLIENT_ID`
- `FIGMA_CLIENT_SECRET`
- `FIGMA_TOKEN_ENCRYPTION_KEY`
- `FIGMA_WEBHOOK_CONNECTIONS` only if configured webhooks are being tested
- `PASSFLOW_EVENT_SUBDOMAINS_ENABLED=false` until wildcard DNS, TLS, host routing, and relevant tests are verified

Do not copy secrets into GitHub, issue comments, logs, or this runbook. SMTP and Google OAuth client settings are managed in Supabase Auth/provider configuration rather than by adding secret values to this repository.

## Staging setup checklist

1. Create a separate Heroku staging app. Do not attach `passflow.my.id` or its production subdomains.
2. Connect the migration branch or deploy it manually only after explicit deployment approval.
3. Add the required staging Config Vars.
4. Keep Supabase data isolated where practical. Prefer a separate Supabase staging project for end-to-end tests that can create, update, or delete records. If reusing production Supabase is unavoidable, restrict tests to non-destructive checks and do not run destructive migrations.
5. Set the staging URL in `NEXT_PUBLIC_APP_URL`.
6. Add the staging origin and callback URLs to Supabase Auth URL configuration. Verify Google OAuth redirect/callback settings against the exact Supabase callback URL; do not replace production URLs.
7. Run CI checks: install from lockfile, lint, typecheck, unit/integration tests, production build, and Playwright UI checks.
8. Verify login/logout, Google OAuth, email verification/recovery, organizer authorization, event creation, attendee registration/claim, QR scanner, CSV export, and Figma pairing/sync.
9. Inspect logs and memory usage under realistic traffic. A Basic dyno has limited memory, so verify before committing to the production configuration.

## Known Vercel-specific behavior to resolve

`app/api/figma/plugin/pair/route.ts` currently derives its rate-limit bucket from `x-vercel-forwarded-for` only when `process.env.VERCEL` exists; all other environments use the constant `local-development`. This is not suitable for Heroku. Before production, implement and test a platform-aware client-IP strategy using Heroku's documented proxy behavior, with a safe fallback. Do not trust arbitrary forwarded headers without verifying the platform's header semantics.

Audit the rest of the source for Vercel-specific environment variables, request headers, image optimization, filesystem assumptions, and deployment-only integrations before cutover.

## Cutover and rollback (not approved yet)

1. Require explicit approval before any production deployment or DNS change.
2. Add the production custom domain in Heroku and configure the exact DNS record requested by Heroku.
3. Verify TLS and application health before directing traffic.
4. Update Supabase Auth allowed URLs and OAuth settings only as needed, preserving current production entries during transition.
5. Change Cloudflare DNS only after staging acceptance and an approved cutover plan.
6. Keep Vercel available for rollback. Revert DNS if health checks fail; do not delete the old deployment during the validation window.

## Cost controls

- Start with one Basic dyno for the always-on app; do not add paid add-ons without approval.
- Check Heroku billing and credit eligibility/expiration before enabling resources.
- Keep staging minimal and shut it down when not in use if its chosen plan permits.
- Monitor dyno restarts, memory, and credit usage during testing.
