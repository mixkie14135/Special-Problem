const { Router } = require('express');
const ctrl = require('./siteVisit.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { requireCustomerOwnsVisit } = require('./siteVisit.security');

const router = Router();

// Admin only
router.post('/site-visits', requireAuth, requireAdmin, ctrl.create);
router.patch('/site-visits/:id', requireAuth, requireAdmin, ctrl.update);
router.get('/site-visits', requireAuth, requireAdmin, ctrl.list);
router.get('/site-visits/:id', requireAuth, requireAdmin, ctrl.detail);
router.post('/site-visits/:id/respond', requireAuth, requireCustomerOwnsVisit, ctrl.respond);

module.exports = router;
