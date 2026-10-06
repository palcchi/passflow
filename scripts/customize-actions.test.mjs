import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL('../app/organizer/events/actions.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(readResponses = [], rpcResponse = { data: { draft: true }, error: null }) {
  const writes = [], paths = [];
  const supabase = {
    rpc: async (name, args) => {
      if (name === 'is_event_manager') return { data: true, error: null };
      writes.push({ name, args }); return rpcResponse;
    },
    from: () => {
      const query = { select: () => query, eq: () => query,
        single: async () => readResponses.shift(), maybeSingle: async () => readResponses.shift() };
      return query;
    },
  };
  const exports = {};
  const mockedRequire = name => name === 'crypto' ? require(name)
    : name === 'next/cache' ? { revalidatePath: path => paths.push(path) }
    : name === 'next/navigation' ? { redirect: path => { throw new Error(path); } }
    : name === '@/lib/auth/session' ? { requireOrganizerMembership: async () => ({ supabase }) }
    : name === '@/lib/events' ? { defaultEventTheme: { primary:'#333333',secondary:'#eeeeee',background:'#ffffff',foreground:'#111111',surface:'#ffffff',headerStyle:'editorial' } }
    : {};
  new Function('require','exports',source)(mockedRequire,exports);
  return { actions: exports, writes, paths };
}
function form(values={}) { const data=new FormData();Object.entries({eventId:'evt_owned',...values}).forEach(([key,value])=>data.set(key,value));return data; }

test('theme save stages draft and does not revalidate a failed RPC', async () => {
  const failed=setup([], { data:null,error:{message:'write rejected'} });
  assert.equal((await failed.actions.saveEventTheme(form())).ok,false);
  assert.deepEqual(failed.paths,[]);
  assert.equal(failed.writes[0].name,'stage_event_config');
  const saved=setup();
  assert.equal((await saved.actions.saveEventTheme(form())).ok,true);
  assert.equal(saved.writes[0].args.p_patch.theme.primary,'#333333');
  assert.ok(saved.paths.includes('/organizer/events/evt_owned'));
  const invalid=setup();
  assert.equal((await invalid.actions.saveEventTheme(form({primary:'invalid'}))).ok,false);
  assert.equal(invalid.writes.length,0);
});

test('QR save requires current config, retains the draft claim mode and only changes the format', async () => {
  const missing=setup([{data:null,error:{message:'read rejected'}},{data:null,error:null}]);
  assert.equal((await missing.actions.saveEventQrConfig(form())).ok,false);
  assert.equal(missing.writes.length,0);
  const current={data:{slug:'owned-event',qr_config:{claim_mode:'automatic'}},error:null};
  const draft={data:{config:{qr_config:{claim_mode:'claim',template_url:'https://example.test/pass.png'}}},error:null};
  const saved=setup([current,draft]);
  const input=form({mode:'wristband'});
  assert.equal((await saved.actions.saveEventQrConfig(input)).ok,true);
  const patch=saved.writes[0].args.p_patch.qr_config;
  assert.equal(patch.claim_mode,'claim');
  assert.equal(patch.template_url,'https://example.test/pass.png');
  assert.equal(patch.mode,'wristband');
  assert.equal(patch.width_mm,undefined,'layout comes from Figma, not this form');
  const failed=setup([current,draft],{data:null,error:{message:'rejected'}});
  assert.equal((await failed.actions.saveEventQrConfig(input)).ok,false);
  assert.deepEqual(failed.paths,[]);
});
