import { acceptCrewInvitation } from "@/app/crew/actions";
import { getAuthContext } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function CrewJoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const context = await getAuthContext();
  let invitation: { job_title: string; access_role: string; expires_at: string } | null = null;
  if (token) { try { const supabase = await createServerSupabaseClient(); const { data } = await supabase.from("event_invitations").select("job_title,access_role,expires_at").eq("token", token).is("accepted_at", null).maybeSingle(); invitation = data; } catch {} }
  return <main className="min-h-screen bg-background px-5 py-14"><section className="mx-auto max-w-md rounded-xl border border-border bg-card p-7"><Link href="/" className="brand-lockup"><span className="brand-mark">P</span><span>PassFlow</span></Link><p className="mt-10 text-xs uppercase tracking-[0.16em] text-muted-foreground">Crew invitation</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Gabung sebagai crew.</h1>{invitation ? <><p className="mt-4 text-sm leading-6 text-muted-foreground">Kamu diundang sebagai <strong className="text-foreground">{invitation.job_title}</strong> dengan akses <strong className="text-foreground">{invitation.access_role}</strong>.</p>{context ? <form action={acceptCrewInvitation} className="mt-7"><input type="hidden" name="token" value={token}/><button className="button button-dark w-full" type="submit">Terima undangan</button></form> : <Link className="button button-dark mt-7 w-full" href={`/login?next=${encodeURIComponent(`/crew/join?token=${token}`)}`}>Masuk untuk bergabung</Link>}<p className="mt-5 text-center text-xs text-muted-foreground">Link ini berlaku sampai {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(invitation.expires_at))}.</p></> : <p className="mt-4 rounded-md bg-muted p-4 text-sm">Link undangan tidak valid atau sudah kedaluwarsa.</p>}</section></main>;
}
