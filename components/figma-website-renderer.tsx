/* eslint-disable @next/next/no-img-element */
import type {CSSProperties,ReactNode} from 'react';
import {websiteLink,type FigmaWebsite,type WebsiteFrame,type WebsiteNode} from '@/lib/figma-website';

export type WebsiteData={
  name:string;
  description:string;
  date:string;
  venue:string;
  claimUrl:string;
  ctaLabel:string;
  logo?:string;
  banner?:string;
  tickets:{id:string;name:string;price:number;currency:string}[];
  schedule?:{title:string;time:string}[];
  speakers?:{name:string;role:string}[];
  sponsors?:{name:string;url:string}[];
};

// Figma family → web stack; the site loads Geist, so a bare "Inter" fell back to the browser serif.
const fontStacks:Record<string,string>={Inter:'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',Arial:'Arial, Helvetica, sans-serif',Georgia:'Georgia, "Times New Roman", serif',monospace:'ui-monospace, SFMono-Regular, Menlo, monospace'};

function venueMapUrl(venue:string){
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(venue);
}

function Frame({frame,data,preview,prefix}:{frame:WebsiteFrame;data:WebsiteData;preview:boolean;prefix:string}){
  const children=new Map<string|null,WebsiteNode[]>();
  for(const n of frame.nodes)children.set(n.parentId,[...(children.get(n.parentId)??[]),n]);

  const nav=(children.get(null)??[]).find(n=>n.sticky&&n.x<=1&&n.y<=1&&n.width>=frame.width-1);
  const anchorOffset=nav?(nav.height/frame.width*100)+'cqw':undefined;

  function render(n:WebsiteNode,parentWidth:number,parentHeight:number,inNav=false):ReactNode{
    const nested=children.get(n.id)?.map(c=>render(c,n.width,n.height,inNav));
    const values:Record<string,string>={
      eventName:data.name,
      eventDescription:data.description,
      eventDate:data.date,
      venue:data.venue
    };
    const style:CSSProperties={
      position:'absolute',
      left:(n.x/parentWidth*100)+'%',
      top:(n.y/parentHeight*100)+'%',
      width:(n.width/parentWidth*100)+'%',
      height:(n.height/parentHeight*100)+'%',
      color:n.color,
      background:n.type==='box'&&n.hasFill?n.fill:undefined,
      borderRadius:(n.radius/frame.width*100)+'cqw',
      fontSize:(n.fontSize/frame.width*100)+'cqw',
      fontFamily:fontStacks[n.fontFamily]??fontStacks.Inter,
      fontWeight:n.fontWeight,
      letterSpacing:n.letterSpacing?(n.letterSpacing/frame.width*100)+'cqw':undefined,
      opacity:n.opacity<1?n.opacity:undefined,
      border:n.stroke&&n.strokeWidth?(n.strokeWidth/frame.width*100)+'cqw solid '+n.stroke:undefined,
      boxSizing:'border-box',
      textAlign:n.align,
      whiteSpace:'pre-wrap',
      overflow:'hidden',
      lineHeight:n.lineHeight,
      scrollMarginTop:anchorOffset
    };
    const id=['tickets','schedule','speakers','sponsors','venueMap'].includes(n.binding??'')?prefix+'-'+n.binding:undefined;
    const value=n.binding&&n.binding in values?values[n.binding]:n.text;

    if(n.binding==='logo'||n.binding==='banner'){
      const src=n.binding==='logo'?data.logo:data.banner;
      return src
        ? <img key={n.id} src={src} alt={n.binding==='logo'?data.name+' logo':data.name+' banner'} style={{...style,objectFit:'cover'}}/>
        : <div key={n.id} style={style}>{nested}</div>;
    }

    if(n.binding==='tickets'){
      return <div key={n.id} id={id} style={{...style,overflowY:'auto'}} className="figma-live-list">
        {data.tickets.length?data.tickets.map(t=><a key={t.id} className="figma-live-row" aria-disabled={preview} href={preview?undefined:data.claimUrl}>
          <strong>{t.name}</strong>
          <span>{t.price>0?t.currency+' '+t.price.toLocaleString('en-GB'):'Free'}</span>
        </a>):<p className="figma-live-empty">Tickets open soon</p>}
      </div>;
    }

    if(n.binding==='schedule'||n.binding==='speakers'||n.binding==='sponsors'){
      const rows=n.binding==='schedule'?data.schedule:n.binding==='speakers'?data.speakers:data.sponsors;
      const empty=n.binding==='schedule'?'Schedule coming soon':n.binding==='speakers'?'Speakers to be announced':'Partners to be announced';
      return <div key={n.id} id={id} style={{...style,overflowY:'auto'}} className={n.binding==='schedule'?'figma-live-list':'figma-live-grid'}>
        {rows?.length?rows.map((row,i)=>{
          if('title' in row)return <div key={i} className="figma-live-row"><strong>{row.title}</strong><span>{row.time}</span></div>;
          if('role' in row)return <div key={i} className="figma-live-card"><strong>{row.name}</strong><span>{row.role}</span></div>;
          return <div key={i} className="figma-live-card">
            {websiteLink(row.url)
              ? <a href={preview?undefined:row.url} aria-disabled={preview} rel="noopener noreferrer"><strong>{row.name}</strong></a>
              : <strong>{row.name}</strong>}
          </div>;
        }):<p className="figma-live-empty">{empty}</p>}
      </div>;
    }

    if(n.binding==='venueMap'){
      return <a
        key={n.id}
        id={id}
        href={preview?undefined:venueMapUrl(data.venue)}
        aria-disabled={preview}
        target={preview?undefined:'_blank'}
        rel="noopener noreferrer"
        style={{...style,display:'flex',alignItems:'center',justifyContent:'center',padding:'1em'}}
      >
        <span>{data.venue?('Open map · '+data.venue):'Venue map'}</span>
      </a>;
    }

    if(n.binding==='register'||n.binding==='myPass'||n.binding==='customLink'){
      const href=n.binding==='customLink'
        ? (n.href.startsWith('#')?'#'+prefix+'-'+n.href.slice(1):n.href)
        : data.claimUrl;
      const label=n.binding==='register'
        ? data.ctaLabel
        : n.binding==='myPass'
          ? 'View my pass'
          : value;
      return <a
        key={n.id}
        href={preview?undefined:href}
        aria-disabled={preview}
        style={{...style,display:'flex',alignItems:'center',justifyContent:n.align==='left'?'flex-start':n.align==='right'?'flex-end':'center'}}
      >
        {label}
      </a>;
    }

    if(n.type==='image')return n.image?<img key={n.id} src={n.image} alt={n.text} style={{...style,objectFit:'contain'}}/>:null;
    if(n.binding==='eventName'&&!inNav)return <h1 key={n.id} style={{...style,margin:0}}>{value}</h1>;
    return <div key={n.id} style={style}>{n.type==='text'?value:nested}</div>;
  }

  return <div className="figma-live-frame" style={{aspectRatio:frame.width+'/'+frame.height,background:frame.background}}>
    {nav&&<div className="figma-live-nav"><div style={{position:'relative',aspectRatio:frame.width+'/'+nav.height}}>{render(nav,nav.width,nav.height,true)}</div></div>}
    {(children.get(null)??[]).filter(n=>n!==nav).map(n=>render(n,frame.width,frame.height))}
  </div>;
}

export function FigmaWebsiteRenderer({document,data,preview=false}:{document:FigmaWebsite;data:WebsiteData;preview?:boolean}){
  return <div className="figma-live-website">
    <div className="figma-live-desktop"><Frame frame={document.desktop} data={data} preview={preview} prefix="desktop"/></div>
    {document.mobile
      ? <div className="figma-live-mobile"><Frame frame={document.mobile} data={data} preview={preview} prefix="mobile"/></div>
      : <div className="figma-live-mobile figma-live-fallback">
          <h1>{data.name}</h1>
          <p>{data.description}</p>
          <p>{data.date} · {data.venue}</p>
          <a className="button button-dark" href={preview?undefined:data.claimUrl} aria-disabled={preview}>{data.ctaLabel}</a>
        </div>}
  </div>;
}
