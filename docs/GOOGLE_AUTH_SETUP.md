# Google sign-in setup

## Implementation status

Google is the single login/register method. A first successful login creates a Supabase Auth user; it does **not** register an attendee, grant an event pass, or grant organizer privileges. Existing users sign in with the same button.

Implemented: server-side PKCE initiation and callback, cookie sessions, Next.js proxy refresh, verified `getUser()` guards, local-device logout, account page, role guards, and read-only membership RLS. Secrets/service-role keys are not used by the login flow.

External configuration and a real Google account round trip are still required. Without configuration, the Google button is disabled and private pages redirect to login. No mock login fallback exists.

## 1. Supabase

1. Create a Supabase project in your account.
2. Run `supabase/migrations/0001_initial_schema.sql`, then `0002_auth_read_policies.sql` using the SQL editor or your migration workflow.
3. Copy Project URL and the publishable key from Connect/API settings. The legacy anon key is also supported.
4. Add to `.env.local` and Vercel environment variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=https://YOUR_PASSFLOW_DOMAIN
```

For local development, use `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Redeploy after changing public environment variables. `SUPABASE_SERVICE_ROLE_KEY` is not required for authentication.

## 2. Google Auth Platform

1. Create/select a Google Cloud project and configure the OAuth consent screen (app name PassFlow, support email, audience).
2. Request only identity scopes: `openid`, email, profile.
3. Create an OAuth Client ID of type **Web application**.
4. Add the PassFlow origin to Authorized JavaScript origins. Add localhost only for local development.
5. Add this **Google Authorized redirect URI** (copy the exact value from Supabase Google provider settings):

```text
https://PROJECT_REF.supabase.co/auth/v1/callback
```

6. Enable Google under Supabase Authentication > Sign In / Providers. Save the Client ID and Client Secret **there**, not in GitHub and not in a `NEXT_PUBLIC_` variable.
7. If Google's audience is in Testing mode, add the Google accounts used for testing as test users.

## 3. Supabase redirect URLs

Set Site URL to the deployed PassFlow origin and allow:

```text
https://YOUR_PASSFLOW_DOMAIN/auth/callback
https://YOUR_PASSFLOW_DOMAIN/auth/callback?next=*
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=*
```

The Google redirect goes to **Supabase**. The Supabase redirect goes to **PassFlow**. These are different URLs. Allow only your actual origin(s), including a fixed preview origin if needed. The application validates `next` against known internal routes and never derives the OAuth destination from forwarded-host headers.

## 4. First organizer

First sign in once with Google, then copy the user's UUID from Supabase Authentication > Users. As the trusted project owner, execute the following in the SQL editor, replacing the UUID. Never expose this action as public signup:

```sql
begin;
insert into public.organizations (name, slug)
values ('Kelompok 7', 'kelompok-7')
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'owner'
from public.organizations where slug = 'kelompok-7'
on conflict (organization_id, user_id) do update set role = 'owner';
commit;
```

Use `staff` for scanner operators and `admin` for additional organizers. Roles are per organization. Visitor is the default absence of privileged membership. User-editable Google/profile metadata is never used for role decisions.

## 5. Acceptance checks with real credentials

- New Google user: sign in, see `/account`, remain visitor, no attendee or pass created.
- Existing user: sign in again, reuse the same account; refresh and reopen the browser.
- Cancel Google sign-in or replay an expired callback: see a readable retry message.
- Visitor opens `/admin` or a station: denied.
- Staff: cannot open admin; can open only an active station in their own organization.
- Organizer: can open the demo dashboard; dashboard data and appearance are still prototypes.
- Sign out: private routes redirect to login; no personal page may be cached publicly.
- On iPhone/iPad Safari: complete redirects, refresh session, sign out.

## Current limits

The scanner route now shows a setup state after authorization instead of granting access based on a string prefix. Camera component remains in source for the later server-validation phase. Claim page no longer simulates an active wristband for a signed-in user. Event data is still demo data. These features must be connected to real event-scoped queries/transactions in later phases.

RLS migration currently grants limited reads only. Organizer event writes, attendee registration, QR claim, uploads, and scan logs remain closed. Keep resource-specific authorization in future Server Actions/Route Handlers; a layout guard alone is insufficient. When replacing demo appearance routes, authorize the specific event's organization, not only a user's organizer role somewhere.

CI uses an isolated PostgreSQL database with a minimal `auth.uid()` fixture for RLS tests; do not run `supabase/tests/bootstrap.sql` on real Supabase. CI does not impersonate Google or prove live OAuth configuration.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
