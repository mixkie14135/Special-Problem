// backend/src/modules/requests/request.routes.js
const { Router } = require('express');
const ctrl = require('./request.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { uploadRequestImages } = require('../../utils/upload');

const router = Router();

// ลูกค้า
router.post('/requests', requireAuth, uploadRequestImages.array('images', 10), ctrl.create);
router.get('/my/requests', requireAuth, ctrl.listMine);

// แอดมิน
router.get('/requests', requireAuth, requireAdmin, ctrl.listAll);
router.get('/requests/:id', requireAuth, requireAdmin, ctrl.detail);
router.get('/admin/requests/recent', requireAuth, requireAdmin, ctrl.listRecent);

module.exports = router;
