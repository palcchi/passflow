'use server';
import {revalidatePath} from 'next/cache';
import {requireOrganizer} from '@/lib/auth/session';
import {normalizeEventLabel,validEventLabel} from '@/lib/event-host';
export async function eventSubdomain(eventId:string,raw:string,save=false){
 const label=normalizeEventLabel(raw);
 if(!validEventLabel(label))return {error:'Use 3 to 63 lowercase letters, numbers or hyphens. System names are reserved.'};
 const {supabase}=await requireOrganizer();
 if(!save){const {data,error}=await supabase.rpc('check_event_subdomain',{p_event_id:eventId,p_label:label});return error?{error:'Availability could not be checked.'}:data?{success:true,label}:{error:'This address is already reserved.'};}
 const {error}=await supabase.rpc('save_event_subdomain',{p_event_id:eventId,p_label:label});
 if(error)return {error:error.code==='23505'?'This address was just reserved. Choose another.':'Address could not be saved. Check access and configuration.'};
 revalidatePath(`/organizer/events/${eventId}/design`);
 return {success:true,label};
}
