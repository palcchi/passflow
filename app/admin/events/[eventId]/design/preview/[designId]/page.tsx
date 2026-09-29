import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {getManagedEvent} from '@/lib/events';
import {getAppOrigin} from '@/lib/supabase/config';
import {readFigmaWebsite} from '@/lib/figma-website';
import {FigmaWebsiteRenderer} from '@/components/figma-website-renderer';
import {readWebsiteContent} from '@/lib/event-website-content';
export default async function FigmaPreview({params}:{params:Promise<{eventId:string;designId:string}>}){
  const {eventId,designId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
  const {supabase}=await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [design,tickets,content]=await Promise.all([supabase.from('event_studio_documents').select('document,status,revision,publication_number,published_at').eq('event_id',eventId).eq('id',designId).single(),supabase.from('ticket_types').select('id,name,price,currency').eq('event_id',eventId),supabase.from('event_website_content').select('content').eq('event_id',eventId).maybeSingle()]);
  const document=readFigmaWebsite(design.data?.document);if(!document)notFound();
  return <main><header className="studio-notice"><Link href={`/admin/events/${eventId}/design`}>Back to Design</Link><p>{design.data?.status} · revision {design.data?.revision}{design.data?.publication_number?' · publication '+design.data.publication_number:''}{design.data?.published_at?' · '+new Date(design.data.published_at).toLocaleString('en-GB'):''}. Preview actions are disabled. Resize the window to check the mobile frame.</p>{!document.mobile&&<p>No mobile frame: the accessible content fallback will be used.</p>}{document.warnings.map((w,i)=><p key={i}>{w}</p>)}</header><FigmaWebsiteRenderer document={document} data={{name:event.name,description:event.description,date:event.dateLabel,venue:event.venue,logo:event.logoUrl??undefined,banner:event.heroImageUrl??event.posterUrl??undefined,claimUrl:`${getAppOrigin()??''}/e/${event.slug}/claim`,tickets:tickets.data??[],...readWebsiteContent(content.data?.content)}} preview/></main>;
}
