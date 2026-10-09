import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { accountProfile, requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
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

  const { name, avatarUrl } = accountProfile(user);

  return <AppShell name={name || "Admin"} email={user.email} avatarUrl={avatarUrl} organizer>
    <Link href="/organizer/events" className="ui-back"><ArrowLeft size={14} />Organizer</Link>
    <header className="ui-pagehead ui-mt">
      <div>
        <h1 className="ui-h1">Organizers</h1>
        <p className="ui-lead">Anyone who applies becomes an organizer right away, with {EVENTS_PER_ORGANIZER} active event per account. Revoke an account to close its workspace.</p>
      </div>
    </header>
    {status && notices[status] && <p role="status" className="ui-notice ui-mb">{notices[status]}</p>}
    {groups.map(([title, list]) => (list.length > 0 || title === "Active organizers") && <section key={title} className="ui-section">
      <div className="ui-sectionhead"><div><h2 className="ui-h2">{title}</h2><p>{list.length} {list.length === 1 ? "account" : "accounts"}</p></div></div>
      {list.length ? <ul className="ui-list">
        {list.map((a) => <li key={a.user_id} className="ui-listrow">
          <span className="ui-listrow-main">
            <strong>{a.organization_name}</strong>
            <small>{[a.name, a.email].filter(Boolean).join(" · ")}</small>
            <small>{[a.phone, a.city, a.event_scale ? scale[a.event_scale] : "", a.status === "approved" ? a.events + " active event" + (a.events === 1 ? "" : "s") : "", "joined " + when(a.created_at)].filter(Boolean).join(", ")}</small>
          </span>
          {a.status !== "rejected" && <form action={a.status === "pending" ? approveOrganizer : revokeOrganizer}>
            <input type="hidden" name="userId" value={a.user_id} />
            {a.status === "pending" ? <button className="ui-btn ui-btn-primary ui-btn-sm">Approve</button> : <button className="ui-btn ui-btn-ghost ui-btn-sm ui-text-danger">Revoke</button>}
          </form>}
        </li>)}
      </ul> : <div className="ui-empty"><strong>No organizers yet</strong><p>Share passflow.my.id/organizer with people who run events.</p></div>}
    </section>)}
  </AppShell>;
}
