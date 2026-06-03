"""
Módulo de Validación Robusto para Archivos SAC

Implementa 5 capas de validación:
1. Validación de archivo (encoding, tipo, tamaño)
2. Validación de estructura global
3. Validación de formato SAC estricto
4. Validación de contenido y reglas de negocio
5. Validación de integridad
"""

import chardet
from typing import Dict, List, Tuple
from app.models import Product, Almacen

# Configuración de validaciones
class CONFIG:
    # Thresholds
    ERROR_THRESHOLD = 0.05  # 5% de errores permitido
    MIN_VALID_LINES = 1
    MAX_LINES = 50000
    MIN_FILE_SIZE = 100  # bytes
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Formato SAC
    SEPARATOR = ';'
    MIN_FIELDS = 4  # SKU, DESC, UNIDAD, PRECIO
    
    # Unidades de medida permitidas (lista blanca)
    ALLOWED_UNITS = ['UND', 'KG', 'MT', 'LT', 'M2', 'M3', 'CJ', 'PAQ', 'DOC', 'GL', 'LB', 'LAM', '1-2', '1-4', '1-8', '3-4']
    
    # Rangos de valores
    MIN_PRICE = 0.01
    MAX_PRICE = 999999.99
    MIN_STOCK = 0
    MAX_STOCK = 999999
    
    # SKU
    SKU_MIN_LENGTH = 1
    SKU_MAX_LENGTH = 20
    
    # Descripción
    DESC_MIN_LENGTH = 1
    DESC_MAX_LENGTH = 100


def validate_file(buffer: bytes, filename: str) -> Dict:
    """
    CAPA 1: Validación de Archivo
    
    Valida tamaño, encoding, y formato básico del archivo
    """
    errors = []
    warnings = []
    
    # Validar tamaño
    if len(buffer) < CONFIG.MIN_FILE_SIZE:
        errors.append(f"Archivo demasiado pequeño: {len(buffer)} bytes (mínimo: {CONFIG.MIN_FILE_SIZE} bytes)")
    
    if len(buffer) > CONFIG.MAX_FILE_SIZE:
        errors.append(f"Archivo demasiado grande: {len(buffer)} bytes (máximo: {CONFIG.MAX_FILE_SIZE} bytes)")
    
    # Detectar si es binario (búsqueda de bytes nulos)
    if b'\x00' in buffer[:8000]:
        errors.append('El archivo contiene datos binarios. Solo se aceptan archivos de texto plano.')
    
    # Detectar encoding
    encoding = 'utf-8'
    content = ''
    
    try:
        # Detectar encoding automáticamente
        detected = chardet.detect(buffer)
        encoding = detected['encoding'] or 'utf-8'
        
        # Intentar decodificar
        try:
            content = buffer.decode(encoding)
        except (UnicodeDecodeError, AttributeError):
            # Fallback a latin-1
            content = buffer.decode('latin-1')
            encoding = 'latin-1'
            warnings.append('Archivo detectado como Latin-1. Se recomienda usar UTF-8 para futuros archivos.')
    except Exception as e:
        errors.append(f"Error al decodificar archivo: {str(e)}")
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings,
            "content": None,
            "encoding": None,
            "size": len(buffer)
        }
    
    # Eliminar BOM si existe
    if content and content[0] == '\ufeff':
        content = content[1:]
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "content": content,
        "encoding": encoding,
        "size": len(buffer)
    }


