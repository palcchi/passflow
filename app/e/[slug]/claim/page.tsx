import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getEventBySlug } from "@/lib/events";

type ClaimPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) notFound();

  await requireUser(`/e/${slug}/claim`);

  return (
    <main className="center-page">
      <div className="center-page-inner">
        <Link href={`/e/${event.slug}`} className="back-link">
          <ArrowLeft size={16} />
          Back to event
        </Link>
        <div className="page-intro">
          <span className="section-kicker">Digital Event Pass</span>
          <h1>Claim your wristband.</h1>
          <p>
            Satu QR akan terhubung ke akunmu dan dapat digunakan dari gelang maupun layar HP.
          </p>
        </div>
        <div className="claim-card"><h2>Wristband belum terhubung</h2><p className="mt-3 text-sm text-muted-foreground">Pendaftaran dan claim wristband untuk event ini belum dibuka.</p><Link href="/account" className="button button-dark mt-6">Akun saya</Link></div>
      </div>
    </main>
  );
}

