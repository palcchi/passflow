import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { postgresQuery } from "@/lib/db/postgres";
import { eventHostLabel, eventRootDomain } from "@/lib/event-host";

type EventSlugRow = { slug: string; venue: string | null };

export async function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (host.endsWith("." + eventRootDomain) && host !== "www." + eventRootDomain) {
    const label = eventHostLabel(host);
    const unavailable = () => new NextResponse("Event not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
    if (!label || process.env.PASSFLOW_EVENT_SUBDOMAINS_ENABLED !== "true") return unavailable();

    // Event subdomains only accept safe reads and same-origin Next Server Actions.
    if (!["GET", "HEAD", "POST"].includes(request.method)) {
      return new NextResponse("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD, POST", "Cache-Control": "no-store" } });
    }
    if (request.method === "POST") {
      const origin = request.headers.get("origin");
      let sameOrigin = false;
      try { sameOrigin = !!origin && new URL(origin).host.toLowerCase() === host; } catch {}
      if (!request.headers.has("next-action") || !sameOrigin) {
        return new NextResponse("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" } });
      }
    }

    let event: EventSlugRow | undefined;
    try {
      const resolved = await postgresQuery<EventSlugRow>(
        `SELECT e.slug, e.venue
         FROM public.event_subdomains d
         JOIN public.events e ON e.id = d.event_id
         WHERE d.label = $1 AND e.status = 'published'
         LIMIT 1`,
        [label],
      );
      event = resolved.rows[0];
    } catch { return unavailable(); }
    if (!event?.slug || !/^[a-zA-Z0-9_-]+$/.test(event.slug)) return unavailable();

    const path = request.nextUrl.pathname;
    const eventPath = "/e/" + event.slug;
    const mainDomainOnly = /^\/(?:login|phone|account|profile|notifications|events|organizer|forgot-password|reset-password|auth|scan|api|unauthorized|terms|privacy)(?:\/|$)/.test(path);
    if (mainDomainOnly) {
      const target = new URL(path + request.nextUrl.search, "https://" + eventRootDomain);
      return NextResponse.redirect(target, 307);
    }

    if (path === "/location" || path === "/venue") {
      const venue = event.venue?.trim();
      if (!venue) return NextResponse.redirect(new URL("/", request.nextUrl.origin), 302);
      const maps = new URL("https://www.google.com/maps/search/");
      maps.searchParams.set("api", "1");
      maps.searchParams.set("query", venue);
      return NextResponse.redirect(maps, 302);
    }

    // Canonicalize older internal event URLs to clean event-subdomain paths.
    if (request.method !== "POST" && (path === eventPath || path.startsWith(eventPath + "/"))) {
      const suffix = path === eventPath ? "/" : path.slice(eventPath.length);
      const alias = suffix === "/claim" ? "/register"
        : suffix === "/calendar" ? "/calendar"
        : suffix === "/" ? "/"
        : suffix;
      const target = new URL(alias + request.nextUrl.search, request.nextUrl.origin);
      return NextResponse.redirect(target, 307);
    }
    if (request.method !== "POST" && path === "/claim") {
      return NextResponse.redirect(new URL("/register" + request.nextUrl.search, request.nextUrl.origin), 307);
    }

    let rewritePath: string;
    if (request.method === "POST" && (path === eventPath + "/claim" || path === eventPath + "/register" || path === eventPath + "/ticket")) rewritePath = eventPath + "/claim";
    else if (path === "/") rewritePath = eventPath;
    else if (["/register", "/ticket", "/claim"].includes(path)) rewritePath = eventPath + "/claim";
    else if (path === "/calendar") rewritePath = eventPath + "/calendar";
    else if (path === "/opengraph-image") rewritePath = eventPath + "/opengraph-image";
    else if (/^\/[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(path)) rewritePath = eventPath + path;
    else return unavailable();

    // Nginx terminates TLS; rewrite internally through the local HTTP listener.
    const url = new URL("http://127.0.0.1:3000");
    url.pathname = rewritePath;
    url.search = request.nextUrl.search;
    const headers = new Headers(request.headers);
    headers.set("x-passflow-path", url.pathname);
    headers.set("x-passflow-event-host", host);
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  function nextResponse() {
    const headers = new Headers(request.headers);
    headers.set("x-passflow-path", request.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  }

  let response = nextResponse();
  const config = getSupabaseConfig();
  if (config) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    try { await supabase.auth.getUser(); } catch {
      // Server page/action guards validate again and deny access on auth failure.
    }
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|woff2|css|js|zip)$).*)',
    "/",
    "/e/:slug",
    "/api/scan",
    "/organizer/events/:path*",
    "/account/:path*",
    "/profile",
    "/api/figma/:path*",
    "/events",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
    "/scan/:path*",
    "/unauthorized",
  ],
};
