/* eslint-disable @next/next/no-img-element */
import type {CSSProperties,ReactNode} from 'react';
import {websiteLink,type FigmaWebsite,type WebsiteFrame,type WebsiteNode,type WebsitePage} from '@/lib/figma-website';

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

// Any Figma family is loaded from Google Fonts; system families and the fallbacks cover the rest.
const sans='-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',serif='Georgia, "Times New Roman", serif';
const systemFonts=['Arial','Georgia','monospace','Helvetica','Helvetica Neue','Times New Roman','SF Pro','SF Pro Display','SF Pro Text','New York','Menlo','Courier New'];
const fontStack=(family:string)=>family==='monospace'?'ui-monospace, SFMono-Regular, Menlo, monospace':'"'+family+'", '+(/serif|playfair|georgia|garamond|times|lora|merriweather|baskerville|bodoni|caslon|new york/i.test(family)&&!/sans/i.test(family)?serif:sans);
function FontLinks({frames}:{frames:(WebsiteFrame|null)[]}){
  const weights=new Map<string,Set<number>>();
  for(const f of frames)for(const n of f?.nodes??[])if(n.type==='text'&&!systemFonts.includes(n.fontFamily)){
    const set=weights.get(n.fontFamily)??new Set<number>();set.add(n.fontWeight);for(const s of n.spans)set.add(s.weight);weights.set(n.fontFamily,set);
  }
  // One stylesheet per family, so a weight a family lacks only affects that family.
  return <>{[...weights].slice(0,8).map(([family,set])=><link key={family} rel="stylesheet" precedence="figma-fonts" href={'https://fonts.googleapis.com/css2?family='+encodeURIComponent(family).replace(/%20/g,'+')+':wght@'+[...set].sort((a,b)=>a-b).join(';')+'&display=swap'}/>)}</>;
}
const cq=(px:number,frame:WebsiteFrame)=>(px/frame.width*100)+'cqw';
function gradientCss(g:NonNullable<WebsiteNode['gradient']>){
  const stops=g.stops.map(s=>s.color+' '+Math.round(s.pos*100)+'%').join(', ');
  return g.type==='radial'?'radial-gradient(circle at center, '+stops+')':'linear-gradient('+Math.round(g.angle)+'deg, '+stops+')';
}

function venueMapUrl(venue:string){
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(venue);
}

