/**
 * Parser para archivo CLIENTES.txt de SAC
 * Formato: separador ; al final de cada línea
 * Campos fijos (padding derecha con espacios):
 *   RIF(10) ; Nombre(50) ; Dirección(160) ; Teléfonos(60) ; Email(40) ;
 *   CodVendedor(10) ; CodZona(10) ; EsquemaPago(10) ;
 */

const CAMPOS = [
  { nombre: 'rif',             longitud: 10  },
  { nombre: 'nombre',          longitud: 50  },
  { nombre: 'direccion',       longitud: 160 },
  { nombre: 'telefonos',       longitud: 60  },
  { nombre: 'email',           longitud: 40  },
  { nombre: 'codigo_vendedor', longitud: 10  },
  { nombre: 'codigo_zona',     longitud: 10  },
  { nombre: 'esquema_pago',    longitud: 10  },
];

const LONGITUD_TOTAL = CAMPOS.reduce((acc, c) => acc + c.longitud + 1, 0); // +1 por cada ;

function parseClienteLine(linea, numeroLinea) {
  const partes = linea.split(';');

  if (partes.length < CAMPOS.length) {
    return {
      error: true,
      linea: numeroLinea,
      motivo: `Campos insuficientes: se esperaban ${CAMPOS.length}, se encontraron ${partes.length}`
    };
  }

  const cliente = { origen: 'sac' };

  CAMPOS.forEach((campo, i) => {
    cliente[campo.nombre] = (partes[i] || '').trim();
  });

  if (!cliente.rif) {
    return { error: true, linea: numeroLinea, motivo: 'RIF vacío' };
  }

  // Normalizar email vacío (SAC usa "." para indicar vacío)
  if (cliente.email === '.') cliente.email = '';

  return { error: false, cliente };
}

function parseClientesFile(contenido) {
  const lineas = contenido
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const clientes = [];
  const errors = [];

  lineas.forEach((linea, i) => {
    const resultado = parseClienteLine(linea, i + 1);
    if (resultado.error) {
      errors.push({ linea: i + 1, contenido: linea.substring(0, 50), motivo: resultado.motivo });
    } else {
      clientes.push(resultado.cliente);
    }
  });

  const tasaError = lineas.length > 0 ? errors.length / lineas.length : 0;

  return { clientes, errors, totalLineas: lineas.length, tasaError };
}

module.exports = { parseClientesFile };
