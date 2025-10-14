const { Router } = require('express');
const ctrl = require('./siteVisit.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { requireCustomerOwnsVisit } = require('./siteVisit.security');
const { route } = require('./siteVisit.routes');

const router = Router();

// Admin only
router.post('/site-visits', requireAuth, requireAdmin, ctrl.create);
router.patch('/site-visits/:id', requireAuth, requireAdmin, ctrl.update);
router.get('/site-visits', requireAuth, requireAdmin, ctrl.list);
router.get('/site-visits/:id', requireAuth, requireAdmin, ctrl.detail);

// Customer (เจ้าของคำขอเท่านั้น)
router.get('/my/site-visits', requireAuth, ctrl.listMine);                                  // ⭐ ลูกค้าดูนัดทั้งหมดของตัวเอง
router.get('/my/requests/:requestId/site-visits', requireAuth, ctrl.listMineByRequest);    // ⭐ ดูเฉพาะของคำขอใดคำขอหนึ่ง
router.get('/my/site-visits/:id', requireAuth, requireCustomerOwnsVisit, ctrl.detailOwn);  // ⭐
router.post('/site-visits/:id/respond', requireAuth, requireCustomerOwnsVisit, ctrl.respond);

module.exports = router;
