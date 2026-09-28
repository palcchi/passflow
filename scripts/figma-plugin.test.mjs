import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {readFigmaWebsite,validateFigmaWebsite} from '../lib/figma-website.ts';
test('standard plugin templates serialize into valid desktop/mobile HTML documents',async()=>{
 let count=0;const states=[];
 function node(type){const metadata=new Map();return {id:String(++count),type,name:'Layer',x:0,y:0,width:100,height:50,visible:true,children:[],fills:[],parent:null,
 get absoluteBoundingBox(){const p=this.parent?.absoluteBoundingBox??{x:0,y:0};return {x:p.x+this.x,y:p.y+this.y,width:this.width,height:this.height};},
 appendChild(child){child.parent=this;this.children.push(child);},resize(w,h){this.width=w;this.height=h;},
 getSharedPluginData(ns,key){return metadata.get(ns+key)??'';},setSharedPluginData(ns,key,value){metadata.set(ns+key,value);},
 on(){},off(){},async loadAsync(){}};}
 const root=node('DOCUMENT'),page=node('PAGE');root.appendChild(page);
 const figma={root,currentPage:page,mixed:Symbol('mixed'),fileKey:undefined,createFrame:()=>node('FRAME'),createText:()=>node('TEXT'),loadFontAsync:async()=>{},viewport:{center:{x:0,y:0},scrollAndZoomIntoView(){}},ui:{postMessage:m=>states.push(m)},showUI(){},on(){},clientStorage:{getAsync:async()=>null,setAsync:async()=>{},deleteAsync:async()=>{}},base64Encode:data=>Buffer.from(data).toString('base64')};
 const source=fs.readFileSync('figma-plugin-standard/code.ts','utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
 const context=vm.createContext({figma,__html__:'',setTimeout:()=>1,clearTimeout(){},fetch:()=>{throw Error('Unexpected network request');}});
 vm.runInContext(compiled+'\nglobalThis.testApi={template,serialize,findFrames,sync};',context);
 await context.testApi.template();
 const frames=context.testApi.findFrames();
 const exported={schema:2,source:'figma',desktop:await context.testApi.serialize(frames.desktop,[]),mobile:await context.testApi.serialize(frames.mobile,[])};
 const document=readFigmaWebsite(exported);assert.ok(document);assert.deepEqual(validateFigmaWebsite(document),[]);
 assert.equal(frames.desktop.children.length,10);assert.equal(frames.mobile.children.length,10);
 const before=document.desktop.nodes.filter(n=>n.binding).map(n=>[n.id,n.binding]);
 for(const section of frames.desktop.children)for(const child of section.children)child.name='Entirely renamed';
 const after=await context.testApi.serialize(frames.desktop,[]);
 assert.deepEqual(JSON.parse(JSON.stringify(after.nodes.filter(n=>n.binding).map(n=>[n.id,n.binding]))),before);
 await context.testApi.sync();assert.equal(states.at(-1).state,'Disconnected');
});
