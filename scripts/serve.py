"""Servidor estático enhebrado para las pruebas e2e.

El ``http.server`` de la biblioteca estándar atiende una sola petición a la
vez. Con 25 páginas cargando sus recursos en paralelo, alguna navegación
supera el timeout de 30 s de Playwright de forma intermitente. Esta variante
levanta un hilo por petición.

Uso: python scripts/serve.py [puerto]
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError):
            # El navegador corta las conexiones keep-alive al cerrar la página.
            self.close_connection = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4174
    with ThreadingHTTPServer(('127.0.0.1', port), Handler) as httpd:
        httpd.serve_forever()


if __name__ == '__main__':
    main()
