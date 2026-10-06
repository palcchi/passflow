import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, MapPin, Phone } from "lucide-react";
import { getMemberships, requireUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/redirect";
import { AuthShell } from "@/components/auth-shell";
import { AuthSubmit } from "@/components/auth-submit";
import { submitOrganizerApplication } from "../actions";

export const metadata = { title: "Organizer application", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  "invalid-name": "Enter an organization name between 2 and 80 characters.",
  "invalid-phone": "Enter a valid phone number, for example +62 812 3456 7890.",
  "invalid-city": "City must be 60 characters or fewer.",
  "invalid-scale": "Choose a typical event size from the list.",
  error: "We could not submit your application. Please try again.",
};

export default async function OrganizerStartPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase, user } = await requireUser("/organizer/start");
  const { memberships } = await getMemberships();
  if (memberships.some((membership) => canManage(membership.role))) redirect("/organizer/events");

  const { data: application } = await supabase
    .from("organizer_applications")
    .select("organization_name,status,created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (application) {
    const rejected = application.status === "rejected";
    return <AuthShell kicker={rejected ? "ORGANIZER ACCESS" : "ALMOST THERE"} title={rejected ? "Organizer access is closed." : "Finishing your workspace."} description={rejected ? "This account can no longer run events on PassFlow. Reply to the PassFlow team if you believe this is a mistake." : "Your workspace could not open automatically. The PassFlow team will finish it shortly; this page updates when it is ready."} backHref="/account" backLabel="Back to dashboard">
      <div className="auth-notice organizer-status" role="status">
        <span className="section-kicker">{application.organization_name}</span>
        <ol className="organizer-steps">
          <li data-done="true">Application submitted · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(application.created_at))}</li>
          <li data-done={rejected}>{rejected ? "Reviewed" : "Under review"}</li>
          <li>Organizer workspace unlocked</li>
        </ol>
      </div>
      <Link href="/account" className="button button-dark w-full">Continue to your dashboard ↗</Link>
    </AuthShell>;
  }

  const message = status ? errors[status] : null;
  return <AuthShell kicker="PASSFLOW FOR ORGANIZERS" title="Set up your organizer workspace." description="Tell us who runs your events. Your workspace opens right away, with one active event per account." backHref="/organizer" backLabel="About PassFlow for organizers">
    {message && <p role="alert" className="auth-notice">{message}</p>}
    <form action={submitOrganizerApplication} className="auth-form">
      <label className="auth-field">Organization or brand name<div className="auth-input"><Building2 size={17} aria-hidden="true"/><input required name="organizationName" minLength={2} maxLength={80} autoComplete="organization" placeholder="Kopi Kultur Collective"/></div></label>
      <label className="auth-field">Phone / WhatsApp <small>Optional, used only to reach you about this application.</small><div className="auth-input"><Phone size={17} aria-hidden="true"/><input name="phone" type="tel" maxLength={24} autoComplete="tel" placeholder="+62 812 3456 7890"/></div></label>
      <label className="auth-field">City<div className="auth-input"><MapPin size={17} aria-hidden="true"/><input name="city" maxLength={60} autoComplete="address-level2" placeholder="Jakarta"/></div></label>
      <label className="auth-field">Typical event size<div className="auth-input"><select name="eventScale" defaultValue=""><option value="">Select a range</option><option value="small">Under 200 attendees</option><option value="medium">200 – 2,000 attendees</option><option value="large">More than 2,000 attendees</option></select></div></label>
      <AuthSubmit>Submit application ↗</AuthSubmit>
    </form>
    <p className="auth-switch">Signed in as {user.email}. Your attendee passes stay on the same account.</p>
  </AuthShell>;
}
