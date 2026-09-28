import {createHash,timingSafeEqual} from 'node:crypto';
export function verifyFigmaWebhook(body:Record<string,unknown>,configuration:string|undefined){
 if(!configuration)return false;
 try{
  const configured=JSON.parse(configuration)[String(body.webhook_id)] as {passcode?:unknown;fileKey?:unknown}|undefined;
  if(!configured||typeof configured.passcode!=='string'||configured.passcode.length<32||typeof body.passcode!=='string')return false;
  const hash=(value:string)=>createHash('sha256').update(value).digest();
  if(!timingSafeEqual(hash(configured.passcode),hash(body.passcode)))return false;
  return body.event_type==='PING'||(body.event_type==='FILE_UPDATE'&&typeof configured.fileKey==='string'&&configured.fileKey===body.file_key);
 }catch{return false;}
}
