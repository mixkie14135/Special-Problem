// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ====== CONFIG FROM ENV ======
const PORT = process.env.PORT || 8800;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://localhost:${PORT}`;
const UPLOAD_MAX_FILE_MB = Number(process.env.UPLOAD_MAX_FILE_MB || 10);

// ====== UPLOAD PATHS ======
const UPLOAD_ROOT = path.resolve('uploads');
const QUOTE_DIR = path.join(UPLOAD_ROOT, 'quotations'); // PDF ใบเสนอราคา
const PORTFOLIO_DIR = path.join(UPLOAD_ROOT, 'portfolio'); // รูปผลงาน
const REQUEST_DIR = path.join(UPLOAD_ROOT, 'requests'); // รูปลูกค้าแนบคำขอ

// ensure upload dirs exist
[UPLOAD_ROOT, QUOTE_DIR, PORTFOLIO_DIR, REQUEST_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// ====== INIT APP ======
const app = express();
app.set('trust proxy', 1); // ถ้าเคยอยู่หลัง reverse proxy/CDN ให้ set ไว้ (ไม่เสียหาย)

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // ให้เสิร์ฟรูป/ไฟล์ได้ข้าม origin
}));

// Rate limit (กันสแปมเบื้องต้น)
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000), // 60s
  max: Number(process.env.RATE_LIMIT_MAX || 60), // 60 req/นาที/ไอพี
}));

// CORS
app.use(cors({
  origin: FRONTEND_ORIGIN,   // ถ้าต่อไปมีหลายโดเมน ใช้ฟังก์ชันตรวจได้ (ดูตัวอย่างด้านล่าง)
  credentials: true
}));

// Body parsers (เพิ่ม limit เผื่อ multipart ที่ส่ง JSON ร่วม)
app.use(express.json({ limit: `${UPLOAD_MAX_FILE_MB}mb` }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Static uploads (ให้ frontend เปิดไฟล์ได้ เช่น /uploads/portfolio/xxx.jpg)
app.use('/uploads', express.static(UPLOAD_ROOT));

// ====== HEALTH ======
app.get('/api/ping', (_req, res) => {
  res.json({
    message: 'API is working!',
    env: NODE_ENV,
    publicUrl: SERVER_PUBLIC_URL
  });
});

// ====== ROUTES (ค่อยๆ เพิ่มทีหลัง) ======
const authRoutes = require('./modules/auth/auth.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const portfolioRoutes = require('./modules/portfolio/portfolio.routes');
const requestRoutes = require('./modules/requests/request.routes');
const siteVisitRoutes = require('./modules/site-visits/siteVisit.routes');
// const quotationRoutes = require('./modules/quotations/quotation.routes');


app.use('/api', authRoutes);
app.use('/api', categoryRoutes);
app.use('/api', portfolioRoutes);
app.use('/uploads', express.static('uploads')); // เสิร์ฟไฟล์ในโฟลเดอร์ uploads
app.use('/api', requestRoutes);
app.use('/api', siteVisitRoutes);
// app.use('/api', quotationRoutes);


// 404 fallback
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Not found' });
});

// Error handler กลาง
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ status: 'error', message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on ${SERVER_PUBLIC_URL}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});
