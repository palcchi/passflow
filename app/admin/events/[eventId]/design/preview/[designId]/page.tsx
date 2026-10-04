import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {getManagedEvent} from '@/lib/events';
import {getAppOrigin} from '@/lib/supabase/config';
import {readFigmaWebsite} from '@/lib/figma-website';
import {FigmaPageRenderer,FigmaWebsiteRenderer} from '@/components/figma-website-renderer';
import {readWebsiteContent} from '@/lib/event-website-content';
import QRCode from 'qrcode';
import {readStudioDocument,validateStudio,type StudioKind} from '@/lib/studio/model';
import {PassRenderer} from '@/components/studio-renderer';
export default async function FigmaPreview({params}:{params:Promise<{eventId:string;designId:string}>}){
  const {eventId,designId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
  const {supabase}=await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [design,tickets,content]=await Promise.all([supabase.from('event_studio_documents').select('kind,document,status,revision,publication_number,published_at').eq('event_id',eventId).eq('id',designId).single(),supabase.from('ticket_types').select('id,name,price,currency').eq('event_id',eventId),supabase.from('event_website_content').select('content').eq('event_id',eventId).maybeSingle()]);
  const pass=design.data&&design.data.kind!=='website'?readStudioDocument(design.data.document):null;
  if(pass){
    // Pass designs preview with a sample attendee and a non-scannable sample QR.
    const qr=await QRCode.toDataURL('PF1:PREVIEW-ONLY',{margin:4,width:600,errorCorrectionLevel:'M'});
    const errors=validateStudio(pass,design.data!.kind as StudioKind);
    return <main className="center-page"><div className="center-page-inner"><header className="studio-notice"><Link href={`/admin/events/${eventId}/design`}>Back to Design</Link><p>{design.data!.status} · revision {design.data!.revision}. Sample attendee data; the QR is a preview code.</p>{errors.map((e,i)=><p key={i} role="alert">{e}</p>)}</header><div style={{maxWidth:pass.width>pass.height?720:360,margin:'24px auto'}}><PassRenderer document={pass} data={{name:'Alexandra Morgan',category:'VIP',code:'PF-000001',event_name:event.name,event_date:event.dateLabel,venue:event.venue,photo:'',logo:event.logoUrl??''}} qr={qr} guide/></div></div></main>;
  }
  const document=readFigmaWebsite(design.data?.document);if(!document)notFound();
  return <main><header className="studio-notice"><Link href={`/admin/events/${eventId}/design`}>Back to Design</Link><p>{design.data?.status} · revision {design.data?.revision}{design.data?.publication_number?' · publication '+design.data.publication_number:''}{design.data?.published_at?' · '+new Date(design.data.published_at).toLocaleString('en-GB'):''}. Preview actions are disabled. Resize the window to check the mobile frame.</p>{!document.mobile&&<p>No mobile frame: the accessible content fallback will be used.</p>}{document.warnings.map((w,i)=><p key={i}>{w}</p>)}</header>{(()=>{const data={name:event.name,description:event.description,date:event.dateLabel,venue:event.venue,logo:event.logoUrl??undefined,banner:event.heroImageUrl??event.posterUrl??undefined,claimUrl:`${getAppOrigin()??''}/e/${event.slug}/claim`,ctaLabel:'Register now',tickets:tickets.data??[],...readWebsiteContent(content.data?.content)};return <><FigmaWebsiteRenderer document={document} data={data} preview/>{document.pages.map(page=><section key={page.slug}><p className="studio-notice">{page.slug==='ticket'?'Ticket page header (shown above the PassFlow sign-up form)':'Page: /e/'+event.slug+'/'+page.slug}</p><FigmaPageRenderer page={page} data={data} preview/></section>)}</>;})()}</main>;
}
