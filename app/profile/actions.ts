"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function refreshProfile() {
  revalidatePath("/account");
  revalidatePath("/profile");
  revalidatePath("/admin");
}

export async function saveProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    redirect("/profile?status=invalid-username");
  }
  if (fullName.length < 2 || fullName.length > 60) {
    redirect("/profile?status=invalid-name");
  }

  const { supabase } = await requireUser("/profile");
  const { error } = await supabase.auth.updateUser({
    data: {
      username,
      full_name: fullName,
    },
  });

  if (error) redirect("/profile?status=error");
  refreshProfile();
  redirect("/profile?status=saved");
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/profile?status=avatar-missing");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    redirect("/profile?status=avatar-format");
  }
  if (file.size > 2 * 1024 * 1024) {
    redirect("/profile?status=avatar-size");
  }

  const { supabase, user } = await requireUser("/profile");
  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
  const path = `${user.id}/avatar-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("profile-avatars")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) redirect("/profile?status=avatar-error");

  const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
  const { error: profileError } = await supabase.auth.updateUser({
    data: { avatar_url: data.publicUrl },
  });

  if (profileError) redirect("/profile?status=avatar-error");
  refreshProfile();
  redirect("/profile?status=avatar-saved");
}

export async function removeAvatar() {
  const { supabase } = await requireUser("/profile");
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
  if (error) redirect("/profile?status=avatar-error");
  refreshProfile();
  redirect("/profile?status=avatar-removed");
}
