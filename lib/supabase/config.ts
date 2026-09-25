export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}
export function getAppOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}
