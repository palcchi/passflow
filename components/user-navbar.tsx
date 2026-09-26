import Link from "next/link";
import { LayoutGrid, LogOut, Plus, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";

type UserNavbarProps = {
  name: string;
  email?: string | null;
  organizer?: boolean;
};

export function UserNavbar({ name, email, organizer = false }: UserNavbarProps) {
  const initial = (name || email || "P").trim().charAt(0).toUpperCase() || "P";

  return (
    <nav className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-7">
          <Link href="/account" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-xl bg-neutral-950 text-xs font-bold text-white">P</span>
            <span>PassFlow</span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/account" className="rounded-lg px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950">
              Dashboard
            </Link>
            <Link href="/events" className="rounded-lg px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950">
              Event
            </Link>
            {organizer && (
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950">
                Organizer
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="grid size-10 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-100"
            aria-label="Tambah event"
            title="Tambah event"
          >
            <Plus size={19} />
          </Link>
          <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:bg-neutral-100 sm:flex" aria-label="Profil saya">
            <span className="grid size-7 place-items-center rounded-full bg-[#f2c94c] text-[11px] font-bold text-neutral-950">{initial}</span>
            <span className="max-w-32 truncate text-xs font-medium text-neutral-700">{name}</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="grid size-10 place-items-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-5 pb-2 sm:hidden">
        <Link href="/account" className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-800">
          <LayoutGrid size={14} /> Dashboard
        </Link>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600">
          Event
        </Link>
        {organizer && <Link href="/admin" className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600">Organizer</Link>}
        <Link href="/profile" className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600"><UserRound size={14}/> Profil</Link>
      </div>
    </nav>
  );
}
