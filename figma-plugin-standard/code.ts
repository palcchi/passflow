const ORIGIN='https://passflow.my.id';
const NS='passflow';
const SCHEMA='passflow.website.v1';

type Binding='eventName'|'eventDescription'|'eventDate'|'venue'|'venueMap'|'logo'|'banner'|'tickets'|'register'|'myPass'|'schedule'|'speakers'|'sponsors'|'customLink';
type FrameRole='desktop'|'mobile';
type TemplateStyle='minimal'|'editorial'|'festival';
type Session={token:string;documentId:string;eventId:string;eventName:string;revision:number;draftId?:string};
type NodeOutput={id:string;parentId:string|null;type:'text'|'box'|'image';x:number;y:number;width:number;height:number;text:string;fill:string;hasFill:boolean;color:string;fontSize:number;fontFamily:string;radius:number;align:'left'|'center'|'right';image:string;binding:Binding|null;href:string};
type FrameOutput={width:number;height:number;background:string;nodes:NodeOutput[]};
type Message=
  |{type:'pair';code:string}
  |{type:'template';style:TemplateStyle}
  |{type:'block';block:string;style:TemplateStyle}
  |{type:'assign';binding:Binding;href:string}
  |{type:'frame';role:FrameRole}
  |{type:'sync'|'disconnect'|'reload'|'confirm'};

