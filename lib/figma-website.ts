export const websiteBindings=['eventName','eventDescription','eventDate','venue','venueMap','logo','banner','tickets','register','myPass','schedule','speakers','sponsors','customLink'] as const;
export type WebsiteBinding=typeof websiteBindings[number];
export type WebsiteHover={fill:string;color:string;stroke:string;opacity:number;ms:number;ease:string};
export type WebsiteGradient={type:'linear'|'radial';angle:number;stops:{color:string;pos:number}[]};
export type WebsiteShadow={x:number;y:number;blur:number;spread:number;color:string;inset:boolean};
export type WebsiteSpan={start:number;end:number;weight:number;color:string;size:number;italic:boolean;underline:boolean};
export type WebsiteEnter=''|'fade'|'up'|'scale';
export type WebsiteNode={id:string;parentId:string|null;type:'text'|'box'|'image';x:number;y:number;width:number;height:number;text:string;fill:string;hasFill:boolean;color:string;fontSize:number;fontFamily:string;radius:number;align:'left'|'center'|'right';image:string;binding:WebsiteBinding|null;href:string;fontWeight:number;lineHeight:number;letterSpacing:number;opacity:number;stroke:string;strokeWidth:number;sticky:boolean;anchor:string;hover:WebsiteHover|null;
 italic:boolean;bg:{image:string;fit:'cover'|'contain'|'fill'}|null;gradient:WebsiteGradient|null;shadows:WebsiteShadow[];spans:WebsiteSpan[];enter:WebsiteEnter};
