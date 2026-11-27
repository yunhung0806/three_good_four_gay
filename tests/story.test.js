import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};context.window=context;
for(const file of ['world.js','story.js','npc-actions.js'])vm.runInNewContext(fs.readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8'),context);
const story=context.LUMINA_STORY;
const fresh=()=>({day:1,scene:'cafe',energy:100,events:[],eventSerial:0,kindness:0,principles:[],links:[],community:0});
test('completed NPC event stays completed and unlocks a later follow-up',()=>{
  const state=fresh();assert.equal(story.storyOffer(state,'cafe').id,'rain');
  story.resolveStoryChoice(state,'rain',0,.1,.1);
  assert.equal(state.npcMemory.hao[0].eventId,'rain');
  assert.match(story.npcStoryLine(state,'hao','原本台詞'),/雨天借傘/);
  assert.equal(story.storyOffer(state,'cafe'),null);
  state.day=2;assert.equal(story.storyOffer(state,'cafe').id,'rain-after');
  story.resolveStoryChoice(state,'rain-after',0,.1,.1);
  assert.equal(story.storyOffer(state,'cafe'),null);
  assert.throws(()=>story.resolveStoryChoice(state,'rain',0,.1,.1));
});
test('a scripted NPC help does not consume the daily story slot',()=>{
  const state=fresh();
  assert.equal(story.storyOffer(state,'cafe').id,'rain');
  context.LUMINA_NPC_ACTIONS.resolveNpcAction(state,'hao','help',.1,.1);
  assert.equal(story.storyOffer(state,'cafe').id,'rain');
  story.resolveStoryChoice(state,'rain',0,.1,.1);
  assert.ok(state.events.some(e=>e.title==='聽見疲憊'&&e.npcAction));
  assert.ok(state.events.some(e=>e.title==='雨天借傘'&&!e.npcAction));
});
test('all authored life situations have choices and later outcomes',()=>{
  const definitions=story.storyDefinitions(),generic=Object.keys(definitions).filter(id=>id.startsWith('life-')&&!id.endsWith('-after'));
  assert.equal(generic.length,29);
  for(const id of generic){assert.equal(definitions[id].choices.length,3);assert.ok(definitions[`${id}-after`])}
});
test('free dialogue can refer back to the remembered event',()=>{
  const state=fresh();story.resolveStoryChoice(state,'rain',1,.9,.9);
  assert.match(story.npcRememberedReply(state,'hao','上次之後你還好嗎？','一般回覆'),/雨天借傘/);
  state.day=2;assert.match(story.storyEvent(state,'rain-after').description,/未寄出的信/);
});
test('an event is only offered when its owner is present',()=>{
  const state=fresh();state.scene='school';
  assert.equal(story.storyOffer(state,'school',[]),null);
  assert.equal(story.storyOffer(state,'school',['ning']).id,'exam');
});
test('legacy choice records migrate for every authored story',()=>{
  const state=fresh();state.choiceSeen=['1-exam'];state.events=[{day:1,title:'考卷上的紅字',choice:'陪她找出不懂的題目',success:true}];
  story.ensureStory(state);
  assert.ok(state.storyFlags.exam);assert.equal(state.storyFlags.exam.owner,'ning');
});
