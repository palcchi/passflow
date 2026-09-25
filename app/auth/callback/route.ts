import { NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
function go(path: string) {
  // Relative Location: never trust host/forwarded-host headers for email authentication redirects.
  return new NextResponse(null, { status: 303, headers: { Location: path, "Cache-Control": "private, no-store" } });
}
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const failure = `/login?error=callback&next=${encodeURIComponent(next)}`;
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error") || !getSupabaseConfig()) return go(failure);
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return go(next);
  } catch { /* Expired/cancelled/unavailable auth. */ }
  return go(failure);
}
