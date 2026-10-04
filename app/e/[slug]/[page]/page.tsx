import {cache} from 'react';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getPublishedEvent} from '@/lib/events';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {pageSlugValid} from '@/lib/figma-website';
import {figmaWebsiteData,publishedFigmaWebsite} from '@/lib/figma-published';
import {FigmaPageRenderer} from '@/components/figma-website-renderer';

type Props={params:Promise<{slug:string;page:string}>};
const title=(page:string)=>page.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');

// Extra pages designed in Figma, e.g. /e/discoveries/agenda. "ticket" is the claim-page header, not a route.
const load=cache(async(slug:string,page:string)=>{
  if(!pageSlugValid(page)||page==='ticket')return null;
  const event=await getPublishedEvent(slug);if(!event)return null;
  const supabase=await createServerSupabaseClient();
  const site=await publishedFigmaWebsite(supabase,event.id);
  const found=site?.pages.find(p=>p.slug===page);
  return found?{event,supabase,page:found}:null;
});

export async function generateMetadata(props:Props):Promise<Metadata>{
  const {slug,page}=await props.params;const loaded=await load(slug,page);
  return loaded?{title:title(loaded.page.slug)+' · '+loaded.event.name,description:loaded.event.description}:{};
}

export default async function EventExtraPage(props:Props){
  const {slug,page}=await props.params;const loaded=await load(slug,page);if(!loaded)notFound();
  const data=await figmaWebsiteData(loaded.supabase,loaded.event,loaded.event.theme.ctaLabel||'Register now');
  return <main><FigmaPageRenderer page={loaded.page} data={data}/></main>;
}
