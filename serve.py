"""Dev server for Morse Invaders that disables caching (serves www/).

Uses a threading server so browser keep-alive connections don't block it.
Also accepts POST /upload?name=FILE to save an asset into docs/screenshots/
(used to capture in-app screenshots during development).
"""
import http.server
import os
from urllib.parse import urlparse, parse_qs

PORT = 8778
REPO = os.path.dirname(os.path.abspath(__file__))
WWW = os.path.join(REPO, "www")
os.chdir(WWW)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_POST(self):
        if urlparse(self.path).path == "/upload":
            q = parse_qs(urlparse(self.path).query)
            name = os.path.basename(q.get("name", ["out.bin"])[0])
            length = int(self.headers.get("Content-Length", 0))
            data = self.rfile.read(length)
            outdir = os.path.join(REPO, "docs", "screenshots")
            os.makedirs(outdir, exist_ok=True)
            with open(os.path.join(outdir, name), "wb") as f:
                f.write(data)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            self.send_response(404)
            self.end_headers()


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving {WWW} at http://localhost:{PORT} (no-cache, threaded)")
    httpd.serve_forever()
