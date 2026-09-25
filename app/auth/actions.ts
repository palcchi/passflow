"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { safeNext } from "@/lib/auth/redirect";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const origin = getAppOrigin();
  if (!origin || !getSupabaseConfig()) redirect(`/login?error=unavailable&next=${encodeURIComponent(next)}`);
  let destination: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (!error) destination = data.url;
  } catch { /* Do not expose provider internals. */ }
  if (destination) redirect(destination);
  redirect(`/login?error=provider&next=${encodeURIComponent(next)}`);
}
export async function signOut() {
  let failed = false;
  if (getSupabaseConfig()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      failed = !!error;
    } catch { failed = true; }
  }
  if (failed) redirect("/login?error=signout");
  revalidatePath("/", "layout");
  redirect("/login?notice=signed-out");
}
