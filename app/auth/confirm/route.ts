import { NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createServerAuthClient } from "@/lib/supabase/server";
import { verifyLocalEmailToken } from "@/lib/auth/local-tokens";

type EmailOtpType = "email" | "signup" | "recovery" | "invite" | "email_change";

function go(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "private, no-store",
    },
  });
}

const allowedTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "recovery",
  "invite",
  "email_change",
]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
    return go("/login?error=callback");
  }

  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    if (rawType !== "signup" && rawType !== "email") return go("/login?error=callback");
    try {
      const verified = await verifyLocalEmailToken(tokenHash);
      if (verified) return go(`/login?notice=verified&next=${encodeURIComponent(next)}`);
    } catch {}
    return go("/login?error=callback");
  }

  if (!getSupabaseConfig()) return go("/login?error=callback");

  try {
    const supabase = await createServerAuthClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as EmailOtpType,
    });

    if (!error) return go(next);
  } catch {
    // Invalid, expired, or unavailable token.
  }

  return go("/login?error=callback");
}
