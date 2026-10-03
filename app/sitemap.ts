import type { MetadataRoute } from "next";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getAppOrigin() ?? "https://passflow.my.id";
  const pages: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/organizer`, changeFrequency: "monthly", priority: 0.8 },
  ];
  if (!getSupabaseConfig()) return pages;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("events").select("slug,updated_at").eq("status", "published");
  return pages.concat((data ?? []).map((event) => ({
    url: `${origin}/e/${encodeURIComponent(event.slug)}`,
    lastModified: event.updated_at ?? undefined,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  })));
}
