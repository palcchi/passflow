import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getManagedEvent} from '@/lib/events';
import {requireOrganizerMembership} from '@/lib/auth/session';
import {readWebsiteContent} from '@/lib/event-website-content';
import {WebsiteContentForm} from '@/components/website-content-form';
export default async function WebsiteContentPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const event=await getManagedEvent(eventId);if(!event)notFound();
 const {supabase}=await requireOrganizerMembership('/admin/events/'+eventId+'/design/content');
 const {data}=await supabase.from('event_website_content').select('content').eq('event_id',eventId).maybeSingle();
 return <main className="event-admin-editor-page"><Link href={'/admin/events/'+eventId+'/design'}>← Design</Link><h1>Website content</h1><WebsiteContentForm eventId={eventId} content={readWebsiteContent(data?.content)}/></main>;
}
