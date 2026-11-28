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
test('rain and letter tell a complete story when both actions succeed',()=>{
  const state=fresh();
  const rain=story.resolveStoryChoice(state,'rain',0,.1,.9);
  assert.match(rain.text,/陪他走過積水的街角/);
  assert.match(story.npcStoryLine(state,'hao','原本台詞'),/還想再想想要怎麼寫/);
  state.day=2;
  assert.match(story.storyEvent(state,'rain-after').description,/終於把信寫完/);
  const letter=story.resolveStoryChoice(state,'rain-after',0,.1,.9);
  assert.match(letter.text,/親手把信投入郵筒/);
  assert.match(story.npcStoryLine(state,'hao','原本台詞'),/信已經寄出去了/);
  assert.equal(state.storyFlags['rain-after'].success,true);
});
test('rain letter stays unsent after an unsuccessful attempt or a personal decision',()=>{
  const state=fresh();
  const rain=story.resolveStoryChoice(state,'rain',1,.9,.9);
  assert.match(rain.text,/信仍留在他的口袋裡/);
  state.day=2;
  assert.match(story.storyEvent(state,'rain-after').description,/未寄出的信/);
  const letter=story.resolveStoryChoice(state,'rain-after',1,.9,.9);
  assert.match(letter.text,/把信還給他/);
  assert.doesNotMatch(story.npcStoryLine(state,'hao','原本台詞'),/信已經寄出去了/);
  assert.equal(state.storyFlags['rain-after'].success,false);
  const other=fresh();
  story.resolveStoryChoice(other,'rain',2,.1,.1);
  other.day=2;
  assert.match(story.storyEvent(other,'rain-after').description,/許浩一個人在雨中離開/);
  assert.match(story.resolveStoryChoice(other,'rain-after',2,.1,.1).text,/自己走到郵筒/);
  assert.equal(other.kindness,0);
});
test('grocery dispute changes the next scene, Mei dialogue, and the notice board outcome',()=>{
  const state=fresh();state.scene='shop';
  assert.equal(story.storyOffer(state,'shop',['mei']).id,'neighbors');
  const dispute=story.resolveStoryChoice(state,'neighbors',0,.1,.9);
  assert.match(dispute.text,/輪流預留的辦法/);
  assert.match(story.npcStoryLine(state,'mei','原本台詞'),/聽完每個人的話/);
  state.day=2;
  assert.equal(story.storyOffer(state,'shop',['mei']).id,'neighbors-after');
  assert.match(story.storyEvent(state,'neighbors-after').description,/變成了對話/);
  const board=story.resolveStoryChoice(state,'neighbors-after',0,.1,.9);
  assert.match(board.text,/我可以/);
  assert.match(story.npcStoryLine(state,'mei','原本台詞'),/留言板上又多了一張便條/);
  assert.equal(state.storyFlags['neighbors-after'].success,true);
});
test('grocery story remembers when the player leaves the dispute to Mei',()=>{
  const state=fresh();state.scene='shop';
  const dispute=story.resolveStoryChoice(state,'neighbors',2,.1,.9);
  assert.match(dispute.text,/一個能開口的地方/);
  assert.equal(state.kindness,0);
  state.day=2;
  assert.match(story.storyEvent(state,'neighbors-after').description,/美玲獨自處理爭執/);
  const board=story.resolveStoryChoice(state,'neighbors-after',2,.1,.9);
  assert.match(board.text,/找到願意寫第一張便條的人/);
  assert.equal(state.storyFlags['neighbors-after'].success,false);
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
