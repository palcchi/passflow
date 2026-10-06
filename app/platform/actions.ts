"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { serviceClient } from "@/lib/supabase/service";

async function adminTarget(formData: FormData) {
  const { user } = await requireUser("/platform/organizers");
  if (!isPlatformAdmin(user)) redirect("/unauthorized");
  const userId = String(formData.get("userId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) redirect("/platform/organizers?status=error");
  return userId;
}

// Fallback for applications the server could not approve on submit (for example a missing service key).
export async function approveOrganizer(formData: FormData) {
  const userId = await adminTarget(formData);
  const { error } = await serviceClient().rpc("review_organizer_application", { p_user_id: userId, p_approve: true });
  revalidatePath("/platform/organizers");
  redirect("/platform/organizers?status=" + (error ? "error" : "approved"));
}

// Revoking removes the account from its organization, so the workspace closes; its events stay as they are
// and can be archived from the event itself. The application is marked rejected, so re-applying does not
// approve it again.
export async function revokeOrganizer(formData: FormData) {
  const userId = await adminTarget(formData);
  const admin = serviceClient();
  const { data: app } = await admin.from("organizer_applications").select("organization_id").eq("user_id", userId).maybeSingle();
  if (app?.organization_id) {
    const { error } = await admin.from("organization_members").delete().eq("user_id", userId).eq("organization_id", app.organization_id);
    if (error) redirect("/platform/organizers?status=error");
  }
  await admin.from("organizer_applications").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("user_id", userId);
  revalidatePath("/platform/organizers");
  redirect("/platform/organizers?status=revoked");
}
