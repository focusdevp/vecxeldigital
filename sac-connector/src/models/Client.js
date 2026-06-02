const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  rif: { type: String, required: true, unique: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  direccion: { type: String, default: '', trim: true },
  telefonos: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  codigo_vendedor: { type: String, default: '', trim: true },
  codigo_zona: { type: String, default: '', trim: true },
  esquema_pago: { type: String, default: 'CONTADO', trim: true },
  activo: { type: Boolean, default: true },
  origen: { type: String, enum: ['sac', 'vecxel'], default: 'sac' },
  ultima_sincronizacion: { type: Date, default: Date.now }
}, { timestamps: true });

ClientSchema.index({ rif: 1 });
ClientSchema.index({ nombre: 'text' });

module.exports = mongoose.model('Client', ClientSchema);
