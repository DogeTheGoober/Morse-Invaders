"""Dev server for Morse Invaders that disables caching (serves www/).

Uses a threading server so browser keep-alive connections don't block it.
"""
import http.server
import os

PORT = 8778
WWW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")
os.chdir(WWW)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving {WWW} at http://localhost:{PORT} (no-cache, threaded)")
    httpd.serve_forever()
