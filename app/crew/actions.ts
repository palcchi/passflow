"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function acceptCrewInvitation(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/login?error=callback");
  await requireUser(`/crew/join?token=${encodeURIComponent(token)}`);
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("accept_event_invitation", { p_token: token });
  const result = data as { ok?: boolean; event_slug?: string } | null;
  if (!result?.ok || !result.event_slug) redirect(`/login?error=callback`);
  redirect(`/e/${result.event_slug}/claim`);
}
