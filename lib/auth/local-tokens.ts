import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { postgresQuery } from "@/lib/db/postgres";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest();
}

export async function issueEmailVerificationToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await postgresQuery(
    `UPDATE auth.email_verification_tokens SET consumed_at = now()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  );
  await postgresQuery(
    `INSERT INTO auth.email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '24 hours')`,
    [userId, hashToken(token)],
  );
  return token;
}

export async function verifyLocalEmailToken(token: string) {
  if (!token || token.length > 128) return false;
  const result = await postgresQuery<{ id: string; user_id: string }>(
    `UPDATE auth.email_verification_tokens
     SET consumed_at = now()
     WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
     RETURNING id, user_id`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return false;
  const updated = await postgresQuery(
    `UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
       confirmation_token = NULL, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [row.user_id],
  );
  return updated.rowCount === 1;
}

export async function issuePasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await postgresQuery(
    `UPDATE auth.password_reset_tokens SET consumed_at = now()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  );
  await postgresQuery(
    `INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '1 hour')`,
    [userId, hashToken(token)],
  );
  return token;
}

export async function consumePasswordResetToken(token: string, passwordHash: string) {
  if (!token || token.length > 128) return false;
  const result = await postgresQuery<{ id: string; user_id: string }>(
    `UPDATE auth.password_reset_tokens
     SET consumed_at = now()
     WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
     RETURNING id, user_id`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return false;
  const updated = await postgresQuery(
    `UPDATE auth.users SET encrypted_password = $2, recovery_token = NULL,
       recovery_sent_at = NULL, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [row.user_id, passwordHash],
  );
  if (updated.rowCount !== 1) return false;
  await postgresQuery(
    `UPDATE auth.app_sessions SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [row.user_id],
  );
  return true;
}
