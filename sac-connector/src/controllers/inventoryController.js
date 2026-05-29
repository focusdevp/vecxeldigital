const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const SyncLog = require('../models/SyncLog');
const { parseInventoryFile } = require('../services/inventoryParser');

const processedDir = path.join(__dirname, '../../processed');
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

const uploadInventory = async (req, res) => {
  const receivedFile = req.files && req.files[0];
  console.log('[UPLOAD] Campos recibidos:', req.files ? req.files.map(f => f.fieldname) : 'ninguno');

  if (!receivedFile) {
    return res.status(400).json({ success: false, error: 'No se recibió ningún archivo.' });
  }

  const filePath = receivedFile.path;
  const fileName = receivedFile.filename;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { products, errors } = parseInventoryFile(content);

    let procesados = 0;

    for (const product of products) {
      await Product.findOneAndUpdate(
        { sku: product.sku },
        { $set: product },
        { upsert: true, new: true, runValidators: true }
      );
      procesados++;
    }

    const estado =
      errors.length === 0 ? 'exitoso' : procesados > 0 ? 'parcial' : 'fallido';

    const log = await SyncLog.create({
      tipo: 'upload',
      entidad: 'inventario',
      archivo: fileName,
      total_registros: products.length + errors.length,
      registros_procesados: procesados,
      registros_error: errors.length,
      errores: errors.slice(0, 50),
      estado,
      ip_origen: req.ip
    });

    fs.renameSync(filePath, path.join(processedDir, fileName));

    return res.status(200).json({
      success: true,
      mensaje: `Inventario sincronizado: ${procesados} productos procesados.`,
      total_registros: products.length + errors.length,
      registros_procesados: procesados,
      registros_error: errors.length,
      errores: errors.length > 0 ? errors.slice(0, 10) : undefined,
      estado,
      log_id: log._id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await SyncLog.create({
      tipo: 'upload',
      entidad: 'inventario',
      archivo: fileName,
      total_registros: 0,
      registros_procesados: 0,
      registros_error: 1,
      errores: [{ linea: 0, contenido: '', motivo: error.message }],
      estado: 'fallido',
      ip_origen: req.ip
    });

    return res.status(500).json({ success: false, error: error.message });
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

module.exports = { uploadInventory, getInventory, getProductBySku, resetInventory, getSyncLogs };
