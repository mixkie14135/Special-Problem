// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./config/mailer');

const PORT = process.env.PORT || 8800;
const NODE_ENV = process.env.NODE_ENV || 'development';

const CORS_ORIGINS = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_ORIGIN || // backward-compat
  'http://localhost:3000'
).split(',').map(s => s.trim()).filter(Boolean);

const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://localhost:${PORT}`;
const UPLOAD_MAX_FILE_MB = Number(process.env.UPLOAD_MAX_FILE_MB || 10);

// uploads
const UPLOAD_ROOT = path.resolve('uploads');
const QUOTE_DIR = path.join(UPLOAD_ROOT, 'quotations');
const PORTFOLIO_DIR = path.join(UPLOAD_ROOT, 'portfolio');
const REQUEST_DIR = path.join(UPLOAD_ROOT, 'requests');
const CATEGORY_DIR = path.join(UPLOAD_ROOT, 'categories');
[UPLOAD_ROOT, QUOTE_DIR, PORTFOLIO_DIR, REQUEST_DIR, CATEGORY_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const app = express();
app.set('trust proxy', 1);

/** --------- CORS ต้องมาก่อนทุกอย่างที่ “อาจจบรีเควสต์” เช่น rateLimit --------- */
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);          // e.g. curl/postman
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: false,                             // ใช้ Bearer token
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Authorization','Content-Type','Accept'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));              // preflight ทุกเส้นทาง

/** --------- Security headers --------- */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/** --------- Rate limit (ผ่อนตอน dev และไม่คิด OPTIONS) --------- */
const devMax = 1000;
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || (NODE_ENV === 'development' ? devMax : 60)),
  skip: (req) => req.method === 'OPTIONS',
}));

/** --------- Parsers --------- */
app.use(express.json({ limit: `${UPLOAD_MAX_FILE_MB}mb` }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/** --------- Static --------- */
app.use('/uploads', express.static(UPLOAD_ROOT));

/** --------- Health --------- */
app.get('/api/ping', (_req, res) => {
  res.json({ message: 'API is working!', env: NODE_ENV, publicUrl: SERVER_PUBLIC_URL });
});

/** --------- Routes --------- */
app.use('/api', require('./modules/auth/auth.routes'));
app.use('/api', require('./modules/categories/category.routes'));
app.use('/api', require('./modules/portfolio/portfolio.routes'));
app.use('/api', require('./modules/requests/request.routes'));
app.use('/api', require('./modules/site-visits/siteVisit.routes'));
app.use('/api', require('./modules/quotations/quotation.routes'));
app.use('/api', require('./modules/dashboard/dashboard.routes'));

/** --------- Multer error handler --------- */
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    let message = 'อัปโหลดไฟล์ไม่สำเร็จ';
    if (err.code === 'LIMIT_FILE_SIZE') message = `ไฟล์ใหญ่เกินกำหนด (ไม่เกิน ${UPLOAD_MAX_FILE_MB} MB)`;
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'ชนิดไฟล์ไม่รองรับ';
    return res.status(400).json({ status: 'error', message });
  }
  return next(err);
});

/** --------- 404 --------- */
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not found' });
});

/** --------- Error handler --------- */
app.use((err, req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ status: 'error', message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on ${SERVER_PUBLIC_URL}`);
  console.log(`CORS origins: ${CORS_ORIGINS.join(', ')}`);
});