function Frame({frame,data,preview,prefix,slot}:{frame:WebsiteFrame;data:WebsiteData;preview:boolean;prefix:string;slot?:ReactNode}){
  const children=new Map<string|null,WebsiteNode[]>();
  for(const n of frame.nodes)children.set(n.parentId,[...(children.get(n.parentId)??[]),n]);

  const nav=(children.get(null)??[]).find(n=>n.sticky&&n.x<=1&&n.y<=1&&n.width>=frame.width-1);
  const anchorOffset=nav?(nav.height/frame.width*100)+'cqw':undefined;
  // Text is typed in Figma now, so the largest body text becomes the page <h1> unless eventName is bound.
  const inNavTree=(n:WebsiteNode)=>{let top=n;while(top.parentId){const p=frame.nodes.find(x=>x.id===top.parentId);if(!p)break;top=p;}return top===nav;};
  const headingId=frame.nodes.some(n=>n.binding==='eventName'&&!inNavTree(n))?null:frame.nodes.filter(n=>n.type==='text'&&!n.binding&&!inNavTree(n)).sort((a,b)=>b.fontSize-a.fontSize)[0]?.id??null;

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
      backgroundColor:n.type==='box'&&n.hasFill?n.fill:undefined,
      backgroundImage:[n.bg?'url("'+n.bg.image+'")':'',n.gradient?gradientCss(n.gradient):''].filter(Boolean).join(', ')||undefined,
      backgroundSize:n.bg?(n.bg.fit==='fill'?'100% 100%':n.bg.fit):undefined,
      backgroundPosition:n.bg?'center':undefined,
      backgroundRepeat:n.bg?'no-repeat':undefined,
      boxShadow:n.type!=='text'&&n.shadows.length?n.shadows.map(s=>(s.inset?'inset ':'')+cq(s.x,frame)+' '+cq(s.y,frame)+' '+cq(s.blur,frame)+' '+cq(s.spread,frame)+' '+s.color).join(', '):undefined,
      textShadow:n.type==='text'&&n.shadows.length?n.shadows.filter(s=>!s.inset).map(s=>cq(s.x,frame)+' '+cq(s.y,frame)+' '+cq(s.blur,frame)+' '+s.color).join(', ')||undefined:undefined,
      borderRadius:(n.radius/frame.width*100)+'cqw',
      fontSize:(n.fontSize/frame.width*100)+'cqw',
      fontFamily:fontStack(n.fontFamily),
      fontWeight:n.fontWeight,
      fontStyle:n.italic?'italic':'normal',
      // Typography is set on every node: CSS inherits letter-spacing and font-style, so a container must never pass a heading's tracking down.
      letterSpacing:n.letterSpacing?(n.letterSpacing/frame.width*100)+'cqw':'normal',
      opacity:n.opacity<1?n.opacity:undefined,
      border:n.stroke&&n.strokeWidth?(n.strokeWidth/frame.width*100)+'cqw solid '+n.stroke:undefined,
      boxSizing:'border-box',
      textAlign:n.align,
      whiteSpace:'pre-wrap',
      overflow:'hidden',
      lineHeight:n.lineHeight,
      scrollMarginTop:anchorOffset,
      ...(n.hover?{'--hb':n.hover.fill,'--hc':n.hover.color,'--hs':n.hover.stroke,'--ho':n.hover.opacity,'--hm':n.hover.ms+'ms','--he':n.hover.ease}:{})
    } as CSSProperties;
    // Hover comes from a Figma "While hovering → Change to" variant; CSS vars carry the target state.
    // Entrance animations ride on CSS scroll timelines; they are skipped where unsupported or reduced motion is set.
    // Every top-level section eases in unless Figma chose a different entrance.
    const enter=n.enter||(n.parentId===null&&!inNav&&n!==nav?'fade':'');
    const className=[n.hover?'figma-hover':'',enter?'figma-enter figma-enter-'+enter:''].filter(Boolean).join(' ')||undefined;
    const hover={className,'data-hc':n.hover?.color?'':undefined,'data-hs':n.hover?.stroke?'':undefined};
    // Mixed text styles from Figma become inline spans over the plain text.
    const rich=(text:string)=>{
      if(!n.spans.length||text!==n.text)return text;
      const out:ReactNode[]=[];let at=0;
      for(const s of [...n.spans].sort((a,b)=>a.start-b.start)){
        if(s.start<at)continue;
        if(s.start>at)out.push(text.slice(at,s.start));
        out.push(<span key={s.start} style={{fontWeight:s.weight,color:s.color||undefined,fontSize:s.size?cq(s.size,frame):undefined,fontStyle:s.italic?'italic':undefined,textDecoration:s.underline?'underline':undefined}}>{text.slice(s.start,s.end)}</span>);
        at=s.end;
      }
      if(at<text.length)out.push(text.slice(at));
      return out;
    };
    const id=n.anchor?prefix+'-'+n.anchor:['tickets','schedule','speakers','sponsors','venueMap'].includes(n.binding??'')?prefix+'-'+n.binding:undefined;
    const value=n.binding&&n.binding in values?values[n.binding]:n.text;

    if(n.binding==='logo'||n.binding==='banner'){
      const src=n.binding==='logo'?data.logo:data.banner;
      return src
        ? <img key={n.id} src={src} alt={n.binding==='logo'?data.name+' logo':data.name+' banner'} style={{...style,objectFit:'cover'}}/>
        : <div key={n.id} style={style}>{nested}</div>;
    }

    // Slots are where PassFlow renders its live registration form or attendee pass inside a Figma page.
    // They grow with their content; the designer reserves the space in Figma.
    if(n.binding==='formSlot'||n.binding==='passSlot'){
      return <div key={n.id} id={id} className="figma-slot" style={{...style,height:'auto',minHeight:style.height,overflow:'visible',whiteSpace:'normal',textAlign:'left'}}>{slot??nested}</div>;
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
      const home=data.claimUrl.replace(/\/claim$/,'');
      const href=n.binding!=='customLink'?data.claimUrl
        :n.href.startsWith('#')?'#'+prefix+'-'+n.href.slice(1)
        :n.href==='page:home'?home:n.href==='page:ticket'?data.claimUrl
        :n.href.startsWith('page:')?home+'/'+n.href.slice(5):n.href;
      // Buttons designed in Figma keep their own layers; drafts from before v3 have none, so fall back to a label.
      const label=nested?.length?nested:n.binding==='register'&&!n.text
        ? data.ctaLabel
        : n.binding==='myPass'&&!n.text
          ? 'View my pass'
          : value;
      const external=n.binding==='customLink'&&n.href.startsWith('https:');
      return <a
        key={n.id}
        id={id}
        {...hover}
        href={preview?undefined:href}
        aria-disabled={preview}
        target={external&&!preview?'_blank':undefined}
        rel={external?'noopener noreferrer':undefined}
        style={nested?.length?style:{...style,display:'flex',alignItems:'center',justifyContent:n.align==='left'?'flex-start':n.align==='right'?'flex-end':'center'}}
      >
        {label}
      </a>;
    }

    if(n.type==='image')return n.image?<img key={n.id} {...hover} src={n.image} alt={n.text} loading="lazy" decoding="async" style={{...style,objectFit:'contain'}}/>:null;
    if((n.binding==='eventName'||n.id===headingId)&&!inNav)return <h1 key={n.id} id={id} {...hover} style={{...style,margin:0}}>{rich(value)}</h1>;
    return <div key={n.id} id={id} {...hover} style={style}>{n.type==='text'?rich(value):nested}</div>;
  }

  const hasSlot=!!slot&&frame.nodes.some(n=>n.binding==='formSlot'||n.binding==='passSlot');
  return <div className={'figma-live-frame'+(hasSlot?' has-slot':'')} style={{aspectRatio:frame.width+'/'+frame.height,background:frame.background}}>
    {nav&&<div className="figma-live-nav"><div style={{position:'relative',aspectRatio:frame.width+'/'+nav.height}}>{render(nav,nav.width,nav.height,true)}</div></div>}
    {(children.get(null)??[]).filter(n=>n!==nav).map(n=>render(n,frame.width,frame.height))}
  </div>;
}

