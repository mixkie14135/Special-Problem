// src/config/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST, SMTP_PORT, SMTP_SECURE,
  SMTP_USER, SMTP_PASS, MAIL_FROM,
  DEBUG_MAILER, // ตั้งเป็น '1' เพื่อเปิด log SMTP
} = process.env;

console.log('[Mailer] init with host:', SMTP_HOST);

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),               // 587 = STARTTLS, 465 = SMTPS
    secure: String(SMTP_SECURE || 'false') === 'true', // true เมื่อใช้ 465
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    logger: DEBUG_MAILER === '1',
    debug: DEBUG_MAILER === '1',
    tls: {
      servername: SMTP_HOST, // ช่วย SNI บางเคส
      // rejectUnauthorized: false, // อย่าเปิดยกเว้นทดสอบเฉพาะกิจ
    },
  });

  // ตรวจสอบ SMTP ตอนบูต
  transporter.verify()
    .then(() => console.log('[Mailer] ready: true'))
    .catch(err => console.warn('[Mailer] verify failed:', err && err.message));
} else {
  console.warn('[Mailer] missing SMTP env, emails will be skipped.');
}

function mailFrom() {
  // ใช้ MAIL_FROM ถ้ามี ไม่งั้น fallback ไป user
  return MAIL_FROM || `"Bon Plus Thai" <${SMTP_USER || 'no-reply@local'}>`;
}

module.exports = { transporter, mailFrom };
