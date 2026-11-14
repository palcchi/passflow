import "server-only";
import bcrypt from "bcryptjs";

/**
 * Verify a submitted password against an existing bcrypt hash.
 * Existing Supabase hashes are intentionally checked as-is; never re-hash the
 * stored hash, log it, or return it to callers. This helper is not wired into
 * the login action until the local-auth cutover is explicitly validated.
 */
export async function verifyPasswordHash(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) return false;
  if (typeof storedHash !== "string" || storedHash.length === 0) return false;
  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}

/** Hash a new password for local accounts; migrated hashes remain unchanged. */
export async function hashNewPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length < 8 || password.length > 1024 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("password_policy_failed");
  }
  return bcrypt.hash(password, 12);
}
