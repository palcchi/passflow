import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getManagedEvent} from '@/lib/events';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {FigmaPairingPanel} from '@/components/figma-pairing-panel';

const passLabel:Record<string,string>={digital:'Digital pass',id_card:'ID card',wristband:'Wristband'};
const modeLabel:Record<string,string>={digital:'Digital pass on phones',id_card_portrait:'Printed ID card (portrait)',id_card_landscape:'Printed ID card (landscape)',wristband:'Wristband, claimed by QR'};

export default async function EventDesignPage({params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
  const {supabase}=await requireOrganizerMembership(`/organizer/events/${eventId}/design`);
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
  return <>
    <section aria-labelledby="now-title">
      <div className="ui-sectionhead"><div><h2 id="now-title" className="ui-h2">What attendees see now</h2></div></div>
      <div className="ui-grid ui-grid-3">
        <div className="ui-stat ui-stat-text"><span>Event website</span><strong>{figmaSite?'Figma design':'PassFlow default'}</strong><small>{figmaSite?liveSite!.name:'Event details, banner and Register until a Figma design is published.'}</small></div>
        <div className="ui-stat ui-stat-text"><span>Pass format</span><strong>{modeLabel[event.qrConfig.mode]??event.qrConfig.mode}</strong><small>Change it in <Link className="ui-link" href={`/organizer/events/${eventId}/operations`}>Operations</Link>. Banner and logo live in <Link className="ui-link" href={`/organizer/events/${eventId}/settings`}>Settings</Link>.</small></div>
        <div className="ui-stat ui-stat-text"><span>Pass designs</span><strong>{livePasses.length?`${livePasses.length} live`:'Standard pass'}</strong><small>{livePasses.length?livePasses.map(p=>passLabel[p.kind]+' for '+ticketName(p.ticket_type_id)).join(', '):'A clean QR pass until you publish one from Figma.'}</small></div>
      </div>
    </section>
    <FigmaPairingPanel now={now} eventId={eventId} connections={links.data??[]} versions={versions.data??[]} ready={!links.error&&!versions.error&&!!process.env.SUPABASE_SERVICE_ROLE_KEY}/>
  </>;
}
