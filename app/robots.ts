import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin() ?? "https://passflow.my.id";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/organizer/events", "/account", "/profile", "/scan", "/crew", "/api", "/auth", "/organizer/start", "/platform", "/e/*/claim"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
