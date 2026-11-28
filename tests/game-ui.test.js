import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.children=[];this.childNodes=this.children;this.dataset={};this.style={setProperty(){}};this.classes=new Set();this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};this.firstChild={textContent:''}}
  append(...items){this.children.push(...items);this.childNodes=this.children}
  prepend(...items){this.children.unshift(...items);this.childNodes=this.children}
  replaceChildren(...items){this.children=[...items];this.childNodes=this.children}
  before(){}after(){}remove(){}setAttribute(){}focus(){}
  showModal(){this.open=true}
  close(){this.open=false}
}
function boot(options={}){
  const elements=[],ids=new Map(),keyHandlers=[];
  for(const [,tag,id] of html.matchAll(/<([a-z][\w-]*)[^>]*\bid="([^"]+)"/g)){
    const e=new Element(tag);e.id=id;ids.set(id,e);elements.push(e);
  }
  ids.get('gameScreen').hidden=true;
  const controls=new Element(),aside=new Element(),document={getElementById:id=>ids.get(id)||elements.find(e=>e.id===id)||null,createElement:tag=>{const e=new Element(tag);elements.push(e);return e},createElementNS:(_,tag)=>{const e=new Element(tag);elements.push(e);return e},querySelector:selector=>selector==='.controls'?controls:selector==='aside'?aside:null,addEventListener(type,handler){if(type==='keydown')keyHandlers.push(handler)}};
  const data=options.storage||new Map(),fetchImpl=options.fetch||(async path=>({json:async()=>path==='/api/config'?{mode:'離線備援'}:{mode:'離線備援',intent:'talk',emotion:'neutral',reply:'我聽見了。'}}));
  const context={document,location:{search:options.search??'?test=1'},URLSearchParams,localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},fetch:fetchImpl,requestAnimationFrame(){},confirm:()=>true};
  context.window=context;vm.createContext(context);
  for(const file of ['src/world.js','src/story.js','src/npc-actions.js','src/endings.js','src/offline.js','src/tilemap.js','game.js'])vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),context,{filename:file});
  function pressKey(key,options={}){
    const event={key,target:ids.get('map'),preventDefault(){this.defaultPrevented=true},...options};
    for(const handler of keyHandlers)handler(event);
    return event;
  }
  return {context,ids,elements,pressKey};
}
test('game boots, shows a story marker, and records an NPC memory through the scene flow',()=>{
  const {context,ids}=boot();assert.equal(ids.get('sceneName').textContent,'微光小鎮');assert.equal(ids.get('map').children[0].tagName,'CANVAS');
  vm.runInContext("enter('cafe')",context);assert.equal(ids.get('sceneName').textContent,'微光咖啡館');
  assert.equal(vm.runInContext("objects().find(o=>o.id==='scene-event').name",context),'雨天借傘');
  vm.runInContext("openChoiceEvent('rain')",context);assert.equal(ids.get('speaker').textContent,'雨天借傘');
  vm.runInContext("LUMINA_STORY.resolveStoryChoice(state,'rain',0,.1,.1);render()",context);
  assert.equal(vm.runInContext("state.npcMemory.hao[0].title",context),'雨天借傘');
  assert.equal(ids.has('journal'),false);
  assert.equal(ids.has('principles'),false);
});
test('returning from a house appears where the player entered it',()=>{
  const {context}=boot();
  vm.runInContext("state.x=71;state.y=40;interact({id:'school',name:'學校',type:'object',x:71,y:37})",context);
  vm.runInContext("interact(objects().find(o=>o.name==='回到街道'))",context);
  assert.equal(vm.runInContext('state.scene',context),'town');
  assert.equal(vm.runInContext('state.x',context),71);
  assert.equal(vm.runInContext('state.y',context),40);
});
test('returning to an old blocked door uses that building entrance',()=>{
  const {context}=boot();
  vm.runInContext("state.x=71;state.y=28;interact({id:'school',name:'學校',type:'object',x:71,y:37});interact(objects().find(o=>o.name==='回到街道'))",context);
  assert.equal(vm.runInContext('state.scene',context),'town');
  assert.equal(vm.runInContext('walkable(state.x,state.y)',context),true);
  assert.equal(vm.runInContext('state.y',context),40);
});
test('player can walk away immediately after returning to a door',()=>{
  const {context,ids}=boot();
  ids.get('startGame').onclick();
  vm.runInContext("state.x=71;state.y=40;interact({id:'school',name:'學校',type:'object',x:71,y:37});interact(objects().find(o=>o.name==='回到街道'))",context);
  const before=vm.runInContext('state.y',context);
  vm.runInContext("keys.add('s');loop(1000);loop(1016)",context);
  assert.ok(vm.runInContext('state.y',context)>before);
});
test('memory return keeps the house door available afterward',()=>{
  const {context}=boot();
  vm.runInContext("state.x=71;state.y=40;enter('school');state.x=42;state.y=35;enterDialogueMemory('ning','好')",context);
  vm.runInContext('close()',context);
  vm.runInContext("interact({id:'back',name:'回到現實',type:'object'})",context);
  assert.equal(vm.runInContext('state.scene',context),'school');
  assert.ok(Math.abs(vm.runInContext('state.x',context)-42)<8);
  assert.ok(Math.abs(vm.runInContext('state.y',context)-35)<8);
  vm.runInContext("interact(objects().find(o=>o.name==='回到街道'))",context);
  assert.equal(vm.runInContext('state.scene',context),'town');
  assert.ok(Math.abs(vm.runInContext('state.x',context)-71)<8);
  assert.equal(vm.runInContext('state.y',context),40);
});
test('town markers are walkable and E enters the intended scene',()=>{
  const {context}=boot();
  for(const id of ['cafe','school','bakery','shop','park']){
    assert.equal(vm.runInContext(`(()=>{const o=scenes.town.objects.find(o=>o[0]==='${id}');return walkable(o[3],o[4])})()`,context),true);
    vm.runInContext(`(()=>{const o=scenes.town.objects.find(o=>o[0]==='${id}');state.scene='town';state.x=o[3];state.y=o[4]})()`,context);
    assert.equal(vm.runInContext('nearest()?.id',context),id);
    vm.runInContext('interact()',context);
    assert.equal(vm.runInContext('state.scene',context),id);
    vm.runInContext('leave()',context);
    assert.equal(vm.runInContext('state.scene',context),'town');
  }
  for(const [id,x,y] of [['bakery',87,69],['park',72,76]]){
    vm.runInContext(`state.scene='town';state.x=${x};state.y=${y}`,context);
    assert.equal(vm.runInContext('nearest()?.id',context),id);
  }
});
test('an indoor save from the earlier map returns to its saved town position',()=>{
  const storage=new Map([['lumina-cafe-v2',JSON.stringify({scene:'school',townReturn:{scene:'school',x:72,y:42}})]]);
  const {context}=boot({storage});
  vm.runInContext("interact(objects().find(o=>o.id==='town'))",context);
  assert.equal(vm.runInContext('state.scene',context),'town');
  assert.equal(vm.runInContext('state.x',context),72);
  assert.equal(vm.runInContext('state.y',context),42);
});
test('entering the park at 20:00 does not advance the day',()=>{
  const {context}=boot();
  vm.runInContext("state.x=72;state.y=76;state.time=20;interact()",context);
  assert.equal(vm.runInContext('state.scene',context),'park');
  assert.equal(vm.runInContext('state.time',context),20);
  vm.runInContext('leave()',context);
  assert.equal(vm.runInContext('state.time',context),20);
});
test('suggested and typed dialogue share the same offline conversation path',async()=>{
  const {context,elements,ids}=boot();vm.runInContext("enter('cafe');openPerson('hao')",context);
  const suggestions=elements.find(e=>e.id==='dialogChoices');assert.equal(suggestions.children.length,3);
  await suggestions.children[0].onclick();assert.equal(ids.get('talkForm').classList.contains('hidden'),true);assert.equal(suggestions.classList.contains('hidden'),true);
  vm.runInContext("close();openPerson('hao')",context);assert.equal(ids.get('talkForm').classList.contains('hidden'),false);
  await vm.runInContext("speak('今天天氣如何？')",context);assert.equal(ids.get('talkForm').classList.contains('hidden'),true);
  assert.equal(vm.runInContext('state.npcTalk.hao.length',context),2);
});
test('a suggested action gives an immediate outcome and is remembered',()=>{
  const {context,ids,elements}=boot();vm.runInContext("enter('cafe');openPerson('hao')",context);
  const suggestions=elements.find(e=>e.id==='dialogChoices');suggestions.children[1].onclick();
  assert.match(ids.get('speech').textContent,/許浩|準時回家|下次再來/);
  assert.equal(ids.get('talkForm').classList.contains('hidden'),true);
  assert.equal(suggestions.classList.contains('hidden'),true);
  assert.equal(ids.get('dialogHelp').textContent,'按 Esc 離開對話');
  assert.equal(vm.runInContext('state.npcActionFlags.hao.title',context),'聽見疲憊');
  assert.equal(vm.runInContext('state.links.some(l=>l.from===\'player\'&&l.to===\'hao\')',context),true);
});
test('background controls are ignored while a dialog is open',()=>{
  const {context,ids}=boot();
  vm.runInContext("openSystem('記事','內容')",context);
  ids.get('rest').onclick();
  assert.equal(vm.runInContext('state.day',context),1);
  vm.runInContext('close()',context);
  ids.get('rest').onclick();
  assert.equal(vm.runInContext('state.day',context),2);
});
test('the seventh day displays and preserves the earned ending',()=>{
  const {context,ids,elements}=boot();assert.ok(elements.find(e=>e.id==='endingLab'));
  for(let i=0;i<7;i++)vm.runInContext('nextDay()',context);
  assert.equal(vm.runInContext('state.finished',context),true);
  assert.match(ids.get('speaker').textContent,/結局/);
  assert.equal(ids.get('rest').textContent,'查看結局');
});
test('an NPC event is offered only where that resident is present',()=>{
  const {context}=boot();vm.runInContext("enter('school')",context);
  assert.equal(vm.runInContext("objects().some(o=>o.id==='scene-event')",context),false);
  vm.runInContext('nextDay();enter(\'school\')',context);
  assert.equal(vm.runInContext("objects().find(o=>o.id==='scene-event').name",context),'考卷上的紅字');
});
test('the day-seven ending is not overwritten by a later action',()=>{
  const {context,ids}=boot();
  vm.runInContext("state.day=7;state.time=20;state.energy=100;state.scene='cafe';render()",context);
  vm.runInContext("interact({id:'coffee',name:'咖啡機',type:'object'})",context);
  assert.match(ids.get('speaker').textContent,/結局/);
  const served=vm.runInContext('state.coffeeServed',context);
  vm.runInContext("interact({id:'coffee',name:'咖啡機',type:'object'})",context);
  assert.equal(vm.runInContext('state.coffeeServed',context),served);
  vm.runInContext("interact({id:'school',name:'學校',type:'object'})",context);
  assert.equal(vm.runInContext('state.scene',context),'cafe');
  assert.equal(vm.runInContext("state.journal.filter(x=>x.includes('七天結束')).length",context),1);
});
test('free-text help shares the scripted action flags and cannot be counted twice',async()=>{
  const fetch=async()=>({ok:true,json:async()=>({mode:'離線備援',intent:'help',emotion:'happy',reply:'謝謝你願意幫忙。'})});
  const {context}=boot({fetch});
  vm.runInContext("enter('cafe');openPerson('hao')",context);
  await vm.runInContext("speak('我很願意伸出援手')",context);
  assert.equal(vm.runInContext('state.kindness',context),1);
  assert.equal(vm.runInContext("state.helped.includes('hao')",context),true);
  assert.ok(vm.runInContext('!!state.npcActionFlags.hao',context));
  await vm.runInContext("speak('我會幫你處理工作上的事了')",context);
  assert.equal(vm.runInContext('state.kindness',context),1);
  assert.doesNotMatch(vm.runInContext("state.npcTalk.hao.at(-1).reply",context),/準時回家|下次再來/);
});
test('free-text help uses the scripted action energy cost',async()=>{
  const fetch=async()=>({ok:true,json:async()=>({mode:'離線備援',intent:'help',emotion:'happy',reply:'謝謝你願意幫忙。'})});
  const {context}=boot({fetch});
  vm.runInContext("enter('cafe');openPerson('hao');state.energy=5",context);
  await vm.runInContext("speak('我很願意伸出援手')",context);
  assert.equal(vm.runInContext('state.npcActionFlags.hao.title',context),'聽見疲憊');
  assert.equal(vm.runInContext('state.kindness',context),1);
});
test('harm intent is not rewritten by a remembered event',async()=>{
  const fetch=async()=>({ok:true,json:async()=>({mode:'離線備援',intent:'harm',emotion:'angry',reply:'這樣做會傷害人。我需要先保持距離。'})});
  const {context,ids}=boot({fetch});
  vm.runInContext("state.npcMemory.hao=[{title:'雨天借傘',day:1,choice:'借出自己的傘',success:true,kind:true}];enter('cafe');openPerson('hao')",context);
  await vm.runInContext("speak('記得我要打他')",context);
  assert.match(ids.get('speech').textContent,/保持距離/);
  assert.doesNotMatch(ids.get('speech').textContent,/還記得「雨天借傘」/);
});
test('merely opening a dialogue does not mark an NPC as familiar',async()=>{
  const {context}=boot();
  vm.runInContext("enter('cafe');openPerson('hao')",context);
  assert.equal(vm.runInContext("state.met.includes('hao')",context),false);
  await vm.runInContext("speak('今天天氣如何？')",context);
  assert.equal(vm.runInContext("state.met.includes('hao')",context),true);
});
test('a damaged save falls back to valid state shapes',()=>{
  const storage=new Map([['lumina-cafe-v2',JSON.stringify({scene:'cafe',events:null,links:null,kindness:'x'})]]);
  const {context}=boot({storage});
  assert.equal(vm.runInContext('Array.isArray(state.events)',context),true);
  assert.equal(vm.runInContext('Array.isArray(state.links)',context),true);
  assert.equal(vm.runInContext('typeof state.kindness',context),'number');
  assert.equal(vm.runInContext('typeof state.seed',context),'number');
});
test('an out-of-range saved day falls back instead of crashing the map',()=>{
  const storage=new Map([['lumina-cafe-v2',JSON.stringify({day:0,scene:'cafe',money:-99})]]);
  const {context}=boot({storage});
  assert.equal(vm.runInContext('state.day',context),1);
  assert.equal(vm.runInContext('state.money',context),60);
  assert.equal(vm.runInContext("objects().some(o=>o.name.includes('undefined'))",context),false);
});

