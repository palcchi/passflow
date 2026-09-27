"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizer } from "@/lib/auth/session";

export async function managePersonRecord(form: FormData): Promise<{ error?: string; success?: boolean }> {
  const eventId = String(form.get("eventId") ?? "");
  const id = String(form.get("id") ?? "");
  const kind = String(form.get("kind") ?? "");
  const operation = String(form.get("operation") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(id) ||
      !["attendee", "ticket"].includes(kind) || !["update", "delete"].includes(operation)) return { error: "Permintaan tidak valid." };
  const { supabase } = await requireOrganizer();
  const { data: allowed } = await supabase.rpc("is_event_manager", { p_event_id: eventId });
  if (!allowed) return { error: "Kamu tidak memiliki akses mengelola event ini." };

  if (operation === "delete") {
    if (form.get("confirmation") !== "yes") return { error: "Konfirmasi penghapusan terlebih dahulu." };
    const { error } = await supabase.rpc("delete_event_person_record", { p_event_id: eventId, p_id: id, p_kind: kind });
    if (error) return { error: error.message.includes("record_in_use") ? "Kategori masih dipakai peserta, aturan akses, atau desain. Pindahkan keterkaitannya sebelum menghapus." : "Data belum dapat dihapus. Muat ulang lalu coba lagi." };
  } else {
    const name = String(form.get("name") ?? "").trim();
    if (!name || name.length > 100) return { error: "Nama wajib diisi, maksimal 100 karakter." };
    if (kind === "attendee") {
      const email = String(form.get("email") ?? "").trim();
      const phone = String(form.get("phone") ?? "").trim();
      const ticket = String(form.get("ticketTypeId") ?? "");
      if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) return { error: "Email tidak valid." };
      if (phone.length > 40) return { error: "Nomor telepon terlalu panjang." };
      if (ticket) {
        const { data } = await supabase.from("ticket_types").select("id").eq("event_id", eventId).eq("id", ticket).maybeSingle();
        if (!data) return { error: "Kategori tiket tidak tersedia di event ini." };
      }
      const { data, error } = await supabase.from("attendees").update({ name, email: email || null, phone: phone || null, ticket_type_id: ticket || null }).eq("event_id", eventId).eq("id", id).select("id").maybeSingle();
      if (error || !data) return { error: "Peserta belum tersimpan. Periksa data dan coba lagi." };
    } else {
      const capacityRaw = String(form.get("capacity") ?? "").trim();
      const capacity = capacityRaw ? Number(capacityRaw.replace(/\./g, "")) : null;
      const priceRaw = String(form.get("price") ?? "").trim();
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(priceRaw)) return { error: "Gunakan format harga seperti 150.000 atau 12,50." };
      const price = Number(priceRaw.replace(/\./g, "").replace(",", "."));
      if ((capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 0)) || !Number.isFinite(price) || price < 0) return { error: "Kapasitas dan harga harus berupa angka positif atau nol." };
      const { count, error: countError } = await supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("ticket_type_id", id);
      if (countError) return { error: "Jumlah peserta belum dapat diperiksa." };
      if (capacity !== null && capacity < (count ?? 0)) return { error: "Kapasitas tidak boleh lebih kecil dari jumlah peserta yang terdaftar." };
      const { data, error } = await supabase.from("ticket_types").update({ name, description: String(form.get("description") ?? "").trim().slice(0, 500) || null, capacity, price }).eq("event_id", eventId).eq("id", id).select("id").maybeSingle();
      if (error || !data) return { error: "Kategori belum tersimpan. Periksa data dan coba lagi." };
    }
  }
  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath(`/admin/events/${eventId}`, "layout");
  const { data: event } = await supabase.from("events").select("slug").eq("id", eventId).maybeSingle();
  if (event) revalidatePath(`/e/${event.slug}`, "layout");
  return { success: true };
}
