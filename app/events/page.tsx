import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";

export const metadata = { title: "Event | PassFlow" };

export default async function EventsPage() {
  const { user, supabase } = await requireUser("/events");
  const name = typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : (user.email?.split("@")[0] || "Pengunjung");

  const [{ memberships }, registrationsResult, events] = await Promise.all([
    getMemberships(),
    supabase.from("attendees").select("event_id").eq("user_id", user.id),
    getPublishedEvents().catch(() => []),
  ]);

  const organizer = memberships.some((membership) => canManage(membership.role));
  const registeredIds = new Set((registrationsResult.data ?? []).map((item) => item.event_id));

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-950">
      <UserNavbar name={name} email={user.email} organizer={organizer} />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Explore</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Pilih event.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">Buka event lalu daftar atau hubungkan pass ke akunmu.</p>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const joined = registeredIds.has(event.id);
            return (
              <Link
                href={`/e/${event.slug}`}
                key={event.id}
                className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,0,0,0.07)]"
              >
                <div className="relative h-28 bg-neutral-950 p-5 text-white">
                  <span className="absolute right-4 top-4 rounded-full bg-[#f2c94c] px-2.5 py-1 text-[10px] font-bold text-neutral-950">
                    {joined ? "ADDED" : "OPEN"}
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">PassFlow Event</p>
                  <h2 className="mt-3 max-w-[80%] text-xl font-semibold tracking-tight">{event.name}</h2>
                </div>
                <div className="p-5">
                  <div className="space-y-2 text-sm text-neutral-500">
                    <p className="flex items-center gap-2"><CalendarDays size={15} /> {event.dateLabel}</p>
                    <p className="flex items-center gap-2"><MapPin size={15} /> {event.venue || "Venue belum diumumkan"}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
                    <span className="text-xs font-medium text-neutral-500">{joined ? "Buka event" : "Lihat & tambah"}</span>
                    <ArrowUpRight size={17} className="text-neutral-400 transition group-hover:text-neutral-950" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        {events.length === 0 && <div className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-sm text-neutral-500">Belum ada event yang dipublikasikan.</div>}
      </main>
    </div>
  );
}
