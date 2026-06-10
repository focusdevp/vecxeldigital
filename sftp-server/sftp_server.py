#!/usr/bin/env python3
"""
Servidor SFTP para Vecxel Digital
Permite a SAC subir archivos usando Filezilla/Cyberduck
"""

import os
import sys
import socket
import threading
import paramiko
from pathlib import Path
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SFTPServerInterface(paramiko.SFTPServerInterface):
    def __init__(self, server, *args, **kwargs):
        self.server = server
        self.root_folder = Path("sftp_uploads")
        self.root_folder.mkdir(exist_ok=True)
        super().__init__(server, *args, **kwargs)

    def list_folder(self, path):
        logger.info(f"Listando carpeta: {path}")
        try:
            full_path = self._resolve_path(path)
            if not full_path.exists():
                return paramiko.SFTP_NO_SUCH_FILE
            
            files = []
            for item in full_path.iterdir():
                attr = paramiko.SFTPAttributes.from_stat(item.stat())
                attr.filename = item.name
                files.append(attr)
            
            return files
        except Exception as e:
            logger.error(f"Error listando carpeta {path}: {e}")
            return paramiko.SFTP_FAILURE

    def stat(self, path):
        try:
            full_path = self._resolve_path(path)
            if not full_path.exists():
                return paramiko.SFTP_NO_SUCH_FILE
            
            return paramiko.SFTPAttributes.from_stat(full_path.stat())
        except Exception as e:
            logger.error(f"Error obteniendo stat de {path}: {e}")
            return paramiko.SFTP_FAILURE

    def open(self, path, flags, attr):
        try:
            full_path = self._resolve_path(path)
            
            # Crear directorio si no existe
            if not full_path.parent.exists():
                full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Determinar modo de apertura
            if flags & os.O_WRONLY:
                if flags & os.O_APPEND:
                    mode = 'ab'
                else:
                    mode = 'wb'
            elif flags & os.O_RDWR:
                if flags & os.O_APPEND:
                    mode = 'ab+'
                else:
                    mode = 'rb+'
            else:
                mode = 'rb'
            
            logger.info(f"Abriendo archivo: {full_path} (modo: {mode})")
            file_handle = SFTPFileHandle(full_path, mode)
            return file_handle
        except Exception as e:
            logger.error(f"Error abriendo archivo {path}: {e}")
            return paramiko.SFTP_FAILURE

    def remove(self, path):
        try:
            full_path = self._resolve_path(path)
            if full_path.is_file():
                full_path.unlink()
                logger.info(f"Archivo eliminado: {full_path}")
                return paramiko.SFTP_OK
            else:
                return paramiko.SFTP_NO_SUCH_FILE
        except Exception as e:
            logger.error(f"Error eliminando archivo {path}: {e}")
            return paramiko.SFTP_FAILURE

    def mkdir(self, path, attr):
        try:
            full_path = self._resolve_path(path)
            full_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Directorio creado: {full_path}")
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"Error creando directorio {path}: {e}")
            return paramiko.SFTP_FAILURE

    def rmdir(self, path):
        try:
            full_path = self._resolve_path(path)
            if full_path.is_dir():
                full_path.rmdir()
                logger.info(f"Directorio eliminado: {full_path}")
                return paramiko.SFTP_OK
            else:
                return paramiko.SFTP_NO_SUCH_FILE
        except Exception as e:
            logger.error(f"Error eliminando directorio {path}: {e}")
            return paramiko.SFTP_FAILURE

    def rename(self, oldpath, newpath):
        try:
            old_full_path = self._resolve_path(oldpath)
            new_full_path = self._resolve_path(newpath)
            
            # Crear directorio destino si no existe
            new_full_path.parent.mkdir(parents=True, exist_ok=True)
            
            old_full_path.rename(new_full_path)
            logger.info(f"Archivo renombrado: {old_full_path} -> {new_full_path}")
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"Error renombrando archivo {oldpath} -> {newpath}: {e}")
            return paramiko.SFTP_FAILURE

    def _resolve_path(self, path):
        """Resuelve ruta relativa a la carpeta raíz SFTP"""
        if isinstance(path, bytes):
            path = path.decode('utf-8')
        
        # Normalizar ruta
        path = path.lstrip('/')
        full_path = self.root_folder / path
        
        # Evitar directory traversal
        try:
            full_path.resolve().relative_to(self.root_folder.resolve())
        except ValueError:
            raise ValueError("Access denied: path outside root directory")
        
        return full_path

