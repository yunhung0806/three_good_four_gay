import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import server, {envValue, normalizeHost, parsePort} from '../server.js';

let base;
before(async()=>{
  delete process.env.OPENAI_API_KEY;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{
  await new Promise(resolve=>server.close(resolve));
});
test('serves the game config and allowlisted static files',async()=>{
  const config=await fetch(`${base}/api/config`);
  assert.equal(config.status,200);
  assert.equal((await config.json()).mode,'離線備援');
  for(const file of ['/index.html','/game.js','/src/offline.js','/assets/town.png']){
    const response=await fetch(base+file);
    assert.equal(response.status,200,file);
  }
  assert.equal((await fetch(`${base}/package.json`)).status,404);
  assert.equal((await fetch(`${base}/assets/%2e%2e/server.py`)).status,404);
});
test('accepts dialogue and rejects malformed requests',async()=>{
  const ok=await fetch(`${base}/api/dialogue`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({person:'ning',input:'你好'})});
  assert.equal(ok.status,200);
  assert.equal((await ok.json()).mode,'離線備援');
  const bad=await fetch(`${base}/api/dialogue`,{method:'POST',headers:{'content-type':'application/json'},body:'[]'});
  assert.equal(bad.status,400);
  const large=await fetch(`${base}/api/dialogue`,{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(13000)});
  assert.equal(large.status,413);
  assert.equal((await fetch(`${base}/api/dialogue`,{method:'POST'})).status,400);
  assert.equal((await fetch(`${base}/api/config`,{method:'POST'})).status,405);
  assert.equal((await fetch(`${base}/api/dialogue`,{method:'OPTIONS'})).status,204);
});
test('blank and quoted env values use safe defaults',()=>{
  assert.equal(normalizeHost(''),'127.0.0.1');
  assert.equal(normalizeHost(undefined),'127.0.0.1');
  assert.equal(parsePort(''),3000);
  assert.equal(parsePort('0x3000'),3000);
  assert.equal(parsePort('"3100"'),3100);
  assert.equal(envValue('sk-abc # note'),'sk-abc');
});
test('chunked dialogue bodies are rejected',async()=>{
  const status=await new Promise(resolve=>{
    const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/dialogue',method:'POST',headers:{'transfer-encoding':'chunked'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});
    req.on('error',()=>resolve(0));req.end('{}');
  });
  assert.equal(status,400);
});
