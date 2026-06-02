/**
 * Módulo de Validación Robusto para Archivos SAC
 * 
 * Implementa 5 capas de validación:
 * 1. Validación de archivo (encoding, tipo, tamaño)
 * 2. Validación de estructura global
 * 3. Validación de formato SAC estricto
 * 4. Validación de contenido y reglas de negocio
 * 5. Validación de integridad
 */

const iconv = require('iconv-lite');

// Configuración de validaciones
const CONFIG = {
  // Thresholds
  ERROR_THRESHOLD: 0.05, // 5% de errores permitido (reducido de 10%)
  MIN_VALID_LINES: 1,
  MAX_LINES: 50000,
  MIN_FILE_SIZE: 100, // bytes
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Formato SAC
  SEPARATOR: ';',
  MIN_FIELDS: 4, // SKU, DESC, UNIDAD, PRECIO
  
  // Unidades de medida permitidas (lista blanca)
  ALLOWED_UNITS: ['UND', 'KG', 'MT', 'LT', 'M2', 'M3', 'CJ', 'PAQ', 'DOC', 'GL', 'LB'],
  
  // Rangos de valores
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
  MIN_STOCK: 0,
  MAX_STOCK: 999999,
  
  // SKU
  SKU_MIN_LENGTH: 1,
  SKU_MAX_LENGTH: 20,
  SKU_PATTERN: /^[A-Z0-9\-_]+$/i,
  
  // Descripción
  DESC_MIN_LENGTH: 1,
  DESC_MAX_LENGTH: 100
};

/**
 * CAPA 1: Validación de Archivo
 */
function validateFile(buffer, filename) {
  const errors = [];
  const warnings = [];
  
  // Validar tamaño
  if (buffer.length < CONFIG.MIN_FILE_SIZE) {
    errors.push(`Archivo demasiado pequeño: ${buffer.length} bytes (mínimo: ${CONFIG.MIN_FILE_SIZE} bytes)`);
  }
  
  if (buffer.length > CONFIG.MAX_FILE_SIZE) {
    errors.push(`Archivo demasiado grande: ${buffer.length} bytes (máximo: ${CONFIG.MAX_FILE_SIZE} bytes)`);
  }
  
  // Detectar si es binario (búsqueda de bytes nulos)
  const isBinary = buffer.slice(0, 8000).includes(0x00);
  if (isBinary) {
    errors.push('El archivo contiene datos binarios. Solo se aceptan archivos de texto plano.');
  }
  
  // Detectar encoding
  let encoding = 'utf-8';
  let content = '';
  
  try {
    // Intentar UTF-8 primero
    content = buffer.toString('utf-8');
    
    // Verificar si hay caracteres de reemplazo (indica encoding incorrecto)
    if (content.includes('\ufffd')) {
      // Intentar ISO-8859-1 (Latin-1)
      content = iconv.decode(buffer, 'iso-8859-1');
      encoding = 'iso-8859-1';
      warnings.push('Archivo detectado como ISO-8859-1. Se recomienda usar UTF-8 para futuros archivos.');
    }
  } catch (error) {
    errors.push(`Error al decodificar archivo: ${error.message}`);
    return { valid: false, errors, warnings, content: null, encoding: null };
  }
  
  // Eliminar BOM si existe
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    content,
    encoding,
    size: buffer.length
  };
}

/**
 * CAPA 2: Validación de Estructura Global
 */
