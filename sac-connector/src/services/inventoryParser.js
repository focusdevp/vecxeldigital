/**
 * Parser del formato de inventario SAC
 *
 * Formato de cada línea (separado por punto y coma):
 * SKU ; DESCRIPCION ; UNIDAD_MEDIDA ; PRECIO_USD ; COD_ALM1 ; STOCK1 ; COD_ALM2 ; STOCK2 ; ...
 *
 * Ejemplo real:
 * BISA100X42          ;BISAGRA 100x42                          ;UND ;00001.50;00;00000;30;00000;40;00000;60;00000;
 */

function parseLine(line, lineNumber) {
  if (!line.trim()) return null;

  const parts = line.split(';');
  const trimmed = parts.map((p) => p.trim());

  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') {
    trimmed.pop();
  }

  if (trimmed.length < 4) {
    return {
      error: true,
      linea: lineNumber,
      contenido: line.trim(),
      motivo: `Campos insuficientes: se esperan al menos 4, se encontraron ${trimmed.length}`
    };
  }

  const [sku, descripcion, unidad_medida, precioStr] = trimmed;

  if (!sku) {
    return { error: true, linea: lineNumber, contenido: line.trim(), motivo: 'SKU vacío' };
  }

  const precio_usd = parseFloat(precioStr);
  if (isNaN(precio_usd)) {
    return {
      error: true,
      linea: lineNumber,
      contenido: line.trim(),
      motivo: `Precio inválido: "${precioStr}"`
    };
  }

  const almacenes = [];
  for (let i = 4; i + 1 < trimmed.length; i += 2) {
    const codigo = trimmed[i];
    const existencia = parseInt(trimmed[i + 1], 10);
    if (codigo && !isNaN(existencia)) {
      almacenes.push({ codigo, existencia });
    }
  }

  return {
    error: false,
    data: {
      sku: sku.toUpperCase(),
      descripcion,
      unidad_medida,
      precio_usd,
      almacenes,
      activo: true,
      ultima_sincronizacion: new Date()
    }
  };
}

function parseInventoryFile(content) {
  const lines = content.replace(/\r/g, '').split('\n');
  const products = [];
  const errors = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    const result = parseLine(line, index + 1);
    if (!result) return;

    if (result.error) {
      errors.push({
        linea: result.linea,
        contenido: result.contenido,
        motivo: result.motivo
      });
    } else {
      products.push(result.data);
    }
  });

  return { products, errors };
}

module.exports = { parseInventoryFile };
