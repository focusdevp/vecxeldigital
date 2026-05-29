require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 4000;

connectDB();

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sac-connector',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/sync', syncRoutes);

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`[SAC Connector] Corriendo en http://localhost:${PORT}`);
});
