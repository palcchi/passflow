import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
const stored=new Map(),uploads=[];
const code=ts.transpileModule(fs.readFileSync('lib/figma-assets.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText.replace(/require\(["']server-only["']\);?/,'');
const mod={exports:{}};
const fakeRequire=(name)=>{
  if(name==='crypto')return require('node:crypto');
  if(name==='server-only')return {};
  if(name==='@/lib/storage/local-files')return {
    async saveLocalObject(bucket,path,bytes){
      const key=bucket+'/'+path;
      if(stored.has(key)){const error=new Error('exists');error.code='EEXIST';throw error;}
      stored.set(key,Buffer.from(bytes));uploads.push({bucket,path,bytes:Buffer.from(bytes)});
      return {path,publicUrl:localPublicUrl(bucket,path)};
    },
    localPublicUrl,
  };
  throw new Error('unexpected_import:'+name);
};
function localPublicUrl(bucket,path){return 'https://passflow.test/api/local-files/'+bucket+'/'+path;}
vm.runInNewContext(code,{require:fakeRequire,exports:mod.exports,module:mod,Buffer,process,URL});
const {hoistFigmaImages}=mod.exports;
process.env.NEXT_PUBLIC_APP_URL='https://passflow.test';
const png='data:image/png;base64,'+Buffer.from([0x89,0x50,0x4e,0x47,1,2,3]).toString('base64');

test('inline images move to local event-assets once, by content hash',async()=>{
  stored.clear();uploads.length=0;
  const site={desktop:{nodes:[{id:'a',image:png},{id:'b',bg:{image:png,fit:'cover'}},{id:'c',image:'https://passflow.test/api/local-files/event-assets/e/figma/x.png'}]},pages:[{desktop:{nodes:[{id:'d',image:png}]}}]};
  const passes=[{kind:'id_card',document:{layers:[{id:'figma-background',src:png}]}}];
  await hoistFigmaImages({},'event-1',site,passes);
  assert.equal(uploads.length,1,'identical artwork uploads once');
  assert.match(uploads[0].path,/^event-1\/figma\/[0-9a-f]{64}\.png$/);
  for(const v of [site.desktop.nodes[0].image,site.desktop.nodes[1].bg.image,site.pages[0].desktop.nodes[0].image,passes[0].document.layers[0].src])assert.match(v,/^https:\/\/passflow\.test\/api\/local-files\/event-assets\/event-1\/figma\//);
  await hoistFigmaImages({},'event-1',structuredClone({desktop:{nodes:[{id:'a',image:png}]}}),[]);
  assert.equal(uploads.length,1,'already stored artwork is not uploaded again');
});

test('unsafe or oversized inline images are refused',async()=>{
  await assert.rejects(()=>hoistFigmaImages({},'e',{desktop:{nodes:[{id:'a',image:'data:image/svg+xml;base64,PHN2Zz4='}]}},[]),/invalid_image/);
  const big='data:image/png;base64,'+Buffer.alloc(5*1024*1024+1).toString('base64');
  await assert.rejects(()=>hoistFigmaImages({},'e',{desktop:{nodes:[{id:'a',image:big}]}},[]),/image_too_large/);
});
