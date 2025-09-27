// src/utils/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeStorage(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    }
  });
}

const uploadPortfolio = multer({ storage: makeStorage(path.resolve('uploads/portfolio')) });
const uploadQuotation = multer({ storage: makeStorage(path.resolve('uploads/quotations')) });
const uploadRequestImages = multer({ storage: makeStorage(path.resolve('uploads/requests')) });

module.exports = { uploadPortfolio, uploadQuotation, uploadRequestImages };
