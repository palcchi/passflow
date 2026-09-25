import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Gift, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/events";
import { ClaimPass } from "@/components/claim-pass";
import { registerForEvent } from "@/app/event-actions";

type ClaimPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  invalid_name: "Nama belum valid.",
  event_full: "Kapasitas event sudah penuh.",
  ticket_full: "Kategori pass ini sudah penuh.",
  ticket_not_found: "Kategori pass tidak ditemukan.",
  database: "Pendaftaran belum dapat diproses.",
};

export default async function ClaimPage({ params, searchParams }: ClaimPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const { supabase, user } = await requireUser(`/e/${slug}/claim`);

  const { data: attendee } = await supabase
    .from("attendees")
    .select("id, name, attendee_code, ticket_type_id")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, code, description, capacity")
    .eq("event_id", event.id)
    .order("created_at");

  if (!attendee) {
    const error = typeof query.error === "string" ? errorMessages[query.error] : null;
    const defaultName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";

    return (
      <main className="center-page">
        <div className="center-page-inner">
          <Link href={`/e/${event.slug}`} className="back-link"><ArrowLeft size={16} /> Back to event</Link>
          <div className="page-intro">
            <span className="section-kicker">Event registration</span>
            <h1>Register for {event.name}.</h1>
            <p>Satu akun hanya memiliki satu attendee record per event. Setelah terdaftar, kamu bisa claim wristband.</p>
          </div>

          <form action={registerForEvent} className="claim-card space-y-4">
            <input type="hidden" name="slug" value={event.slug} />
            {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
            <label className="block text-sm font-medium">Nama lengkap
              <input className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" name="name" defaultValue={defaultName} required minLength={2} maxLength={100} />
            </label>
            <label className="block text-sm font-medium">Nomor HP
              <input className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" name="phone" inputMode="tel" maxLength={40} placeholder="Opsional" />
            </label>
            <label className="block text-sm font-medium">Jenis pass
              <select className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3" name="ticketCode" required>
                {(ticketTypes ?? []).map((ticket) => <option key={ticket.id} value={ticket.code}>{ticket.name}</option>)}
              </select>
            </label>
            <button className="button button-dark full-button" type="submit">Register & continue</button>
          </form>
        </div>
      </main>
    );
  }

  const [{ data: ticket }, { data: credential }, { data: activityLogs }, { data: benefitClaims }] = await Promise.all([
    attendee.ticket_type_id
      ? supabase.from("ticket_types").select("name, code").eq("id", attendee.ticket_type_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("qr_credentials").select("code, display_code").eq("event_id", event.id).eq("attendee_id", attendee.id).eq("status", "active").maybeSingle(),
    supabase.from("activity_logs").select("id, completed_at, activity_id").eq("event_id", event.id).eq("attendee_id", attendee.id).order("completed_at", { ascending: false }),
    supabase.from("benefit_claims").select("id, benefit_code, claimed_at").eq("event_id", event.id).eq("attendee_id", attendee.id).order("claimed_at", { ascending: false }),
  ]);

  return (
    <main className="center-page">
      <div className="center-page-inner">
        <Link href={`/e/${event.slug}`} className="back-link"><ArrowLeft size={16} /> Back to event</Link>
        <div className="page-intro">
          <span className="section-kicker">Digital Event Pass</span>
          <h1>Your event credential.</h1>
          <p>Satu QR dipakai pada wristband fisik dan Digital Event Pass. Jika gelang hilang, gunakan replacement flow setelah menerima gelang baru.</p>
        </div>

        {query.notice === "registered" && (
          <p role="status" className="mb-4 rounded-md border border-success/30 p-3 text-sm text-success">Registration berhasil. Sekarang claim wristband kamu.</p>
        )}

        <ClaimPass
          eventSlug={event.slug}
          eventName={event.name}
          attendee={{
            name: attendee.name,
            attendeeCode: attendee.attendee_code,
            ticketName: ticket?.name ?? "Event Pass",
          }}
          credential={credential ? { code: credential.code, displayCode: credential.display_code } : null}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2"><ListChecks size={18} /><strong>Activities</strong></div>
            <p className="mt-3 text-2xl font-semibold">{activityLogs?.length ?? 0}</p>
            <small className="text-muted-foreground">checkpoint tercatat</small>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2"><Gift size={18} /><strong>Benefits</strong></div>
            <p className="mt-3 text-2xl font-semibold">{benefitClaims?.length ?? 0}</p>
            <small className="text-muted-foreground">benefit sudah diklaim</small>
          </section>
        </div>
        {(benefitClaims?.length ?? 0) > 0 && (
          <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
            {benefitClaims?.map((claim) => <div className="flex items-center gap-2" key={claim.id}><CheckCircle2 size={15} /> {claim.benefit_code}</div>)}
          </div>
        )}
      </div>
    </main>
  );
}
