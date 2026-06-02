const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getInventory, getProductBySku } = require('../controllers/inventoryController');

// Endpoints REST para que la app consulte datos de SAC
router.get('/inventario', auth, getInventory);
router.get('/inventario/:sku', auth, getProductBySku);

module.exports = router;
