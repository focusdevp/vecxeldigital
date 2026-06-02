const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadInventory, downloadInventoryFile, getInventory, getProductBySku, resetInventory, getSyncLogs } = require('../controllers/inventoryController');
const { uploadClientes, getClientes, getClienteByRif } = require('../controllers/clientController');

router.post('/inventario', auth, upload, uploadInventory);

router.get('/inventario', auth, getInventory);

router.delete('/inventario/reset', auth, resetInventory);

router.get('/inventario/:sku', auth, getProductBySku);

router.get('/logs', auth, getSyncLogs);

router.get('/logs/:id/archivo', auth, downloadInventoryFile);

router.post('/clientes', auth, upload, uploadClientes);
router.get('/clientes', auth, getClientes);
router.get('/clientes/:rif', auth, getClienteByRif);

module.exports = router;
