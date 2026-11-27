import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};context.window=context;
vm.runInNewContext(fs.readFileSync(new URL('../src/npc-actions.js',import.meta.url),'utf8'),context);
const actions=context.LUMINA_NPC_ACTIONS;
const fresh=()=>({day:1,time:9,scene:'school',energy:100,kindness:0,principles:[],links:[],events:[],eventSerial:0,community:0});
test('selected help changes resources, memory, and the kindness network once',()=>{
 const state=fresh(),result=actions.resolveNpcAction(state,'ning','help',.1,.1);
 assert.equal(result.type,'action');assert.equal(result.success,true);
 assert.equal(state.kindness,1);assert.equal(state.energy,95);
 assert.ok(state.principles.includes('給人信心'));
 assert.equal(state.links[0].from,'player');assert.equal(state.links[0].to,'ning');
  assert.equal(state.links[1].from,'ning');assert.equal(state.npcMemory.ning[0].title,'一起整理錯題');assert.ok(state.helped.includes('ning'));
 const again=actions.resolveNpcAction(state,'ning','help',.1,.1);
 assert.equal(again.type,'talk');assert.equal(state.kindness,1);
});
test('similar free text maps to the selected action; a question is only a check-in',()=>{
 const state=fresh();assert.equal(actions.matchNpcAction(state,'ning','我想陪你整理錯題'),'help');
 assert.equal(actions.matchNpcAction(state,'ning','我可以幫你做什麼？'),'checkin');
 actions.resolveNpcAction(state,'ning','checkin');assert.equal(state.kindness,0);assert.equal(state.npcTrust.ning,1);
});
test('stored trust changes the offered check-in prompt',()=>{
  const state=fresh();actions.resolveNpcAction(state,'ning','checkin');state.day=2;actions.resolveNpcAction(state,'ning','checkin');
  assert.equal(state.npcTrust.ning,2);
  assert.match(actions.npcActionPrompts(state,'ning')[0].label,/多說一點/);
});
test('dialogue choices expose a concrete follow-up after help',()=>{
 const state=fresh();assert.equal(actions.npcActionPrompts(state,'ning')[1].id,'help');
 actions.resolveNpcAction(state,'ning','help',.9,.9);
 assert.equal(actions.npcActionPrompts(state,'ning')[1].id,'reflect');
 assert.match(actions.resolveNpcAction(state,'ning','reflect').text,/上次/);
});
