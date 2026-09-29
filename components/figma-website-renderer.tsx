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

function venueMapUrl(venue:string){
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(venue);
}

function Frame({frame,data,preview,prefix}:{frame:WebsiteFrame;data:WebsiteData;preview:boolean;prefix:string}){
  const children=new Map<string|null,WebsiteNode[]>();
  for(const n of frame.nodes)children.set(n.parentId,[...(children.get(n.parentId)??[]),n]);

  function render(n:WebsiteNode,parentWidth:number,parentHeight:number):ReactNode{
    const nested=children.get(n.id)?.map(c=>render(c,n.width,n.height));
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
      fontFamily:n.fontFamily,
      textAlign:n.align,
      whiteSpace:'pre-wrap',
      overflow:'hidden',
      lineHeight:1.25
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
      return <div key={n.id} id={id} style={{...style,overflowY:'auto'}} className="figma-live-tickets">
        {data.tickets.map(t=><a key={t.id} aria-disabled={preview} href={preview?undefined:data.claimUrl}>
          <strong>{t.name}</strong>
          <span>{t.price>0?t.currency+' '+t.price.toLocaleString('en-GB'):'Free'}</span>
        </a>)}
      </div>;
    }

    if(n.binding==='schedule'||n.binding==='speakers'||n.binding==='sponsors'){
      const rows=n.binding==='schedule'?data.schedule:n.binding==='speakers'?data.speakers:data.sponsors;
      return <div key={n.id} id={id} style={{...style,overflowY:'auto'}}>
        {rows?.map((row,i)=>{
          if('title' in row)return <div key={i} style={{padding:'0.5em',borderBottom:'1px solid currentColor'}}>{row.time+' · '+row.title}</div>;
          if('role' in row)return <div key={i} style={{padding:'0.5em',borderBottom:'1px solid currentColor'}}>{row.name+' · '+row.role}</div>;
          return <div key={i} style={{padding:'0.5em',borderBottom:'1px solid currentColor'}}>
            {websiteLink(row.url)
              ? <a href={preview?undefined:row.url} aria-disabled={preview} rel="noopener noreferrer">{row.name}</a>
              : row.name}
          </div>;
        })}
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
    if(n.binding==='eventName')return <h1 key={n.id} style={{...style,margin:0}}>{value}</h1>;
    return <div key={n.id} style={style}>{n.type==='text'?value:nested}</div>;
  }

  return <div className="figma-live-frame" style={{aspectRatio:frame.width+'/'+frame.height,background:frame.background}}>
    {(children.get(null)??[]).map(n=>render(n,frame.width,frame.height))}
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
