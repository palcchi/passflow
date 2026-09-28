'use server';
import {revalidatePath} from 'next/cache';
import {requireOrganizer} from '@/lib/auth/session';
import {newPairingCode,normalizePairingCode,secretHash} from '@/lib/figma-plugin-server';
export async function createPairingCode(eventId:string){
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return {error:'Plugin pairing is not configured on this server yet. Existing Figma OAuth is a separate connection.'};
  const {supabase}=await requireOrganizer();const code=newPairingCode();
  const {error}=await supabase.rpc('create_figma_pairing_code',{p_event_id:eventId,p_code_hash:secretHash(normalizePairingCode(code))});
  if(error)return {error:error.message.includes('rate_limited')?'Wait before creating another code. Limit: five codes per ten minutes.':'A pairing code could not be created. Check your event access and database setup.'};
  return {code,expiresAt:new Date(Date.now()+600000).toISOString()};
}
export async function revokePluginLink(eventId:string,id:string){
  const {supabase}=await requireOrganizer();
  const {data,error}=await supabase.from('figma_plugin_links').update({revoked_at:new Date().toISOString()}).eq('event_id',eventId).eq('id',id).select('id').maybeSingle();
  if(error||!data)return {error:'Connection could not be revoked.'};
  revalidatePath(`/admin/events/${eventId}/design`,'layout');return {success:true};
}
