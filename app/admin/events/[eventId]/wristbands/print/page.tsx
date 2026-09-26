import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { QrCodeImage } from "@/components/qr-code-image";
import { PrintButton } from "@/components/print-button";

export default async function WristbandPrintPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/wristbands/print`);
  const { data: credentials } = await supabase
    .from("qr_credentials")
    .select("id, code, display_code, status")
    .eq("event_id", eventId)
    .order("display_code", { ascending: true });

  return (
    <main className="min-h-screen bg-white p-5 text-black sm:p-8">
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between gap-4 print:hidden">
        <Link href={`/admin/events/${eventId}#wristbands`} className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16}/> Back</Link>
        <PrintButton />
      </header>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-black pb-4">
          <p className="text-xs uppercase tracking-widest">PassFlow QR Wristbands</p>
          <h1 className="mt-2 text-3xl font-bold">{event.name}</h1>
          <p className="mt-1 text-sm">{credentials?.length ?? 0} credentials · opaque production tokens</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4">
          {(credentials ?? []).map((qr) => (
            <article className="break-inside-avoid rounded-md border border-black p-3 text-center" key={qr.id}>
              <QrCodeImage value={`PF1:${qr.code}`} size={150} alt={qr.display_code ?? "Wristband QR"} />
              <strong className="mt-2 block font-mono text-sm">{qr.display_code ?? qr.id.slice(0,8)}</strong>
              <small className="uppercase">{qr.status}</small>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