def validate_structure(content: str) -> Dict:
    """
    CAPA 2: Validación de Estructura Global
    
    Valida la estructura general del archivo (líneas, separadores, campos)
    """
    errors = []
    warnings = []
    
    if not content or content.strip() == '':
        errors.append('El archivo está vacío.')
        return {"valid": False, "errors": errors, "warnings": warnings, "lines": [], "totalLines": 0}
    
    # Normalizar saltos de línea
    normalized = content.replace('\r\n', '\n').replace('\r', '\n')
    all_lines = normalized.split('\n')
    
    # Filtrar líneas vacías
    lines = [line for line in all_lines if line.strip()]
    
    if len(lines) < CONFIG.MIN_VALID_LINES:
        errors.append(f"El archivo debe contener al menos {CONFIG.MIN_VALID_LINES} línea válida.")
    
    if len(lines) > CONFIG.MAX_LINES:
        errors.append(f"El archivo contiene demasiadas líneas: {len(lines)} (máximo: {CONFIG.MAX_LINES})")
    
    # Validar que todas las líneas tengan el separador
    lines_without_separator = [line for line in lines if CONFIG.SEPARATOR not in line]
    if lines_without_separator:
        percentage = (len(lines_without_separator) / len(lines) * 100)
        if len(lines_without_separator) == len(lines):
            errors.append(f"Ninguna línea contiene el separador '{CONFIG.SEPARATOR}'. Formato de archivo incorrecto.")
        elif percentage > 20:
            errors.append(f"{percentage:.1f}% de líneas no contienen el separador '{CONFIG.SEPARATOR}'. Posible archivo corrupto.")
        else:
            warnings.append(f"{len(lines_without_separator)} líneas no contienen el separador esperado.")
    
    # Verificar cantidad mínima de campos por línea
    lines_with_insufficient_fields = 0
    for line in lines:
        fields = line.split(CONFIG.SEPARATOR)
        if len(fields) < CONFIG.MIN_FIELDS:
            lines_with_insufficient_fields += 1
    
    if lines_with_insufficient_fields > 0:
        percentage = (lines_with_insufficient_fields / len(lines) * 100)
        if percentage > 50:
            errors.append(f"{percentage:.1f}% de líneas tienen menos de {CONFIG.MIN_FIELDS} campos. Formato SAC no reconocido.")
        elif percentage > 20:
            warnings.append(f"{percentage:.1f}% de líneas tienen campos insuficientes.")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "lines": lines,
        "totalLines": len(lines)
    }


def validate_sac_format(line: str, line_number: int) -> Dict:
    """
    CAPA 3: Validación de Formato SAC Estricto
    
    Valida formato específico de SAC para cada línea
    """
    errors = []
    warnings = []
    
    parts = [p.strip() for p in line.split(CONFIG.SEPARATOR)]
    
    # Eliminar campos vacíos al final
    while parts and parts[-1] == '':
        parts.pop()
    
    if len(parts) < CONFIG.MIN_FIELDS:
        return {
            "valid": False,
            "errors": [f"Línea {line_number}: Campos insuficientes ({len(parts)}). Se esperan al menos {CONFIG.MIN_FIELDS}."],
            "warnings": [],
            "data": None
        }
    
    sku, descripcion, unidad_medida, precio_str = parts[:4]
    almacenes_data = parts[4:] if len(parts) > 4 else []
    
    # Validar SKU
    if not sku:
        errors.append(f"Línea {line_number}: SKU vacío")
    elif len(sku) < CONFIG.SKU_MIN_LENGTH or len(sku) > CONFIG.SKU_MAX_LENGTH:
        errors.append(f"Línea {line_number}: SKU '{sku}' tiene longitud inválida ({len(sku)}). Debe estar entre {CONFIG.SKU_MIN_LENGTH} y {CONFIG.SKU_MAX_LENGTH} caracteres.")
    
    # Validar descripción
    if not descripcion or not descripcion.strip():
        errors.append(f"Línea {line_number}: Descripción vacía")
    elif len(descripcion) > CONFIG.DESC_MAX_LENGTH:
        warnings.append(f"Línea {line_number}: Descripción muy larga ({len(descripcion)} caracteres). Se recomienda máximo {CONFIG.DESC_MAX_LENGTH}.")
    
    # Validar unidad de medida
    if not unidad_medida:
        errors.append(f"Línea {line_number}: Unidad de medida vacía")
    elif unidad_medida.upper() not in CONFIG.ALLOWED_UNITS:
        warnings.append(f"Línea {line_number}: Unidad '{unidad_medida}' no está en la lista blanca. Unidades permitidas: {', '.join(CONFIG.ALLOWED_UNITS)}")
    
    # Validar precio
    try:
        precio_usd = float(precio_str)
        if precio_usd < CONFIG.MIN_PRICE:
            errors.append(f"Línea {line_number}: Precio {precio_usd} es menor al mínimo permitido ({CONFIG.MIN_PRICE}).")
        elif precio_usd > CONFIG.MAX_PRICE:
            errors.append(f"Línea {line_number}: Precio {precio_usd} excede el máximo permitido ({CONFIG.MAX_PRICE}).")
    except ValueError:
        errors.append(f"Línea {line_number}: Precio inválido '{precio_str}'. Debe ser un número.")
        precio_usd = 0.0
    
    # Validar almacenes
    almacenes = []
    if len(almacenes_data) % 2 != 0:
        warnings.append(f"Línea {line_number}: Datos de almacenes incompletos (número impar de campos).")
    
    for i in range(0, len(almacenes_data) - 1, 2):
        codigo = almacenes_data[i]
        existencia_str = almacenes_data[i + 1]
        
        try:
            existencia = int(existencia_str)
            if codigo and existencia >= CONFIG.MIN_STOCK:
                almacenes.append({"codigo": codigo, "existencia": existencia})
            if existencia > CONFIG.MAX_STOCK:
                warnings.append(f"Línea {line_number}: Existencia {existencia} excede el máximo permitido ({CONFIG.MAX_STOCK}).")
        except ValueError:
            warnings.append(f"Línea {line_number}: Existencia inválida '{existencia_str}' para almacén {codigo}.")
    
    if not almacenes:
        warnings.append(f"Línea {line_number}: No se encontraron almacenes válidos.")
    
    # Si hay errores críticos, no retornar datos
    if errors:
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings,
            "data": None
        }
    
    return {
        "valid": True,
        "errors": [],
        "warnings": warnings,
        "data": {
            "sku": sku.upper(),
            "descripcion": descripcion.strip(),
            "unidad_medida": unidad_medida.upper(),
            "precio_usd": precio_usd,
            "almacenes": almacenes
        }
    }


