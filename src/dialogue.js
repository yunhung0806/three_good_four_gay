import './offline.js';
const roles={ning:'考試受挫的學生，想被理解，不喜歡空泛鼓勵',yu:'麵包店店主，擔心剩食，擅長烘焙',an:'公園志工，想修好長椅，擅長木工',mei:'雜貨店老闆，重視鄰里連結',hao:'過勞上班族，需要有人傾聽',gran:'小鎮長者，重視陪伴與往事'};
const offline=globalThis.LUMINA_OFFLINE;
export async function resolveDialogue(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('無效的對話資料');
  const {person,input,history=[],context={}}=data;
  if(typeof person!=='string'||!Object.hasOwn(roles,person)||typeof input!=='string'||!input.trim()||[...input.trim()].length>180)throw Error('無效的對話資料');
  const cleaned=input.trim();
  if(!process.env.OPENAI_API_KEY)return {mode:'離線備援',...offline(cleaned)};
  const safeHistory=Array.isArray(history)?history.slice(-8).filter(x=>x&&typeof x==='object'&&['user','assistant'].includes(x.role)&&typeof x.content==='string'):[];
  const safeContext=context&&typeof context==='object'&&!Array.isArray(context)?context:{};
  const messages=[{role:'system',content:`你是《微光咖啡館》的 ${person}。背景：${roles[person]}。以繁體中文自然回應，最多80字。判斷玩家自由行動是否合理。只輸出 JSON: {"reply":字串,"intent":"help|talk|memory|harm|none","emotion":"neutral|happy|sad|angry|surprised"}。不可修改資源、規則或宣稱行動已成功。記憶探索須玩家明確詢問且角色自願。`},...safeHistory.map(x=>({role:x.role,content:x.content.slice(0,200)})),{role:'user',content:`情境：${JSON.stringify({scene:safeContext.scene,day:safeContext.day,energy:safeContext.energy,helped:!!safeContext.helped,memory:JSON.stringify(safeContext.memory||[]).slice(0,500),talk:JSON.stringify(safeContext.talk||[]).slice(0,500)})}\n玩家：${cleaned}`}];
  try{const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:.7,response_format:{type:'json_object'},messages}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`AI HTTP ${response.status}`);const payload=await response.json(),json=payload?.choices?.[0]?.message?.content&&JSON.parse(payload.choices[0].message.content);if(!json||typeof json!=='object'||Array.isArray(json))throw Error('AI 回應格式錯誤');return {mode:'AI',reply:String(json.reply||'我聽見你說的話了。').slice(0,160),intent:['help','talk','memory','harm','none'].includes(json.intent)?json.intent:'talk',emotion:['neutral','happy','sad','angry','surprised'].includes(json.emotion)?json.emotion:'neutral'};}catch{return {mode:'離線備援',...offline(cleaned)};}
}
