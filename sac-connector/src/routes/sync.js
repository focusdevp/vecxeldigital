const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadInventory, downloadInventoryFile, getInventory, getProductBySku, resetInventory, getSyncLogs } = require('../controllers/inventoryController');

router.post('/inventario', auth, upload, uploadInventory);

router.get('/inventario', auth, getInventory);

router.delete('/inventario/reset', auth, resetInventory);

router.get('/inventario/:sku', auth, getProductBySku);

router.get('/logs', auth, getSyncLogs);

router.get('/logs/:id/archivo', auth, downloadInventoryFile);

module.exports = router;
