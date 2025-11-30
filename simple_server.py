#!/usr/bin/env python3
"""
Ultra Simple HTTP Server for SWF Dashboard
Uses only Python standard library with no dependencies
"""

import http.server
import socketserver

# Define the port
PORT = 5000

# Define the handler
class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    # Override the default path to serve our HTML file
    def do_GET(self):
        self.path = '/html/dashboard.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Create and start the server
with socketserver.TCPServer(("0.0.0.0", PORT), SimpleHandler) as httpd:
    print(f"SWF Dashboard running on http://0.0.0.0:{PORT}")
    httpd.serve_forever()