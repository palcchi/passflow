import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getManagedEvent} from '@/lib/events';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {FigmaPairingPanel} from '@/components/figma-pairing-panel';

const passLabel:Record<string,string>={digital:'Digital pass',id_card:'ID card',wristband:'Wristband'};
const modeLabel:Record<string,string>={digital:'Digital pass on phones',id_card_portrait:'Printed ID card (portrait)',id_card_landscape:'Printed ID card (landscape)',wristband:'Wristband, claimed by QR'};

export default async function EventDesignPage({params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
  const {supabase}=await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [links,versions,live,tickets]=await Promise.all([
    supabase.from('figma_plugin_links').select('id,file_name,expires_at,revoked_at,last_synced_at,external_change_at').eq('event_id',eventId).order('created_at',{ascending:false}).limit(50),
    supabase.from('event_studio_documents').select('id,kind,name,status,revision,updated_at,published_at,publication_number').eq('event_id',eventId).in('kind',['website','digital','id_card','wristband']).eq('document->>source','figma').order('updated_at',{ascending:false}).limit(50),
    supabase.from('event_studio_documents').select('kind,name,ticket_type_id,document').eq('event_id',eventId).eq('status','published'),
    supabase.from('ticket_types').select('id,name').eq('event_id',eventId),
  ]);
  // eslint-disable-next-line react-hooks/purity -- Request-scoped server timestamp, serialized identically for hydration.
  const now=Date.now();
  const liveSite=(live.data??[]).find(d=>d.kind==='website');
  const figmaSite=!!liveSite&&(liveSite.document as {source?:string}|null)?.source==='figma';
  const livePasses=(live.data??[]).filter(d=>d.kind!=='website');
  const ticketName=(id:string|null)=>id?(tickets.data??[]).find(t=>t.id===id)?.name??'One category':'All attendees';
  return <div className="event-admin-editor-page">
    <section className="event-admin-section">
      <span className="section-kicker">What attendees see now</span>
      <div className="design-live-grid">
        <div className="design-live-card"><small>Event website</small><strong>{figmaSite?'Figma design':'Quick Setup page'}</strong><span>{figmaSite?liveSite!.name:'Basic page from event details and theme.'}</span></div>
        <div className="design-live-card"><small>Credential</small><strong>{modeLabel[event.qrConfig.mode]??event.qrConfig.mode}</strong><span>Change in <Link href={`/admin/events/${eventId}/access`}>Access</Link>.</span></div>
        <div className="design-live-card"><small>Pass designs</small><strong>{livePasses.length?livePasses.length+' live':'Default layout'}</strong><span>{livePasses.length?livePasses.map(p=>passLabel[p.kind]+' · '+ticketName(p.ticket_type_id)).join(', '):'Publish a pass from Figma or the simple layout.'}</span></div>
      </div>
    </section>
    <FigmaPairingPanel now={now} eventId={eventId} connections={links.data??[]} versions={versions.data??[]} ready={!links.error&&!versions.error&&!!process.env.SUPABASE_SERVICE_ROLE_KEY}/>
    <section className="event-admin-section">
      <span className="section-kicker">Without Figma</span>
      <h3>Quick Setup and simple pass layout</h3>
      <p>Colors, tagline, button text and banner for a basic event page, and a simple pass with QR, name and logo. A published Figma design takes priority.</p>
      <div className="resource-toolbar"><Link className="button button-ghost" href={`/admin/events/${eventId}/appearance`}>Open Quick Setup</Link><Link className="button button-ghost" href={`/admin/events/${eventId}/design/studio`}>Simple pass layout</Link></div>
    </section>
  </div>;
}
