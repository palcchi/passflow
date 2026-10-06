import {documentIdValid,pluginBody,pluginHeaders,pluginResponse,pluginServer,secretHash} from '@/lib/figma-plugin-server';
import {revalidatePath} from 'next/cache';
import {figmaWebsiteIssues,readFigmaWebsiteReport,type DesignIssue} from '@/lib/figma-website';
import {readStudioDocument,studioIssues,type StudioKind} from '@/lib/studio/model';
import {hoistFigmaImages} from '@/lib/figma-assets';
import type {Json} from '@/lib/supabase/database.types';

const passKinds=['digital','id_card','wristband'] as const;
const passNames:Record<string,string>={digital:'Digital pass',id_card:'ID card',wristband:'Wristband'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Server=ReturnType<typeof pluginServer>;

// Sync is publish: the synced row becomes the live design for its kind and ticket category, and every older
// draft or archived row for that slot is deleted so the Design page only lists what is live.
// ponytail: not one transaction; the unique published index rejects a racing second sync, which the plugin retries.
async function goLive(server:Server,eventId:string,id:string){
  const {data:doc,error}=await server.from('event_studio_documents').select('kind,ticket_type_id,status').eq('id',id).eq('event_id',eventId).single();
  if(error||!doc)throw Error('sync_unavailable');
  const slot=<T extends {eq:(c:string,v:string)=>T;is:(c:string,v:null)=>T}>(q:T)=>{const k=q.eq('event_id',eventId).eq('kind',doc.kind);return doc.ticket_type_id?k.eq('ticket_type_id',doc.ticket_type_id):k.is('ticket_type_id',null);};
  if(doc.status!=='published'){
    const {data:last}=await slot(server.from('event_studio_documents').select('publication_number')).not('publication_number','is',null).order('publication_number',{ascending:false}).limit(1).maybeSingle();
    const now=new Date().toISOString();
    const archived=await slot(server.from('event_studio_documents').update({status:'archived',updated_at:now})).eq('status','published');
    const live=await server.from('event_studio_documents').update({status:'published',publication_number:(last?.publication_number??0)+1,published_at:now,updated_at:now}).eq('id',id);
    if(archived.error||live.error)throw Error('sync_unavailable');
  }
  await slot(server.from('event_studio_documents').delete()).neq('status','published');
}

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
    const report=body.document?readFigmaWebsiteReport(body.document):null;
    if(report&&!report.doc)return pluginResponse({error:'design_issues',issues:[{frame:report.frame,message:report.message,blocking:true}]},422);
    const document=report?.doc??null;
    const passes:{kind:string;ticketTypeId:string|null;document:NonNullable<ReturnType<typeof readStudioDocument>>}[]=[];
    for(const raw of rawPasses){
      const p=raw&&typeof raw==='object'?raw as Record<string,unknown>:{},doc=readStudioDocument(p.document),ticketTypeId=typeof p.ticketTypeId==='string'&&uuid.test(p.ticketTypeId)?p.ticketTypeId:null;
      if(!passKinds.includes(p.kind as typeof passKinds[number])||(p.ticketTypeId&&!ticketTypeId))return pluginResponse({error:'invalid_pass'},400);
      const label=passNames[p.kind as string];
      const problem=!doc?'This pass frame could not be read. Check its size (10 mm to 2 m) and that its layers are visible.':passes.some(x=>x.kind===p.kind&&x.ticketTypeId===ticketTypeId)?'Keep one '+label+' frame per ticket category.':JSON.stringify(doc).length>750000?'This pass is too large. Simplify large images.':'';
      if(problem||!doc)return pluginResponse({error:'design_issues',issues:[{frame:label,message:problem,blocking:true}]},422);
      passes.push({kind:p.kind as string,ticketTypeId,document:doc});
    }
    const issues:DesignIssue[]=[...(document?figmaWebsiteIssues(document):[]),...passes.flatMap(p=>studioIssues(p.document,p.kind as StudioKind).map(i=>({...i,frame:passNames[p.kind]})))];
    if(issues.some(i=>i.blocking))return pluginResponse({error:'design_issues',issues},422);
    const warnings=issues.filter(i=>!i.blocking);
    let result=state;
    if(document){
      const {data,error}=await server.rpc('figma_plugin_draft',{p_token_hash:tokenHash,p_document_id:body.documentId,p_revision:Number(body.revision??0),p_document:document as unknown as Json,p_payload_hash:secretHash(JSON.stringify(document))});
      if(error)return pluginResponse({error:'sync_unavailable'},503);
      result=data as Record<string,unknown>;
      if(result.error)return pluginResponse(result,result.error==='revision_conflict'?409:401);
      await goLive(server,eventId,result.draftId as string);
    }
    const done=async(extra:Record<string,unknown>={})=>{
      const {data:event}=await server.from('events').select('slug').eq('id',eventId).single();
      if(event)revalidatePath('/e/'+event.slug,'layout');
      revalidatePath('/organizer/events/'+eventId,'layout');
      return pluginResponse({...result,...extra,live:true,warnings});
    };
    if(!passes.length)return done();
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
      await goLive(server,eventId,write.data.id);
    }
    return done({passDrafts});
  }catch(error){const code=error instanceof Error?error.message:'';return pluginResponse({error:['plugin_server_not_configured','sync_unavailable'].includes(code)?code:'invalid_request'},code==='sync_unavailable'?503:400);}
}
