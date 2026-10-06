import 'server-only';
import {createHash,randomBytes} from 'crypto';
import {serviceClient} from '@/lib/supabase/service';
export const secretHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function pluginServer(){
  try{return serviceClient();}catch{throw new Error('plugin_server_not_configured');}
}
export function newPairingCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=randomBytes(10);return 'PF-'+Array.from(bytes,b=>alphabet[b%32]).join('');}
export function normalizePairingCode(value:unknown){return typeof value==='string'?value.trim().toUpperCase().replace(/[^A-Z0-9]/g,''):'';}
export const pluginHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
export const pluginResponse=(data:unknown,status=200)=>Response.json(data,{status,headers:pluginHeaders});
export async function pluginBody(request:Request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('invalid_content_type');
  if(Number(request.headers.get('content-length')??0)>16000000)throw new Error('payload_too_large');
  const reader=request.body?.getReader();if(!reader)throw new Error('invalid_body');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000000){await reader.cancel();throw new Error('payload_too_large');}chunks.push(value);}
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_body');
  return value as Record<string,unknown>;
}
export const documentIdValid=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(v);
