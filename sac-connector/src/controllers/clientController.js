const fs = require('fs');
const axios = require('axios');
const Client = require('../models/Client');
const { parseClientesFile } = require('../services/clientParser');
const { generateClientesFile } = require('../services/clientGenerator');

/**
 * POST /sync/clientes
 * SAC sube CLIENTES.txt → SAC Connector parsea y guarda en BD
 */
const uploadClientes = async (req, res) => {
  const archivo = req.files && req.files[0];
  if (!archivo) {
    return res.status(400).json({ success: false, error: 'No se recibió ningún archivo.' });
  }

  const inicio = new Date();

  try {
    const contenido = fs.readFileSync(archivo.path, 'latin1');
    const { clientes, errors, totalLineas, tasaError } = parseClientesFile(contenido);

    if (tasaError > 0.1 && clientes.length === 0) {
      fs.unlinkSync(archivo.path);
      return res.status(422).json({
        success: false,
        error: `Demasiados errores (${errors.length}/${totalLineas} líneas). Archivo rechazado.`,
        errores: errors.slice(0, 10)
      });
    }

    const operations = clientes.map(c => ({
      updateOne: {
        filter: { rif: c.rif },
        update: { $set: { ...c, ultima_sincronizacion: new Date() } },
        upsert: true
      }
    }));

    const result = await Client.bulkWrite(operations, { ordered: false });
    const procesados = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) + (result.matchedCount ?? 0);
    const duracion_ms = Date.now() - inicio;

    fs.unlinkSync(archivo.path);

    // Notificar a Vecxel API para sincronizar su propia BD
    if (procesados > 0 && process.env.VECXEL_API_URL) {
      try {
        await axios.post(
          `${process.env.VECXEL_API_URL}/clientes/sync`,
          { clientes, origen: 'sac', timestamp: new Date().toISOString() },
          { headers: { 'X-API-Key': process.env.VECXEL_API_KEY }, timeout: 30000 }
        );
        console.log(`[Clientes] Sync con Vecxel API: ${procesados} clientes`);
      } catch (e) {
        console.error(`[Clientes] Error notificando Vecxel API: ${e.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      mensaje: `Clientes sincronizados: ${procesados} procesados.`,
      total_registros: totalLineas,
      registros_procesados: procesados,
      registros_error: errors.length,
      duracion_ms,
      estado: errors.length === 0 ? 'exitoso' : 'parcial'
    });

  } catch (error) {
    if (fs.existsSync(archivo.path)) fs.unlinkSync(archivo.path);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/clientes
 * Vecxel App consulta clientes desde SAC Connector
 */
const getClientes = async (req, res) => {
  try {
    const { rif, nombre, page = 1, limit = 100 } = req.query;
    const filter = { activo: true };
    if (rif) filter.rif = new RegExp(rif, 'i');
    if (nombre) filter.nombre = new RegExp(nombre, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Client.countDocuments(filter);
    const clientes = await Client.find(filter).skip(skip).limit(parseInt(limit)).sort({ nombre: 1 });

    return res.status(200).json({ success: true, total, pagina: parseInt(page), por_pagina: parseInt(limit), clientes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/clientes/:rif
 */
const getClienteByRif = async (req, res) => {
  try {
    const cliente = await Client.findOne({ rif: req.params.rif.toUpperCase() });
    if (!cliente) return res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
    return res.status(200).json({ success: true, cliente });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/clientes
 * Vecxel App envía un nuevo cliente → SAC Connector genera TXT en outbox/
 */
const createCliente = async (req, res) => {
  try {
    const { rif, nombre, direccion, telefonos, email, codigo_vendedor, codigo_zona, esquema_pago } = req.body;

    if (!rif || !nombre) {
      return res.status(400).json({ success: false, error: 'RIF y nombre son obligatorios.' });
    }

    const clienteData = {
      rif: rif.toUpperCase().trim(),
      nombre: nombre.trim(),
      direccion: (direccion || '').trim(),
      telefonos: (telefonos || '').trim(),
      email: (email || '').trim(),
      codigo_vendedor: (codigo_vendedor || '').trim(),
      codigo_zona: (codigo_zona || '').trim(),
      esquema_pago: (esquema_pago || 'CONTADO').trim(),
      origen: 'vecxel',
      ultima_sincronizacion: new Date()
    };

    // Guardar en BD del SAC Connector
    await Client.findOneAndUpdate(
      { rif: clienteData.rif },
      { $set: clienteData },
      { upsert: true, new: true }
    );

    // Generar archivo TXT en outbox/ para que SAC lo procese
    const archivoGenerado = generateClientesFile([clienteData]);

    console.log(`[Clientes] Cliente ${clienteData.rif} guardado. Archivo: ${archivoGenerado.nombreArchivo}`);

    return res.status(201).json({
      success: true,
      mensaje: 'Cliente registrado y archivo generado para SAC.',
      rif: clienteData.rif,
      archivo_generado: archivoGenerado.nombreArchivo
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { uploadClientes, getClientes, getClienteByRif, createCliente };
