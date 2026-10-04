import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {readFigmaWebsite,validateFigmaWebsite} from '../lib/figma-website.ts';

test('standard plugin templates serialize into valid desktop/mobile HTML documents',async()=>{
  let count=0;
  const states=[];

  function node(type){
    const metadata=new Map();
    const n={
      id:String(++count),
      type,
      name:'Layer',
      x:0,
      y:0,
      width:100,
      height:50,
      visible:true,
      children:[],
      fills:[],
      parent:null,
      layoutMode:'NONE',
      primaryAxisSizingMode:'FIXED',
      counterAxisSizingMode:'FIXED',
      itemSpacing:0,
      paddingTop:0,
      paddingRight:0,
      paddingBottom:0,
      paddingLeft:0,
      get absoluteBoundingBox(){
        const p=this.parent?.absoluteBoundingBox??{x:0,y:0};
        return {x:p.x+this.x,y:p.y+this.y,width:this.width,height:this.height};
      },
      appendChild(child){
        child.parent=this;
        if(this.layoutMode==='VERTICAL'){
          child.x=this.paddingLeft||0;
          child.y=(this.paddingTop||0)+this.children.reduce((sum,item)=>sum+item.height,0)+Math.max(0,this.children.length)*(this.itemSpacing||0);
        }else if(this.layoutMode==='HORIZONTAL'){
          child.x=(this.paddingLeft||0)+this.children.reduce((sum,item)=>sum+item.width,0)+Math.max(0,this.children.length)*(this.itemSpacing||0);
          child.y=this.paddingTop||0;
        }
        this.children.push(child);
        if(this.primaryAxisSizingMode==='AUTO'&&this.layoutSizingHorizontal!=='FILL'&&this.layoutSizingHorizontal!=='FIXED'){
          if(this.layoutMode==='VERTICAL'){
            this.height=(this.paddingTop||0)+(this.paddingBottom||0)+this.children.reduce((sum,item)=>sum+item.height,0)+Math.max(0,this.children.length-1)*(this.itemSpacing||0);
          }else if(this.layoutMode==='HORIZONTAL'){
            this.width=(this.paddingLeft||0)+(this.paddingRight||0)+this.children.reduce((sum,item)=>sum+item.width,0)+Math.max(0,this.children.length-1)*(this.itemSpacing||0);
          }
        }
      },
      resize(w,h){this.width=w;this.height=h;},
      getSharedPluginData(ns,key){return metadata.get(ns+key)??'';},
      setSharedPluginData(ns,key,value){metadata.set(ns+key,value);},
      on(){},
      off(){},
      async loadAsync(){},
      insertChild(i,child){this.appendChild(child);this.children.splice(this.children.indexOf(child),1);this.children.splice(i,0,child);},
      async exportAsync(){return new Uint8Array([1,2,3]);}
    };
    return n;
  }

  const root=node('DOCUMENT'),page=node('PAGE');
  page.selection=[];
  root.appendChild(page);

  const figma={
    root,
    currentPage:page,
    mixed:Symbol('mixed'),
    fileKey:undefined,
    createFrame:()=>node('FRAME'),
    createText:()=>node('TEXT'),
    createEllipse:()=>node('ELLIPSE'),
    createStar:()=>node('STAR'),
    loadFontAsync:async()=>{},
    viewport:{center:{x:0,y:0},scrollAndZoomIntoView(){}},
    ui:{postMessage:m=>states.push(m)},
    showUI(){},
    on(event){if(event==='documentchange')throw Error('documentchange requires loadAllPagesAsync under dynamic-page');},
    clientStorage:{getAsync:async()=>null,setAsync:async()=>{},deleteAsync:async()=>{}},
    base64Encode:data=>Buffer.from(data).toString('base64')
  };

  const source=fs.readFileSync('figma-plugin-standard/code.ts','utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
  const context=vm.createContext({figma,__html__:'',setTimeout:()=>1,clearTimeout(){},fetch:()=>{throw Error('Unexpected network request');}});
  vm.runInContext(compiled+'\nglobalThis.testApi={template,serialize,findFrames,sync};',context);

  await context.testApi.template('minimal');
  const frames=context.testApi.findFrames();

  function reflow(p){
    for(const c of p.children??[])if(c.children?.length)reflow(c);
    const flow=(p.children??[]).filter(c=>c.layoutPositioning!=='ABSOLUTE');
    const pt=p.paddingTop||0,pb=p.paddingBottom||0,pl=p.paddingLeft||0,pr=p.paddingRight||0,g=p.itemSpacing||0;
    const hugW=p.layoutSizingHorizontal!=='FILL'&&p.layoutSizingHorizontal!=='FIXED';
    if(p.layoutMode==='VERTICAL'){
      let y=pt;for(const c of flow){c.x=pl;c.y=y;y+=c.height+g;}
      if(p.primaryAxisSizingMode==='AUTO')p.height=(flow.length?y-g:y)+pb;
      if(p.counterAxisSizingMode==='AUTO'&&hugW)p.width=Math.max(0,...flow.map(c=>c.width))+pl+pr;
    }else if(p.layoutMode==='HORIZONTAL'){
      let x=pl;for(const c of flow){c.x=x;c.y=pt;x+=c.width+g;}
      if(p.primaryAxisSizingMode==='AUTO'&&hugW)p.width=(flow.length?x-g:x)+pr;
      if(p.counterAxisSizingMode==='AUTO'||p.layoutSizingVertical==='HUG')p.height=Math.max(0,...flow.map(c=>c.height))+pt+pb;
    }
  }
  reflow(frames.desktop);
  reflow(frames.mobile);
  const exported={
    schema:3,
    source:'figma',
    desktop:await context.testApi.serialize(frames.desktop,[]),
    mobile:await context.testApi.serialize(frames.mobile,[])
  };

  const document=readFigmaWebsite(exported);
  assert.ok(document);
  assert.deepEqual(validateFigmaWebsite(document),[]);
  assert.equal(frames.desktop.children.length,11);
  assert.equal(frames.mobile.children.length,11);
  assert.ok(document.desktop.nodes.some(n=>n.parentId&&n.binding==='eventName'));
  assert.ok(document.desktop.nodes.some(n=>n.binding==='venueMap'));
  assert.ok(document.desktop.nodes.some(n=>n.binding==='speakers'));
  assert.ok(document.desktop.nodes.some(n=>n.binding==='sponsors'));

  const before=document.desktop.nodes.filter(n=>n.binding).map(n=>[n.id,n.binding]);
  for(const section of frames.desktop.children)for(const child of section.children)child.name='Entirely renamed';
  const after=await context.testApi.serialize(frames.desktop,[]);
  assert.deepEqual(JSON.parse(JSON.stringify(after.nodes.filter(n=>n.binding).map(n=>[n.id,n.binding]))),before);

  await context.testApi.sync();
  assert.equal(states.at(-1).state,'Disconnected');

  assert.ok(document.desktop.nodes.some(n=>n.sticky&&n.parentId===null),'desktop navbar is sticky');
  for(const style of ['editorial','festival']){
    page.children.length=0;
    await context.testApi.template(style);
    const f=context.testApi.findFrames();reflow(f.desktop);reflow(f.mobile);
    const d=readFigmaWebsite({schema:3,source:'figma',desktop:await context.testApi.serialize(f.desktop,[]),mobile:await context.testApi.serialize(f.mobile,[])});
    assert.ok(d,style);
    assert.deepEqual(validateFigmaWebsite(d),[],style);
    assert.ok(d.mobile.nodes.some(n=>n.sticky),style+' mobile navbar is sticky');
    if(style==='festival')assert.equal(d.desktop.nodes.find(n=>n.binding==='eventName'&&n.fontSize>100).fontWeight,900);
  }
});
