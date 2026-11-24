import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.children=[];this.childNodes=this.children;this.dataset={};this.style={setProperty(){}};this.classes=new Set();this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};this.firstChild={textContent:''}}
 append(...items){this.children.push(...items);this.childNodes=this.children}
 prepend(...items){this.children.unshift(...items);this.childNodes=this.children}
 replaceChildren(...items){this.children=[...items];this.childNodes=this.children}
 before(){}after(){}remove(){}setAttribute(){}focus(){}
}
function boot(){const elements=[];const ids=new Map();for(const id of ['mode','modeNote','sceneName','clock','stats','map','hint','journal','links','network','principles','interact','rest','restart','close','talkForm','talk','dialog','dialogHelp','speaker','speakerRole','speech','conversation','portraitArt']){const e=new Element();e.id=id;ids.set(id,e);elements.push(e)}const controls=new Element(),aside=new Element(),document={getElementById:id=>ids.get(id)||elements.find(e=>e.id===id)||null,createElement:tag=>{const e=new Element(tag);elements.push(e);return e},createElementNS:(_,tag)=>{const e=new Element(tag);elements.push(e);return e},querySelector:selector=>selector==='.controls'?controls:selector==='aside'?aside:null,addEventListener(){}};const data=new Map(),context={document,location:{search:'?test=1'},URLSearchParams,localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},fetch:async path=>({json:async()=>path==='/api/config'?{mode:'離線備援'}:{mode:'離線備援',intent:'talk',emotion:'neutral',reply:'我聽見了。'}}),requestAnimationFrame(){},confirm:()=>true};context.window=context;vm.createContext(context);for(const file of ['src/world.js','src/story.js','src/npc-actions.js','src/endings.js','game.js'])vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),context,{filename:file});return {context,ids,elements}}
test('game boots, shows a story marker, and records an NPC memory through the scene flow',()=>{
 const {context,ids,elements}=boot();assert.equal(ids.get('sceneName').textContent,'微光小鎮');
 vm.runInContext("enter('cafe')",context);assert.equal(ids.get('sceneName').textContent,'微光咖啡館');
 assert.equal(vm.runInContext("objects().find(o=>o.id==='scene-event').name",context),'雨天借傘');
 vm.runInContext("openChoiceEvent('rain')",context);assert.equal(ids.get('speaker').textContent,'雨天借傘');
 vm.runInContext("LUMINA_STORY.resolveStoryChoice(state,'rain',0,.1,.1);render()",context);
 assert.ok(elements.find(e=>e.id==='npcMemories').children.some(e=>e.textContent?.includes('雨天借傘')));
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
