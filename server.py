"""Dependency-free Lumina Café server for Windows systems with Python."""
import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

ROOT = Path(__file__).resolve().parent
for line in (ROOT / '.env').read_text(encoding='utf-8').splitlines() if (ROOT / '.env').exists() else []:
    match = re.match(r'^([A-Z_]+)=(.*)$', line)
    if match:
        os.environ.setdefault(match[1], match[2].strip('"\''))

ROLES = {
    'ning': '考試受挫的學生，想被理解', 'yu': '麵包店店主，擔心剩食',
    'an': '公園志工，擅長木工', 'mei': '雜貨店老闆，重視鄰里連結',
    'hao': '過勞上班族，需要有人傾聽', 'gran': '小鎮長者，重視陪伴',
}
STATIC = {'/': 'index.html', '/index.html': 'index.html', '/game.js': 'game.js',
          '/style.css': 'style.css', '/src/world.js': 'src/world.js',
          '/src/story.js': 'src/story.js', '/src/npc-actions.js': 'src/npc-actions.js',
          '/src/diagnostics.js': 'src/diagnostics.js',
          '/src/endings.js': 'src/endings.js'}
MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.png': 'image/png'}


def offline(text):
    if re.search('搶|偷|打|騙|威脅|閉嘴|活該', text):
        return {'intent': 'harm', 'emotion': 'angry', 'reply': '這樣做會傷害人。我需要先保持距離。'}
    if re.search('記憶|過去|回憶|故事', text):
        return {'intent': 'memory', 'emotion': 'sad', 'reply': '這段往事對我很重要。如果你願意聽，我可以帶你看看。'}
    if re.search('可以幫|能幫|需要我|怎麼幫', text):
        return {'intent': 'talk', 'emotion': 'neutral', 'reply': '謝謝你先問我需要什麼。讓我想一想，再一起決定吧。'}
    if re.search('幫|協助|陪|聽|鼓勵|加油|分享|修|願意|一起|送|請', text):
        return {'intent': 'help', 'emotion': 'happy', 'reply': '謝謝你願意嘗試。我們可以一起慢慢來。'}
    return {'intent': 'talk', 'emotion': 'neutral', 'reply': '嗯，我聽見了。你可以再說說你的想法嗎？'}


def dialogue(data):
    person, text = data.get('person'), data.get('input')
    if person not in ROLES or not isinstance(text, str) or not text.strip() or len(text) > 180:
        raise ValueError('無效的對話資料')
    if not os.getenv('OPENAI_API_KEY'):
        return {'mode': '離線備援', **offline(text)}
    history = [h for h in data.get('history', [])[-8:] if isinstance(h, dict)
               and h.get('role') in ('user', 'assistant') and isinstance(h.get('content'), str)]
    messages = [{'role': 'system', 'content': f'你是《微光咖啡館》的角色 {person}：{ROLES[person]}。用繁體中文自然回應，最多80字。判斷玩家自由行動是否合理。只輸出 JSON：{{"reply":字串,"intent":"help|talk|memory|harm|none","emotion":"neutral|happy|sad|angry|surprised"}}。不可修改資源、規則或宣稱行動已成功。記憶探索須玩家明確詢問且角色自願。'}]
    messages += [{'role': h['role'], 'content': h['content'][:200]} for h in history]
    context = data.get('context') if isinstance(data.get('context'), dict) else {}
    safe_context = {key: context.get(key) for key in ('scene', 'day', 'energy', 'helped')}
    safe_context['memory'] = str(context.get('memory', []))[:500]
    safe_context['talk'] = str(context.get('talk', []))[:500]
    messages.append({'role': 'user', 'content': f'情境：{json.dumps(safe_context, ensure_ascii=False)}\n玩家：{text.strip()}'})
    payload = json.dumps({'model': os.getenv('OPENAI_MODEL', 'gpt-4.1-mini'), 'temperature': .7,
                          'response_format': {'type': 'json_object'}, 'messages': messages}).encode()
    request = Request('https://api.openai.com/v1/chat/completions', data=payload,
                      headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'],
                               'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=12) as response:
            result = json.loads(json.loads(response.read())['choices'][0]['message']['content'])
        intent = result.get('intent') if result.get('intent') in ('help', 'talk', 'memory', 'harm', 'none') else 'talk'
        emotion = result.get('emotion') if result.get('emotion') in ('neutral', 'happy', 'sad', 'angry', 'surprised') else 'neutral'
        return {'mode': 'AI', 'reply': str(result.get('reply') or '我聽見你說的話了。')[:160],
                'intent': intent, 'emotion': emotion}
    except (URLError, KeyError, ValueError, TimeoutError, OSError):
        return {'mode': '離線備援', **offline(text)}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = self.path.split('?', 1)[0]
        if route == '/api/config':
            return self.send_json(200, {'mode': 'AI' if os.getenv('OPENAI_API_KEY') else '離線備援'})
        filename = STATIC.get(route)
        if not filename and re.fullmatch(r'/assets/[\w.-]+\.png', route):
            filename = route.lstrip('/')
        if not filename or not (ROOT / filename).is_file():
            return self.send_json(404, {'error': 'Not found'})
        body = (ROOT / filename).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', MIME[Path(filename).suffix])
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/dialogue':
            return self.send_json(404, {'error': 'Not found'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 12000:
                raise ValueError('資料過長或為空')
            return self.send_json(200, dialogue(json.loads(self.rfile.read(length))))
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            return self.send_json(400, {'error': str(error)})


if __name__ == '__main__':
    port = int(os.getenv('PORT', '3000'))
    print(f'Lumina Café: http://localhost:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
