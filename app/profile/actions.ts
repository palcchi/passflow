"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export async function saveUsername(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) redirect("/profile?status=invalid");
  const { supabase } = await requireUser("/profile");
  const { error } = await supabase.auth.updateUser({ data: { username } });
  if (error) redirect("/profile?status=error");
  revalidatePath("/account");
  revalidatePath("/profile");
  redirect("/profile?status=saved");
}
