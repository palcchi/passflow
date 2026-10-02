import {notFound} from 'next/navigation';
import {getManagedEvent} from '@/lib/events';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {readWebsiteContent} from '@/lib/event-website-content';
import {WebsiteContentForm} from '@/components/website-content-form';
export default async function WebsiteContentPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
 const {supabase}=await requireOrganizerMembership('/admin/events/'+eventId+'/design/content');
 const {data}=await supabase.from('event_website_content').select('content').eq('event_id',eventId).maybeSingle();
 return <div className="event-admin-editor-page"><header className="event-admin-local-heading"><span className="section-kicker">Design</span><h2>Website content</h2><p>Figma controls the layout. Keep the schedule, speakers and sponsors up to date here — changes appear on the live website right away.</p></header><section className="event-admin-section"><WebsiteContentForm eventId={eventId} content={readWebsiteContent(data?.content)}/></section></div>;
}
