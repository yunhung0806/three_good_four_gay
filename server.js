import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveDialogue } from './src/dialogue.js';

const root=path.dirname(fileURLToPath(import.meta.url));
function envValue(raw){const value=String(raw??'').trim();if(value[0]==='"'||value[0]==="'"){const end=value.indexOf(value[0],1);return end===-1?value.slice(1):value.slice(1,end)}return value.split(/\s+#/,1)[0].trim()}
try {
  const text=await fs.readFile(path.join(root,'.env'),'utf8');
  for(const line of text.split(/\r?\n/)){
    const match=line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Z0-9_]*)=(.*)$/);
    if(!match)continue;
    const key=match[1].toUpperCase();
    if(process.env[key]===undefined)process.env[key]=envValue(match[2]);
  }
} catch(error) { if(error.code!=='ENOENT')console.warn(`.env 讀取失敗：${error.message}`); }
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};
const staticRoutes=new Set(['/index.html','/game.js','/style.css','/src/world.js','/src/story.js','/src/npc-actions.js','/src/endings.js','/src/diagnostics.js','/src/offline.js']);
const assetPattern=/^\/assets\/[\w.-]+\.png$/;
const rateWindow=60_000,rateLimitCount=20,maxActive=4;
const hits=new Map();
let active=0;
function prune(){const now=Date.now();for(const [ip,times] of hits){const kept=times.filter(t=>now-t<rateWindow);if(kept.length)hits.set(ip,kept);else hits.delete(ip)}}
setInterval(prune,rateWindow).unref?.();
function allowRequest(ip){const now=Date.now(),times=(hits.get(ip)||[]).filter(t=>now-t<rateWindow);if(times.length>=rateLimitCount){hits.set(ip,times);return false}times.push(now);hits.set(ip,times);return true}
function cors(req){const headers={},origin=process.env.ALLOWED_ORIGIN;if(origin&&req.headers.origin===origin)Object.assign(headers,{'access-control-allow-origin':origin,vary:'Origin','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Content-Type'});return headers}
function sendJson(req,res,status,data,extra={}){if(res.headersSent){res.end();return}const body=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':body.length,...cors(req),...extra});res.end(body)}
function sendBuffer(req,res,status,body,type){if(res.headersSent){res.end();return}res.writeHead(status,{'content-type':type,'content-length':body.length,'cache-control':'no-store',...cors(req)});res.end(body)}
function noContent(req,res){if(res.headersSent){res.end();return}res.writeHead(204,{'allow':'GET, POST, OPTIONS',...cors(req)});res.end()}
function parsePort(raw){const value=envValue(raw).replace(/^["']|["']$/g,'');if(!/^\d+$/.test(value))return 3000;const number=Number(value);return Number.isInteger(number)&&number<=65535?number:3000}
function normalizeHost(raw){return envValue(raw)||'127.0.0.1'}
const host=normalizeHost(process.env.HOST);
const port=parsePort(process.env.PORT);
const server=http.createServer(async(req,res)=>{
  let url;
  try{url=new URL(req.url,'http://localhost')}catch{return sendJson(req,res,400,{error:'無效的請求路徑'})}
  let route;
  try{route=decodeURIComponent(url.pathname)}catch{return sendJson(req,res,400,{error:'無效的請求路徑'})}
  try{
    if(route==='/api/config'||route==='/api/dialogue'||route==='/'){
      if(req.method==='OPTIONS')return noContent(req,res);
      if(route==='/api/config'){
        if(req.method!=='GET')return sendJson(req,res,405,{error:'不允許的方法'});
        return sendJson(req,res,200,{mode:process.env.OPENAI_API_KEY?'AI':'離線備援'});
      }
    }
    if(route==='/api/dialogue'){
      if(req.method!=='POST')return sendJson(req,res,405,{error:'不允許的方法'});
      if(req.headers['transfer-encoding'])return sendJson(req,res,400,{error:'不支援分段請求'});
      if(!allowRequest(req.socket.remoteAddress||'unknown'))return sendJson(req,res,429,{error:'請求過於頻繁'},{'retry-after':'60'});
      if(active>=maxActive)return sendJson(req,res,503,{error:'目前請求過多，請稍後再試'},{'retry-after':'5'});
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>12000){req.resume();return sendJson(req,res,413,{error:'資料過長'})}chunks.push(chunk)}
      let data;
      try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return sendJson(req,res,400,{error:'無效的請求資料'})}
      if(!data||typeof data!=='object'||Array.isArray(data))return sendJson(req,res,400,{error:'無效的請求資料'});
      active++;
      try{const result=await resolveDialogue(data);return sendJson(req,res,200,result)}
      catch(error){console.error(`dialogue error: ${error.message}`);return sendJson(req,res,400,{error:'無效的請求資料'})}
      finally{active--}
    }
    if(req.method==='OPTIONS')return noContent(req,res);
    if(req.method!=='GET')return sendJson(req,res,405,{error:'不允許的方法'});
    const requested=route==='/'?'/index.html':route;
    if(!staticRoutes.has(requested)&&!assetPattern.test(requested))return sendJson(req,res,404,{error:'Not found'});
    const file=path.resolve(root,'.'+requested),real=await fs.realpath(file);
    const rootReal=await fs.realpath(root);
    if(real!==rootReal&&!real.startsWith(rootReal+path.sep))return sendJson(req,res,403,{error:'Forbidden'});
    const data=await fs.readFile(real);
    return sendBuffer(req,res,200,data,mime[path.extname(real)]||'application/octet-stream');
  }catch(error){
    if(error.code==='ENOENT'||error.code==='ENOTDIR')return sendJson(req,res,404,{error:'Not found'});
    console.error(`server error: ${error.message}`);
    return sendJson(req,res,500,{error:'伺服器錯誤'});
  }
});
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)server.listen(port,host,()=>console.log(`Lumina Café: http://localhost:${server.address().port}`));
export { envValue, normalizeHost, parsePort };
export default server;