def validate_business_rules(products: List[Dict], all_warnings: List[str]) -> Dict:
    """
    CAPA 4: Validación de Contenido y Reglas de Negocio
    
    Valida reglas de negocio como SKUs duplicados, coherencia de datos, etc.
    """
    errors = []
    warnings = list(all_warnings)
    
    if not products:
        errors.append('No se encontraron productos válidos en el archivo.')
        return {"valid": False, "errors": errors, "warnings": warnings, "duplicates": []}
    
    # Validar SKUs duplicados
    sku_count = {}
    duplicates = []
    
    for idx, product in enumerate(products, 1):
        sku = product.get("sku", "")
        if sku not in sku_count:
            sku_count[sku] = []
        sku_count[sku].append(idx)
    
    for sku, occurrences in sku_count.items():
        if len(occurrences) > 1:
            duplicates.append({
                "sku": sku,
                "occurrences": len(occurrences),
                "lines": occurrences
            })
    
    if duplicates:
        errors.append(f"Se encontraron {len(duplicates)} SKUs duplicados:")
        for dup in duplicates[:10]:
            errors.append(f"  - SKU '{dup['sku']}' aparece {dup['occurrences']} veces en las líneas: {', '.join(map(str, dup['lines']))}")
        if len(duplicates) > 10:
            errors.append(f"  ... y {len(duplicates) - 10} duplicados más.")
    
    # Validar coherencia de precios
    products_with_zero_price = [p for p in products if p.get("precio_usd", 0) == 0]
    if products_with_zero_price:
        percentage = (len(products_with_zero_price) / len(products) * 100)
        if percentage > 50:
            warnings.append(f"{percentage:.1f}% de productos tienen precio cero. Verifique si esto es correcto.")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "duplicates": duplicates
    }


def validate_integrity(products: List[Dict], total_lines: int) -> Dict:
    """
    CAPA 5: Validación de Integridad
    
    Valida la tasa de error general del archivo
    """
    errors = []
    warnings = []
    
    valid_products = len(products)
    error_count = total_lines - valid_products
    error_rate = error_count / total_lines if total_lines > 0 else 0
    
    if error_rate > CONFIG.ERROR_THRESHOLD:
        errors.append(
            f"Tasa de error crítica: {error_rate * 100:.1f}% de líneas inválidas "
            f"({error_count} de {total_lines}). Umbral permitido: {CONFIG.ERROR_THRESHOLD * 100}%."
        )
        errors.append('El archivo contiene demasiados errores. Verifique el formato y corrija antes de subir.')
    elif error_rate > CONFIG.ERROR_THRESHOLD / 2:
        warnings.append(
            f"{error_rate * 100:.1f}% de líneas tienen errores. "
            f"Aunque está dentro del umbral, se recomienda revisar el archivo."
        )
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "stats": {
            "totalLines": total_lines,
            "validProducts": valid_products,
            "errorCount": error_count,
            "errorRate": f"{error_rate * 100:.2f}%"
        }
    }


