import {documentIdValid,pluginBody,pluginHeaders,pluginResponse,pluginServer,secretHash} from '@/lib/figma-plugin-server';
import {readFigmaWebsite} from '@/lib/figma-website';
import {readStudioDocument} from '@/lib/studio/model';
import {hoistFigmaImages} from '@/lib/figma-assets';
import type {Json} from '@/lib/supabase/database.types';

const passKinds=['digital','id_card','wristband'] as const;
const passNames:Record<string,string>={digital:'Digital pass',id_card:'ID card',wristband:'Wristband'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function OPTIONS(){return new Response(null,{status:204,headers:pluginHeaders});}
export async function POST(request:Request){
  const authorization=request.headers.get('authorization')??'';
  if(!/^Bearer [\w-]{43}$/.test(authorization))return pluginResponse({error:'connection_expired'},401);
  try{
    const body=await pluginBody(request);if(!documentIdValid(body.documentId))return pluginResponse({error:'invalid_document_id'},400);
    const rawPasses=Array.isArray(body.passes)?body.passes:[];
    if(rawPasses.length>12)return pluginResponse({error:'too_many_passes'},400);
    if(body.document&&(!Number.isSafeInteger(body.revision)||Number(body.revision)<0))return pluginResponse({error:'invalid_revision'},400);
    const server=pluginServer(),tokenHash=secretHash(authorization.slice(7));
    // Authorize first (no write): the RPC checks the token, expiry and the pairing organizer's permission.
    const {data:stateData,error:stateError}=await server.rpc('figma_plugin_draft',{p_token_hash:tokenHash,p_document_id:body.documentId,p_revision:0,p_document:null,p_payload_hash:null});
    if(stateError)return pluginResponse({error:'sync_unavailable'},503);
    const state=stateData as Record<string,unknown>;
    if(state.error)return pluginResponse(state,401);
    const eventId=state.eventId as string;
    if(!body.document&&!rawPasses.length){
      // State requests also tell the plugin which ticket categories can get their own pass design.
      const {data:tickets}=await server.from('ticket_types').select('id,name').eq('event_id',eventId).order('created_at');
      return pluginResponse({...state,tickets:tickets??[]});
    }
    try{await hoistFigmaImages(server,eventId,body.document,rawPasses);}
    catch(error){const code=error instanceof Error?error.message:'asset_upload_failed';return pluginResponse({error:code},code==='asset_upload_failed'?503:400);}
    const document=body.document?readFigmaWebsite(body.document):null;
    if(body.document&&!document)return pluginResponse({error:'invalid_document'},400);
    const passes:{kind:string;ticketTypeId:string|null;document:NonNullable<ReturnType<typeof readStudioDocument>>}[]=[];
    for(const raw of rawPasses){
      const p=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},doc=readStudioDocument(p.document),ticketTypeId=typeof p.ticketTypeId==='string'&&uuid.test(p.ticketTypeId)?p.ticketTypeId:null;
      if(!passKinds.includes(p.kind as typeof passKinds[number])||!doc||(p.ticketTypeId&&!ticketTypeId)||passes.some(x=>x.kind===p.kind&&x.ticketTypeId===ticketTypeId)||JSON.stringify(doc).length>750000)return pluginResponse({error:'invalid_pass'},400);
      passes.push({kind:p.kind as string,ticketTypeId,document:doc});
    }
    let result=state;
    if(document){
      const {data,error}=await server.rpc('figma_plugin_draft',{p_token_hash:tokenHash,p_document_id:body.documentId,p_revision:Number(body.revision??0),p_document:document as unknown as Json,p_payload_hash:secretHash(JSON.stringify(document))});
      if(error)return pluginResponse({error:'sync_unavailable'},503);
      result=data as Record<string,unknown>;
      if(result.error)return pluginResponse(result,result.error==='revision_conflict'?409:401);
    }
    if(!passes.length)return pluginResponse(result);
    const {data:link}=await server.from('figma_plugin_links').select('created_by').eq('token_hash',tokenHash).eq('document_id',body.documentId).is('revoked_at',null).single();
    if(!link)return pluginResponse({error:'connection_expired'},401);
    const ticketIds=[...new Set(passes.flatMap(p=>p.ticketTypeId?[p.ticketTypeId]:[]))];
    const {data:tickets}=ticketIds.length?await server.from('ticket_types').select('id,name').eq('event_id',eventId).in('id',ticketIds):{data:[] as {id:string;name:string}[]};
    if((tickets??[]).length!==ticketIds.length)return pluginResponse({error:'invalid_ticket_type'},400);
    const passDrafts:Record<string,string>={};
    for(const p of passes){
      const stored={...p.document,source:'figma',figmaDocumentId:body.documentId} as unknown as Json;
      let lookup=server.from('event_studio_documents').select('id,revision').eq('event_id',eventId).eq('kind',p.kind).eq('status','draft').eq('document->>figmaDocumentId',body.documentId);
      lookup=p.ticketTypeId?lookup.eq('ticket_type_id',p.ticketTypeId):lookup.is('ticket_type_id',null);
      const {data:existing}=await lookup.maybeSingle();
      const ticketName=tickets?.find(t=>t.id===p.ticketTypeId)?.name;
      const write=existing
        ?await server.from('event_studio_documents').update({document:stored,revision:existing.revision+1,updated_at:new Date().toISOString()}).eq('id',existing.id).eq('revision',existing.revision).select('id').maybeSingle()
        :await server.from('event_studio_documents').insert({event_id:eventId,kind:p.kind,ticket_type_id:p.ticketTypeId,name:('Figma · '+passNames[p.kind]+(ticketName?' · '+ticketName:'')).slice(0,100),document:stored,created_by:link.created_by}).select('id').single();
      if(write.error||!write.data)return pluginResponse({error:'sync_unavailable'},503);
      passDrafts[p.kind+(p.ticketTypeId?':'+p.ticketTypeId:'')]=write.data.id;
    }
    return pluginResponse({...result,passDrafts});
  }catch(error){return pluginResponse({error:error instanceof Error&&error.message==='plugin_server_not_configured'?'plugin_server_not_configured':'invalid_request'},400);}
}
