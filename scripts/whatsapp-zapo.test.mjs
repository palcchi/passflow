import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
process.env.NEXT_PUBLIC_APP_URL = 'https://passflow.test';
process.env.ZAPO_BASE_URL = 'https://zapo.test/';
process.env.ZAPO_API_KEY = 'test-only-key';
process.env.WHATSAPP_TICKET_DELIVERY_ENABLED = 'true';

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, init = {}) => {
  requests.push({ url: String(url), init, body: JSON.parse(String(init.body ?? '{}')) });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const source=fs.readFileSync(new URL('../lib/whatsapp/zapo.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText.replace(/require\(["']server-only["']\);?/,'');
const mod={exports:{}};
const fakeRequire=(name)=>name==='qrcode'?require('qrcode'):name==='server-only'?{}:(()=>{throw new Error('unexpected_import:'+name)})();
vm.runInNewContext(code,{require:fakeRequire,exports:mod.exports,module:mod,process,URL,AbortSignal,fetch:(...args)=>globalThis.fetch(...args)});
const {sendTicketQrWhatsApp}=mod.exports;

test('ticket QR is generated locally and sent as an image without exposing API credentials in payload', async () => {
  requests.length = 0;
  const result = await sendTicketQrWhatsApp({
    phone: '+62 812-3456-7890',
    eventName: 'PassFlow Test Event',
    eventSlug: 'passflow-test',
    credentialCode: 'credential-test-code',
  });
  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://zapo.test/send/image');
  assert.equal(requests[0].body.to, '6281234567890');
  assert.equal(requests[0].body.mime, 'image/png');
  assert.match(requests[0].body.base64, /^[A-Za-z0-9+/]+=*$/);
  assert.match(requests[0].body.caption, /Keep it private/);
  assert.equal(requests[0].init.headers.Authorization, 'Bearer test-only-key');
  assert.equal(JSON.stringify(requests[0].body).includes('test-only-key'), false);
});

test('missing credential sends only a claim-page link, and invalid phone never calls the gateway', async () => {
  requests.length = 0;
  assert.equal((await sendTicketQrWhatsApp({ phone: '6281234567890', eventName: 'Event', eventSlug: 'event-one' })).ok, true);
  assert.equal(requests[0].url, 'https://zapo.test/send/text');
  assert.match(requests[0].body.text, /https:\/\/passflow\.test\/e\/event-one\/claim/);
  requests.length = 0;
  const invalid = await sendTicketQrWhatsApp({ phone: 'bad-number', eventName: 'Event', eventSlug: 'event-one' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, 'invalid_phone');
  assert.equal(requests.length, 0);
});

test('disabled delivery never contacts the gateway', async () => {
  requests.length = 0;
  process.env.WHATSAPP_TICKET_DELIVERY_ENABLED = 'false';
  const disabled = await sendTicketQrWhatsApp({ phone: '6281234567890', eventName: 'Event', eventSlug: 'event-one' });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.reason, 'delivery_disabled');
  assert.equal(requests.length, 0);
  process.env.WHATSAPP_TICKET_DELIVERY_ENABLED = 'true';
});

test.after(() => { globalThis.fetch = originalFetch; });
