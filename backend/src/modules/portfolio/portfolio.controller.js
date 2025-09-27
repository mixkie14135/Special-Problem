const prisma = require('../../config/prisma');
const path = require('path');
const fs = require('fs');

function fileUrlFromReq(req, filePath) {
  // ใช้เสิร์ฟไฟล์ผ่าน /uploads/**
  const rel = filePath.replace(path.resolve('uploads') + path.sep, '').replace(/\\/g, '/');
  return `/uploads/${rel}`;
}

// GET /api/portfolio (public)
exports.list = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const items = await prisma.portfolio.findMany({
      orderBy: [{ occurredAt: order }, { id: order }],
      take: limit
    });
    res.json({ status: 'ok', data: items });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST /api/portfolio (admin, multipart image + fields)
exports.create = async (req, res) => {
  try {
    const { title, description, occurredAt, timeNote } = req.body || {};
    if (!title) return res.status(400).json({ status: 'error', message: 'title is required' });

    let imageUrl = null;
    if (req.file) {
      imageUrl = fileUrlFromReq(req, req.file.path);
    } else {
      return res.status(400).json({ status: 'error', message: 'image file is required' });
    }

    const data = {
      title,
      description: description || null,
      imageUrl,
      occurredAt: occurredAt ? new Date(occurredAt) : null,
      timeNote: timeNote || null
    };

    const item = await prisma.portfolio.create({ data });
    res.status(201).json({ status: 'ok', data: item });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// PATCH /api/portfolio/:id (admin, เปลี่ยนรูป/ข้อความ)
exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, occurredAt, timeNote } = req.body || {};
    const data = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (occurredAt !== undefined) data.occurredAt = occurredAt ? new Date(occurredAt) : null;
    if (timeNote !== undefined) data.timeNote = timeNote;

    if (req.file) {
      // อัปเดตรูปใหม่
      data.imageUrl = fileUrlFromReq(req, req.file.path);

      // (ออปชัน) ลบไฟล์เก่า
      const prev = await prisma.portfolio.findUnique({ where: { id } });
      if (prev && prev.imageUrl && prev.imageUrl.startsWith('/uploads/')) {
        const oldFsPath = path.resolve(prev.imageUrl.slice(1)); // remove leading '/'
        fs.unlink(oldFsPath, () => {});
      }
    }

    const item = await prisma.portfolio.update({ where: { id }, data });
    res.json({ status: 'ok', data: item });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Portfolio not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE /api/portfolio/:id (admin)
exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const prev = await prisma.portfolio.findUnique({ where: { id } });
    await prisma.portfolio.delete({ where: { id } });

    // (ออปชัน) ลบไฟล์ด้วย
    if (prev && prev.imageUrl && prev.imageUrl.startsWith('/uploads/')) {
      const oldFsPath = path.resolve(prev.imageUrl.slice(1));
      fs.unlink(oldFsPath, () => {});
    }

    res.json({ status: 'ok', message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Portfolio not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};
