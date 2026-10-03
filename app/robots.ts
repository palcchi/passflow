import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin() ?? "https://passflow.my.id";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/profile", "/scan", "/crew", "/api", "/auth", "/organizer/start", "/e/*/claim"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
