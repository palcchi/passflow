export const websiteBindings=['eventName','eventDescription','eventDate','venue','venueMap','logo','banner','tickets','register','myPass','schedule','speakers','sponsors','customLink'] as const;
export type WebsiteBinding=typeof websiteBindings[number];
export type WebsiteNode={id:string;parentId:string|null;type:'text'|'box'|'image';x:number;y:number;width:number;height:number;text:string;fill:string;hasFill:boolean;color:string;fontSize:number;fontFamily:string;radius:number;align:'left'|'center'|'right';image:string;binding:WebsiteBinding|null;href:string;fontWeight:number;lineHeight:number;letterSpacing:number;opacity:number;stroke:string;strokeWidth:number;sticky:boolean;anchor:string;hover:WebsiteHover|null};
export type WebsiteHover={fill:string;color:string;stroke:string;opacity:number;ms:number;ease:string};
export type WebsiteFrame={width:number;height:number;background:string;nodes:WebsiteNode[]};
export type FigmaWebsite={schema:2|3;source:'figma';desktop:WebsiteFrame;mobile:WebsiteFrame|null;warnings:string[]};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const str=(v:unknown,max=3000)=>typeof v==='string'?v.slice(0,max):'';
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)?v:fallback;
const ease=(v:unknown)=>typeof v==='string'&&(/^(ease|ease-in|ease-out|ease-in-out|linear)$/.test(v)||/^cubic-bezier\((-?\d*\.?\d+,){3}-?\d*\.?\d+\)$/.test(v))?v:'ease-out';
function hover(raw:unknown):WebsiteHover|null{
 const h=obj(raw);if(!Object.keys(h).length)return null;
 return {fill:color(h.fill,'')||'transparent',color:color(h.color,''),stroke:color(h.stroke,''),opacity:num(h.opacity,0,1)?h.opacity as number:1,ms:num(h.ms,0,2000)?Math.round(h.ms as number):200,ease:ease(h.ease)};
}
export function websiteLink(v:unknown){if(typeof v!=='string'||v.length>=2000)return '';if(/^#[a-zA-Z][\w-]*$/.test(v))return v;if(!/^https:\/\/[^\s\\]+$/i.test(v))return '';try{const u=new URL(v);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password?v:'';}catch{return '';}}
function frame(raw:unknown,schema:2|3):WebsiteFrame|null{
 const f=obj(raw);if(!num(f.width,240,2400)||!num(f.height,100,30000)||!Array.isArray(f.nodes)||f.nodes.length>500)return null;
 const ids=new Set<string>(),nodes:WebsiteNode[]=[];
 for(const item of f.nodes){const n=obj(item),id=str(n.id,100);if(!id||ids.has(id)||!['text','box','image'].includes(String(n.type))||!num(n.x,-2400,2400)||!num(n.y,-30000,30000)||!num(n.width,1,4800)||!num(n.height,1,30000))return null;
  ids.add(id);const image=str(n.image,500000);if(image&&!/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(image))return null;
  const binding=websiteBindings.includes(n.binding as WebsiteBinding)?n.binding as WebsiteBinding:null,href=websiteLink(n.href);if(binding==='customLink'&&!href)return null;
  nodes.push({id,parentId:schema===3?str(n.parentId,100)||null:null,type:n.type as WebsiteNode['type'],x:n.x as number,y:n.y as number,width:n.width as number,height:n.height as number,text:str(n.text),fill:color(n.fill,'#ffffff'),hasFill:n.hasFill!==false,color:color(n.color,'#171717'),fontSize:num(n.fontSize,8,240)?n.fontSize as number:16,fontFamily:['Inter','Arial','Georgia','monospace'].includes(String(n.fontFamily))?String(n.fontFamily):'Arial',radius:num(n.radius,0,300)?n.radius as number:0,align:['left','center','right'].includes(String(n.align))?n.align as WebsiteNode['align']:'left',image,binding,href,fontWeight:num(n.fontWeight,100,900)?Math.round((n.fontWeight as number)/100)*100:400,lineHeight:num(n.lineHeight,0.7,3)?n.lineHeight as number:1.25,letterSpacing:num(n.letterSpacing,-20,40)?n.letterSpacing as number:0,opacity:num(n.opacity,0,1)?n.opacity as number:1,stroke:color(n.stroke,''),strokeWidth:num(n.strokeWidth,0,24)?n.strokeWidth as number:0,sticky:n.sticky===true&&!n.parentId,anchor:typeof n.anchor==='string'&&/^[a-zA-Z][\w-]{0,60}$/.test(n.anchor)?n.anchor:'',hover:hover(n.hover)});
 }
 if(schema===3){const byId=new Map(nodes.map(n=>[n.id,n]));for(const n of nodes){const seen=new Set([n.id]);let parent=n.parentId;while(parent){if(seen.has(parent)||!byId.has(parent))return null;seen.add(parent);parent=byId.get(parent)!.parentId;}}}
 return {width:f.width as number,height:f.height as number,background:color(f.background,'#ffffff'),nodes};
}
export function readFigmaWebsite(value:unknown):FigmaWebsite|null{const v=obj(value);if((v.schema!==2&&v.schema!==3)||v.source!=='figma')return null;const desktop=frame(v.desktop,v.schema),mobile=v.mobile?frame(v.mobile,v.schema):null;if(!desktop||(v.mobile&&!mobile)||JSON.stringify(value).length>850000)return null;return {schema:v.schema,source:'figma',desktop,mobile,warnings:Array.isArray(v.warnings)?v.warnings.slice(0,30).map(w=>str(w,300)):[]};}
export function validateFigmaWebsite(doc:FigmaWebsite){const errors:string[]=[];
 for(const [name,f] of [['Desktop',doc.desktop],['Mobile',doc.mobile]] as const){if(!f)continue;
  if(!f.nodes.some(n=>n.binding==='register'||n.binding==='tickets'))errors.push(name+' needs a registration action or ticket list.');
  for(const n of f.nodes){const parent=n.parentId?f.nodes.find(p=>p.id===n.parentId):null,w=parent?.width??f.width,h=parent?.height??f.height;if(n.x<0||n.y<0||n.x+n.width>w+1||n.y+n.height>h+1)errors.push(name+': a layer extends beyond its frame.');}
  for(const n of f.nodes)if(n.binding==='customLink'&&n.href.startsWith('#')&&!f.nodes.some(t=>'#'+t.anchor===n.href||['tickets','schedule','speakers','sponsors','venueMap'].includes(t.binding??'')&&'#'+t.binding===n.href))errors.push(name+': a link scrolls to a layer that is hidden or missing. Check its Scroll to target.');
  const byId=new Map(f.nodes.map(n=>[n.id,n])),inNav=(n:WebsiteNode)=>{let top=n;while(top.parentId&&byId.has(top.parentId))top=byId.get(top.parentId)!;return top.sticky;};
  for(const binding of ['eventName','tickets','schedule','speakers','sponsors','logo','banner'])if(f.nodes.filter(n=>n.binding===binding&&!(binding==='eventName'&&inNav(n))).length>1)errors.push(name+': '+binding+' is assigned more than once.');
  if(f.nodes.filter(n=>n.sticky).length>1)errors.push(name+': use one sticky navbar.');
 }
 return [...new Set(errors)];
}
