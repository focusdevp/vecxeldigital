"""
Parser del formato de inventario SAC

Formato de cada línea (separado por punto y coma):
SKU ; DESCRIPCION ; UNIDAD_MEDIDA ; PRECIO_USD ; COD_ALM1 ; STOCK1 ; COD_ALM2 ; STOCK2 ; ...

Ejemplo real:
BISA100X42          ;BISAGRA 100x42                          ;UND ;00001.50;00;00000;30;00000;40;00000;60;00000;
"""

from typing import Dict, List, Optional, Tuple
from app.models import Product, Almacen, ErrorDetail
from datetime import datetime

ERROR_THRESHOLD = 0.05  # 5% de errores permitido


def parse_line(line: str, line_number: int) -> Tuple[Optional[Product], Optional[ErrorDetail]]:
    """
    Parser de línea individual formato SAC
    
    Args:
        line: Línea de texto a parsear
        line_number: Número de línea (para reportes de error)
        
    Returns:
        Tuple de (Product, Error). Solo uno será None.
    """
    if not line.strip():
        return None, None
    
    # Separar por punto y coma y limpiar espacios
    parts = [p.strip() for p in line.split(';')]
    
    # Eliminar campos vacíos al final
    while parts and parts[-1] == '':
        parts.pop()
    
    # Validar campos mínimos
    if len(parts) < 4:
        return None, ErrorDetail(
            linea=line_number,
            contenido=line.strip(),
            motivo=f"Campos insuficientes: se esperan al menos 4, se encontraron {len(parts)}"
        )
    
    sku, descripcion, unidad_medida, precio_str = parts[:4]
    
    # Validar SKU
    if not sku:
        return None, ErrorDetail(
            linea=line_number,
            contenido=line.strip(),
            motivo="SKU vacío"
        )
    
    # Validar y parsear precio
    try:
        precio_usd = float(precio_str)
    except ValueError:
        return None, ErrorDetail(
            linea=line_number,
            contenido=line.strip(),
            motivo=f"Precio inválido: '{precio_str}'"
        )
    
    # Parsear almacenes (formato: codigo, existencia, codigo, existencia, ...)
    almacenes = []
    almacenes_data = parts[4:]
    
    for i in range(0, len(almacenes_data) - 1, 2):
        codigo = almacenes_data[i]
        try:
            existencia = int(almacenes_data[i + 1])
            if codigo and existencia >= 0:
                almacenes.append(Almacen(codigo=codigo, existencia=existencia))
        except (ValueError, IndexError):
            # Ignorar almacenes con formato incorrecto
            continue
    
    # Crear producto con validación Pydantic automática
    try:
        product = Product(
            sku=sku,  # Se convertirá a mayúsculas por el validator
            descripcion=descripcion,
            unidad_medida=unidad_medida,
            precio_usd=precio_usd,
            almacenes=almacenes,
            activo=True,
            ultima_sincronizacion=datetime.utcnow()
        )
        return product, None
    except Exception as e:
        return None, ErrorDetail(
            linea=line_number,
            contenido=line.strip(),
            motivo=f"Error de validación: {str(e)}"
        )


def parse_inventory_file(content: str) -> Dict[str, List]:
    """
    Parser completo del archivo de inventario
    
    Args:
        content: Contenido completo del archivo TXT
        
    Returns:
        Diccionario con 'products' (lista de Product) y 'errors' (lista de ErrorDetail)
        
    Raises:
        ValueError: Si el archivo está vacío o la tasa de error supera el umbral
    """
    # Normalizar saltos de línea
    lines = content.replace('\r', '').split('\n')
    
    products: List[Product] = []
    errors: List[ErrorDetail] = []
    
    # Parsear cada línea
    for idx, line in enumerate(lines, 1):
        if not line.strip():
            continue
        
        product, error = parse_line(line, idx)
        
        if error:
            errors.append(error)
        elif product:
            products.append(product)
    
    # Validar que no esté vacío
    total_lines = len(products) + len(errors)
    if total_lines == 0:
        raise ValueError("El archivo está vacío o no contiene líneas procesables.")
    
    # Validar tasa de error
    error_rate = len(errors) / total_lines
    if error_rate > ERROR_THRESHOLD:
        raise ValueError(
            f"Tasa de error crítica: {error_rate * 100:.1f}% de líneas inválidas "
            f"({len(errors)} de {total_lines}). Verifique el archivo antes de subir."
        )
    
    return {
        "products": products,
        "errors": errors
    }


def validate_and_parse_inventory_file(content: str) -> Dict[str, List]:
    """
    Alias para compatibilidad con código existente
    
    Esta función es equivalente a parse_inventory_file pero mantiene
    el nombre usado en el código Express original.
    """
    return parse_inventory_file(content)
