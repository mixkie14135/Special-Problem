// src/config/storage.js
const path = require('path');
const fs = require('fs');

const DRIVER = process.env.STORAGE_DRIVER || 'local'; // 'local' | 's3' (เผื่ออนาคต)
const UPLOAD_ROOT = path.resolve('uploads');
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || '';

/** ตรวจชนิดไฟล์อย่างง่ายทั้งนามสกุลและ mimetype */
function isAllowed(allowedList = [], filename = '', mimetype = '') {
  if (!allowedList.length) return true;
  const ext = String(path.extname(filename || '') || '').replace('.', '').toLowerCase();
  const mt = String(mimetype || '').toLowerCase();
  return allowedList.includes(ext) || allowedList.some(a => mt.includes(a));
}

/** แปลง path ไฟล์ในเครื่องให้เป็น URL ที่ client เปิดได้ */
function toPublicUrl(fsPath) {
  if (DRIVER === 'local') {
    const rel = fsPath.replace(UPLOAD_ROOT + path.sep, '').replace(/\\/g, '/'); // windows safe
    return `/uploads/${rel}`;
  }
  // ถ้าจะใช้ S3/GCS ภายหลัง กำหนด URL ที่นี่
  return fsPath;
}

/** (ออปชัน) สร้าง absolute URL สำหรับแนบอีเมล */
function toAbsoluteUrl(publicUrl) {
  if (!publicUrl) return publicUrl;
  if (publicUrl.startsWith('http')) return publicUrl;
  return `${SERVER_PUBLIC_URL}${publicUrl.startsWith('/') ? '' : '/'}${publicUrl}`;
}

/** สร้างโฟลเดอร์ปลายทาง (local) ถ้ายังไม่มี */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** ลบไฟล์เก่า (ใช้กับ local) – best effort */
function deleteFile(publicUrl) {
  try {
    if (!publicUrl) return;
    if (!publicUrl.startsWith('/uploads/')) return; // กันพลาด
    const abs = path.resolve(publicUrl.slice(1)); // ตัด '/' หน้าแรกออก
    fs.unlink(abs, () => {});
  } catch {}
}

module.exports = {
  DRIVER,
  UPLOAD_ROOT,
  isAllowed,
  toPublicUrl,
  toAbsoluteUrl,
  ensureDir,
  deleteFile,
};
