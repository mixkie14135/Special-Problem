// src/modules/auth/auth.controller.js
const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USE_COOKIE = String(process.env.AUTH_COOKIE || 'false') === 'true';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

const toPublicUser = (u) => {
  if (!u) return null;
  const { password, ...safe } = u;
  return safe;
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body || {};
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'firstName, lastName, email, password are required'
      });
    }

    const exist = await prisma.user.findUnique({ where: { email } });
    if (exist) return res.status(409).json({ status: 'error', message: 'Email already in use' });

    const name = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { firstName, lastName, name, email, password: hash, role: 'CUSTOMER', phone }
    });

    return res.status(201).json({ status: 'ok', data: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    if (USE_COOKIE) {
      // โปรดเปิด trust proxy + ใช้ HTTPS ในโปรดักชัน
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 วัน (ปรับตาม JWT_EXPIRES_IN ได้)
      });
      return res.json({ status: 'ok', user: toPublicUser(user) });
    }

    return res.json({ status: 'ok', token, user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    return res.json({ status: 'ok', data: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

exports.logout = async (_req, res) => {
  try {
    if (USE_COOKIE) {
      res.clearCookie('token');
      return res.json({ status: 'ok', message: 'Logged out' });
    }
    // ถ้าใช้ Bearer token ให้ frontend ลบ token เอง
    return res.json({ status: 'ok', message: 'Client should discard token' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
