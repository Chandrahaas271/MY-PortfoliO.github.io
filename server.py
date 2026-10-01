import http.server
import socketserver
import json
import os
import sys
import urllib.parse

PORT = int(os.environ.get("PORT", 3000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
MESSAGES_FILE = os.path.join(DIRECTORY, "messages.json")

class PortfolioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/messages':
            messages = []
            if os.path.exists(MESSAGES_FILE):
                try:
                    with open(MESSAGES_FILE, 'r', encoding='utf-8') as f:
                        messages = json.load(f)
                except Exception:
                    messages = []
            
            body = json.dumps({"count": len(messages), "messages": messages}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/contact':
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length).decode('utf-8')
            
            data = {}
            if raw_body.strip():
                try:
                    data = json.loads(raw_body)
                except Exception:
                    parsed_body = urllib.parse.parse_qs(raw_body)
                    data = {k: v[0] for k, v in parsed_body.items()}

            name = str(data.get('name', '')).strip()
            email = str(data.get('email', '')).strip()
            message = str(data.get('message', '')).strip()
            subject = str(data.get('subject', 'Portfolio Inquiry')).strip()

            if not name or not email or not message:
                body = json.dumps({"error": "Name, email and message are required."}).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(body)
                return

            messages = []
            if os.path.exists(MESSAGES_FILE):
                try:
                    with open(MESSAGES_FILE, 'r', encoding='utf-8') as f:
                        messages = json.load(f)
                except Exception:
                    messages = []

            import time
            import random
            import string
            
            msg_id = hex(int(time.time()))[2:] + ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
            
            from datetime import datetime
            new_msg = {
                "id": msg_id,
                "name": name[:100],
                "email": email[:200],
                "subject": subject[:200],
                "message": message[:2000],
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }
            messages.insert(0, new_msg)

            with open(MESSAGES_FILE, 'w', encoding='utf-8') as f:
                json.dump(messages, f, indent=2)

            body = json.dumps({"ok": True, "message": "Message received! Chandrahaas will respond promptly."}).encode('utf-8')
            self.send_response(201)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            return

        body = json.dumps({"error": "Not found"}).encode('utf-8')
        self.send_response(404)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), PortfolioHandler) as httpd:
        print(f"Portfolio Cinematic Server running at http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()
