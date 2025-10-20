// src\modules\categories\category.routes.js
const { Router } = require('express');
const ctrl = require('./category.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { uploadCategoryIcon } = require('../../utils/upload');
const { toPublicUrl } = require('../../config/storage');

const router = Router();

router.get('/categories', ctrl.list);
router.post('/categories', requireAuth, requireAdmin, ctrl.create);
router.patch('/categories/:id', requireAuth, requireAdmin, ctrl.update);
router.delete('/categories/:id', requireAuth, requireAdmin, ctrl.remove);

router.post(
  '/categories/upload-icon',
  requireAuth,
  requireAdmin,
  uploadCategoryIcon.single('icon'),
  (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    const url = toPublicUrl(file.path); // คืน URL ที่พร้อมใช้งานได้ทันที
    res.json({ status: 'ok', url });
  }
);

module.exports = router;
