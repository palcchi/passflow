import {pluginBody,pluginServer} from '@/lib/figma-plugin-server';
import {verifyFigmaWebhook} from '@/lib/figma-webhook';
export async function POST(request:Request){
 const respond=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
 if(!process.env.FIGMA_WEBHOOK_CONNECTIONS)return respond(503);
 try{
  const body=await pluginBody(request);
  if(!verifyFigmaWebhook(body,process.env.FIGMA_WEBHOOK_CONNECTIONS))return respond(401);
  if(body.event_type==='PING')return respond(204);
  const at=typeof body.timestamp==='string'?Date.parse(body.timestamp):NaN;
  if(!Number.isFinite(at)||at>Date.now()+300000||at<Date.now()-7*86400000)return respond(400);
  const {error}=await pluginServer().rpc('mark_figma_external_change',{p_file_key:body.file_key as string,p_at:new Date(at).toISOString()});
  return respond(error?503:204);
 }catch{return respond(400);}
}
