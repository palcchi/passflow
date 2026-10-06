"use server";
import { revalidatePath } from 'next/cache';
import { requireOrganizer } from '@/lib/auth/session';

export async function retireStudio(eventId:string,id:string,revision:number,remove:boolean) {
  const {supabase}=await requireOrganizer();
  const {error}=await supabase.rpc('retire_studio_document',{p_event_id:eventId,p_id:id,p_revision:revision,p_delete:remove});
  if(error)return {error:'The version changed or cannot be removed. Reload and try again.'};
  revalidatePath(`/organizer/events/${eventId}`,'layout');
  const {data:event}=await supabase.from('events').select('slug').eq('id',eventId).single();
  if(event)revalidatePath(`/e/${event.slug}`,'layout');
  return {success:true};
}
