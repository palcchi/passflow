import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { supabase, user } = await requireUser("/profile");
  const { error } = await supabase.from("figma_connections").delete().eq("user_id", user.id);
  return NextResponse.redirect(new URL(error ? "/profile?figma=error" : "/profile?figma=disconnected", request.url), { status: 303 });
}
