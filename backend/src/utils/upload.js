// src/utils/upload.js
const multer = require('multer');
const path = require('path');
const {
  UPLOAD_ROOT,
  ensureDir,
  isAllowed,
} = require('../config/storage');

function makeStorage(subdir) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    }
  });
}

const MAX_MB = Number(process.env.UPLOAD_MAX_FILE_MB || 10);
const ALLOWED_IMG = (process.env.UPLOAD_ALLOWED_IMAGE || 'jpg,jpeg,png,webp,svg')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const ALLOWED_DOC = (process.env.UPLOAD_ALLOWED_DOC || 'pdf')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function makeImageUploader(subdir) {
  return multer({
    storage: makeStorage(subdir),
    limits: { fileSize: MAX_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (isAllowed(ALLOWED_IMG, file.originalname, file.mimetype)) return cb(null, true);
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'ไฟล์รูปภาพไม่รองรับ'));
    }
  });
}

function makeDocUploader(subdir) {
  return multer({
    storage: makeStorage(subdir),
    limits: { fileSize: MAX_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (isAllowed(ALLOWED_DOC, file.originalname, file.mimetype)) return cb(null, true);
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'ไฟล์เอกสารไม่รองรับ'));
    }
  });
}

const uploadPortfolio     = makeImageUploader('portfolio');   // รูปผลงาน
const uploadRequestImages = makeImageUploader('requests');    // รูปลูกค้าแนบคำขอ
const uploadCategoryIcon  = makeImageUploader('categories');  // ไอคอนหมวดหมู่
const uploadQuotation     = makeDocUploader('quotations');    // PDF ใบเสนอราคา

module.exports = {
  uploadPortfolio,
  uploadQuotation,
  uploadRequestImages,
  uploadCategoryIcon,
};
