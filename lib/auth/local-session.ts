import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { postgresQuery } from "@/lib/db/postgres";

const COOKIE_NAME = "passflow_session";
const SESSION_DAYS = 14;

type LocalSessionRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  email: string | null;
  email_confirmed_at: Date | string | null;
  raw_user_meta_data: Record<string, unknown>;
};

function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

/**
 * Create a local session for an existing auth.users account.
 * Call only after the caller has successfully authenticated the user.
 */
export async function createLocalSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );

  const inserted = await postgresQuery(
    `INSERT INTO auth.app_sessions (user_id, token_hash, expires_at)
     SELECT id, $2, $3
     FROM auth.users
     WHERE id = $1 AND email_confirmed_at IS NOT NULL
     RETURNING id`,
    [userId, hashToken(token), expiresAt],
  );

  if (inserted.rowCount !== 1) {
    throw new Error("local_session_user_not_confirmed_or_missing");
  }

  const jar = await cookies();
  // Remove any legacy host-only cookie before issuing the shared first-party cookie.
  jar.delete(COOKIE_NAME);
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".passflow.my.id" : undefined,
    expires: expiresAt,
  });
}

/** Return the current local user, or null when the session is invalid. */
export async function getLocalSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (!token || token.length > 128) return null;

  const result = await postgresQuery<LocalSessionRow>(
    `SELECT s.id, s.user_id, u.email, u.email_confirmed_at, u.raw_user_meta_data
     FROM auth.app_sessions s
     JOIN auth.users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND u.email_confirmed_at IS NOT NULL
     LIMIT 1`,
    [hashToken(token)],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    sessionId: row.id,
    user: {
      id: row.user_id,
      email: row.email,
      email_confirmed_at: row.email_confirmed_at,
      user_metadata: row.raw_user_meta_data ?? {},
    },
  };
}

/** Revoke the current local session and clear its browser cookie. */
export async function revokeLocalSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (token && token.length <= 128) {
    await postgresQuery(
      `UPDATE auth.app_sessions
       SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hashToken(token)],
    );
  }

  jar.delete(COOKIE_NAME);
}
