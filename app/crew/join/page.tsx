import Link from "next/link";
import { acceptCrewInvitation } from "@/app/crew/actions";
import { getAuthContext } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crew invitation" };
export default async function CrewJoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const context = await getAuthContext();
  let invitation: { job_title: string; access_role: string; expires_at: string } | null = null;
  if (token) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.from("event_invitations")
        .select("job_title,access_role,expires_at").eq("token", token)
        .is("accepted_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
      invitation = data;
    } catch {}
  }
  return <AuthShell title="Better as a team." description="You have been invited to help run this event." kicker="YOU’RE INVITED">
    {invitation ? <>
      <div className="auth-notice"><span className="section-kicker">CREW INVITATION</span><h2 className="mt-3 text-2xl tracking-tight">{invitation.job_title}</h2><p className="mt-2 text-sm text-muted-foreground">Access role: {invitation.access_role}</p></div>
      {context ? <form action={acceptCrewInvitation} className="auth-form"><input type="hidden" name="token" value={token}/><AuthSubmit>Accept invitation ↗</AuthSubmit></form> : <Link className="button button-dark w-full" href={"/login?next=" + encodeURIComponent("/crew/join?token=" + token)}>Sign in to join ↗</Link>}
      <p className="auth-switch">Valid until {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(invitation.expires_at))}.</p>
    </> : <p role="status" className="auth-notice">This invitation has expired or could not be found. Ask the organizer to send a new link.</p>}
  </AuthShell>;
}
