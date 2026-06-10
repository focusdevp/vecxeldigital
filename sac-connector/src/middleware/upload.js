const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { formatCaracasFilenameTimestamp } = require('../utils/time');

const inboxDir = path.join(__dirname, '../../inbox');

if (!fs.existsSync(inboxDir)) {
  fs.mkdirSync(inboxDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, inboxDir);
  },
  filename: (req, file, cb) => {
    const timestamp = formatCaracasFilenameTimestamp();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() !== '.txt') {
    return cb(new Error('Solo se aceptan archivos .txt'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload.any();
