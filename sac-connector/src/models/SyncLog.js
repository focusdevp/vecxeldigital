const mongoose = require('mongoose');

const errorDetailSchema = new mongoose.Schema(
  {
    linea: { type: Number },
    contenido: { type: String },
    motivo: { type: String }
  },
  { _id: false }
);

const syncLogSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['upload', 'download'],
      required: true
    },
    entidad: {
      type: String,
      enum: ['inventario', 'cliente', 'pedido', 'factura'],
      required: true
    },
    archivo: { type: String },
    archivo_path: { type: String },
    checksum: { type: String },
    inicio_procesamiento: { type: Date },
    fin_procesamiento: { type: Date },
    duracion_ms: { type: Number },
    total_registros: { type: Number, default: 0 },
    registros_procesados: { type: Number, default: 0 },
    registros_error: { type: Number, default: 0 },
    errores: [errorDetailSchema],
    estado: {
      type: String,
      enum: ['exitoso', 'parcial', 'fallido'],
      required: true
    },
    sacok: { type: Boolean, default: false },
    ip_origen: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncLog', syncLogSchema);
