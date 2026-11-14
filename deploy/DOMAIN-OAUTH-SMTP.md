# Passflow domain, OAuth and SMTP cutover checklist

## Current verified state
- Public domain currently answers through Cloudflare and serves the existing Vercel deployment.
- EC2 public IPv4 last observed: 3.107.99.15; verify again before DNS changes.
- Next.js runs only on loopback port 3100 in development mode.
- No public HTTP/HTTPS listener was found on the VPS.
- Do not point production DNS at this host until a production service and HTTPS are tested.
- Supabase auth remains enabled; no local-auth cutover has been performed.

## DNS change in Cloudflare (only when app is ready)
- A @ -> current EC2 Elastic IP, Proxied (orange cloud).
- CNAME www -> passflow.my.id, Proxied, or A www -> same EC2 IP.
- Replace conflicting old Vercel web records only during the planned cutover.
- Preserve MX, SPF, DKIM, DMARC, and unrelated verification records.
- Mail host records and MX are DNS-only; do not proxy SMTP.
- Confirm EC2 security group permits TCP 80 and 443.

## TLS
1. Keep production DNS unchanged until app and reverse proxy are ready.
2. Install Nginx/Certbot after checking package/service state.
3. Point web DNS to VPS during cutover, validate HTTP challenge, then issue a publicly trusted certificate.
4. Set Cloudflare SSL/TLS mode to Full (strict) only after origin HTTPS validates.
5. Test redirects, callbacks, cookies, and critical routes before changing auth flags.

## Google OAuth
Current /auth/callback is Supabase OAuth-only. Do not register direct Google callback as production-ready until the local OAuth callback is implemented and tested. Planned URI:
https://passflow.my.id/auth/google/callback
Add that exact URI to the Google OAuth web client only after implementation. Keep the existing Supabase callback registration for rollback.

## SMTP
Set SMTP_HOST, SMTP_PORT=587, SMTP_USER, SMTP_PASS and SMTP_FROM in the private auth env file. Configure SPF/DKIM and preferably DMARC at the mail provider. SMTP is not proxied by Cloudflare. Test controlled delivery before enabling signup/verification/reset flows.

## Safe rollout
- Keep Supabase project and existing environment available for rollback.
- Test local password sign-in using a staging account.
- Implement/test Google OAuth state, nonce, PKCE, callback validation, account linking, and session creation before enabling it.
- Migrate verification/reset token flows and email delivery before disabling Supabase auth.
- Full migration requires parity tests for data access, storage, webhooks, Figma integration, ticketing, QR scans, notifications, and organizer permissions.
