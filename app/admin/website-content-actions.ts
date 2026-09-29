'use server';
import {revalidatePath} from 'next/cache';
import {requireOrganizer} from '@/lib/auth/session';
import {parseWebsiteRows} from '@/lib/event-website-content';
import type {Json} from '@/lib/supabase/database.types';
export async function saveWebsiteContent(formData:FormData){
 const eventId=String(formData.get('eventId')??'');
 if(!/^[0-9a-f-]{36}$/i.test(eventId))return {error:'Invalid event.'};
 let content;
 try{content={schedule:parseWebsiteRows(String(formData.get('schedule')??''),'schedule'),speakers:parseWebsiteRows(String(formData.get('speakers')??''),'speakers'),sponsors:parseWebsiteRows(String(formData.get('sponsors')??''),'sponsors')};}catch(e){return {error:e instanceof Error?e.message:'Invalid content.'};}
 const {supabase}=await requireOrganizer();
 const {data:event}=await supabase.from('events').select('slug').eq('id',eventId).single();
 const {error}=await supabase.from('event_website_content').upsert({event_id:eventId,content:content as Json,updated_at:new Date().toISOString()});
 if(error)return {error:'Could not save website content. Check event access.'};
 revalidatePath('/admin/events/'+eventId+'/design/content');if(event)revalidatePath('/e/'+event.slug,'layout');
 return {success:true};
}
