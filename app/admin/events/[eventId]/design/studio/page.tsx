import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getManagedEvent } from '@/lib/events';
import { requireOrganizerMembership } from '@/lib/auth/session';
import { DesignStudio } from '@/components/design-studio';

export default async function StudioPage({params}:{params:Promise<{eventId:string}>}) {
  const {eventId}=await params;
  const event=await getManagedEvent(eventId);if(!event)notFound();
  const {supabase}=await requireOrganizerMembership(`/admin/events/${eventId}/design/studio`);
  const [versions,tickets,sampleQr]=await Promise.all([
    supabase.from('event_studio_documents').select('id,name,kind,status,revision,document,ticket_type_id,updated_at').eq('event_id',eventId).neq('kind','website').order('updated_at',{ascending:false}).limit(100),
    supabase.from('ticket_types').select('id,name').eq('event_id',eventId).order('name'),
    QRCode.toDataURL('PASSFLOW-SAMPLE-NOT-A-CREDENTIAL',{margin:4,width:400,errorCorrectionLevel:'M'})
  ]);
  if(versions.error) return <section className="event-admin-section"><h2>Design studio unavailable</h2><p>The design database is not ready. Existing event designs remain available.</p></section>;
  return <DesignStudio eventId={eventId} versions={versions.data??[]} tickets={tickets.data??[]} sampleQr={sampleQr} data={{event_name:event.name,event_date:event.dateLabel,venue:event.venue,description:event.description,banner:event.heroImageUrl??'',logo:event.logoUrl??''}}/>;
}
