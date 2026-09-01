#!/usr/bin/env python3
"""Static server with the cross-origin isolation headers that SharedArrayBuffer
(Emscripten pthreads) requires. Usage: coop-server.py <dir> [port]"""
import http.server, os, sys
os.chdir(sys.argv[1]); port = int(sys.argv[2]) if len(sys.argv) > 2 else 8090
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.js': 'text/javascript', '.mzf': 'application/octet-stream'}
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
