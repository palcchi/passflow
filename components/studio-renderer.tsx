/* eslint-disable @next/next/no-img-element */
import type { StudioDocument } from '@/lib/studio/model';
import { safeImage, studioFont } from '@/lib/studio/model';
export type StudioData = Record<string,string>;
export function PassRenderer({ document: d, data, qr, guide = false }: { document: StudioDocument; data: StudioData; qr: string; guide?: boolean }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${d.width} ${d.height}`} width="100%" role="img" aria-label="Event pass design" style={{ display:'block', aspectRatio:`${d.width}/${d.height}`, fontFamily: studioFont(d.font) }}>
    <rect width={d.width} height={d.height} fill={d.background}/>
    {d.layers.filter(l => !l.hidden).map(l => {
      const value = l.field === 'text' ? l.text : (data[l.field] ?? '');
      if (l.type === 'qr') return <image key={l.id} href={qr} x={l.x} y={l.y} width={l.width} height={l.height} preserveAspectRatio="xMidYMid meet"/>;
      if (l.type === 'shape') return <rect key={l.id} x={l.x} y={l.y} width={l.width} height={l.height} rx={l.radius} fill={l.fill}/>;
      if (l.type === 'image') return <image key={l.id} href={safeImage(['photo','logo'].includes(l.field) ? value : l.src)} x={l.x} y={l.y} width={l.width} height={l.height} preserveAspectRatio="xMidYMid meet"/>;
      let fontSize = l.fontSize;
      const wrap = (size:number) => {
        const capacity = Math.max(1,Math.floor(l.width/(size*.55)));
        const lines:string[]=[]; let line='';
        for(const word of value.split(/\s+/)){if(line&&(line+' '+word).length>capacity){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);
        return {lines,capacity,max:Math.max(1,Math.floor(l.height/(size*1.2)))};
      };
      let wrapped=wrap(fontSize);
      while(fontSize>1.5 && (wrapped.lines.length>wrapped.max || wrapped.lines.some(line=>line.length>wrapped.capacity))){fontSize=Math.max(1.5,fontSize-.2);wrapped=wrap(fontSize);}
      const {lines,max}=wrapped;
      return <svg key={l.id} x={l.x} y={l.y} width={l.width} height={l.height} overflow="hidden"><text fill={l.color} fontSize={fontSize} textAnchor={l.align === 'center' ? 'middle' : l.align === 'right' ? 'end' : 'start'}>{lines.slice(0,max).map((text,i) => <tspan key={i} x={l.align === 'center' ? l.width/2 : l.align === 'right' ? l.width : 0} y={fontSize+i*fontSize*1.2}>{text}</tspan>)}</text></svg>;
    })}
    {guide && <rect x={2} y={2} width={d.width-4} height={d.height-4} stroke="#888" strokeWidth=".2" strokeDasharray="1 1" fill="none" pointerEvents="none"/>}
  </svg>;
}
export function WebsiteRenderer({ document: d, data, claimUrl, preview = false }: { document: StudioDocument; data: StudioData; claimUrl: string; preview?: boolean }) {
  return <div className="studio-website" style={{background:d.background,color:d.foreground,fontFamily:studioFont(d.font)}}>
    {d.sections.filter(s => !s.hidden).map(s => <section key={s.id} className={`studio-section studio-section-${s.type}`}>
      {s.type === 'hero' && (s.image || data.banner) && <img src={safeImage(s.image || data.banner)} alt="Event banner" className="studio-banner"/>}
      {s.type === 'hero' && data.logo && <img src={safeImage(data.logo)} alt="Organizer logo" className="studio-logo"/>}
      {s.type === 'hero' ? <h1>{s.title || data.event_name}</h1> : <h2>{s.title}</h2>}
      <p style={{whiteSpace:'pre-wrap'}}>{s.body || (s.type === 'description' ? data.description : s.type === 'location' ? `${data.event_date}\n${data.venue}` : '')}</p>
      {s.type === 'gallery' && s.image && <img src={safeImage(s.image)} alt={s.title || 'Event gallery'} className="studio-banner"/>}
      {s.type === 'registration' && <a href={preview ? undefined : claimUrl} aria-disabled={preview} className="studio-cta" style={{background:d.accent,color:'#fff'}}>Register / open pass</a>}
    </section>)}
  </div>;
}
