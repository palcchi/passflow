import Link from "next/link";
import { accountProfile, getMemberships, requireUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { AppShell } from "@/components/app-shell";
import { markNotificationsRead } from "@/app/events-actions";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const timeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function NotificationsPage() {
  const { user, supabase } = await requireUser("/notifications");
  const [{ memberships }, { data }] = await Promise.all([
    getMemberships(),
    supabase.from("notifications").select("id,kind,title,body,href,read_at,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const { fullName, avatarUrl } = accountProfile(user);
  const items = data ?? [];
  const unread = items.filter((item) => !item.read_at).length;

  return (
    <AppShell name={fullName || "Attendee"} email={user.email} avatarUrl={avatarUrl} organizer={memberships.some((item) => canManage(item.role))} narrow>
      <header className="ui-pagehead">
        <div>
          <h1 className="ui-h1">Notifications</h1>
          <p className="ui-lead">{unread ? `${unread} unread` : "You are all caught up."}</p>
        </div>
        {unread > 0 && <form action={markNotificationsRead}><button type="submit" className="ui-btn ui-btn-secondary ui-btn-sm">Mark all as read</button></form>}
      </header>
      {items.length ? (
        <ul className="ui-list ui-notifications">
          {items.map((item) => {
            const body = <>
              <span className="ui-listrow-main"><strong>{item.title}</strong>{item.body && <small>{item.body}</small>}</span>
              <time className="ui-listrow-end" dateTime={item.created_at}>{timeFormat.format(new Date(item.created_at))}</time>
            </>;
            return <li key={item.id} data-unread={!item.read_at || undefined}>{item.href ? <Link href={item.href} className="ui-listrow">{body}</Link> : <div className="ui-listrow">{body}</div>}</li>;
          })}
        </ul>
      ) : (
        <div className="ui-empty"><strong>Nothing here yet</strong><p>Registration updates and requests to review will show up here.</p></div>
      )}
    </AppShell>
  );
}
