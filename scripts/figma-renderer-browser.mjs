// Local renderer verification; no development server or deployment is created.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium} from 'playwright';
const require=createRequire(import.meta.url);
const code=ts.transpileModule(fs.readFileSync('components/figma-website-renderer.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const exportsObject={};vm.runInNewContext(code,{require,exports:exportsObject});
const node=(id,binding,text,x,y,width,height,fontSize=24)=>({id,binding,text,type:'box',x,y,width,height,fontSize,fontFamily:'Arial',radius:20,color:'#171717',fill:'#eeedf9',align:'left',href:'',image:''});
const frame=(width)=>({width,height:850,background:'#ffffff',nodes:[node('title','eventName','',24,36,width-48,180,width<600?42:72),node('about','eventDescription','',24,240,width-48,100),{...node('cta','register','Register now',24,370,280,64),fill:'#635bff',color:'#ffffff',align:'center'},node('tickets','tickets','',24,480,width-48,240),{...node('jump','customLink','See tickets',24,760,200,60),href:'#tickets'}]});
const document={schema:2,source:'figma',desktop:frame(1440),mobile:frame(390),warnings:[]};
const data={name:'Discoveries 2026',description:'Designed by you. Powered by PassFlow.',date:'12 October',venue:'Jakarta',claimUrl:'https://passflow.my.id/e/discoveries/claim',tickets:[{id:'1',name:'General admission',price:250000,currency:'IDR'}]};
const css=fs.readFileSync('app/management-design.css','utf8');
const html=(preview=false)=>'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial}a{color:inherit;text-decoration:none}'+css+'</style></head><body>'+renderToStaticMarkup(React.createElement(exportsObject.FigmaWebsiteRenderer,{document,data,preview}))+'</body></html>';
(async()=>{
 const executablePath=process.env.PASSFLOW_TEST_CHROMIUM;
 const argsModule=process.env.PASSFLOW_TEST_CHROMIUM_MODULE;
 const args=argsModule?(await import(argsModule)).default.args.filter(a=>a!=='--single-process'):[];
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args});
 try{
  const page=await browser.newPage();
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:950});await page.setContent(html());
   const prefix=width<768?'mobile':'desktop';
   assert.equal(await page.locator('.figma-live-'+prefix).isVisible(),true);
   assert.equal(await page.locator(`.figma-live-${prefix} h1`).innerText(),data.name);
   assert.equal(await page.getByText('Register now',{exact:true}).filter({visible:true}).getAttribute('href'),data.claimUrl);
   assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);
   assert.equal(await page.locator('[id]').evaluateAll(elements=>new Set(elements.map(e=>e.id)).size===elements.length),true);
   await page.getByText('See tickets',{exact:true}).filter({visible:true}).click();
   assert.equal(await page.evaluate(()=>location.hash),'#'+prefix+'-tickets');
   if(process.env.PASSFLOW_TEST_SCREENSHOTS){fs.mkdirSync(process.env.PASSFLOW_TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.PASSFLOW_TEST_SCREENSHOTS,'figma-'+width+'.png'),fullPage:true});}
  }
  await page.setContent(html(true));assert.equal(await page.locator('a[href]').count(),0);
  console.log('PASS: 390/1440 responsive views, live data/actions, scoped anchors, no horizontal overflow, preview disables navigation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
