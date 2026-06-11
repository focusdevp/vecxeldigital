#!/usr/bin/env python3
"""
Monitor SFTP Simple para Vecxel Digital
Versión sin watchdog - polling directo
"""
import os
import time
import requests
import logging
from pathlib import Path

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SFTPMonitor:
    def __init__(self, 
                 base_dir="sftp_uploads",
                 connector_url="http://localhost:4000",
                 api_key="clave_de_prueba",
                 poll_interval=3):
        self.base_dir = Path(base_dir).absolute()
        self.connector_url = connector_url
        self.api_key = api_key
        self.poll_interval = poll_interval
        self.processed_files = set()
        self.running = False
        
        # Carpetas a monitorear
        self.watch_dirs = {
            "inventario": self.base_dir / "inventario",
            "clientes": self.base_dir / "clientes"
        }
        
        # Crear directorios si no existen
        for tipo, path in self.watch_dirs.items():
            path.mkdir(parents=True, exist_ok=True)
            (path / "processed").mkdir(exist_ok=True)
            (path / "failed").mkdir(exist_ok=True)
        
        logger.info(f"📁 Monitor SFTP iniciado")
        logger.info(f"📂 Carpeta base: {self.base_dir}")
        logger.info(f"� Monitoreando: inventario/ y clientes/")
        logger.info(f"�🔗 API: {self.connector_url}")
        logger.info(f"⏱️  Intervalo: {self.poll_interval}s")
    
    def start(self):
        """Iniciar monitoreo"""
        self.running = True
        logger.info("✅ Monitor activo - esperando archivos...")
        
        try:
            while self.running:
                self.check_for_files()
                time.sleep(self.poll_interval)
        except KeyboardInterrupt:
            logger.info("🛑 Monitor detenido por usuario")
        except Exception as e:
            logger.error(f"❌ Error en monitor: {e}", exc_info=True)
        finally:
            self.stop()
    
    def stop(self):
        """Detener monitoreo"""
        self.running = False
        logger.info("👋 Monitor detenido")
    
    def check_for_files(self):
        """Verificar si hay archivos nuevos en ambas carpetas"""
        try:
            for tipo, watch_dir in self.watch_dirs.items():
                for file_path in watch_dir.glob("*.txt"):
                    # Ignorar archivos en subcarpetas
                    if file_path.parent.name in ["processed", "failed"]:
                        continue
                    
                    # Evitar procesar archivos ya procesados
                    file_key = str(file_path)
                    if file_key in self.processed_files:
                        continue
                    
                    # Marcar como procesado INMEDIATAMENTE para evitar race condition
                    self.processed_files.add(file_key)
                    
                    # Verificar que el archivo esté completo
                    if not self.is_file_ready(file_path):
                        # Si no está listo, remover de procesados para intentar después
                        self.processed_files.discard(file_key)
                        continue
                    
                    # Procesar archivo según su carpeta
                    self.process_file(file_path, tipo)
                    
        except Exception as e:
            logger.error(f"❌ Error verificando archivos: {e}")
    
    def is_file_ready(self, file_path):
        """Verificar que el archivo esté listo para procesar"""
        try:
            # Verificar que no esté siendo escrito
            initial_size = file_path.stat().st_size
            time.sleep(1)
            final_size = file_path.stat().st_size
            
            if initial_size != final_size:
                logger.debug(f"⏳ Archivo en escritura: {file_path.name}")
                return False
            
            # Intentar abrir el archivo
            with open(file_path, 'rb') as f:
                f.read(100)
            
            return True
        except Exception as e:
            logger.debug(f"⚠️  Archivo no listo: {file_path.name} - {e}")
            return False
    
    def process_file(self, file_path, tipo):
        """Procesar archivo detectado"""
        try:
            logger.info(f"📄 Archivo detectado: {file_path.name} (carpeta: {tipo})")
            
            # El tipo viene determinado por la carpeta
            endpoint = tipo
            emoji = "📦" if tipo == "inventario" else "📋"
            logger.info(f"{emoji} Procesando como {tipo.upper()}")
            
            # Enviar a API
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/plain')}
                headers = {'X-API-Key': self.api_key}
                
                response = requests.post(
                    f"{self.connector_url}/sync/{endpoint}",
                    files=files,
                    headers=headers,
                    timeout=60
                )
            
            # Procesar respuesta
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Archivo procesado exitosamente")
                logger.info(f"   📊 Registros: {result.get('registros_procesados', 0)} procesados")
                if result.get('registros_error', 0) > 0:
                    logger.warning(f"   ⚠️  Errores: {result.get('registros_error', 0)}")
                
                # Mover a processed/
                processed_dir = file_path.parent / "processed"
            elif response.status_code == 409:
                logger.warning(f"⚠️  Archivo duplicado: {file_path.name}")
                # Mover a processed/ (duplicado no es error)
                processed_dir = file_path.parent / "processed"
            elif response.status_code == 422:
                error_data = response.json()
                error_msg = error_data.get('detail', {}).get('mensaje', 'Error desconocido')
                logger.error(f"❌ Error de validación: {error_msg}")
                # Mover a failed/
                processed_dir = file_path.parent / "failed"
            else:
                logger.error(f"❌ Error HTTP {response.status_code}: {response.text[:200]}")
                # Mover a failed/
                processed_dir = file_path.parent / "failed"
            
            # Asegurar que el directorio existe
            processed_dir.mkdir(exist_ok=True)
            
            new_path = processed_dir / file_path.name
            # Si ya existe, agregar timestamp
            if new_path.exists():
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                new_path = processed_dir / f"{file_path.stem}_{timestamp}{file_path.suffix}"
            
            file_path.rename(new_path)
            logger.info(f"� Archivo movido a: {tipo}/{processed_dir.name}/{new_path.name}")
            
        except Exception as e:
            logger.error(f"❌ Error procesando {file_path.name}: {e}", exc_info=True)
            # En caso de error, mover a failed/
            try:
                failed_dir = file_path.parent / "failed"
                failed_dir.mkdir(exist_ok=True)
                dest = failed_dir / file_path.name
                if dest.exists():
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    dest = failed_dir / f"{file_path.stem}_{timestamp}{file_path.suffix}"
                file_path.rename(dest)
                logger.info(f"💾 Archivo movido a failed/ por error")
            except Exception as move_error:
                logger.error(f"❌ No se pudo mover archivo a failed/: {move_error}")

if __name__ == '__main__':
    monitor = SFTPMonitor()
    monitor.start()
