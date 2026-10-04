import 'server-only';
import {readFigmaWebsite} from '@/lib/figma-website';
import {readWebsiteContent} from '@/lib/event-website-content';
import {getAppOrigin} from '@/lib/supabase/config';
import type {createServerSupabaseClient} from '@/lib/supabase/server';
import type {PassFlowEvent} from '@/lib/events';
import type {WebsiteData} from '@/components/figma-website-renderer';

type Client=Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function publishedFigmaWebsite(supabase:Client,eventId:string){
  const {data}=await supabase.from('event_studio_documents').select('document').eq('event_id',eventId).eq('kind','website').eq('status','published').is('ticket_type_id',null).maybeSingle();
  return readFigmaWebsite(data?.document);
}

export async function figmaWebsiteData(supabase:Client,event:PassFlowEvent,ctaLabel:string):Promise<WebsiteData>{
  const [tickets,content]=await Promise.all([supabase.from('ticket_types').select('id,name,price,currency').eq('event_id',event.id),supabase.from('event_website_content').select('content').eq('event_id',event.id).maybeSingle()]);
  return {name:event.name,description:event.description,date:event.dateLabel,venue:event.venue,logo:event.logoUrl??undefined,banner:event.heroImageUrl??event.posterUrl??undefined,claimUrl:`${getAppOrigin()??''}/e/${event.slug}/claim`,ctaLabel,tickets:tickets.data??[],...readWebsiteContent(content.data?.content)};
}