export type WebsiteFrame={width:number;height:number;background:string;nodes:WebsiteNode[]};
export type WebsitePage={slug:string;desktop:WebsiteFrame;tablet:WebsiteFrame|null;mobile:WebsiteFrame|null};
export type FigmaWebsite={schema:2|3;source:'figma';desktop:WebsiteFrame;tablet:WebsiteFrame|null;mobile:WebsiteFrame|null;pages:WebsitePage[];warnings:string[]};
// "ticket" is the header of /e/[slug]/claim; other slugs become /e/[slug]/[page]. Route names stay reserved.
const reservedPages=['home','claim','calendar','opengraph-image','admin','api','e'];
export const pageSlugValid=(v:unknown):v is string=>typeof v==='string'&&/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(v)&&!reservedPages.includes(v);
// Images live in the public event-assets bucket after sync; older drafts may still carry inline data URIs.
export const figmaAssetUrl=(v:string)=>/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/event-assets\/[\w\-./]+\.(png|jpe?g|webp)$/i.test(v);
const dataImage=(v:string)=>/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(v);
export const fontFamilyValid=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9 \-]{0,39}$/.test(v);
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const str=(v:unknown,max=3000)=>typeof v==='string'?v.slice(0,max):'';
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[\da-f]{6}([\da-f]{2})?$/i.test(v)?v:fallback;
const ease=(v:unknown)=>typeof v==='string'&&(/^(ease|ease-in|ease-out|ease-in-out|linear)$/.test(v)||/^cubic-bezier\((-?\d*\.?\d+,){3}-?\d*\.?\d+\)$/.test(v))?v:'ease-out';
const image=(v:unknown)=>{const s=str(v,500000);return s&&(dataImage(s)||figmaAssetUrl(s))?s:null;};
function hover(raw:unknown):WebsiteHover|null{
 const h=obj(raw);if(!Object.keys(h).length)return null;
 return {fill:color(h.fill,'')||'transparent',color:color(h.color,''),stroke:color(h.stroke,''),opacity:num(h.opacity,0,1)?h.opacity as number:1,ms:num(h.ms,0,2000)?Math.round(h.ms as number):200,ease:ease(h.ease)};
}
function gradient(raw:unknown):WebsiteGradient|null{
 const g=obj(raw);if(!Array.isArray(g.stops)||g.stops.length<2)return null;
 const stops=g.stops.slice(0,8).map(s=>{const o=obj(s);return {color:color(o.color,''),pos:num(o.pos,0,1)?o.pos as number:0};}).filter(s=>s.color);
 return stops.length>=2?{type:g.type==='radial'?'radial':'linear',angle:num(g.angle,-720,720)?g.angle as number:180,stops}:null;
}
function shadows(raw:unknown):WebsiteShadow[]{
 return Array.isArray(raw)?raw.slice(0,4).flatMap(s=>{const o=obj(s),c=color(o.color,'');return c&&num(o.x,-500,500)&&num(o.y,-500,500)&&num(o.blur,0,500)?[{x:o.x as number,y:o.y as number,blur:o.blur as number,spread:num(o.spread,-500,500)?o.spread as number:0,color:c,inset:o.inset===true}]:[];}):[];
}
function spans(raw:unknown,length:number):WebsiteSpan[]{
 return Array.isArray(raw)?raw.slice(0,80).flatMap(s=>{const o=obj(s);return Number.isInteger(o.start)&&Number.isInteger(o.end)&&(o.start as number)>=0&&(o.end as number)>(o.start as number)&&(o.end as number)<=length?[{start:o.start as number,end:o.end as number,weight:num(o.weight,100,900)?Math.round((o.weight as number)/100)*100:400,color:color(o.color,''),size:num(o.size,4,400)?o.size as number:0,italic:o.italic===true,underline:o.underline===true}]:[];}):[];
}
export function websiteLink(v:unknown){if(typeof v!=='string'||v.length>=2000)return '';if(/^#[a-zA-Z][\w-]*$/.test(v))return v;if(/^page:/.test(v))return v==='page:home'||pageSlugValid(v.slice(5))?v:'';if(!/^https:\/\/[^\s\\]+$/i.test(v))return '';try{const u=new URL(v);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password?v:'';}catch{return '';}}
function frame(raw:unknown,schema:2|3):WebsiteFrame|null{
 const f=obj(raw);if(!num(f.width,240,2400)||!num(f.height,100,30000)||!Array.isArray(f.nodes)||f.nodes.length>500)return null;
 const ids=new Set<string>(),nodes:WebsiteNode[]=[];
 for(const item of f.nodes){const n=obj(item),id=str(n.id,100);if(!id||ids.has(id)||!['text','box','image'].includes(String(n.type))||!num(n.x,-2400,2400)||!num(n.y,-30000,30000)||!num(n.width,1,4800)||!num(n.height,1,30000))return null;
  ids.add(id);const img=n.image?image(n.image):'';if(img===null)return null;
  const bgRaw=obj(n.bg),bgImage=bgRaw.image?image(bgRaw.image):'';if(bgImage===null)return null;
  const binding=websiteBindings.includes(n.binding as WebsiteBinding)?n.binding as WebsiteBinding:null,href=websiteLink(n.href);if(binding==='customLink'&&!href)return null;
  const text=str(n.text);
  nodes.push({id,parentId:schema===3?str(n.parentId,100)||null:null,type:n.type as WebsiteNode['type'],x:n.x as number,y:n.y as number,width:n.width as number,height:n.height as number,text,fill:color(n.fill,'#ffffff'),hasFill:n.hasFill!==false,color:color(n.color,'#171717'),fontSize:num(n.fontSize,4,400)?n.fontSize as number:16,fontFamily:fontFamilyValid(n.fontFamily)?n.fontFamily:'Inter',radius:num(n.radius,0,1e6)?Math.min(n.radius as number,1000):0,align:['left','center','right'].includes(String(n.align))?n.align as WebsiteNode['align']:'left',image:img,binding,href,fontWeight:num(n.fontWeight,100,900)?Math.round((n.fontWeight as number)/100)*100:400,lineHeight:num(n.lineHeight,0.7,3)?n.lineHeight as number:1.25,letterSpacing:num(n.letterSpacing,-20,40)?n.letterSpacing as number:0,opacity:num(n.opacity,0,1)?n.opacity as number:1,stroke:color(n.stroke,''),strokeWidth:num(n.strokeWidth,0,24)?n.strokeWidth as number:0,sticky:n.sticky===true&&!n.parentId,anchor:typeof n.anchor==='string'&&/^[a-zA-Z][\w-]{0,60}$/.test(n.anchor)?n.anchor:'',hover:hover(n.hover),
   italic:n.italic===true,bg:bgImage?{image:bgImage,fit:['cover','contain','fill'].includes(String(bgRaw.fit))?bgRaw.fit as 'cover'|'contain'|'fill':'cover'}:null,gradient:gradient(n.gradient),shadows:shadows(n.shadows),spans:spans(n.spans,text.length),enter:['fade','up','scale'].includes(String(n.enter))?n.enter as WebsiteEnter:''});
 }
 if(schema===3){const byId=new Map(nodes.map(n=>[n.id,n]));for(const n of nodes){const seen=new Set([n.id]);let parent=n.parentId;while(parent){if(seen.has(parent)||!byId.has(parent))return null;seen.add(parent);parent=byId.get(parent)!.parentId;}}}
 return {width:f.width as number,height:f.height as number,background:color(f.background,'#ffffff'),nodes};
}
const optional=(raw:unknown,schema:2|3)=>raw?frame(raw,schema)??undefined:null;
export function readFigmaWebsite(value:unknown):FigmaWebsite|null{
 const v=obj(value);if((v.schema!==2&&v.schema!==3)||v.source!=='figma')return null;
 const desktop=frame(v.desktop,v.schema),tablet=optional(v.tablet,v.schema),mobile=optional(v.mobile,v.schema);
 if(!desktop||tablet===undefined||mobile===undefined||JSON.stringify(value).length>850000)return null;
 const rawPages=Array.isArray(v.pages)?v.pages:[];if(rawPages.length>8)return null;
 const pages:WebsitePage[]=[];
 for(const raw of rawPages){const p=obj(raw),d=frame(p.desktop,v.schema),t=optional(p.tablet,v.schema),m=optional(p.mobile,v.schema);if(!pageSlugValid(p.slug)||pages.some(x=>x.slug===p.slug)||!d||t===undefined||m===undefined)return null;pages.push({slug:p.slug,desktop:d,tablet:t,mobile:m});}
 return {schema:v.schema,source:'figma',desktop,tablet,mobile,pages,warnings:Array.isArray(v.warnings)?v.warnings.slice(0,30).map(w=>str(w,300)):[]};
}
// Issues carry the Figma node and frame so the plugin can select the exact layer. Only blocking ones stop a sync going live;
// the rest render fine (layers clip, broken links do nothing) and come back as warnings.
export type DesignIssue={message:string;frame?:string;nodeId?:string;blocking:boolean};
export function figmaWebsiteIssues(doc:FigmaWebsite):DesignIssue[]{const out:DesignIssue[]=[];
 const add=(frame:string,message:string,blocking:boolean,nodeId?:string)=>{if(!out.some(i=>i.frame===frame&&i.message===message))out.push({frame,message,blocking,nodeId});};
 const pageNames=new Set(['home','ticket',...doc.pages.map(p=>p.slug)]);
 const frames:[string,WebsiteFrame|null,boolean][]=[['Desktop',doc.desktop,true],['Tablet',doc.tablet,true],['Mobile',doc.mobile,true],...doc.pages.flatMap(p=>[[p.slug+' page (Desktop)',p.desktop,false],[p.slug+' page (Tablet)',p.tablet,false],[p.slug+' page (Mobile)',p.mobile,false]] as [string,WebsiteFrame|null,boolean][])];
 for(const [name,f,home] of frames){if(!f)continue;
  if(home&&!f.nodes.some(n=>n.binding==='register'||n.binding==='tickets'))add(name,'Mark a button as Register, or add the live ticket list (plugin → Advanced).',true);
  for(const n of f.nodes)if(n.href.startsWith('page:')&&!pageNames.has(n.href.slice(5)))add(name,'This link opens a page that is not synced ('+n.href.slice(5)+').',false,n.id);
  for(const n of f.nodes){const parent=n.parentId?f.nodes.find(p=>p.id===n.parentId):null,w=parent?.width??f.width,h=parent?.height??f.height;if(n.x<0||n.y<0||n.x+n.width>w+1||n.y+n.height>h+1)add(name,'This layer sticks out of its frame and will be cut off.',false,n.id);}
  for(const n of f.nodes)if(n.binding==='customLink'&&n.href.startsWith('#')&&!f.nodes.some(t=>'#'+t.anchor===n.href||['tickets','schedule','speakers','sponsors','venueMap'].includes(t.binding??'')&&'#'+t.binding===n.href))add(name,'This link scrolls to a layer that is hidden or missing. Check its Scroll to target.',false,n.id);
  const byId=new Map(f.nodes.map(n=>[n.id,n])),inNav=(n:WebsiteNode)=>{let top=n;while(top.parentId&&byId.has(top.parentId))top=byId.get(top.parentId)!;return top.sticky;};
  for(const binding of ['eventName','tickets','schedule','speakers','sponsors','logo','banner']){const dup=f.nodes.filter(n=>n.binding===binding&&!(binding==='eventName'&&inNav(n)));if(dup.length>1)add(name,binding+' is assigned more than once; only the first is used.',false,dup[1].id);}
  const sticky=f.nodes.filter(n=>n.sticky);if(sticky.length>1)add(name,'Use one sticky navbar.',false,sticky[1].id);
 }
 return out;
}
export function validateFigmaWebsite(doc:FigmaWebsite){return figmaWebsiteIssues(doc).filter(i=>i.blocking).map(i=>i.frame+': '+i.message);}
