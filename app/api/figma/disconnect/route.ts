import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { supabase, user } = await requireOrganizer("/admin");
  await supabase.from("figma_connections").delete().eq("user_id", user.id);
  return NextResponse.redirect(new URL("/admin?figma=disconnected", request.url));
}
