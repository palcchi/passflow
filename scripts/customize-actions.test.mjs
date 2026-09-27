import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL('../app/admin/actions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(responses) {
  const writes = [], paths = [], filters = [];
  const supabase = { rpc: async () => ({ data: true, error: null }), from: () => {
    const q = { update: v => { writes.push(v); return q; }, select: () => q, eq: (key, value) => { filters.push([key,value]); return q; }, single: async () => responses.shift() };
    return q;
  }};
  const exports = {};
  const mockedRequire = name => name === 'crypto' ? require(name) : name === 'next/cache' ? { revalidatePath: p => paths.push(p) } : name === 'next/navigation' ? { redirect: p => { throw new Error(p); } } : name === '@/lib/auth/session' ? { requireOrganizerMembership: async () => ({ supabase }) } : name === '@/lib/events' ? { defaultEventTheme: { primary:'#333333',secondary:'#eeeeee',background:'#ffffff',foreground:'#111111',surface:'#ffffff',headerStyle:'editorial' } } : {};
  new Function('require','exports',source)(mockedRequire,exports);
  return { actions: exports, writes, paths, filters };
}
function form(values={}) { const f=new FormData();Object.entries({eventId:'evt_owned',...values}).forEach(([k,v])=>f.set(k,v));return f; }
test('theme save reports database rejection and does not revalidate a failed write', async () => {
  const s=setup([{data:null,error:{message:'write rejected'}}]);
  assert.equal((await s.actions.saveEventTheme(form())).ok,false);assert.deepEqual(s.paths,[]);assert.deepEqual(s.filters,[['id','evt_owned']]);
});
test('theme save succeeds only when an updated event was returned', async () => {
  for(const response of [{data:null,error:null},{data:{slug:'owned-event'},error:null}]) {
    const s=setup([response]);const result=await s.actions.saveEventTheme(form());assert.equal(result.ok,!!response.data);
    assert.equal(s.paths.includes('/e/owned-event'),!!response.data);
  }
  const s=setup([]);assert.equal((await s.actions.saveEventTheme(form({primary:'not-a-color'}))).ok,false);assert.equal(s.writes.length,0);
});
test('QR save stops when existing config cannot be loaded', async () => {
  const s=setup([{data:null,error:{message:'read rejected'}}]);assert.equal((await s.actions.saveEventQrConfig(form())).ok,false);assert.equal(s.writes.length,0);
});
test('QR update retains claim mode and uploaded template, and reports write failure', async () => {
  for(const fail of [false,true]) {
    const s=setup([{data:{slug:'owned-event',qr_config:{claim_mode:'claim',template_url:'https://example.test/pass.png'}},error:null},{data:fail?null:{id:'evt_owned'},error:fail?{message:'rejected'}:null}]);
    const result=await s.actions.saveEventQrConfig(form({mode:'wristband',widthMm:'240',heightMm:'25',qrX:'85',qrY:'50',qrSize:'8'}));
    assert.equal(result.ok,!fail);assert.equal(s.writes[0].qr_config.claim_mode,'claim');assert.equal(s.writes[0].qr_config.template_url,'https://example.test/pass.png');assert.equal(s.writes[0].qr_config.width_mm,240);assert.equal(s.paths.length>0,!fail);
  }
});
