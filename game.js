/* Lumina Café: deterministic offline game. No network calls or API secrets. */
const $=id=>document.getElementById(id), SAVE='lumina-cafe-v2';
const portraitPositions={ning:['0%','0%'],yu:['50%','0%'],an:['100%','0%'],mei:['0%','100%'],hao:['50%','100%'],gran:['100%','100%']};
const people={ning:{name:'方子寧',role:'為考試煩惱的學生',scene:'school',x:68,y:45,line:'我明明一直在努力，成績卻沒有起色。',need:'鼓勵',memory:'教室裡那張滿是修改痕跡的考卷。'},yu:{name:'林雨柔',role:'麵包店店主',scene:'bakery',x:67,y:48,line:'今天麵包剩得有點多，我擔心浪費。',need:'幫忙',memory:'清晨的烤箱前，媽媽教她揉麵團。'},an:{name:'陳安',role:'公園志工',scene:'park',x:61,y:48,line:'這裡的長椅壞了，大家都不太敢坐。',need:'幫忙',memory:'小時候與父親一起修復公園長椅。'},mei:{name:'吳美玲',role:'雜貨店老闆',scene:'shop',x:69,y:48,line:'街坊最近都很忙，連打招呼的時間都少了。',need:'問候',memory:'開店第一天，鄰居送來的一束花。'},hao:{name:'許浩',role:'常來咖啡館的上班族',scene:'cafe',x:65,y:47,line:'今天又加班了。坐一會兒好嗎？',need:'傾聽',memory:'雨天車站裡，沒說出口的告別。'},gran:{name:'周奶奶',role:'鎮上的老居民',scene:'town',x:51,y:66,line:'這條街變了很多，幸好還有人願意停下來說話。',need:'陪伴',memory:'老照片裡，剛開張的微光咖啡館。'}};
const scenes={town:{name:'微光小鎮',spawn:[28,43],objects:[['cafe','咖啡館','☕',27,37],['school','學校','📚',71,37],['bakery','麵包店','🥐',87,68],['shop','雜貨店','🏪',25,90],['park','公園','🌳',78,79]]},cafe:{name:'微光咖啡館',spawn:[15,75],objects:[['town','回到街道','🚪',9,78],['coffee','咖啡機','☕',42,40],['stock','補充原料','🫘',30,68]]},school:{name:'小鎮學校',spawn:[15,75],objects:[['town','回到街道','🚪',9,78],['memory','舊考卷','📄',42,35]]},bakery:{name:'晨光麵包店',spawn:[15,75],objects:[['town','回到街道','🚪',9,78],['bread','剩餘麵包','🥖',39,38]]},shop:{name:'街角雜貨店',spawn:[15,75],objects:[['town','回到街道','🚪',9,78],['shelf','社區公告','📌',43,35]]},park:{name:'風鈴公園',spawn:[15,75],objects:[['town','回到街道','🚪',9,78],['bench','舊長椅','🪑',42,38]]},memory:{name:'人生記憶',spawn:[15,75],objects:[['back','回到現實','✨',9,78],['clue','記憶碎片','💠',60,42]]}};
const TOWN_INTERACTION_RADIUS=10;
const townExits={cafe:[28,43],school:[71,40],bakery:[87,69],shop:[25,92],park:[72,76]};
function residentSchedule(day){const home={ning:'school',an:'park',mei:'shop',gran:'town'},guests=['ning','an','mei'],guest=guests[(day-1)%guests.length],assignment={hao:'cafe',yu:'bakery',[guest]:'cafe'};for(const [id,scene] of Object.entries(home))if(id!==guest)assignment[id]=scene;return assignment}
const fresh=()=>({day:1,time:9,money:60,energy:100,stock:3,scene:'town',x:28,y:43,kindness:0,links:[],journal:['第一天，咖啡館的門重新打開了。'],principles:[],helped:[],met:[],memoryOwner:null,memoryClues:[],origin:'cafe',entries:[],townReturn:null,finished:false,events:[],eventSerial:0,community:0,choiceSeen:[],storyFlags:{},npcMemory:{},npcTalk:{},npcActionFlags:{},npcTrust:{},storyOffer:{},coffeeServed:0,seed:(Date.now()>>>0)||0x9e3779b9,ending:null});
function loadState(){const base=fresh();for(const key of [SAVE,'lumina-cafe-v1']){let raw;try{const value=localStorage.getItem(key);if(!value)continue;raw=JSON.parse(value)}catch{continue}if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;for(const [name,example] of Object.entries(base)){const value=raw[name];if(value===undefined||value===null)continue;if(Array.isArray(example)){if(Array.isArray(value))base[name]=value.filter(item=>item!==null&&item!==undefined)}else if(typeof example==='object'){if(typeof value==='object'&&!Array.isArray(value))base[name]=value}else if(typeof value===typeof example){if(name==='scene'&&!scenes[value])continue;if(typeof example==='number'){if(!Number.isFinite(value))continue;if(name==='day'&&(!Number.isInteger(value)||value<1||value>7))continue;if(['money','energy','stock','time','community','coffeeServed'].includes(name)&&value<0)continue}base[name]=value}}break}if(!scenes[base.scene])return fresh();if(!scenes[base.origin])base.origin='cafe';base.entries=Array.isArray(base.entries)?base.entries.filter(e=>e&&scenes[e.scene]&&Number.isFinite(e.x)&&Number.isFinite(e.y)):[];if(base.ending&&(!Array.isArray(base.ending.impact)||!Array.isArray(base.ending.epilogues)))base.ending=null;base.links=base.links.filter(item=>item&&typeof item==='object');base.events=base.events.filter(item=>item&&typeof item==='object');base.principles=base.principles.filter(item=>typeof item==='string');base.helped=base.helped.filter(item=>typeof item==='string');base.met=base.met.filter(item=>typeof item==='string');base.memoryClues=base.memoryClues.filter(item=>typeof item==='string');base.journal=base.journal.map(String);return base}
let state=loadState();
if(state.scene==='town'&&!walkable(state.x,state.y))[state.x,state.y]=scenes.town.spawn;
function random(){let x=state.seed>>>0;if(!x)x=0x9e3779b9;x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;state.seed=x;return x/4294967296}
globalThis.LUMINA_RANDOM=random;
let talking=null,keys=new Set(),lastFrame=0,lastSave=0,history=[],busy=false,endingOpen=false,returnFocus=null,lastMapKey='',mapObjectEls=[],townCanvas=null,facing='down',stride=0,walkingFrame=-1,lastNetworkKey=null,lastProgressKey='',lastMinimapKey='';
fetch('/api/config').then(r=>r.json()).then(x=>setMode(x.mode)).catch(()=>setMode('離線備援'));
function setMode(mode){$('modeNote').textContent=mode==='AI'?'AI 對話已啟用':'離線遊玩'}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state))}catch{}}
function note(s){state.journal.unshift(`第 ${state.day} 天 · ${s}`);state.journal=state.journal.slice(0,15);save();render()}
function tick(n=1){state.time+=n;state.energy=Math.max(0,state.energy-4*n);if(state.time>=21)nextDay();save()}
function nextDay(){if(state.day>=7){state.finished=true;state.time=21;state.energy=0;state.ending=LUMINA_ENDINGS.storyEnding(state);note(`七天結束。${state.ending.title}`);showEnding();return}state.day++;state.time=9;state.energy=100;state.scene='cafe';[state.x,state.y]=scenes.cafe.spawn;state.entries=[];state.townReturn=null;note('新的一天開始。');if(state.community>0&&random()<.45){state.money+=5;note('曾受幫助的居民送來咖啡館小禮，回流收入 5 元。')}}
function showEnding(){if(!state.ending?.impact||!Array.isArray(state.ending.impact)||!Array.isArray(state.ending.epilogues))state.ending=LUMINA_ENDINGS.storyEnding(state);const ending=state.ending;openSystem(`結局・${ending.title}`,`${ending.text}\n\n你留下的改變：\n${ending.impact.join('\n')}\n\n${ending.epilogues.join('\n')}\n本週：善意 ${state.kindness} 次、居民互助 ${state.community} 次、記憶線索 ${state.memoryClues.length} 片、製作咖啡 ${state.coffeeServed||0} 杯。`,true)}
function captureFocus(){const active=document.activeElement;if(active&&active!==document.body&&!returnFocus)returnFocus=active}
function setModal(on){const list=document.querySelectorAll?.('header, .controls, aside, #map, #showWorldMap');if(list?.forEach)list.forEach(el=>{el.inert=on})}
function restoreFocus(){const target=returnFocus;returnFocus=null;if(target&&target.isConnected!==false&&target.focus)target.focus();else if(state.scene==='town')$('interact')?.focus?.()}
function markMet(id){if(!state.met.includes(id)){state.met.push(id);save()}}
function objects(){let a=scenes[state.scene].objects.map(([id,name,icon,x,y])=>({id,name,icon,x,y,type:'object'}));if(state.scene==='memory'&&LUMINA_MEMORIES[state.memoryOwner]){a=a.filter(o=>o.id!=='clue');LUMINA_MEMORIES[state.memoryOwner].clues.forEach(([name],i)=>a.push({id:`clue-${i}`,name,icon:'✦',x:35+i*20,y:36+(i%2)*18,type:'object'}))}const schedule=residentSchedule(state.day),present=Object.keys(schedule).filter(id=>schedule[id]===state.scene);present.forEach((id,i)=>{const [x,y]=state.scene==='town'?[70,66]:state.scene==='cafe'?[65+i*17,47+i*17]:[67,48];a.push({id,name:people[id].name,icon:'✦',x,y,type:'npc'})});if(state.scene!=='memory'&&!state.finished){const offered=LUMINA_STORY.storyOffer(state,state.scene,present);if(offered&&schedule[offered.owner]===state.scene)a.push({id:'scene-event',name:offered.title,icon:'✦',x:state.scene==='town'?52:87,y:state.scene==='town'?78:20,type:'object',eventId:offered.id})}return a}
function nearest(list=objects()){let best=null,dist=1e9;for(const o of list){let d=Math.hypot(state.x-o.x,state.y-o.y);if(d<dist){best=o;dist=d}}return dist<(state.scene==='town'?TOWN_INTERACTION_RADIUS:16)?best:null}
function walkable(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&(state.scene==='town'?LUMINA_TILEMAP.canWalk(x,y):true)}
function freeSpot(x,y){return walkable(x,y)}
function place(x,y){state.x=x;state.y=y;if(freeSpot(x,y))return;for(const [dx,dy] of [[0,6],[0,-6],[6,0],[-6,0],[6,6],[-6,6],[6,-6],[-6,-6]]){const nx=x+dx,ny=y+dy;if(freeSpot(nx,ny)){state.x=nx;state.y=ny;return}}[state.x,state.y]=scenes[state.scene].spawn}
function render(){
  const s=scenes[state.scene];$('sceneName').textContent=s.name;$('clock').textContent=`${String(state.time).padStart(2,'0')}:00`;
  $('map').dataset.scene=state.scene;const list=objects(),near=nearest(list),key=[state.scene,state.day,state.finished,state.memoryOwner,list.map(o=>`${o.id}:${o.name}`).join(',')].join('|');
  if(key!==lastMapKey){
   const focused=document.activeElement?.dataset?.hotkey;
   lastMapKey=key;mapObjectEls=[];townCanvas=null;$('map').replaceChildren();if(state.scene==='town'){townCanvas=document.createElement('canvas');townCanvas.className='town-canvas';townCanvas.setAttribute('aria-hidden','true');$('map').append(townCanvas)}
   for(const [index,o] of list.entries()){
    const e=document.createElement('div');e.className=`object ${o.type}${near?.id===o.id?' near':''}`;e.style.left=o.x+'%';e.style.top=o.y+'%';e.dataset.hotkey=index+1;e.tabIndex=0;e.setAttribute('role','button');e.setAttribute('aria-label',`${o.name}，按 ${index+1} 互動`);e.innerHTML=`<span>${o.icon}</span><b>${o.name}</b>`;
    if(o.type==='npc'){const [px,py]=portraitPositions[o.id];e.style.setProperty('--portrait-x',px);e.style.setProperty('--portrait-y',py)}
    e.onclick=()=>{if(state.scene!=='town'||Math.hypot(state.x-o.x,state.y-o.y)<TOWN_INTERACTION_RADIUS)interact(o);else $('hint').textContent='請走近後按 E 互動。'};e.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();e.click()}};$('map').append(e);mapObjectEls.push(e)
   }
   if(focused){const target=mapObjectEls[Number(focused)-1];if(target?.focus)target.focus()}
  }
  if(townCanvas)renderTown(list);
  for(const [index,e] of mapObjectEls.entries()){if(list[index]?.id===near?.id)e.classList.add('near');else e.classList.remove('near')}
  $('hint').textContent=state.scene==='town'?(near?`按 E：${near.name}`:'靠近地標或人物，按 E 互動'):'點場景中的頭像或標記，或按標記上的數字互動。';$('interact').hidden=state.scene!=='town';$('rest').textContent=state.finished?'查看結局':'結束今天';$('controlText').textContent=state.scene==='town'?'WASD / 方向鍵：移動　 E：互動　 Esc：關閉對話 ':'點頭像或按數字互動　 Esc：關閉對話 ';
  renderProgress();
  renderNetwork();
  renderMinimap();
}
function renderTown(list=objects()){
 const map=$('map');
 const width=map.clientWidth,height=map.clientHeight;
 if(!width||!height)return;
 if(townCanvas.width!==width)townCanvas.width=width;
 if(townCanvas.height!==height)townCanvas.height=height;
 const camera=LUMINA_TILEMAP.cameraFor(width,height,state.x,state.y);
 LUMINA_TILEMAP.draw(townCanvas,camera,state.x,state.y,facing,walkingFrame);
 for(const [index,marker] of mapObjectEls.entries()){
  const object=list[index];
  const point=LUMINA_TILEMAP.screenPoint(camera,object.x,object.y);
  marker.hidden=point.x<0||point.x>=width||point.y<0||point.y>=height;
  if(!marker.hidden){
   marker.style.left=`${Math.round(point.x)}px`;
   marker.style.top=`${Math.round(point.y)}px`;
  }
 }
}
function townMapPosition(){
 if(state.scene==='town')return [state.x,state.y];
 const entry=state.entries.findLast(item=>item.scene==='town');
 if(entry&&LUMINA_TILEMAP.canWalk(entry.x,entry.y))return [entry.x,entry.y];
 const area=state.scene==='memory'?state.origin:state.scene;
 const legacy=state.townReturn;
 if(legacy?.scene===area&&LUMINA_TILEMAP.canWalk(legacy.x,legacy.y))return [legacy.x,legacy.y];
 return townExits[area]||scenes.town.spawn;
}
function renderMinimap(){
 const [x,y]=townMapPosition();
 const direction=state.scene==='town'?facing:null;
 const key=[x,y,direction].join(',');
 if(key===lastMinimapKey)return;
 lastMinimapKey=key;
 LUMINA_TILEMAP.drawMinimap($('minimap'),x,y,direction);
}
function initOverview(){
 $('overviewLandmarks').replaceChildren(...scenes.town.objects.map(([,name,,x,y])=>{
  const label=document.createElement('span');
  label.className='atlas-landmark';
  label.textContent=name;
  label.style.left=`${x}%`;
  label.style.top=`${y}%`;
  return label;
 }));
}
function renderOverview(){
 LUMINA_TILEMAP.drawOverview($('overviewMap'));
 const [x,y]=townMapPosition();
 $('overviewPlayer').style.left=`${x}%`;
 $('overviewPlayer').style.top=`${y}%`;
 $('overviewLocation').textContent=`你的位置 · ${scenes[state.scene].name}`;
}
function renderProgress(){
 const key=[state.day,state.finished,state.energy,state.money,state.stock].join(',');
 if(key===lastProgressKey)return;
 lastProgressKey=key;
 const completed=state.finished?7:state.day-1;
 $('progressDay').textContent=state.finished?'七天已結束':`第 ${state.day} 天`;
 $('daysCompleted').textContent=`已完成 ${completed} / 7 天`;
 $('weekProgress').value=completed;
 $('energyValue').textContent=`${state.energy} / 100`;
 $('energyProgress').value=state.energy;
 $('bagMoney').textContent=`${state.money} 元`;
 $('bagStock').textContent=`${state.stock} 份`;
 $('questTitle').textContent=state.finished?'七天的故事已完成':'微光咖啡館的七天';
 const objective=state.finished?'按「查看結局」回顧這一週。':state.day===7?'按「結束今天」查看故事結局。':`按「結束今天」推進到第 ${state.day+1} 天。`;
 if($('questObjective').textContent!==objective)$('questObjective').textContent=objective;
}
function renderNetwork(){const key=state.links.map(l=>`${l.from}>${l.to}:${l.id}`).join('|');if(key===lastNetworkKey)return;lastNetworkKey=key;$('linkCount').textContent=`${state.links.length} 條`;const svg=$('network'),ns='http://www.w3.org/2000/svg',ids=['player',...Object.keys(people)],pos=Object.fromEntries(ids.map((id,i)=>id==='player'?[id,[140,90]]:[id,[140+105*Math.cos((i-1)*Math.PI/3),89+65*Math.sin((i-1)*Math.PI/3)]]));svg.replaceChildren();for(const l of state.links){if(!pos[l.from]||!pos[l.to])continue;const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:pos[l.from][0],y1:pos[l.from][1],x2:pos[l.to][0],y2:pos[l.to][1]}))line.setAttribute(k,v);svg.append(line)}for(const id of ids){const [x,y]=pos[id],active=state.links.some(l=>l.from===id||l.to===id);const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',14);if(active)c.setAttribute('class','active');svg.append(c);const t=document.createElementNS(ns,'text');t.setAttribute('x',x);t.setAttribute('y',y+26);t.textContent=id==='player'?'你':people[id].name;svg.append(t)}}
function enter(id){if(state.scene==='town'&&id!=='town'&&scenes[id]){state.entries.push({scene:'town',x:state.x,y:state.y,door:id});state.townReturn=null}state.scene=id;[state.x,state.y]=scenes[id].spawn;save();render()}
function leave(){const previous=state.scene;const fallback=previous==='memory'?{scene:scenes[state.origin]?state.origin:'cafe',x:scenes[state.origin]?.spawn?.[0]??15,y:scenes[state.origin]?.spawn?.[1]??75}:{scene:'town',x:townExits[previous]?.[0]??28,y:townExits[previous]?.[1]??43};const entry=state.entries.pop()||fallback;state.scene=entry.scene;const legacy=state.scene==='town'&&state.townReturn?.scene===previous&&Number.isFinite(state.townReturn.x)&&Number.isFinite(state.townReturn.y)?[state.townReturn.x,state.townReturn.y]:null;const point=legacy&&walkable(...legacy)?legacy:walkable(entry.x,entry.y)?[entry.x,entry.y]:state.scene==='town'?(townExits[entry.door||previous]||scenes.town.spawn):scenes[state.scene].spawn;place(...point);if(state.scene==='town')state.townReturn=null;save();render()}
function openSystem(title,text,force=false){if(endingOpen&&!force)return;captureFocus();$('eventChoices')?.remove();$('dialogChoices')?.remove();talking='system';$('dialog').classList.add('system');$('dialog').dataset.emotion='neutral';$('speaker').textContent=title;$('speakerRole').textContent='小鎮記事';$('speech').textContent=text;$('conversation').replaceChildren();$('talkForm').classList.add('hidden');$('dialogHelp').textContent='按 Esc 離開';$('dialog').classList.remove('hidden');setModal(true);$('close')?.focus?.();if(force)endingOpen=true}
function openChoiceEvent(id){const event=LUMINA_STORY.storyEvent(state,id);openSystem(event.title,event.description);const panel=document.createElement('div');panel.id='eventChoices';for(const [index,[label]] of event.choices.entries()){const button=document.createElement('button');button.type='button';button.textContent=`${index+1}. ${label}`;button.onclick=()=>{try{const result=LUMINA_STORY.resolveStoryChoice(state,id,index);panel.remove();$('speech').textContent=result.text;note(`${result.title}：${result.text}${result.propagated?' 善意已傳向另一位居民。':''}`)}catch(error){$('speech').textContent=`目前無法選擇：${error.message||'請稍後再試'}`}};panel.append(button)}$('conversation').after(panel)}
function openPerson(id){captureFocus();$('eventChoices')?.remove();$('dialogChoices')?.remove();talking=id;history=[];const p=people[id];$('dialog').classList.remove('system');$('speaker').textContent=p.name;$('speakerRole').textContent=p.role;const lastTalk=state.npcTalk[id]?.at(-1);$('speech').textContent=LUMINA_STORY.npcStoryLine(state,id,p.line)+(lastTalk?`\n我也記得你上次說：「${String(lastTalk.input||'').slice(0,35)}」。`:'');$('conversation').replaceChildren();$('talkForm').classList.remove('hidden');$('dialogHelp').textContent='選擇一句話或輸入文字 · Esc 離開';$('dialog').classList.remove('hidden');$('dialog').dataset.emotion='neutral';const choices=document.createElement('div');choices.id='dialogChoices';for(const prompt of LUMINA_NPC_ACTIONS.npcActionPrompts(state,id)){const button=document.createElement('button');button.type='button';button.textContent=prompt.label;button.onclick=()=>speak(prompt.label,prompt.id);choices.append(button)}$('talkForm').before(choices);const [x,y]=portraitPositions[id];$('portraitArt').style.setProperty('--portrait-x',x);$('portraitArt').style.setProperty('--portrait-y',y);setModal(true);$('talk').focus()}
function finishNpcReply(){$('dialogChoices')?.classList.add('hidden');$('talkForm').classList.add('hidden');$('dialogHelp').textContent='按 Esc 離開對話';$('close')?.focus?.()}
function close(){talking=null;endingOpen=false;setModal(false);$('dialog').classList.add('hidden');$('talk').value='';render();restoreFocus()}
function interact(o=nearest()){if(talking||!o)return;if(state.finished)return showEnding();if(o.type==='npc'){openPerson(o.id);return}if(o.id==='scene-event'){openChoiceEvent(o.eventId);return}if(o.id==='back'||(o.id==='town'&&state.scene!=='town')){leave();return}if(scenes[o.id]){enter(o.id);return}if(o.id==='coffee'){if(state.stock<1)return openSystem('咖啡機','原料不足。到旁邊補充原料。');if(state.energy<10)return openSystem('咖啡機','你需要休息。');state.stock--;state.money+=18;state.energy-=10;state.coffeeServed=(state.coffeeServed||0)+1;tick();note('製作咖啡、接待客人，收入 18 元。');openSystem('咖啡完成','香氣緩緩飄向街道。');return}if(o.id==='stock'){if(state.money<12)return openSystem('原料架','補充原料需要 12 元。');state.money-=12;state.stock+=3;tick();note('花 12 元補充三份咖啡原料。');return}if(o.id.startsWith('clue-')){const i=Number(o.id.slice(5)),key=`${state.memoryOwner}-${i}`,clue=LUMINA_MEMORIES[state.memoryOwner].clues[i];if(!state.memoryClues.includes(key)){state.memoryClues.push(key);note(`在「${LUMINA_MEMORIES[state.memoryOwner].title}」理解了${clue[0]}。`);openSystem(clue[0],clue[1]);tick()}else openSystem(clue[0],clue[1]);return}let messages={memory:'考卷上留著反覆修改的字跡。努力並非毫無痕跡。',bread:'還有剛出爐的麵包。也許能分享給需要的人。',shelf:'公告欄寫著本週的社區活動。',bench:'木板有些鬆動，修理需要時間與力氣。'};openSystem(o.name,messages[o.id]||'你停下來仔細看了看。');tick()}
function enterDialogueMemory(id,reply){state.memoryOwner=id;state.origin=state.scene;state.entries.push({scene:state.scene,x:state.x,y:state.y,door:'memory'});note(`${people[id].name}同意分享人生記憶。`);markMet(id);close();enter('memory');openSystem(LUMINA_MEMORIES[id].title,reply+' 探索場景裡的三件物品。')}
function scriptedDialogue(id,input,actionId){const result=LUMINA_NPC_ACTIONS.resolveNpcAction(state,id,actionId);if(result.type==='memory'){if(LUMINA_MEMORIES[id])enterDialogueMemory(id,result.text);else{$('speech').textContent=result.text;finishNpcReply();markMet(id);save()}return}const reply=result.text+(result.propagated?' 這份幫助也傳到了另一位居民。':'');history.push({role:'user',content:input},{role:'assistant',content:reply});state.npcTalk[id]??=[];state.npcTalk[id].push({day:state.day,input:String(input).slice(0,180),reply:String(reply).slice(0,180)});state.npcTalk[id]=state.npcTalk[id].slice(-4);$('dialog').dataset.emotion=result.type==='action'?'happy':'neutral';$('speech').textContent=reply;const line=document.createElement('p');line.textContent=`你：${input}`;$('conversation').prepend(line);finishNpcReply();markMet(id);save();if(result.type==='action')note(`你與${people[id].name}一起「${result.title}」：${result.text}`);else render()}
async function speak(input,actionId=null){const id=talking,p=people[id];if(!p||busy)return;if(state.finished){showEnding();return}const scripted=actionId||LUMINA_NPC_ACTIONS.matchNpcAction(state,id,input);if(scripted){scriptedDialogue(id,input,scripted);return}busy=true;$('speech').textContent='思考中……';let result;try{const response=await fetch('/api/dialogue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person:id,input,history,context:{scene:state.scene,day:state.day,energy:state.energy,helped:state.helped.includes(id),memory:state.npcMemory[id]?.slice(-3),talk:state.npcTalk[id]?.slice(-3)}})});if(!response.ok)throw Error('server');result=await response.json()}catch{result={mode:'離線備援',...(globalThis.LUMINA_OFFLINE?globalThis.LUMINA_OFFLINE(input):{intent:'talk',emotion:'neutral',reply:'連線中斷了，但我仍願意聽你說。'})}}finally{busy=false}if(talking!==id)return;setMode(result.mode);$('dialog').dataset.emotion=result.emotion;let reply=result.mode==='離線備援'&&result.intent!=='harm'?LUMINA_STORY.npcRememberedReply(state,id,input,result.reply):result.reply;history.push({role:'user',content:input},{role:'assistant',content:reply});
  if(result.intent==='memory'&&LUMINA_MEMORIES[id]){markMet(id);enterDialogueMemory(id,reply);return}
  let acted=false;
  if(result.intent==='help'){
    if(state.npcActionFlags?.[id])reply+=' 這件事我們已經一起做過了，今天先把心力留給別人。';
    else{const action=LUMINA_NPC_ACTIONS.resolveNpcAction(state,id,'help');if(action.type==='action'){reply+=` ${action.text}${action.propagated?' 這份幫助也傳到了另一位居民。':''}`;note(`你與${people[id].name}一起「${action.title}」：${action.text}`);acted=true}else reply+=` ${action.text}`}
  }
  state.npcTalk[id]??=[];state.npcTalk[id].push({day:state.day,input:String(input).slice(0,180),reply:String(reply).slice(0,180)});state.npcTalk[id]=state.npcTalk[id].slice(-4);$('speech').textContent=reply;const line=document.createElement('p');line.textContent=`你：${input}`;$('conversation').prepend(line);finishNpcReply();markMet(id);tick(acted?0:1);save();render()}
document.addEventListener('keydown',e=>{if($('gameScreen').hidden||gameOverlayOpen())return;if(e.key==='Escape'){if(talking)close();return}if(talking&&e.key==='Tab'&&$('dialog').querySelectorAll){const items=[...$('dialog').querySelectorAll('button,input')].filter(el=>!el.disabled&&!el.closest('.hidden')&&!el.closest('[hidden]'));if(items.length){const first=items[0],last=items.at(-1),active=document.activeElement,inside=$('dialog').contains?.(active)??false;if(!inside){e.preventDefault();(e.shiftKey?last:first).focus()}else if(e.shiftKey&&active===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&active===last){e.preventDefault();first.focus()}}return}if(talking||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;const k=e.key.toLowerCase();if(state.scene==='town'&&('wasd'.includes(k)||e.key.startsWith('Arrow'))){keys.add(k);e.preventDefault()}if(state.scene!=='town'&&/^[1-9]$/.test(k)){const o=objects()[Number(k)-1];if(o)interact(o)}if(k==='e'&&state.scene==='town')interact()});document.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(state.scene==='town')save()});
window.addEventListener?.('blur',()=>{keys.clear();if(state.scene==='town')save()});
function loop(t){
 const seconds=lastFrame?Math.min(Math.max((t-lastFrame)/1000,0),.05):0;
 lastFrame=t;
 if(!$('gameScreen').hidden&&!gameOverlayOpen()&&state.scene==='town'&&!talking&&!state.finished&&townCanvas){
  const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const previousFacing=facing,wasWalking=walkingFrame>=0;
  walkingFrame=-1;
  if(dx||dy){
   facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
   const [x,y]=LUMINA_TILEMAP.move(state.x,state.y,dx,dy,seconds);
   if(x!==state.x||y!==state.y){
    state.x=x;state.y=y;stride+=seconds*9;walkingFrame=stride;render();
    if(t-lastSave>250){save();lastSave=t}
   }
  }
  if(walkingFrame<0&&(wasWalking||facing!==previousFacing)){
   renderTown();
   renderMinimap();
  }
 }
 requestAnimationFrame(loop)
}
requestAnimationFrame(loop);
if(typeof ResizeObserver!=='undefined'){
 const mapResize=new ResizeObserver(()=>{if(townCanvas&&state.scene==='town')renderTown()});
 mapResize.observe($('map'));
}
function showGame(show){
 keys.clear();
 walkingFrame=-1;
 if(talking)close();
 $('mainMenu').hidden=show;
 $('gameScreen').hidden=!show;
 if(show){
  render();
  $('sceneName').focus();
 }else{
  save();
  $('startGame').focus();
 }
}
$('startGame').onclick=()=>showGame(true);
$('backToMenu').onclick=()=>showGame(false);
$('showGuide').onclick=()=>$('howToPlay').showModal();
function gameOverlayOpen(){return $('inventory').open||$('worldMap').open}
function toggleGameOverlay(id){
 if(talking||$('gameScreen').hidden)return;
 const overlay=$(id);
 if(overlay.open){
  overlay.close();
  return;
 }
 if(gameOverlayOpen())return;
 keys.clear();
 if(id==='worldMap')renderOverview();
 else renderProgress();
 overlay.showModal();
}
$('showInventory').onclick=()=>toggleGameOverlay('inventory');
$('showWorldMap').onclick=()=>toggleGameOverlay('worldMap');
initOverview();
document.addEventListener('keydown',event=>{
 const key=event.key.toLowerCase();
 if((key!=='b'&&key!=='m')||event.repeat||event.isComposing||event.defaultPrevented
  ||event.altKey||event.ctrlKey||event.metaKey||talking||$('gameScreen').hidden)return;
 const target=event.target;
 if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
 const id=key==='m'?'worldMap':'inventory';
 if(gameOverlayOpen()&&!$(id).open)return;
 event.preventDefault();
 toggleGameOverlay(id);
});
if(new URLSearchParams(location.search).has('test')){const lab=document.createElement('section');lab.id='endingLab';const heading=document.createElement('h2');heading.textContent='結局測試預覽';const select=document.createElement('select');for(const rule of LUMINA_ENDINGS.rules){const option=document.createElement('option');option.value=rule.id;option.textContent=rule.title;select.append(option)}const button=document.createElement('button');button.textContent='預覽選取結局';button.onclick=()=>{const ending=LUMINA_ENDINGS.storyEnding(LUMINA_ENDINGS.endingTestState(select.value));openSystem(`測試預覽・${ending.title}`,`${ending.text}\n\n你留下的改變：\n${ending.impact.join('\n')}\n\n這是模擬條件，不會改動目前存檔。`)};const note=document.createElement('p');note.textContent='測試預覽不會改動存檔；實際結局仍要玩完第七天。';lab.append(heading,select,button,note);$('questDetails').append(lab)}
$('interact').onclick=()=>interact();$('rest').onclick=()=>{if(talking)return;if(state.finished)showEnding();else nextDay();render()};$('restart').onclick=()=>{if(talking)return;if(confirm('確定重新開始七天故事？目前進度會被覆蓋。')){state=fresh();keys.clear();history=[];busy=false;endingOpen=false;lastMapKey='';lastNetworkKey=null;lastProgressKey='';close();save()}};$('close').onclick=close;$('talkForm').onsubmit=e=>{e.preventDefault();const v=$('talk').value.trim();if(v){$('talk').value='';speak(v)}};render();
