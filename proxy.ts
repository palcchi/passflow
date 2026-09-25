import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
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

    try {
      await supabase.auth.getUser();
    } catch {
      // Server page/action guards validate again and deny access on auth failure.
    }
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
    "/scan/:path*",
    "/e/:slug/claim",
    "/unauthorized",
  ],
};