const bindings:Binding[]=['eventName','eventDescription','eventDate','venue','venueMap','logo','banner','tickets','register','myPass','schedule','speakers','sponsors','customLink'];
const blocks=['Hero','About','Tickets','Schedule','Speakers','Sponsors','Venue','Venue Map','FAQ','CTA','Footer'];
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
    name:node?.name??'Nothing selected',
    binding:node?.getSharedPluginData(NS,'binding')??'',
    frameRole:node?.getSharedPluginData(NS,'frame')??''
  });
}
function color(hex:string):SolidPaint{
  return {type:'SOLID',color:{r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255}};
}
function hex(paints:ReadonlyArray<Paint>|typeof figma.mixed|undefined,fallback='#ffffff'){
  const p=Array.isArray(paints)?paints.find(p=>p.type==='SOLID'&&p.visible!==false):null;
  return p?.type==='SOLID'?'#'+[p.color.r,p.color.g,p.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''):fallback;
}
function palette(style:TemplateStyle){
  if(style==='festival')return {bg:'#fff7ed',surface:'#ffffff',ink:'#171717',accent:'#ff5c35',soft:'#fde7df'};
  if(style==='editorial')return {bg:'#f3f1ea',surface:'#ffffff',ink:'#171717',accent:'#2f35d3',soft:'#e4e5ff'};
  return {bg:'#f7f7f5',surface:'#ffffff',ink:'#171717',accent:'#171717',soft:'#eeeeea'};
}
function bind(node:SceneNode,binding:Binding){
  node.setSharedPluginData(NS,'binding',binding);
  node.setSharedPluginData(NS,'schema',SCHEMA);
  if(!node.getSharedPluginData(NS,'id'))node.setSharedPluginData(NS,'id',node.id);
}
async function ensureFont(){await figma.loadFontAsync({family:'Inter',style:'Regular'});}
function autoFrame(name:string,direction:'HORIZONTAL'|'VERTICAL',fill:string){
  const f=figma.createFrame();
  f.name=name;
  f.layoutMode=direction;
  f.primaryAxisSizingMode='AUTO';
  f.counterAxisSizingMode='FIXED';
  f.itemSpacing=16;
  f.paddingTop=0;f.paddingRight=0;f.paddingBottom=0;f.paddingLeft=0;
  f.fills=[color(fill)];
  return f;
}
async function text(parent:FrameNode,value:string,size:number,width:number,binding?:Binding){
  const n=figma.createText();
  n.fontName={family:'Inter',style:'Regular'};
  n.characters=value;
  n.fontSize=size;
  n.fills=[color('#171717')];
  n.textAutoResize='HEIGHT';
  parent.appendChild(n);
  n.resize(Math.max(80,width),Math.max(size*1.5,36));
  if(binding)bind(n,binding);
  return n;
}
function setupSection(section:FrameNode,width:number,pad:number,fill:string){
  section.resize(width,100);
  section.layoutMode='VERTICAL';
  section.primaryAxisSizingMode='AUTO';
  section.counterAxisSizingMode='FIXED';
  section.itemSpacing=18;
  section.paddingTop=pad;
  section.paddingRight=pad;
  section.paddingBottom=pad;
  section.paddingLeft=pad;
  section.fills=[color(fill)];
  section.clipsContent=false;
}
async function chip(parent:FrameNode,label:string,fill:string,ink:string){
  const c=autoFrame(label,'HORIZONTAL',fill);
  parent.appendChild(c);
  c.cornerRadius=999;
  c.paddingTop=10;c.paddingBottom=10;c.paddingLeft=14;c.paddingRight=14;
  const t=await text(c,label,14,Math.max(80,label.length*8));
  t.fills=[color(ink)];
  return c;
}
async function card(parent:FrameNode,title:string,subtitle:string,width:number,fill:string){
  const c=autoFrame(title,'VERTICAL',fill);
  parent.appendChild(c);
  c.resize(width,160);
  c.counterAxisSizingMode='FIXED';
  c.paddingTop=22;c.paddingRight=22;c.paddingBottom=22;c.paddingLeft=22;
  c.cornerRadius=18;
  await text(c,title,22,width-44);
  const sub=await text(c,subtitle,14,width-44);sub.opacity=.65;
  return c;
}
async function block(parent:FrameNode,name:string,style:TemplateStyle){
  await ensureFont();
  const mobile=parent.width<600,pad=mobile?24:80,w=parent.width,p=palette(style);
  const section=figma.createFrame();
  parent.appendChild(section);
  section.name=name;
  setupSection(section,w,pad,name==='Hero'?p.soft:p.surface);
  section.setSharedPluginData(NS,'block',name.toLowerCase().replace(/\s+/g,'-'));
  section.setSharedPluginData(NS,'schema',SCHEMA);
  section.layoutAlign='STRETCH';

  if(name==='Hero'){
    const kicker=await text(section,'YOUR EVENT, YOUR WAY.',13,w-pad*2);kicker.opacity=.55;
    const title=await text(section,'Your event starts here',mobile?44:76,w-pad*2,'eventName');title.fills=[color(p.ink)];
    const desc=await text(section,'A purposeful gathering. A space for new connections.',mobile?18:24,w-pad*2,'eventDescription');desc.opacity=.72;
    const meta=autoFrame('Event details','HORIZONTAL',p.soft);section.appendChild(meta);meta.itemSpacing=10;meta.fills=[];
    await chip(meta,'27 September 2026',p.surface,p.ink);bind(meta.children[0] as SceneNode,'eventDate');
    await chip(meta,'Event venue',p.surface,p.ink);bind(meta.children[1] as SceneNode,'venue');
    const button=autoFrame('Primary CTA','HORIZONTAL',p.accent);section.appendChild(button);button.cornerRadius=999;button.paddingTop=16;button.paddingBottom=16;button.paddingLeft=24;button.paddingRight=24;bind(button,'register');
    const label=await text(button,'Register / open pass',17,mobile?210:260);label.fills=[color('#ffffff')];
    return;
  }

  const heading=await text(section,name,mobile?30:44,w-pad*2);heading.fills=[color(p.ink)];

  if(name==='About'){
    await text(section,'Tell people why this gathering matters, what they will experience, and what makes it worth showing up for.',mobile?17:20,w-pad*2,'eventDescription');
  }else if(name==='Tickets'){
    const list=autoFrame('Live ticket list','VERTICAL',p.soft);section.appendChild(list);list.paddingTop=18;list.paddingRight=18;list.paddingBottom=18;list.paddingLeft=18;list.cornerRadius=18;bind(list,'tickets');
    await card(list,'VIP','Live ticket data from PassFlow',w-pad*2-36,p.surface);
    await card(list,'Regular','Availability and price stay dynamic',w-pad*2-36,p.surface);
  }else if(name==='Schedule'){
    const list=autoFrame('Live schedule','VERTICAL',p.soft);section.appendChild(list);list.paddingTop=18;list.paddingRight=18;list.paddingBottom=18;list.paddingLeft=18;list.cornerRadius=18;bind(list,'schedule');
    await card(list,'10:00 · Doors open','Schedule content comes from PassFlow',w-pad*2-36,p.surface);
    await card(list,'11:00 · Main session','Keep the frame styling, replace the data',w-pad*2-36,p.surface);
  }else if(name==='Speakers'||name==='Sponsors'){
    const grid=autoFrame(name+' grid',mobile?'VERTICAL':'HORIZONTAL',p.surface);section.appendChild(grid);grid.itemSpacing=14;bind(grid,name==='Speakers'?'speakers':'sponsors');
    const cardWidth=mobile?w-pad*2:(w-pad*2-28)/3;
    for(let i=0;i<3;i++)await card(grid,name==='Speakers'?'Speaker '+(i+1):'Sponsor '+(i+1),name==='Speakers'?'Role / company':'Partner',cardWidth,p.soft);
  }else if(name==='Venue'){
    const venue=await text(section,'Event venue',mobile?22:28,w-pad*2,'venue');venue.fills=[color(p.ink)];
    const note=await text(section,'Arrival details, address, accessibility, and entry notes can live here.',mobile?16:18,w-pad*2);note.opacity=.65;
  }else if(name==='Venue Map'){
    const map=autoFrame('Venue map','VERTICAL',p.soft);section.appendChild(map);map.resize(w-pad*2,mobile?260:360);map.counterAxisSizingMode='FIXED';map.paddingTop=24;map.paddingRight=24;map.paddingBottom=24;map.paddingLeft=24;map.cornerRadius=20;bind(map,'venueMap');
    await text(map,'Venue map',mobile?24:32,w-pad*2-48);
    const hint=await text(map,'PassFlow links this block to the event venue.',15,w-pad*2-48);hint.opacity=.6;
  }else if(name==='FAQ'){
    await card(section,'What should I bring?','Your event pass, ready on your phone.',w-pad*2,p.soft);
    await card(section,'Where do I enter?','Use the gate shown in your attendee instructions.',w-pad*2,p.soft);
  }else if(name==='CTA'){
    const button=autoFrame('Primary CTA','HORIZONTAL',p.accent);section.appendChild(button);button.cornerRadius=999;button.paddingTop=16;button.paddingBottom=16;button.paddingLeft=24;button.paddingRight=24;bind(button,'register');
    const label=await text(button,'Register / open pass',17,mobile?210:260);label.fills=[color('#ffffff')];
  }else if(name==='Footer'){
    const copy=await text(section,'Made for people. Designed by you.',mobile?16:18,w-pad*2);copy.opacity=.65;
  }
}
async function template(style:TemplateStyle){
  await ensureFont();
  const p=palette(style),created:FrameNode[]=[];
  for(const role of ['desktop','mobile'] as const){
    const frame=figma.createFrame();
    figma.currentPage.appendChild(frame);
    frame.name='PassFlow Website · '+(role==='desktop'?'Desktop 1440':'Mobile 390');
    frame.resize(role==='desktop'?1440:390,100);
    frame.layoutMode='VERTICAL';
    frame.primaryAxisSizingMode='AUTO';
    frame.counterAxisSizingMode='FIXED';
    frame.itemSpacing=0;
    frame.fills=[color(p.bg)];
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
    if('opacity' in node&&node.opacity<1)warnings.push('Layer opacity is simplified. Review translucent layers in Preview.');
    if('rotation' in node&&Math.abs(node.rotation)>.1&&!binding)warnings.push('Rotated artwork is simplified. Review its position in Preview.');
    const children='children' in node?node.children:null;
    if(children&&Array.isArray(paints)&&paints.some(p=>p.type==='IMAGE'||p.type.startsWith('GRADIENT')))warnings.push('Image/gradient fills on containers are simplified. Use an image layer for detailed artwork.');
    if('clipsContent' in node&&node.clipsContent)warnings.push('Clipped content is simplified. Review masks in Preview.');
    const buttonText=children?.find(n=>n.type==='TEXT');
    const id=node.getSharedPluginData(NS,'id')||node.id;
    const output:NodeOutput={
      id:nodes.some(n=>n.id===id)?node.id:id,parentId,type:textNode?'text':'box',
      x:box.x-parentBox.x,y:box.y-parentBox.y,width:box.width,height:box.height,
      text:textNode?.characters??(buttonText?.type==='TEXT'?buttonText.characters:''),
      fill:hex(paints),hasFill:Array.isArray(paints)&&paints.some(p=>p.visible!==false),
      color:hex(textNode?.fills??(buttonText?.type==='TEXT'?buttonText.fills:undefined),'#171717'),
      fontSize:textNode&&typeof textNode.fontSize==='number'?textNode.fontSize:buttonText?.type==='TEXT'&&typeof buttonText.fontSize==='number'?buttonText.fontSize:20,
      fontFamily:textNode&&textNode.fontName!==figma.mixed?textNode.fontName.family:'Inter',
      radius:'cornerRadius' in node&&typeof node.cornerRadius==='number'?node.cornerRadius:0,
      align:textNode?.textAlignHorizontal==='CENTER'?'center':textNode?.textAlignHorizontal==='RIGHT'?'right':binding==='register'||binding==='myPass'?'center':'left',
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
      const png=await node.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}});
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
figma.on('currentpagechange',()=>{
  if(timer)clearTimeout(timer);
  confirmed=false;
  status(session?'Confirm event':'Disconnected','Current page changed. Confirm the linked event before this page can sync.');
  selectionState();
});
figma.on('documentchange',()=>{if(!mutating)schedule();});
selectionState();

figma.ui.onmessage=async(message:Message)=>{
  if(syncing||commandPending){status('Working','Wait for the current operation to finish.');return;}
  commandPending=true;
  try{
    if(message.type==='pair'){
      const result=await api('pair',{code:message.code,documentId,fileName:figma.root.name,fileKey:figma.fileKey??null});
      session={token:result.token,documentId,eventId:result.eventId,eventName:result.eventName,revision:0};
      await figma.clientStorage.setAsync(storageKey,session);
      figma.root.setSharedPluginData(NS,'eventId',session.eventId);
      figma.root.setSharedPluginData(NS,'eventName',session.eventName);
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
      bind(node,message.binding);
      node.setSharedPluginData(NS,'href',message.binding==='customLink'?message.href:'');
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
