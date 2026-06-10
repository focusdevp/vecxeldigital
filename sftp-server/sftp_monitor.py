#!/usr/bin/env python3
"""
Monitor SFTP para Vecxel Digital
Detecta archivos subidos por SFTP y los envía a SAC Connector API
"""

import os
import time
import requests
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuración de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SFTPFileHandler(FileSystemEventHandler):
    def __init__(self, connector_url="http://localhost:4000", api_key="clave_de_prueba"):
        self.connector_url = connector_url
        self.api_key = api_key
        self.processed_files = set()  # Evitar procesar archivos múltiples veces
        self.wait_time = 2  # Esperar 2 segundos después de la última modificación
        
    def on_created(self, event):
        if not event.is_directory:
            self.handle_file(event.src_path)
    
    def on_modified(self, event):
        if not event.is_directory:
            self.handle_file(event.src_path)
    
    def handle_file(self, file_path):
        """Manejar archivo detectado"""
        path = Path(file_path)
        
        # Evitar procesar archivos ya procesados
        if str(path) in self.processed_files:
            return
        
        # Esperar a que el archivo termine de escribirse
        if not self._is_file_ready(path):
            return
        
        logger.info(f"📄 Archivo detectado: {path.name}")
        
        # Procesar según el tipo de archivo
        if path.name.lower().endswith('.txt'):
            # Determinar tipo de archivo por nombre
            if 'cliente' in path.name.lower():
                logger.info(f"📋 Detectado como archivo de CLIENTES")
                self.process_client_file(path)
            else:
                # Por defecto, procesar como INVENTARIO
                logger.info(f"📦 Procesando como archivo de INVENTARIO (por defecto)")
                self.process_inventory_file(path)
        else:
            logger.warning(f"⚠️  Archivo no es TXT: {path.name}")
    
    def _is_file_ready(self, path):
        """Verificar si el archivo está listo para ser procesado"""
        try:
            # Verificar que el archivo no esté siendo escrito
            initial_size = path.stat().st_size
            time.sleep(self.wait_time)
            final_size = path.stat().st_size
            
            if initial_size != final_size:
                logger.info(f"Archivo aún en escritura: {path.name}")
                return False
            
            # Verificar que se pueda abrir el archivo
            with open(path, 'rb') as f:
                f.read(1024)  # Intentar leer un poco
            
            return True
        except Exception as e:
            logger.error(f"Error verificando archivo {path.name}: {e}")
            return False
    
    def process_inventory_file(self, file_path):
        """Procesar archivo de inventario"""
        try:
            logger.info(f"Procesando archivo de inventario: {file_path.name}")
            
            # Enviar archivo a SAC Connector API
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/plain')}
                headers = {'X-API-Key': self.api_key}
                
                response = requests.post(
                    f"{self.connector_url}/sync/inventario",
                    files=files,
                    headers=headers,
                    timeout=60
                )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Inventario procesado: {result.get('mensaje', 'OK')}")
                logger.info(f"   Registros: {result.get('registros_procesados', 0)} procesados, {result.get('registros_error', 0)} errores")
            elif response.status_code == 409:
                logger.warning(f"⚠️  Archivo duplicado: {file_path.name}")
            elif response.status_code == 422:
                logger.error(f"❌ Error de validación: {response.json().get('mensaje', 'Error desconocido')}")
            else:
                logger.error(f"❌ Error HTTP {response.status_code}: {response.text}")
            
            # Marcar como procesado
            self.processed_files.add(str(file_path))
            
        except Exception as e:
            logger.error(f"❌ Error procesando inventario {file_path.name}: {e}")
    
    def process_client_file(self, file_path):
        """Procesar archivo de clientes"""
        try:
            logger.info(f"Procesando archivo de clientes: {file_path.name}")
            
            # Enviar archivo a SAC Connector API
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/plain')}
                headers = {'X-API-Key': self.api_key}
                
                response = requests.post(
                    f"{self.connector_url}/sync/clientes",
                    files=files,
                    headers=headers,
                    timeout=60
                )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Clientes procesados: {result.get('mensaje', 'OK')}")
                logger.info(f"   Registros: {result.get('registros_procesados', 0)} procesados, {result.get('registros_error', 0)} errores")
            else:
                logger.error(f"❌ Error procesando clientes {file_path.name}: HTTP {response.status_code}")
            
            # Marcar como procesado
            self.processed_files.add(str(file_path))
            
        except Exception as e:
            logger.error(f"❌ Error procesando clientes {file_path.name}: {e}")

class SFTPMonitor:
    def __init__(self, watch_path="sftp_uploads", connector_url="http://localhost:4000", api_key="clave_de_prueba"):
        self.watch_path = Path(watch_path)
        self.watch_path.mkdir(exist_ok=True)
        self.connector_url = connector_url
        self.api_key = api_key
        self.observer = None
        self.running = False
        
    def start(self):
        """Iniciar monitor"""
        try:
            # Crear handler de eventos
            event_handler = SFTPFileHandler(self.connector_url, self.api_key)
            
            # Crear observer
            self.observer = Observer()
            self.observer.schedule(event_handler, str(self.watch_path), recursive=True)
            
            # Iniciar observer
            self.observer.start()
            self.running = True
            
            logger.info(f"Monitor SFTP iniciado")
            logger.info(f"Vigilando carpeta: {self.watch_path.absolute()}")
            logger.info(f"Conectado a SAC Connector: {self.connector_url}")
            logger.info("Listo para detectar archivos subidos por SFTP...")
            
            # Mantener corriendo
            while self.running:
                time.sleep(1)
                
        except Exception as e:
            logger.error(f"Error iniciando monitor: {e}")
            self.stop()
    
    def stop(self):
        """Detener monitor"""
        self.running = False
        if self.observer:
            self.observer.stop()
            self.observer.join()
        logger.info("Monitor SFTP detenido")

if __name__ == "__main__":
    monitor = SFTPMonitor()
    try:
        monitor.start()
    except KeyboardInterrupt:
        logger.info("Deteniendo monitor SFTP...")
        monitor.stop()
