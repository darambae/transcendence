import logging
import socket

class JSONSocketHandler(logging.Handler):
    def __init__(self, host, port, tag=None):
        super().__init__()
        self.host = host
        self.port = port
        self.tag = tag
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM) # initializes a TCP/IP socket
        self.sock.connect((self.host, self.port))

    def emit(self, record):
        try:
            log_entry = self.format(record)
            self.sock.sendall(log_entry.encode('utf-8') + b'\n')
        except Exception as e:
            print(f"Failed to send log entry: {e}")