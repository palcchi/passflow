import {randomBytes} from 'crypto';
import {documentIdValid,normalizePairingCode,pluginBody,pluginHeaders,pluginResponse,pluginServer,secretHash} from '@/lib/figma-plugin-server';
export function OPTIONS(){return new Response(null,{status:204,headers:pluginHeaders});}
export async function POST(request:Request){
  try{
    const body=await pluginBody(request),code=normalizePairingCode(body.code);
    if(!/^PF[A-Z2-9]{10}$/.test(code)||!documentIdValid(body.documentId)||typeof body.fileName!=='string'||!body.fileName.trim()||body.fileName.length>150)return pluginResponse({error:'invalid_pairing_request'},400);
    const token=randomBytes(32).toString('base64url');
    const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()??'unknown':'local-development';
    const {data,error}=await pluginServer().rpc('exchange_figma_pairing_code',{p_code_hash:secretHash(code),p_token_hash:secretHash(token),p_document_id:body.documentId,p_file_name:body.fileName,p_file_key:typeof body.fileKey==='string'&&/^[a-zA-Z0-9]{10,100}$/.test(body.fileKey)?body.fileKey:null,p_bucket:secretHash(ip)});
    if(error)return pluginResponse({error:'pairing_unavailable'},503);
    const result=data as Record<string,unknown>;
    if(result.error)return pluginResponse(result,result.error==='rate_limited'?429:400);
    return pluginResponse({...result,token});
  }catch(error){return pluginResponse({error:error instanceof Error&&error.message==='plugin_server_not_configured'?'plugin_server_not_configured':'invalid_request'},400);}
}
