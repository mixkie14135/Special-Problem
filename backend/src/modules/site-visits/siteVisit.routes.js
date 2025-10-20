const { Router } = require('express');
const ctrl = require('./siteVisit.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { requireCustomerOwnsVisit } = require('./siteVisit.security');

const router = Router();

// ============ Admin (prefix ให้ตรงกับ FE: /api/admin/...) ============
// สร้างนัด
router.post('/admin/site-visits', requireAuth, requireAdmin, ctrl.create);

// แก้ไขนัด (ให้ :id รับแค่ตัวเลข)
router.patch('/admin/site-visits/:id(\\d+)', requireAuth, requireAdmin, ctrl.update);

// list รวม (ไม่ชนกับ upcoming)
router.get('/admin/site-visits', requireAuth, requireAdmin, ctrl.list);

// รายละเอียดนัด (ให้ :id รับแค่ตัวเลข)
router.get('/admin/site-visits/:id(\\d+)', requireAuth, requireAdmin, ctrl.detail);

// ============ Customer ============
router.get('/my/site-visits', requireAuth, ctrl.listMine);
router.get('/my/requests/:requestId(\\d+)/site-visits', requireAuth, ctrl.listMineByRequest);
router.get('/my/site-visits/:id(\\d+)', requireAuth, requireCustomerOwnsVisit, ctrl.detailOwn);
router.post('/site-visits/:id(\\d+)/respond', requireAuth, requireCustomerOwnsVisit, ctrl.respond);

module.exports = router;
