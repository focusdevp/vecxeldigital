const fs = require('fs');
const path = require('path');

const outboxDir = path.join(__dirname, '../../outbox');
if (!fs.existsSync(outboxDir)) {
  fs.mkdirSync(outboxDir, { recursive: true });
}

/**
 * Formatea un campo al tamaño exacto con padding de espacios a la derecha
 */
function pad(valor, longitud) {
  const str = (valor || '').toString().substring(0, longitud);
  return str.padEnd(longitud, ' ');
}

/**
 * Genera una línea del formato CLIENTES.txt para un cliente
 */
function formatClienteLine(cliente) {
  return [
    pad(cliente.rif,             10),
    pad(cliente.nombre,          50),
    pad(cliente.direccion,       160),
    pad(cliente.telefonos,       60),
    pad(cliente.email || '.',    40),
    pad(cliente.codigo_vendedor, 10),
    pad(cliente.codigo_zona,     10),
    pad(cliente.esquema_pago,    10),
  ].join(';') + ';';
}

/**
 * Genera el archivo CLIENTES.txt en la carpeta outbox/
 * SAC monitorea esta carpeta y procesa el archivo
 */
function generateClientesFile(clientes) {
  if (!clientes || clientes.length === 0) {
    throw new Error('No hay clientes para generar el archivo');
  }

  const lineas = clientes.map(formatClienteLine);
  const contenido = lineas.join('\r\n') + '\r\n';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nombreArchivo = `CLIENTES_${timestamp}.txt`;
  const rutaArchivo = path.join(outboxDir, nombreArchivo);

  fs.writeFileSync(rutaArchivo, contenido, { encoding: 'latin1' });

  console.log(`[Generator] Archivo generado: ${nombreArchivo} (${clientes.length} clientes)`);

  return { nombreArchivo, rutaArchivo, totalClientes: clientes.length };
}

module.exports = { generateClientesFile, formatClienteLine };
