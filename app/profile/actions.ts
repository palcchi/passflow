"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerAuthClient } from "@/lib/supabase/server";
import { updateLocalUserMetadata } from "@/lib/auth/local-user";
import { removeLocalObject, saveLocalObject } from "@/lib/storage/local-files";

function refreshProfile() {
  revalidatePath("/account");
  revalidatePath("/profile");
  revalidatePath("/organizer/events");
}

async function updateProfileMetadata(userId: string, patch: Record<string, unknown>) {
  if (process.env.PASSFLOW_LOCAL_AUTH === "true") {
    return updateLocalUserMetadata(userId, patch);
  }
  const supabase = await createServerAuthClient();
  const { error } = await supabase.auth.updateUser({ data: patch });
  return !error;
}

export async function saveProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");

  if (!/^[a-z0-9_]{3,24}$/.test(username)) redirect("/profile?status=invalid-username");
  if (fullName.length < 2 || fullName.length > 60) redirect("/profile?status=invalid-name");

  const { user } = await requireUser("/profile");
  if (!(await updateProfileMetadata(user.id, { username, full_name: fullName }))) {
    redirect("/profile?status=error");
  }
  refreshProfile();
  redirect("/profile?status=saved");
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) redirect("/profile?status=avatar-missing");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) redirect("/profile?status=avatar-format");
  if (file.size > 2 * 1024 * 1024) redirect("/profile?status=avatar-size");

  const { user } = await requireUser("/profile");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl = "";
  try {
    const saved = await saveLocalObject("profile-avatars", path, buffer);
    if (!saved.publicUrl) throw new Error("avatar_storage_not_public");
    publicUrl = saved.publicUrl;
  } catch {
    redirect("/profile?status=avatar-error");
  }
  const metadataSaved = await updateProfileMetadata(user.id, { avatar_url: publicUrl }).catch(() => false);
  if (!metadataSaved) {
    await removeLocalObject("profile-avatars", path).catch(() => undefined);
    redirect("/profile?status=avatar-error");
  }

  refreshProfile();
  redirect("/profile?status=avatar-saved");
}

export async function removeAvatar() {
  const { user } = await requireUser("/profile");
  if (!(await updateProfileMetadata(user.id, { avatar_url: null }))) redirect("/profile?status=avatar-error");
  refreshProfile();
  redirect("/profile?status=avatar-removed");
}
