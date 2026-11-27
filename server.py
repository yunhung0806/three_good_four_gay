"""Dependency-free Lumina Café server for Windows systems with Python."""
import json
import os
import re
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote
from urllib.request import Request, urlopen
from urllib.error import URLError


def env_value(raw):
    if raw is None:
        return ''
    value = str(raw).strip()
    if value[:1] in ('"', "'"):
        end = value.find(value[0], 1)
        return value[1:end] if end != -1 else value[1:]
    return re.split(r'\s+#', value, 1)[0].strip()


def safe_json(value, limit=500):
    try:
        return json.dumps(value, ensure_ascii=False, default=str)[:limit]
    except (TypeError, ValueError):
        return '[]'


ROOT = Path(__file__).resolve().parent
env_file = ROOT / '.env'
if env_file.exists():
    try:
        for line in env_file.read_text(encoding='utf-8').splitlines():
            match = re.match(r'^(?:export\s+)?([A-Za-z_][A-Z0-9_]*)=(.*)$', line.strip())
            if match:
                os.environ.setdefault(match[1].upper(), env_value(match[2]))
    except (OSError, UnicodeError) as error:
        print(f'.env 讀取失敗：{error}')

ROLES = {
    'ning': '考試受挫的學生，想被理解，不喜歡空泛鼓勵', 'yu': '麵包店店主，擔心剩食，擅長烘焙',
    'an': '公園志工，想修好長椅，擅長木工', 'mei': '雜貨店老闆，重視鄰里連結',
    'hao': '過勞上班族，需要有人傾聽', 'gran': '小鎮長者，重視陪伴與往事',
}
STATIC = {'/': 'index.html', '/index.html': 'index.html', '/game.js': 'game.js',
          '/style.css': 'style.css', '/src/world.js': 'src/world.js',
          '/src/story.js': 'src/story.js', '/src/npc-actions.js': 'src/npc-actions.js',
          '/src/diagnostics.js': 'src/diagnostics.js', '/src/offline.js': 'src/offline.js',
          '/src/endings.js': 'src/endings.js'}
MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.png': 'image/png'}
ASSET_PATTERN = re.compile(r'^/assets/[\w.-]+\.png$')
RATE_WINDOW = 60.0
RATE_LIMIT = 20
rate_lock = threading.Lock()
hits = {}
slots = threading.BoundedSemaphore(4)


def parse_port(raw):
    value = env_value(raw).strip('"\'')
    if not re.fullmatch(r'\d+', value):
        return 3000
    number = int(value)
    return number if number <= 65535 else 3000


def normalize_host(raw):
    return env_value(raw) or '127.0.0.1'


