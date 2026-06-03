"""
Generador de archivos CLIENTES.txt para SAC
Formato: campos fijos con padding de espacios, separados por ;
"""

from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Directorio outbox donde SAC monitorea los archivos
OUTBOX_DIR = Path("storage/outbox")
OUTBOX_DIR.mkdir(parents=True, exist_ok=True)

def pad(valor: str, longitud: int) -> str:
    """Formatea un campo al tamaño exacto con padding de espacios a la derecha"""
    str_val = (valor or '').toString() if hasattr(valor, 'toString') else str(valor or '')
    return str_val[:longitud].ljust(longitud, ' ')

def format_cliente_line(cliente: Dict[str, Any]) -> str:
    """Genera una línea del formato CLIENTES.txt para un cliente"""
    return [
        pad(cliente.get("rif", ""), 10),
        pad(cliente.get("nombre", ""), 50),
        pad(cliente.get("direccion", ""), 160),
        pad(cliente.get("telefonos", ""), 60),
        pad(cliente.get("email", "."), 40),
        pad(cliente.get("codigo_vendedor", ""), 10),
        pad(cliente.get("codigo_zona", ""), 10),
        pad(cliente.get("esquema_pago", "CONTADO"), 10),
    ].join(';') + ';'

def generate_clientes_file(clientes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Genera el archivo CLIENTES.txt en la carpeta outbox/
    SAC monitorea esta carpeta y procesa el archivo
    """
    if not clientes or len(clientes) == 0:
        raise ValueError("No hay clientes para generar el archivo")

    lineas = [format_cliente_line(c) for c in clientes]
    contenido = '\r\n'.join(lineas) + '\r\n'

    timestamp = datetime.utcnow().isoformat().replace(':', '-').replace('.', '-')
    nombre_archivo = f"CLIENTES_{timestamp}.txt"
    ruta_archivo = OUTBOX_DIR / nombre_archivo

    # Escribir archivo con encoding latin1 (SAC lo espera así)
    with open(ruta_archivo, 'w', encoding='latin-1') as f:
        f.write(contenido)

    print(f"[Generator] Archivo generado: {nombre_archivo} ({len(clientes)} clientes)")

    return {
        "nombre_archivo": nombre_archivo,
        "ruta_archivo": str(ruta_archivo),
        "total_clientes": len(clientes)
    }
