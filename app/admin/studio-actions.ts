"use server";
import { revalidatePath } from 'next/cache';
import { requireOrganizer } from '@/lib/auth/session';
import { readStudioDocument, studioKinds, validateStudio, type StudioKind } from '@/lib/studio/model';
import type { Json } from '@/lib/supabase/database.types';
import {readFigmaWebsite,validateFigmaWebsite} from '@/lib/figma-website';

export async function saveStudio(input: { eventId: string; id: string | null; revision: number; kind: StudioKind; name: string; ticketTypeId: string | null; document: unknown }) {
  if(input.kind==='website')return {error:'Design event websites in Figma. Use Quick Setup for basic settings.'};
  const doc = readStudioDocument(input.document);
  if (!doc || !studioKinds.includes(input.kind) || !input.name.trim() || input.name.length>100 || JSON.stringify(doc).length>750000) return { error:'Invalid design or file too large (750 KB maximum).' };
  const { supabase } = await requireOrganizer();
  const { data, error } = await supabase.rpc('save_studio_document', { p_event_id:input.eventId,p_id:input.id,p_revision:input.revision,p_kind:input.kind,p_ticket_type_id:input.ticketTypeId,p_name:input.name,p_document:doc as unknown as Json });
  if (error) return { error:error.message.includes('revision_conflict') ? 'Another session changed this draft. Reload the latest version, or save your work as a new design.' : 'The draft could not be saved. Check your event access and try again.' };
  revalidatePath(`/admin/events/${input.eventId}/design`,'layout');
  const result = data as {id:string;revision:number}; return { id:result.id,revision:result.revision };
}
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

export async function publishFigmaDraft(eventId:string,id:string) {
  const {supabase}=await requireOrganizer();
  const {error}=await supabase.rpc('publish_figma_draft',{p_event_id:eventId,p_id:id});
  if(error)return {error:'The Figma draft could not be published. Refresh and check your event access.'};
  revalidatePath(`/admin/events/${eventId}`,'layout');
  const {data:event}=await supabase.from('events').select('slug').eq('id',eventId).single();
  if(event)revalidatePath(`/e/${event.slug}`,'layout');
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
