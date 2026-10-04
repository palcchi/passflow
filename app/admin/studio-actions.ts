"use server";
import { revalidatePath } from 'next/cache';
import { requireOrganizer } from '@/lib/auth/session';
import { readStudioDocument, validateStudio, type StudioKind } from '@/lib/studio/model';
import {readFigmaWebsite,validateFigmaWebsite} from '@/lib/figma-website';

export async function publishStudio(eventId: string, id: string, revision: number) {
  const { supabase } = await requireOrganizer();
  const { data } = await supabase.from('event_studio_documents').select('document,kind,revision').eq('event_id',eventId).eq('id',id).single();
  if(data?.revision!==revision)return {error:'This version changed. Reload before publishing.'};
  const doc = readStudioDocument(data?.document);
  const website=readFigmaWebsite(data?.document);
  if (!doc&&!website) return { error:'Design not found.' };
  const errors = website?validateFigmaWebsite(website):validateStudio(doc!,data!.kind as StudioKind); if (errors.length) return { error:errors.join(' ') };
  const { error } = await supabase.rpc('publish_studio_document',{p_event_id:eventId,p_id:id,p_revision:revision});
  if (error) return { error:error.message.includes('revision_conflict') ? 'This version changed. Reload before publishing.' : 'The design could not be published.' };
  const { data:event } = await supabase.from('events').select('slug').eq('id',eventId).single();
  revalidatePath(`/admin/events/${eventId}`,'layout');
  if(event) revalidatePath(`/e/${event.slug}`,'layout');
  return { success:true };
}

export async function restoreFigmaPublication(eventId:string,id:string){
  const {supabase}=await requireOrganizer();
  const {data,error}=await supabase.rpc('restore_figma_publication',{p_event_id:eventId,p_id:id});
  if(error||!data)return {error:'This version could not be restored.'};
  revalidatePath(`/admin/events/${eventId}/design`,'layout');
  return {success:true};
}

export async function retireStudio(eventId:string,id:string,revision:number,remove:boolean) {
  const {supabase}=await requireOrganizer();
  const {error}=await supabase.rpc('retire_studio_document',{p_event_id:eventId,p_id:id,p_revision:revision,p_delete:remove});
  if(error)return {error:'The version changed or cannot be removed. Reload and try again.'};
  revalidatePath(`/admin/events/${eventId}`,'layout');
  const {data:event}=await supabase.from('events').select('slug').eq('id',eventId).single();
  if(event)revalidatePath(`/e/${event.slug}`,'layout');
  return {success:true};
}
