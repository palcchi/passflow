import type { createServerSupabaseClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type ProfileRow = { attendee_id: string; photo_storage_path: string | null; avatar_url: string | null };

export const attendeePhotoColumns = "attendee_id,photo_storage_path,avatar_url";

// avatar_url mirrors user-editable account metadata, so only our avatar bucket and Google photos are trusted.
export function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let bucket: string | null = null;
  try { bucket = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin + "/storage/v1/object/public/profile-avatars/"; } catch {}
  return (bucket && value.startsWith(bucket)) || value.startsWith("https://lh3.googleusercontent.com/") ? value : null;
}

/** attendee_id → displayable photo: account avatar first, then a legacy per-event pass photo. */
export async function attendeePhotoUrls(supabase: Client, profiles: ProfileRow[] | null, ttl = 300) {
  const urls = new Map<string, string>();
  const legacy = new Map<string, string>();
  for (const profile of profiles ?? []) {
    const avatar = safeAvatarUrl(profile.avatar_url);
    if (avatar) urls.set(profile.attendee_id, avatar);
    else if (profile.photo_storage_path) legacy.set(profile.photo_storage_path, profile.attendee_id);
  }
  if (legacy.size) {
    const { data } = await supabase.storage.from("attendee-photos").createSignedUrls([...legacy.keys()], ttl);
    for (const item of data ?? []) {
      const attendeeId = item.path ? legacy.get(item.path) : undefined;
      if (attendeeId && item.signedUrl) urls.set(attendeeId, item.signedUrl);
    }
  }
  return urls;
}