class SFTPFileHandle:
    def __init__(self, path, mode):
        self.path = path
        self.mode = mode
        self.file = None
        self.open_file()

    def open_file(self):
        self.file = open(self.path, self.mode)

    def close(self):
        if self.file:
            self.file.close()
            logger.info(f"Archivo cerrado: {self.path}")

    def read(self, offset, length):
        if self.file:
            self.file.seek(offset)
            return self.file.read(length)
        return b''

    def write(self, offset, data):
        if self.file:
            self.file.seek(offset)
            written = self.file.write(data)
            self.file.flush()
            return written
        return 0

    def stat(self):
        if self.file:
            return paramiko.SFTPAttributes.from_stat(os.stat(self.path))
        return None

class SFTPServer:
    def __init__(self, host='0.0.0.0', port=2222):
        self.host = host
        self.port = port
        self.server_socket = None
        self.running = False

    def start(self):
        """Iniciar servidor SFTP"""
        try:
            # Crear socket del servidor
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(100)
            
            self.running = True
            logger.info(f"Servidor SFTP iniciado en {self.host}:{self.port}")
            logger.info(f"Carpeta de uploads: sftp_uploads/")
            logger.info("Listo para recibir conexiones de Filezilla/Cyberduck")
            
            while self.running:
                try:
                    client_socket, client_addr = self.server_socket.accept()
                    logger.info(f"Nueva conexión desde: {client_addr}")
                    
                    # Crear thread para manejar cliente
                    client_thread = threading.Thread(
                        target=self.handle_client,
                        args=(client_socket, client_addr)
                    )
                    client_thread.daemon = True
                    client_thread.start()
                    
                except OSError as e:
                    if self.running:
                        logger.error(f"Error aceptando conexión: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Error iniciando servidor SFTP: {e}")
        finally:
            self.stop()

    def handle_client(self, client_socket, client_addr):
        """Manejar conexión de cliente SFTP"""
        transport = None
        try:
            # Crear transporte SSH
            transport = paramiko.Transport(client_socket)
            transport.set_gss_host(socket.getfqdn(""))
            
            # Generar una sola clave RSA y usarla
            host_key = paramiko.RSAKey.generate(2048)
            transport.add_server_key(host_key)
            
            # Crear handler de autenticación
            server_handler = SFTPServerHandler()
            transport.start_server(server=server_handler)
            
            # Esperar canal SFTP con timeout más largo
            channel = transport.accept(timeout=20)
            if channel is None:
                logger.warning(f"No se pudo establecer canal SFTP con {client_addr}")
                return
            
            logger.info(f"Canal SFTP aceptado desde {client_addr}")
            
            # Crear servidor SFTP con el handler correcto
            # Necesitamos pasar una función que retorne una instancia de SFTPServerInterface
            def sftp_factory(*args, **kwargs):
                return SFTPServerInterface(*args, **kwargs)
            
            sftp_server = paramiko.SFTPServer(channel, sftp_si=sftp_factory)
            logger.info(f"Servidor SFTP establecido con {client_addr}")
            
            # Mantener conexión activa mientras el canal esté abierto
            while transport.is_active() and not channel.closed:
                import time
                time.sleep(1)
                
        except Exception as e:
            logger.error(f"Error manejando cliente {client_addr}: {e}", exc_info=True)
        finally:
            try:
                if transport:
                    transport.close()
                client_socket.close()
                logger.info(f"Conexión cerrada con {client_addr}")
            except Exception as e:
                logger.error(f"Error cerrando conexión: {e}")

    def stop(self):
        """Detener servidor SFTP"""
        self.running = False
        if self.server_socket:
            self.server_socket.close()
        logger.info("Servidor SFTP detenido")

class SFTPServerHandler(paramiko.ServerInterface):
    def check_auth_password(self, username, password):
        # Autenticación simple para desarrollo
        if username == "sac" and password == "vecxel2026":
            return paramiko.AUTH_SUCCESSFUL
        return paramiko.AUTH_FAILED

    def check_channel_request(self, kind, chanid):
        if kind == 'session':
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_channel_subsystem_request(self, channel, name):
        if name == 'sftp':
            return True
        return False

    def get_allowed_auths(self, username):
        return 'password'

if __name__ == "__main__":
    server = SFTPServer()
    try:
        server.start()
    except KeyboardInterrupt:
        logger.info("Deteniendo servidor SFTP...")
        server.stop()
