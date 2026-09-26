import { requireStation } from "@/lib/auth/session";
import { QrScanner } from "@/components/qr-scanner";

type ScannerPageProps = {
  params: Promise<{ stationId: string }>;
};

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { stationId } = await params;

  const { station, supabase } = await requireStation(stationId);
  const { data: event } = await supabase.from("events").select("name,venue").eq("id", station.event_id).maybeSingle();

  return (
    <QrScanner stationId={station.id} stationName={station.name} eventName={event?.name ?? station.name} venue={event?.venue ?? ""} />
  );
}
