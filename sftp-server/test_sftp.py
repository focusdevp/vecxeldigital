#!/usr/bin/env python3
"""
Script de prueba para verificar el servidor SFTP
"""
import paramiko
import socket
import sys
import os
from pathlib import Path

# Configurar logging
import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleSFTPServer(paramiko.SFTPServerInterface):
    """Implementación simple de servidor SFTP"""
    
    def __init__(self, server, *args, **kwargs):
        super().__init__(server, *args, **kwargs)
        self.root = Path("sftp_uploads").absolute()
        self.root.mkdir(exist_ok=True)
        logger.info(f"SFTP root: {self.root}")
    
    def _realpath(self, path):
        """Convertir path SFTP a path del sistema"""
        if path == '.':
            return self.root
        path = path.lstrip('/')
        return self.root / path
    
    def list_folder(self, path):
        logger.info(f"list_folder: {path}")
        try:
            realpath = self._realpath(path)
            logger.info(f"Real path: {realpath}")
            
            if not realpath.exists():
                logger.warning(f"Path no existe: {realpath}")
                return paramiko.SFTP_NO_SUCH_FILE
            
            out = []
            for f in realpath.iterdir():
                attr = paramiko.SFTPAttributes.from_stat(f.stat())
                attr.filename = f.name
                out.append(attr)
            
            logger.info(f"Retornando {len(out)} items")
            return out
        except Exception as e:
            logger.error(f"Error en list_folder: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def stat(self, path):
        logger.info(f"stat: {path}")
        try:
            realpath = self._realpath(path)
            if not realpath.exists():
                return paramiko.SFTP_NO_SUCH_FILE
            return paramiko.SFTPAttributes.from_stat(realpath.stat())
        except Exception as e:
            logger.error(f"Error en stat: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def lstat(self, path):
        logger.info(f"lstat: {path}")
        return self.stat(path)
    
    def open(self, path, flags, attr):
        logger.info(f"open: {path}, flags: {flags}")
        try:
            realpath = self._realpath(path)
            
            if flags & os.O_WRONLY:
                if flags & os.O_APPEND:
                    mode = 'ab'
                else:
                    mode = 'wb'
            elif flags & os.O_RDWR:
                mode = 'r+b'
            else:
                mode = 'rb'
            
            logger.info(f"Abriendo archivo: {realpath} con modo {mode}")
            return paramiko.SFTPHandle(flags)
        except Exception as e:
            logger.error(f"Error en open: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE

class StubSFTPHandle(paramiko.SFTPHandle):
    def stat(self):
        return paramiko.SFTP_OK
    
    def chattr(self, attr):
        return paramiko.SFTP_OK

class SimpleSSHServer(paramiko.ServerInterface):
    def check_auth_password(self, username, password):
        logger.info(f"Auth attempt: {username}")
        if username == 'sac' and password == 'vecxel2026':
            logger.info("Auth successful")
            return paramiko.AUTH_SUCCESSFUL
        logger.warning("Auth failed")
        return paramiko.AUTH_FAILED
    
    def check_channel_request(self, kind, chanid):
        logger.info(f"Channel request: {kind}, {chanid}")
        if kind == 'session':
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED
    
    def get_allowed_auths(self, username):
        return 'password'
    
    def check_channel_subsystem_request(self, channel, name):
        logger.info(f"Subsystem request: {name}")
        if name == 'sftp':
            logger.info("SFTP subsystem accepted")
            return True
        logger.warning(f"Subsystem {name} rejected")
        return False

def start_server():
    """Iniciar servidor SFTP de prueba"""
    host_key = paramiko.RSAKey.generate(2048)
    
    logger.info("Iniciando servidor SFTP en puerto 2222...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('127.0.0.1', 2222))
    sock.listen(10)
    
    logger.info("Esperando conexiones...")
    
    while True:
        try:
            client, addr = sock.accept()
            logger.info(f"Conexión desde {addr}")
            
            transport = paramiko.Transport(client)
            transport.add_server_key(host_key)
            
            # IMPORTANTE: Registrar el subsistema ANTES de start_server
            server = SimpleSSHServer()
            transport.set_subsystem_handler('sftp', paramiko.SFTPServer, SimpleSFTPServer)
            
            transport.start_server(server=server)
            
            logger.info("Servidor SSH iniciado, esperando canal...")
            
            channel = transport.accept(20)
            if channel is None:
                logger.error("No se recibió canal")
                continue
            
            logger.info(f"Canal aceptado: {channel}")
            
            # Mantener vivo
            while transport.is_active():
                import time
                time.sleep(1)
                
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)

if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        logger.info("Servidor detenido")
        sys.exit(0)
