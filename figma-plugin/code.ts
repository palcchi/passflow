const PLUGIN_ID='124cc7b5-d216-4cc2-8e6e-9cf5daaa62f1';
type Field='name'|'photo'|'category'|'qr'|'code'|'event_name'|'event_date'|'venue'|'cta'|'register'|'claim'|'logo';
type Kind='id_card'|'digital'|'wristband';
type Message={type:'resize';height:number}|{type:'insert'|'mark';kind:Field}|{type:'preset';kind:Kind}|{type:'export';kind:Kind;width:number;height:number};
const labels:Record<Field,string>={name:'Participant name',photo:'Participant photo',category:'Ticket category',qr:'QR code',code:'Participant code',event_name:'Event name',event_date:'Event date',venue:'Event venue',cta:'PassFlow button',register:'Register button',claim:'Claim pass button',logo:'Event logo'};
const mm=96/25.4;
let busy=false;
function report(kind:'success'|'error',text:string){figma.ui.postMessage({type:'status',kind,text});}
function paint(hex:string):SolidPaint{return {type:'SOLID',color:{r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255}};}
function marker(field:Field){return 'PASSFLOW_'+field.toUpperCase();}
function relaunch(node:BaseNode){node.setRelaunchData({[PLUGIN_ID]:'Open PassFlow Design'});}
function place(node:SceneNode){figma.currentPage.appendChild(node);node.x=figma.viewport.center.x-node.width/2;node.y=figma.viewport.center.y-node.height/2;figma.currentPage.selection=[node];relaunch(node);figma.viewport.scrollAndZoomIntoView([node]);}
async function textNode(field:Field){
  const font={family:'Inter',style:['cta','register','claim'].includes(field)?'Semi Bold':'Regular'};
  await figma.loadFontAsync(font);const node=figma.createText();node.fontName=font;
  const samples:Partial<Record<Field,string>>={name:'Alexandra Morgan',category:'VIP',code:'PF-000001',event_name:'Your event name',event_date:'27 September 2026',venue:'Event venue',cta:'Open event',register:'Register now',claim:'Claim pass'};
  node.characters=samples[field]??labels[field];node.fontSize=field==='event_name'?28:field==='name'?22:16;node.name=marker(field);node.setPluginData('passflow-field',field);node.fills=[paint('#171717')];node.textAutoResize='WIDTH_AND_HEIGHT';return node;
}
async function insert(field:Field){
  if(field==='photo'||field==='logo'){const node=figma.createEllipse();node.name=marker(field);node.setPluginData('passflow-field',field);node.resize(180,180);node.fills=[paint('#e6e5df')];node.strokes=[paint('#b9b8b0')];place(node);return;}
  if(['qr','cta','register','claim'].includes(field)){
    const node=figma.createFrame();node.name=marker(field);node.setPluginData('passflow-field',field);node.resize(220,field==='qr'?220:52);node.cornerRadius=field==='qr'?0:12;node.fills=[paint(field==='qr'?'#ffffff':'#171717')];
    const text=await textNode(field==='qr'?'code':field);text.setPluginData('passflow-field','');text.name='Label';if(field==='qr')text.characters='QR CODE';text.fills=[paint(field==='qr'?'#171717':'#ffffff')];node.appendChild(text);text.x=(node.width-text.width)/2;text.y=(node.height-text.height)/2;place(node);return;
  }
  place(await textNode(field));
}
async function preset(kind:Kind){
  const [w,h]=kind==='wristband'?[240,25]:[54,85.6];
  await figma.loadFontAsync({family:'Inter',style:'Regular'});
  const frame=figma.createFrame();frame.name='PassFlow '+kind.replace('_',' ');frame.resize(w*mm,h*mm);frame.fills=[paint('#ffffff')];frame.setPluginData('passflow-kind',kind);
  const qr=figma.createRectangle();frame.appendChild(qr);qr.name='PASSFLOW_QR';qr.setPluginData('passflow-field','qr');qr.resize(18*mm,18*mm);qr.x=(w-21)*mm;qr.y=(h-21)*mm;qr.fills=[paint('#171717')];
  const name=await textNode('name');frame.appendChild(name);name.fontSize=14;name.x=5*mm;name.y=5*mm;place(frame);report('success','Starter frame created. Customize the artwork, then export the whole frame.');
}
function visibleWithin(node:SceneNode,frame:SceneNode){let current:BaseNode|null=node;while(current&&current!==frame){if('visible' in current&&!current.visible)return false;current=current.parent;}return true;}
async function exportFrame(message:Extract<Message,{type:'export'}>){
  const selection=figma.currentPage.selection;const source=selection[0];
  if(selection.length!==1||!source||!['FRAME','COMPONENT'].includes(source.type)||!('findAll' in source))throw Error('Select exactly one frame or component.');
  const {width,height,kind}=message;if(!Number.isFinite(width)||!Number.isFinite(height)||width<20||width>500||height<20||height>500)throw Error('Physical dimensions must be between 20 and 500 mm.');
  if(Math.abs(width/height-source.width/source.height)>.02)throw Error('Match the physical dimensions to the selected frame aspect ratio.');
  const frame=source.clone();
  try{
    const bounds=frame.absoluteBoundingBox;if(!bounds)throw Error('The frame has no usable bounds.');
    const sx=width/frame.width,sy=height/frame.height;const warnings:string[]=[];
    const all=frame.findAll();if(all.length>3000)throw Error('Use a frame with fewer than 3,000 layers.');
    const mapped:Array<{node:SceneNode;field:Field}>=[];
    for(const node of all){const raw=node.getPluginData('passflow-field')||(node.name.startsWith('PASSFLOW_')?node.name.slice(9).toLowerCase():'');if(Object.prototype.hasOwnProperty.call(labels,raw)&&visibleWithin(node,frame))mapped.push({node,field:raw as Field});}
    if(mapped.length>59)throw Error('Use at most 59 dynamic layers.');
    const layers=[];
    for(const {node,field} of mapped){
      if(['cta','register','claim'].includes(field)){warnings.push('Button artwork is static in pass exports. Use website sections for live registration buttons.');continue;}
      const box=node.absoluteBoundingBox;if(!box)continue;
      if('rotation' in node&&Math.abs(node.rotation)>.01)throw Error('Remove rotation from dynamic layers before export.');
      if(node.type==='TEXT'&&(typeof node.fontSize!=='number'||node.fontName===figma.mixed))throw Error('Use one font size and font family per dynamic text layer.');
      const solid=node.type==='TEXT'&&node.fills!==figma.mixed?node.fills.find(p=>p.type==='SOLID'):null;
      const hex=solid?.type==='SOLID'?'#'+[solid.color.r,solid.color.g,solid.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''):'#171717';
      if(node.type==='TEXT'&&node.fontName!==figma.mixed&&node.fontName.family!=='Arial')warnings.push('Dynamic text uses Arial in PassFlow; static artwork preserves its original fonts.');
      layers.push({id:node.id,type:field==='qr'?'qr':['photo','logo'].includes(field)?'image':'text',field:field==='qr'?'text':field,text:'',src:'',x:(box.x-bounds.x)*sx,y:(box.y-bounds.y)*sy,width:box.width*sx,height:box.height*sy,fontSize:node.type==='TEXT'&&typeof node.fontSize==='number'?node.fontSize*sx:4,color:hex,fill:'#ffffff',radius:0,align:node.type==='TEXT'&&node.textAlignHorizontal==='CENTER'?'center':node.type==='TEXT'&&node.textAlignHorizontal==='RIGHT'?'right':'left',locked:false,hidden:false});
      if('opacity' in node)node.opacity=0;
    }
    const qr=layers.filter(l=>l.type==='qr');if(qr.length!==1)throw Error('Map exactly one visible QR placeholder.');
    if(qr[0].width<15||Math.abs(qr[0].width-qr[0].height)>.05)throw Error('QR must be square and at least 15 mm wide.');
    for(const l of layers){if(l.x<0||l.y<0||l.x+l.width>width+.05||l.y+l.height>height+.05)throw Error('Keep every dynamic layer inside the frame.');}
    const png=await frame.exportAsync({format:'PNG',constraint:{type:'SCALE',value:2}});const src='data:image/png;base64,'+figma.base64Encode(png);
    if(src.length>450000)throw Error('Background exceeds 450 KB. Reduce image complexity or use a smaller frame.');
    layers.unshift({id:'figma-background',type:'image',field:'text',text:'',src,x:0,y:0,width,height,fontSize:4,color:'#171717',fill:'#ffffff',radius:0,align:'left',locked:true,hidden:false});
    figma.ui.postMessage({type:'bundle',bundle:{name:source.name,kind,source:'figma-plugin',warnings:[...new Set(warnings)],document:{schema:1,width,height,background:'#ffffff',foreground:'#171717',accent:'#635bff',font:'sans',layers,sections:[]}}});
    relaunch(source);report('success','Draft exported. Import it in your event’s Design studio, preview with sample data, then publish.');
  }finally{frame.remove();}
}
figma.showUI(__html__,{width:380,height:740,themeColors:true});relaunch(figma.root);
function selection(){const node=figma.currentPage.selection[0];figma.ui.postMessage({type:'selection',name:node?.name??'Nothing selected',single:figma.currentPage.selection.length===1,frame:figma.currentPage.selection.length===1&&!!node&&['FRAME','COMPONENT'].includes(node.type)});}
figma.on('selectionchange',selection);selection();
figma.ui.onmessage=async(message:Message)=>{
  if(message.type==='resize'){figma.ui.resize(380,Math.max(300,Math.min(900,Math.round(message.height))));return;}
  if(busy)return;busy=true;figma.ui.postMessage({type:'busy',value:true});
  try{
    if(message.type==='insert'||message.type==='mark'){
      if(!Object.prototype.hasOwnProperty.call(labels,message.kind))throw Error('Choose a valid field.');
      if(message.type==='insert'){await insert(message.kind);report('success',labels[message.kind]+' inserted.');}
      else{const nodes=figma.currentPage.selection;if(nodes.length!==1)throw Error('Select exactly one layer.');nodes[0].name=marker(message.kind);nodes[0].setPluginData('passflow-field',message.kind);relaunch(nodes[0]);report('success','Selected layer mapped to '+labels[message.kind]+'.');}
    }else if(message.type==='preset'||message.type==='export'){
      if(!['id_card','digital','wristband'].includes(message.kind))throw Error('Choose a valid format.');
      if(message.type==='preset')await preset(message.kind);else await exportFrame(message);
    }
  }catch(error){report('error',error instanceof Error?error.message:'The action could not be completed.');}
  finally{busy=false;figma.ui.postMessage({type:'busy',value:false});selection();}
};
