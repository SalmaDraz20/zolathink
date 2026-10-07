"""Static Zola site and durable local Mission 0 registration endpoint."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from uuid import UUID

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / '.local' / 'registrations.sqlite3'
GRADES = ['الصف الخامس الابتدائي', 'الصف السادس الابتدائي', 'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي']
TIMES = ['الجمعة — 7 مساءً', 'السبت — 7 مساءً']
INTERESTS = ['التحديات والألغاز', 'التكنولوجيا والبرمجة', 'التصميم والإبداع', 'العلوم والتجارب', 'الأرقام والرياضيات', 'البيزنس والتفاوض', 'صناعة المحتوى', 'القيادة والعمل مع فريق', 'لسه بيكتشف اهتماماته']

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        # Never serve registration records, internal files, or source directories.
        from urllib.parse import unquote, urlsplit
        parts = Path(unquote(urlsplit(self.path).path)).parts
        if any(part.startswith('.') for part in parts) or any(part in ('server.py', 'REGISTRATION.md') for part in parts):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        self.do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/registrations':
            self.reply(404, {'ok': False})
            return
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            self.reply(415, {'ok': False})
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > 8192:
                self.reply(413, {'ok': False})
                return
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Invalid object')
            for key in ['studentName', 'parentName']:
                if not isinstance(data.get(key), str) or not 2 <= len(data[key].strip()) <= 80:
                    raise ValueError('Invalid name')
                data[key] = data[key].strip()
            if data.get('grade') not in GRADES or data.get('preferredTime') not in TIMES:
                raise ValueError('Invalid choice')
            if not isinstance(data.get('parentWhatsapp'), str) or not re.fullmatch(r'(01[0125]\d{8}|(?:\+|00)[1-9]\d{7,14})', data['parentWhatsapp'], re.ASCII):
                raise ValueError('Invalid phone')
            interests = data.get('interests', [])
            if not isinstance(interests, list) or len(interests) > 9 or any(i not in INTERESTS for i in interests):
                raise ValueError('Invalid interests')
            career = data.get('dreamCareer', '')
            if not isinstance(career, str) or len(career) > 160:
                raise ValueError('Invalid career')
            request_id = str(UUID(data['requestId']))
        except (ValueError, TypeError, KeyError, AttributeError):
            self.reply(400, {'ok': False, 'message': 'راجع بيانات الحجز.'})
            return
        try:
            with sqlite3.connect(DATABASE) as db:
                db.execute('INSERT OR IGNORE INTO registrations (id, created_at, student_name, grade, parent_name, parent_whatsapp, preferred_time, interests, dream_career) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', (request_id, datetime.now(timezone.utc).isoformat(), data['studentName'], data['grade'], data['parentName'], data['parentWhatsapp'], data['preferredTime'], json.dumps(interests, ensure_ascii=False), career.strip()))
            self.reply(201, {'ok': True, 'registrationId': request_id})
        except sqlite3.Error:
            self.reply(503, {'ok': False, 'message': 'تعذر حفظ الحجز. حاول مرة أخرى.'})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8001)
    args = parser.parse_args()
    DATABASE.parent.mkdir(exist_ok=True)
    with sqlite3.connect(DATABASE) as db:
        db.execute('CREATE TABLE IF NOT EXISTS registrations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, student_name TEXT NOT NULL, grade TEXT NOT NULL, parent_name TEXT NOT NULL, parent_whatsapp TEXT NOT NULL, preferred_time TEXT NOT NULL, interests TEXT NOT NULL, dream_career TEXT NOT NULL)')
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
