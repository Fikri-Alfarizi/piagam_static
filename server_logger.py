import http.server
import socketserver
import json
import sys

class ErrorLoggerHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/log-error':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                error_data = json.loads(post_data.decode('utf-8'))
                with open('error_log.txt', 'a', encoding='utf-8') as f:
                    f.write('\n==== BROWSER ERROR CAUGHT ====\n')
                    f.write(error_data.get('message', '') + '\n')
                    f.write(f"Line: {error_data.get('line', '')} Col: {error_data.get('col', '')}\n")
                    f.write(error_data.get('stack', '') + '\n')
                    f.write('==============================\n')
            except Exception as e:
                with open('error_log.txt', 'a', encoding='utf-8') as f:
                    f.write(f'Error parsing post data: {e}\n')
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')

PORT = 8081
with socketserver.TCPServer(('', PORT), ErrorLoggerHTTPRequestHandler) as httpd:
    print('Serving at port', PORT)
    httpd.serve_forever()
