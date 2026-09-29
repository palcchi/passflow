import {ImageResponse} from 'next/og';
import {getPublishedEvent} from '@/lib/events';
export const size={width:1200,height:630};
export const contentType='image/png';
export default async function Image({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,event=await getPublishedEvent(slug);
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',padding:76,background:'#f4f2ff',color:'#191926',flexDirection:'column',justifyContent:'space-between',fontFamily:'Arial,sans-serif'}}><span style={{fontSize:30,fontWeight:700}}>PassFlow · EVENT</span><div style={{display:'flex',flexDirection:'column',gap:25}}><strong style={{fontSize:82,lineHeight:1.05}}>{event?.name??'Event'}</strong><span style={{fontSize:30}}>{event?.dateLabel??''} · {event?.venue??''}</span></div></div>,size);
}
