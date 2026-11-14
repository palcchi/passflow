import "server-only";

import { postgresQuery } from "@/lib/db/postgres";

/** Merge user-editable metadata into the local account without replacing provider claims. */
export async function updateLocalUserMetadata(userId: string, patch: Record<string, unknown>) {
  const result = await postgresQuery(
    `UPDATE auth.users
     SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $2::jsonb,
         updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [userId, JSON.stringify(patch)],
  );
  return result.rowCount === 1;
}
