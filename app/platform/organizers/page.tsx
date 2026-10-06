import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { serviceClient } from "@/lib/supabase/service";
import { approveOrganizer, revokeOrganizer } from "@/app/platform/actions";
import { EVENTS_PER_ORGANIZER } from "@/lib/organizer-quota";

export const metadata: Metadata = { title: "Organizers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const scale: Record<string, string> = { small: "Under 200 people", medium: "200 to 2,000", large: "Over 2,000" };
const notices: Record<string, string> = { approved: "Approved. They can open their organizer workspace now.", revoked: "Access revoked. Their workspace is closed; their events were not changed.", error: "Something went wrong. Try again." };
const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }) : "";

export default async function OrganizersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { user } = await requireUser("/platform/organizers");
  if (!isPlatformAdmin(user)) notFound();
  const { status } = await searchParams;
  const admin = serviceClient();
  const { data: applications } = await admin.from("organizer_applications").select("user_id,organization_id,organization_name,phone,city,event_scale,status,created_at,reviewed_at").order("created_at", { ascending: false }).limit(500);
  const rows = await Promise.all((applications ?? []).map(async (a) => {
    const [{ data }, events] = await Promise.all([
      admin.auth.admin.getUserById(a.user_id),
      a.organization_id ? admin.from("events").select("id", { count: "exact", head: true }).eq("organization_id", a.organization_id).neq("status", "archived") : Promise.resolve({ count: 0 }),
    ]);
    return { ...a, email: data.user?.email ?? "", name: String(data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? ""), events: events.count ?? 0 };
  }));
  const groups = [
    ["Waiting", rows.filter((r) => r.status === "pending")],
    ["Active organizers", rows.filter((r) => r.status === "approved")],
    ["Revoked", rows.filter((r) => r.status === "rejected")],
  ] as const;

  return <main className="app-surface min-h-screen"><div className="platform-shell">
    <header className="platform-head">
      <Link href="/organizer/events" className="back-link"><ArrowLeft size={16}/> Back to organizer</Link>
      <span className="section-kicker">PassFlow admin</span>
      <h1>Organizers</h1>
      <p>Anyone who applies at /organizer/start becomes an organizer straight away, with {EVENTS_PER_ORGANIZER} active event per account. Revoke an account to close its workspace.</p>
    </header>
    {status && notices[status] && <p role="status" className="studio-notice">{notices[status]}</p>}
    {groups.map(([title, list]) => (list.length > 0 || title === "Active organizers") && <section key={title} className="event-admin-section">
      <div className="event-admin-section-head"><div><span className="section-kicker">{title}</span><h2>{list.length} {list.length === 1 ? "account" : "accounts"}</h2></div></div>
      <div className="resource-manager">
        {list.map((a) => <article key={a.user_id} className="platform-application">
          <div>
            <strong>{a.organization_name}</strong>
            <span>{[a.name, a.email].filter(Boolean).join(" · ")}</span>
            <small>{[a.phone, a.city, a.event_scale ? scale[a.event_scale] : "", a.status === "approved" ? a.events + " active event" + (a.events === 1 ? "" : "s") : "", "joined " + when(a.created_at)].filter(Boolean).join(" · ")}</small>
          </div>
          {a.status !== "rejected" && <form action={a.status === "pending" ? approveOrganizer : revokeOrganizer} className="platform-actions">
            <input type="hidden" name="userId" value={a.user_id} />
            {a.status === "pending" ? <button className="button button-dark">Approve</button> : <button className="button button-ghost record-danger">Revoke</button>}
          </form>}
        </article>)}
        {!list.length && <p className="event-admin-table-empty">No organizers yet. Share passflow.my.id/organizer.</p>}
      </div>
    </section>)}
  </div></main>;
}