async def validate_inventory_file(buffer: bytes, filename: str) -> Dict:
    """
    Función Principal de Validación
    
    Ejecuta las 5 capas de validación y retorna un reporte completo
    
    Args:
        buffer: Contenido del archivo en bytes
        filename: Nombre del archivo
        
    Returns:
        Diccionario con el reporte de validación completo
    """
    report = {
        "isValid": True,
        "archivo": {
            "nombre": filename,
            "tamaño": f"{len(buffer) / 1024:.2f} KB",
            "encoding": None,
            "estado": "OK"
        },
        "estructura": {
            "lineas_totales": 0,
            "lineas_validas": 0,
            "estado": "OK"
        },
        "formato": {
            "productos_validos": 0,
            "productos_error": 0,
            "tasa_error": "0%",
            "estado": "OK"
        },
        "negocio": {
            "skus_duplicados": 0,
            "estado": "OK"
        },
        "errores": [],
        "advertencias": [],
        "sugerencias": []
    }
    
    try:
        # CAPA 1: Validación de archivo
        file_validation = validate_file(buffer, filename)
        report["archivo"]["encoding"] = file_validation["encoding"]
        
        if not file_validation["valid"]:
            report["isValid"] = False
            report["archivo"]["estado"] = "FALLO"
            report["errores"].extend(file_validation["errors"])
            report["advertencias"].extend(file_validation["warnings"])
            report["sugerencias"].append('Verifique que el archivo sea un TXT válido en formato UTF-8 o Latin-1.')
            return report
        
        report["advertencias"].extend(file_validation["warnings"])
        content = file_validation["content"]
        
        # CAPA 2: Validación de estructura
        structure_validation = validate_structure(content)
        report["estructura"]["lineas_totales"] = structure_validation["totalLines"]
        
        if not structure_validation["valid"]:
            report["isValid"] = False
            report["estructura"]["estado"] = "FALLO"
            report["errores"].extend(structure_validation["errors"])
            report["advertencias"].extend(structure_validation["warnings"])
            report["sugerencias"].append(f"Asegúrese de que el archivo use el separador '{CONFIG.SEPARATOR}' y tenga al menos {CONFIG.MIN_FIELDS} campos por línea.")
            return report
        
        report["advertencias"].extend(structure_validation["warnings"])
        lines = structure_validation["lines"]
        
        # CAPA 3: Validación de formato SAC
        products = []
        line_errors = []
        line_warnings = []
        
        for i, line in enumerate(lines, 1):
            line_validation = validate_sac_format(line, i)
            
            if line_validation["valid"] and line_validation["data"]:
                products.append(line_validation["data"])
            else:
                line_errors.extend(line_validation["errors"])
            
            line_warnings.extend(line_validation["warnings"])
        
        report["formato"]["productos_validos"] = len(products)
        report["formato"]["productos_error"] = len(lines) - len(products)
        report["formato"]["tasa_error"] = f"{(report['formato']['productos_error'] / len(lines)) * 100:.1f}%"
        report["estructura"]["lineas_validas"] = len(products)
        
        if line_errors:
            report["errores"].extend(line_errors[:20])  # Mostrar máximo 20 errores
            if len(line_errors) > 20:
                report["errores"].append(f"... y {len(line_errors) - 20} errores más.")
        
        report["advertencias"].extend(line_warnings[:10])  # Mostrar máximo 10 warnings
        
        # CAPA 4: Validación de reglas de negocio
        business_validation = validate_business_rules(products, report["advertencias"])
        report["negocio"]["skus_duplicados"] = len(business_validation.get("duplicates", []))
        
        if not business_validation["valid"]:
            report["isValid"] = False
            report["negocio"]["estado"] = "FALLO"
            report["formato"]["estado"] = "FALLO"
            report["errores"].extend(business_validation["errors"])
            report["sugerencias"].append('Elimine los SKUs duplicados del archivo.')
            report["sugerencias"].append('Cada SKU debe aparecer solo una vez en el archivo.')
        
        report["advertencias"] = business_validation["warnings"]
        
        # CAPA 5: Validación de integridad
        integrity_validation = validate_integrity(products, len(lines))
        
        if not integrity_validation["valid"]:
            report["isValid"] = False
            report["formato"]["estado"] = "FALLO"
            report["errores"].extend(integrity_validation["errors"])
            report["sugerencias"].append('Corrija los errores de formato en el archivo antes de volver a subir.')
            report["sugerencias"].append(f"El umbral de error permitido es {CONFIG.ERROR_THRESHOLD * 100}%.")
        
        report["advertencias"].extend(integrity_validation["warnings"])
        
        # Estado final
        if not report["isValid"]:
            report["estructura"]["estado"] = "FALLO" if report["estructura"]["lineas_validas"] == 0 else "PARCIAL"
        
        # Sugerencias generales
        if report["isValid"]:
            report["sugerencias"].append('El archivo cumple con todos los requisitos de validación.')
        
        return report
        
    except Exception as e:
        report["isValid"] = False
        report["errores"].append(f"Error inesperado durante la validación: {str(e)}")
        report["sugerencias"].append('Contacte al equipo de soporte con el archivo que causó este error.')
        return report
