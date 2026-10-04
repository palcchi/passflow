const ORIGIN='https://passflow.my.id';
const NS='passflow';
const SCHEMA='passflow.website.v1';

type Binding='eventName'|'eventDescription'|'eventDate'|'venue'|'venueMap'|'logo'|'banner'|'tickets'|'register'|'myPass'|'schedule'|'speakers'|'sponsors'|'customLink';
type FrameRole='desktop'|'mobile';
type TemplateStyle='blank'|'minimal'|'festival';
type Session={token:string;documentId:string;eventId:string;eventName:string;revision:number;draftId?:string};
type NodeOutput={id:string;parentId:string|null;type:'text'|'box'|'image';x:number;y:number;width:number;height:number;text:string;fill:string;hasFill:boolean;color:string;fontSize:number;fontFamily:string;radius:number;align:'left'|'center'|'right';image:string;binding:Binding|null;href:string;fontWeight:number;lineHeight:number;letterSpacing:number;opacity:number;stroke:string;strokeWidth:number;sticky:boolean;anchor:string;hover:HoverOutput|null};
type HoverOutput={fill:string;color:string;stroke:string;opacity:number;ms:number;ease:string};
type FrameOutput={width:number;height:number;background:string;nodes:NodeOutput[]};
type Message=
  |{type:'pair';code:string}
  |{type:'template';style:TemplateStyle}
  |{type:'block';block:string;style:TemplateStyle}
  |{type:'assign';binding:Binding;href:string}
  |{type:'frame';role:FrameRole;page:string}
  |{type:'page';page:string;style:TemplateStyle}
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

