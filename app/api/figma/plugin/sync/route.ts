import {documentIdValid,pluginBody,pluginHeaders,pluginResponse,pluginServer,secretHash} from '@/lib/figma-plugin-server';
import {readFigmaWebsite} from '@/lib/figma-website';
import type {Json} from '@/lib/supabase/database.types';
export function OPTIONS(){return new Response(null,{status:204,headers:pluginHeaders});}
export async function POST(request:Request){
  const authorization=request.headers.get('authorization')??'';
  if(!/^Bearer [\w-]{43}$/.test(authorization))return pluginResponse({error:'connection_expired'},401);
  try{
    const body=await pluginBody(request);if(!documentIdValid(body.documentId))return pluginResponse({error:'invalid_document_id'},400);
    const document=body.document?readFigmaWebsite(body.document):null;
    if(body.document&&!document)return pluginResponse({error:'invalid_document'},400);
    if(document&&(!Number.isSafeInteger(body.revision)||Number(body.revision)<0))return pluginResponse({error:'invalid_revision'},400);
    const {data,error}=await pluginServer().rpc('figma_plugin_draft',{p_token_hash:secretHash(authorization.slice(7)),p_document_id:body.documentId,p_revision:Number(body.revision??0),p_document:document as unknown as Json|null,p_payload_hash:document?secretHash(JSON.stringify(document)):null});
    if(error)return pluginResponse({error:'sync_unavailable'},503);
    const result=data as Record<string,unknown>;
    if(result.error)return pluginResponse(result,result.error==='revision_conflict'?409:401);
    return pluginResponse(result);
  }catch(error){return pluginResponse({error:error instanceof Error&&error.message==='plugin_server_not_configured'?'plugin_server_not_configured':'invalid_request'},400);}
}
