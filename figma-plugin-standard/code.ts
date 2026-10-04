const ORIGIN='https://passflow.my.id';
const NS='passflow';
const SCHEMA='passflow.website.v1';

type Binding='eventName'|'eventDescription'|'eventDate'|'venue'|'venueMap'|'logo'|'banner'|'tickets'|'register'|'myPass'|'schedule'|'speakers'|'sponsors'|'customLink';
type FrameRole='desktop'|'mobile';
type TemplateStyle='minimal'|'editorial'|'festival';
type Session={token:string;documentId:string;eventId:string;eventName:string;revision:number;draftId?:string};
type NodeOutput={id:string;parentId:string|null;type:'text'|'box'|'image';x:number;y:number;width:number;height:number;text:string;fill:string;hasFill:boolean;color:string;fontSize:number;fontFamily:string;radius:number;align:'left'|'center'|'right';image:string;binding:Binding|null;href:string;fontWeight:number;lineHeight:number;letterSpacing:number;opacity:number;stroke:string;strokeWidth:number;sticky:boolean};
type FrameOutput={width:number;height:number;background:string;nodes:NodeOutput[]};
type Message=
  |{type:'pair';code:string}
  |{type:'template';style:TemplateStyle}
  |{type:'block';block:string;style:TemplateStyle}
  |{type:'assign';binding:Binding;href:string}
  |{type:'frame';role:FrameRole}
  |{type:'sync'|'disconnect'|'reload'|'confirm'};

const bindings:Binding[]=['eventName','eventDescription','eventDate','venue','venueMap','logo','banner','tickets','register','myPass','schedule','speakers','sponsors','customLink'];
const blocks=['Navbar','Hero','About','Tickets','Schedule','Speakers','Sponsors','Venue','FAQ','CTA','Footer'];
let session:Session|null=null;
let mutating=false,syncing=false,dirty=false,blocked=false,confirmed=false,commandPending=false;
let timer:ReturnType<typeof setTimeout>|null=null;

let documentId=figma.root.getSharedPluginData(NS,'documentId');
if(!documentId){
  documentId='doc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
  figma.root.setSharedPluginData(NS,'documentId',documentId);
}
const storageKey='passflow.session.v2.'+documentId;

function status(state:string,message=''){
  figma.ui.postMessage({type:'status',state,message,eventName:session?.eventName??'',draftId:session?.draftId,eventId:session?.eventId});
}
function selectionState(){
  const selected=figma.currentPage.selection;
  const node=selected.length===1?selected[0]:null;
  figma.ui.postMessage({
    type:'selection',
    single:!!node,
    frame:!!node&&node.type==='FRAME'&&node.parent===figma.currentPage,
    name:node?.name??'Nothing selected',
    binding:node?.getSharedPluginData(NS,'binding')??'',
    frameRole:node?.getSharedPluginData(NS,'frame')??''
  });
}
function solid(hex:string):SolidPaint{
  return {type:'SOLID',color:{r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255}};
}
function hex(paints:ReadonlyArray<Paint>|typeof figma.mixed|undefined,fallback='#ffffff'){
  const p=Array.isArray(paints)?paints.find(p=>p.type==='SOLID'&&p.visible!==false):null;
  return p?.type==='SOLID'?'#'+[p.color.r,p.color.g,p.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''):fallback;
}
function bind(node:SceneNode,binding:Binding,href=''){
  node.setSharedPluginData(NS,'binding',binding);
  node.setSharedPluginData(NS,'href',href);
  node.setSharedPluginData(NS,'schema',SCHEMA);
  if(!node.getSharedPluginData(NS,'id'))node.setSharedPluginData(NS,'id',node.id);
}