// ---------- Templates: Blank, Minimal and Festival. All text is static and owned by Figma. ----------
type Theme={bg:string;surface:string;alt:string;ink:string;muted:string;accent:string;accentInk:string;accentHover:string;kicker:string;line:string;radius:number;buttonRadius:number;display:FontName;body:FontName;bodyMedium:FontName;bodyBold:FontName;upper:boolean;tracking:number;heroSize:[number,number];stickers:string[]};
type Buttons={primary:ComponentNode;secondary:ComponentNode;inverse:ComponentNode};
const inter=(style:string):FontName=>({family:'Inter',style});
async function font(wanted:FontName,fallback:FontName){
  try{await figma.loadFontAsync(wanted);return wanted;}catch{await figma.loadFontAsync(fallback);return fallback;}
}
async function theme(style:TemplateStyle):Promise<Theme>{
  const body=await font(inter('Regular'),inter('Regular')),bodyMedium=await font(inter('Medium'),body),bodyBold=await font(inter('Semi Bold'),body);
  if(style==='festival')return {bg:'#0f0f10',surface:'#1c1c1f',alt:'#161618',ink:'#f6f5f0',muted:'#a3a29b',accent:'#ff5c35',accentInk:'#0f0f10',accentHover:'#ff8a66',kicker:'#c6f432',line:'#2e2e33',radius:28,buttonRadius:999,
    display:await font(inter('Black'),inter('Bold')),body,bodyMedium,bodyBold,upper:true,tracking:-3,heroSize:[132,54],stickers:['#ff5c35','#c6f432','#7c5cff']};
  return {bg:'#ffffff',surface:'#ffffff',alt:'#f5f5f3',ink:'#242421',muted:'#74736d',accent:'#242421',accentInk:'#ffffff',accentHover:'#4a4a45',kicker:'#74736d',line:'#e6e5df',radius:24,buttonRadius:999,
    display:await font(inter('Bold'),bodyBold),body,bodyMedium,bodyBold,upper:false,tracking:-3,heroSize:[96,46],stickers:['#ff6b4a','#4f7cff','#ffc93c']};
}
function box<T extends FrameNode|ComponentNode=FrameNode>(name:string,dir:'HORIZONTAL'|'VERTICAL',o:{fill?:string;gap?:number;pad?:[number,number];radius?:number;stroke?:string;align?:'MIN'|'CENTER'|'MAX'|'SPACE_BETWEEN';cross?:'MIN'|'CENTER'|'MAX'}={},node?:T):T{
  const f=(node??figma.createFrame()) as T;
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
function fillW(node:FrameNode|TextNode|InstanceNode,width:number){
  node.resize(Math.max(1,width),Math.max(1,node.height));
  node.layoutSizingHorizontal='FILL';
  if(node.type==='TEXT')node.textAutoResize='HEIGHT';else node.layoutSizingVertical='HUG';
}
function fixW(node:FrameNode|TextNode,width:number){
  node.resize(Math.max(1,width),Math.max(1,node.height));
  node.layoutSizingHorizontal='FIXED';
  if(node.type==='TEXT')node.textAutoResize='HEIGHT';else node.layoutSizingVertical='HUG';
}
function txt(parent:FrameNode|ComponentNode,chars:string,o:{size:number;font:FontName;color:string;lh?:number;ls?:number;align?:'LEFT'|'CENTER'|'RIGHT';opacity?:number}){
  const n=figma.createText();
  n.fontName=o.font;n.characters=chars;n.fontSize=o.size;n.fills=[solid(o.color)];
  if(o.lh)n.lineHeight={unit:'PERCENT',value:o.lh*100};
  if(o.ls)n.letterSpacing={unit:'PERCENT',value:o.ls};
  if(o.align)n.textAlignHorizontal=o.align;
  if(o.opacity!==undefined)n.opacity=o.opacity;
  parent.appendChild(n);
  n.textAutoResize='WIDTH_AND_HEIGHT';
  return n;
}
function firstText(node:BaseNode):TextNode|null{
  if(node.type==='TEXT')return node;
  if('children' in node)for(const child of node.children){const found=firstText(child);if(found)return found;}
  return null;
}
const ease:Easing={type:'EASE_OUT'};
// Buttons are a component set (State=Default/Hover) wired with "While hovering → Change to",
// the same native pattern designers use; PassFlow turns it into a CSS hover.
async function buttons(t:Theme,style:TemplateStyle,x:number,y:number):Promise<Buttons>{
  const make=(kind:'primary'|'secondary'|'inverse',state:'Default'|'Hover')=>{
    const hover=state==='Hover';
    const fill=kind==='primary'?(hover?t.accentHover:t.accent):kind==='inverse'?(hover?t.alt:t.accentInk):(hover?t.ink:undefined);
    const ink=kind==='primary'?t.accentInk:kind==='inverse'?t.accent:(hover?t.bg:t.ink);
    const c=box('State='+state,'HORIZONTAL',{fill,stroke:kind==='secondary'?t.ink:undefined,pad:[15,26],radius:t.buttonRadius,align:'CENTER',cross:'CENTER'},figma.createComponent());
    figma.currentPage.appendChild(c);
    txt(c,'Button',{size:17,font:t.bodyBold,color:ink});
    return c;
  };
  const result:Partial<Buttons>={};let offset=0;
  for(const kind of ['primary','secondary','inverse'] as const){
    const name='PassFlow '+style+' · '+kind+' button';
    const existing=figma.currentPage.children.find(n=>n.type==='COMPONENT_SET'&&n.name===name) as ComponentSetNode|undefined;
    const reuse=existing?.children.find(n=>n.type==='COMPONENT'&&n.name==='State=Default') as ComponentNode|undefined;
    if(reuse){result[kind]=reuse;continue;}
    const base=make(kind,'Default'),hover=make(kind,'Hover');
    await base.setReactionsAsync([{trigger:{type:'ON_HOVER'},actions:[{type:'NODE',destinationId:hover.id,navigation:'CHANGE_TO',transition:{type:'SMART_ANIMATE',easing:ease,duration:.18}}]}]);
    const set=figma.combineAsVariants([base,hover],figma.currentPage);
    set.name=name;
    set.layoutMode='HORIZONTAL';set.itemSpacing=16;set.paddingTop=16;set.paddingBottom=16;set.paddingLeft=16;set.paddingRight=16;
    set.x=x;set.y=y+offset;offset+=110;
    result[kind]=base;
  }
  return result as Buttons;
}
function button(parent:FrameNode,b:Buttons,label:string,kind:'primary'|'secondary'|'inverse',size:number){
  const i=b[kind].createInstance();parent.appendChild(i);
  const text=firstText(i);if(text){text.characters=label;text.fontSize=size;}
  if(size<16){i.paddingTop=10;i.paddingBottom=10;i.paddingLeft=18;i.paddingRight=18;}
  return i;
}
function register(node:SceneNode){
  node.setSharedPluginData(NS,'binding','register');node.setSharedPluginData(NS,'schema',SCHEMA);
  if(!node.getSharedPluginData(NS,'id'))node.setSharedPluginData(NS,'id',node.id);
}
// Marks a layer that should "Scroll to" a section; wired once the target section exists.
function scrollTo(node:SceneNode,block:string){node.setSharedPluginData(NS,'scrollTo',block);}
async function wireScrolls(frame:FrameNode){
  const targets=new Map(frame.children.map(c=>[c.getSharedPluginData(NS,'block'),c] as const));
  const visit=async(node:SceneNode)=>{
    const target=targets.get(node.getSharedPluginData(NS,'scrollTo'));
    if(target&&'setReactionsAsync' in node)await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:target.id,navigation:'SCROLL_TO',transition:{type:'SMART_ANIMATE',easing:ease,duration:.4}}]}]);
    if('children' in node)for(const child of node.children)await visit(child);
  };
  for(const child of frame.children)await visit(child);
}
async function openLink(node:SceneNode,url:string){
  if('setReactionsAsync' in node)await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'URL',url,openInNewTab:true}]}]);
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
function chip(parent:FrameNode,t:Theme,label:string,fill:string,ink:string){
  const c=box(label,'HORIZONTAL',{fill,stroke:fill===t.bg?t.line:undefined,pad:[9,16],radius:t.buttonRadius,cross:'CENTER'});
  parent.appendChild(c);txt(c,label,{size:14,font:t.bodyMedium,color:ink});
}
async function block(parent:FrameNode,name:string,style:TemplateStyle,b?:Buttons,title=''){
  if(style==='blank')throw Error('Pick Minimal or Festival to insert ready-made sections.');
  const t=await theme(style),w=parent.width,mobile=w<600,pad=mobile?24:96,cw=w-pad*2,D=(s:string)=>t.upper?s.toUpperCase():s;
  b=b??await buttons(t,style,parent.x-420,parent.y);

  if(name==='Navbar'){
    const nav=box('Navbar','HORIZONTAL',{fill:t.bg,pad:[mobile?12:16,pad],align:'SPACE_BETWEEN',cross:'CENTER'});
    parent.insertChild(0,nav);fillW(nav,w);
    nav.setSharedPluginData(NS,'sticky','true');nav.setSharedPluginData(NS,'block','navbar');nav.setSharedPluginData(NS,'schema',SCHEMA);
    txt(nav,'Your event',{size:mobile?16:18,font:t.bodyBold,color:t.ink});
    if(!mobile&&pageOf(parent)==='home'){
      const links=box('Links','HORIZONTAL',{gap:32,cross:'CENTER'});nav.appendChild(links);
      for(const [label,target] of [['Tickets','tickets'],['Schedule','schedule'],['Speakers','speakers'],['Venue','venue']])scrollTo(txt(links,label,{size:15,font:t.bodyMedium,color:t.muted}),target);
    }
    register(button(nav,b,'Register','primary',mobile?13:14));
    return;
  }

  const fill=['Tickets','Speakers','Venue','Footer'].includes(name)?t.alt:t.bg;
  const py=name==='Footer'?(mobile?28:40):name==='Hero'?(mobile?56:128):(mobile?64:112);
  const sec=box(name,'VERTICAL',{fill,gap:mobile?18:26,pad:[py,pad]});
  parent.appendChild(sec);fillW(sec,w);
  sec.setSharedPluginData(NS,'block',name.toLowerCase());sec.setSharedPluginData(NS,'schema',SCHEMA);

  if(name==='Page header'){
    const ticket=pageOf(parent)==='ticket';
    kicker(sec,t,ticket?'Tickets':'Your event');
    fillW(txt(sec,D(title),{size:mobile?44:80,font:t.display,color:t.ink,lh:.98,ls:t.tracking}),cw);
    fillW(txt(sec,ticket?'Choose a pass below. Sign-up takes about a minute.':'Write this page in Figma. Link to it from any button with Prototype → Navigate to.',{size:mobile?17:21,font:t.body,color:t.muted,lh:1.5}),cw);
    return;
  }
  if(name==='Hero'){
    const center=style==='minimal',align=center?'CENTER':'LEFT';
    if(center)sec.counterAxisAlignItems='CENTER';
    const meta=box('Event details','HORIZONTAL',{gap:10,cross:'CENTER'});sec.appendChild(meta);
    chip(meta,t,'27 September 2026',style==='festival'?t.accent:t.bg,style==='festival'?t.accentInk:t.ink);
    chip(meta,t,'Jakarta',style==='festival'?t.kicker:t.bg,style==='festival'?t.accentInk:t.ink);
    fillW(txt(sec,D('Your event starts here'),{size:t.heroSize[mobile?1:0],font:t.display,color:t.ink,lh:.94,ls:t.tracking,align}),cw);
    const desc=txt(sec,'A purposeful gathering. A space for new ideas, new people and a day worth remembering.',{size:mobile?17:22,font:t.body,color:t.muted,lh:1.5,align});
    if(mobile)fillW(desc,cw);else fixW(desc,640);
    const actions=box('Actions','HORIZONTAL',{gap:12,cross:'CENTER'});sec.appendChild(actions);
    register(button(actions,b,'Register now','primary',mobile?15:17));
    scrollTo(button(actions,b,'See schedule','secondary',mobile?15:17),'schedule');
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
    const p=txt(row,'Tell people what they will experience, who it is for and why it is worth showing up.',{size:mobile?17:21,font:t.body,color:t.muted,lh:1.55});
    if(mobile){fillW(h,cw);fillW(p,cw);}else{fixW(h,440);fillW(p,cw-520);}
    return;
  }
  if(name==='Tickets'){
    kicker(sec,t,'Tickets');heading(sec,t,'Choose your pass',mobile,cw);
    // The only live block: prices and availability come from PassFlow.
    const list=box('Live tickets · from PassFlow','VERTICAL',{gap:10});sec.appendChild(list);fillW(list,cw);bind(list,'tickets');
    for(const [a,c] of [['Early bird','IDR 150,000'],['Regular','IDR 250,000'],['VIP','IDR 500,000']]){
      const row=card(list,t,a,cw,'HORIZONTAL');
      txt(row,a,{size:mobile?16:18,font:t.bodyBold,color:t.ink});txt(row,c,{size:mobile?15:16,font:t.body,color:t.muted});
    }
    txt(sec,'Live ticket names, prices and availability replace these placeholders.',{size:13,font:t.body,color:t.muted});
    return;
  }
  if(name==='Schedule'){
    kicker(sec,t,'Schedule');heading(sec,t,'How the day unfolds',mobile,cw);
    for(const [time,title] of [['09:00','Doors open'],['10:00','Opening keynote'],['13:00','Sessions and workshops'],['17:00','Closing and networking']]){
      const row=card(sec,t,title,cw,'HORIZONTAL');
      txt(row,title,{size:mobile?16:18,font:t.bodyBold,color:t.ink});txt(row,time,{size:mobile?15:16,font:t.body,color:t.muted});
    }
    return;
  }
  if(name==='Speakers'){
    kicker(sec,t,'Speakers');heading(sec,t,'Voices you will hear',mobile,cw);
    const grid=box('Speaker grid',mobile?'VERTICAL':'HORIZONTAL',{gap:16});sec.appendChild(grid);fillW(grid,cw);
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
    const row=box('Sponsor logos','HORIZONTAL',{gap:12});sec.appendChild(row);fillW(row,cw);
    const n=mobile?2:4,tileW=(cw-12*(n-1))/n;
    for(let i=0;i<n;i++){const c=card(row,t,'Sponsor '+(i+1),tileW);txt(c,'Logo',{size:15,font:t.bodyMedium,color:t.muted});}
    return;
  }
  if(name==='Venue'){
    const row=box('Venue row',mobile?'VERTICAL':'HORIZONTAL',{gap:mobile?20:48});sec.appendChild(row);fillW(row,cw);
    const left=box('Venue details','VERTICAL',{gap:14});row.appendChild(left);
    const leftW=mobile?cw:440;if(mobile)fillW(left,cw);else fixW(left,leftW);
    kicker(left,t,'Venue');
    fillW(txt(left,D('Getting there'),{size:mobile?34:56,font:t.display,color:t.ink,lh:1.04,ls:t.tracking}),leftW);
    fillW(txt(left,'Venue name, City',{size:mobile?19:22,font:t.bodyBold,color:t.ink}),leftW);
    fillW(txt(left,'Arrival details, entrances and accessibility notes can live here.',{size:16,font:t.body,color:t.muted,lh:1.5}),leftW);
    await openLink(button(left,b,'Open in Maps','secondary',15),'https://maps.google.com/?q=Jakarta');
    const map=box('Map artwork','VERTICAL',{fill:t.surface,stroke:t.line,radius:t.radius,align:'CENTER',cross:'CENTER'});row.appendChild(map);
    map.resize(mobile?cw:cw-leftW-48,mobile?220:320);map.layoutSizingHorizontal='FILL';map.layoutSizingVertical='FIXED';
    txt(map,'Place a map image here',{size:15,font:t.body,color:t.muted});
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
    register(button(c,b,'Register now','inverse',mobile?15:17));
    return;
  }
  if(name==='Footer'){
    const row=box('Footer row',mobile?'VERTICAL':'HORIZONTAL',{gap:8,align:mobile?'MIN':'SPACE_BETWEEN',cross:mobile?'MIN':'CENTER'});sec.appendChild(row);fillW(row,cw);
    txt(row,'© 2026 Your event',{size:14,font:t.body,color:t.muted});
    txt(row,'Made with PassFlow',{size:14,font:t.body,color:t.muted});
  }
}
async function template(style:TemplateStyle){
  const t=style==='blank'?null:await theme(style),created:FrameNode[]=[];
  const origin={x:Math.round(figma.viewport.center.x-980),y:Math.round(figma.viewport.center.y)};
  const b=t?await buttons(t,style,origin.x-420,origin.y):undefined;
  for(const role of ['desktop','mobile'] as const){
    const frame=figma.createFrame();
    figma.currentPage.appendChild(frame);
    frame.name='PassFlow Website · '+(role==='desktop'?'Desktop 1440':'Mobile 390');
    frame.fills=[solid(t?.bg??'#ffffff')];
    frame.setSharedPluginData(NS,'frame',role);
    frame.setSharedPluginData(NS,'documentId',documentId);
    frame.setSharedPluginData(NS,'schema',SCHEMA);
    frame.setSharedPluginData(NS,'templateStyle',style);
    if(t&&b){
      frame.resize(role==='desktop'?1440:390,100);
      frame.layoutMode='VERTICAL';frame.primaryAxisSizingMode='AUTO';frame.counterAxisSizingMode='FIXED';frame.itemSpacing=0;
      for(const name of blocks)await block(frame,name,style,b);
      await wireScrolls(frame);
    }else frame.resize(role==='desktop'?1440:390,role==='desktop'?1024:844);
    frame.x=origin.x+(role==='desktop'?0:1600);
    frame.y=origin.y;
    created.push(frame);
  }
  figma.currentPage.selection=created;
  figma.viewport.scrollAndZoomIntoView(created);
  dirty=true;
  status('Changes detected',style==='blank'?'Blank Desktop and Mobile frames are ready. Design freely, then mark a Register button.':'Starter '+style+' website inserted. Edit any text; links and hovers come from Figma prototype interactions.');
  selectionState();
}
const reservedPages=['home','claim','calendar','opengraph-image','admin','api','e'];
const pageSlugOk=(v:string)=>/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(v)&&!reservedPages.includes(v);
const pageOf=(n:BaseNode)=>('getSharedPluginData' in n?n.getSharedPluginData(NS,'page'):'')||'home';
function eventFrames(){
  return figma.currentPage.children.filter(n=>n.type==='FRAME'&&n.getSharedPluginData(NS,'documentId')===documentId) as FrameNode[];
}
// Home is required; extra pages ("ticket" or custom slugs) each need a Desktop frame and may have a Mobile one.
async function pageTemplate(style:TemplateStyle,slug:string){
  if(!pageSlugOk(slug))throw Error('Name the page in lowercase, like ticket, agenda or faq.');
  const frames=eventFrames();
  if(frames.some(f=>pageOf(f)===slug))throw Error('The "'+slug+'" page already exists on this Figma page.');
  const t=style==='blank'?null:await theme(style);
  const top=Math.round(Math.max(figma.viewport.center.y,...frames.map(f=>f.y+f.height))+200);
  const left=Math.round(frames.length?Math.min(...frames.map(f=>f.x)):figma.viewport.center.x-980);
  const b=t?await buttons(t,style,left-420,top):undefined;
  const title=slug==='ticket'?'Get your pass':slug.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const created:FrameNode[]=[];
  for(const role of ['desktop','mobile'] as const){
    const frame=figma.createFrame();
    figma.currentPage.appendChild(frame);
    frame.name='PassFlow '+(slug==='ticket'?'Ticket page':'Page · '+slug)+' · '+(role==='desktop'?'Desktop 1440':'Mobile 390');
    frame.fills=[solid(t?.bg??'#ffffff')];
    frame.setSharedPluginData(NS,'frame',role);
    frame.setSharedPluginData(NS,'page',slug);
    frame.setSharedPluginData(NS,'documentId',documentId);
    frame.setSharedPluginData(NS,'schema',SCHEMA);
    frame.setSharedPluginData(NS,'templateStyle',style);
    if(t&&b){
      frame.resize(role==='desktop'?1440:390,100);
      frame.layoutMode='VERTICAL';frame.primaryAxisSizingMode='AUTO';frame.counterAxisSizingMode='FIXED';frame.itemSpacing=0;
      await block(frame,'Navbar',style,b);
      await block(frame,'Page header',style,b,title);
      if(slug!=='ticket')await block(frame,'Footer',style,b);
      // The event name in the navbar goes back to Home, using Figma's own Navigate to.
      const home=frames.find(f=>pageOf(f)==='home'&&f.getSharedPluginData(NS,'frame')===role),brand=firstText(frame.children[0]);
      if(home&&brand)await brand.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:home.id,navigation:'NAVIGATE',transition:null}]}]);
    }else frame.resize(role==='desktop'?1440:390,slug==='ticket'?480:role==='desktop'?1024:844);
    frame.x=left+(role==='desktop'?0:1600);frame.y=top;
    created.push(frame);
  }
  figma.currentPage.selection=created;
  figma.viewport.scrollAndZoomIntoView(created);
  dirty=true;
  status('Changes detected',slug==='ticket'?'Ticket page added. It shows above the PassFlow sign-up form.':'"'+slug+'" page added at /e/your-event/'+slug+'. Link to it with Prototype → Navigate to.');
  selectionState();
}
function findFrames(){
  const groups=new Map<string,{desktop:FrameNode[];mobile:FrameNode[]}>();
  for(const f of eventFrames()){
    const role=f.getSharedPluginData(NS,'frame');if(role!=='desktop'&&role!=='mobile')continue;
    const g=groups.get(pageOf(f))??{desktop:[],mobile:[]};g[role].push(f);groups.set(pageOf(f),g);
  }
  const home=groups.get('home');
  if(!home||home.desktop.length!==1||home.mobile.length>1)throw Error('Keep exactly one Home Desktop frame and at most one Home Mobile frame on the current page.');
  const pages:{slug:string;desktop:FrameNode;mobile?:FrameNode}[]=[];
  for(const [slug,g] of groups){
    if(slug==='home')continue;
    if(!pageSlugOk(slug))throw Error('Page "'+slug+'" needs a lowercase name like agenda or ticket.');
    if(g.desktop.length!==1||g.mobile.length>1)throw Error('Page "'+slug+'" needs exactly one Desktop frame and at most one Mobile frame.');
    pages.push({slug,desktop:g.desktop[0],mobile:g.mobile[0]});
  }
  if(pages.length>8)throw Error('Use at most 8 extra pages.');
  return {desktop:home.desktop[0],mobile:home.mobile[0],pages};
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
  // Drafts may be unfinished; PassFlow enforces this only when publishing.
  if(!found.has('register')&&!found.has('tickets'))warnings.push(label+': mark a Register button (or add live Tickets) before publishing.');
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
const anchorOf=(id:string)=>'s'+id.replace(/[^a-zA-Z0-9]/g,'-');
function cssEase(e:Easing|undefined){
  if(!e)return 'ease-out';
  if(e.type==='CUSTOM_CUBIC_BEZIER'&&e.easingFunctionCubicBezier){const b=e.easingFunctionCubicBezier;return 'cubic-bezier('+[b.x1,b.y1,b.x2,b.y2].map(v=>+v.toFixed(3)).join(',')+')';}
  return ({EASE_IN:'ease-in',EASE_OUT:'ease-out',EASE_IN_AND_OUT:'ease-in-out',LINEAR:'linear'} as Record<string,string>)[e.type]??'ease-out';
}
// Links and hovers are read from Figma's own prototype interactions, so designers need no extra steps.
async function interactions(node:SceneNode,warnings:string[]){
  let reactions:ReadonlyArray<Reaction>='reactions' in node?node.reactions:[];
  if(!reactions.length&&node.type==='INSTANCE')reactions=(await node.getMainComponentAsync())?.reactions??[];
  const out:{url:string;scrollTo:string;hover:HoverOutput|null}={url:'',scrollTo:'',hover:null};
  for(const r of reactions){
    const trigger=r.trigger?.type;
    for(const a of r.actions??(r.action?[r.action]:[])){
      if(trigger==='ON_CLICK'||trigger==='ON_PRESS'){
        if(a.type==='URL'){
          const url=/^[a-z][a-z0-9+.-]*:/i.test(a.url)?a.url:'https://'+a.url;
          if(/^https:\/\//i.test(url))out.url=url;else warnings.push('Links must start with https://. "'+a.url.slice(0,60)+'" was skipped.');
        }
        if(a.type==='NODE'&&a.navigation==='SCROLL_TO'&&a.destinationId)out.scrollTo=a.destinationId;
        if(a.type==='NODE'&&a.navigation==='NAVIGATE'&&a.destinationId){
          const dest=await figma.getNodeByIdAsync(a.destinationId);
          if(dest&&dest.type==='FRAME'&&dest.getSharedPluginData(NS,'documentId')===documentId)out.url='page:'+pageOf(dest);
          else warnings.push('A Navigate to link points to a frame that is not a PassFlow page. Mark that frame as a page first.');
        }
      }
      if((trigger==='ON_HOVER'||trigger==='MOUSE_ENTER')&&a.type==='NODE'&&a.navigation==='CHANGE_TO'&&a.destinationId){
        const dest=await figma.getNodeByIdAsync(a.destinationId);
        if(dest&&dest.type==='COMPONENT'){
          const label=firstText(dest),strokes=Array.isArray(dest.strokes)?dest.strokes:[];
          out.hover={fill:hex(dest.fills,''),color:label?hex(label.fills,''):'',stroke:strokes.length?hex(strokes,''):'',opacity:dest.opacity,ms:Math.round((a.transition?.duration??.2)*1000),ease:cssEase(a.transition?.easing)};
        }
      }
    }
  }
  return out;
}
async function serialize(frame:FrameNode,warnings:string[]):Promise<FrameOutput>{
  const bounds=frame.absoluteBoundingBox;if(!bounds)throw Error('The frame has no bounds.');
  const nodes:NodeOutput[]=[],byFigmaId=new Map<string,NodeOutput>(),scrollTargets=new Set<string>();let visited=0;
  async function visit(node:SceneNode,parentId:string|null,parentBox:Rect){
    if(!node.visible)return;
    if(++visited>1500)throw Error('Use fewer than 1,500 layers per responsive frame.');
    const box=node.absoluteBoundingBox;if(!box||!box.width||!box.height)return;
    const raw=node.getSharedPluginData(NS,'binding'),act=await interactions(node,warnings);
    let binding=bindings.includes(raw as Binding)?raw as Binding:null,href=binding?node.getSharedPluginData(NS,'href'):'';
    if(!binding&&(act.url||act.scrollTo)){binding='customLink';href=act.url||'#'+anchorOf(act.scrollTo);}
    if(act.scrollTo&&!act.url)scrollTargets.add(act.scrollTo);
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
      image:'',binding,href,anchor:'',hover:act.hover
    };
    byFigmaId.set(node.id,output);
    if('rotation' in node&&Math.abs(node.rotation)>.1&&binding)throw Error('Rotated dynamic layers are not supported. Remove rotation before syncing.');
    if(textNode){
      if(textNode.fontSize===figma.mixed||textNode.fontName===figma.mixed)warnings.push('Mixed text styles are simplified. Use one style per text layer.');
      nodes.push(output);return;
    }
    // Live widgets are drawn by PassFlow, so their placeholder children are not exported.
    if(binding&&['tickets','schedule','speakers','sponsors','venueMap','logo','banner'].includes(binding)){nodes.push(output);return;}
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
  for(const target of scrollTargets){const n=byFigmaId.get(target);if(n)n.anchor=anchorOf(target);}
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
    const pages=[];
    for(const p of frames.pages)pages.push({slug:p.slug,desktop:await serialize(p.desktop,warnings),mobile:p.mobile?await serialize(p.mobile,warnings):null});
    const document={schema:3,source:'figma',desktop:await serialize(frames.desktop,warnings),mobile:frames.mobile?await serialize(frames.mobile,warnings):null,pages,warnings:[...new Set(warnings)]};
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
      const page=(message.page||'home').trim().toLowerCase();
      if(page!=='home'&&!pageSlugOk(page))throw Error('Use a lowercase page name like agenda, faq or ticket.');
      node.setSharedPluginData(NS,'frame',message.role);
      node.setSharedPluginData(NS,'page',page==='home'?'':page);
      node.setSharedPluginData(NS,'documentId',documentId);
      node.setSharedPluginData(NS,'schema',SCHEMA);
      status('Changes detected',(page==='home'?'Home':page==='ticket'?'Ticket page':'"'+page+'" page')+' '+message.role+' frame assigned.');
    }
    if(message.type==='page')await pageTemplate(message.style,(message.page||'').trim().toLowerCase());
    if(message.type==='block'){
      if(!blocks.includes(message.block))throw Error('Choose a supported block.');
      const frame=figma.currentPage.selection[0];
      if(frame?.type!=='FRAME')throw Error('Select a website frame first.');
      await block(frame,message.block,message.style);
      await wireScrolls(frame);
      status('Changes detected',message.block+' section added.');
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
