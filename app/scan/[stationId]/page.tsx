import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStation } from "@/lib/auth/session";

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
      <section className="mx-auto max-w-xl rounded-lg bg-card p-6 text-foreground"><h1 className="text-3xl">{station.name}</h1><p className="mt-4">Station belum diaktifkan untuk pemindaian. Validasi QR akan tersedia setelah backend akses selesai.</p></section>
    </main>
  );
}

