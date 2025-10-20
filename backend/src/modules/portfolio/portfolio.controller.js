// src/modules/portfolio/portfolio.controller.js
const prisma = require('../../config/prisma');
const { toPublicUrl, deleteFile } = require('../../config/storage');

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

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'image file is required' });
    }
    const imageUrl = toPublicUrl(req.file.path);

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

// PATCH /api/portfolio/:id (admin)
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
      data.imageUrl = toPublicUrl(req.file.path);
      const prev = await prisma.portfolio.findUnique({ where: { id } });
      if (prev?.imageUrl && prev.imageUrl !== data.imageUrl) {
        deleteFile(prev.imageUrl);
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
    if (prev?.imageUrl) deleteFile(prev.imageUrl);
    res.json({ status: 'ok', message: 'Deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Portfolio not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};
