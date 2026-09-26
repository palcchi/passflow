"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
function resultReason(value: unknown) { const result = value as { reason?: unknown } | null; return result && typeof result === "object" && "reason" in result ? String(result.reason) : "unknown"; }
function rpcResult(value: unknown) { return value as { ok?: boolean; reason?: unknown } | null; }
export async function registerForEvent(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const name=String(formData.get("name")??"").trim(); const phone=String(formData.get("phone")??"").trim(); const ticket=String(formData.get("ticket_code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("register_for_event",{p_event_slug:slug,p_name:name,p_phone:phone||undefined,p_ticket_code:ticket||undefined});
  if(error || !rpcResult(data)?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(rpcResult(data)))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?registered=1`);
}
export async function claimQr(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const code=String(formData.get("code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("claim_qr",{p_event_slug:slug,p_code:code});
  if(error || !rpcResult(data)?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(rpcResult(data)))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?claimed=1`);
}
export async function replaceQr(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const code=String(formData.get("code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("replace_qr",{p_event_slug:slug,p_code:code});
  if(error || !rpcResult(data)?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(rpcResult(data)))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?replaced=1`);
}

export async function uploadAttendeePhoto(formData: FormData) {
  const slug = String(formData.get("event_slug") ?? "").trim();
  const context = await requireUser(`/e/${slug}/claim`);
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) redirect(`/e/${encodeURIComponent(slug)}/claim?photo=invalid`);
  if (photo.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
    redirect(`/e/${encodeURIComponent(slug)}/claim?photo=invalid`);
  }
  const { data: event } = await context.supabase.from("events").select("id").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!event) redirect("/events");
  const { data: attendee } = await context.supabase.from("attendees").select("id").eq("event_id", event.id).eq("user_id", context.user.id).maybeSingle();
  if (!attendee) redirect(`/e/${encodeURIComponent(slug)}/claim?error=not_registered`);
  const ext = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
  const path = `${context.user.id}/${event.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await context.supabase.storage.from("attendee-photos").upload(path, photo, { contentType: photo.type, upsert: false });
  if (uploadError) redirect(`/e/${encodeURIComponent(slug)}/claim?photo=failed`);
  const { data: previous } = await context.supabase.from("attendee_profiles").select("photo_storage_path").eq("attendee_id", attendee.id).maybeSingle();
  const { error: saveError } = await context.supabase.from("attendee_profiles").upsert({ attendee_id: attendee.id, event_id: event.id, user_id: context.user.id, photo_storage_path: path, updated_at: new Date().toISOString() });
  if (saveError) {
    await context.supabase.storage.from("attendee-photos").remove([path]);
    redirect(`/e/${encodeURIComponent(slug)}/claim?photo=failed`);
  }
  if (previous?.photo_storage_path) await context.supabase.storage.from("attendee-photos").remove([previous.photo_storage_path]);
  redirect(`/e/${encodeURIComponent(slug)}/claim?photo=1`);
}
