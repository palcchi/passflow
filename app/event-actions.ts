"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

type RpcResult = {
  ok?: boolean;
  reason?: string;
  decision?: string;
  message?: string;
  attendee_name?: string;
  attendee_code?: string;
  ticket_type?: string;
  display_code?: string;
  code?: string;
  credential_id?: string;
  existing?: boolean;
};

function text(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function plainResult(value: unknown): RpcResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "unknown" };
  return value as RpcResult;
}

export async function registerForEvent(formData: FormData) {
  const slug = text(formData, "slug", 100);
  const name = text(formData, "name", 100);
  const phone = text(formData, "phone", 40);
  const ticketCode = text(formData, "ticketCode", 40);
  const { supabase } = await requireUser(`/e/${slug}/claim`);

  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_slug: slug,
    p_name: name,
    p_phone: phone || undefined,
    p_ticket_code: ticketCode || undefined,
  });

  const result = error ? { ok: false, reason: "database" } : plainResult(data);
  if (!result.ok) {
    redirect(`/e/${slug}/claim?error=${encodeURIComponent(result.reason ?? "register")}`);
  }

  revalidatePath("/account");
  revalidatePath(`/e/${slug}/claim`);
  redirect(`/e/${slug}/claim?notice=registered`);
}

export async function claimWristband(slug: string, code: string) {
  const { supabase } = await requireUser(`/e/${slug}/claim`);
  const { data, error } = await supabase.rpc("claim_qr", {
    p_event_slug: slug,
    p_code: code,
  });
  const result = error ? { ok: false, reason: "database" } : plainResult(data);
  if (result.ok) {
    revalidatePath("/account");
    revalidatePath(`/e/${slug}/claim`);
  }
  return result;
}

export async function replaceWristband(slug: string, code: string) {
  const { supabase } = await requireUser(`/e/${slug}/claim`);
  const { data, error } = await supabase.rpc("replace_qr", {
    p_event_slug: slug,
    p_code: code,
  });
  const result = error ? { ok: false, reason: "database" } : plainResult(data);
  if (result.ok) {
    revalidatePath("/account");
    revalidatePath(`/e/${slug}/claim`);
  }
  return result;
}

export async function validateStationScan(stationId: string, code: string) {
  const { supabase } = await requireUser(`/scan/${stationId}`);
  const { data, error } = await supabase.rpc("validate_scan", {
    p_station_id: stationId,
    p_code: code,
  });
  return error ? { ok: false, reason: "database", message: "Validation failed" } : plainResult(data);
}
