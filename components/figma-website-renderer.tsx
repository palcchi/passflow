/* eslint-disable @next/next/no-img-element */
import type {CSSProperties} from 'react';
import type {FigmaWebsite,WebsiteFrame} from '@/lib/figma-website';
export type WebsiteData={name:string;description:string;date:string;venue:string;claimUrl:string;tickets:{id:string;name:string;price:number;currency:string}[]};
function Frame({frame,data,preview,prefix}:{frame:WebsiteFrame;data:WebsiteData;preview:boolean;prefix:string}){
  return <div className="figma-live-frame" style={{aspectRatio:`${frame.width}/${frame.height}`,background:frame.background}}>{frame.nodes.map(n=>{
    const anchor=(n.binding==='tickets'||n.binding==='schedule')&&frame.nodes.find(other=>other.binding===n.binding)?.id===n.id?`${prefix}-${n.binding}`:undefined;
    const values:Record<string,string>={eventName:data.name,eventDescription:data.description,eventDate:data.date,venue:data.venue};
    const style:CSSProperties={position:'absolute',left:`${n.x/frame.width*100}%`,top:`${n.y/frame.height*100}%`,width:`${n.width/frame.width*100}%`,height:`${n.height/frame.height*100}%`,color:n.color,background:n.type==='box'?n.fill:undefined,borderRadius:`${n.radius/frame.width*100}cqw`,fontSize:`${n.fontSize/frame.width*100}cqw`,fontFamily:n.fontFamily,textAlign:n.align,whiteSpace:'pre-wrap',overflow:'hidden',lineHeight:1.25};
    if(n.type==='image')return <img key={n.id} src={n.image} alt={n.text} style={{...style,objectFit:'contain'}}/>;
    const value=n.binding&&values[n.binding]!==undefined?values[n.binding]:n.text;
    if(n.binding==='tickets')return <div key={n.id} id={anchor} style={{...style,overflowY:'auto'}} className="figma-live-tickets">{data.tickets.map(t=><a key={t.id} aria-disabled={preview} href={preview?undefined:data.claimUrl}><strong>{t.name}</strong><span>{t.price>0?`${t.currency} ${t.price.toLocaleString('en-GB')}`:'Free'}</span></a>)}</div>;
    if(['register','myPass','customLink'].includes(n.binding??''))return <a key={n.id} style={{...style,display:'flex',alignItems:'center',justifyContent:n.align==='left'?'flex-start':n.align==='right'?'flex-end':'center'}} href={preview?undefined:n.binding==='customLink'?(n.href.startsWith('#')?`#${prefix}-${n.href.slice(1)}`:n.href):data.claimUrl} aria-disabled={preview}>{value||'Register / open pass'}</a>;
    if(n.binding==='eventName')return <h1 key={n.id} style={{...style,margin:0}}>{value}</h1>;
    return <div key={n.id} id={anchor} style={style}>{value}</div>;
  })}</div>;
}
export function FigmaWebsiteRenderer({document,data,preview=false}:{document:FigmaWebsite;data:WebsiteData;preview?:boolean}){
  return <div className="figma-live-website"><div className="figma-live-desktop"><Frame prefix="desktop" frame={document.desktop} data={data} preview={preview}/></div>{document.mobile?<div className="figma-live-mobile"><Frame prefix="mobile" frame={document.mobile} data={data} preview={preview}/></div>:<div className="figma-live-mobile figma-live-fallback"><h1>{data.name}</h1><p>{data.description}</p><p>{data.date} · {data.venue}</p>{document.desktop.nodes.filter(n=>n.type==='text'&&!n.binding&&n.text).map(n=><p key={n.id}>{n.text}</p>)}<a className="button button-dark" href={preview?undefined:data.claimUrl} aria-disabled={preview}>Register / open pass</a></div>}</div>;
}
