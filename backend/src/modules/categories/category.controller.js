// src\modules\categories\category.controller.js
const prisma = require('../../config/prisma');
const { deleteFile } = require('../../config/storage');

// GET /api/categories (public)
exports.list = async (_req, res) => {
  try {
    const items = await prisma.serviceCategory.findMany({
      orderBy: { id: 'asc' }
    });
    res.json({ status: 'ok', data: items });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// POST /api/categories (admin)
exports.create = async (req, res) => {
  try {
    const { name, description, iconUrl } = req.body || {};
    if (!name) return res.status(400).json({ status: 'error', message: 'name is required' });

    const item = await prisma.serviceCategory.create({
      data: { name, description, iconUrl }
    });
    res.status(201).json({ status: 'ok', data: item });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// PATCH /api/categories/:id (admin)
exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, iconUrl } = req.body || {};

    const prev = await prisma.serviceCategory.findUnique({ where: { id } });
    const item = await prisma.serviceCategory.update({
      where: { id },
      data: { name, description, iconUrl }
    });

    // ถ้าเปลี่ยน iconUrl และของเดิมอยู่ใต้ /uploads/ → ลบทิ้ง
    if (iconUrl && prev?.iconUrl && prev.iconUrl !== iconUrl) {
      deleteFile(prev.iconUrl);
    }

    res.json({ status: 'ok', data: item });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// DELETE /api/categories/:id (admin)
exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const prev = await prisma.serviceCategory.findUnique({ where: { id } });
    await prisma.serviceCategory.delete({ where: { id } });

    if (prev?.iconUrl) {
      deleteFile(prev.iconUrl);
    }

    res.json({ status: 'ok', message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};
