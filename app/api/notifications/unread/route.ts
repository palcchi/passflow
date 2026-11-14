import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ count: 0 }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
      const { postgresQuery } = await import("@/lib/db/postgres");
      const result = await postgresQuery<{ count: number }>(
        "SELECT count(*)::int AS count FROM public.notifications WHERE user_id = $1 AND read_at IS NULL",
        [context.user.id],
      );
      return NextResponse.json({ count: result.rows[0]?.count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
    }
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .is("read_at", null);
    if (error) return NextResponse.json({ count: 0 }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ count: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
