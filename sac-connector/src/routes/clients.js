const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadClientes, getClientes, getClienteByRif, createCliente } = require('../controllers/clientController');

// SAC sube archivo TXT de clientes
router.post('/clientes', auth, upload, uploadClientes);

// App consulta clientes desde SAC Connector
router.get('/clientes', auth, getClientes);
router.get('/clientes/:rif', auth, getClienteByRif);

// App envía nuevo cliente → genera TXT en outbox/
router.post('/clientes/nuevo', auth, express.json(), createCliente);

module.exports = router;