function validateStructure(content) {
  const errors = [];
  const warnings = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('El archivo está vacío.');
    return { valid: false, errors, warnings, lines: [] };
  }
  
  // Normalizar saltos de línea
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allLines = normalizedContent.split('\n');
  
  // Filtrar líneas vacías
  const lines = allLines.filter(line => line.trim().length > 0);
  
  if (lines.length < CONFIG.MIN_VALID_LINES) {
    errors.push(`El archivo debe contener al menos ${CONFIG.MIN_VALID_LINES} línea válida.`);
  }
  
  if (lines.length > CONFIG.MAX_LINES) {
    errors.push(`El archivo contiene demasiadas líneas: ${lines.length} (máximo: ${CONFIG.MAX_LINES})`);
  }
  
  // Validar que todas las líneas tengan el separador
  const linesWithoutSeparator = lines.filter(line => !line.includes(CONFIG.SEPARATOR));
  if (linesWithoutSeparator.length > 0) {
    const percentage = (linesWithoutSeparator.length / lines.length * 100).toFixed(1);
    if (linesWithoutSeparator.length === lines.length) {
      errors.push(`Ninguna línea contiene el separador '${CONFIG.SEPARATOR}'. Formato de archivo incorrecto.`);
    } else if (percentage > 20) {
      errors.push(`${percentage}% de líneas no contienen el separador '${CONFIG.SEPARATOR}'. Posible archivo corrupto.`);
    } else {
      warnings.push(`${linesWithoutSeparator.length} líneas no contienen el separador esperado.`);
    }
  }
  
  // Verificar cantidad mínima de campos por línea
  let linesWithInsufficientFields = 0;
  for (const line of lines) {
    const fields = line.split(CONFIG.SEPARATOR);
    if (fields.length < CONFIG.MIN_FIELDS) {
      linesWithInsufficientFields++;
    }
  }
  
  if (linesWithInsufficientFields > 0) {
    const percentage = (linesWithInsufficientFields / lines.length * 100).toFixed(1);
    if (percentage > 50) {
      errors.push(`${percentage}% de líneas tienen menos de ${CONFIG.MIN_FIELDS} campos. Formato SAC no reconocido.`);
    } else if (percentage > 20) {
      warnings.push(`${percentage}% de líneas tienen campos insuficientes.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lines,
    totalLines: lines.length
  };
}

/**
 * CAPA 3: Validación de Formato SAC Estricto
 */
function validateSACFormat(line, lineNumber) {
  const errors = [];
  const warnings = [];
  
  const parts = line.split(CONFIG.SEPARATOR);
  const trimmed = parts.map(p => p.trim());
  
  // Eliminar campos vacíos al final
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') {
    trimmed.pop();
  }
  
  if (trimmed.length < CONFIG.MIN_FIELDS) {
    return {
      valid: false,
      errors: [`Línea ${lineNumber}: Campos insuficientes (${trimmed.length}). Se esperan al menos ${CONFIG.MIN_FIELDS}.`],
      warnings: [],
      data: null
    };
  }
  
  const [sku, descripcion, unidad_medida, precioStr, ...almacenesData] = trimmed;
  
  // Validar SKU
  if (!sku) {
    errors.push(`Línea ${lineNumber}: SKU vacío`);
  } else if (sku.length < CONFIG.SKU_MIN_LENGTH || sku.length > CONFIG.SKU_MAX_LENGTH) {
    errors.push(`Línea ${lineNumber}: SKU '${sku}' tiene longitud inválida (${sku.length}). Debe estar entre ${CONFIG.SKU_MIN_LENGTH} y ${CONFIG.SKU_MAX_LENGTH} caracteres.`);
  } else if (!CONFIG.SKU_PATTERN.test(sku)) {
    errors.push(`Línea ${lineNumber}: SKU '${sku}' contiene caracteres no permitidos. Solo se permiten letras, números, guiones y guiones bajos.`);
  }
  
  // Validar descripción
  if (!descripcion || descripcion.trim().length === 0) {
    errors.push(`Línea ${lineNumber}: Descripción vacía`);
  } else if (descripcion.length > CONFIG.DESC_MAX_LENGTH) {
    warnings.push(`Línea ${lineNumber}: Descripción muy larga (${descripcion.length} caracteres). Se recomienda máximo ${CONFIG.DESC_MAX_LENGTH}.`);
  }
  
  // Validar unidad de medida
  if (!unidad_medida) {
    errors.push(`Línea ${lineNumber}: Unidad de medida vacía`);
  } else if (!CONFIG.ALLOWED_UNITS.includes(unidad_medida.toUpperCase())) {
    warnings.push(`Línea ${lineNumber}: Unidad '${unidad_medida}' no está en la lista blanca. Unidades permitidas: ${CONFIG.ALLOWED_UNITS.join(', ')}`);
  }
  
  // Validar precio
  const precio_usd = parseFloat(precioStr);
  if (isNaN(precio_usd)) {
    errors.push(`Línea ${lineNumber}: Precio inválido '${precioStr}'. Debe ser un número.`);
  } else if (precio_usd < CONFIG.MIN_PRICE) {
    errors.push(`Línea ${lineNumber}: Precio ${precio_usd} es menor al mínimo permitido (${CONFIG.MIN_PRICE}).`);
  } else if (precio_usd > CONFIG.MAX_PRICE) {
    errors.push(`Línea ${lineNumber}: Precio ${precio_usd} excede el máximo permitido (${CONFIG.MAX_PRICE}).`);
  }
  
  // Validar almacenes
  const almacenes = [];
  if (almacenesData.length % 2 !== 0) {
    warnings.push(`Línea ${lineNumber}: Datos de almacenes incompletos (número impar de campos).`);
  }
  
  for (let i = 0; i + 1 < almacenesData.length; i += 2) {
    const codigo = almacenesData[i];
    const existenciaStr = almacenesData[i + 1];
    const existencia = parseInt(existenciaStr, 10);
    
    if (!codigo) {
      warnings.push(`Línea ${lineNumber}: Código de almacén vacío en posición ${i / 2 + 1}.`);
      continue;
    }
    
    if (!/^\d{2}$/.test(codigo)) {
      warnings.push(`Línea ${lineNumber}: Código de almacén '${codigo}' debe ser numérico de 2 dígitos (00-99).`);
    }
    
    if (isNaN(existencia)) {
      warnings.push(`Línea ${lineNumber}: Existencia inválida '${existenciaStr}' para almacén ${codigo}.`);
    } else if (existencia < CONFIG.MIN_STOCK) {
      warnings.push(`Línea ${lineNumber}: Existencia negativa (${existencia}) para almacén ${codigo}.`);
    } else if (existencia > CONFIG.MAX_STOCK) {
      warnings.push(`Línea ${lineNumber}: Existencia ${existencia} excede el máximo permitido (${CONFIG.MAX_STOCK}) para almacén ${codigo}.`);
    }
    
    if (codigo && !isNaN(existencia)) {
      almacenes.push({ codigo, existencia });
    }
  }
  
  if (almacenes.length === 0) {
    warnings.push(`Línea ${lineNumber}: No se encontraron almacenes válidos.`);
  }
  
  // Si hay errores críticos, no retornar datos
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      data: null
    };
  }
  
  return {
    valid: true,
    errors: [],
    warnings,
    data: {
      sku: sku.toUpperCase(),
      descripcion: descripcion.trim(),
      unidad_medida: unidad_medida.toUpperCase(),
      precio_usd,
      almacenes,
      activo: true,
      ultima_sincronizacion: new Date()
    }
  };
}

/**
 * CAPA 4: Validación de Contenido y Reglas de Negocio
 */
function validateBusinessRules(products, allWarnings) {
  const errors = [];
  const warnings = [...allWarnings];
  
  if (products.length === 0) {
    errors.push('No se encontraron productos válidos en el archivo.');
    return { valid: false, errors, warnings };
  }
  
  // Validar SKUs duplicados
  const skuCount = {};
  const duplicates = [];
  
  products.forEach((product, index) => {
    const sku = product.sku;
    if (!skuCount[sku]) {
      skuCount[sku] = [];
    }
    skuCount[sku].push(index + 1);
  });
  
  for (const [sku, occurrences] of Object.entries(skuCount)) {
    if (occurrences.length > 1) {
      duplicates.push({
        sku,
        occurrences: occurrences.length,
        lines: occurrences
      });
    }
  }
  
  if (duplicates.length > 0) {
    errors.push(`Se encontraron ${duplicates.length} SKUs duplicados:`);
    duplicates.slice(0, 10).forEach(dup => {
      errors.push(`  - SKU '${dup.sku}' aparece ${dup.occurrences} veces en las líneas: ${dup.lines.join(', ')}`);
    });
    if (duplicates.length > 10) {
      errors.push(`  ... y ${duplicates.length - 10} duplicados más.`);
    }
  }
  
  // Validar coherencia de precios
  const productsWithZeroPrice = products.filter(p => p.precio_usd === 0);
  if (productsWithZeroPrice.length > 0) {
    const percentage = (productsWithZeroPrice.length / products.length * 100).toFixed(1);
    if (percentage > 50) {
      warnings.push(`${percentage}% de productos tienen precio cero. Verifique si esto es correcto.`);
    }
  }
  
  // Validar productos con precio muy alto
  const productsWithHighPrice = products.filter(p => p.precio_usd > 10000);
  if (productsWithHighPrice.length > 0) {
    warnings.push(`${productsWithHighPrice.length} productos tienen precio mayor a $10,000. Verifique si los precios son correctos.`);
  }
  
  // Validar productos sin stock en ningún almacén
  const productsWithoutStock = products.filter(p => 
    p.almacenes.every(alm => alm.existencia === 0)
  );
  if (productsWithoutStock.length > 0) {
    const percentage = (productsWithoutStock.length / products.length * 100).toFixed(1);
    if (percentage > 90) {
      warnings.push(`${percentage}% de productos no tienen stock en ningún almacén.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    duplicates
  };
}

/**
 * CAPA 5: Validación de Integridad
 */
function validateIntegrity(products, totalLines) {
  const errors = [];
  const warnings = [];
  
  const validProducts = products.length;
  const errorCount = totalLines - validProducts;
  const errorRate = errorCount / totalLines;
  
  if (errorRate > CONFIG.ERROR_THRESHOLD) {
    errors.push(
      `Tasa de error crítica: ${(errorRate * 100).toFixed(1)}% de líneas inválidas ` +
      `(${errorCount} de ${totalLines}). Umbral permitido: ${(CONFIG.ERROR_THRESHOLD * 100)}%.`
    );
    errors.push('El archivo contiene demasiados errores. Verifique el formato y corrija antes de subir.');
  } else if (errorRate > CONFIG.ERROR_THRESHOLD / 2) {
    warnings.push(
      `${(errorRate * 100).toFixed(1)}% de líneas tienen errores. ` +
      `Aunque está dentro del umbral, se recomienda revisar el archivo.`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalLines,
      validProducts,
      errorCount,
      errorRate: (errorRate * 100).toFixed(2) + '%'
    }
  };
}

/**
 * Función Principal de Validación
 */
async function validateInventoryFile(buffer, filename) {
  const report = {
    isValid: true,
    archivo: {
      nombre: filename,
      tamaño: buffer.length,
      encoding: null,
      estado: '✓ OK'
    },
    estructura: {
      lineas_totales: 0,
      lineas_validas: 0,
      estado: '✓ OK'
    },
    formato: {
      productos_validos: 0,
      productos_error: 0,
      tasa_error: '0%',
      estado: '✓ OK'
    },
    negocio: {
      skus_duplicados: 0,
      estado: '✓ OK'
    },
    errores: [],
    advertencias: [],
    sugerencias: []
  };
  
  try {
    // CAPA 1: Validación de archivo
    const fileValidation = validateFile(buffer, filename);
    report.archivo.encoding = fileValidation.encoding;
    report.archivo.tamaño = `${(fileValidation.size / 1024).toFixed(2)} KB`;
    
    if (!fileValidation.valid) {
      report.isValid = false;
      report.archivo.estado = '✗ FALLO';
      report.errores.push(...fileValidation.errors);
      report.advertencias.push(...fileValidation.warnings);
      report.sugerencias.push('Verifique que el archivo sea un TXT válido en formato UTF-8 o ISO-8859-1.');
      return report;
    }
    
    report.advertencias.push(...fileValidation.warnings);
    const content = fileValidation.content;
    
    // CAPA 2: Validación de estructura
    const structureValidation = validateStructure(content);
    report.estructura.lineas_totales = structureValidation.totalLines;
    
    if (!structureValidation.valid) {
      report.isValid = false;
      report.estructura.estado = '✗ FALLO';
      report.errores.push(...structureValidation.errors);
      report.advertencias.push(...structureValidation.warnings);
      report.sugerencias.push(`Asegúrese de que el archivo use el separador '${CONFIG.SEPARATOR}' y tenga al menos ${CONFIG.MIN_FIELDS} campos por línea.`);
      return report;
    }
    
    report.advertencias.push(...structureValidation.warnings);
    const lines = structureValidation.lines;
    
    // CAPA 3: Validación de formato SAC
    const products = [];
    const lineErrors = [];
    const lineWarnings = [];
    
    for (let i = 0; i < lines.length; i++) {
      const lineValidation = validateSACFormat(lines[i], i + 1);
      
      if (lineValidation.valid && lineValidation.data) {
        products.push(lineValidation.data);
      } else {
        lineErrors.push(...lineValidation.errors);
      }
      
      lineWarnings.push(...lineValidation.warnings);
    }
    
    report.formato.productos_validos = products.length;
    report.formato.productos_error = lines.length - products.length;
    report.formato.tasa_error = ((report.formato.productos_error / lines.length) * 100).toFixed(1) + '%';
    report.estructura.lineas_validas = products.length;
    
    if (lineErrors.length > 0) {
      report.errores.push(...lineErrors.slice(0, 20)); // Mostrar máximo 20 errores de línea
      if (lineErrors.length > 20) {
        report.errores.push(`... y ${lineErrors.length - 20} errores más.`);
      }
    }
    
    report.advertencias.push(...lineWarnings.slice(0, 10)); // Mostrar máximo 10 warnings
    
    // CAPA 4: Validación de reglas de negocio
    const businessValidation = validateBusinessRules(products, report.advertencias);
    report.negocio.skus_duplicados = businessValidation.duplicates?.length || 0;
    
    if (!businessValidation.valid) {
      report.isValid = false;
      report.negocio.estado = '✗ FALLO';
      report.formato.estado = '✗ FALLO';
      report.errores.push(...businessValidation.errors);
      report.sugerencias.push('Elimine los SKUs duplicados del archivo.');
      report.sugerencias.push('Cada SKU debe aparecer solo una vez en el archivo.');
    }
    
    report.advertencias.push(...businessValidation.warnings);
    
    // CAPA 5: Validación de integridad
    const integrityValidation = validateIntegrity(products, lines.length);
    
    if (!integrityValidation.valid) {
      report.isValid = false;
      report.formato.estado = '✗ FALLO';
      report.errores.push(...integrityValidation.errors);
      report.sugerencias.push('Corrija los errores de formato en el archivo antes de volver a subir.');
      report.sugerencias.push(`El umbral de error permitido es ${(CONFIG.ERROR_THRESHOLD * 100)}%.`);
    }
    
    report.advertencias.push(...integrityValidation.warnings);
    
    // Estado final
    if (!report.isValid) {
      report.estructura.estado = report.estructura.lineas_validas === 0 ? '✗ FALLO' : '⚠ PARCIAL';
    }
    
    // Sugerencias generales
    if (report.isValid) {
      report.sugerencias.push('El archivo cumple con todos los requisitos de validación.');
    }
    
    return report;
    
  } catch (error) {
    report.isValid = false;
    report.errores.push(`Error inesperado durante la validación: ${error.message}`);
    report.sugerencias.push('Contacte al equipo de soporte con el archivo que causó este error.');
    return report;
  }
}

module.exports = {
  validateInventoryFile,
  CONFIG
};
