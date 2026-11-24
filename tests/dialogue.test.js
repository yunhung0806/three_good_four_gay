import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDialogue} from '../src/dialogue.js';
test('rejects unknown characters and long input',async()=>{
 await assert.rejects(resolveDialogue({person:'stranger',input:'你好'}));
 await assert.rejects(resolveDialogue({person:'ning',input:'a'.repeat(181)}));
});
test('offline actions remain narrative only',async()=>{
 delete process.env.OPENAI_API_KEY;
 const result=await resolveDialogue({person:'ning',input:'我可以陪你複習嗎？'});
 assert.equal(result.mode,'離線備援');assert.equal(result.intent,'help');assert.equal('money' in result,false);
});