// ---------- Templates: three distinct styles, one structure ----------
type Theme={bg:string;surface:string;alt:string;ink:string;muted:string;accent:string;accentInk:string;kicker:string;line:string;radius:number;buttonRadius:number;display:FontName;body:FontName;bodyMedium:FontName;bodyBold:FontName;upper:boolean;tracking:number;heroSize:[number,number];stickers:string[]};
const inter=(style:string):FontName=>({family:'Inter',style});
async function font(wanted:FontName,fallback:FontName){
  try{await figma.loadFontAsync(wanted);return wanted;}catch{await figma.loadFontAsync(fallback);return fallback;}
}
async function theme(style:TemplateStyle):Promise<Theme>{
  const body=await font(inter('Regular'),inter('Regular')),bodyMedium=await font(inter('Medium'),body),bodyBold=await font(inter('Semi Bold'),body);
  if(style==='editorial')return {bg:'#f4f1ea',surface:'#fbf9f4',alt:'#ebe6da',ink:'#1c1b18',muted:'#6f6a5f',accent:'#1f3a5f',accentInk:'#ffffff',kicker:'#a4482f',line:'#d6cebd',radius:8,buttonRadius:6,
    display:await font({family:'Playfair Display',style:'Regular'},inter('Light')),body,bodyMedium,bodyBold,upper:false,tracking:-1,heroSize:[96,46],stickers:['#e2553f','#f2b544']};
  if(style==='festival')return {bg:'#0f0f10',surface:'#1c1c1f',alt:'#161618',ink:'#f6f5f0',muted:'#a3a29b',accent:'#ff5c35',accentInk:'#0f0f10',kicker:'#c6f432',line:'#2e2e33',radius:28,buttonRadius:999,
    display:await font(inter('Black'),inter('Bold')),body,bodyMedium,bodyBold,upper:true,tracking:-3,heroSize:[132,54],stickers:['#ff5c35','#c6f432','#7c5cff']};
  return {bg:'#ffffff',surface:'#ffffff',alt:'#f5f5f3',ink:'#242421',muted:'#74736d',accent:'#242421',accentInk:'#ffffff',kicker:'#74736d',line:'#e6e5df',radius:24,buttonRadius:999,
    display:await font(inter('Bold'),bodyBold),body,bodyMedium,bodyBold,upper:false,tracking:-3,heroSize:[96,46],stickers:['#ff6b4a','#4f7cff','#ffc93c']};
}
function box(name:string,dir:'HORIZONTAL'|'VERTICAL',o:{fill?:string;gap?:number;pad?:[number,number];radius?:number;stroke?:string;align?:'MIN'|'CENTER'|'MAX'|'SPACE_BETWEEN';cross?:'MIN'|'CENTER'|'MAX'}={}){
  const f=figma.createFrame();
  f.name=name;f.layoutMode=dir;f.primaryAxisSizingMode='AUTO';f.counterAxisSizingMode='AUTO';
  f.itemSpacing=o.gap??0;
  const [py,px]=o.pad??[0,0];f.paddingTop=py;f.paddingBottom=py;f.paddingLeft=px;f.paddingRight=px;
  f.fills=o.fill?[solid(o.fill)]:[];f.cornerRadius=o.radius??0;
  if(o.stroke){f.strokes=[solid(o.stroke)];f.strokeWeight=1;}
  f.primaryAxisAlignItems=o.align??'MIN';f.counterAxisAlignItems=o.cross??'MIN';
  f.clipsContent=false;
  return f;
}
// Fill the parent's width; `width` keeps the starting geometry sensible before Figma reflows.
function fillW(node:FrameNode|TextNode,width:number){
  node.resize(Math.max(1,width),Math.max(1,node.height));
  node.layoutSizingHorizontal='FILL';
  if(node.type==='FRAME')node.layoutSizingVertical='HUG';else node.textAutoResize='HEIGHT';
}
function fixW(node:FrameNode|TextNode,width:number){
  node.resize(Math.max(1,width),Math.max(1,node.height));
  node.layoutSizingHorizontal='FIXED';
  if(node.type==='FRAME')node.layoutSizingVertical='HUG';else node.textAutoResize='HEIGHT';
}
function txt(parent:FrameNode,chars:string,o:{size:number;font:FontName;color:string;lh?:number;ls?:number;align?:'LEFT'|'CENTER'|'RIGHT';binding?:Binding;href?:string;opacity?:number}){
  const n=figma.createText();
  n.fontName=o.font;n.characters=chars;n.fontSize=o.size;n.fills=[solid(o.color)];
  if(o.lh)n.lineHeight={unit:'PERCENT',value:o.lh*100};
  if(o.ls)n.letterSpacing={unit:'PERCENT',value:o.ls};
  if(o.align)n.textAlignHorizontal=o.align;
  if(o.opacity!==undefined)n.opacity=o.opacity;
  parent.appendChild(n);
  n.textAutoResize='WIDTH_AND_HEIGHT';
  if(o.binding)bind(n,o.binding,o.href);
  return n;
}
function button(parent:FrameNode,t:Theme,label:string,kind:'primary'|'secondary'|'inverse',binding:Binding,href:string,size:number){
  const fill=kind==='primary'?t.accent:kind==='inverse'?t.accentInk:undefined;
  const ink=kind==='primary'?t.accentInk:kind==='inverse'?t.accent:t.ink;
  const b=box(label,'HORIZONTAL',{fill,stroke:kind==='secondary'?t.ink:undefined,pad:[Math.round(size*0.85),Math.round(size*1.5)],radius:t.buttonRadius,align:'CENTER',cross:'CENTER'});
  parent.appendChild(b);
  txt(b,label,{size,font:t.bodyBold,color:ink});
  bind(b,binding,href);
  return b;
}
function chip(parent:FrameNode,t:Theme,label:string,binding:Binding,fill:string,ink:string){
  const c=box(label,'HORIZONTAL',{fill,stroke:fill===t.bg?t.line:undefined,pad:[9,16],radius:t.buttonRadius,cross:'CENTER'});
  parent.appendChild(c);
  txt(c,label,{size:14,font:t.bodyMedium,color:ink,binding});
  return c;
}
function sticker(parent:FrameNode,kind:'circle'|'star',color:string,size:number,x:number,y:number){
  const s=kind==='star'?figma.createStar():figma.createEllipse();
  s.name='Sticker';parent.appendChild(s);s.layoutPositioning='ABSOLUTE';
  s.resize(size,size);s.x=x;s.y=y;s.fills=[solid(color)];
}
function kicker(parent:FrameNode,t:Theme,label:string){
  return txt(parent,label.toUpperCase(),{size:13,font:t.bodyBold,color:t.kicker,ls:12});
}
function heading(parent:FrameNode,t:Theme,label:string,mobile:boolean,width:number){
  const h=txt(parent,t.upper?label.toUpperCase():label,{size:mobile?34:56,font:t.display,color:t.ink,lh:1.04,ls:t.tracking});
  fillW(h,width);return h;
}
function card(parent:FrameNode,t:Theme,name:string,width:number,dir:'HORIZONTAL'|'VERTICAL'='VERTICAL'){
  const c=box(name,dir,{fill:t.surface,stroke:t.line,gap:dir==='VERTICAL'?10:16,pad:[22,24],radius:t.radius,align:dir==='HORIZONTAL'?'SPACE_BETWEEN':'MIN',cross:dir==='HORIZONTAL'?'CENTER':'MIN'});
  parent.appendChild(c);fillW(c,width);return c;
}
async function block(parent:FrameNode,name:string,style:TemplateStyle){
  const t=await theme(style),w=parent.width,mobile=w<600,pad=mobile?24:96,cw=w-pad*2,D=(s:string)=>t.upper?s.toUpperCase():s;

  if(name==='Navbar'){
    const nav=box('Navbar','HORIZONTAL',{fill:t.bg,pad:[mobile?12:16,pad],align:'SPACE_BETWEEN',cross:'CENTER'});
    parent.insertChild(0,nav);fillW(nav,w);
    nav.setSharedPluginData(NS,'sticky','true');nav.setSharedPluginData(NS,'block','navbar');nav.setSharedPluginData(NS,'schema',SCHEMA);
    txt(nav,'Event name',{size:mobile?16:18,font:t.bodyBold,color:t.ink,binding:'eventName'});
    if(!mobile){
      const links=box('Links','HORIZONTAL',{gap:32,cross:'CENTER'});nav.appendChild(links);
      for(const [label,target] of [['Tickets','tickets'],['Schedule','schedule'],['Speakers','speakers'],['Venue','venueMap']])txt(links,label,{size:15,font:t.bodyMedium,color:t.muted,binding:'customLink',href:'#'+target});
    }
    button(nav,t,'Register','primary','register','',mobile?13:14);
    return;
  }

  const fill=['Tickets','Speakers','Venue','Footer'].includes(name)?t.alt:t.bg;
  const py=name==='Footer'?(mobile?28:40):name==='Hero'?(mobile?56:128):(mobile?64:112);
  const sec=box(name,'VERTICAL',{fill,gap:mobile?18:26,pad:[py,pad]});
  parent.appendChild(sec);fillW(sec,w);
  sec.setSharedPluginData(NS,'block',name.toLowerCase());sec.setSharedPluginData(NS,'schema',SCHEMA);

  if(name==='Hero'){
    const center=style==='minimal',align=center?'CENTER':'LEFT';
    if(center)sec.counterAxisAlignItems='CENTER';
    const meta=box('Event details','HORIZONTAL',{gap:10,cross:'CENTER'});sec.appendChild(meta);
    chip(meta,t,'27 September 2026','eventDate',style==='festival'?t.accent:t.bg,style==='festival'?t.accentInk:t.ink);
    chip(meta,t,'Event venue','venue',style==='festival'?t.kicker:t.bg,style==='festival'?t.accentInk:t.ink);
    const title=txt(sec,D('Your event starts here'),{size:t.heroSize[mobile?1:0],font:t.display,color:t.ink,lh:style==='editorial'?1.02:0.94,ls:t.tracking,align,binding:'eventName'});
    fillW(title,cw);
    const desc=txt(sec,'A purposeful gathering. A space for new ideas, new people and a day worth remembering.',{size:mobile?17:22,font:t.body,color:t.muted,lh:1.5,align,binding:'eventDescription'});
    if(mobile)fillW(desc,cw);else fixW(desc,640);
    const actions=box('Actions','HORIZONTAL',{gap:12,cross:'CENTER'});sec.appendChild(actions);
    button(actions,t,'Register now','primary','register','',mobile?15:17);
    button(actions,t,'See schedule','secondary','customLink','#schedule',mobile?15:17);
    if(!mobile||style==='festival'){
      const size=mobile?34:60;
      t.stickers.forEach((c,i)=>sticker(sec,i===1?'star':'circle',c,Math.round(size*(i?0.7:1)),w-pad-size*(1+i*1.25),(mobile?20:64)+i*Math.round(size*0.55)));
    }
    return;
  }
  if(name==='About'){
    kicker(sec,t,'About');
    const row=box('About row',mobile?'VERTICAL':'HORIZONTAL',{gap:mobile?14:80});sec.appendChild(row);fillW(row,cw);
    const h=txt(row,D('Why this gathering matters'),{size:mobile?32:48,font:t.display,color:t.ink,lh:1.05,ls:t.tracking});
    const p=txt(row,'Tell people what they will experience, who it is for and why it is worth showing up. Edit this text freely in Figma.',{size:mobile?17:21,font:t.body,color:t.muted,lh:1.55});
    if(mobile){fillW(h,cw);fillW(p,cw);}else{fixW(h,440);fillW(p,cw-520);}
    return;
  }
  if(name==='Tickets'||name==='Schedule'){
    const tickets=name==='Tickets';
    kicker(sec,t,tickets?'Tickets':'Schedule');heading(sec,t,tickets?'Choose your pass':'How the day unfolds',mobile,cw);
    const list=box(tickets?'Live tickets':'Live schedule','VERTICAL',{gap:10});sec.appendChild(list);fillW(list,cw);bind(list,tickets?'tickets':'schedule');
    const rows=tickets?[['Early bird','IDR 150,000'],['Regular','IDR 250,000'],['VIP','IDR 500,000']]:[['09:00','Doors open'],['10:00','Opening keynote'],['13:00','Sessions and workshops']];
    for(const [a,b] of rows){
      const c=card(list,t,a,cw,'HORIZONTAL');
      txt(c,tickets?a:b,{size:mobile?16:18,font:t.bodyBold,color:t.ink});
      txt(c,tickets?b:a,{size:mobile?15:16,font:t.body,color:t.muted});
    }
    return;
  }
  if(name==='Speakers'){
    kicker(sec,t,'Speakers');heading(sec,t,'Voices you will hear',mobile,cw);
    const grid=box('Speaker grid',mobile?'VERTICAL':'HORIZONTAL',{gap:16});sec.appendChild(grid);fillW(grid,cw);bind(grid,'speakers');
    const cardW=mobile?cw:(cw-32)/3;
    for(let i=0;i<3;i++){
      const c=card(grid,t,'Speaker '+(i+1),cardW);
      const avatar=figma.createEllipse();c.appendChild(avatar);avatar.resize(64,64);avatar.fills=[solid(t.stickers[i%t.stickers.length])];
      txt(c,'Speaker name',{size:19,font:t.bodyBold,color:t.ink});
      txt(c,'Role · Company',{size:15,font:t.body,color:t.muted});
    }
    return;
  }
  if(name==='Sponsors'){
    kicker(sec,t,'Partners');heading(sec,t,'Supported by',mobile,cw);
    const row=box('Sponsor logos','HORIZONTAL',{gap:12});sec.appendChild(row);fillW(row,cw);bind(row,'sponsors');
    const n=mobile?3:4,tileW=(cw-12*(n-1))/n;
    for(let i=0;i<n;i++){const c=card(row,t,'Sponsor '+(i+1),tileW);txt(c,'Logo',{size:15,font:t.bodyMedium,color:t.muted});}
    return;
  }
  if(name==='Venue'){
    const row=box('Venue row',mobile?'VERTICAL':'HORIZONTAL',{gap:mobile?20:48});sec.appendChild(row);fillW(row,cw);
    const left=box('Venue details','VERTICAL',{gap:14});row.appendChild(left);
    const leftW=mobile?cw:440;if(mobile)fillW(left,cw);else fixW(left,leftW);
    kicker(left,t,'Venue');
    const h=txt(left,D('Getting there'),{size:mobile?34:56,font:t.display,color:t.ink,lh:1.04,ls:t.tracking});fillW(h,leftW);
    const v=txt(left,'Event venue',{size:mobile?19:22,font:t.bodyBold,color:t.ink,binding:'venue'});fillW(v,leftW);
    const note=txt(left,'Arrival details, entrances and accessibility notes can live here.',{size:16,font:t.body,color:t.muted,lh:1.5});fillW(note,leftW);
    const map=box('Venue map','VERTICAL',{fill:t.surface,stroke:t.line,radius:t.radius,align:'CENTER',cross:'CENTER'});row.appendChild(map);
    map.resize(mobile?cw:cw-leftW-48,mobile?220:320);map.layoutSizingHorizontal='FILL';map.layoutSizingVertical='FIXED';bind(map,'venueMap');
    txt(map,'Open in Maps',{size:16,font:t.bodyBold,color:t.ink});
    return;
  }
  if(name==='FAQ'){
    kicker(sec,t,'FAQ');heading(sec,t,'Good to know',mobile,cw);
    for(const [q,a] of [['What should I bring?','Your event pass, ready on your phone.'],['Where do I enter?','Use the gate shown in your attendee instructions.'],['Can I transfer my ticket?','Contact the organizer before the event day.']]){
      const c=card(sec,t,q,cw);
      fillW(txt(c,q,{size:mobile?17:19,font:t.bodyBold,color:t.ink}),cw-48);
      fillW(txt(c,a,{size:16,font:t.body,color:t.muted,lh:1.5}),cw-48);
    }
    return;
  }
  if(name==='CTA'){
    const inner=mobile?24:80;
    const c=box('Call to action','VERTICAL',{fill:t.accent,gap:22,pad:[mobile?44:88,inner],radius:t.radius,cross:'CENTER'});sec.appendChild(c);fillW(c,cw);
    fillW(txt(c,D('Ready to be there?'),{size:mobile?36:64,font:t.display,color:t.accentInk,lh:1.02,ls:t.tracking,align:'CENTER'}),cw-inner*2);
    fillW(txt(c,'Seats are limited. Secure your pass in a minute.',{size:mobile?16:19,font:t.body,color:t.accentInk,opacity:.75,align:'CENTER'}),cw-inner*2);
    button(c,t,'Register now','inverse','register','',mobile?15:17);
    return;
  }
  if(name==='Footer'){
    const row=box('Footer row',mobile?'VERTICAL':'HORIZONTAL',{gap:8,align:mobile?'MIN':'SPACE_BETWEEN',cross:mobile?'MIN':'CENTER'});sec.appendChild(row);fillW(row,cw);
    txt(row,'Made with PassFlow',{size:14,font:t.body,color:t.muted});
    txt(row,'27 September 2026',{size:14,font:t.body,color:t.muted,binding:'eventDate'});
  }
}
async function template(style:TemplateStyle){
  const t=await theme(style),created:FrameNode[]=[];
  for(const role of ['desktop','mobile'] as const){
    const frame=figma.createFrame();
    figma.currentPage.appendChild(frame);
    frame.name='PassFlow Website · '+(role==='desktop'?'Desktop 1440':'Mobile 390');
    frame.resize(role==='desktop'?1440:390,100);
    frame.layoutMode='VERTICAL';
    frame.primaryAxisSizingMode='AUTO';
    frame.counterAxisSizingMode='FIXED';
    frame.itemSpacing=0;
    frame.fills=[solid(t.bg)];
    frame.setSharedPluginData(NS,'frame',role);
    frame.setSharedPluginData(NS,'documentId',documentId);
    frame.setSharedPluginData(NS,'schema',SCHEMA);
    frame.setSharedPluginData(NS,'templateStyle',style);
    for(const name of blocks)await block(frame,name,style);
    frame.x=figma.viewport.center.x+(role==='desktop'?-980:620);
    frame.y=figma.viewport.center.y;
    created.push(frame);
  }
  figma.currentPage.selection=created;
  figma.viewport.scrollAndZoomIntoView(created);
  dirty=true;
  status('Changes detected','Starter '+style+' template inserted. Rename layers freely; bindings live in metadata.');
  selectionState();
}
function findFrames(){
  const all=figma.currentPage.children.filter(n=>n.type==='FRAME'&&n.getSharedPluginData(NS,'documentId')===documentId) as FrameNode[];
  const desktop=all.filter(n=>n.getSharedPluginData(NS,'frame')==='desktop');
  const mobile=all.filter(n=>n.getSharedPluginData(NS,'frame')==='mobile');
  if(desktop.length!==1||mobile.length>1)throw Error('Keep exactly one Desktop frame and at most one Mobile frame for this event on the current page.');
  return {desktop:desktop[0],mobile:mobile[0]};
}
function contractWarnings(frame:FrameNode,label:string){
  const found=new Set<string>();
  const visit=(node:SceneNode)=>{
    const b=node.getSharedPluginData(NS,'binding');
    if(b)found.add(b);
    if('children' in node)for(const child of node.children)visit(child);
  };
  for(const child of frame.children)visit(child);
  const warnings:string[]=[];
  if(!found.has('eventName'))warnings.push(label+': Event Name is required.');
  if(!found.has('register')&&!found.has('tickets'))warnings.push(label+': add a Register action or Tickets block.');
  if(!found.has('eventDate'))warnings.push(label+': Event Date is recommended.');
  if(!found.has('venue'))warnings.push(label+': Venue is recommended.');
  return warnings;
}
function fontWeight(style:string){
  const s=style.toLowerCase().replace(/[\s-]/g,'');
  for(const [key,weight] of [['thin',100],['extralight',200],['ultralight',200],['light',300],['medium',500],['semibold',600],['demibold',600],['extrabold',800],['ultrabold',800],['black',900],['heavy',900],['bold',700]] as const)if(s.includes(key))return weight;
  return 400;
}
// The web renderer accepts a short font whitelist; map Figma families onto the closest one.
function webFamily(family:string){
  if(/mono|code/i.test(family))return 'monospace';
  if(/serif|playfair|georgia|garamond|times|lora|merriweather|baskerville|bodoni|caslon/i.test(family)&&!/sans/i.test(family))return 'Georgia';
  return family==='Arial'?'Arial':'Inter';
}
async function serialize(frame:FrameNode,warnings:string[]):Promise<FrameOutput>{
  const bounds=frame.absoluteBoundingBox;if(!bounds)throw Error('The frame has no bounds.');
  const nodes:NodeOutput[]=[];let visited=0;
  async function visit(node:SceneNode,parentId:string|null,parentBox:Rect){
    if(!node.visible)return;
    if(++visited>1500)throw Error('Use fewer than 1,500 layers per responsive frame.');
    const box=node.absoluteBoundingBox;if(!box||!box.width||!box.height)return;
    const raw=node.getSharedPluginData(NS,'binding'),binding=bindings.includes(raw as Binding)?raw as Binding:null;
    const paints='fills' in node?node.fills:undefined;
    const textNode=node.type==='TEXT'?node:null;
    if('effects' in node&&node.effects.some(effect=>effect.visible))warnings.push('Layer effects are simplified. Review shadows and blurs in Preview.');
    if('rotation' in node&&Math.abs(node.rotation)>.1&&!binding)warnings.push('Rotated artwork is simplified. Review its position in Preview.');
    const children='children' in node?node.children:null;
    if(children&&Array.isArray(paints)&&paints.some(p=>p.type==='IMAGE'||p.type.startsWith('GRADIENT')))warnings.push('Image/gradient fills on containers are simplified. Use an image layer for detailed artwork.');
    if('clipsContent' in node&&node.clipsContent)warnings.push('Clipped content is simplified. Review masks in Preview.');
    // Bound containers (buttons, live lists) take their typography from the first text inside them.
    const inner=textNode??(binding&&'findOne' in node?node.findOne(n=>n.type==='TEXT'):children?.find(n=>n.type==='TEXT'));
    const typo=inner?.type==='TEXT'?inner:null;
    const size=typo&&typeof typo.fontSize==='number'?typo.fontSize:20;
    const lh=typo?.lineHeight,ls=typo?.letterSpacing;
    const strokes='strokes' in node&&Array.isArray(node.strokes)?node.strokes:[];
    const strokeWidth='strokeWeight' in node&&typeof node.strokeWeight==='number'&&strokes.some(p=>p.visible!==false)?node.strokeWeight:0;
    const id=node.getSharedPluginData(NS,'id')||node.id;
    const output:NodeOutput={
      id:nodes.some(n=>n.id===id)?node.id:id,parentId,type:textNode?'text':'box',
      x:box.x-parentBox.x,y:box.y-parentBox.y,width:box.width,height:box.height,
      text:textNode||binding?typo?.characters??'':'',
      fill:hex(paints),hasFill:Array.isArray(paints)&&paints.some(p=>p.visible!==false),
      color:hex(typo?.fills,'#171717'),
      fontSize:size,
      fontFamily:typo&&typo.fontName!==figma.mixed?webFamily(typo.fontName.family):'Inter',
      fontWeight:typo&&typo.fontName!==figma.mixed?fontWeight(typo.fontName.style):400,
      lineHeight:lh&&lh!==figma.mixed&&typeof lh==='object'?Math.min(3,Math.max(.7,lh.unit==='PIXELS'?lh.value/size:lh.unit==='PERCENT'?lh.value/100:1.2)):1.25,
      letterSpacing:ls&&ls!==figma.mixed&&typeof ls==='object'?(ls.unit==='PIXELS'?ls.value:ls.value/100*size):0,
      opacity:'opacity' in node&&typeof node.opacity==='number'?node.opacity:1,
      stroke:strokeWidth?hex(strokes,''):'',strokeWidth,
      sticky:parentId===null&&node.getSharedPluginData(NS,'sticky')==='true',
      radius:'cornerRadius' in node&&typeof node.cornerRadius==='number'?node.cornerRadius:0,
      align:textNode?.textAlignHorizontal==='CENTER'?'center':textNode?.textAlignHorizontal==='RIGHT'?'right':binding==='register'||binding==='myPass'||(binding==='customLink'&&!textNode)?'center':'left',
      image:'',binding,href:node.getSharedPluginData(NS,'href')
    };
    if('rotation' in node&&Math.abs(node.rotation)>.1&&binding)throw Error('Rotated dynamic layers are not supported. Remove rotation before syncing.');
    if(textNode){
      if(textNode.fontSize===figma.mixed||textNode.fontName===figma.mixed)warnings.push('Mixed text styles are simplified. Use one style per text layer.');
      nodes.push(output);return;
    }
    if(binding){nodes.push(output);return;}
    const raster=!children&&(node.type==='VECTOR'||node.type==='BOOLEAN_OPERATION'||node.type==='ELLIPSE'||node.type==='POLYGON'||node.type==='STAR'||(Array.isArray(paints)&&paints.some(p=>p.type==='IMAGE'||p.type.startsWith('GRADIENT'))));
    if(raster){
      const png=await node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:2}});
      output.type='image';output.image='data:image/png;base64,'+figma.base64Encode(png);
      if(output.image.length>450000)throw Error('An artwork image exceeds 450 KB. Reduce its resolution.');
      nodes.push(output);return;
    }
    nodes.push(output);
    if(children)for(const child of children)await visit(child,output.id,box);
  }
  for(const child of frame.children)await visit(child,null,bounds);
  if(nodes.length>500)throw Error('Use at most 500 exported layers per frame.');
  if(frame.layoutMode!=='NONE')warnings.push('Auto layout is captured at the current frame size. Compare Desktop and Mobile Preview.');
  return {width:frame.width,height:frame.height,background:hex(frame.fills),nodes};
}
async function api(path:string,body:unknown,token?:string){
  const response=await fetch(ORIGIN+'/api/figma/plugin/'+path,{
    method:'POST',
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
    body:JSON.stringify(body)
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- server JSON, fields checked by the API
  let result:any={};
  try{result=await response.json();}catch{}
  if(!response.ok||result.error)throw Error(result.error||'Request failed');
  return result;
}
async function sync(){
  if(!session){status('Disconnected','Pair an event first.');return;}
  if(!confirmed){status('Confirm event','Confirm this file should update '+session.eventName+'. Pair again if this is a copy for another event.');return;}
  if(syncing||mutating){dirty=true;return;}
  if(blocked)return;
  syncing=true;dirty=false;status('Syncing');
  try{
    const frames=findFrames(),warnings:string[]=[];
    warnings.push(...contractWarnings(frames.desktop,'Desktop'));
    if(frames.mobile)warnings.push(...contractWarnings(frames.mobile,'Mobile'));
    else warnings.push('No Mobile frame: PassFlow will use a readable fallback on phones.');
    const critical=warnings.filter(w=>/required|Register action or Tickets/.test(w));
    if(critical.length)throw Error(critical.join(' '));
    const document={schema:3,source:'figma',desktop:await serialize(frames.desktop,warnings),mobile:frames.mobile?await serialize(frames.mobile,warnings):null,warnings:[...new Set(warnings)]};
    if(JSON.stringify(document).length>850000)throw Error('Design exceeds 850 KB. Reduce image sizes.');
    const result=await api('sync',{documentId,revision:session.revision,document},session.token);
    session.revision=result.revision;session.draftId=result.draftId;
    await figma.clientStorage.setAsync(storageKey,session);
    status('Synced','Draft ready.'+(warnings.length?' '+[...new Set(warnings)].join(' '):''));
  }catch(error){
    dirty=true;
    const message=error instanceof Error?error.message:'Sync failed';
    blocked=true;
    status('Sync paused',message==='revision_conflict'?'Another session changed the draft. Review the current draft, then resume.':message+' Your Figma changes are still intact.');
  }finally{
    syncing=false;
    if(dirty&&!blocked)schedule();
  }
}
function schedule(){
  dirty=true;
  if(confirmed)status('Changes detected');
  if(timer)clearTimeout(timer);
  if(session&&confirmed&&!blocked)timer=setTimeout(()=>{void sync();},1500);
}

figma.showUI(__html__,{width:390,height:760,themeColors:true});
figma.on('selectionchange',selectionState);
// dynamic-page forbids figma.on('documentchange') without loadAllPagesAsync; watch only the current page.
let watchedPage:PageNode|null=null;
const onNodeChange=()=>{if(!mutating)schedule();};
function watchPage(){watchedPage?.off('nodechange',onNodeChange);watchedPage=figma.currentPage;watchedPage.on('nodechange',onNodeChange);}
watchPage();
figma.on('currentpagechange',()=>{
  watchPage();
  if(timer)clearTimeout(timer);
  confirmed=false;
  status(session?'Confirm event':'Disconnected','Current page changed. Confirm the linked event before this page can sync.');
  selectionState();
});
selectionState();

figma.ui.onmessage=async(message:Message)=>{
  if(syncing||commandPending){status('Working','Wait for the current operation to finish.');return;}
  commandPending=true;
  try{
    if(message.type==='pair'){
      const result=await api('pair',{code:message.code,documentId,fileName:figma.root.name.slice(0,150)||'Untitled',fileKey:figma.fileKey??null});
      const paired:Session={token:result.token,documentId,eventId:result.eventId,eventName:result.eventName,revision:0};
      session=paired;
      await figma.clientStorage.setAsync(storageKey,paired);
      figma.root.setSharedPluginData(NS,'eventId',paired.eventId);
      figma.root.setSharedPluginData(NS,'eventName',paired.eventName);
      figma.root.setSharedPluginData(NS,'schema',SCHEMA);
      blocked=false;confirmed=true;
      status('Connected','Insert a starter template, or assign existing frames in Advanced Mode.');
      return;
    }
    if(message.type==='disconnect'){
      if(timer)clearTimeout(timer);
      session=null;blocked=false;confirmed=false;
      await figma.clientStorage.deleteAsync(storageKey);
      status('Disconnected','Local authorization removed. Revoke the paired file in PassFlow to invalidate it everywhere.');
      return;
    }
    if(message.type==='confirm'){
      if(session){confirmed=true;blocked=false;status('Connected','This page will sync to '+session.eventName+'.');}
      return;
    }
    if(message.type==='reload'){
      if(!session)return;
      const state=await api('sync',{documentId},session.token);
      session.revision=state.revision;session.draftId=state.draftId;
      await figma.clientStorage.setAsync(storageKey,session);
      blocked=false;status('Connected','Draft revision refreshed. Retry sync when ready.');
      return;
    }
    if(message.type==='sync'){blocked=false;await sync();return;}

    mutating=true;
    if(message.type==='template')await template(message.style);
    if(message.type==='assign'){
      const node=figma.currentPage.selection[0];
      if(figma.currentPage.selection.length!==1||!node||!bindings.includes(message.binding))throw Error('Select one layer and a valid binding.');
      if(message.binding==='customLink'&&!/^(https:\/\/[^\s]+|#[a-zA-Z][\w-]*)$/.test(message.href))throw Error('Use an HTTPS link or a section anchor.');
      bind(node,message.binding,message.binding==='customLink'?message.href:'');
      status('Changes detected','Binding saved in metadata. Renaming this layer will not break it.');
    }
    if(message.type==='frame'){
      if(!['desktop','mobile'].includes(message.role))throw Error('Choose Desktop or Mobile.');
      const node=figma.currentPage.selection[0];
      if(figma.currentPage.selection.length!==1||node?.type!=='FRAME')throw Error('Select one top-level frame.');
      if(node.parent!==figma.currentPage)throw Error('Responsive frames must be top-level on the current page.');
      node.setSharedPluginData(NS,'frame',message.role);
      node.setSharedPluginData(NS,'documentId',documentId);
      node.setSharedPluginData(NS,'schema',SCHEMA);
      status('Changes detected',message.role+' frame assigned.');
    }
    if(message.type==='block'){
      if(!blocks.includes(message.block))throw Error('Choose a supported block.');
      const frame=figma.currentPage.selection[0];
      if(frame?.type!=='FRAME')throw Error('Select a website frame first.');
      await block(frame,message.block,message.style);
      status('Changes detected',message.block+' block inserted.');
    }
    selectionState();
    schedule();
  }catch(error){
    status('Action failed',error instanceof Error?error.message:'Please try again.');
  }finally{
    mutating=false;commandPending=false;
  }
};

commandPending=true;
void figma.clientStorage.getAsync(storageKey).then(async stored=>{
  if(!stored?.token){
    status('Disconnected',figma.root.getSharedPluginData(NS,'eventName')?'This file remembers an event. Pair on this device to authorize sync.':'Pair an event to begin.');
    return;
  }
  session=stored as Session;
  try{
    const result=await api('sync',{documentId},session.token);
    session.revision=result.revision;session.draftId=result.draftId;
    await figma.clientStorage.setAsync(storageKey,session);
    status('Confirm event','Confirm this file should update '+session.eventName+'. Copied files should be paired again for another event.');
  }catch{
    blocked=true;
    status('Connection expired','Create a new pairing code in PassFlow and pair this file again.');
  }
}).catch(()=>status('Connection unavailable','Device storage could not be read. Reopen the plugin.')).finally(()=>{commandPending=false;});
