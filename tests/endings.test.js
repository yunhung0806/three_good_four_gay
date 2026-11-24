import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};context.window=context;
vm.runInNewContext(fs.readFileSync(new URL('../src/endings.js',import.meta.url),'utf8'),context);
const endings=context.LUMINA_ENDINGS;
test('all thirteen ending families are reachable and distinct',()=>{
 const seen=new Set();for(const rule of endings.rules){const result=endings.storyEnding(endings.endingTestState(rule.id));assert.equal(result.id,rule.id);seen.add(result.title)}assert.equal(seen.size,13);
});
test('character epilogues reflect actual event outcomes',()=>{
 const success=endings.storyEnding({storyFlags:{rain:{success:true}}});
 const uncertain=endings.storyEnding({storyFlags:{rain:{success:false}}});
 assert.notEqual(success.epilogues[0],uncertain.epilogues[0]);
});
test('the letter ending names the player action, the changed resident, and the next person helped',()=>{
 const ending=endings.storyEnding(endings.endingTestState('letter'));
 assert.equal(ending.id,'letter');
 assert.match(ending.impact.join(' '),/借出自己的傘/);
 assert.match(ending.impact.join(' '),/許浩終於寄出那封信/);
 assert.match(ending.impact.join(' '),/雨柔/);
});
test('a failed attempt is remembered without claiming success',()=>{
 const ending=endings.storyEnding({events:[{id:'a',day:1,title:'一起整理錯題',choice:'陪子寧整理錯題',owner:'ning',success:false}],links:[{from:'player',to:'ning',origin:'a'}]});
 assert.match(ending.impact[0],/還需要時間/);
 assert.doesNotMatch(ending.impact[0],/看見自己能練習的下一步/);
});
