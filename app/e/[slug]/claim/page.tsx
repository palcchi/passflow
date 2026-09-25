import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClaimPass } from "@/components/claim-pass";
import { getEventBySlug } from "@/lib/events";

type ClaimPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) notFound();

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
        <ClaimPass eventName={event.name} />
      </div>
    </main>
  );
}
