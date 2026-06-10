#!/usr/bin/env python3
"""
Servidor SFTP FUNCIONAL para Vecxel Digital
Implementación correcta basada en la documentación de paramiko
"""
import os
import socket
import sys
import threading
import paramiko
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Directorio raíz
UPLOAD_DIR = Path("sftp_uploads").absolute()
UPLOAD_DIR.mkdir(exist_ok=True)

class SFTPServerInterface(paramiko.SFTPServerInterface):
    """Interfaz SFTP que maneja todas las operaciones de archivos"""
    
    def __init__(self, server, *args, **kwargs):
        super().__init__(server, *args, **kwargs)
        self.root = UPLOAD_DIR
        logger.info(f"✅ SFTP Interface iniciado. Root: {self.root}")
    
    def _realpath(self, path):
        """Convertir path SFTP a path del sistema"""
        if path in ('.', '/', ''):
            return self.root
        path = path.lstrip('/')
        return self.root / path
    
    def list_folder(self, path):
        """Listar archivos en carpeta"""
        logger.info(f"📂 list_folder: {path}")
        try:
            realpath = self._realpath(path)
            if not realpath.exists():
                logger.warning(f"❌ Path no existe: {realpath}")
                return paramiko.SFTP_NO_SUCH_FILE
            
            out = []
            for item in realpath.iterdir():
                attr = paramiko.SFTPAttributes.from_stat(item.stat())
                attr.filename = item.name
                out.append(attr)
            
            logger.info(f"✅ Listados {len(out)} items")
            return out
        except Exception as e:
            logger.error(f"❌ Error en list_folder: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def stat(self, path):
        """Obtener atributos de archivo"""
        logger.info(f"📊 stat: {path}")
        try:
            realpath = self._realpath(path)
            if not realpath.exists():
                return paramiko.SFTP_NO_SUCH_FILE
            return paramiko.SFTPAttributes.from_stat(realpath.stat())
        except Exception as e:
            logger.error(f"❌ Error en stat: {e}")
            return paramiko.SFTP_FAILURE
    
    def lstat(self, path):
        """lstat (sin seguir symlinks)"""
        return self.stat(path)
    
    def open(self, path, flags, attr):
        """Abrir archivo"""
        logger.info(f"📄 open: {path}, flags: {flags}")
        try:
            realpath = self._realpath(path)
            
            if flags & os.O_WRONLY:
                mode = 'ab' if flags & os.O_APPEND else 'wb'
            elif flags & os.O_RDWR:
                mode = 'r+b'
            else:
                mode = 'rb'
            
            realpath.parent.mkdir(parents=True, exist_ok=True)
            fobj = realpath.open(mode)
            
            # Crear un handle SFTP que envuelva el archivo
            handle = paramiko.SFTPHandle(flags)
            handle.filename = str(realpath)
            handle.readfile = fobj
            handle.writefile = fobj
            
            logger.info(f"✅ Archivo abierto: {realpath}")
            return handle
        except Exception as e:
            logger.error(f"❌ Error en open: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def remove(self, path):
        """Eliminar archivo"""
        logger.info(f"🗑️ remove: {path}")
        try:
            realpath = self._realpath(path)
            realpath.unlink()
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"❌ Error en remove: {e}")
            return paramiko.SFTP_FAILURE
    
    def rename(self, oldpath, newpath):
        """Renombrar archivo"""
        logger.info(f"✏️ rename: {oldpath} -> {newpath}")
        try:
            old = self._realpath(oldpath)
            new = self._realpath(newpath)
            old.rename(new)
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"❌ Error en rename: {e}")
            return paramiko.SFTP_FAILURE
    
    def mkdir(self, path, attr):
        """Crear directorio"""
        logger.info(f"📁 mkdir: {path}")
        try:
            realpath = self._realpath(path)
            realpath.mkdir(parents=True, exist_ok=True)
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"❌ Error en mkdir: {e}")
            return paramiko.SFTP_FAILURE
    
    def rmdir(self, path):
        """Eliminar directorio"""
        logger.info(f"🗑️ rmdir: {path}")
        try:
            realpath = self._realpath(path)
            realpath.rmdir()
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"❌ Error en rmdir: {e}")
            return paramiko.SFTP_FAILURE
    
    def chattr(self, path, attr):
        """Cambiar atributos"""
        return paramiko.SFTP_OK

class SSHServer(paramiko.ServerInterface):
    """Servidor SSH"""
    
    def check_auth_password(self, username, password):
        logger.info(f"🔐 Auth: {username}")
        if username == 'sac' and password == 'vecxel2026':
            logger.info(f"✅ Auth exitosa: {username}")
            return paramiko.AUTH_SUCCESSFUL
        logger.warning(f"❌ Auth fallida: {username}")
        return paramiko.AUTH_FAILED
    
    def check_channel_request(self, kind, chanid):
        logger.info(f"📡 Channel request: {kind}")
        if kind == 'session':
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED
    
    def get_allowed_auths(self, username):
        return 'password'

def handle_client(client_socket, client_addr, host_key):
    """Manejar cliente SFTP"""
    logger.info(f"🔌 Nueva conexión: {client_addr}")
    
    try:
        # Crear transporte SSH
        transport = paramiko.Transport(client_socket)
        transport.add_server_key(host_key)
        
        # Configurar el handler del subsistema SFTP
        transport.set_subsystem_handler(
            'sftp',
            paramiko.SFTPServer,
            SFTPServerInterface
        )
        
        # Iniciar servidor SSH
        server = SSHServer()
        transport.start_server(server=server)
        
        # Esperar y mantener la conexión activa
        logger.info("⏳ Esperando canal...")
        channel = transport.accept(20)
        
        if channel is None:
            logger.error("❌ No se recibió canal")
            return
        
        logger.info(f"✅ Canal establecido")
        
        # Mantener la conexión activa mientras el transporte esté activo
        while transport.is_active():
            import time
            time.sleep(1)
            
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
    finally:
        try:
            transport.close()
        except:
            pass
        try:
            client_socket.close()
        except:
            pass
        logger.info(f"🔌 Conexión cerrada: {client_addr}")

def start_server(host='127.0.0.1', port=2222):
    """Iniciar servidor SFTP"""
    logger.info("🔑 Generando clave RSA...")
    host_key = paramiko.RSAKey.generate(2048)
    
    logger.info(f"🚀 Iniciando servidor SFTP en {host}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((host, port))
    sock.listen(10)
    
    logger.info("=" * 60)
    logger.info(f"✅ Servidor SFTP corriendo en {host}:{port}")
    logger.info(f"📁 Directorio: {UPLOAD_DIR}")
    logger.info(f"👤 Usuario: sac | Contraseña: vecxel2026")
    logger.info("=" * 60)
    logger.info("⏳ Esperando conexiones...")
    
    try:
        while True:
            client, addr = sock.accept()
            # Cada cliente en su propio thread
            t = threading.Thread(
                target=handle_client,
                args=(client, addr, host_key),
                daemon=True
            )
            t.start()
    except KeyboardInterrupt:
        logger.info("\n👋 Servidor detenido")
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
    finally:
        sock.close()

if __name__ == '__main__':
    start_server()
