const mongoose = require('mongoose');

const almacenSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true },
    existencia: { type: Number, default: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    descripcion: { type: String, required: true, trim: true },
    unidad_medida: { type: String, required: true, trim: true },
    precio_usd: { type: Number, required: true, min: 0 },
    almacenes: [almacenSchema],
    activo: { type: Boolean, default: true },
    ultima_sincronizacion: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

productSchema.index({ activo: 1 });
productSchema.index({ descripcion: 'text' });

module.exports = mongoose.model('Product', productSchema);