def allow_request(ip):
    now = time.monotonic()
    with rate_lock:
        times = [t for t in hits.get(ip, ()) if now - t < RATE_WINDOW]
        if len(times) >= RATE_LIMIT:
            hits[ip] = deque(times, maxlen=RATE_LIMIT)
            return False
        times.append(now)
        hits[ip] = deque(times, maxlen=RATE_LIMIT)
        return True


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
    if not isinstance(data, dict):
        raise ValueError('無效的對話資料')
    person, text = data.get('person'), data.get('input')
    if not isinstance(person, str) or person not in ROLES or not isinstance(text, str) or not text.strip() or len(text.strip()) > 180:
        raise ValueError('無效的對話資料')
    if not os.getenv('OPENAI_API_KEY'):
        return {'mode': '離線備援', **offline(text)}
    history = data.get('history', [])
    if not isinstance(history, list):
        history = []
    history = [h for h in history[-8:] if isinstance(h, dict)
               and h.get('role') in ('user', 'assistant') and isinstance(h.get('content'), str)]
    messages = [{'role': 'system', 'content': f'你是《微光咖啡館》的 {person}。背景：{ROLES[person]}。以繁體中文自然回應，最多80字。判斷玩家自由行動是否合理。只輸出 JSON: {{"reply":字串,"intent":"help|talk|memory|harm|none","emotion":"neutral|happy|sad|angry|surprised"}}。不可修改資源、規則或宣稱行動已成功。記憶探索須玩家明確詢問且角色自願。'}]
    messages += [{'role': h['role'], 'content': h['content'][:200]} for h in history]
    context = data.get('context') if isinstance(data.get('context'), dict) else {}
    safe_context = {'scene': context.get('scene'), 'day': context.get('day'), 'energy': context.get('energy'), 'helped': bool(context.get('helped'))}
    safe_context['memory'] = safe_json(context.get('memory') or [])
    safe_context['talk'] = safe_json(context.get('talk') or [])
    messages.append({'role': 'user', 'content': f'情境：{safe_json(safe_context, 2000)}\n玩家：{text.strip()}'})
    payload = json.dumps({'model': os.getenv('OPENAI_MODEL') or 'gpt-4.1-mini', 'temperature': .7,
                          'response_format': {'type': 'json_object'}, 'messages': messages}).encode()
    request = Request('https://api.openai.com/v1/chat/completions', data=payload,
                      headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'],
                               'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=12) as response:
            result = json.loads(response.read())
        choices = result.get('choices') if isinstance(result, dict) else None
        message = choices[0].get('message') if isinstance(choices, list) and choices and isinstance(choices[0], dict) else None
        content_text = message.get('content') if isinstance(message, dict) else None
        if not isinstance(content_text, str) or not content_text.strip():
            raise ValueError('AI 回應格式錯誤')
        content = json.loads(content_text)
        if not isinstance(content, dict):
            raise ValueError('AI 回應格式錯誤')
        intent = content.get('intent') if content.get('intent') in ('help', 'talk', 'memory', 'harm', 'none') else 'talk'
        emotion = content.get('emotion') if content.get('emotion') in ('neutral', 'happy', 'sad', 'angry', 'surprised') else 'neutral'
        return {'mode': 'AI', 'reply': str(content.get('reply') or '我聽見你說的話了。')[:160],
                'intent': intent, 'emotion': emotion}
    except (URLError, KeyError, ValueError, TypeError, TimeoutError, OSError):
        return {'mode': '離線備援', **offline(text)}


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        headers = {}
        origin = os.getenv('ALLOWED_ORIGIN')
        if origin and self.headers.get('Origin') == origin:
            headers['Access-Control-Allow-Origin'] = origin
            headers['Vary'] = 'Origin'
            headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return headers

    def send_data(self, status, body, content_type, extra=None):
        if getattr(self, '_wrote_headers', False):
            return
        headers = {'Content-Type': content_type, 'Content-Length': str(len(body)), 'Cache-Control': 'no-store', **self.cors()}
        headers.update(extra or {})
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        self._wrote_headers = True
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def send_json(self, status, data, extra=None):
        self.send_data(status, json.dumps(data, ensure_ascii=False).encode(), 'application/json; charset=utf-8', extra)

    def no_content(self):
        self.send_data(204, b'', 'text/plain; charset=utf-8', {'Allow': 'GET, POST, OPTIONS'})

    def do_OPTIONS(self):
        self.no_content()

    def do_GET(self):
        route = unquote(self.path.split('?', 1)[0])
        if route == '/api/config':
            return self.send_json(200, {'mode': 'AI' if os.getenv('OPENAI_API_KEY') else '離線備援'})
        if route == '/api/dialogue':
            return self.send_json(405, {'error': '不允許的方法'}, {'Allow': 'POST'})
        filename = STATIC.get(route)
        if not filename and ASSET_PATTERN.fullmatch(route):
            filename = route.lstrip('/')
        if not filename:
            return self.send_json(404, {'error': 'Not found'})
        try:
            target = (ROOT / filename).resolve(strict=True)
        except (OSError, RuntimeError):
            return self.send_json(404, {'error': 'Not found'})
        if not target.is_relative_to(ROOT):
            return self.send_json(403, {'error': 'Forbidden'})
        try:
            body = target.read_bytes()
        except OSError:
            return self.send_json(500, {'error': '伺服器錯誤'})
        return self.send_data(200, body, MIME.get(target.suffix, 'application/octet-stream'))

    def do_POST(self):
        route = unquote(self.path.split('?', 1)[0])
        if route == '/api/config':
            return self.send_json(405, {'error': '不允許的方法'}, {'Allow': 'GET'})
        if route != '/api/dialogue':
            return self.send_json(404, {'error': 'Not found'})
        if not allow_request(self.client_address[0]):
            return self.send_json(429, {'error': '請求過於頻繁'}, {'Retry-After': '60'})
        if self.headers.get('Transfer-Encoding'):
            return self.send_json(400, {'error': '不支援分段請求'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.send_json(400, {'error': '資料過長或為空'})
        if length < 1 or length > 12000:
            return self.send_json(413, {'error': '資料過長或為空'})
        if not slots.acquire(timeout=5):
            return self.send_json(503, {'error': '目前請求過多，請稍後再試'}, {'Retry-After': '5'})
        try:
            self.connection.settimeout(5)
            try:
                data = json.loads(self.rfile.read(length))
            except TimeoutError:
                return self.send_json(408, {'error': '讀取請求逾時'})
            except (ValueError, TypeError):
                return self.send_json(400, {'error': '無效的請求資料'})
            finally:
                self.connection.settimeout(None)
            if not isinstance(data, dict):
                return self.send_json(400, {'error': '無效的請求資料'})
            return self.send_json(200, dialogue(data))
        except (ValueError, TypeError):
            return self.send_json(400, {'error': '無效的請求資料'})
        except Exception as error:
            self.log_error(f'server error: {error}')
            return self.send_json(500, {'error': '伺服器錯誤'})
        finally:
            slots.release()


if __name__ == '__main__':
    host = normalize_host(os.getenv('HOST'))
    port = parse_port(os.getenv('PORT', '3000'))
    server = ThreadingHTTPServer((host, port), Handler)
    address = server.server_address[1]
    label = f'http://localhost:{address}' if host in ('127.0.0.1', 'localhost') else f'{host}:{address}'
    print(f'Lumina Café: {label}', flush=True)
    server.serve_forever()
