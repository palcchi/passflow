import 'server-only';
import {createHash,randomBytes} from 'crypto';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database.types';
export const secretHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function pluginServer(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('plugin_server_not_configured');
  return createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function newPairingCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=randomBytes(10);return 'PF-'+Array.from(bytes,b=>alphabet[b%32]).join('');}
export function normalizePairingCode(value:unknown){return typeof value==='string'?value.trim().toUpperCase().replace(/[^A-Z0-9]/g,''):'';}
export const pluginHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
export const pluginResponse=(data:unknown,status=200)=>Response.json(data,{status,headers:pluginHeaders});
export async function pluginBody(request:Request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('invalid_content_type');
  if(Number(request.headers.get('content-length')??0)>950000)throw new Error('payload_too_large');
  const reader=request.body?.getReader();if(!reader)throw new Error('invalid_body');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>950000){await reader.cancel();throw new Error('payload_too_large');}chunks.push(value);}
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_body');
  return value as Record<string,unknown>;
}
export const documentIdValid=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(v);
