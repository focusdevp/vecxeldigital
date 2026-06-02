const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const Product = require('../models/Product');
const SyncLog = require('../models/SyncLog');
const { validateAndParseInventoryFile } = require('../services/inventoryParser');
const { validateInventoryFile } = require('../services/fileValidator');

const storageDir = path.join(__dirname, '../../storage/uploads');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const uploadInventory = async (req, res) => {
  const receivedFile = req.files && req.files[0];
  if (!receivedFile) {
    return res.status(400).json({ success: false, error: 'No se recibió ningún archivo.' });
  }

  const filePath = receivedFile.path;
  const fileName = receivedFile.filename;
  const inicio_procesamiento = new Date();

  try {
    // Leer archivo como buffer para validación
    const buffer = fs.readFileSync(filePath);
    
    // VALIDACIÓN ROBUSTA - 5 CAPAS DE SEGURIDAD
    const validationReport = await validateInventoryFile(buffer, fileName);
    
    // Si la validación falla, rechazar inmediatamente
    if (!validationReport.isValid) {
      // Eliminar archivo inválido
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      
      // Registrar intento fallido en logs
      // Convertir errores a formato esperado por el schema
      const erroresFormateados = validationReport.errores.slice(0, 50).map((error, index) => ({
        linea: index + 1,
        contenido: '',
        motivo: typeof error === 'string' ? error : JSON.stringify(error)
      }));
      
      await SyncLog.create({
        tipo: 'upload',
        entidad: 'inventario',
        archivo: receivedFile.originalname || fileName,
        inicio_procesamiento: inicio_procesamiento,
        fin_procesamiento: new Date(),
        duracion_ms: Date.now() - inicio_procesamiento,
        total_registros: validationReport.estructura.lineas_totales || 0,
        registros_procesados: 0,
        registros_error: validationReport.estructura.lineas_totales || 0,
        errores: erroresFormateados,
        estado: 'fallido',
        ip_origen: req.ip
      });
      
      // Retornar respuesta detallada
      return res.status(422).json({
        success: false,
        codigo_error: 'VALIDATION_FAILED',
        mensaje: 'El archivo no cumple con los requisitos de validación',
        validaciones: validationReport,
        timestamp: new Date().toISOString()
      });
    }
    
    // Si hay advertencias, registrarlas para revisión
    if (validationReport.advertencias.length > 0) {
      console.log(`[ADVERTENCIA] Archivo ${fileName} tiene ${validationReport.advertencias.length} advertencias`);
      validationReport.advertencias.slice(0, 5).forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Archivo válido, continuar con procesamiento normal
    const content = buffer.toString('utf-8');
    const checksum = crypto.createHash('md5').update(content).digest('hex');

    const duplicate = await SyncLog.findOne({
      checksum,
      estado: { $ne: 'fallido' },
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });
    if (duplicate) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(409).json({
        success: false,
        error: 'Este archivo ya fue procesado en la última hora. Verifique si es un duplicado.',
        log_id: duplicate._id
      });
    }

    const { products, errors } = validateAndParseInventoryFile(content);

    const operations = products.map(product => ({
      updateOne: {
        filter: { sku: product.sku },
        update: { $set: product },
        upsert: true
      }
    }));

    const bulkResult = await Product.bulkWrite(operations, { ordered: false });
    const procesados = (bulkResult.upsertedCount ?? 0) + (bulkResult.modifiedCount ?? 0) + (bulkResult.matchedCount ?? 0);

    const fin_procesamiento = new Date();
    const duracion_ms = fin_procesamiento - inicio_procesamiento;
    const estado = errors.length === 0 ? 'exitoso' : procesados > 0 ? 'parcial' : 'fallido';

    // SINCRONIZAR CON VECXEL API
    // Notificar a Vecxel API para que guarde copia en vecxel_app_db
    if (procesados > 0 && process.env.VECXEL_API_URL) {
      try {
        console.log(`[SAC Connector] Sincronizando ${procesados} productos con Vecxel API...`);
        
        const syncResponse = await axios.post(
          `${process.env.VECXEL_API_URL}/inventario/sync`,
          {
            productos: products,
            origen: 'sac',
            timestamp: fin_procesamiento.toISOString()
          },
          {
            headers: {
              'X-API-Key': process.env.VECXEL_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        console.log(`[SAC Connector] Sync exitoso: ${syncResponse.data.synced} productos sincronizados con Vecxel API`);
      } catch (syncError) {
        console.error(`[SAC Connector] ERROR sincronizando con Vecxel API: ${syncError.message}`);
        // No fallar la operación si la sincronización con Vecxel falla
        // Los datos ya están guardados en SAC Connector
      }
    }

    const storagePath = path.join(storageDir, fileName);
    fs.renameSync(filePath, storagePath);

    const log = await SyncLog.create({
      tipo: 'upload',
      entidad: 'inventario',
      archivo: receivedFile.originalname || fileName,
      archivo_path: storagePath,
      checksum,
      inicio_procesamiento,
      fin_procesamiento,
      duracion_ms,
      total_registros: products.length + errors.length,
      registros_procesados: procesados,
      registros_error: errors.length,
      errores: errors.slice(0, 50),
      estado,
      ip_origen: req.ip
    });

    return res.status(200).json({
      success: true,
      mensaje: `Inventario sincronizado: ${procesados} productos procesados.`,
      total_registros: products.length + errors.length,
      registros_procesados: procesados,
      registros_error: errors.length,
      errores: errors.length > 0 ? errors.slice(0, 10) : undefined,
      duracion_ms,
      estado,
      log_id: log._id,
      timestamp: fin_procesamiento.toISOString()
    });
  } catch (error) {
    const fin_procesamiento = new Date();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await SyncLog.create({
      tipo: 'upload',
      entidad: 'inventario',
      archivo: fileName,
      inicio_procesamiento,
      fin_procesamiento,
      duracion_ms: fin_procesamiento - inicio_procesamiento,
      total_registros: 0,
      registros_procesados: 0,
      registros_error: 1,
      errores: [{ linea: 0, contenido: '', motivo: error.message }],
      estado: 'fallido',
      ip_origen: req.ip
    });

    return res.status(422).json({ success: false, error: error.message });
  }
};

const downloadInventoryFile = async (req, res) => {
  try {
    const log = await SyncLog.findById(req.params.id).select('archivo archivo_path');
    if (!log || !log.archivo_path) {
      return res.status(404).json({ error: 'Archivo no disponible para este log.' });
    }
    if (!fs.existsSync(log.archivo_path)) {
      return res.status(404).json({ error: 'El archivo fue eliminado del servidor.' });
    }
    res.download(log.archivo_path, log.archivo || 'inventario.txt');
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getInventory = async (req, res) => {
  try {
    const { sku, activo, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (sku) filter.sku = new RegExp(sku, 'i');
    if (activo !== undefined) filter.activo = activo === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ sku: 1 });

    return res.status(200).json({
      success: true,
      total,
      pagina: parseInt(page),
      por_pagina: parseInt(limit),
      productos: products
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getProductBySku = async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });
    if (!product) return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    return res.status(200).json({ success: true, producto: product });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const resetInventory = async (req, res) => {
  try {
    const logs = await SyncLog.find({}, 'archivo_path');
    for (const log of logs) {
      if (log.archivo_path && fs.existsSync(log.archivo_path)) {
        fs.unlinkSync(log.archivo_path);
      }
    }
    const result = await Product.deleteMany({});
    await SyncLog.deleteMany({});
    return res.status(200).json({
      success: true,
      mensaje: `Base de datos limpiada. ${result.deletedCount} productos eliminados.`,
      eliminados: result.deletedCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getSyncLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, entidad, estado } = req.query;

    const filter = {};
    if (entidad) filter.entidad = entidad;
    if (estado) filter.estado = estado;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await SyncLog.countDocuments(filter);
    const logs = await SyncLog
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total,
      pagina: parseInt(page),
      logs
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { uploadInventory, downloadInventoryFile, getInventory, getProductBySku, resetInventory, getSyncLogs };