test('the title menu opens the guide and can resume the same game',()=>{
  const {context,ids}=boot();
  assert.equal(ids.get('gameScreen').hidden,true);
  ids.get('showGuide').onclick();
  assert.equal(ids.get('howToPlay').open,true);
  ids.get('howToPlay').open=false;
  ids.get('startGame').onclick();
  assert.equal(ids.get('mainMenu').hidden,true);
  assert.equal(ids.get('gameScreen').hidden,false);
  vm.runInContext("enter('cafe');nextDay()",context);
  ids.get('backToMenu').onclick();
  assert.equal(ids.get('mainMenu').hidden,false);
  ids.get('startGame').onclick();
  assert.equal(ids.get('progressDay').textContent,'第 2 天');
  assert.equal(ids.get('weekProgress').value,1);
  assert.match(ids.get('questObjective').textContent,/第 3 天/);
});

test('the inventory reflects coffee sales and restocking',()=>{
  const {context,ids}=boot();
  ids.get('startGame').onclick();
  vm.runInContext("enter('cafe');interact(objects().find(o=>o.id==='coffee'));close();interact(objects().find(o=>o.id==='stock'))",context);
  ids.get('showInventory').onclick();
  assert.equal(ids.get('inventory').open,true);
  assert.equal(ids.get('bagMoney').textContent,'66 元');
  assert.equal(ids.get('bagStock').textContent,'5 份');
});