// Each frame owns the widths it covers: desktop ≥1200, tablet 768–1199, mobile <768. Missing frames hand
// their range to the nearest one, so nothing renders twice.
function Responsive({desktop,tablet,mobile,fallback,data,preview,prefix,slot}:{desktop:WebsiteFrame;tablet:WebsiteFrame|null;mobile:WebsiteFrame|null;fallback?:ReactNode;data:WebsiteData;preview:boolean;prefix:string;slot?:ReactNode}){
  const coverMobile=!mobile&&!fallback;
  return <div className="figma-live-website">
    <FontLinks frames={[desktop,tablet,mobile]}/>
    <div className={'figma-live-desktop fw fw-d'+(tablet?'':' fw-t')+(coverMobile&&!tablet?' fw-m':'')}><Frame frame={desktop} data={data} preview={preview} prefix={prefix+'desktop'} slot={slot}/></div>
    {tablet&&<div className={'figma-live-tablet fw fw-t'+(coverMobile?' fw-m':'')}><Frame frame={tablet} data={data} preview={preview} prefix={prefix+'tablet'} slot={slot}/></div>}
    {mobile?<div className="figma-live-mobile fw fw-m"><Frame frame={mobile} data={data} preview={preview} prefix={prefix+'mobile'} slot={slot}/></div>:fallback&&<div className="figma-live-mobile figma-live-fallback fw fw-m">{fallback}</div>}
  </div>;
}

export function FigmaPageRenderer({page,data,preview=false,slot}:{page:WebsitePage;data:WebsiteData;preview?:boolean;slot?:ReactNode}){
  return <Responsive desktop={page.desktop} tablet={page.tablet} mobile={page.mobile} data={data} preview={preview} prefix={page.slug+'-'} slot={slot}/>;
}

export function FigmaWebsiteRenderer({document,data,preview=false}:{document:FigmaWebsite;data:WebsiteData;preview?:boolean}){
  return <Responsive desktop={document.desktop} tablet={document.tablet} mobile={document.mobile} data={data} preview={preview} prefix="" fallback={document.tablet?undefined:<>
    <h1>{data.name}</h1>
    <p>{data.description}</p>
    <p>{data.date} · {data.venue}</p>
    <a className="button button-dark" href={preview?undefined:data.claimUrl} aria-disabled={preview}>{data.ctaLabel}</a>
  </>}/>;
}
