#!/usr/bin/env python3
"""Loopback-only QA: synthetic roads, SQLite revision transactions, no Supabase calls.
Run python3 scripts/local-qa-server.py. Ports 8787/8788 use isolated browser storage
but share a disposable local database. This is NOT a Supabase RPC certification.
"""
import argparse
import json
import sqlite3
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
TOKEN = 'local-qa-only-not-a-real-credential'
FIXTURE = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'__bike_id': 'local-qa-route', 'number': '연습용 노선', '자전도로명': '연습용 노선', '구분': '전용도로', '도로폭원': 3, '비고': '연습용 초기값'}, 'geometry': {'type': 'LineString', 'coordinates': [[126.724, 35.967], [126.731, 35.969], [126.738, 35.971]]}}]}
GUARD = '''<script>
// Test-server response only: reject all external fetches, even reads.
const qaFetch=window.fetch.bind(window);window.fetch=(input,options)=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(url.origin!==location.origin)return Promise.reject(Error('연습 환경: 외부 API 연결 차단'));
 return qaFetch(input,options);
};
localStorage.setItem('gunsan_bike:cloud-session-v1',JSON.stringify({access_token:'local-qa-only-not-a-real-credential',expires_at:Date.now()/1000+86400,user:{email:'local-qa@example.invalid'}}));
</script>'''


def make_handler(db_path):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def send(self, status, value, content_type='application/json; charset=utf-8', cache='no-store'):
            raw = value.encode() if isinstance(value, str) else json.dumps(value, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(raw)))
            self.send_header('Cache-Control', cache)
            self.send_header('Content-Security-Policy', "connect-src 'self'; form-action 'self'; object-src 'none'")
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self):
            parsed = urlparse(self.path)
            route = parsed.path
            if route == '/rest/v1/gunsan_bike_datasets':
                with sqlite3.connect(db_path) as db:
                    data, revision = db.execute('SELECT data,revision FROM dataset WHERE id=1').fetchone()
                    full = 'data' in parse_qs(parsed.query).get('select', [''])[0].split(',')
                    db.execute('INSERT INTO requests(port,kind) VALUES(?,?)', (self.server.server_port, 'full' if full else 'metadata'))
                row = {'revision': revision, 'updated_at': '2026-10-23T00:00:00Z'}
                if full:
                    row['data'] = json.loads(data)
                return self.send(200, [row])
            if route == '/__qa__/status':
                with sqlite3.connect(db_path) as db:
                    data, revision = db.execute('SELECT data,revision FROM dataset WHERE id=1').fetchone()
                    requests = db.execute('SELECT port,kind,count(*) FROM requests GROUP BY port,kind').fetchall()
                return self.send(200, {'environment': 'local SQLite, NOT Supabase', 'revision': revision, 'data': json.loads(data), 'requests': requests})
            if route == '/__qa__/':
                html = (ROOT / 'scripts/local-qa.html').read_text().replace('<head>', '<head>' + GUARD, 1)
                return self.send(200, html, 'text/html; charset=utf-8')
            if route in ('/', '/index.html'):
                html = (ROOT / 'index.html').read_text()
                html = html.replace('<head>', '<head>' + GUARD, 1)
                html = html.replace('<body>', '<body><div style="position:fixed;left:40%;top:8px;z-index:999999;background:#9f1239;color:white;padding:8px 16px;border-radius:8px;font-weight:bold;pointer-events:none">연습 환경 · 운영 DB 연결 차단 · 화면 ' + str(self.server.server_port) + '</div>', 1)
                return self.send(200, html, 'text/html; charset=utf-8')
            if route == '/cloud-storage.js':
                source = (ROOT / 'cloud-storage.js').read_text()
                source = source.replace("const URL='https://zdjuksmhtvhetzblczqq.supabase.co'", "const URL=''")
                return self.send(200, source, 'text/javascript; charset=utf-8')
            if route == '/roads.geojson':
                return self.send(200, FIXTURE)
            # Only checked-in/static public files; never expose Git or dotfiles.
            if any(part.startswith('.') for part in Path(route).parts) or not self.translate_path(route).startswith(str(ROOT)):
                return self.send(404, {'message': 'not found'})
            return super().do_GET()

        def do_POST(self):
            route = urlparse(self.path).path
            if route != '/rest/v1/rpc/save_gunsan_bike':
                return self.send(404, {'message': 'Only the local test save RPC is enabled.'})
            if self.headers.get('Authorization') != 'Bearer ' + TOKEN:
                return self.send(401, {'message': 'Local QA authentication required.'})
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
            with sqlite3.connect(db_path, timeout=10) as db:
                db.execute('BEGIN IMMEDIATE')
                revision = db.execute('SELECT revision FROM dataset WHERE id=1').fetchone()[0]
                if body['p_revision'] != revision:
                    db.execute('INSERT INTO requests(port,kind) VALUES(?,?)', (self.server.server_port, 'conflict'))
                    self.send(409, {'message': '다른 컴퓨터에서 먼저 저장했습니다. 현재 작업을 내보낸 후 최신 노선을 다시 불러오세요.'})
                    return
                db.execute('UPDATE dataset SET data=?,revision=revision+1 WHERE id=1', (json.dumps(body['p_data'], ensure_ascii=False),))
                db.execute('INSERT INTO requests(port,kind) VALUES(?,?)', (self.server.server_port, 'save'))
            return self.send(200, [{'revision': revision + 1}])
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ports', nargs='+', type=int, default=[8787, 8788])
    args = parser.parse_args()
    # NamedTemporaryFile creates the database outside the repository and never touches a real DB.
    temp = tempfile.NamedTemporaryFile(prefix='gunsan-local-qa-', suffix='.sqlite', delete=False)
    db_path = temp.name
    temp.close()
    with sqlite3.connect(db_path) as db:
        db.execute('CREATE TABLE dataset(id INTEGER PRIMARY KEY,data TEXT,revision INTEGER)')
        db.execute('INSERT INTO dataset VALUES(1,?,7)', (json.dumps(FIXTURE, ensure_ascii=False),))
        db.execute('CREATE TABLE requests(port INTEGER,kind TEXT)')
    servers = [ThreadingHTTPServer(('127.0.0.1', port), make_handler(db_path)) for port in args.ports]
    for server in servers:
        threading.Thread(target=server.serve_forever, daemon=True).start()
    print(json.dumps({'origins': ['http://127.0.0.1:' + str(server.server_port) for server in servers], 'environment': 'local-only'}), flush=True)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        for server in servers:
            server.shutdown()
    finally:
        Path(db_path).unlink(missing_ok=True)


if __name__ == '__main__':
    main()
