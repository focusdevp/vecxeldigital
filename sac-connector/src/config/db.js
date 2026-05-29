const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[DB] MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] Error de conexión: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
