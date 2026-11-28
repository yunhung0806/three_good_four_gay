import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('python server matches the node HTTP contract',async t=>{
  const win=process.platform==='win32',command=win?'py':'python3',args=win?['-3','server.py']:['server.py'];
  const env={...process.env,PORT:'0'};
  delete env.OPENAI_API_KEY;
  const proc=spawn(command,args,{cwd:fileURLToPath(new URL('..',import.meta.url)),env,stdio:['ignore','pipe','pipe']});
  let output='';
  const port=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Python server did not start')),10000);
    proc.stdout.on('data',chunk=>{output+=chunk.toString();const match=output.match(/localhost:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]))}});
    proc.on('error',error=>{clearTimeout(timer);reject(error)});
    proc.on('exit',code=>{clearTimeout(timer);reject(new Error(`Python server exited with ${code}: ${output}`))});
  }).catch(error=>{if(error.code==='ENOENT'){t.skip(`${command} not available`);return null}throw error});
  if(port===null)return;
  const base=`http://127.0.0.1:${port}`;
  try{
    const config=await fetch(`${base}/api/config`);
    assert.equal(config.status,200);
    assert.equal((await config.json()).mode,'離線備援');
    for(const path of ['/interface.css','/src/tilemap.js','/src/offline.js']){
      const response=await fetch(base+path);
      assert.equal(response.status,200,path);
      assert.ok((await response.text()).length,path);
    }
    assert.equal((await fetch(`${base}/package.json`)).status,404);
    const ok=await fetch(`${base}/api/dialogue`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({person:'ning',input:'你好'})});
    assert.equal(ok.status,200);
    assert.equal((await ok.json()).mode,'離線備援');
    assert.equal((await fetch(`${base}/api/dialogue`,{method:'POST',headers:{'content-type':'application/json'},body:'[]'})).status,400);
    assert.equal((await fetch(`${base}/api/config`,{method:'POST'})).status,405);
    assert.equal((await fetch(`${base}/api/dialogue`,{method:'OPTIONS'})).status,204);
  }finally{proc.kill()}
});
test('python env helpers match node defaults',t=>{
  const win=process.platform==='win32',command=win?'py':'python3';
  const args=win?['-3','-c','import server;print(server.normalize_host(""),server.parse_port(""),server.env_value("sk-abc # note"))']:['-c','import server;print(server.normalize_host(""),server.parse_port(""),server.env_value("sk-abc # note"))'];
  const result=spawnSync(command,args,{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
  if(result.error?.code==='ENOENT'){t.skip(`${command} not available`);return}
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout.trim(),'127.0.0.1 3000 sk-abc');
});
