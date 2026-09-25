import Link from "next/link";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { AuthSubmit } from "@/components/auth-submit";
import { QrCode, TicketCheck } from "lucide-react";

export const metadata = { title: "Akun saya" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user, supabase } = await requireUser();
  const { memberships, unavailable } = await getMemberships();
  const organizer = memberships.some((m) => canManage(m.role));
  const name = typeof user.user_metadata.full_name === "string"
    ? user.user_metadata.full_name
    : "Pengunjung PassFlow";

  const { data: attendees } = await supabase
    .from("attendees")
    .select("id, event_id, attendee_code, name, checked_in_at, ticket_type_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const eventIds = [...new Set((attendees ?? []).map((attendee) => attendee.event_id))];
  const ticketIds = [...new Set((attendees ?? []).map((attendee) => attendee.ticket_type_id).filter(Boolean))] as string[];

  const [eventsResult, ticketsResult, credentialsResult] = await Promise.all([
    eventIds.length
      ? supabase.from("events").select("id, name, slug, starts_at, venue, status").in("id", eventIds)
      : Promise.resolve({ data: [] }),
    ticketIds.length
      ? supabase.from("ticket_types").select("id, name").in("id", ticketIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from("qr_credentials").select("id, event_id, attendee_id, display_code, status").in("event_id", eventIds).eq("status", "active")
      : Promise.resolve({ data: [] }),
  ]);

  const events = new Map((eventsResult.data ?? []).map((event) => [event.id, event]));
  const tickets = new Map((ticketsResult.data ?? []).map((ticket) => [ticket.id, ticket.name]));
  const credentials = new Map((credentialsResult.data ?? []).filter((credential) => credential.attendee_id).map((credential) => [credential.attendee_id as string, credential]));

  return (
    <main className="min-h-screen px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 sm:p-9">
        <Link href="/" className="text-sm font-bold">PassFlow</Link>
        <p className="mt-10 text-xs uppercase tracking-widest text-muted-foreground">Akun saya</p>
        <h1 className="mt-3 break-words text-3xl tracking-tight">Halo, {name}.</h1>
        <p className="mt-3 break-all text-sm text-muted-foreground">{user.email}</p>

        {params.notice === "password-updated" && (
          <p role="status" className="mt-6 rounded-md border border-success/30 p-4 text-sm text-success">
            Password berhasil diperbarui.
          </p>
        )}

        {unavailable && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Hak akses belum dapat dimuat. Silakan coba lagi nanti.
          </p>
        )}

        {!unavailable && (
          <p className="mt-4 text-sm">
            Akses: {organizer ? "Organizer" : memberships.length ? "Staff" : "Pengunjung"}
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          {organizer && <Button asChild><Link href="/admin">Buka dashboard</Link></Button>}
          <Button asChild variant="outline"><Link href="/e/discoveries-2026">Browse demo event</Link></Button>
        </div>

        <div className="mt-9 border-t border-border pt-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">My events</p>
              <h2 className="mt-2 text-2xl font-semibold">Registered passes</h2>
            </div>
            <TicketCheck size={22} />
          </div>

          <div className="mt-5 space-y-3">
            {(attendees ?? []).length === 0 && (
              <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                Belum ada event yang terhubung ke akun ini.
              </p>
            )}
            {(attendees ?? []).map((attendee) => {
              const event = events.get(attendee.event_id);
              if (!event) return null;
              const credential = credentials.get(attendee.id);
              return (
                <article className="rounded-md border border-border p-4" key={attendee.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong>{event.name}</strong>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {attendee.ticket_type_id ? tickets.get(attendee.ticket_type_id) ?? "Event Pass" : "Event Pass"}
                        {" · "}{attendee.attendee_code}
                      </p>
                    </div>
                    <span className="soft-badge">{attendee.checked_in_at ? "Checked in" : "Registered"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <QrCode size={16} />
                      {credential ? credential.display_code ?? "QR active" : "Wristband not claimed"}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/e/${event.slug}/claim`}>Open pass</Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {memberships.length > 0 && !organizer && (
          <p className="mt-6 text-sm text-muted-foreground">
            Staff dapat membuka Scanner Station yang diberikan organizer.
          </p>
        )}

        <form action={signOut} className="mt-8"><AuthSubmit>Keluar</AuthSubmit></form>
      </section>
    </main>
  );
}
