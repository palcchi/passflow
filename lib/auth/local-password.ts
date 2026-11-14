import "server-only";

import { postgresQuery } from "@/lib/db/postgres";
import { createLocalSession } from "@/lib/auth/local-session";
import { verifyPasswordHash } from "@/lib/auth/password";

type LocalPasswordUser = {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  email_confirmed_at: Date | string | null;
  raw_user_meta_data: Record<string, unknown> | null;
};

export type LocalPasswordSignInResult =
  | { ok: true; user: { id: string; email: string | null; user_metadata: Record<string, unknown> } }
  | { ok: false; reason: "invalid" | "unverified" };

/**
 * Verify an existing Supabase-compatible password hash against Passflow's own
 * PostgreSQL auth.users table. This helper is intentionally not wired into the
 * public login action until staging and app data access are fully validated.
 */
export async function signInWithLocalPassword(
  emailInput: string,
  password: string,
): Promise<LocalPasswordSignInResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || email.length > 320 || !password || password.length > 1024) {
    return { ok: false, reason: "invalid" };
  }

  const result = await postgresQuery<LocalPasswordUser>(
    `SELECT id, email, encrypted_password, email_confirmed_at, raw_user_meta_data
     FROM auth.users
     WHERE lower(email) = $1
     LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await verifyPasswordHash(password, user.encrypted_password))) {
    return { ok: false, reason: "invalid" };
  }
  if (!user.email_confirmed_at) return { ok: false, reason: "unverified" };

  await postgresQuery(
    `UPDATE auth.users SET last_sign_in_at = now(), updated_at = now() WHERE id = $1`,
    [user.id],
  );
  await createLocalSession(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.raw_user_meta_data ?? {},
    },
  };
}
