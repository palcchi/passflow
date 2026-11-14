import type { MetadataRoute } from "next";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getAppOrigin() ?? "https://passflow.my.id";
  const pages: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/organizer`, changeFrequency: "monthly", priority: 0.8 },
  ];
  if (process.env.PASSFLOW_LOCAL_DATABASE !== "true" && !getSupabaseConfig()) return pages;
  const supabase = process.env.PASSFLOW_LOCAL_DATABASE === "true"
    ? serviceClient()
    : await createServerSupabaseClient();
  const { data } = await supabase.from("events").select("slug,updated_at").eq("status", "published");
  return pages.concat((data ?? []).map((event) => ({
    url: `${origin}/e/${encodeURIComponent(event.slug)}`,
    lastModified: event.updated_at ?? undefined,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  })));
}
