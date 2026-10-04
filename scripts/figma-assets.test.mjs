import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
const code=ts.transpileModule(fs.readFileSync('lib/figma-assets.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText.replace(/require\("server-only"\);?/,'');
const mod={exports:{}};vm.runInNewContext(code,{require,exports:mod.exports,module:mod,Buffer});
const {hoistFigmaImages}=mod.exports;

function fakeServer(){
  const stored=new Map(),uploads=[];
  const bucket={async exists(path){return {data:stored.has(path)};},async upload(path,bytes,opts){uploads.push({path,opts});stored.set(path,bytes);return {error:null};},getPublicUrl(path){return {data:{publicUrl:'https://tghllarxwuhdbmtfewsa.supabase.co/storage/v1/object/public/event-assets/'+path}};}};
  return {server:{storage:{from:name=>{assert.equal(name,'event-assets');return bucket;}}},uploads};
}
const png='data:image/png;base64,'+Buffer.from([0x89,0x50,0x4e,0x47,1,2,3]).toString('base64');

test('inline images move to event-assets once, by content hash',async()=>{
  const {server,uploads}=fakeServer();
  const site={desktop:{nodes:[{id:'a',image:png},{id:'b',bg:{image:png,fit:'cover'}},{id:'c',image:'https://tghllarxwuhdbmtfewsa.supabase.co/storage/v1/object/public/event-assets/e/figma/x.png'}]},pages:[{desktop:{nodes:[{id:'d',image:png}]}}]};
  const passes=[{kind:'id_card',document:{layers:[{id:'figma-background',src:png}]}}];
  await hoistFigmaImages(server,'event-1',site,passes);
  assert.equal(uploads.length,1,'identical artwork uploads once');
  assert.match(uploads[0].path,/^event-1\/figma\/[0-9a-f]{64}\.png$/);
  for(const v of [site.desktop.nodes[0].image,site.desktop.nodes[1].bg.image,site.pages[0].desktop.nodes[0].image,passes[0].document.layers[0].src])assert.match(v,/^https:\/\/.+\/event-assets\/event-1\/figma\//);
  await hoistFigmaImages(server,'event-1',structuredClone({desktop:{nodes:[{id:'a',image:png}]}}),[]);
  assert.equal(uploads.length,1,'already stored artwork is not uploaded again');
});

test('unsafe or oversized inline images are refused',async()=>{
  const {server}=fakeServer();
  await assert.rejects(()=>hoistFigmaImages(server,'e',{desktop:{nodes:[{id:'a',image:'data:image/svg+xml;base64,PHN2Zz4='}]}},[]),/invalid_image/);
  const big='data:image/png;base64,'+Buffer.alloc(5*1024*1024+1).toString('base64');
  await assert.rejects(()=>hoistFigmaImages(server,'e',{desktop:{nodes:[{id:'a',image:big}]}},[]),/image_too_large/);
});
