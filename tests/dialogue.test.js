import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDialogue} from '../src/dialogue.js';
test('rejects unknown characters, wrong types, and long input',async()=>{
  await assert.rejects(resolveDialogue({person:'stranger',input:'你好'}));
  await assert.rejects(resolveDialogue({person:['ning'],input:'你好'}));
  await assert.rejects(resolveDialogue(null));
  await assert.rejects(resolveDialogue({person:'ning',input:'a'.repeat(181)}));
  await assert.rejects(resolveDialogue({person:'ning',input:'😀'.repeat(181)}));
});
test('offline actions remain narrative only and share the browser rules',async()=>{
  const previous=process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try{
    const help=await resolveDialogue({person:'ning',input:'我可以陪你複習嗎？'});
    assert.equal(help.mode,'離線備援');assert.equal(help.intent,'help');assert.equal('money' in help,false);
    const harm=await resolveDialogue({person:'ning',input:'我要打他'});
    assert.equal(harm.intent,'harm');assert.equal(harm.emotion,'angry');
    for(const phrase of ['加油打氣','搶救傷者','偷笑']){
      const safe=await resolveDialogue({person:'ning',input:phrase});
      assert.notEqual(safe.intent,'harm',phrase);
    }
    const question=await resolveDialogue({person:'ning',input:'需要我幫忙嗎？'});
    assert.equal(question.intent,'talk');
    const safe=await resolveDialogue({person:'ning',input:'你好',history:[null,{role:'user',content:'hi'}]});
    assert.equal(safe.reply.length>0,true);
  }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous}
});
