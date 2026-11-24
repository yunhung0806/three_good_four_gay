import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDialogue } from './src/dialogue.js';

const root=path.dirname(fileURLToPath(import.meta.url));
try { for(const line of (await fs.readFile(path.join(root,'.env'),'utf8')).split(/\r?\n/)){const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');} } catch {}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/api/config'){res.writeHead(200,{'content-type':mime['.json']});return res.end(JSON.stringify({mode:process.env.OPENAI_API_KEY?'AI':'離線備援'}));}
    if(req.url==='/api/dialogue'&&req.method==='POST'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>12000){res.writeHead(413);return res.end();}}
      const result=await resolveDialogue(JSON.parse(body));res.writeHead(200,{'content-type':mime['.json']});return res.end(JSON.stringify(result));
    }
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    const url=new URL(req.url,'http://localhost');const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);if(!/^\/(?:index\.html|game\.js|style\.css|assets\/[\w.-]+\.png|src\/(?:world|story|endings|npc-actions|diagnostics)\.js)$/.test(requested)){res.writeHead(404);return res.end();}const file=path.resolve(root,'.'+requested);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:400,{'content-type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT||3000),()=>console.log(`Lumina Café: http://localhost:${process.env.PORT||3000}`));
export default server;
