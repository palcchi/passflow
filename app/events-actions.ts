"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";
function resultReason(value: unknown) { return typeof value === "object" && value && "reason" in value ? String(value.reason) : "unknown"; }
export async function registerForEvent(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const name=String(formData.get("name")??"").trim(); const phone=String(formData.get("phone")??"").trim(); const ticket=String(formData.get("ticket_code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("register_for_event",{p_event_slug:slug,p_name:name,p_phone:phone||null,p_ticket_code:ticket||null});
  if(error || !data?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(data))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?registered=1`);
}
export async function claimQr(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const code=String(formData.get("code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("claim_qr",{p_event_slug:slug,p_code:code});
  if(error || !data?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(data))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?claimed=1`);
}
export async function replaceQr(formData: FormData) {
  const slug=String(formData.get("event_slug")??"").trim(); const code=String(formData.get("code")??"").trim();
  const context=await requireUser(`/e/${slug}/claim`);
  const { data, error }=await context.supabase.rpc("replace_qr",{p_event_slug:slug,p_code:code});
  if(error || !data?.ok) redirect(`/e/${encodeURIComponent(slug)}/claim?error=${encodeURIComponent(resultReason(data))}`);
  redirect(`/e/${encodeURIComponent(slug)}/claim?replaced=1`);
}
