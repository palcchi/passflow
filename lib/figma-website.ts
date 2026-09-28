export const websiteBindings = ['eventName','eventDescription','eventDate','venue','tickets','register','myPass','schedule','customLink'] as const;
export type WebsiteBinding = typeof websiteBindings[number];
export type WebsiteNode = { id:string; type:'text'|'box'|'image'; x:number;y:number;width:number;height:number;text:string;fill:string;color:string;fontSize:number;fontFamily:string;radius:number;align:'left'|'center'|'right';image:string;binding:WebsiteBinding|null;href:string };
export type WebsiteFrame = {width:number;height:number;background:string;nodes:WebsiteNode[]};
export type FigmaWebsite = {schema:2;source:'figma';desktop:WebsiteFrame;mobile:WebsiteFrame|null;warnings:string[]};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=3000)=>typeof v==='string'?v.slice(0,max):'';
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const color=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)?v:fallback;
export function websiteLink(v:unknown){
 if(typeof v!=='string'||v.length>=2000)return '';
 if(/^#[a-zA-Z][\w-]*$/.test(v))return v;
 if(!/^https:\/\/[^\s\\]+$/i.test(v))return '';
 try{const url=new URL(v);return url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password?v:'';}catch{return '';}
}
function frame(raw:unknown):WebsiteFrame|null {
  const f=object(raw);if(!number(f.width,240,2400)||!number(f.height,100,30000)||!Array.isArray(f.nodes)||f.nodes.length>500)return null;
  const ids=new Set<string>();const nodes:WebsiteNode[]=[];
  for(const rawNode of f.nodes){const n=object(rawNode);const id=text(n.id,100);
    if(!id||ids.has(id)||!['text','box','image'].includes(String(n.type))||!number(n.x,-2400,2400)||!number(n.y,-30000,30000)||!number(n.width,1,4800)||!number(n.height,1,30000))return null;
    ids.add(id);const image=text(n.image,500000);if(image&&!/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(image))return null;
    const binding=websiteBindings.includes(n.binding as WebsiteBinding)?n.binding as WebsiteBinding:null;
    const href=websiteLink(n.href);if(binding==='customLink'&&!href)return null;
    nodes.push({id,type:n.type as WebsiteNode['type'],x:n.x as number,y:n.y as number,width:n.width as number,height:n.height as number,text:text(n.text),fill:color(n.fill,'#ffffff'),color:color(n.color,'#171717'),fontSize:number(n.fontSize,8,240)?n.fontSize as number:16,fontFamily:['Inter','Arial','Georgia','monospace'].includes(String(n.fontFamily))?String(n.fontFamily):'Arial',radius:number(n.radius,0,300)?n.radius as number:0,align:['left','center','right'].includes(String(n.align))?n.align as WebsiteNode['align']:'left',image,binding,href});
  }
  return {width:f.width as number,height:f.height as number,background:color(f.background,'#ffffff'),nodes};
}
export function readFigmaWebsite(value:unknown):FigmaWebsite|null {
  const v=object(value);if(v.schema!==2||v.source!=='figma')return null;
  const desktop=frame(v.desktop),mobile=v.mobile?frame(v.mobile):null;
  if(!desktop||(v.mobile&&!mobile)||JSON.stringify(value).length>850000)return null;
  return {schema:2,source:'figma',desktop,mobile,warnings:Array.isArray(v.warnings)?v.warnings.slice(0,30).map(w=>text(w,300)):[]};
}
export function validateFigmaWebsite(doc:FigmaWebsite){
  const errors:string[]=[];
  for(const [name,f] of [['Desktop',doc.desktop],['Mobile',doc.mobile]] as const){if(!f)continue;
    if(!f.nodes.some(n=>n.binding==='register'||n.binding==='tickets'))errors.push(`${name} needs a registration action or ticket list.`);
    for(const n of f.nodes)if(n.x<0||n.y<0||n.x+n.width>f.width+1||n.y+n.height>f.height+1)errors.push(`${name}: a layer extends beyond the frame.`);
    for(const n of f.nodes)if(n.binding==='customLink'&&n.href.startsWith('#')&&!f.nodes.some(target=>(target.binding==='tickets'||target.binding==='schedule')&&'#'+target.binding===n.href))errors.push(`${name}: link ${n.href} needs a matching Tickets or Schedule binding.`);
  }
  return [...new Set(errors)];
}
