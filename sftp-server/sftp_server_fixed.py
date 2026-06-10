#!/usr/bin/env python3
"""
Servidor SFTP funcional para Vecxel Digital
Versión corregida que maneja correctamente el subsistema SFTP
"""
import os
import socket
import threading
import paramiko
from pathlib import Path
import logging

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Directorio raíz para uploads
UPLOAD_DIR = Path("sftp_uploads").absolute()
UPLOAD_DIR.mkdir(exist_ok=True)

class SFTPServerInterface(paramiko.SFTPServerInterface):
    """Interfaz del servidor SFTP"""
    
    def __init__(self, server, *args, **kwargs):
        super().__init__(server, *args, **kwargs)
        self.root = UPLOAD_DIR
        logger.info(f"SFTP Interface iniciado. Root: {self.root}")
    
    def _realpath(self, path):
        """Convertir path SFTP a path real del sistema"""
        if path == '.' or path == '/':
            return self.root
        # Remover / inicial
        path = path.lstrip('/')
        return self.root / path
    
    def list_folder(self, path):
        """Listar contenido de carpeta"""
        logger.info(f"list_folder: {path}")
        try:
            realpath = self._realpath(path)
            if not realpath.exists():
                logger.warning(f"Path no existe: {realpath}")
                return paramiko.SFTP_NO_SUCH_FILE
            
            out = []
            for item in realpath.iterdir():
                attr = paramiko.SFTPAttributes.from_stat(item.stat())
                attr.filename = item.name
                out.append(attr)
            
            logger.info(f"Listando {len(out)} items en {path}")
            return out
        except Exception as e:
            logger.error(f"Error en list_folder: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def stat(self, path):
        """Obtener atributos de archivo/carpeta"""
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
        """Obtener atributos (sin seguir symlinks)"""
        return self.stat(path)
    
    def open(self, path, flags, attr):
        """Abrir archivo para lectura/escritura"""
        logger.info(f"open: {path}, flags: {flags}")
        try:
            realpath = self._realpath(path)
            
            # Determinar modo de apertura
            if flags & os.O_WRONLY:
                if flags & os.O_APPEND:
                    mode = 'ab'
                else:
                    mode = 'wb'
            elif flags & os.O_RDWR:
                mode = 'r+b'
            else:
                mode = 'rb'
            
            # Crear directorio padre si no existe
            realpath.parent.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Abriendo {realpath} en modo {mode}")
            fobj = realpath.open(mode)
            return paramiko.SFTPHandle(flags)
        except Exception as e:
            logger.error(f"Error en open: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def remove(self, path):
        """Eliminar archivo"""
        logger.info(f"remove: {path}")
        try:
            realpath = self._realpath(path)
            realpath.unlink()
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"Error en remove: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def rename(self, oldpath, newpath):
        """Renombrar archivo"""
        logger.info(f"rename: {oldpath} -> {newpath}")
        try:
            old_realpath = self._realpath(oldpath)
            new_realpath = self._realpath(newpath)
            old_realpath.rename(new_realpath)
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"Error en rename: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def mkdir(self, path, attr):
        """Crear directorio"""
        logger.info(f"mkdir: {path}")
        try:
            realpath = self._realpath(path)
            realpath.mkdir(parents=True, exist_ok=True)
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"Error en mkdir: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def rmdir(self, path):
        """Eliminar directorio"""
        logger.info(f"rmdir: {path}")
        try:
            realpath = self._realpath(path)
            realpath.rmdir()
            return paramiko.SFTP_OK
        except Exception as e:
            logger.error(f"Error en rmdir: {e}", exc_info=True)
            return paramiko.SFTP_FAILURE
    
    def chattr(self, path, attr):
        """Cambiar atributos"""
        logger.info(f"chattr: {path}")
        return paramiko.SFTP_OK

class SSHServer(paramiko.ServerInterface):
    """Servidor SSH para autenticación"""
    
    def __init__(self):
        self.event = threading.Event()
    
    def check_auth_password(self, username, password):
        """Verificar credenciales"""
        logger.info(f"Intento de autenticación: {username}")
        if username == 'sac' and password == 'vecxel2026':
            logger.info(f"Autenticación exitosa: {username}")
            return paramiko.AUTH_SUCCESSFUL
        logger.warning(f"Autenticación fallida: {username}")
        return paramiko.AUTH_FAILED
    
    def check_channel_request(self, kind, chanid):
        """Verificar tipo de canal"""
        logger.info(f"Channel request: {kind}")
        if kind == 'session':
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED
    
    def get_allowed_auths(self, username):
        """Métodos de autenticación permitidos"""
        return 'password'
    
    def check_channel_subsystem_request(self, channel, name):
        """Verificar request de subsistema e iniciar SFTP"""
        logger.info(f"Subsystem request: {name}")
        if name == 'sftp':
            logger.info("Iniciando servidor SFTP en el canal...")
            # Iniciar el servidor SFTP en este canal
            try:
                # Crear un thread para el servidor SFTP
                t = threading.Thread(
                    target=paramiko.SFTPServer,
                    args=(channel, 'sftp', self, SFTPServerInterface),
                    daemon=True
                )
                t.start()
                logger.info("✅ Servidor SFTP iniciado exitosamente")
                self.event.set()
                return True
            except Exception as e:
                logger.error(f"Error iniciando servidor SFTP: {e}", exc_info=True)
                return False
        return False

def handle_client(client_socket, client_addr, host_key):
    """Manejar conexión de cliente"""
    logger.info(f"Nueva conexión desde {client_addr}")
    transport = None
    
    try:
        # Crear transporte SSH
        transport = paramiko.Transport(client_socket)
        transport.add_server_key(host_key)
        
        # Iniciar servidor SSH (el subsistema SFTP se maneja en check_channel_subsystem_request)
        server = SSHServer()
        transport.start_server(server=server)
        
        # Esperar canal
        logger.info("Esperando canal...")
        channel = transport.accept(20)
        
        if channel is None:
            logger.error("No se recibió canal")
            return
        
        logger.info(f"Canal establecido: {channel}")
        
        # Mantener conexión activa
        while transport.is_active():
            import time
            time.sleep(1)
            
    except Exception as e:
        logger.error(f"Error manejando cliente {client_addr}: {e}", exc_info=True)
    finally:
        if transport:
            try:
                transport.close()
            except:
                pass
        try:
            client_socket.close()
        except:
            pass
        logger.info(f"Conexión cerrada: {client_addr}")

def start_server(host='127.0.0.1', port=2222):
    """Iniciar servidor SFTP"""
    # Generar clave de host
    logger.info("Generando clave RSA del host...")
    host_key = paramiko.RSAKey.generate(2048)
    
    # Crear socket
    logger.info(f"Iniciando servidor SFTP en {host}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((host, port))
    sock.listen(10)
    
    logger.info(f"✅ Servidor SFTP escuchando en {host}:{port}")
    logger.info(f"📁 Directorio de uploads: {UPLOAD_DIR}")
    logger.info(f"👤 Usuario: sac | Contraseña: vecxel2026")
    logger.info("Esperando conexiones...")
    
    try:
        while True:
            client, addr = sock.accept()
            # Manejar cada cliente en un thread separado
            client_thread = threading.Thread(
                target=handle_client,
                args=(client, addr, host_key),
                daemon=True
            )
            client_thread.start()
    except KeyboardInterrupt:
        logger.info("Servidor detenido por usuario")
    except Exception as e:
        logger.error(f"Error en servidor: {e}", exc_info=True)
    finally:
        sock.close()
        logger.info("Servidor SFTP cerrado")

if __name__ == '__main__':
    start_server()
