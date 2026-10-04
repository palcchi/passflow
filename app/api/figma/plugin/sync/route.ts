import {documentIdValid,pluginBody,pluginHeaders,pluginResponse,pluginServer,secretHash} from '@/lib/figma-plugin-server';
import {readFigmaWebsite} from '@/lib/figma-website';
import {readStudioDocument} from '@/lib/studio/model';
import type {Json} from '@/lib/supabase/database.types';

const passKinds=['digital','id_card','wristband'] as const;
const passNames:Record<string,string>={digital:'Digital pass',id_card:'ID card',wristband:'Wristband'};

export function OPTIONS(){return new Response(null,{status:204,headers:pluginHeaders});}
export async function POST(request:Request){
  const authorization=request.headers.get('authorization')??'';
  if(!/^Bearer [\w-]{43}$/.test(authorization))return pluginResponse({error:'connection_expired'},401);
  try{
    const body=await pluginBody(request);if(!documentIdValid(body.documentId))return pluginResponse({error:'invalid_document_id'},400);
    const document=body.document?readFigmaWebsite(body.document):null;
    if(body.document&&!document)return pluginResponse({error:'invalid_document'},400);
    if(document&&(!Number.isSafeInteger(body.revision)||Number(body.revision)<0))return pluginResponse({error:'invalid_revision'},400);
    // Pass designs (ID card, digital pass, wristband) sync alongside the website as private drafts.
    const rawPasses=Array.isArray(body.passes)?body.passes:[];
    if(rawPasses.length>6)return pluginResponse({error:'too_many_passes'},400);
    const passes:{kind:string;document:NonNullable<ReturnType<typeof readStudioDocument>>}[]=[];
    for(const raw of rawPasses){
      const p=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},doc=readStudioDocument(p.document);
      if(!passKinds.includes(p.kind as typeof passKinds[number])||!doc||passes.some(x=>x.kind===p.kind)||JSON.stringify(doc).length>750000)return pluginResponse({error:'invalid_pass'},400);
      passes.push({kind:p.kind as string,document:doc});
    }
    const server=pluginServer(),tokenHash=secretHash(authorization.slice(7));
    const {data,error}=await server.rpc('figma_plugin_draft',{p_token_hash:tokenHash,p_document_id:body.documentId,p_revision:Number(body.revision??0),p_document:document as unknown as Json|null,p_payload_hash:document?secretHash(JSON.stringify(document)):null});
    if(error)return pluginResponse({error:'sync_unavailable'},503);
    const result=data as Record<string,unknown>;
    if(result.error)return pluginResponse(result,result.error==='revision_conflict'?409:401);
    if(!passes.length)return pluginResponse(result);
    // The RPC above authorized the token and re-checked organizer permission; the link gives event and author.
    const {data:link}=await server.from('figma_plugin_links').select('event_id,created_by').eq('token_hash',tokenHash).eq('document_id',body.documentId).is('revoked_at',null).single();
    if(!link)return pluginResponse({error:'connection_expired'},401);
    const passDrafts:Record<string,string>={};
    for(const p of passes){
      const stored={...p.document,source:'figma',figmaDocumentId:body.documentId} as unknown as Json;
      const {data:existing}=await server.from('event_studio_documents').select('id,revision').eq('event_id',link.event_id).eq('kind',p.kind).eq('status','draft').is('ticket_type_id',null).eq('document->>figmaDocumentId',body.documentId).maybeSingle();
      const write=existing
        ?await server.from('event_studio_documents').update({document:stored,revision:existing.revision+1,updated_at:new Date().toISOString()}).eq('id',existing.id).eq('revision',existing.revision).select('id').maybeSingle()
        :await server.from('event_studio_documents').insert({event_id:link.event_id,kind:p.kind,name:'Figma · '+passNames[p.kind],document:stored,created_by:link.created_by}).select('id').single();
      if(write.error||!write.data)return pluginResponse({error:'sync_unavailable'},503);
      passDrafts[p.kind]=write.data.id;
    }
    return pluginResponse({...result,passDrafts});
  }catch(error){return pluginResponse({error:error instanceof Error&&error.message==='plugin_server_not_configured'?'plugin_server_not_configured':'invalid_request'},400);}
}
