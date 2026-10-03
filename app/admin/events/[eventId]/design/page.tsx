import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getManagedEvent} from '@/lib/events';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {FigmaPairingPanel} from '@/components/figma-pairing-panel';
export default async function EventDesignPage({params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
  const {supabase}=await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [links,versions]=await Promise.all([
    supabase.from('figma_plugin_links').select('id,file_name,expires_at,revoked_at,last_synced_at,external_change_at').eq('event_id',eventId).order('created_at',{ascending:false}).limit(50),
    supabase.from('event_studio_documents').select('id,name,status,revision,updated_at,published_at,publication_number').eq('event_id',eventId).eq('kind','website').eq('document->>source','figma').order('updated_at',{ascending:false}).limit(50),
  ]);
  // eslint-disable-next-line react-hooks/purity -- Request-scoped server timestamp, serialized identically for hydration.
  const now=Date.now();
  return <div className="event-admin-editor-page"><FigmaPairingPanel now={now} eventId={eventId} connections={links.data??[]} versions={versions.data??[]} ready={!links.error&&!versions.error&&!!process.env.SUPABASE_SERVICE_ROLE_KEY}/><section className="event-admin-section"><h3>Passes, ID cards & wristbands</h3><p>Design the attendee pass in Figma, or place the QR, name and logo on a simple layout without Figma.</p><div className="resource-toolbar"><Link className="button button-dark" href={`/admin/events/${eventId}/design/legacy`}>Pass designs from Figma</Link><Link className="button button-ghost" href={`/admin/events/${eventId}/design/studio`}>Simple pass layout</Link></div></section><section className="event-admin-section"><h3>Website text</h3><p>Edit the dynamic text your Figma website shows, such as the about section and FAQ, without reopening Figma.</p><Link className="button button-ghost" href={`/admin/events/${eventId}/design/content`}>Edit website text</Link></section></div>;
}
