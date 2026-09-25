import { getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export type EventTheme={primary:string;secondary:string;background:string;foreground:string;surface:string};
export type PassFlowEvent={id:string;name:string;slug:string;eyebrow:string;description:string;venue:string;dateLabel:string;attendeeCount:number;checkedInCount:number;theme:EventTheme};
export const demoEvents:PassFlowEvent[]=[
{id:"evt_adorne_exhibition",name:"Adorne Nails Exhibition",slug:"adorne-nails-exhibition",eyebrow:"Beauty Exhibition",description:"A multi-zone beauty experience with workshops, exhibitions, product showcases, and QR-based access.",venue:"Adorne Studio",dateLabel:"12 October 2026",attendeeCount:428,checkedInCount:286,theme:{primary:"#7b1734",secondary:"#f0b8c6",background:"#fff8f9",foreground:"#211216",surface:"#ffffff"}},
{id:"evt_adorne_workshop",name:"Adorne Nails Workshop",slug:"adorne-nails-workshop",eyebrow:"Beauty Workshop",description:"A hands-on nail workshop with creator rooms, product showcases, and live visitor tracking.",venue:"Adorne Studio",dateLabel:"24 October 2026",attendeeCount:260,checkedInCount:112,theme:{primary:"#5b5df0",secondary:"#b8b9ff",background:"#0f1014",foreground:"#f7f7fa",surface:"#191a20"}},
];
export function getEventBySlug(slug:string){return demoEvents.find(event=>event.slug===slug)}
export function getEventById(id:string){return demoEvents.find(event=>event.id===id||event.slug===id)}
export async function getPublishedEventById(id: string): Promise<PassFlowEvent | undefined> {
  const local = getEventById(id);
  if (local) return local;
  if (!getSupabaseConfig()) return undefined;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("events").select("slug").eq("id", id).eq("status", "published").maybeSingle();
    return !error && data ? getPublishedEvent(data.slug) : undefined;
  } catch { return undefined; }
}

export async function getPublishedEvents(): Promise<PassFlowEvent[]> {
  if (getSupabaseConfig()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.from("events").select("id,name,slug,description,venue,starts_at,theme").eq("status", "published").order("starts_at");
      if (!error && data?.length) {
        return Promise.all(data.map(async (row) => {
          const [{ count: attendeeCount }, { count: checkedInCount }] = await Promise.all([
            supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", row.id),
            supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", row.id).not("checked_in_at", "is", null),
          ]);
          const theme = (row.theme ?? {}) as Partial<EventTheme>;
          return { id: row.id, name: row.name, slug: row.slug, eyebrow: "Published event", description: row.description ?? "", venue: row.venue ?? "", dateLabel: row.starts_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(row.starts_at)) : "Date to be announced", attendeeCount: attendeeCount ?? 0, checkedInCount: checkedInCount ?? 0, theme: { primary: theme.primary ?? "#7448ff", secondary: theme.secondary ?? "#eee8ff", background: theme.background ?? "#f5f5f2", foreground: theme.foreground ?? "#151515", surface: theme.surface ?? "#fff" } };
        }));
      }
    } catch {}
  }
  return demoEvents;
}
export async function getPublishedEvent(slug:string):Promise<PassFlowEvent|undefined>{
  if(getSupabaseConfig()){try{const supabase=await createServerSupabaseClient();const {data,error}=await supabase.from("events").select("id,name,slug,description,venue,starts_at,theme").eq("slug",slug).eq("status","published").maybeSingle();if(!error&&data){const [{count:attendeeCount},{count:checkedInCount}]=await Promise.all([supabase.from("attendees").select("id",{count:"exact",head:true}).eq("event_id",data.id),supabase.from("attendees").select("id",{count:"exact",head:true}).eq("event_id",data.id).not("checked_in_at","is",null)]);const theme=(data.theme??{}) as EventTheme;return {id:data.id,name:data.name,slug:data.slug,eyebrow:"Featured Event",description:data.description??"",venue:data.venue??"",dateLabel:data.starts_at?new Intl.DateTimeFormat("en-US",{dateStyle:"long"}).format(new Date(data.starts_at)):"Date to be announced",attendeeCount:attendeeCount??0,checkedInCount:checkedInCount??0,theme:{primary:theme.primary??"#7448ff",secondary:theme.secondary??"#eee8ff",background:theme.background??"#f5f5f2",foreground:theme.foreground??"#151515",surface:theme.surface??"#fff"}}}}catch{}}
  return getEventBySlug(slug);
}
