import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStation } from "@/lib/auth/session";
import { QrScanner } from "@/components/qr-scanner";

type ScannerPageProps = {
  params: Promise<{ stationId: string }>;
};

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { stationId } = await params;

  const { station } = await requireStation(stationId);

  return (
    <main className="scanner-page">
      <nav className="scanner-nav">
        <Link href="/admin" className="back-link light-back">
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <span className="scanner-brand">PASSFLOW SCANNER</span>
      </nav>
      <QrScanner stationId={station.id} stationName={station.name} />
    </main>
  );
}
