import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyFigmaWebhook} from '../lib/figma-webhook.ts';
test('webhooks verify passcode, subscription and file scope',()=>{
 const passcode='a'.repeat(40),configuration=JSON.stringify({'42':{passcode,fileKey:'file123'}}),body={webhook_id:'42',passcode,event_type:'FILE_UPDATE',file_key:'file123'};
 assert.equal(verifyFigmaWebhook(body,configuration),true);
 for(const overrides of [{passcode:'wrong'},{webhook_id:'43'},{file_key:'another'},{event_type:'FILE_DELETE'}])assert.equal(verifyFigmaWebhook({...body,...overrides},configuration),false);
 assert.equal(verifyFigmaWebhook({...body,event_type:'PING',file_key:undefined},configuration),true);
 assert.equal(verifyFigmaWebhook(body,undefined),false);assert.equal(verifyFigmaWebhook(body,'bad JSON'),false);
});
