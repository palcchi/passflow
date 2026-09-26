import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Plus } from "lucide-react";
import { requireUser, getMemberships } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { getPublishedEvents } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";

export const metadata = { title: "Dashboard | PassFlow" };

export default async function AccountPage() {
  const { user, supabase } = await requireUser();
  const username = typeof user.user_metadata.username === "string" ? user.user_metadata.username.trim() : "";
  const name = username || (typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : (user.email?.split("@")[0] || "Pengunjung"));

  const [{ memberships, unavailable }, registrationsResult, publishedEvents] = await Promise.all([
    getMemberships(),
    supabase.from("attendees").select("event_id").eq("user_id", user.id),
    getPublishedEvents().catch(() => []),
  ]);

  const organizer = memberships.some((membership) => canManage(membership.role));
  const registeredIds = new Set((registrationsResult.data ?? []).map((item) => item.event_id));
  const myEvents = publishedEvents.filter((event) => registeredIds.has(event.id));

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-950">
      <UserNavbar name={name} email={user.email} organizer={organizer} />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Halo, {name}.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">Event yang terhubung ke akunmu tampil di sini.</p>
          </div>
          <Link
            href="/events"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white shadow-sm transition hover:bg-neutral-800"
            aria-label="Tambah event"
            title="Tambah event"
          >
            <Plus size={21} />
          </Link>
        </header>

        {unavailable && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Hak akses akun belum dapat dimuat.</p>}

        <section className="mt-10" aria-labelledby="my-events">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-400">MY EVENTS</p>
              <h2 id="my-events" className="mt-1 text-xl font-semibold tracking-tight">Event kamu</h2>
            </div>
            <Link href="/events" className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950">Lihat semua</Link>
          </div>

          {myEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myEvents.map((event) => (
                <Link
                  href={`/e/${event.slug}`}
                  key={event.id}
                  className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(0,0,0,0.07)]"
                >
                  <div className="relative h-24 bg-neutral-950 p-5 text-white">
                    <span className="absolute right-4 top-4 size-2 rounded-full bg-[#f2c94c]" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">PassFlow Event</p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight">{event.name}</h3>
                  </div>
                  <div className="p-5">
                    <div className="space-y-2 text-sm text-neutral-500">
                      <p className="flex items-center gap-2"><CalendarDays size={15} /> {event.dateLabel}</p>
                      <p className="flex items-center gap-2"><MapPin size={15} /> {event.venue || "Venue belum diumumkan"}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
                      <span className="text-xs font-medium text-neutral-500">Buka event</span>
                      <ArrowUpRight size={17} className="text-neutral-400 transition group-hover:text-neutral-950" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-7 sm:p-10">
              <span className="grid size-11 place-items-center rounded-full bg-[#fff5c7] text-neutral-950"><Plus size={20} /></span>
              <h3 className="mt-5 text-lg font-semibold">Belum ada event.</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">Tambahkan event pertama dari daftar event yang tersedia.</p>
              <Link href="/events" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">
                Tambah event <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