test('B toggles the backpack during play without interrupting dialogue or typing',()=>{
  const {context,ids,pressKey}=boot();
  pressKey('b');
  assert.equal(Boolean(ids.get('inventory').open),false);
  ids.get('startGame').onclick();
  assert.equal(pressKey('B').defaultPrevented,true);
  assert.equal(ids.get('inventory').open,true);
  pressKey('b',{repeat:true});
  assert.equal(ids.get('inventory').open,true);
  pressKey('b');
  assert.equal(ids.get('inventory').open,false);
  pressKey('b',{ctrlKey:true});
  pressKey('b',{target:ids.get('talk')});
  assert.equal(ids.get('inventory').open,false);
  vm.runInContext("enter('cafe');openPerson('hao')",context);
  pressKey('b');
  assert.equal(ids.get('inventory').open,false);
});

test('M opens the town overview, reports the current position, and leaves other overlays closed',()=>{
  const {context,ids,pressKey}=boot();
  pressKey('m');
  assert.equal(Boolean(ids.get('worldMap').open),false);
  ids.get('startGame').onclick();
  assert.equal(ids.get('overviewLandmarks').children.length,5);
  pressKey('m');
  assert.equal(ids.get('worldMap').open,true);
  assert.equal(ids.get('overviewPlayer').style.left,'28%');
  assert.match(ids.get('overviewLocation').textContent,/微光小鎮/);
  pressKey('e');
  assert.equal(vm.runInContext('state.scene',context),'town');
  pressKey('b');
  assert.equal(Boolean(ids.get('inventory').open),false);
  pressKey('m');
  assert.equal(ids.get('worldMap').open,false);
  pressKey('e');
  assert.equal(vm.runInContext('state.scene',context),'cafe');
  ids.get('showWorldMap').onclick();
  assert.equal(ids.get('worldMap').open,true);
  assert.match(ids.get('overviewLocation').textContent,/微光咖啡館/);
  assert.equal(ids.get('overviewPlayer').style.left,'28%');
  assert.equal(ids.get('overviewPlayer').style.top,'43%');
});
